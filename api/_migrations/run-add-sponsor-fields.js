// Carrega variáveis de ambiente do .env
require('dotenv').config();

const { query } = require('../../lib/db.js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    try {
        console.log('🚀 Executando migration: add-sponsor-fields.sql');

        const sqlPath = path.join(__dirname, 'add-sponsor-fields.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await query(sql);

        console.log('✅ Migration executada com sucesso!');
        console.log('📊 Novos campos adicionados à tabela sponsors:');
        console.log('   - logo_url (TEXT)');
        console.log('   - facebook_url (TEXT)');
        console.log('   - instagram_url (TEXT)');
        console.log('   - whatsapp (VARCHAR(20))');
        console.log('   - address (TEXT)');

        // Verificar campos criados
        const result = await query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'sponsors'
            ORDER BY ordinal_position
        `);

        console.log('\n📋 Estrutura atual da tabela sponsors:');
        console.table(result.rows);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

runMigration();
