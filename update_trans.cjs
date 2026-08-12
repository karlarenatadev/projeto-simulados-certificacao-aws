const fs = require('fs');
let txt = fs.readFileSync('src/frontend/js/i18n/translations.js', 'utf8');

const ptAdditions = {
  aws_labs: "Laboratórios AWS",
  aws_labs_desc: "Pratique AWS com laboratórios hands-on e ambientes guiados.",
  labs_hero_title: "Laboratórios AWS",
  labs_hero_desc: "Pratique os serviços e conceitos da AWS em ambientes hands-on. Os laboratórios são realizados no AWS Skill Builder. O Cloud Academy organiza recomendações de prática de acordo com sua certificação e seus estudos.",
  cert_filter: "Certificação:",
  all: "Todas/Todos",
  service_filter: "Serviço:",
  level_filter: "Nível:",
  advanced: "Avançado",
  no_labs_title: "Nenhum laboratório encontrado.",
  no_labs_desc: "Altere os filtros para encontrar outras opções.",
  open_lab: "Abrir laboratório",
  mark_completed: "Marcar como concluído",
  marked_completed: "Marcado como concluído"
};

const enAdditions = {
  aws_labs: "AWS Labs",
  aws_labs_desc: "Practice AWS with hands-on labs and guided environments.",
  labs_hero_title: "AWS Labs",
  labs_hero_desc: "Practice AWS services and concepts in hands-on environments. Labs are hosted on AWS Skill Builder. Cloud Academy organizes practice recommendations according to your certification and studies.",
  cert_filter: "Certification:",
  all: "All",
  service_filter: "Service:",
  level_filter: "Level:",
  advanced: "Advanced",
  no_labs_title: "No labs found.",
  no_labs_desc: "Change filters to find other options.",
  open_lab: "Open lab",
  mark_completed: "Mark as completed",
  marked_completed: "Marked as completed"
};

const insertAdditions = (lang, additions) => {
  const marker = `${lang}: {`;
  const idx = txt.indexOf(marker);
  if (idx !== -1) {
    const insertPos = idx + marker.length;
    let str = '\n    // Labs\n';
    for (const [k, v] of Object.entries(additions)) {
      str += `    ${k}: "${v}",\n`;
    }
    txt = txt.slice(0, insertPos) + str + txt.slice(insertPos);
  }
};

insertAdditions('pt', ptAdditions);
insertAdditions('en', enAdditions);

fs.writeFileSync('src/frontend/js/i18n/translations.js', txt, 'utf8');
console.log('Translations updated successfully');
