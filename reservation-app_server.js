const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const { Resend } = require('resend');
const waveService = require('./services/waveService');
const emailService = require('./services/emailService');
require('dotenv').config();

const app = express();

// Configuration des vues EJS et des fichiers statiques
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
// Capture de req.rawBody pour la vérification HMAC de la signature Wave Webhook
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// Gestion des sessions
app.use(session({
    secret: process.env.SESSION_SECRET || 'coachflow_secure_session_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 heures
}));

// Rendre la session utilisateur disponible dans tous les templates EJS
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        email: req.session.email,
        nom_complet: req.session.nom_complet,
        role: req.session.role,
        expertise: req.session.expertise
    } : null;
    next();
});

// Middleware d'authentification pour l'espace Coach
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.redirect('/coach/connexion');
}

// Pool de connexion MySQL / MariaDB
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'reservation_db',
    waitForConnections: true,
    connectionLimit: 10
});

// Service d'envoi d'emails transactionnels
const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

// ==========================================
// 1. ESPACE CLIENT (ÉLÈVE)
// ==========================================

// Redirection automatique vers le catalogue
app.get('/', (req, res) => {
    res.redirect('/catalogue');
});

// ROUTE : Parcourir le catalogue avec recherche et filtres par domaine
app.get('/catalogue', async (req, res) => {
    const { search, domaine } = req.query;
    try {
        let query = `
            SELECT services.*, users.nom_complet AS coach_nom, users.expertise AS coach_expertise 
            FROM services 
            LEFT JOIN users ON services.coach_id = users.id 
            WHERE 1=1
        `;
        const params = [];

        if (search && search.trim() !== '') {
            query += ` AND (services.nom LIKE ? OR services.description LIKE ? OR users.nom_complet LIKE ? OR services.domaine LIKE ?)`;
            const s = `%${search.trim()}%`;
            params.push(s, s, s, s);
        }

        if (domaine && domaine !== 'Tous') {
            query += ` AND services.domaine = ?`;
            params.push(domaine);
        }

        query += ` ORDER BY services.id DESC`;

        const [services] = await pool.query(query, params);

        // Récupérer la liste des domaines distincts pour les pilules de filtrage
        const [domainesRows] = await pool.query(`
            SELECT DISTINCT domaine 
            FROM services 
            WHERE domaine IS NOT NULL AND domaine != '' 
            ORDER BY domaine ASC
        `);
        const domaines = domainesRows.map(r => r.domaine);

        res.render('catalogue', { 
            services, 
            domaines, 
            selectedDomaine: domaine || 'Tous', 
            searchQuery: search || '' 
        });
    } catch (error) {
        console.error('Erreur chargement catalogue :', error);
        res.status(500).send("Erreur lors du chargement des services de la base de données.");
    }
});

// ROUTE : Afficher le formulaire de réservation pour une prestation ciblée
app.get('/reserver/:id', async (req, res) => {
    const serviceId = req.params.id;
    try {
        const [rows] = await pool.query(`
            SELECT services.*, users.nom_complet AS coach_nom, users.expertise AS coach_expertise, users.email AS coach_email
            FROM services 
            LEFT JOIN users ON services.coach_id = users.id 
            WHERE services.id = ?
        `, [serviceId]);

        if (rows.length === 0) {
            return res.status(404).send("Cette prestation ou formation n'existe pas.");
        }

        res.render('formulaire_reservation', { service: rows[0], erreur: null });
    } catch (error) {
        console.error('Erreur affichage formulaire :', error);
        res.status(500).send("Erreur interne du serveur");
    }
});

