require('dotenv').config({ path: '.env.prod' });
const { Pool } = require('pg');

async function dropAll() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('🗑️ Dropping all tables in public schema...');

        // Obter todos os nomes de tabelas
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
        const tables = res.rows.map(r => r.table_name);

        if (tables.length === 0) {
            console.log('No tables to drop.');
            return;
        }

        // Dropar cada tabela com CASCADE
        for (const table of tables) {
            console.log(`Dropping ${table}...`);
            await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        }

        console.log('✅ All tables dropped.');
    } catch (error) {
        console.error('❌ Error dropping tables:', error);
    } finally {
        await pool.end();
    }
}

dropAll();
