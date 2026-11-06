const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

async function exportDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'reservation_db'
    });

    console.log('Connexion réussie, extraction de la base...');
    const [tables] = await connection.query('SHOW TABLES');
    let sqlOutput = `-- CoachFlow Database Dump\n-- Generated on ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

    for (const row of tables) {
        const tableName = Object.values(row)[0];
        console.log(`Export de la table : ${tableName}`);

        // Structure
        const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
        sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
        sqlOutput += createTableResult[0]['Create Table'] + ';\n\n';

        // Données
        const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
        if (rows.length > 0) {
            const columns = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
            for (const r of rows) {
                const values = Object.values(r).map(v => {
                    if (v === null) return 'NULL';
                    if (typeof v === 'number') return v;
                    if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`;
                    if (typeof v === 'boolean') return v ? 1 : 0;
                    return `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
                }).join(', ');
                sqlOutput += `INSERT INTO \`${tableName}\` (${columns}) VALUES (${values});\n`;
            }
            sqlOutput += '\n';
        }
    }

    sqlOutput += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    fs.writeFileSync('database_dump.sql', sqlOutput, 'utf8');
    console.log('✅ Export terminé dans database_dump.sql');
    await connection.end();
}

exportDatabase().catch(err => {
    console.error('Erreur export :', err);
    process.exit(1);
});

