const fs = require('fs');
const files = [
  'src/frontend/pages/index.html',
  'src/frontend/pages/jornada.html',
  'src/frontend/pages/simulados.html',
  'src/frontend/pages/cases.html',
  'src/frontend/pages/diagnostico.html',
  'src/frontend/pages/resources.html'
];
const dictionary = {
  'Comece por aqui': 'start_here',
  'INDICADORES PRINCIPAIS': 'main_indicators',
  'Progresso da Certificação': 'cert_progress',
  'Prontidão para o Exame': 'exam_readiness',
  'Sua performance geral': 'general_performance',
  'Melhor Nota': 'best_score',
  'Taxa Acerto': 'accuracy_rate',
  'Média Geral': 'general_average',
  'Questões': 'questions',
  'Sequência': 'streak',
  'dias seguidos': 'consecutive_days',
  'Progresso': 'progress',
  'Erros Pendentes': 'pending_errors',
  'para revisar': 'to_review',
  'Ponto Fraco': 'weak_point',
  'Simulados': 'simulations',
  'Média': 'average',
  'Atividades Recentes': 'recent_activities',
  'Limpar Histórico': 'clear_history',
  'Carregando análise personalizada...': 'loading_analysis',
  'Simulado Rápido': 'quick_simulation',
  'Revisar Erros': 'review_errors',
  'Carregando...': 'loading'
};

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let html = fs.readFileSync(file, 'utf8');
  for (const [ptText, key] of Object.entries(dictionary)) {
    const regex = new RegExp('(<[^>]+>)\\s*' + ptText.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '\\s*(</[^>]+>)', 'g');
    html = html.replace(regex, (match, openTag, closeTag) => {
      if (openTag.includes('data-i18n=')) return match;
      return openTag.replace('>', ' data-i18n=\"' + key + '\">') + ptText + closeTag;
    });
  }
  fs.writeFileSync(file, html, 'utf8');
});
console.log('Injected data-i18n into HTML files.');
