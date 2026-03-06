/**
 * Script para aplicar o esquema atualizado no novo banco de dados demo
 */
require('dotenv').config({ path: '.env.prod' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
    const connectionString = process.env.DATABASE_URL;
    console.log('🔄 Conectando ao banco demo...');
    console.log('📍 Host:', new URL(connectionString).host);

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const schemaPath = path.join(__dirname, 'api', 'migrations', 'schema_atual.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📜 Lendo schema_atual.sql...');

        // Executar o SQL completo
        // Nota: O arquivo já contém BEGIN; e COMMIT;
        await pool.query(sql);

        console.log('✅ Esquema aplicado com sucesso!');

        // Verificar uma tabela para confirmar
        const result = await pool.query("SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(`📊 Total de tabelas criadas: ${result.rows[0].count}`);

    } catch (error) {
        console.error('❌ Erro ao aplicar esquema:', error);
    } finally {
        await pool.end();
    }
}

applySchema();
