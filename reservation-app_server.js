const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const session = require('express-session');
const path = require('path');
const { Resend } = require('resend');
const waveService = require('./services/waveService');
const emailService = require('./services/emailService');
const notificationService = require('./services/notificationService');
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

// Rendre la session utilisateur et client disponible dans tous les templates EJS
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? {
        id: req.session.userId,
        email: req.session.email,
        nom_complet: req.session.nom_complet,
        role: req.session.role,
        expertise: req.session.expertise
    } : null;
    res.locals.clientEmail = req.session.clientEmail || null;
    res.locals.clientNom = req.session.clientNom || null;
    next();
});

// Middleware d'authentification pour l'espace Coach
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.redirect('/coach/connexion');
}

// Middleware d'authentification strict pour l'espace Administrateur
function requireAdmin(req, res, next) {
    if (req.session && req.session.userId && req.session.role === 'admin') {
        return next();
    }
    if (req.session && req.session.userId) {
        return res.status(403).send(`
            <div style="font-family: 'Plus Jakarta Sans', sans-serif, system-ui; max-width: 520px; margin: 80px auto; padding: 32px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.06); background: white;">
                <div style="width: 56px; height: 56px; background: #fee2e2; color: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px;">⛔</div>
                <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 20px;">Accès Restreint</h2>
                <p style="color: #64748b; font-size: 14.5px; line-height: 1.5; margin-bottom: 24px;">Cet espace est exclusivement réservé aux administrateurs de la plateforme CoachFlow.</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <a href="/coach/dashboard" style="display: inline-block; padding: 10px 18px; background: #4361ee; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13.5px;">Mon Dashboard Coach</a>
                    <a href="/catalogue" style="display: inline-block; padding: 10px 18px; background: #f1f5f9; color: #475569; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 13.5px;">Retour Catalogue</a>
                </div>
            </div>
        `);
    }
    return res.redirect('/coach/connexion?redirect=/admin/dashboard');
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

// Initialisation du service de notifications internes
notificationService.setPool(pool);

// Initialisation automatique des tables et colonnes pour les notifications
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reservation_id INT NULL,
                user_id INT NULL,
                client_email VARCHAR(255) NOT NULL,
                client_nom VARCHAR(255) NULL,
                titre VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                coach_nom VARCHAR(255) NULL,
                date_seance VARCHAR(50) NULL,
                heure_seance VARCHAR(20) NULL,
                service_nom VARCHAR(255) NULL,
                type VARCHAR(50) DEFAULT 'reservation_confirmee',
                lu TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_client_email (client_email),
                INDEX idx_lu (lu),
                INDEX idx_user_id (user_id)
            )
        `);
        const [resCols] = await pool.query("SHOW COLUMNS FROM reservations LIKE 'heure_reservation'");
        if (resCols.length === 0) {
            await pool.query("ALTER TABLE reservations ADD COLUMN heure_reservation VARCHAR(20) DEFAULT '10:00'");
        }
    } catch (e) {
        console.warn("Initialisation auto tables notifications :", e.message);
    }
})();

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

// ROUTE : Traitement de la réservation (STRICTEMENT LES 4 CHAMPS CLIENTS REQUIS + DATE & HEURE)
app.post('/reserver/confirmer', async (req, res) => {
    const { service_id, prenom, nom, email, telephone, date_reservation, heure_reservation } = req.body;
    const heureVal = heure_reservation ? heure_reservation.trim() : '10:00';

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
            "SELECT id FROM reservations WHERE service_id = ? AND date_reservation = ? AND heure_reservation = ? AND statut != 'annule'",
            [service_id, date_reservation, heureVal]
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
                erreur: `Ce créneau (${date_reservation} à ${heureVal}) est déjà réservé. Veuillez choisir un autre horaire.`
            });
        }

        // Enregistrer la réservation avec date et heure
        const [insertResult] = await pool.query(
            `INSERT INTO reservations (service_id, prenom, nom, email, telephone, date_reservation, heure_reservation, statut, utilisateur_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'en_attente', 0)`,
            [service_id, prenom.trim(), nom.trim(), email.trim(), telephone.trim(), date_reservation, heureVal]
        );

        // Enregistrer l'email du client en session pour afficher immédiatement ses notifications dans la cloche
        req.session.clientEmail = email.trim();
        req.session.clientNom = `${prenom.trim()} ${nom.trim()}`;

        // Récupérer les informations du service et du coach
        const [serviceRows] = await pool.query(`
            SELECT services.*, users.nom_complet AS coach_nom, users.email AS coach_email
            FROM services 
            LEFT JOIN users ON services.coach_id = users.id 
            WHERE services.id = ?
        `, [service_id]);
        const service = serviceRows[0] || { nom: 'Prestation', prix: 0 };

        // Notifier le coach s'il est inscrit
        if (service.coach_email) {
            try {
                await notificationService.createNotification({
                    reservation_id: insertResult.insertId,
                    user_id: service.coach_id,
                    client_email: service.coach_email,
                    client_nom: `${prenom.trim()} ${nom.trim()}`,
                    titre: `Nouvelle réservation reçue 📅`,
                    message: `${prenom.trim()} ${nom.trim()} a réservé "${service.nom}" pour le ${date_reservation} à ${heureVal}.`,
                    coach_nom: service.coach_nom || 'Coach',
                    date_seance: date_reservation,
                    heure_seance: heureVal,
                    service_nom: service.nom,
                    type: 'nouvelle_reservation'
                });
            } catch (errNotif) {
                console.warn('Notice notification coach :', errNotif.message);
            }
        }

        // Définition des coordonnées Wave Business pour le paiement de la séance
        const wavePaymentUrl = waveService.getBusinessPaymentUrl(service.prix);
        const waveBusiness = {
            name: process.env.WAVE_BUSINESS_NAME || 'CoachFlow Sénégal',
            url: process.env.WAVE_BUSINESS_URL || 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/',
            phone: process.env.WAVE_BUSINESS_PHONE || '+221 70 989 97 94',
            number: process.env.WAVE_BUSINESS_NUMBER || '709899794',
            paymentUrl: wavePaymentUrl
        };

        // Création de la notification interne pour le compte du client (aucun email envoyé)
        try {
            await notificationService.createNotification({
                reservation_id: insertResult.insertId,
                user_id: null,
                client_email: email.trim(),
                client_nom: `${prenom.trim()} ${nom.trim()}`,
                titre: `Demande de réservation enregistrée ⏳`,
                message: `Votre demande pour "${service.nom}" avec le coach ${service.coach_nom || 'votre coach'} pour le ${date_reservation} à ${heureVal} a été enregistrée. Elle est en attente de confirmation.`,
                coach_nom: service.coach_nom || 'Coach',
                date_seance: date_reservation,
                heure_seance: heureVal,
                service_nom: service.nom,
                type: 'demande_enregistree'
            });
        } catch (notifErr) {
            console.warn('Notice notification client :', notifErr.message);
        }

        // Afficher l'écran de succès
        res.render('reservation_succes', {
            reservation: {
                id: insertResult.insertId,
                prenom,
                nom,
                email,
                telephone,
                date_reservation,
                heure_reservation: heureVal
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

        if (user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        }
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
app.get('/admin/services/nouveau', (req, res) => res.redirect('/coach/services/nouveau'));

// ==========================================
// TABLEAU DE BORD ADMINISTRATEUR (SUPERVISION GLOBALE & RBAC)
// ==========================================
app.get('/admin/dashboard', requireAdmin, async (req, res) => {
    try {
        const adminId = req.session.userId;
        const [adminRows] = await pool.query('SELECT * FROM users WHERE id = ?', [adminId]);
        const adminUser = adminRows[0] || {
            nom_complet: req.session.nom_complet,
            email: req.session.email,
            role: 'admin'
        };

        // 1. KPI & Statistiques en temps réel
        const [[coachCountRow]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'coach'");
        const [[adminCountRow]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
        const [[clientCountRow]] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'client'");
        const [[distinctResClientsRow]] = await pool.query("SELECT COUNT(DISTINCT email) AS total FROM reservations WHERE email IS NOT NULL AND email != ''");
        
        const totalClients = Math.max(Number(clientCountRow.total) + Number(distinctResClientsRow.total), Number(distinctResClientsRow.total));
        const totalCoaches = Number(coachCountRow.total);
        const totalAdmins = Number(adminCountRow.total);

        // Abonnements coachs actifs (statut active et date future ou indéterminée)
        const [[activeSubsRow]] = await pool.query(`
            SELECT COUNT(*) AS total FROM users 
            WHERE subscription_status = 'active' 
              AND (subscription_expires_at IS NULL OR subscription_expires_at >= NOW())
        `);
        const activeSubscriptions = Number(activeSubsRow.total);

        // Réservations globales & statuts
        const [[resStatsRow]] = await pool.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN statut = 'confirme' THEN 1 ELSE 0 END) AS confirmes,
                SUM(CASE WHEN statut = 'en_attente' THEN 1 ELSE 0 END) AS en_attente,
                SUM(CASE WHEN statut = 'annule' THEN 1 ELSE 0 END) AS annules
            FROM reservations
        `);
        const totalReservations = Number(resStatsRow.total || 0);
        const confirmedReservations = Number(resStatsRow.confirmes || 0);
        const pendingReservations = Number(resStatsRow.en_attente || 0);
        const cancelledReservations = Number(resStatsRow.annules || 0);
        const confirmationRate = totalReservations > 0 ? Math.round((confirmedReservations / totalReservations) * 100) : 0;

        // Revenus Prestations (somme des prix des réservations confirmées)
        const [[prestationRevRow]] = await pool.query(`
            SELECT COALESCE(SUM(s.prix), 0) AS total 
            FROM reservations r 
            JOIN services s ON r.service_id = s.id 
            WHERE r.statut = 'confirme'
        `);
        const prestationRevenue = Number(prestationRevRow.total || 0);

        // Revenus Abonnements Wave (somme des transactions 'completed')
        const [[waveSubRevRow]] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS total 
            FROM wave_transactions 
            WHERE status = 'completed'
        `);
        const subscriptionRevenue = Number(waveSubRevRow.total || 0);
        const totalRevenue = prestationRevenue + subscriptionRevenue;

        // 2. Récupération des données pour les sections/onglets
        // A. Tous les Utilisateurs
        const [users] = await pool.query(`
            SELECT id, email, nom_complet, role, expertise, bio, telephone, 
                   subscription_status, subscription_expires_at, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);

        // B. Toutes les Réservations de la plateforme
        const [reservations] = await pool.query(`
            SELECT 
                r.id, r.utilisateur_id, r.date_reservation, r.heure_reservation, r.statut, r.created_at,
                r.prenom, r.nom, r.email, r.telephone,
                s.nom AS service_nom, s.prix, s.duree_minutes, s.domaine,
                u.id AS coach_id, u.nom_complet AS coach_nom, u.email AS coach_email
            FROM reservations r
            JOIN services s ON r.service_id = s.id
            LEFT JOIN users u ON s.coach_id = u.id
            ORDER BY r.created_at DESC
        `);

        // C. Abonnements Coachs & échéances
        const [subscriptions] = await pool.query(`
            SELECT id, nom_complet, email, telephone, expertise, subscription_status, subscription_expires_at, created_at,
                   DATEDIFF(subscription_expires_at, NOW()) AS jours_restants
            FROM users
            WHERE role IN ('coach', 'admin')
            ORDER BY subscription_expires_at DESC, created_at DESC
        `);

        // D. Paiements & Transactions Wave
        const [transactions] = await pool.query(`
            SELECT 
                t.id, t.coach_id, t.client_reference, t.wave_session_id, t.wave_transaction_id, 
                t.amount, t.currency, t.status, t.created_at, t.completed_at,
                u.nom_complet AS coach_nom, u.email AS coach_email, u.telephone AS coach_telephone
            FROM wave_transactions t
            LEFT JOIN users u ON t.coach_id = u.id
            ORDER BY t.created_at DESC
        `);

        // E. Réclamations & Support
        const [reclamations] = await pool.query(`
            SELECT * FROM reclamations 
            ORDER BY FIELD(statut, 'ouvert', 'en_cours', 'resolu', 'ferme'), created_at DESC
        `);

        // F. Paramètres du SaaS
        const [settingsRows] = await pool.query('SELECT * FROM platform_settings');
        const settings = {};
        settingsRows.forEach(row => {
            settings[row.cle] = row.valeur;
        });

        // G. Évolution mensuelle pour le graphique Chart.js
        const [monthlyTrends] = await pool.query(`
            SELECT 
                DATE_FORMAT(r.created_at, '%Y-%m') AS mois,
                COUNT(*) AS count_reservations,
                COALESCE(SUM(CASE WHEN r.statut = 'confirme' THEN s.prix ELSE 0 END), 0) AS ca_reservations
            FROM reservations r
            JOIN services s ON r.service_id = s.id
            GROUP BY DATE_FORMAT(r.created_at, '%Y-%m')
            ORDER BY mois ASC
            LIMIT 12
        `);

        const stats = {
            totalClients,
            totalCoaches,
            totalAdmins,
            activeSubscriptions,
            totalReservations,
            confirmedReservations,
            pendingReservations,
            cancelledReservations,
            confirmationRate,
            prestationRevenue,
            subscriptionRevenue,
            totalRevenue
        };

        res.render('admin_dashboard', {
            adminUser,
            stats,
            users,
            reservations,
            subscriptions,
            transactions,
            reclamations,
            settings,
            monthlyTrends,
            query: req.query
        });
    } catch (error) {
        console.error("Erreur chargement dashboard admin :", error);
        res.status(500).send("Erreur lors du chargement du tableau de bord administrateur.");
    }
});

