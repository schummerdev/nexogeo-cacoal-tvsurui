// Script para criar/resetar usuário admin
require('dotenv').config();
const { query } = require('./lib/db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function createAdmin() {
  console.log('🔐 Gerenciando usuário admin...\n');

  try {
    // Verificar se admin existe
    const adminExists = await query('SELECT * FROM usuarios WHERE usuario = $1', ['admin']);

    if (adminExists.rows.length > 0) {
      console.log('⚠️  Usuário admin já existe!');
      console.log('📧 Usuário:', adminExists.rows[0].usuario);
      console.log('🎭 Papel:', adminExists.rows[0].role);
      console.log('📅 Criado em:', adminExists.rows[0].created_at);
      console.log('\n🔄 Gerando nova senha...\n');

      // Gerar nova senha
      const newPassword = crypto.randomBytes(8).toString('hex'); // 16 caracteres
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Atualizar senha
      await query(
        'UPDATE usuarios SET senha_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE usuario = $2',
        [hashedPassword, 'admin']
      );

      console.log('='.repeat(70));
      console.log('✅ SENHA DO ADMIN RESETADA COM SUCESSO!');
      console.log('='.repeat(70));
      console.log('Usuário: admin');
      console.log('Nova senha:', newPassword);
      console.log('='.repeat(70));
      console.log('⚠️  MUDE A SENHA IMEDIATAMENTE APÓS O LOGIN!');
      console.log('='.repeat(70));
    } else {
      console.log('📝 Criando novo usuário admin...\n');

      // Gerar senha
      const newPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Criar admin
      await query(
        'INSERT INTO usuarios (usuario, senha_hash, role) VALUES ($1, $2, $3)',
        ['admin', hashedPassword, 'admin']
      );

      console.log('='.repeat(70));
      console.log('✅ USUÁRIO ADMIN CRIADO COM SUCESSO!');
      console.log('='.repeat(70));
      console.log('Usuário: admin');
      console.log('Senha:', newPassword);
      console.log('='.repeat(70));
      console.log('⚠️  MUDE A SENHA IMEDIATAMENTE APÓS O LOGIN!');
      console.log('='.repeat(70));
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

createAdmin();
