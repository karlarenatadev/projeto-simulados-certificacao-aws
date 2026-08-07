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


// ============================================================
// HTML TEMPLATE PROCESSING — Opção C (build-time partials)
//
// Lê os partials de src/frontend/partials/ e substitui
// placeholders nos templates de src/frontend/pages/.
// Gera os HTMLs finais em public/.
//
// Placeholders suportados:
//   {{BOOT_OVERLAY}}    → partials/boot-overlay.html
//   {{LOGIN_OVERLAY}}   → partials/login-overlay.html
//   {{HEADER_SPA}}      → partials/header-spa.html   (somente index.html)
//   {{HEADER_PAGE}}     → partials/header-page.html  (páginas independentes)
//   {{SIDEBAR}}         → partials/sidebar.html
//   {{FOOTER}}          → partials/footer.html
//   {{POMODORO_WIDGET}} → partials/pomodoro-widget.html
// ============================================================

function processHTMLTemplates() {
  const partialsDir = 'src/frontend/partials';
  const pagesDir    = 'src/frontend/pages';
  const outputDir   = 'public';

  if (!fs.existsSync(partialsDir)) {
    console.warn('⚠️  src/frontend/partials/ não encontrado — pulando processamento de templates HTML.');
    return;
  }
  if (!fs.existsSync(pagesDir)) {
    console.warn('⚠️  src/frontend/pages/ não encontrado — pulando processamento de templates HTML.');
    return;
  }

  // Carregar partials
  const partialFiles = {
    'BOOT_OVERLAY':    path.join(partialsDir, 'boot-overlay.html'),
    'LOGIN_OVERLAY':   path.join(partialsDir, 'login-overlay.html'),
    'HEADER_SPA':      path.join(partialsDir, 'header-spa.html'),
    'HEADER_PAGE':     path.join(partialsDir, 'header-page.html'),
    'SIDEBAR':         path.join(partialsDir, 'sidebar.html'),
    'FOOTER':          path.join(partialsDir, 'footer.html'),
    'POMODORO_WIDGET': path.join(partialsDir, 'pomodoro-widget.html'),
  };

  const partials = {};
  for (const [key, filePath] of Object.entries(partialFiles)) {
    if (fs.existsSync(filePath)) {
      partials[key] = fs.readFileSync(filePath, 'utf8');
    } else {
      console.warn(`  ⚠️  Partial não encontrado: ${filePath}`);
      partials[key] = `<!-- PARTIAL ${key} NOT FOUND -->`;
    }
  }

  // Processar cada template em src/frontend/pages/
  const templateFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));

  for (const templateFile of templateFiles) {
    const templatePath = path.join(pagesDir, templateFile);
    let html = fs.readFileSync(templatePath, 'utf8');

    // Substituir cada placeholder pelo conteúdo do partial
    for (const [key, content] of Object.entries(partials)) {
      // Suporta tanto <!-- {{KEY}} --> quanto {{KEY}} simples
      const commentPlaceholder = new RegExp(`\\s*<!--\\s*\\{\\{${key}\\}\\}\\s*-->`, 'g');
      const simplePlaceholder  = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(commentPlaceholder, '\n' + content);
      html = html.replace(simplePlaceholder,  content);
    }

    // Gravar o artefato final em public/
    const outputPath = path.join(outputDir, templateFile);
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`  ✅ ${templateFile} (${Math.round(html.length / 1024)}KB)`);
  }

  console.log(`  → ${templateFiles.length} página(s) processada(s) com partials.`);
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
  // HTML TEMPLATES — build-time partial injection
  // ============================================================

  console.log('🧩 Processando templates HTML com partials...');
  processHTMLTemplates();

  // ============================================================
  // PARTIALS HTML (sidebar.html, etc.)
  // ============================================================

  console.log('🧩 Copiando partials HTML...');

  // Copiar partials HTML para public/partials/
  if (fs.existsSync('src/frontend/partials')) {
    copyDirectoryRecursive('src/frontend/partials', 'public/partials');
    console.log('  ✅ Copiado partials para public/partials/');
  }

  // ============================================================
  // CSS
  // ============================================================

  console.log('🎨 Compilando Tailwind CSS...');
  execSync('npx @tailwindcss/cli -i src/frontend/styles/tailwind.source.css -o src/frontend/styles/tailwind.css', { stdio: 'inherit' });

  console.log('🎨 Copiando e Consolidando arquivos CSS...');

  copyDirectoryRecursive(
    'src/frontend/styles',
    'public/css'
  );

  // Consolidação de CSS
  const stylesDir = 'src/frontend/styles';
  const cssOrder = [
    'tailwind.css',
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
  // SERVICES (Movido para src/frontend/js/services, é copiado nativamente)
  // ============================================================

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
  console.log('  ✅ templates HTML (partials injetados)');
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