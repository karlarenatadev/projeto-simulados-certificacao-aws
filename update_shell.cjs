const fs = require('fs');
let txt = fs.readFileSync('src/frontend/js/shell.js', 'utf8');

const labsItem = `
    {
      id: "sidebar-btn-labs",
      label: "Labs",
      icon: "fa-solid fa-flask",
      href: "./laboratorios.html",
      activePaths: ["/laboratorios.html"],
      roles: ["*"],
      title: "Laboratórios AWS",
      i18n: "aws_labs",
    },`;

txt = txt.replace(/(\{\s*id: "sidebar-btn-cases",[\s\S]*?\},)/, `$1${labsItem}`);

fs.writeFileSync('src/frontend/js/shell.js', txt, 'utf8');
console.log('shell.js updated');