// ACTION ADMIN : Modifier le rôle d'un utilisateur
app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        if (['admin', 'coach', 'client'].includes(role)) {
            await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);
        }
        res.redirect('/admin/dashboard?tab=users&success=role_updated');
    } catch (err) {
        console.error("Erreur mise à jour rôle utilisateur :", err);
        res.redirect('/admin/dashboard?tab=users&error=role_failed');
    }
});

// ACTION ADMIN : Gérer l'abonnement d'un coach (+30 jours ou activer/désactiver)
app.post('/admin/users/:id/abonnement', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;
    try {
        if (action === 'extend30' || action === 'activate') {
            await pool.query(`
                UPDATE users 
                SET subscription_status = 'active',
                    subscription_expires_at = DATE_ADD(GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()), INTERVAL 30 DAY)
                WHERE id = ?
            `, [id]);
        } else if (action === 'deactivate') {
            await pool.query(`
                UPDATE users 
                SET subscription_status = 'inactive',
                    subscription_expires_at = NOW()
                WHERE id = ?
            `, [id]);
        }
        res.redirect('/admin/dashboard?tab=subscriptions&success=sub_updated');
    } catch (err) {
        console.error("Erreur modification abonnement utilisateur :", err);
        res.redirect('/admin/dashboard?tab=subscriptions&error=sub_failed');
    }
});

