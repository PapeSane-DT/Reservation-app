const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrateWave() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reservation_db'
    });

    try {
        console.log('--- Migration Base de Données : Wave Subscriptions ---');

        // 1. Ajouter les colonnes d'abonnement sur la table users
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive',
            ADD COLUMN IF NOT EXISTS subscription_expires_at DATETIME DEFAULT NULL
        `);
        console.log('Colonnes subscription_status et subscription_expires_at ajoutées à users.');

        // 2. Créer la table des transactions Wave
        await pool.query(`
            CREATE TABLE IF NOT EXISTS wave_transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                coach_id INT NOT NULL,
                client_reference VARCHAR(150) NOT NULL UNIQUE,
                wave_session_id VARCHAR(150) NULL,
                wave_transaction_id VARCHAR(150) NULL,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(10) DEFAULT 'XOF',
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP NULL DEFAULT NULL,
                FOREIGN KEY (coach_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Table wave_transactions prête.');

        console.log('Migration Wave terminée avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('Erreur migration Wave :', err);
        process.exit(1);
    }
}

migrateWave();