// ROUTE : Traitement de la réservation (STRICTEMENT LES 4 CHAMPS CLIENTS REQUIS)
app.post('/reserver/confirmer', async (req, res) => {
    const { service_id, prenom, nom, email, telephone, date_reservation } = req.body;

    try {
        // Validation stricte des 4 informations requises + la date
        if (!prenom || !nom || !email || !telephone || !date_reservation) {
            const [sRows] = await pool.query('SELECT * FROM services WHERE id = ?', [service_id]);
            return res.render('formulaire_reservation', {
                service: sRows[0] || {},
                erreur: "Veuillez remplir obligatoirement les 4 champs (Prénom, Nom, Email, Téléphone) ainsi que la date."
            });
        }

        // Vérifier si le créneau est déjà réservé pour ce service
        const [dejaPris] = await pool.query(
            "SELECT id FROM reservations WHERE service_id = ? AND date_reservation = ? AND statut != 'annule'",
            [service_id, date_reservation]
        );

        if (dejaPris.length > 0) {
            const [sRows] = await pool.query(`
                SELECT services.*, users.nom_complet AS coach_nom, users.expertise AS coach_expertise 
                FROM services 
                LEFT JOIN users ON services.coach_id = users.id 
                WHERE services.id = ?
            `, [service_id]);

            return res.render('formulaire_reservation', {
                service: sRows[0],
                erreur: "Ce créneau horaire est déjà réservé. Veuillez choisir une autre date."
            });
        }

        // Enregistrer la réservation avec les 4 champs client
        const [insertResult] = await pool.query(
            `INSERT INTO reservations (service_id, prenom, nom, email, telephone, date_reservation, statut, utilisateur_id) 
             VALUES (?, ?, ?, ?, ?, ?, 'en_attente', 0)`,
            [service_id, prenom.trim(), nom.trim(), email.trim(), telephone.trim(), date_reservation]
        );

        // Récupérer les informations du service et du coach
        const [serviceRows] = await pool.query(`
            SELECT services.*, users.nom_complet AS coach_nom, users.email AS coach_email
            FROM services 
            LEFT JOIN users ON services.coach_id = users.id 
            WHERE services.id = ?
        `, [service_id]);
        const service = serviceRows[0] || { nom: 'Prestation', prix: 0 };

        // Définition des coordonnées Wave Business pour le paiement de la séance
        const wavePaymentUrl = waveService.getBusinessPaymentUrl(service.prix);
        const waveBusiness = {
            name: process.env.WAVE_BUSINESS_NAME || 'CoachFlow Sénégal',
            url: process.env.WAVE_BUSINESS_URL || 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/',
            phone: process.env.WAVE_BUSINESS_PHONE || '+221 70 989 97 94',
            number: process.env.WAVE_BUSINESS_NUMBER || '709899794',
            paymentUrl: wavePaymentUrl
        };

        // Envoi de l'email de confirmation au client via emailService
        const emailContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4361ee;">Bonjour ${prenom} ${nom},</h2>
                <p>Votre demande de réservation pour la formation/coaching <strong>${service.nom}</strong> a bien été enregistrée avec succès.</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date souhaitée :</strong> ${date_reservation}</p>
                    <p style="margin: 5px 0;"><strong>Coach :</strong> ${service.coach_nom || 'Coach'}</p>
                    <p style="margin: 5px 0;"><strong>Montant :</strong> ${Number(service.prix).toLocaleString('fr-FR')} FCFA</p>
                    <p style="margin: 5px 0;"><strong>Téléphone de contact :</strong> ${telephone}</p>
                </div>
                <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <div style="font-weight: 700; color: #1e40af; margin-bottom: 6px;">
                        Paiement sécurisé via Wave Sénégal
                    </div>
                    <p style="font-size: 13px; color: #1e3a8a; margin: 0 0 12px;">
                        Réglez directement votre séance en 1 clic (montant de <strong>${Number(service.prix).toLocaleString('fr-FR')} FCFA</strong> pré-rempli) :
                    </p>
                    <a href="${wavePaymentUrl}" style="background-color: #1da1f2; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Payer ${Number(service.prix).toLocaleString('fr-FR')} FCFA avec Wave
                    </a>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 8px;">
                        Compte Wave Business : <strong>${waveBusiness.phone}</strong>
                    </div>
                </div>
                <p>Votre coach va examiner votre créneau et vous recevrez une confirmation très prochainement.</p>
                <p style="color: #64748b; font-size: 13px;">Merci pour votre confiance sur CoachFlow.</p>
            </div>
        `;

        await emailService.sendEmail({
            to: email,
            subject: `Demande de réservation reçue — ${service.nom}`,
            html: emailContent
        });

        // Afficher l'écran de succès
        res.render('reservation_succes', {
            reservation: {
                id: insertResult.insertId,
                prenom,
                nom,
                email,
                telephone,
                date_reservation
            },
            service,
            waveBusiness
        });
    } catch (error) {
        console.error('Erreur enregistrement réservation :', error);
        res.status(500).send("Erreur lors de l'enregistrement de la réservation.");
    }
});

// ==========================================
// 2. ESPACE COACH (PRESTATAIRE)
// ==========================================

// Inscription Coach (GET)
app.get('/coach/inscription', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/coach/dashboard');
    }
    res.render('coach_inscription', { erreur: null });
});

// Inscription Coach (POST) : Saisie OBLIGATOIRE du domaine d'expertise
app.post('/coach/inscription', async (req, res) => {
    const { nom_complet, telephone, expertise, autre_expertise, email, password, bio } = req.body;
    
    // Domaine d'expertise obligatoire
    const domaineExpertise = (expertise === 'Autre' && autre_expertise) ? autre_expertise.trim() : (expertise || '').trim();

    if (!nom_complet || !email || !password || !domaineExpertise) {
        return res.render('coach_inscription', {
            erreur: "Le domaine d'expertise, le nom complet, l'email et le mot de passe sont obligatoires."
        });
    }

    try {
        // Vérifier si l'email existe déjà
        const [existe] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim()]);
        if (existe.length > 0) {
            return res.render('coach_inscription', {
                erreur: "Un compte avec cette adresse email existe déjà. Veuillez vous connecter."
            });
        }

        // Hachage sécurisé du mot de passe
        const hash = await bcrypt.hash(password, 10);

        // Insertion du coach
        const [result] = await pool.query(
            `INSERT INTO users (nom_complet, email, password, role, expertise, bio, telephone) 
             VALUES (?, ?, ?, 'coach', ?, ?, ?)`,
            [nom_complet.trim(), email.trim(), hash, domaineExpertise, bio ? bio.trim() : null, telephone ? telephone.trim() : null]
        );

        // Initialisation de la session
        req.session.userId = result.insertId;
        req.session.email = email.trim();
        req.session.nom_complet = nom_complet.trim();
        req.session.role = 'coach';
        req.session.expertise = domaineExpertise;

        res.redirect('/coach/dashboard');
    } catch (error) {
        console.error('Erreur inscription coach :', error);
        res.render('coach_inscription', { erreur: "Une erreur est survenue lors de l'inscription." });
    }
});

// Connexion Coach (GET)
app.get('/coach/connexion', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/coach/dashboard');
    }
    res.render('coach_connexion', { erreur: null });
});

// Connexion Coach (POST)
app.post('/coach/connexion', async (req, res) => {
    const { email, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.trim()]);
        if (rows.length === 0) {
            return res.render('coach_connexion', { erreur: "Identifiants incorrects." });
        }

        const user = rows[0];
        const valide = await bcrypt.compare(password, user.password);
        if (!valide) {
            return res.render('coach_connexion', { erreur: "Identifiants incorrects." });
        }

        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.nom_complet = user.nom_complet || user.email;
        req.session.role = user.role || 'coach';
        req.session.expertise = user.expertise || 'Expert';

        res.redirect('/coach/dashboard');
    } catch (error) {
        console.error('Erreur connexion coach :', error);
        res.render('coach_connexion', { erreur: "Erreur serveur lors de la connexion." });
    }
});

// Déconnexion
app.get(['/coach/deconnexion', '/admin/logout'], (req, res) => {
    req.session.destroy(() => {
        res.redirect('/catalogue');
    });
});

// Redirection rétrocompatible pour les anciennes URLs admin
app.get('/admin/login', (req, res) => res.redirect('/coach/connexion'));
app.get('/admin/dashboard', (req, res) => res.redirect('/coach/dashboard'));
app.get('/admin/services/nouveau', (req, res) => res.redirect('/coach/services/nouveau'));

// Dashboard Coach
app.get('/coach/dashboard', requireAuth, async (req, res) => {
    try {
        const coachId = req.session.userId;

        // Informations du coach connecté
        const [coachRows] = await pool.query('SELECT * FROM users WHERE id = ?', [coachId]);
        const coach = coachRows[0] || {
            nom_complet: req.session.nom_complet,
            email: req.session.email,
            expertise: req.session.expertise
        };

        // Prestations du coach (si rôle admin avec pas de service propre, afficher tous les services)
        let servicesQuery = 'SELECT * FROM services WHERE coach_id = ? ORDER BY id DESC';
        let servicesParams = [coachId];

        if (coach.role === 'admin') {
            const [myServices] = await pool.query(servicesQuery, servicesParams);
            if (myServices.length === 0) {
                servicesQuery = 'SELECT * FROM services ORDER BY id DESC';
                servicesParams = [];
            }
        }

        const [services] = await pool.query(servicesQuery, servicesParams);

        // Réservations liées aux prestations de ce coach
        let resQuery = `
            SELECT reservations.*, services.nom AS service_nom, services.prix, services.duree_minutes 
            FROM reservations 
            JOIN services ON reservations.service_id = services.id 
            WHERE services.coach_id = ? 
            ORDER BY reservations.created_at DESC
        `;
        let resParams = [coachId];

        if (coach.role === 'admin') {
            const [myRes] = await pool.query(resQuery, resParams);
            if (myRes.length === 0) {
                resQuery = `
                    SELECT reservations.*, services.nom AS service_nom, services.prix, services.duree_minutes 
                    FROM reservations 
                    JOIN services ON reservations.service_id = services.id 
                    ORDER BY reservations.created_at DESC
                `;
                resParams = [];
            }
        }

        const [reservations] = await pool.query(resQuery, resParams);

        // Calcul des statistiques
        const stats = {
            confirmees: reservations.filter(r => r.statut === 'confirme').length,
            en_attente: reservations.filter(r => r.statut === 'en_attente').length,
            revenu: reservations
                .filter(r => r.statut === 'confirme')
                .reduce((total, r) => total + Number(r.prix || 0), 0)
        };

        const waveBusiness = {
            name: process.env.WAVE_BUSINESS_NAME || 'CoachFlow Sénégal',
            url: process.env.WAVE_BUSINESS_URL || 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/',
            phone: process.env.WAVE_BUSINESS_PHONE || '+221 70 989 97 94',
            number: process.env.WAVE_BUSINESS_NUMBER || '709899794',
            amount: 20000,
            paymentUrl: waveService.getBusinessPaymentUrl(20000)
        };

        res.render('coach_dashboard', {
            coach,
            services,
            reservations,
            stats,
            waveBusiness
        });
    } catch (error) {
        console.error('Erreur chargement dashboard coach :', error);
        res.status(500).send("Erreur lors du chargement du tableau de bord.");
    }
});

// Formulaire : Ajouter une nouvelle prestation avec fixation libre des prix
app.get('/coach/services/nouveau', requireAuth, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.session.userId]);
        const coach = rows[0] || { expertise: req.session.expertise || 'Business' };
        res.render('coach_service_nouveau', { coach, erreur: null });
    } catch (error) {
        console.error(error);
        res.render('coach_service_nouveau', { coach: {}, erreur: null });
    }
});

// Traitement de l'ajout d'une prestation
app.post('/coach/services/nouveau', requireAuth, async (req, res) => {
    const { nom, description, prix, duree_minutes, domaine } = req.body;
    const coachId = req.session.userId;

    if (!nom || !prix || !duree_minutes) {
        return res.render('coach_service_nouveau', {
            coach: { expertise: req.session.expertise },
            erreur: "Veuillez renseigner au minimum l'intitulé, la durée et votre tarif."
        });
    }

    try {
        await pool.query(
            `INSERT INTO services (nom, description, prix, duree_minutes, domaine, coach_id) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nom.trim(), description ? description.trim() : null, prix, duree_minutes, domaine || 'Business', coachId]
        );

        res.redirect('/coach/dashboard');
    } catch (error) {
        console.error("Erreur lors de l'ajout du service :", error);
        res.render('coach_service_nouveau', {
            coach: { expertise: req.session.expertise },
            erreur: "Erreur lors de l'enregistrement de votre prestation."
        });
    }
});

