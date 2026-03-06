const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.prod') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'apply_corrections.sql'), 'utf8');
        console.log('🚀 Aplicando correções...');
        await pool.query(sql);
        console.log('✅ Correções aplicadas com sucesso!');
    } catch (err) {
        console.error('❌ Erro ao aplicar correções:', err);
    } finally {
        await pool.end();
    }
}

run();