// ACTION ADMIN : Supprimer un utilisateur
app.post('/admin/users/:id/supprimer', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        if (Number(id) === Number(req.session.userId)) {
            return res.redirect('/admin/dashboard?tab=users&error=cannot_delete_self');
        }
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.redirect('/admin/dashboard?tab=users&success=user_deleted');
    } catch (err) {
        console.error("Erreur suppression utilisateur :", err);
        res.redirect('/admin/dashboard?tab=users&error=delete_failed');
    }
});

// ACTION ADMIN : Valider manuellement une transaction Wave
app.post('/admin/transactions/:id/valider', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [txRows] = await pool.query('SELECT * FROM wave_transactions WHERE id = ?', [id]);
        if (txRows.length > 0) {
            const tx = txRows[0];
            await pool.query(`
                UPDATE wave_transactions 
                SET status = 'completed', completed_at = NOW() 
                WHERE id = ?
            `, [id]);

            if (tx.coach_id) {
                await pool.query(`
                    UPDATE users 
                    SET subscription_status = 'active',
                        subscription_expires_at = DATE_ADD(GREATEST(COALESCE(subscription_expires_at, NOW()), NOW()), INTERVAL 30 DAY)
                    WHERE id = ?
                `, [tx.coach_id]);
            }
        }
        res.redirect('/admin/dashboard?tab=payments&success=tx_validated');
    } catch (err) {
        console.error("Erreur validation transaction Wave :", err);
        res.redirect('/admin/dashboard?tab=payments&error=tx_failed');
    }
});