// Supprimer une prestation
app.post('/coach/services/:id/supprimer', requireAuth, async (req, res) => {
    const serviceId = req.params.id;
    const coachId = req.session.userId;
    const userRole = req.session.role;

    try {
        if (userRole === 'admin') {
            await pool.query('DELETE FROM services WHERE id = ?', [serviceId]);
        } else {
            await pool.query('DELETE FROM services WHERE id = ? AND coach_id = ?', [serviceId, coachId]);
        }
        res.redirect('/coach/dashboard');
    } catch (error) {
        console.error('Erreur suppression service :', error);
        res.redirect('/coach/dashboard');
    }
});

// Mettre à jour le statut d'une réservation (Confirmer / Annuler / En attente)
app.post(['/coach/reservations/:id/statut', '/admin/reservations/:id/statut'], requireAuth, async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;

    try {
        await pool.query('UPDATE reservations SET statut = ? WHERE id = ?', [statut, id]);

        // Récupérer les détails pour notifier le client par email
        const [rows] = await pool.query(`
            SELECT reservations.prenom, reservations.nom, reservations.email, reservations.date_reservation, services.nom AS service_nom
            FROM reservations 
            JOIN services ON reservations.service_id = services.id
            WHERE reservations.id = ?
        `, [id]);

        let emailReport = 'none';

        if (rows.length > 0 && rows[0].email) {
            const { prenom, nom, email, date_reservation, service_nom } = rows[0];
            let sujet = 'Mise à jour de votre réservation';
            let message = '';

            const dateStr = (date_reservation instanceof Date) ? date_reservation.toISOString().split('T')[0] : date_reservation;

            if (statut === 'confirme') {
                sujet = `Votre réservation pour ${service_nom} est confirmée ✅`;
                message = `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #10b981;">Réservation Confirmée !</h2>
                            <p>Bonjour ${prenom || ''} ${nom || ''},</p>
                            <p>Excellente nouvelle ! Votre coach a <strong>confirmé</strong> votre séance pour <strong>${service_nom}</strong> le <strong>${dateStr}</strong>.</p>
                            <p>Préparez vos questions et vos objectifs avant la séance.</p>
                            <p style="color: #64748b; font-size: 13px;">L'équipe CoachFlow</p>
                           </div>`;
            } else if (statut === 'annule') {
                sujet = `Votre réservation pour ${service_nom} a été annulée`;
                message = `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #ef4444;">Réservation Annulée</h2>
                            <p>Bonjour ${prenom || ''} ${nom || ''},</p>
                            <p>Votre réservation pour <strong>${service_nom}</strong> le <strong>${dateStr}</strong> n'a pas pu être honorée et a été annulée.</p>
                            <p>N'hésitez pas à choisir un autre créneau disponible sur notre catalogue.</p>
                            <p style="color: #64748b; font-size: 13px;">L'équipe CoachFlow</p>
                           </div>`;
            }

            if (message) {
                const sendResult = await emailService.sendEmail({
                    to: email,
                    subject: sujet,
                    html: message
                });

                if (sendResult.success) {
                    emailReport = 'ok';
                } else {
                    emailReport = encodeURIComponent(sendResult.error || "Erreur de transmission d'email");
                }
            }
        }

        res.redirect(`/coach/dashboard?status_updated=1&email_status=${emailReport}`);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut :', error);
        res.status(500).send("Erreur lors de la mise à jour du statut de la réservation.");
    }
});

