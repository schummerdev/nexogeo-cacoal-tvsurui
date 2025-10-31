// scripts/performance-analysis.js - Script de análise de performance
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Iniciando análise de performance do NexoGeo...\n');

// 1. Build da aplicação
console.log('1. 📦 Construindo aplicação...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  console.log('   ✅ Build concluído com sucesso\n');
} catch (error) {
  console.error('   ❌ Erro no build:', error.message);
  process.exit(1);
}

// 2. Análise do tamanho dos bundles
console.log('2. 📊 Analisando tamanho dos bundles...');
const buildPath = path.join(__dirname, '..', 'build', 'static', 'js');

try {
  const jsFiles = fs.readdirSync(buildPath)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(buildPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: Math.round(stats.size / 1024 * 100) / 100,
        sizeMB: Math.round(stats.size / 1024 / 1024 * 100) / 100
      };
    })
    .sort((a, b) => b.size - a.size);

  console.log('   📋 Arquivos JavaScript:');
  jsFiles.forEach(file => {
    const sizeColor = file.sizeMB > 1 ? '🔴' : file.sizeKB > 500 ? '🟡' : '🟢';
    console.log(`   ${sizeColor} ${file.name}: ${file.sizeKB} KB`);
  });

  const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
  console.log(`   📦 Total JavaScript: ${Math.round(totalSize / 1024)} KB\n`);
} catch (error) {
  console.error('   ❌ Erro na análise de bundles:', error.message);
}

// 3. Análise do CSS
console.log('3. 🎨 Analisando CSS...');
const cssPath = path.join(__dirname, '..', 'build', 'static', 'css');

try {
  const cssFiles = fs.readdirSync(cssPath)
    .filter(file => file.endsWith('.css'))
    .map(file => {
      const filePath = path.join(cssPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        sizeKB: Math.round(stats.size / 1024 * 100) / 100
      };
    });

  console.log('   📋 Arquivos CSS:');
  cssFiles.forEach(file => {
    console.log(`   🎨 ${file.name}: ${file.sizeKB} KB`);
  });

  const totalCSSSize = cssFiles.reduce((sum, file) => sum + file.sizeKB, 0);
  console.log(`   📦 Total CSS: ${totalCSSSize} KB\n`);
} catch (error) {
  console.error('   ❌ Erro na análise de CSS:', error.message);
}

// 4. Análise de assets estáticos
console.log('4. 🖼️ Analisando assets estáticos...');
const mediaPath = path.join(__dirname, '..', 'build', 'static', 'media');

try {
  if (fs.existsSync(mediaPath)) {
    const mediaFiles = fs.readdirSync(mediaPath)
      .map(file => {
        const filePath = path.join(mediaPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          sizeKB: Math.round(stats.size / 1024 * 100) / 100,
          type: path.extname(file)
        };
      })
      .sort((a, b) => b.sizeKB - a.sizeKB);

    console.log('   📋 Assets de mídia:');
    mediaFiles.forEach(file => {
      const sizeColor = file.sizeKB > 100 ? '🔴' : file.sizeKB > 50 ? '🟡' : '🟢';
      console.log(`   ${sizeColor} ${file.name}: ${file.sizeKB} KB`);
    });

    const totalMediaSize = mediaFiles.reduce((sum, file) => sum + file.sizeKB, 0);
    console.log(`   📦 Total Media: ${totalMediaSize} KB\n`);
  } else {
    console.log('   📂 Nenhum asset de mídia encontrado\n');
  }
} catch (error) {
  console.error('   ❌ Erro na análise de assets:', error.message);
}

// 5. Verificar otimizações implementadas
console.log('5. ⚡ Verificando otimizações implementadas...');

const optimizations = [
  {
    name: 'Code Splitting',
    file: 'src/App.jsx',
    check: () => {
      const appFile = fs.readFileSync(path.join(__dirname, '..', 'src', 'App.jsx'), 'utf8');
      return appFile.includes('React.lazy');
    }
  },
  {
    name: 'Service Worker',
    file: 'public/sw.js',
    check: () => fs.existsSync(path.join(__dirname, '..', 'public', 'sw.js'))
  },
  {
    name: 'Preloader Hook',
    file: 'src/hooks/usePreloader.js',
    check: () => fs.existsSync(path.join(__dirname, '..', 'src', 'hooks', 'usePreloader.js'))
  },
  {
    name: 'Lazy Components',
    file: 'src/components/LazyComponents.jsx',
    check: () => fs.existsSync(path.join(__dirname, '..', 'src', 'components', 'LazyComponents.jsx'))
  },
  {
    name: 'Bundle Analyzer Scripts',
    file: 'package.json',
    check: () => {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
      return packageJson.scripts.analyze && packageJson.scripts['analyze:bundle'];
    }
  }
];

optimizations.forEach(opt => {
  const implemented = opt.check();
  const status = implemented ? '✅' : '❌';
  console.log(`   ${status} ${opt.name} ${implemented ? '(implementado)' : '(não encontrado)'}`);
});

// 6. Recomendações
console.log('\n6. 💡 Recomendações de Performance:');

const recommendations = [
  '🚀 Use npm run analyze para visualizar o tamanho dos bundles',
  '📊 Execute npm run analyze:bundle para análise detalhada',
  '🔍 Monitore o Lighthouse score com npm run performance:audit',
  '⚡ Service Worker configurado para cache offline',
  '🧩 Code splitting implementado para carregamento sob demanda',
  '🎯 Preload inteligente baseado no role do usuário',
  '💾 Lazy loading configurado para componentes pesados',
  '📦 Bundle otimizado com tree-shaking automático'
];

recommendations.forEach(rec => console.log(`   ${rec}`));

console.log('\n🎉 Análise de performance concluída!');
console.log('💡 Execute os comandos sugeridos para monitoramento contínuo.');

// 7. Criar relatório JSON
const report = {
  timestamp: new Date().toISOString(),
  bundles: {
    js: typeof jsFiles !== 'undefined' ? jsFiles : [],
    css: typeof cssFiles !== 'undefined' ? cssFiles : []
  },
  optimizations: optimizations.map(opt => ({
    name: opt.name,
    implemented: opt.check()
  })),
  recommendations
};

fs.writeFileSync(
  path.join(__dirname, '..', 'performance-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('📄 Relatório salvo em: performance-report.json\n');