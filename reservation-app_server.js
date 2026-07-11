require('dotenv').config();
const bcrypt = require('bcrypt');
const session = require('express-session');
const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    return res.redirect('/admin/login');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10
});

// ROUTE 1 : Afficher le catalogue complet des services
app.get('/catalogue', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM services ORDER BY id DESC');
        res.render('catalogue', { services: rows });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors du chargement des services de la base de données.");
    }
});

// ROUTE 2 : Formulaire de réservation pour un service ciblé
app.get('/reserver/:id', async (req, res) => {
    const serviceId = req.params.id;
    try {
        const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]);
        if (rows.length === 0) return res.status(404).send("Service non trouvé");
        res.render('formulaire_reservation', { service: rows[0] });
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur interne du serveur");
    }
});

// ROUTE 3 : Traitement et validation sécurisée du créneau
app.post('/reserver/confirmer', async (req, res) => {
    const { service_id, utilisateur_id, date_reservation } = req.body;
    try {
        const [dejaPris] = await pool.query(
            "SELECT * FROM reservations WHERE service_id = ? AND date_reservation = ? AND statut != 'annule'",
            [service_id, date_reservation]
        );
        if (dejaPris.length > 0) {
            return res.send("<h3>Ce créneau horaire est déjà réservé. Veuillez choisir une autre date.</h3><a href='/catalogue'>Retour au catalogue</a>");
        }

        await pool.query(
            "INSERT INTO reservations (utilisateur_id, service_id, date_reservation, statut) VALUES (?, ?, ?, 'en_attente')",
            [utilisateur_id, service_id, date_reservation]
        );
        res.send("<h3>Votre réservation a bien été enregistrée avec succès !</h3><a href='/catalogue'>Retour au catalogue</a>");
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors de l'enregistrement de la réservation.");
    }
});

// Redirection automatique de l'accueil vers le catalogue
app.get('/', (req, res) => {
    res.redirect('/catalogue');
});

// Formulaire de connexion admin
app.get('/admin/login', (req, res) => {
    res.render('admin_login', { erreur: null });
});

// Traitement de la connexion
app.post('/admin/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.render('admin_login', { erreur: 'Identifiants incorrects' });
        }
        const user = rows[0];
        const motDePasseValide = await bcrypt.compare(password, user.password);
        if (!motDePasseValide) {
            return res.render('admin_login', { erreur: 'Identifiants incorrects' });
        }
        req.session.userId = user.id;
        req.session.email = user.email;
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la connexion');
    }
});

// Déconnexion
app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

// Dashboard admin (protégé)
app.get('/admin/dashboard', requireAuth, async (req, res) => {
    try {
        const [services] = await pool.query('SELECT * FROM services ORDER BY id DESC');
        const [reservations] = await pool.query(
            `SELECT reservations.*, services.nom AS service_nom 
             FROM reservations 
             JOIN services ON reservations.service_id = services.id 
             ORDER BY reservations.created_at DESC`
        );
        res.render('admin_dashboard', { services, reservations, email: req.session.email });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors du chargement du dashboard');
    }
});

// Formulaire d'ajout d'un nouveau service
app.get('/admin/services/nouveau', requireAuth, (req, res) => {
    res.render('admin_service_nouveau');
});

// Traitement de l'ajout d'un service
app.post('/admin/services/nouveau', requireAuth, async (req, res) => {
    const { nom, description, prix, duree_minutes } = req.body;
    try {
        await pool.query(
            'INSERT INTO services (nom, description, prix, duree_minutes) VALUES (?, ?, ?, ?)',
            [nom, description, prix, duree_minutes]
        );
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors de l'ajout du service");
    }
});

// Changer le statut d'une réservation
app.post('/admin/reservations/:id/statut', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { statut } = req.body;
    try {
        await pool.query('UPDATE reservations SET statut = ? WHERE id = ?', [statut, id]);
        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erreur lors de la mise à jour du statut');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur actif et prêt : http://localhost:${PORT}/catalogue`));