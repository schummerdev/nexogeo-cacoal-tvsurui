// Runner para verificar schema do banco de dados
// Executa o mesmo script usado pela API

require('dotenv').config();

const { checkSchema } = require('./api/_debug/schema-check');

async function main() {
  console.log('='.repeat(60));
  console.log('VERIFICAÇÃO DE SCHEMA - NexoGeo Database');
  console.log('='.repeat(60));
  console.log('');

  try {
    const report = await checkSchema();

    // Formatar saída
    console.log('\n📊 RELATÓRIO DE VERIFICAÇÃO');
    console.log('='.repeat(60));
    console.log(`Timestamp: ${report.timestamp}`);

    // Estatísticas
    if (report.estatisticas) {
      console.log('\n📈 ESTATÍSTICAS DO BANCO:');
      console.log(`  - Participantes regulares: ${report.estatisticas.total_participantes}`);
      console.log(`  - Participantes públicos: ${report.estatisticas.total_public_participants}`);
      console.log(`  - Promoções ativas: ${report.estatisticas.total_promocoes}`);
      console.log(`  - Ganhadores: ${report.estatisticas.total_ganhadores}`);
      console.log(`  - Usuários: ${report.estatisticas.total_usuarios}`);
    }

    // Tabelas
    console.log('\n📋 TABELAS:');
    console.log(`  ✅ Existentes: ${report.tabelas.existentes.length}`);
    if (report.tabelas.faltantes.length > 0) {
      console.log(`  ❌ Faltantes: ${report.tabelas.faltantes.join(', ')}`);
    } else {
      console.log('  ✅ Todas as tabelas esperadas existem');
    }
    if (report.tabelas.extras.length > 0) {
      console.log(`  ℹ️  Extras (não esperadas): ${report.tabelas.extras.join(', ')}`);
    }

    // Views
    console.log('\n👁️  VIEWS:');
    if (report.views.faltantes.length > 0) {
      console.log(`  ❌ Faltantes: ${report.views.faltantes.join(', ')}`);
    } else {
      console.log('  ✅ Todas as views esperadas existem');
    }

    // Índices
    console.log('\n🔍 ÍNDICES:');
    console.log(`  Total de índices: ${report.indices.total}`);

    // Colunas faltantes
    console.log('\n📝 COLUNAS:');
    let temColunasFaltantes = false;
    for (const [tabela, info] of Object.entries(report.colunas || {})) {
      if (info.faltantes && info.faltantes.length > 0) {
        console.log(`  ❌ ${tabela}: faltam [${info.faltantes.join(', ')}]`);
        temColunasFaltantes = true;
      }
    }
    if (!temColunasFaltantes) {
      console.log('  ✅ Todas as colunas críticas existem');
    }

    // Problemas
    if (report.problemas.length > 0) {
      console.log('\n⚠️  PROBLEMAS IDENTIFICADOS:');
      report.problemas.forEach((prob, i) => {
        console.log(`  ${i + 1}. ${prob.tipo}`);
        if (prob.tabela) console.log(`     Tabela: ${prob.tabela}`);
        if (prob.colunas) console.log(`     Colunas: ${prob.colunas.join(', ')}`);
        if (prob.indices) console.log(`     Índices: ${prob.indices.join(', ')}`);
        if (prob.views) console.log(`     Views: ${prob.views.join(', ')}`);
        if (prob.funcao) console.log(`     Função: ${prob.funcao}`);
      });
    } else {
      console.log('\n✅ NENHUM PROBLEMA CRÍTICO IDENTIFICADO');
    }

    // Recomendações
    if (report.recomendacoes.length > 0) {
      console.log('\n🔧 RECOMENDAÇÕES:');
      report.recomendacoes.forEach((rec, i) => {
        console.log(`  ${i + 1}. [${rec.prioridade}] ${rec.descricao}`);
        if (rec.sql) {
          console.log('     SQL:');
          rec.sql.split('\n').forEach(line => console.log(`       ${line}`));
        }
      });
    }

    // Salvar relatório completo em JSON
    const fs = require('fs');
    const reportPath = './schema-check-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Relatório completo salvo em: ${reportPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICAÇÃO CONCLUÍDA');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Erro ao executar verificação:', error.message);
    console.error(error.stack);
  } finally {
    // Fechar conexão do pool
    const { pool } = require('./lib/db');
    await pool.end();
    process.exit(0);
  }
}

main();