// ==========================================
// 3. INTÉGRATION PAIEMENT WAVE SÉNÉGAL (CHECKOUT & WEBHOOK)
// ==========================================

/**
 * 1. INITIALISATION DE LA SESSION OU LIEN DE PAIEMENT WAVE
 * Route appelée pour générer ou rediriger vers le lien de paiement Wave Business
 */
app.all('/api/payment/initiate', async (req, res) => {
    // Récupérer le coach_id soit depuis le body, les query params ou la session connectée
    const coachId = req.body?.coach_id || req.query?.coach_id || (req.session && req.session.userId);
    const amount = Number(req.body?.amount || req.query?.amount) || 20000; // Montant de l'abonnement : 20 000 FCFA

    if (!coachId) {
        return res.status(400).json({ error: "L'identifiant du coach (coach_id) est obligatoire." });
    }

    try {
        // 1. Vérification de l'existence du coach
        const [coachRows] = await pool.query('SELECT id, nom_complet, email FROM users WHERE id = ?', [coachId]);
        if (coachRows.length === 0) {
            return res.status(404).json({ error: "Coach non trouvé dans la base de données." });
        }
        const coach = coachRows[0];

        // 2. Création d'une référence unique liant le coach_id et un horodatage
        const clientReference = `SUB_COACH_${coachId}_${Date.now()}`;

        // 3. Enregistrement initial en base de données avec statut 'pending'
        const [insertTx] = await pool.query(
            `INSERT INTO wave_transactions (coach_id, client_reference, amount, currency, status) 
             VALUES (?, ?, ?, 'XOF', 'pending')`,
            [coachId, clientReference, amount]
        );

        // 4. Définition des URLs de redirection
        const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
        const errorUrl = `${baseUrl}/coach/dashboard?payment=error`;
        const successUrl = `${baseUrl}/coach/dashboard?payment=success&ref=${clientReference}`;

        let waveLaunchUrl;
        let waveSessionId = null;

        // 5. Génération de l'URL Wave (Checkout ou lien direct Wave Business marchand avec montant prescrit)
        let waveSession;
        try {
            waveSession = await waveService.createCheckoutSession({
                amount,
                currency: 'XOF',
                errorUrl,
                successUrl,
                clientReference
            });
            waveLaunchUrl = waveSession.wave_launch_url;
            waveSessionId = waveSession.id;
        } catch (waveApiError) {
            console.warn("⚠️ Bascule sur le lien Wave Business direct :", waveApiError.message);
            waveLaunchUrl = waveService.getBusinessPaymentUrl(amount);
            waveSessionId = `direct_${Date.now()}`;
        }

        // 6. Mise à jour de la transaction avec l'ID de session Wave
        await pool.query(
            'UPDATE wave_transactions SET wave_session_id = ? WHERE id = ?',
            [waveSessionId, insertTx.insertId]
        );

        // Redirection directe vers le lien Wave (permettant d'ouvrir l'application Wave)
        if (req.headers['accept'] && req.headers['accept'].includes('text/html') || req.method === 'GET') {
            console.log(`🚀 Redirection vers le lien Wave officiel : ${waveLaunchUrl}`);
            return res.redirect(waveLaunchUrl);
        }

        // Réponse JSON pour clients API
        return res.status(200).json({
            success: true,
            message: "Lien de paiement Wave prêt.",
            coach_id: coachId,
            amount,
            currency: 'XOF',
            client_reference: clientReference,
            wave_session_id: waveSessionId,
            wave_launch_url: waveLaunchUrl
        });

        // Sinon retourner la réponse JSON pour les clients API / mobiles
        return res.status(200).json({
            success: true,
            message: "Session de paiement Wave initialisée.",
            coach_id: coachId,
            amount,
            currency: 'XOF',
            client_reference: clientReference,
            wave_session_id: waveSessionId,
            wave_launch_url: waveLaunchUrl
        });

    } catch (error) {
        console.error("❌ Erreur initiation Wave Checkout :", error);
        return res.status(500).json({
            error: "Échec de l'initialisation du paiement Wave.",
            details: error.message
        });
    }
});

