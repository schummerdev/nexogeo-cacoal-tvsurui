#!/usr/bin/env node

/**
 * Script para atualizar variáveis de ambiente na Vercel
 * Uso: node update-vercel-env.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Cores
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log(`\n⏳ ${description}...`, 'yellow');
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    log(`✅ ${description} - Concluído`, 'green');
    return output;
  } catch (error) {
    log(`❌ ${description} - Erro: ${error.message}`, 'red');
    return null;
  }
}

async function updateVercelEnv() {
  log('\n' + '='.repeat(70), 'blue');
  log('🔧 ATUALIZAÇÃO DE VARIÁVEIS DE AMBIENTE - VERCEL', 'blue');
  log('='.repeat(70), 'blue');

  // Ler .env
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    log('\n❌ ERRO: Arquivo .env não encontrado!', 'red');
    process.exit(1);
  }

  log('\n📄 Lendo arquivo .env...', 'cyan');
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  // Parse .env
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  log(`✅ ${Object.keys(envVars).length} variáveis encontradas no .env`, 'green');

  // Variáveis críticas que devem ser atualizadas
  const criticalVars = [
    'DATABASE_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
    'PGHOST',
    'PGHOST_UNPOOLED',
    'PGUSER',
    'PGDATABASE',
    'PGPASSWORD',
    'POSTGRES_USER',
    'POSTGRES_HOST',
    'POSTGRES_PASSWORD',
    'POSTGRES_DATABASE',
    'JWT_SECRET',
    'GOOGLE_API_KEY',
    'NODE_ENV'
  ];

  // Variáveis que existem no .env e são críticas
  const varsToUpdate = criticalVars.filter(key => envVars[key]);

  log('\n📋 Variáveis a serem atualizadas:', 'cyan');
  varsToUpdate.forEach(key => {
    const value = envVars[key];
    const masked = value.includes('postgresql')
      ? value.replace(/:[^:@]+@/, ':****@')
      : value.length > 20
        ? value.substring(0, 10) + '...' + value.substring(value.length - 10)
        : value;
    log(`   • ${key} = ${masked}`, 'cyan');
  });

  log('\n' + '='.repeat(70), 'yellow');
  log('⚠️  ATENÇÃO: Este processo irá:', 'yellow');
  log('   1. Remover variáveis antigas (se existirem)', 'yellow');
  log('   2. Adicionar novas variáveis', 'yellow');
  log('   3. Aplicar em Production, Preview e Development', 'yellow');
  log('='.repeat(70), 'yellow');

  // Processar cada variável
  let successCount = 0;
  let errorCount = 0;

  for (const key of varsToUpdate) {
    const value = envVars[key];

    log(`\n📝 Processando: ${key}`, 'blue');

    // Tentar remover variável antiga (ignorar erros)
    log(`   🗑️  Removendo versão antiga (se existir)...`, 'yellow');
    try {
      execSync(`vercel env rm ${key} production --yes`, { stdio: 'pipe' });
      execSync(`vercel env rm ${key} preview --yes`, { stdio: 'pipe' });
      execSync(`vercel env rm ${key} development --yes`, { stdio: 'pipe' });
    } catch (e) {
      // Ignorar erro se não existir
    }

    // Adicionar nova variável
    const tempFile = path.join(__dirname, `.temp_env_${key}`);
    fs.writeFileSync(tempFile, value);

    try {
      // Production
      execSync(`vercel env add ${key} production < "${tempFile}"`, { stdio: 'pipe' });
      log(`   ✅ Adicionada em Production`, 'green');

      // Preview
      execSync(`vercel env add ${key} preview < "${tempFile}"`, { stdio: 'pipe' });
      log(`   ✅ Adicionada em Preview`, 'green');

      // Development
      execSync(`vercel env add ${key} development < "${tempFile}"`, { stdio: 'pipe' });
      log(`   ✅ Adicionada em Development`, 'green');

      successCount++;
    } catch (error) {
      log(`   ❌ Erro ao adicionar variável: ${error.message}`, 'red');
      errorCount++;
    } finally {
      // Remover arquivo temporário
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  }

  // Resumo
  log('\n' + '='.repeat(70), 'green');
  log('📊 RESUMO DA ATUALIZAÇÃO', 'green');
  log('='.repeat(70), 'green');
  log(`\n✅ Variáveis atualizadas com sucesso: ${successCount}`, 'green');
  if (errorCount > 0) {
    log(`❌ Variáveis com erro: ${errorCount}`, 'red');
  }

  // Sugerir redeploy
  log('\n' + '='.repeat(70), 'yellow');
  log('🚀 PRÓXIMO PASSO: REDEPLOY', 'yellow');
  log('='.repeat(70), 'yellow');
  log('\nExecute um dos comandos:', 'cyan');
  log('   vercel --prod                    # Deploy completo', 'cyan');
  log('   vercel redeploy --prod           # Redeploy rápido', 'cyan');
  log('\nOu aguarde o deploy automático pelo GitHub push.', 'cyan');

  log('');
}

// Executar
updateVercelEnv().catch(error => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
