#!/usr/bin/env node

/**
 * Script para executar migrações do banco de dados
 * Este script deve ser executado após o deploy para garantir que o banco de dados
 * esteja atualizado com a estrutura mais recente.
 */

const { spawn } = require('child_process');
const path = require('path');

// Caminho para o diretório lib (onde está o package.json com scripts de migração)
const backendDir = path.join(__dirname, 'lib');

// Executar migrações
const migrate = spawn('npm', ['run', 'migrate-up'], { cwd: backendDir });

migrate.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

migrate.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

migrate.on('close', (code) => {
  if (code !== 0) {
    console.error(`Processo de migração finalizado com código ${code}`);
    process.exit(code);
  } else {
    console.log('Migrações executadas com sucesso!');
  }
});