/**
 * 2. GESTION DU WEBHOOK WAVE (Notification instantanée serveur à serveur)
 * Route publique sécurisée appelée automatiquement par Wave une fois le paiement validé sur le téléphone du coach
 */
app.post('/api/payment/webhook', async (req, res) => {
    const signature = req.headers['wave-signature'];

    // 1. Sécurité : Vérification cryptographique de la signature Wave (HMAC SHA-256)
    const isSignatureValid = waveService.verifyWebhookSignature(signature, req.rawBody);
    if (!isSignatureValid) {
        console.error("❌ Rejet du webhook : Signature Wave invalide ou contrefaite.");
        return res.status(400).send("Signature Wave invalide.");
    }

    const event = req.body;
    console.log(`🔔 Webhook Wave reçu - Type: [${event?.type}]`);

    try {
        // 2. Traitement de l'événement checkout.session.completed
        if (event && event.type === 'checkout.session.completed') {
            const sessionData = event.data || {};
            const clientReference = sessionData.client_reference;
            const waveTransactionId = sessionData.transaction_id || sessionData.id;
            const checkoutStatus = sessionData.checkout_status;

            if (checkoutStatus === 'complete' && clientReference) {
                // Recherche de la transaction locale correspondante
                const [txRows] = await pool.query(
                    'SELECT * FROM wave_transactions WHERE client_reference = ?',
                    [clientReference]
                );

                if (txRows.length > 0) {
                    const transaction = txRows[0];
                    const coachId = transaction.coach_id;

                    // A. Mettre à jour la transaction Wave locale à 'completed'
                    await pool.query(
                        `UPDATE wave_transactions 
                         SET status = 'completed', wave_transaction_id = ?, completed_at = NOW() 
                         WHERE client_reference = ?`,
                        [waveTransactionId, clientReference]
                    );

                    // B. Mettre à jour l'abonnement du coach : statut 'active' + expiration = aujourd'hui + 30 jours
                    await pool.query(
                        `UPDATE users 
                         SET subscription_status = 'active', 
                             subscription_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
                         WHERE id = ?`,
                        [coachId]
                    );

                    console.log(`✅ Abonnement activé avec succès pour le coach #${coachId} (+30 jours). Wave Tx: ${waveTransactionId}`);

                    // C. Notification email de confirmation au coach via emailService
                    const [coachRows] = await pool.query('SELECT nom_complet, email FROM users WHERE id = ?', [coachId]);
                    if (coachRows.length > 0 && coachRows[0].email) {
                        await emailService.sendEmail({
                            to: coachRows[0].email,
                            subject: 'Confirmation de paiement Wave — Abonnement CoachFlow activé !',
                            html: `
                                <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                                    <h2 style="color: #1da1f2;">Paiement Wave reçu avec succès !</h2>
                                    <p>Bonjour <strong>${coachRows[0].nom_complet || 'Coach'}</strong>,</p>
                                    <p>Votre paiement mensuel de <strong>20 000 FCFA</strong> via Wave a bien été confirmé.</p>
                                    <p>Votre abonnement CoachFlow est maintenant <strong style="color: #10b981;">Actif</strong> pour une durée de 30 jours.</p>
                                    <p style="font-size: 13px; color: #64748b;">Référence Wave : <code>${waveTransactionId}</code></p>
                                </div>
                            `
                        });
                    }
                }
            }
        }

        // 3. Toujours retourner HTTP 200 à Wave pour accuser réception
        return res.status(200).json({ received: true });

    } catch (error) {
        console.error("❌ Erreur traitement Webhook Wave :", error);
        return res.status(500).send("Erreur serveur lors du traitement du webhook.");
    }
});

