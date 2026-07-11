const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function creerAdmin() {
    const email = 'papeibrahimasane221@gmail.com'; // CHANGE ICI
    const motDePasse = '221Etudiant#@@2025'; // CHANGE ICI

    const hash = await bcrypt.hash(motDePasse, 10);

    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'reservation_db'
    });

    await pool.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hash, 'admin']
    );

    console.log('Admin créé avec succès :', email);
    process.exit();
}

creerAdmin();