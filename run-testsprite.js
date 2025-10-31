#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 Iniciando TestSprite para projeto NexoGeo...\n');

// Configuração do TestSprite
const testSpriteConfig = {
  projectName: 'NexoGeo - Sistema de Promoções',
  projectPath: process.cwd(),
  testFramework: 'jest',
  environment: 'React/JavaScript',
  features: [
    'Dashboard com gráficos interativos',
    'Sistema de mapas com Leaflet',
    'Gerenciamento de promoções',
    'Sistema de participantes',
    'Sorteio público',
    'Autenticação de usuários'
  ]
};

console.log('📋 Configuração do projeto:');
console.log(JSON.stringify(testSpriteConfig, null, 2));
console.log('\n🚀 Executando análise automatizada...\n');

// Executar TestSprite MCP
const testSprite = spawn('npx', ['@testsprite/testsprite-mcp'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    API_KEY: process.env.TESTSPRITE_API_KEY || 'sk-user-you7CWiWHe4OR8YfDQe_Y3x3uPAMH1xzzNa-fk0dD8zg0eMh6m7AcJwptyVoSAOZ69SOIOszIK5_RRpqY2Nm_UQ0GTmkUCqVaOxFYtgR81lFvMNfjfFEXSYUjYecW2LHosI'
  }
});

// Enviar comandos para o TestSprite
const commands = [
  'analyze_project',
  'generate_tests', 
  'run_tests',
  'coverage_report'
];

let commandIndex = 0;

testSprite.stdout.on('data', (data) => {
  console.log(`📤 TestSprite: ${data}`);
  
  // Enviar próximo comando
  if (commandIndex < commands.length) {
    setTimeout(() => {
      testSprite.stdin.write(JSON.stringify({
        command: commands[commandIndex],
        config: testSpriteConfig
      }) + '\n');
      commandIndex++;
    }, 1000);
  }
});

testSprite.on('close', (code) => {
  console.log(`\n✅ TestSprite finalizado com código: ${code}`);
});

// Iniciar com comando de análise
setTimeout(() => {
  testSprite.stdin.write(JSON.stringify({
    command: 'analyze_project',
    config: testSpriteConfig
  }) + '\n');
  commandIndex++;
}, 1000);