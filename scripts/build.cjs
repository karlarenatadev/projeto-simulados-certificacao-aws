#!/usr/bin/env node

/**
 * Build script - Copia arquivos do projeto para public/
 *
 * Fluxo:
 * src/frontend -> public
 * data -> public/data
 *
 * O public é o artefato publicado no GitHub Pages.
 */

const fs = require('fs');
const path = require('path');


function copyDirectoryRecursive(src, dest) {

  if (!fs.existsSync(src)) {
    console.warn(`⚠️ Origem não encontrada: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, {
    withFileTypes: true
  });

  for (const entry of entries) {

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {

      copyDirectoryRecursive(
        srcPath,
        destPath
      );

    } else {

      fs.copyFileSync(
        srcPath,
        destPath
      );

    }
  }
}


function copyFile(src, dest) {

  fs.mkdirSync(
    path.dirname(dest),
    { recursive: true }
  );

  fs.copyFileSync(
    src,
    dest
  );

}


console.log('🔨 Building...');


try {
  console.log('🛡️ Validando Banco de Questões...');
  const { execSync } = require('child_process');
  execSync('node scripts/validate-question-bank.js', { stdio: 'inherit' });
  console.log('✅ Validação concluída.\n');

  // ============================================================
  // JAVASCRIPT
  // ============================================================

  console.log('📦 Copiando arquivos JS...');

  copyDirectoryRecursive(
    'src/frontend/js',
    'public/js'
  );

  // ============================================================
  // PARTIALS HTML (sidebar.html, etc.)
  // ============================================================

  console.log('🧩 Copiando partials HTML...');

  // Copiar partials HTML (sidebar.html, etc.) para public/
  if (fs.existsSync('src/frontend/partials')) {
    copyDirectoryRecursive('src/frontend/partials', 'public/partials');
    // sidebar.html fica na raiz de public/ para compatibilidade
    const sidebarSrc = 'src/frontend/partials/sidebar.html';
    if (fs.existsSync(sidebarSrc)) {
      copyFile(sidebarSrc, 'public/sidebar.html');
      console.log('  ✅ Copiado sidebar.html para public/');
    }
  }

  // ============================================================
  // CSS
  // ============================================================

  console.log('🎨 Copiando e Consolidando arquivos CSS...');

  copyDirectoryRecursive(
    'src/frontend/styles',
    'public/css'
  );

  // Consolidação de CSS
  const stylesDir = 'src/frontend/styles';
  const cssOrder = [
    'tokens.css',
    'themes.css',
    'base.css',
    'utilities.css'
  ];
  
  let consolidatedCSS = '/* Consolidated CSS */\n\n';

  for (const file of cssOrder) {
    const filePath = path.join(stylesDir, file);
    if (fs.existsSync(filePath)) {
      consolidatedCSS += `/* --- ${file} --- */\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
    }
  }

  // Componentes em ordem explícita para garantir cascade correto:
  // animations → layout → buttons → forms → cards → badges → quiz →
  // dashboard → sidebar → shell → profile → settings → gamification → (demais)
  const componentsDir = path.join(stylesDir, 'components');
  if (fs.existsSync(componentsDir)) {
    const explicitOrder = [
      'animations.css',
      'layout.css',
      'buttons.css',
      'forms.css',
      'cards.css',
      'badges.css',
      'quiz.css',
      'dashboard.css',
      'sidebar.css',
      'shell.css',
      'profile.css',
      'settings.css',
      'gamification.css',
      'simulator.css',
    ];
    // Adiciona primeiro os arquivos na ordem explícita
    for (const file of explicitOrder) {
      const filePath = path.join(componentsDir, file);
      if (fs.existsSync(filePath)) {
        consolidatedCSS += `/* --- components/${file} --- */\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
      }
    }
    // Depois adiciona qualquer outro componente não listado (à prova de futuro)
    const allComponents = fs.readdirSync(componentsDir).filter(f => f.endsWith('.css'));
    for (const file of allComponents) {
      if (!explicitOrder.includes(file)) {
        consolidatedCSS += `/* --- components/${file} --- */\n` + fs.readFileSync(path.join(componentsDir, file), 'utf8') + '\n\n';
      }
    }
  }

  // style.css residual — overrides globais, responsividade, a11y, print
  // Deve vir APÓS os componentes para que overrides globais possam tomar precedência
  const legacyStylePath = path.join(stylesDir, 'style.css');
  if (fs.existsSync(legacyStylePath)) {
    consolidatedCSS += `/* --- style.css (global overrides) --- */\n` + fs.readFileSync(legacyStylePath, 'utf8') + '\n\n';
  }

  // cases.css — estilos específicos da tela de cases (após global)
  const specificFiles = ['cases.css'];
  for (const file of specificFiles) {
    const filePath = path.join(stylesDir, file);
    if (fs.existsSync(filePath)) {
      consolidatedCSS += `/* --- ${file} --- */\n` + fs.readFileSync(filePath, 'utf8') + '\n\n';
    }
  }

  fs.writeFileSync('public/css/style.css', consolidatedCSS);



  // ============================================================
  // SERVICES
  // ============================================================

  console.log('🔗 Copiando SERVICES...');

  if (fs.existsSync('src/services')) {

    copyDirectoryRecursive(
      'src/services',
      'public/services'
    );

    // O import do logger em src/services/api.js usa o caminho relativo correto
    // para o código-fonte (../frontend/js/utils/logger.js), mas após o build
    // o artefato fica em public/services/api.js onde o logger está em
    // public/js/utils/logger.js. Corrige o import no artefato gerado.
    const builtApiPath = path.join('public', 'services', 'api.js');
    if (fs.existsSync(builtApiPath)) {
      const content = fs.readFileSync(builtApiPath, 'utf8');
      const fixed = content.replace(
        '../frontend/js/utils/logger.js',
        '../js/utils/logger.js'
      );
      if (fixed !== content) {
        fs.writeFileSync(builtApiPath, fixed);
        console.log('  ✅ Corrigido import do logger em public/services/api.js');
      }
    }

  }



  // ============================================================
  // DATA COMPLETO
  // ============================================================

  console.log('📊 Copiando DATA completo...');

  if (fs.existsSync('data')) {


    fs.rmSync(
      'public/data',
      {
        recursive: true,
        force: true
      }
    );


    copyDirectoryRecursive(
      'data',
      'public/data'
    );


  } else {

    throw new Error(
      'Pasta data não encontrada'
    );

  }



  // ============================================================
  // VALIDATION - Removed
  // ============================================================



  // ============================================================
  // GITHUB PAGES
  // ============================================================

  console.log('⚙️ Copiando .nojekyll...');


  if (fs.existsSync('.nojekyll')) {

    fs.copyFileSync(
      '.nojekyll',
      'public/.nojekyll'
    );

  }



  console.log('');
  console.log('✅ Build concluído!');
  console.log('');
  console.log('Public atualizado com:');
  console.log('  ✅ frontend JS');
  console.log('  ✅ CSS');
  console.log('  ✅ services');
  console.log('  ✅ data completo');
  console.log('     - cases');
  console.log('     - contributions');
  console.log('     - gamificacao');
  console.log('     - mock');
  console.log('     - nivelamento');
  console.log('     - taxonomy');
  console.log('     - questions');


} catch (error) {

  console.error(
    '❌ Erro no build:',
    error.message
  );

  process.exit(1);

}