// Script para comparar estruturas dos bancos de dados
require('dotenv').config();
const { Pool } = require('pg');

// Configurações dos bancos
const oldDbConfig = {
  connectionString: 'postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
};

const newDbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

async function getTableStructure(pool, tableName) {
  const query = `
    SELECT
      column_name,
      data_type,
      character_maximum_length,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = $1
    ORDER BY ordinal_position;
  `;

  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function getAllTables(pool) {
  const query = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;

  const result = await pool.query(query);
  return result.rows.map(r => r.table_name);
}

async function compareSchemas() {
  console.log('🔍 Comparando estruturas dos bancos de dados...\n');
  console.log('=' .repeat(80));

  const oldPool = new Pool(oldDbConfig);
  const newPool = new Pool(newDbConfig);

  try {
    // Obter listas de tabelas
    console.log('📊 Conectando aos bancos...');
    const oldTables = await getAllTables(oldPool);
    const newTables = await getAllTables(newPool);

    console.log(`\n✅ Banco ANTIGO (nexogeo): ${oldTables.length} tabelas`);
    console.log(`✅ Banco NOVO (neondb): ${newTables.length} tabelas\n`);
    console.log('=' .repeat(80));

    // Tabelas comuns
    const commonTables = oldTables.filter(t => newTables.includes(t));
    const oldOnlyTables = oldTables.filter(t => !newTables.includes(t));
    const newOnlyTables = newTables.filter(t => !oldTables.includes(t));

    // Resumo de tabelas
    console.log('\n📋 RESUMO DE TABELAS:\n');
    console.log(`✅ Tabelas em AMBOS os bancos: ${commonTables.length}`);
    commonTables.forEach(t => console.log(`   - ${t}`));

    if (oldOnlyTables.length > 0) {
      console.log(`\n⚠️  Tabelas APENAS no banco ANTIGO: ${oldOnlyTables.length}`);
      oldOnlyTables.forEach(t => console.log(`   - ${t}`));
    }

    if (newOnlyTables.length > 0) {
      console.log(`\n⚠️  Tabelas APENAS no banco NOVO: ${newOnlyTables.length}`);
      newOnlyTables.forEach(t => console.log(`   - ${t}`));
    }

    // Comparar estrutura de cada tabela comum
    console.log('\n' + '=' .repeat(80));
    console.log('🔍 COMPARAÇÃO DETALHADA DE ESTRUTURAS:\n');

    for (const tableName of commonTables) {
      console.log('\n' + '-'.repeat(80));
      console.log(`📊 Tabela: ${tableName.toUpperCase()}`);
      console.log('-'.repeat(80));

      const oldColumns = await getTableStructure(oldPool, tableName);
      const newColumns = await getTableStructure(newPool, tableName);

      const oldColNames = oldColumns.map(c => c.column_name);
      const newColNames = newColumns.map(c => c.column_name);

      const commonCols = oldColNames.filter(c => newColNames.includes(c));
      const oldOnlyCols = oldColNames.filter(c => !newColNames.includes(c));
      const newOnlyCols = newColNames.filter(c => !oldColNames.includes(c));

      // Colunas em comum
      if (commonCols.length > 0) {
        console.log(`\n✅ Colunas em AMBOS (${commonCols.length}):`);
        commonCols.forEach(colName => {
          const oldCol = oldColumns.find(c => c.column_name === colName);
          const newCol = newColumns.find(c => c.column_name === colName);

          const typeDiff = oldCol.data_type !== newCol.data_type;
          const marker = typeDiff ? '⚠️ ' : '  ';

          console.log(`${marker} ${colName}`);
          console.log(`     ANTIGO: ${oldCol.data_type}${oldCol.character_maximum_length ? `(${oldCol.character_maximum_length})` : ''} ${oldCol.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
          console.log(`     NOVO:   ${newCol.data_type}${newCol.character_maximum_length ? `(${newCol.character_maximum_length})` : ''} ${newCol.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);

          if (typeDiff) {
            console.log(`     ⚠️  TIPOS DIFERENTES!`);
          }
        });
      }

      // Colunas apenas no antigo
      if (oldOnlyCols.length > 0) {
        console.log(`\n❌ Colunas APENAS no banco ANTIGO (${oldOnlyCols.length}):`);
        oldOnlyCols.forEach(colName => {
          const col = oldColumns.find(c => c.column_name === colName);
          console.log(`   - ${colName}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
        });
      }

      // Colunas apenas no novo
      if (newOnlyCols.length > 0) {
        console.log(`\n✅ Colunas APENAS no banco NOVO (${newOnlyCols.length}):`);
        newOnlyCols.forEach(colName => {
          const col = newColumns.find(c => c.column_name === colName);
          console.log(`   - ${colName}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}`);
        });
      }

      // Análise de incompatibilidade
      if (oldOnlyCols.length > 0 || newOnlyCols.length > 0) {
        console.log(`\n⚠️  INCOMPATIBILIDADE DETECTADA: Tabela ${tableName} tem colunas diferentes!`);
      }
    }

    // Resumo final
    console.log('\n' + '=' .repeat(80));
    console.log('📊 RESUMO FINAL:\n');

    let totalIncompatibilities = 0;
    for (const tableName of commonTables) {
      const oldColumns = await getTableStructure(oldPool, tableName);
      const newColumns = await getTableStructure(newPool, tableName);

      const oldColNames = oldColumns.map(c => c.column_name);
      const newColNames = newColumns.map(c => c.column_name);

      const oldOnlyCols = oldColNames.filter(c => !newColNames.includes(c));
      const newOnlyCols = newColNames.filter(c => !oldColNames.includes(c));

      if (oldOnlyCols.length > 0 || newOnlyCols.length > 0) {
        totalIncompatibilities++;
        console.log(`⚠️  ${tableName}: ${oldOnlyCols.length} colunas a menos, ${newOnlyCols.length} colunas a mais`);
      }
    }

    if (totalIncompatibilities > 0) {
      console.log(`\n❌ CONCLUSÃO: ${totalIncompatibilities} tabela(s) com incompatibilidades`);
      console.log('   Migração direta (backup/restore) NÃO é possível.');
      console.log('   Use o Método 1 (Neon SQL Editor) com script de mapeamento.');
    } else {
      console.log('\n✅ CONCLUSÃO: Schemas são compatíveis!');
      console.log('   Migração direta (backup/restore) é possível.');
    }

  } catch (error) {
    console.error('\n❌ Erro ao comparar schemas:', error.message);
    console.error(error.stack);
  } finally {
    await oldPool.end();
    await newPool.end();
  }

  process.exit(0);
}

compareSchemas();
