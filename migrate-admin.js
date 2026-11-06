const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateAdmin() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reservation_db'
    });

    try {
        console.log('--- Migration Base de Données : Dashboard Admin & Support ---');

        // 1. Table des Réclamations / Support
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reclamations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                sujet VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                statut VARCHAR(30) DEFAULT 'ouvert',
                reponse TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table reclamations prête.');

        // 2. Table des Paramètres Plateforme (Settings)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                cle VARCHAR(100) PRIMARY KEY,
                valeur TEXT NOT NULL,
                description VARCHAR(255) NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Table platform_settings prête.');

        // 3. Valeurs par défaut des paramètres
        const defaultSettings = [
            ['app_name', 'CoachFlow Sénégal', 'Nom public du SaaS'],
            ['subscription_price', '5000', 'Tarif mensuel abonnement coach en FCFA'],
            ['wave_business_url', 'https://pay.wave.com/m/M_sn_knnmQCZiVi3h/c/sn/', 'Lien marchand Wave Business'],
            ['wave_business_phone', '+221 70 989 97 94', 'Numéro Wave Business officiel'],
            ['contact_email', 'papeibrahimasane221@gmail.com', 'Email de contact support'],
            ['currency', 'FCFA', 'Devise utilisée sur la plateforme']
        ];

        for (const [cle, valeur, desc] of defaultSettings) {
            await pool.query(
                `INSERT INTO platform_settings (cle, valeur, description) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE description = VALUES(description)`,
                [cle, valeur, desc]
            );
        }
        console.log('✅ Paramètres par défaut insérés.');

        // 4. Insérer des réclamations d'exemple si la table est vide pour un rendu visuel complet
        const [reclamCount] = await pool.query('SELECT COUNT(*) AS total FROM reclamations');
        if (reclamCount[0].total === 0) {
            await pool.query(`
                INSERT INTO reclamations (nom, email, sujet, message, statut) VALUES
                ('Fatou Ndiaye', 'fatou.ndiaye@gmail.com', 'Question sur le paiement Wave', 'Bonjour, mon reçu Wave mentionne la transaction WB_102, je voulais savoir si ma séance est confirmée.', 'ouvert'),
                ('Ibrahima Ba', 'ibrahima.ba@yahoo.fr', 'Demande de report de séance', 'Bonjour cher coach, j ai un empêchement pour la date prévue, puis-je décaler au lendemain ?', 'en_cours'),
                ('Awa Diop', 'awa.diop@outlook.com', 'Remerciement pour la formation', 'La séance avec le coach s est très bien passée, merci pour la plateforme !', 'resolu')
            `);
            console.log('✅ Réclamations de démonstration ajoutées.');
        }

        console.log('Migration Admin terminée avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur migration admin :', err);
        process.exit(1);
    }
}

migrateAdmin();

