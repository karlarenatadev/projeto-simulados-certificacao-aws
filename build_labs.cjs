const fs = require('fs');
let html = fs.readFileSync('src/frontend/pages/laboratorios.html', 'utf8');

html = html.replace(/<title>.*?<\/title>/, '<title>Laboratórios AWS - Simulador AWS</title>');
html = html.replace(/<meta name="description".*?>/, '<meta name="description" content="Pratique AWS com laboratórios hands-on e ambientes guiados no AWS Skill Builder." />');

const heroSection = `<section class="cases-hero">
      <div class="cases-hero-badge">
        <i class="fa-solid fa-flask"></i>
        <span data-i18n="aws_labs">Laboratórios AWS</span>
      </div>
      <h1 data-i18n="aws_labs">Laboratórios AWS</h1>
      <p data-i18n="labs_hero_desc">
        Pratique os serviços e conceitos da AWS em ambientes hands-on. Os laboratórios são realizados no AWS Skill Builder. O Cloud Academy organiza recomendações de prática de acordo com sua certificação e seus estudos.
      </p>
    </section>`;

html = html.replace(/<section class="cases-hero">[\s\S]*?<\/section>/, heroSection);

const filtersSection = `<div class="cases-filters" role="search" aria-label="Filtros de laboratórios">
      <label for="filter-certification">
        <i class="fa-solid fa-certificate cases-filter-icon"></i>
        <span data-i18n="cert_filter">Certificação:</span>
      </label>
      <select id="filter-certification" class="cases-filter-select">
        <option value="" data-i18n="all">Todas</option>
        <option value="CLF-C02">CLF-C02 - Cloud Practitioner</option>
        <option value="SAA-C03">SAA-C03 - Solutions Architect</option>
        <option value="DVA-C02">DVA-C02 - Developer Associate</option>
        <option value="AIF-C01">AIF-C01 - AI Practitioner</option>
      </select>

      <label for="filter-service" class="cases-filter-label-gap">
        <i class="fa-solid fa-server cases-filter-icon"></i>
        <span data-i18n="service_filter">Serviço:</span>
      </label>
      <select id="filter-service" class="cases-filter-select">
        <option value="" data-i18n="all">Todos</option>
      </select>

      <label for="filter-difficulty" class="cases-filter-label-gap">
        <i class="fa-solid fa-signal cases-filter-icon"></i>
        <span data-i18n="level_filter">Nível:</span>
      </label>
      <select id="filter-difficulty" class="cases-filter-select">
        <option value="" data-i18n="all">Todos</option>
        <option value="beginner" data-i18n="beginner">Iniciante</option>
        <option value="intermediate" data-i18n="intermediate">Intermediário</option>
        <option value="advanced" data-i18n="advanced">Avançado</option>
      </select>

      <span id="labs-count-label" class="cases-count-text"></span>
    </div>`;

html = html.replace(/<div class="cases-filters"[\s\S]*?<\/div>/, filtersSection);

html = html.replace(/id="cases-grid"/g, 'id="labs-grid"');
html = html.replace(/id="cases-main"/g, 'id="labs-main"');
html = html.replace(/id="cases-page-body"/g, 'id="labs-page-body"');
html = html.replace(/aria-label="Lista de cases de arquitetura"/g, 'aria-label="Lista de laboratórios AWS"');

fs.writeFileSync('src/frontend/pages/laboratorios.html', html, 'utf8');
