/**
 * Script para aplicar as migrações incrementais das enquetes no novo banco demo
 */
require('dotenv').config({ path: '.env.prod' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applyIncremental() {
    const connectionString = process.env.DATABASE_URL;
    console.log('🔄 Conectando ao banco demo para aplicar migrações incrementais...');

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const migrations = [
        '014_create_enquetes_tables.sql',
        '015_add_participant_to_enquete_votos.sql',
        '016_add_mostrar_votos_to_enquetes.sql'
    ];

    try {
        for (const mig of migrations) {
            console.log(`📜 Aplicando ${mig}...`);
            const migPath = path.join(__dirname, 'api', 'migrations', mig);
            const sql = fs.readFileSync(migPath, 'utf8');

            await pool.query(sql);
            console.log(`✅ ${mig} aplicada.`);
        }

        console.log('🚀 Todas as migrações incrementais foram aplicadas com sucesso!');

    } catch (error) {
        console.error('❌ Erro ao aplicar migrações incrementais:', error);
    } finally {
        await pool.end();
    }
}

applyIncremental();