// Endpoint sécurisé de test développeur (simule la réception d'un webhook Wave valide)
app.post('/api/payment/simulate-webhook-dev', requireAuth, async (req, res) => {
    const coachId = req.session.userId;
    try {
        const fakeTxId = `WAVE_TEST_${Date.now()}`;
        const clientReference = `TEST_DEV_${coachId}_${Date.now()}`;

        await pool.query(
            `INSERT INTO wave_transactions (coach_id, client_reference, amount, currency, status, wave_transaction_id, completed_at) 
             VALUES (?, ?, 20000, 'XOF', 'completed', ?, NOW())`,
            [coachId, clientReference, fakeTxId]
        );

        await pool.query(
            `UPDATE users 
             SET subscription_status = 'active', 
                 subscription_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
             WHERE id = ?`,
            [coachId]
        );
        console.log(`[TEST DEV] Simulation explicite du Webhook réussie pour le coach #${coachId}`);
        res.redirect('/coach/dashboard?payment=success');
    } catch (err) {
        console.error("Erreur test webhook dev:", err);
        res.redirect('/coach/dashboard?payment=error&reason=' + encodeURIComponent(err.message));
    }
});

// ==========================================
// 4. CONFIRMATION PAIEMENT WAVE BUSINESS (SÉNÉGAL)
// ==========================================

