#!/usr/bin/env node

/**
 * Script de Validação de Schema PostgreSQL
 * Conecta ao banco Neon e verifica se todas as colunas e tabelas esperadas existem
 */

const { Pool } = require('pg');

// Connection string do Neon (do erro navegador.md)
const DATABASE_URL = 'postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  statement_timeout: 30000,
});

// Schema esperado baseado nas migrações
const expectedSchema = {
  promocoes: [
    'id', 'titulo', 'descricao', 'status', 'created_at', 'updated_at',
    'deleted_at',      // ✅ FALTA: add-soft-delete-columns.sql
    'deleted_by',      // ✅ FALTA: add-soft-delete-columns.sql
    'is_drawing',      // ✅ FALTA: add-is-drawing-column.sql
  ],
  ganhadores: [
    'id', 'sorteio_id', 'user_id', 'usuario_id', 'created_at', 'sorteado_em',
    'cancelado',       // ✅ FALTA: add-cancelado-to-ganhadores.sql
    'deleted_at',      // ✅ FALTA: add-soft-delete-columns.sql
    'deleted_by',      // ✅ FALTA: add-soft-delete-columns.sql
  ],
  participantes: [
    'id', 'nome', 'email', 'created_at',
    'deleted_at',      // ✅ FALTA: add-soft-delete-columns.sql
    'deleted_by',      // ✅ FALTA: add-soft-delete-columns.sql
  ],
  rate_limits: [
    'id', 'ip', 'user_id', 'endpoint', 'created_at',
    // ✅ FALTA: criar-rate-limits-table.sql (tabela inteira)
  ],
  usuarios: [
    'id', 'email', 'nome', 'created_at', 'updated_at',
  ],
};

async function validateSchema() {
  try {
    console.log('📡 Conectando ao banco PostgreSQL Neon...');

    const client = await pool.connect();
    console.log('✅ Conectado com sucesso!\n');

    // Testar se consegue consultar
    const versionResult = await client.query('SELECT version()');
    console.log('🔍 Versão do PostgreSQL:', versionResult.rows[0].version.split(',')[0]);
    console.log('');

    let hasIssues = false;

    // Para cada tabela esperada
    for (const [tableName, expectedColumns] of Object.entries(expectedSchema)) {
      console.log(`\n📋 Validando tabela: ${tableName}`);
      console.log('─'.repeat(50));

      try {
        // Verificar se tabela existe
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          );
        `, [tableName]);

        if (!tableCheck.rows[0].exists) {
          console.log(`❌ Tabela NÃO EXISTE: ${tableName}`);
          hasIssues = true;
          continue;
        }

        console.log(`✅ Tabela existe: ${tableName}`);

        // Pegar colunas da tabela
        const columnQuery = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        const actualColumns = columnQuery.rows.map(r => r.column_name);

        // Verificar colunas esperadas
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedSchema[tableName] || !expectedSchema[tableName].includes(col));

        if (missingColumns.length > 0) {
          console.log(`\n⚠️  COLUNAS FALTANDO EM ${tableName}:`);
          missingColumns.forEach(col => {
            console.log(`   ❌ ${col}`);
          });
          hasIssues = true;
        }

        // Mostrar colunas atuais
        console.log(`\n✅ Colunas presentes (${actualColumns.length}):`);
        actualColumns.forEach(col => {
          const isMissing = missingColumns.includes(col);
          const prefix = isMissing ? '❌' : '✅';
          console.log(`   ${prefix} ${col}`);
        });

      } catch (error) {
        console.log(`❌ Erro ao validar ${tableName}:`, error.message);
        hasIssues = true;
      }
    }

    // Verificar tabela rate_limits especialmente
    console.log(`\n\n📋 Validando TABELA ESPECIAL: rate_limits`);
    console.log('─'.repeat(50));
    try {
      const rateTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'rate_limits'
        );
      `);

      if (!rateTableCheck.rows[0].exists) {
        console.log(`❌ Tabela rate_limits NÃO EXISTE`);
        console.log(`   Precisa executar: create-rate-limits-table.sql`);
        hasIssues = true;
      } else {
        console.log(`✅ Tabela rate_limits existe`);
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar rate_limits:`, error.message);
    }

    // Verificar função PostgreSQL
    console.log(`\n\n📋 Validando FUNÇÃO PostgreSQL: cleanup_old_rate_limits()`);
    console.log('─'.repeat(50));
    try {
      const funcCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.routines
          WHERE routine_schema = 'public'
          AND routine_name = 'cleanup_old_rate_limits'
        );
      `);

      if (!funcCheck.rows[0].exists) {
        console.log(`❌ Função cleanup_old_rate_limits() NÃO EXISTE`);
        console.log(`   Precisa executar: create-rate-limits-table.sql`);
        hasIssues = true;
      } else {
        console.log(`✅ Função cleanup_old_rate_limits() existe`);
      }
    } catch (error) {
      console.log(`❌ Erro ao verificar função:`, error.message);
    }

    client.release();

    // Resumo final
    console.log(`\n\n${'='.repeat(50)}`);
    if (hasIssues) {
      console.log(`⚠️  PROBLEMAS ENCONTRADOS - Migrações pendentes detectadas!`);
      console.log(`\n📝 Próximos passos:`);
      console.log(`   1. Execute as migrações no banco do Vercel`);
      console.log(`   2. Use o script: npm run migrate`);
      console.log(`   3. Ou execute manualmente os arquivos SQL em api/migrations/`);
    } else {
      console.log(`✅ Schema validado com sucesso! Todas as colunas existem.`);
    }
    console.log(`${'='.repeat(50)}\n`);

  } catch (error) {
    console.error('❌ ERRO CRÍTICO:', error.message);
    console.error('\nVerifique:');
    console.error('  1. DATABASE_URL está correto?');
    console.error('  2. Conexão ao Neon está ativa?');
    console.error('  3. Credenciais estão válidas?');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar validação
validateSchema();
