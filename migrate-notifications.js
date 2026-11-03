const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateNotifications() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reservation_db'
    });

    try {
        console.log('--- Migration Base de Données : Notifications & Horaires ---');

        // 1. Ajouter heure_reservation à la table reservations si absente
        const [resCols] = await pool.query("SHOW COLUMNS FROM reservations LIKE 'heure_reservation'");
        if (resCols.length === 0) {
            await pool.query("ALTER TABLE reservations ADD COLUMN heure_reservation VARCHAR(20) DEFAULT '10:00'");
            console.log('✅ Colonne heure_reservation ajoutée à la table reservations.');
        } else {
            console.log('ℹ️ Colonne heure_reservation déjà existante dans reservations.');
        }

        // 2. Créer la table notifications
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
        console.log('✅ Table notifications prête.');

        console.log('Migration Notifications terminée avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erreur migration notifications :', err);
        process.exit(1);
    }
}

migrateNotifications();