// ACTION ADMIN : Mettre à jour le statut et la réponse d'une réclamation
app.post('/admin/reclamations/:id/statut', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { statut, reponse } = req.body;
    try {
        await pool.query(`
            UPDATE reclamations 
            SET statut = ?, reponse = COALESCE(?, reponse) 
            WHERE id = ?
        `, [statut, reponse ? reponse.trim() : null, id]);
        res.redirect('/admin/dashboard?tab=reclamations&success=ticket_updated');
    } catch (err) {
        console.error("Erreur mise à jour ticket réclamation :", err);
        res.redirect('/admin/dashboard?tab=reclamations&error=ticket_failed');
    }
});

// ACTION ADMIN : Enregistrer les paramètres de la plateforme
app.post('/admin/settings', requireAdmin, async (req, res) => {
    try {
        const settingsObj = req.body;
        for (const [key, val] of Object.entries(settingsObj)) {
            if (val !== undefined && val !== null) {
                await pool.query(`
                    INSERT INTO platform_settings (cle, valeur) 
                    VALUES (?, ?) 
                    ON DUPLICATE KEY UPDATE valeur = VALUES(valeur)
                `, [key, String(val).trim()]);
            }
        }
        res.redirect('/admin/dashboard?tab=settings&success=settings_saved');
    } catch (err) {
        console.error("Erreur enregistrement paramètres :", err);
        res.redirect('/admin/dashboard?tab=settings&error=settings_failed');
    }
});

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
            amount: 5000,
            paymentUrl: waveService.getBusinessPaymentUrl(5000)
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

        // Récupérer les détails complets (avec coach, date, heure) pour notifier le client
        const [rows] = await pool.query(`
            SELECT 
                reservations.id AS reservation_id,
                reservations.prenom, 
                reservations.nom, 
                reservations.email, 
                reservations.telephone,
                reservations.date_reservation,
                reservations.heure_reservation,
                reservations.utilisateur_id,
                services.nom AS service_nom,
                users.nom_complet AS coach_nom
            FROM reservations 
            JOIN services ON reservations.service_id = services.id
            LEFT JOIN users ON services.coach_id = users.id
            WHERE reservations.id = ?
        `, [id]);

        let emailReport = 'none';

        if (rows.length > 0 && rows[0].email) {
            const { prenom, nom, email, date_reservation, heure_reservation, service_nom, coach_nom, utilisateur_id } = rows[0];
            const coachDisplay = coach_nom || req.session.nom_complet || 'Votre coach';
            const dateStr = (date_reservation instanceof Date) 
                ? date_reservation.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) 
                : date_reservation;
            const heureStr = heure_reservation || '10:00';
            const clientNomComplet = `${prenom || ''} ${nom || ''}`.trim();

            let sujet = 'Mise à jour de votre réservation';
            let message = '';

            if (statut === 'confirme') {
                sujet = `Votre réservation pour ${service_nom} est confirmée ✅`;
                message = `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #10b981;">Réservation Confirmée !</h2>
                            <p>Bonjour ${prenom || ''} ${nom || ''},</p>
                            <p>Excellente nouvelle ! Votre coach <strong>${coachDisplay}</strong> a <strong>confirmé</strong> votre séance pour <strong>${service_nom}</strong> le <strong>${dateStr} à ${heureStr}</strong>.</p>
                            <p>Préparez vos questions et vos objectifs avant la séance.</p>
                            <p style="color: #64748b; font-size: 13px;">L'équipe CoachFlow</p>
                           </div>`;

                // 🔔 1. ENREGISTREMENT DE LA NOTIFICATION INTERNE EN BDD POUR LE CLIENT
                try {
                    await notificationService.createNotification({
                        reservation_id: id,
                        user_id: utilisateur_id || null,
                        client_email: email,
                        client_nom: clientNomComplet,
                        titre: `Réservation confirmée avec ${coachDisplay} ✅`,
                        message: `Votre réservation pour "${service_nom}" avec le coach ${coachDisplay} a été confirmée pour le ${dateStr} à ${heureStr}.`,
                        coach_nom: coachDisplay,
                        date_seance: dateStr,
                        heure_seance: heureStr,
                        service_nom: service_nom,
                        type: 'reservation_confirmee'
                    });
                } catch (notifErr) {
                    console.error("Erreur création notification BDD :", notifErr.message);
                }

            } else if (statut === 'annule') {
                sujet = `Votre réservation pour ${service_nom} a été annulée`;
                message = `<div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                            <h2 style="color: #ef4444;">Réservation Annulée</h2>
                            <p>Bonjour ${prenom || ''} ${nom || ''},</p>
                            <p>Votre réservation pour <strong>${service_nom}</strong> avec <strong>${coachDisplay}</strong> le <strong>${dateStr} à ${heureStr}</strong> n'a pas pu être honorée et a été annulée.</p>
                            <p>N'hésitez pas à choisir un autre créneau disponible sur notre catalogue.</p>
                            <p style="color: #64748b; font-size: 13px;">L'équipe CoachFlow</p>
                           </div>`;

                // 🔔 2. ENREGISTREMENT DE LA NOTIFICATION D'ANNULATION EN BDD
                try {
                    await notificationService.createNotification({
                        reservation_id: id,
                        user_id: utilisateur_id || null,
                        client_email: email,
                        client_nom: clientNomComplet,
                        titre: `Réservation non confirmée : ${service_nom}`,
                        message: `Votre séance pour "${service_nom}" le ${dateStr} à ${heureStr} a été annulée.`,
                        coach_nom: coachDisplay,
                        date_seance: dateStr,
                        heure_seance: heureStr,
                        service_nom: service_nom,
                        type: 'reservation_annulee'
                    });
                } catch (notifErr) {
                    console.error("Erreur création notification BDD :", notifErr.message);
                }
            }
        }

        // Redirection vers le dashboard adapté (admin ou coach) avec confirmation
        const referer = req.headers.referer || '';
        if (referer.includes('/admin/dashboard')) {
            return res.redirect('/admin/dashboard?tab=reservations&success=reservation_updated');
        }
        res.redirect('/coach/dashboard?status_updated=1');
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
    const amount = Number(req.body?.amount || req.query?.amount) || 5000; // Montant de l'abonnement : 5 000 FCFA

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
                                    <p>Votre paiement mensuel de <strong>5 000 FCFA</strong> via Wave a bien été confirmé.</p>
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
             VALUES (?, ?, 5000, 'XOF', 'completed', ?, NOW())`,
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
    const paymentAmount = Number(amount) || 5000;

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

// ==========================================
// 5. API NOTIFICATIONS INTERNES
// ==========================================

// Récupérer les notifications et le compteur non lu
app.get('/api/notifications', async (req, res) => {
    try {
        const email = req.query.email || (req.session && (req.session.email || req.session.clientEmail));
        const userId = req.session && req.session.userId ? req.session.userId : null;

        if (!email && !userId) {
            return res.json({ success: true, unreadCount: 0, notifications: [] });
        }

        const [notifications, unreadCount] = await Promise.all([
            notificationService.getNotifications({ email, userId, limit: 30 }),
            notificationService.getUnreadCount({ email, userId })
        ]);

        return res.json({
            success: true,
            email: email || '',
            unreadCount,
            notifications
        });
    } catch (error) {
        console.error("Erreur API GET /api/notifications :", error);
        return res.status(500).json({ error: "Erreur serveur lors de la récupération des notifications." });
    }
});

// Marquer une notification comme lue
app.post('/api/notifications/:id/lire', async (req, res) => {
    try {
        const notifId = req.params.id;
        const email = req.body?.email || req.query?.email || (req.session && (req.session.email || req.session.clientEmail));
        const userId = req.session && req.session.userId ? req.session.userId : null;

        await notificationService.markAsRead(notifId, { email, userId });
        return res.json({ success: true, message: "Notification marquée comme lue." });
    } catch (error) {
        console.error("Erreur API POST /api/notifications/:id/lire :", error);
        return res.status(500).json({ error: "Erreur serveur" });
    }
});

// Marquer toutes les notifications comme lues
app.post('/api/notifications/tout-lire', async (req, res) => {
    try {
        const email = req.body?.email || req.query?.email || (req.session && (req.session.email || req.session.clientEmail));
        const userId = req.session && req.session.userId ? req.session.userId : null;

        if (!email && !userId) {
            return res.status(400).json({ error: "Email ou session requis pour marquer tout comme lu." });
        }

        await notificationService.markAllAsRead({ email, userId });
        return res.json({ success: true, message: "Toutes les notifications ont été marquées comme lues." });
    } catch (error) {
        console.error("Erreur API POST /api/notifications/tout-lire :", error);
        return res.status(500).json({ error: "Erreur serveur" });
    }
});

// ==========================================
// 6. ESPACE COMPTE CLIENT & RÉSERVATIONS
// ==========================================

// Afficher la page du compte client avec ses réservations et ses notifications internes
app.get('/client/compte', async (req, res) => {
    try {
        const clientEmail = req.query.email || (req.session && (req.session.clientEmail || req.session.email));
        let reservations = [];
        let notifications = [];

        if (clientEmail && clientEmail.trim() !== '') {
            const cleanEmail = clientEmail.trim().toLowerCase();

            // 1. Récupérer toutes les réservations de ce client
            const [resRows] = await pool.query(`
                SELECT reservations.*, services.nom AS service_nom, services.prix, services.duree_minutes, services.domaine, users.nom_complet AS coach_nom
                FROM reservations
                JOIN services ON reservations.service_id = services.id
                LEFT JOIN users ON services.coach_id = users.id
                WHERE LOWER(reservations.email) = ?
                ORDER BY reservations.created_at DESC
            `, [cleanEmail]);
            reservations = resRows;

            // 2. Récupérer les notifications internes de ce client
            notifications = await notificationService.getNotifications({ email: cleanEmail, limit: 50 });
        }

        const waveBusiness = {
            name: process.env.WAVE_BUSINESS_NAME || 'CoachFlow Sénégal',
            url: process.env.WAVE_BUSINESS_URL || 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/',
            phone: process.env.WAVE_BUSINESS_PHONE || '+221 70 989 97 94',
            number: process.env.WAVE_BUSINESS_NUMBER || '709899794'
        };

        res.render('client_compte', {
            clientEmail: clientEmail || '',
            reservations,
            notifications,
            waveBusiness
        });
    } catch (error) {
        console.error("Erreur chargement compte client :", error);
        res.status(500).send("Erreur lors du chargement de votre espace client.");
    }
});

// Modifier ou définir l'email du client actif dans la session
app.post('/client/compte', (req, res) => {
    const { email } = req.body;
    if (email && email.trim() !== '') {
        req.session.clientEmail = email.trim();
        return res.redirect(`/client/compte?email=${encodeURIComponent(email.trim())}`);
    }
    return res.redirect('/client/compte');
});

// Alias pour la page des réservations client
app.get('/client/reservations', (req, res) => {
    res.redirect('/client/compte');
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CoachFlow SaaS actif sur : http://localhost:${PORT}/catalogue`);
});