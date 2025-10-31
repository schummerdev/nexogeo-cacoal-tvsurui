// migrate.js - Script para migrar banco para usar senha_hash
require('dotenv').config();
const { query } = require('./lib/db.js');
const bcrypt = require('bcrypt');

async function migrate() {
  try {
    console.log('🔄 Iniciando migração do banco de dados...');

    // 1. Adicionar coluna senha_hash se não existir
    console.log('📝 Adicionando coluna senha_hash...');
    await query(`
      ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS senha_hash VARCHAR(255)
    `);

    // 2. Remover constraint NOT NULL da coluna senha (se existir)
    console.log('🔧 Removendo constraint NOT NULL da coluna senha...');
    await query(`
      ALTER TABLE usuarios
      ALTER COLUMN senha DROP NOT NULL
    `);

    // 3. Verificar usuários existentes
    const users = await query('SELECT id, usuario, senha FROM usuarios');
    console.log(`👥 Encontrados ${users.rows.length} usuários para migrar`);

    // 3. Migrar senhas existentes para hash
    for (const user of users.rows) {
      if (!user.senha_hash && user.senha) {
        console.log(`🔐 Migrando senha do usuário: ${user.usuario}`);
        const hashedPassword = await bcrypt.hash(user.senha, 10);

        await query(
          'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
          [hashedPassword, user.id]
        );
      }
    }

    // 4. Criar usuário admin se não existir
    const adminExists = await query('SELECT COUNT(*) FROM usuarios WHERE usuario = $1', ['admin']);
    if (parseInt(adminExists.rows[0].count) === 0) {
      console.log('👤 Criando usuário admin...');
      const adminHash = await bcrypt.hash('admin', 10);

      await query(`
        INSERT INTO usuarios (usuario, senha_hash, role)
        VALUES ('admin', $1, 'admin')
      `, [adminHash]);
    } else {
      // Atualizar senha do admin se já existe
      console.log('🔄 Atualizando senha do admin existente...');
      const adminHash = await bcrypt.hash('admin', 10);

      await query(
        'UPDATE usuarios SET senha_hash = $1 WHERE usuario = $2',
        [adminHash, 'admin']
      );
    }

    // 5. Verificar migração
    const finalUsers = await query('SELECT id, usuario, role, LENGTH(senha_hash) as hash_length FROM usuarios');
    console.log('\n✅ Migração concluída! Usuários no banco:');
    finalUsers.rows.forEach(user => {
      console.log(`  - ${user.usuario} (${user.role}) - Hash: ${user.hash_length} chars`);
    });

    console.log('\n🎯 Use as credenciais para login:');
    console.log('  Usuário: admin');
    console.log('  Senha: admin');

  } catch (error) {
    console.error('❌ Erro na migração:', error);
    process.exit(1);
  }
}

migrate().then(() => {
  console.log('\n🚀 Migração concluída com sucesso!');
  process.exit(0);
});