const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.prod') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runIncrementalMigration() {
    try {
        const sqlPath = path.join(__dirname, 'database_migration_incremental.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('🚀 Iniciando aplicação de migração incremental segura...');
        await pool.query(sql);
        console.log('✅ Migração incremental aplicada com sucesso!');

        // Garantir normalização de telefones pós-migração
        console.log('📱 Normalizando telefones para garantir integridade...');
        await pool.query(`
      UPDATE participantes SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '', 'g') WHERE telefone ~ '[^0-9]';
      UPDATE public_participants SET phone = REGEXP_REPLACE(phone, '[^0-9]', '', 'g') WHERE phone ~ '[^0-9]';
    `);
        console.log('✅ Telefones normalizados.');

    } catch (err) {
        console.error('❌ Erro durante a migração:', err.message);
    } finally {
        await pool.end();
    }
}

runIncrementalMigration();
