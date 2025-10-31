// Script para restaurar backup SQL no banco de dados
require('dotenv').config();
const { pool } = require('./lib/db');
const fs = require('fs');
const path = require('path');

async function restoreBackup(backupFileName) {
  console.log('🔄 Restaurando backup do banco de dados...\n');

  try {
    const backupFile = backupFileName.includes('backups')
      ? backupFileName
      : path.join(__dirname, 'backups', backupFileName);

    // Verificar se arquivo existe
    if (!fs.existsSync(backupFile)) {
      console.error(`❌ Arquivo não encontrado: ${backupFile}`);
      console.log('\n📁 Backups disponíveis:');

      const backupsDir = path.join(__dirname, 'backups');
      if (fs.existsSync(backupsDir)) {
        const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sql'));
        files.forEach(f => console.log(`   - ${f}`));
      } else {
        console.log('   Nenhum backup encontrado');
      }

      process.exit(1);
    }

    console.log(`📂 Arquivo: ${backupFile}`);
    const sizeKB = (fs.statSync(backupFile).size / 1024).toFixed(2);
    console.log(`📊 Tamanho: ${sizeKB} KB\n`);

    // Ler arquivo SQL
    const sqlContent = fs.readFileSync(backupFile, 'utf8');

    // Dividir em comandos SQL individuais
    const commands = sqlContent
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`📝 Total de comandos SQL: ${commands.length}\n`);

    // Executar comandos
    let executedCount = 0;
    let errorCount = 0;

    for (const command of commands) {
      try {
        await pool.query(command);
        executedCount++;

        if (command.includes('TRUNCATE')) {
          const table = command.match(/TRUNCATE TABLE (\w+)/i)?.[1];
          console.log(`   🗑️  Tabela ${table} limpa`);
        } else if (command.includes('INSERT')) {
          // Mostrar progresso a cada 100 inserts
          if (executedCount % 100 === 0) {
            process.stdout.write(`   📥 Inserindo registros... ${executedCount}\r`);
          }
        }
      } catch (error) {
        errorCount++;
        console.error(`\n   ⚠️  Erro no comando: ${command.substring(0, 50)}...`);
        console.error(`   Mensagem: ${error.message}`);
      }
    }

    console.log(`\n\n✅ Restauração concluída!`);
    console.log(`📊 Estatísticas:`);
    console.log(`   - Comandos executados: ${executedCount}`);
    console.log(`   - Erros: ${errorCount}`);

    if (errorCount > 0) {
      console.log(`\n⚠️  Restauração concluída com ${errorCount} erros`);
    } else {
      console.log(`\n🎉 Todos os dados foram restaurados com sucesso!`);
    }

  } catch (error) {
    console.error('\n❌ Erro ao restaurar backup:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }

  process.exit(0);
}

// Verificar argumentos
const backupFile = process.argv[2];

if (!backupFile) {
  console.log('❌ Uso: node restore-backup.js <arquivo-backup.sql>');
  console.log('\n📁 Backups disponíveis:');

  const backupsDir = path.join(__dirname, 'backups');
  if (fs.existsSync(backupsDir)) {
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sql'));
    files.forEach(f => console.log(`   - ${f}`));
  } else {
    console.log('   Nenhum backup encontrado');
  }

  process.exit(1);
}

restoreBackup(backupFile);
