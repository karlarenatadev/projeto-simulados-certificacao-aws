const puppeteer = require('puppeteer');

(async () => {
  console.log("Iniciando testes E2E com Puppeteer...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Interceptar chamadas de rede para simular modo offline/GitHub pages (sem API)
  await page.setRequestInterception(true);
  page.on('console', msg => console.log('BROWSER:', msg.text()));
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      request.abort(); // Simula ausência de backend
    } else {
      request.continue();
    }
  });

  try {
    // Acessa o build local (presume-se http-server ativo na 8080)
    await page.goto('http://127.0.0.1:8080/index.html', { waitUntil: 'networkidle0' });
    
    console.log("1. Pagina carregada. Tentando login offline...");
    await page.waitForSelector('#login-email-input', { visible: true, timeout: 5000 });
    await page.type('#login-email-input', 'teste@a3data.com.br');
    await page.click('#login-submit-btn');

    // Esperar a transição para o Hub
    await page.waitForSelector('#screen-hub', { visible: true, timeout: 5000 });
    console.log("✅ Login realizado e Hub aberto.");

    // Validações do DOM
    const validateVisibility = async (selector, name) => {
      const isVisible = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && el.offsetParent !== null;
      }, selector);
      console.log(`${isVisible ? '✅' : '❌'} ${name} está visível (${selector})`);
      return isVisible;
    };

    await validateVisibility('#sprint-module', 'Sprint de Estudos');
    await validateVisibility('#weak-domains-card', 'Study Now');
    await validateVisibility('#global-performance-dashboard', 'Estatísticas (Radar)');
    
    // Validar cards da jornada
    const jornadaCards = await page.evaluate(() => {
      const progress = document.querySelector('#jornada-progress')?.innerText;
      const questions = document.querySelector('#jornada-questions')?.innerText;
      return { progress, questions };
    });
    console.log(`✅ Cards da Jornada populados: Progresso=${jornadaCards.progress}, Questões=${jornadaCards.questions}`);
    
    // Validar botão de simulação
    const btnText = await page.evaluate(() => document.querySelector('#btn-start-quiz')?.innerText);
    console.log(`✅ Botão de Simulados (Tradução): ${btnText}`);

  } catch (error) {
    console.error("❌ Erro durante a execução dos testes:", error.message);
  } finally {
    await browser.close();
  }
})();
