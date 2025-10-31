// Script inteligente para restaurar backup com conversão de schema
require('dotenv').config();
const { query } = require('./lib/db');
const fs = require('fs');
const path = require('path');

async function restoreBackupSmart(backupFile) {
  console.log('🔄 Restaurando backup com conversão de schema...\n');

  try {
    // Ler arquivo de backup
    const backupPath = path.isAbsolute(backupFile)
      ? backupFile
      : path.join(__dirname, backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Arquivo não encontrado: ${backupPath}`);
    }

    console.log(`📁 Lendo backup: ${backupPath}`);
    let sql = fs.readFileSync(backupPath, 'utf8');

    console.log(`📊 Tamanho do arquivo: ${(sql.length / 1024).toFixed(2)} KB\n`);

    // === CONVERSÕES DE SCHEMA ===
    console.log('🔧 Aplicando conversões de schema...');

    // 1. Converter nome de colunas: senha → senha_hash
    const senhaCount = (sql.match(/\bsenha\b/g) || []).length;
    sql = sql.replace(/\bsenha\b/g, 'senha_hash');
    console.log(`   ✅ Convertido ${senhaCount}x: senha → senha_hash`);

    // 2. Converter timestamps: criado_em → created_at
    const criadoCount = (sql.match(/\bcriado_em\b/g) || []).length;
    sql = sql.replace(/\bcriado_em\b/g, 'created_at');
    console.log(`   ✅ Convertido ${criadoCount}x: criado_em → created_at`);

    // 3. Converter timestamps: atualizado_em → updated_at
    const atualizadoCount = (sql.match(/\batualizado_em\b/g) || []).length;
    sql = sql.replace(/\batualizado_em\b/g, 'updated_at');
    console.log(`   ✅ Convertido ${atualizadoCount}x: atualizado_em → updated_at`);

    // 4. Converter timestamps: participou_em → data_cadastro
    const participouCount = (sql.match(/\bparticipou_em\b/g) || []).length;
    sql = sql.replace(/\bparticipou_em\b/g, 'data_cadastro');
    console.log(`   ✅ Convertido ${participouCount}x: participou_em → data_cadastro`);

    // 5. Converter datas em formato JavaScript para SQL
    // Exemplo: "Fri Sep 15 2024" → "2024-09-15 00:00:00"
    const jsDatePattern = /'([A-Z][a-z]{2} [A-Z][a-z]{2} \d{2} \d{4}[^']*)'/g;
    const jsDateMatches = sql.match(jsDatePattern);
    if (jsDateMatches) {
      console.log(`   ⚠️  Encontradas ${jsDateMatches.length} datas em formato JavaScript`);
      jsDateMatches.forEach(match => {
        // Tentar converter data JavaScript para SQL
        const dateStr = match.replace(/'/g, '');
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          const sqlDate = date.toISOString().replace('T', ' ').split('.')[0];
          sql = sql.replace(match, `'${sqlDate}'`);
        } else {
          // Se não conseguir converter, usar data padrão
          sql = sql.replace(match, "'2025-01-01 00:00:00'");
        }
      });
      console.log(`   ✅ Datas JavaScript convertidas para formato SQL`);
    }

    console.log('\n📋 Preparando banco de dados...');

    // Dividir em comandos individuais
    const commands = sql
      .split('\n')
      .filter(line => line.trim() && !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .filter(cmd => cmd.trim());

    console.log(`   📝 Total de ${commands.length} comandos SQL\n`);

    // Executar comandos
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const cmd = commands[i].trim();
      if (!cmd) continue;

      // Identificar tipo de comando
      let cmdType = 'QUERY';
      if (cmd.toUpperCase().startsWith('TRUNCATE')) cmdType = 'TRUNCATE';
      else if (cmd.toUpperCase().startsWith('INSERT INTO USUARIOS')) cmdType = 'INSERT USUARIO';
      else if (cmd.toUpperCase().startsWith('INSERT INTO PROMOCOES')) cmdType = 'INSERT PROMOCAO';
      else if (cmd.toUpperCase().startsWith('INSERT INTO PARTICIPANTES')) cmdType = 'INSERT PARTICIPANTE';
      else if (cmd.toUpperCase().startsWith('INSERT INTO CONFIGURACOES')) cmdType = 'INSERT CONFIG';

      try {
        await query(cmd);
        successCount++;

        // Mostrar progresso apenas para INSERTs importantes
        if (cmdType.startsWith('INSERT')) {
          process.stdout.write(`\r   ✅ ${cmdType}: ${successCount} OK`);
        }
      } catch (error) {
        errorCount++;

        // Pular erros de "já existe" (caso tabelas não foram truncadas)
        if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
          skippedCount++;
          console.log(`\n   ⚠️  Pulado (já existe): ${cmdType}`);
        } else {
          console.log(`\n   ❌ Erro em ${cmdType}:`);
          console.log(`      ${error.message.split('\n')[0]}`);

          // Mostrar o comando que falhou (primeiros 100 chars)
          const preview = cmd.substring(0, 100).replace(/\s+/g, ' ');
          console.log(`      Comando: ${preview}...`);
        }
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ Restauração concluída!');
    console.log('='.repeat(60));
    console.log(`✅ Sucesso: ${successCount} comandos`);
    console.log(`⚠️  Pulados: ${skippedCount} comandos (duplicados)`);
    console.log(`❌ Erros: ${errorCount} comandos`);
    console.log('='.repeat(60));

    // Verificar dados importados
    console.log('\n📊 Verificando dados importados...\n');

    const usuarios = await query('SELECT COUNT(*) as count FROM usuarios');
    console.log(`   👥 Usuários: ${usuarios.rows[0].count}`);

    const promocoes = await query('SELECT COUNT(*) as count FROM promocoes');
    console.log(`   🎁 Promoções: ${promocoes.rows[0].count}`);

    const participantes = await query('SELECT COUNT(*) as count FROM participantes');
    console.log(`   👨‍👩‍👧‍👦 Participantes: ${participantes.rows[0].count}`);

    const configs = await query('SELECT COUNT(*) as count FROM configuracoes_emissora');
    console.log(`   ⚙️  Configurações: ${configs.rows[0].count}`);

    console.log('\n💡 Execute "node verify-migration.js" para validação completa');

  } catch (error) {
    console.error('\n❌ Erro ao restaurar backup:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

// Obter arquivo de backup dos argumentos
const backupFile = process.argv[2] || 'backups/backup-nexogeo-2025-10-18T04-20-19.sql';
restoreBackupSmart(backupFile);
