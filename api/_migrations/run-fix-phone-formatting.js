/**
 * Script para executar migração de normalização de telefones
 * Uso: node api/migrations/run-fix-phone-formatting.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 🔧 Carregar variáveis de ambiente do arquivo .env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📊 Iniciando migração de normalização de telefones...\n');

    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'fix-phone-formatting.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Dividir em queries individuais
    const queries = sql
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    console.log(`📝 Executando ${queries.length} queries...\n`);

    // Executar cada query
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];

      if (query.toLowerCase().includes('select')) {
        console.log(`\n🔍 Query ${i + 1}:`);
        const result = await client.query(query);

        if (result.rows.length > 0) {
          console.table(result.rows);
        } else {
          console.log('   (nenhum registro retornado)');
        }
      } else if (query.toLowerCase().includes('update')) {
        console.log(`\n✏️  Query ${i + 1}: Atualizando registros...`);
        const result = await client.query(query);
        console.log(`   ✅ ${result.rowCount} registros atualizados`);
      }
    }

    console.log('\n✅ Migração concluída com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao executar migração:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigration };
