#!/usr/bin/env node

/**
 * Script de Regeneração Automática de Credenciais
 * Executa: node regenerar-credenciais.js
 */

const crypto = require('crypto');
const fs = require('fs');

console.log('🔄 REGENERAÇÃO AUTOMÁTICA DE CREDENCIAIS\n');

// 1. Gerar novo JWT Secret
const newJwtSecret = crypto.randomBytes(64).toString('hex');
console.log('✅ Novo JWT Secret gerado:');
console.log(`JWT_SECRET=${newJwtSecret}\n`);

// 2. Gerar nova senha de banco
const newDbPassword = crypto.randomBytes(32).toString('base64url');
console.log('✅ Nova senha de banco sugerida:');
console.log(`NOVA_SENHA_DB=${newDbPassword}\n`);

// 3. Criar novo .env para desenvolvimento
const newEnvContent = `NODE_ENV=development
DATABASE_URL=postgresql://neondb_owner:NOVA_SENHA_AQUI@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=${newJwtSecret}
`;

// 4. Salvar no arquivo .env.new (segurança)
fs.writeFileSync('.env.new', newEnvContent);
console.log('✅ Arquivo .env.new criado com novas credenciais\n');

// 5. Instruções finais
console.log('📋 PRÓXIMOS PASSOS:');
console.log('1. Acesse https://console.neon.tech/');
console.log('2. Regenere a senha do banco PostgreSQL');
console.log('3. Substitua "NOVA_SENHA_AQUI" no .env.new');
console.log('4. Copie o JWT_SECRET para as variáveis da Vercel');
console.log('5. Faça: mv .env.new .env');
console.log('6. Teste: npm run dev\n');

console.log('🚨 URGENTE: Execute estes passos AGORA para segurança máxima!');