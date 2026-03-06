const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.prod') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function listColumns() {
    try {
        const res = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Erro ao listar colunas:', err.message);
    } finally {
        await pool.end();
    }
}

listColumns();