/**
 * Route appelée par le coach pour valider son abonnement après avoir effectué son paiement Wave Business
 * Il saisit la référence / numéro de transaction Wave présent sur son reçu SMS ou application.
 */
app.post('/api/payment/wave-business/confirm', requireAuth, async (req, res) => {
    const coachId = req.session.userId;
    const { wave_transaction_id, amount } = req.body;
    const paymentAmount = Number(amount) || 20000;

    if (!wave_transaction_id || wave_transaction_id.trim() === '') {
        return res.redirect('/coach/dashboard?payment=error&reason=' + encodeURIComponent("Veuillez renseigner votre ID ou référence de transaction Wave présent sur votre reçu."));
    }

    const cleanTxId = wave_transaction_id.trim();

    try {
        // Vérifier si cette référence de transaction n'a pas déjà été utilisée
        const [existing] = await pool.query(
            'SELECT id FROM wave_transactions WHERE wave_transaction_id = ? AND status = "completed"',
            [cleanTxId]
        );

        if (existing.length > 0) {
            return res.redirect('/coach/dashboard?payment=error&reason=' + encodeURIComponent("Cet identifiant de transaction Wave a déjà été enregistré sur la plateforme."));
        }

        const clientRef = `WB_${coachId}_${Date.now()}`;

        // Enregistrer la transaction Wave Business validée
        await pool.query(
            `INSERT INTO wave_transactions (coach_id, client_reference, wave_transaction_id, amount, currency, status, completed_at) 
             VALUES (?, ?, ?, ?, 'XOF', 'completed', NOW())`,
            [coachId, clientRef, cleanTxId, paymentAmount]
        );

        // Activer l'abonnement du coach pour 30 jours à compter de maintenant
        await pool.query(
            `UPDATE users 
             SET subscription_status = 'active', 
                 subscription_expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY) 
             WHERE id = ?`,
            [coachId]
        );

        console.log(`✅ [WAVE BUSINESS] Abonnement activé (+30 jours) pour le coach #${coachId} avec la transaction Wave: ${cleanTxId}`);

        // Envoi d'un email de confirmation au coach
        const [coachRows] = await pool.query('SELECT nom_complet, email FROM users WHERE id = ?', [coachId]);
        if (coachRows.length > 0 && coachRows[0].email) {
            await emailService.sendEmail({
                to: coachRows[0].email,
                subject: 'Confirmation de paiement Wave Business — Abonnement CoachFlow activé !',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                        <h2 style="color: #1da1f2;">Paiement Wave Business validé !</h2>
                        <p>Bonjour <strong>${coachRows[0].nom_complet || 'Coach'}</strong>,</p>
                        <p>Votre paiement mensuel de <strong>${Number(paymentAmount).toLocaleString('fr-FR')} FCFA</strong> via Wave Business a été enregistré avec succès.</p>
                        <p>Votre compte Coach est désormais <strong style="color: #10b981;">Actif</strong> pour les 30 prochains jours.</p>
                        <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin: 15px 0;">
                            <strong>Référence de transaction Wave :</strong> <code>${cleanTxId}</code>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">Merci pour votre confiance sur CoachFlow.</p>
                    </div>
                `
            });
        }

        res.redirect(`/coach/dashboard?payment=success&tx_id=${encodeURIComponent(cleanTxId)}`);

    } catch (err) {
        console.error("Erreur confirmation Wave Business :", err);
        res.redirect('/coach/dashboard?payment=error&reason=' + encodeURIComponent("Une erreur est survenue lors de l'enregistrement de votre transaction Wave."));
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CoachFlow SaaS actif sur : http://localhost:${PORT}/catalogue`);
});