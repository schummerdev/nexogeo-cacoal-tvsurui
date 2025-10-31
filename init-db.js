// Script para inicializar o banco de dados
require('dotenv').config();
const { initDatabase, testConnection } = require('./lib/db');

async function init() {
  console.log('🚀 Iniciando configuração do banco de dados...\n');

  // Testar conexão
  console.log('📡 Testando conexão com o banco...');
  const connectionTest = await testConnection();

  if (!connectionTest.success) {
    console.error('❌ Falha ao conectar com o banco de dados!');
    console.error('Erro:', connectionTest.error);
    process.exit(1);
  }

  console.log('✅ Conexão estabelecida com sucesso!');
  console.log('📅 Hora do servidor:', connectionTest.data.current_time);
  console.log('🐘 Versão PostgreSQL:', connectionTest.data.version.split(',')[0]);
  console.log('');

  // Inicializar banco
  console.log('🔨 Criando tabelas e dados iniciais...\n');
  const result = await initDatabase();

  if (result.success) {
    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('  - usuarios');
    console.log('  - configuracoes_emissora');
    console.log('  - promocoes');
    console.log('  - participantes');
    console.log('  - sponsors (Caixa Misteriosa)');
    console.log('  - products (Caixa Misteriosa)');
    console.log('  - games (Caixa Misteriosa)');
    console.log('  - submissions (Caixa Misteriosa)');
    console.log('  - public_participants (Sistema de Referência)');
    console.log('  - referral_rewards (Sistema de Referência)');
    console.log('\n🎉 Pronto para uso!');
  } else {
    console.error('\n❌ Erro ao inicializar banco:', result.error);
    process.exit(1);
  }

  process.exit(0);
}

init().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
