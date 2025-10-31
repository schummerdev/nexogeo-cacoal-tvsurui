// Script para verificar se a migração foi bem-sucedida
require('dotenv').config();
const { query } = require('./lib/db');

async function verifyMigration() {
  console.log('🔍 Verificando migração de dados...\n');

  try {
    // Verificar totais
    console.log('📊 Totais de registros:');

    const usuarios = await query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`   Usuários: ${usuarios.rows[0].count}`);

    const promocoes = await query('SELECT COUNT(*) as count FROM promocoes');
    console.log(`   Promoções: ${promocoes.rows[0].count}`);

    const participantes = await query('SELECT COUNT(*) as count FROM participantes');
    console.log(`   Participantes: ${participantes.rows[0].count}`);

    const configs = await query('SELECT COUNT(*) as count FROM configuracoes_emissora');
    console.log(`   Configurações: ${configs.rows[0].count}\n`);

    // Verificar usuários
    console.log('👥 Usuários encontrados:');
    const userList = await query('SELECT id, usuario, papel, ativo FROM usuarios ORDER BY id');
    userList.rows.forEach(u => {
      console.log(`   ${u.id}. ${u.usuario} (${u.papel}) - ${u.ativo ? '✅ Ativo' : '❌ Inativo'}`);
    });

    // Verificar promoções ativas
    console.log('\n🎁 Promoções:');
    const promoList = await query('SELECT id, titulo, ativa, data_inicio, data_fim FROM promocoes ORDER BY id');
    promoList.rows.forEach(p => {
      const inicio = p.data_inicio ? p.data_inicio.toISOString().split('T')[0] : 'N/A';
      const fim = p.data_fim ? p.data_fim.toISOString().split('T')[0] : 'N/A';
      console.log(`   ${p.id}. ${p.titulo} ${p.ativa ? '✅' : '❌'} (${inicio} → ${fim})`);
    });

    // Verificar participantes recentes
    console.log('\n👨‍👩‍👧‍👦 Últimos 5 participantes cadastrados:');
    const partList = await query(
      'SELECT id, nome, telefone, cidade, data_cadastro FROM participantes ORDER BY data_cadastro DESC LIMIT 5'
    );
    partList.rows.forEach(p => {
      const data = p.data_cadastro ? p.data_cadastro.toISOString().split('T')[0] : 'N/A';
      console.log(`   ${p.id}. ${p.nome} - ${p.telefone} (${p.cidade || 'sem cidade'}) - ${data}`);
    });

    // Verificar configurações da emissora
    console.log('\n⚙️  Configuração da Emissora:');
    const configData = await query('SELECT * FROM configuracoes_emissora LIMIT 1');
    if (configData.rows.length > 0) {
      const cfg = configData.rows[0];
      console.log(`   Nome: ${cfg.nome_emissora || 'Não configurado'}`);
      console.log(`   Slogan: ${cfg.slogan || 'Não configurado'}`);
      console.log(`   Email: ${cfg.email || 'Não configurado'}`);
      console.log(`   Telefone: ${cfg.telefone || 'Não configurado'}`);
    } else {
      console.log('   ⚠️  Nenhuma configuração encontrada');
    }

    // Verificar integridade referencial
    console.log('\n🔗 Verificando integridade referencial:');
    const orphans = await query(`
      SELECT COUNT(*) as count
      FROM participantes p
      LEFT JOIN promocoes pr ON p.promocao_id = pr.id
      WHERE pr.id IS NULL
    `);

    if (orphans.rows[0].count > 0) {
      console.log(`   ⚠️  ${orphans.rows[0].count} participantes sem promoção válida`);
    } else {
      console.log('   ✅ Todos os participantes têm promoções válidas');
    }

    // Resumo final
    console.log('\n' + '='.repeat(50));
    const total = parseInt(usuarios.rows[0].count) +
                  parseInt(promocoes.rows[0].count) +
                  parseInt(participantes.rows[0].count);

    console.log(`✅ Migração verificada com sucesso!`);
    console.log(`📊 Total de ${total} registros no banco de dados`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Erro ao verificar migração:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

verifyMigration();
