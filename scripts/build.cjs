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


  // ============================================================
  // JAVASCRIPT
  // ============================================================

  console.log('📦 Copiando arquivos JS...');

  copyDirectoryRecursive(
    'src/frontend/js',
    'public/js'
  );



  // ============================================================
  // CSS
  // ============================================================

  console.log('🎨 Copiando arquivos CSS...');

  copyDirectoryRecursive(
    'src/frontend/styles',
    'public/css'
  );



  // ============================================================
  // SERVICES
  // ============================================================

  console.log('🔗 Copiando SERVICES...');

  if (fs.existsSync('src/services')) {

    copyDirectoryRecursive(
      'src/services',
      'public/services'
    );

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
  // VALIDATION
  // ============================================================

  console.log('📝 Copiando VALIDATION...');


  if (fs.existsSync('validation/valid.html')) {


    copyFile(
      'validation/valid.html',
      'public/validation/valid.html'
    );


    if (fs.existsSync('validation/css')) {

      copyDirectoryRecursive(
        'validation/css',
        'public/validation/css'
      );

    }


    if (fs.existsSync('validation/js')) {

      copyDirectoryRecursive(
        'validation/js',
        'public/validation/js'
      );

    }


  } else {

    console.warn(
      '⚠️ validation não encontrado'
    );

  }



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


} catch (error) {

  console.error(
    '❌ Erro no build:',
    error.message
  );

  process.exit(1);

}