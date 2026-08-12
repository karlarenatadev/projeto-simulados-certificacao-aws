const fs = require('fs');
let txt = fs.readFileSync('src/frontend/js/app.js', 'utf8');

txt = txt.replace(/"\/cases\.html": "sidebar-btn-cases",/, `"/cases.html": "sidebar-btn-cases",\n      "/laboratorios.html": "sidebar-btn-labs",`);

fs.writeFileSync('src/frontend/js/app.js', txt, 'utf8');
console.log('app.js updated');
