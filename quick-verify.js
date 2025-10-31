#!/usr/bin/env node

/**
 * Script de verificação rápida do banco de dados
 * Uso: DATABASE_URL="..." node quick-verify.js
 */

const { Pool } = require('pg');

// Cores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function verify() {
  const connectionString = process.env.DATABASE_URL || process.argv[2];

  if (!connectionString) {
    log('❌ ERRO: DATABASE_URL não fornecida!', 'red');
    log('\nUso:', 'yellow');
    log('  DATABASE_URL="postgresql://..." node quick-verify.js', 'cyan');
    log('  ou', 'cyan');
    log('  node quick-verify.js "postgresql://..."', 'cyan');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: connectionString.includes('neon.tech') || connectionString.includes('vercel')
      ? { rejectUnauthorized: true }
      : false
  });

  try {
    log('\n' + '='.repeat(70), 'blue');
    log('🔍 VERIFICAÇÃO DO BANCO DE DADOS', 'blue');
    log('='.repeat(70), 'blue');

    // Testar conexão
    log('\n🔌 Testando conexão...', 'yellow');
    const connTest = await pool.query('SELECT NOW() as now, version() as version');
    log(`✅ Conectado com sucesso!`, 'green');
    log(`   Timestamp: ${connTest.rows[0].now}`, 'cyan');
    log(`   PostgreSQL: ${connTest.rows[0].version.split(',')[0]}`, 'cyan');

    // Listar tabelas esperadas
    const expectedTables = [
      'usuarios',
      'configuracoes_emissora',
      'promocoes',
      'participantes',
      'sponsors',
      'products',
      'games',
      'submissions',
      'public_participants',
      'referral_rewards'
    ];

    log('\n📊 CONTAGEM DE REGISTROS POR TABELA', 'blue');
    log('─'.repeat(70), 'blue');

    let totalRecords = 0;
    let tablesFound = 0;
    let tablesMissing = 0;

    for (const table of expectedTables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(result.rows[0].count);
        totalRecords += count;
        tablesFound++;

        const countStr = count.toString().padStart(8);
        const tableStr = table.padEnd(30);

        if (count === 0) {
          log(`⚠️  ${tableStr} ${countStr} registros`, 'yellow');
        } else {
          log(`✅ ${tableStr} ${countStr} registros`, 'green');
        }
      } catch (err) {
        tablesMissing++;
        log(`❌ ${table.padEnd(30)} TABELA NÃO EXISTE`, 'red');
      }
    }

    // Listar tabelas extras (não esperadas)
    log('\n🔎 VERIFICANDO TABELAS ADICIONAIS', 'blue');
    log('─'.repeat(70), 'blue');

    const allTablesResult = await pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const extraTables = allTablesResult.rows
      .map(row => row.tablename)
      .filter(name => !expectedTables.includes(name));

    if (extraTables.length > 0) {
      log(`ℹ️  Encontradas ${extraTables.length} tabelas adicionais:`, 'cyan');
      for (const table of extraTables) {
        const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
        const count = parseInt(result.rows[0].count);
        log(`   • ${table.padEnd(30)} ${count.toString().padStart(8)} registros`, 'cyan');
      }
    } else {
      log('✅ Nenhuma tabela adicional encontrada', 'green');
    }

    // Verificar dados críticos
    log('\n🔐 VERIFICAÇÃO DE DADOS CRÍTICOS', 'blue');
    log('─'.repeat(70), 'blue');

    // Usuário admin
    try {
      const adminResult = await pool.query(`SELECT COUNT(*) FROM usuarios WHERE role = 'admin'`);
      const adminCount = parseInt(adminResult.rows[0].count);
      if (adminCount > 0) {
        log(`✅ Usuários admin encontrados: ${adminCount}`, 'green');
      } else {
        log(`⚠️  ATENÇÃO: Nenhum usuário admin encontrado!`, 'yellow');
      }
    } catch (err) {
      log(`❌ Erro ao verificar usuários admin: ${err.message}`, 'red');
    }

    // Configurações da emissora
    try {
      const configResult = await pool.query(`SELECT COUNT(*) FROM configuracoes_emissora`);
      const configCount = parseInt(configResult.rows[0].count);
      if (configCount > 0) {
        log(`✅ Configurações da emissora: ${configCount} registro(s)`, 'green');
      } else {
        log(`⚠️  ATENÇÃO: Configurações da emissora não encontradas!`, 'yellow');
      }
    } catch (err) {
      log(`❌ Erro ao verificar configurações: ${err.message}`, 'red');
    }

    // Índices
    log('\n📇 VERIFICAÇÃO DE ÍNDICES', 'blue');
    log('─'.repeat(70), 'blue');

    const indexesResult = await pool.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `);

    const indexesByTable = {};
    for (const row of indexesResult.rows) {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push(row.indexname);
    }

    let totalIndexes = 0;
    for (const [table, indexes] of Object.entries(indexesByTable)) {
      totalIndexes += indexes.length;
      log(`   ${table.padEnd(30)} ${indexes.length} índice(s)`, 'cyan');
    }

    // Resumo final
    log('\n' + '='.repeat(70), 'green');
    log('📈 RESUMO DA VERIFICAÇÃO', 'green');
    log('='.repeat(70), 'green');
    log(`\n✅ Tabelas encontradas: ${tablesFound}/${expectedTables.length}`, 'green');
    if (tablesMissing > 0) {
      log(`❌ Tabelas faltando: ${tablesMissing}`, 'red');
    }
    if (extraTables.length > 0) {
      log(`ℹ️  Tabelas extras: ${extraTables.length}`, 'cyan');
    }
    log(`📊 Total de registros: ${totalRecords.toLocaleString()}`, 'cyan');
    log(`📇 Total de índices: ${totalIndexes}`, 'cyan');

    if (tablesFound === expectedTables.length && totalRecords > 0) {
      log('\n🎉 Banco de dados está completo e funcional!', 'green');
    } else if (tablesMissing > 0) {
      log('\n⚠️  ATENÇÃO: Algumas tabelas estão faltando! Execute initDatabase().', 'yellow');
    } else if (totalRecords === 0) {
      log('\n⚠️  ATENÇÃO: Banco está vazio! Importe dados ou execute migrations.', 'yellow');
    }

    log('');

  } catch (error) {
    log('\n' + '='.repeat(70), 'red');
    log('❌ ERRO DURANTE A VERIFICAÇÃO', 'red');
    log('='.repeat(70), 'red');
    log(`\n${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
verify().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
