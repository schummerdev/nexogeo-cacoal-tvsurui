const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.prod') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        const res = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM participantes) as regular_count,
        (SELECT COUNT(*) FROM public_participants) as public_count,
        (SELECT COUNT(*) FROM usuarios) as usuarios_count
    `);
        console.log('--- CONTAGEM DE REGISTROS ---');
        console.table(res.rows);
    } catch (err) {
        console.error('Erro ao verificar contagem:', err.message);
    } finally {
        await pool.end();
    }
}

check();
