const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reservation_db'
    });

    console.log('Connexion à la base de données réussie...');

    try {
        // 1. Mettre à jour la table USERS
        await pool.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS nom_complet VARCHAR(150) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS expertise VARCHAR(100) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS telephone VARCHAR(50) DEFAULT NULL
        `);
        console.log('Table users mise à jour avec succès.');

        // 2. Mettre à jour la table SERVICES
        await pool.query(`
            ALTER TABLE services 
            ADD COLUMN IF NOT EXISTS coach_id INT(11) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS domaine VARCHAR(100) DEFAULT 'Business'
        `);
        console.log('Table services mise à jour avec succès.');

        // 3. Mettre à jour la table RESERVATIONS
        await pool.query(`
            ALTER TABLE reservations 
            ADD COLUMN IF NOT EXISTS prenom VARCHAR(100) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS nom VARCHAR(100) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS email VARCHAR(150) DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS telephone VARCHAR(50) DEFAULT NULL
        `);
        console.log('Table reservations mise à jour avec succès.');

        // Mettre à jour l'utilisateur admin existant comme premier coach
        await pool.query(`
            UPDATE users 
            SET nom_complet = 'Pape Ibrahima Sane',
                expertise = 'Business & Entrepreneuriat',
                bio = 'Coach certifié en création d\\'entreprise, stratégie business et financement.',
                role = 'coach'
            WHERE id = 1
        `);

        // Lier les services existants à ce coach et attribuer des domaines pertinents
        await pool.query(`UPDATE services SET coach_id = 1 WHERE coach_id IS NULL`);
        await pool.query(`UPDATE services SET domaine = 'Business' WHERE id IN (2, 3, 5, 6, 7)`);
        await pool.query(`UPDATE services SET domaine = 'Langues' WHERE id = 4`);
        await pool.query(`UPDATE services SET domaine = 'Droit & Conseil' WHERE id = 1`);

        // Ajouter des coachs variés d'exemple pour Fitness et Langues si absents
        const [existingCoaches] = await pool.query("SELECT * FROM users WHERE email = 'coach.fitness@example.com'");
        if (existingCoaches.length === 0) {
            const bcrypt = require('bcrypt');
            const pass = await bcrypt.hash('password123', 10);
            
            // Coach Fitness
            const [fitRes] = await pool.query(
                `INSERT INTO users (nom_complet, email, password, role, expertise, bio, telephone) 
                 VALUES (?, ?, ?, 'coach', ?, ?, ?)`,
                ['Amina Diop', 'coach.fitness@example.com', pass, 'Fitness', 'Coach sportive diplômée, spécialisée en remise en forme, renforcement musculaire et nutrition saine.', '+221 77 123 45 67']
            );
            const fitCoachId = fitRes.insertId;

            await pool.query(
                `INSERT INTO services (nom, description, prix, duree_minutes, coach_id, domaine) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Programme Remise en Forme 1-on-1', 'Séance intensive personnalisée de cardio et renforcement avec suivi alimentaire.', 15000, 60, fitCoachId, 'Fitness']
            );
            await pool.query(
                `INSERT INTO services (nom, description, prix, duree_minutes, coach_id, domaine) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Coaching HIIT & Perte de Poids', 'Entraînement par intervalles à haute intensité pour brûler les graisses.', 12000, 45, fitCoachId, 'Fitness']
            );

            // Coach Langues
            const [langRes] = await pool.query(
                `INSERT INTO users (nom_complet, email, password, role, expertise, bio, telephone) 
                 VALUES (?, ?, ?, 'coach', ?, ?, ?)`,
                ['Marc Ndione', 'coach.langues@example.com', pass, 'Langues', "Formateur bilingue Anglais et Espagnol professionnel avec plus de 8 ans d'expérience.", '+221 78 987 65 43']
            );
            const langCoachId = langRes.insertId;

            await pool.query(
                `INSERT INTO services (nom, description, prix, duree_minutes, coach_id, domaine) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Anglais des Affaires & Entretiens', 'Perfectionnement oral intensif pour réunions, présentations et entretiens internationaux.', 18000, 60, langCoachId, 'Langues']
            );
            await pool.query(
                `INSERT INTO services (nom, description, prix, duree_minutes, coach_id, domaine) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                ['Conversation Anglaise Débutant / Intermédiaire', 'Débloquez votre expression orale et prenez confiance rapidement.', 10000, 45, langCoachId, 'Langues']
            );
            console.log('Exemples de coachs Fitness et Langues ajoutés.');
        }

        console.log('Migration terminée avec succès !');
        process.exit(0);
    } catch (err) {
        console.error('Erreur lors de la migration :', err);
        process.exit(1);
    }
}

migrate();
