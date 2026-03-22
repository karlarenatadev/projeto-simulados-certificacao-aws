# 🚀 Instruções de Deploy - Simulador AWS

## Pré-requisitos

Antes de fazer o deploy, certifique-se de que:

- [x] Todos os testes do `CHECKLIST_VALIDACAO.md` foram executados
- [x] Não há erros no console do navegador
- [x] Arquivos JSON foram validados
- [x] Documentação está atualizada

---

## Opção 1: GitHub Pages (Recomendado)

### Passo 1: Preparar o Repositório

```bash
# 1. Adicionar todos os arquivos modificados
git add .

# 2. Fazer commit com mensagem descritiva
git commit -m "feat: Adiciona suporte a múltipla resposta, modo flashcards e escala AWS oficial

- Implementa motor de quiz para questões de múltipla resposta
- Adiciona modo flashcards com 20 termos AWS essenciais
- Implementa escala oficial AWS (100-1000) com selo de aprovação
- Adiciona 10 novas questões (5 CLF-C02 + 5 AIF-C01)
- Corrige peso do Domínio 5 do AIF-C01 para 14%
- Melhora explicações com justificativa de distratores"

# 3. Fazer push para o repositório
git push origin main
```

### Passo 2: Configurar GitHub Pages

1. Acesse o repositório no GitHub
2. Vá em **Settings** > **Pages**
3. Em **Source**, selecione:
   - Branch: `main`
   - Folder: `/ (root)`
4. Clique em **Save**
5. Aguarde 2-3 minutos para o deploy

### Passo 3: Verificar Deploy

1. Acesse a URL: `https://[seu-usuario].github.io/[nome-do-repo]/`
2. Teste todas as funcionalidades:
   - [ ] Simulado normal
   - [ ] Modo flashcards
   - [ ] Questões de múltipla resposta
   - [ ] Selo de aprovação
   - [ ] Dark mode
   - [ ] PWA (instalação)

---

## Opção 2: Netlify

### Passo 1: Criar Conta

1. Acesse [netlify.com](https://www.netlify.com/)
2. Faça login com GitHub

### Passo 2: Deploy

1. Clique em **Add new site** > **Import an existing project**
2. Selecione **GitHub**
3. Escolha o repositório do simulador
4. Configure:
   - **Branch to deploy**: `main`
   - **Build command**: (deixe vazio)
   - **Publish directory**: (deixe vazio ou `/`)
5. Clique em **Deploy site**

### Passo 3: Configurar Domínio (Opcional)

1. Vá em **Domain settings**
2. Clique em **Add custom domain**
3. Siga as instruções para configurar DNS

---

## Opção 3: Vercel

### Passo 1: Instalar Vercel CLI

```bash
npm install -g vercel
```

### Passo 2: Deploy

```bash
# 1. Na pasta raiz do projeto
cd projeto-simulados-certificacao-aws

# 2. Fazer login
vercel login

# 3. Deploy
vercel

# 4. Deploy para produção
vercel --prod
```

### Passo 3: Configurar

Responda às perguntas:
- **Set up and deploy**: Yes
- **Which scope**: Sua conta
- **Link to existing project**: No
- **Project name**: aws-simulator
- **Directory**: ./
- **Override settings**: No

---

## Opção 4: Servidor Próprio (Apache/Nginx)

### Apache

1. Copie os arquivos para `/var/www/html/aws-simulator/`
2. Configure o `.htaccess`:

```apache
# .htaccess
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /aws-simulator/
    
    # Force HTTPS
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    
    # Cache static files
    <FilesMatch "\.(jpg|jpeg|png|gif|ico|css|js|json)$">
        Header set Cache-Control "max-age=31536000, public"
    </FilesMatch>
</IfModule>
```

### Nginx

1. Copie os arquivos para `/usr/share/nginx/html/aws-simulator/`
2. Configure o `nginx.conf`:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    root /usr/share/nginx/html/aws-simulator;
    index index.html;

    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    root /usr/share/nginx/html/aws-simulator;
    index index.html;

    # SSL certificates
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Cache static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|json)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker
    location /sw.js {
        add_header Cache-Control "no-cache";
    }

    # Fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. Reinicie o Nginx:

```bash
sudo systemctl restart nginx
```

---

## Configurações Pós-Deploy

### 1. Configurar HTTPS

**GitHub Pages**: Automático  
**Netlify**: Automático  
**Vercel**: Automático  
**Servidor Próprio**: Use Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obter certificado
sudo certbot --nginx -d seu-dominio.com
```

### 2. Configurar PWA

Verifique se o `manifest.json` está acessível:
```
https://seu-dominio.com/manifest.json
```

Verifique se o Service Worker está registrado:
```
https://seu-dominio.com/sw.js
```

### 3. Testar PWA

1. Abra o site no Chrome
2. Abra DevTools (F12)
3. Vá em **Application** > **Manifest**
4. Verifique se não há erros
5. Vá em **Service Workers**
6. Verifique se está ativo

### 4. Configurar Analytics (Opcional)

Adicione o Google Analytics no `index.html`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## Verificação Pós-Deploy

### Checklist de Validação

- [ ] Site carrega corretamente
- [ ] HTTPS está ativo (cadeado verde)
- [ ] PWA pode ser instalado
- [ ] Todas as imagens carregam
- [ ] Arquivos JSON são acessíveis
- [ ] Service Worker está ativo
- [ ] Dark mode funciona
- [ ] Modo flashcards funciona
- [ ] Questões de múltipla resposta funcionam
- [ ] Selo de aprovação aparece
- [ ] Relatório PDF pode ser gerado
- [ ] Funciona em mobile
- [ ] Funciona offline (após instalação)

### Ferramentas de Teste

1. **Lighthouse** (Chrome DevTools)
   - Performance: > 90
   - Accessibility: > 90
   - Best Practices: > 90
   - SEO: > 90
   - PWA: ✅ Installable

2. **PageSpeed Insights**
   - Acesse: https://pagespeed.web.dev/
   - Teste mobile e desktop

3. **PWA Builder**
   - Acesse: https://www.pwabuilder.com/
   - Valide o PWA

---

## Troubleshooting

### Problema: Arquivos JSON não carregam

**Solução**: Verifique o CORS no servidor

```nginx
# Nginx
add_header Access-Control-Allow-Origin *;
```

```apache
# Apache
Header set Access-Control-Allow-Origin "*"
```

### Problema: Service Worker não registra

**Solução**: Verifique se está em HTTPS

```javascript
// Adicione verificação no sw.js
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js');
}
```

### Problema: PWA não instala

**Solução**: Verifique o manifest.json

1. Abra DevTools > Application > Manifest
2. Verifique se todos os campos estão preenchidos
3. Verifique se os ícones existem

### Problema: Dark mode não funciona

**Solução**: Verifique o localStorage

```javascript
// Console do navegador
localStorage.getItem('aws_sim_theme')
```

### Problema: Questões não aparecem

**Solução**: Verifique o console

1. Abra DevTools (F12)
2. Vá em Console
3. Procure por erros de carregamento
4. Verifique se os arquivos JSON estão no caminho correto

---

## Monitoramento

### Logs de Acesso

**GitHub Pages**: Não disponível  
**Netlify**: Analytics integrado  
**Vercel**: Analytics integrado  
**Servidor Próprio**: Logs do servidor

```bash
# Apache
tail -f /var/log/apache2/access.log

# Nginx
tail -f /var/log/nginx/access.log
```

### Erros JavaScript

Configure um serviço de monitoramento:

1. **Sentry** (recomendado)
2. **LogRocket**
3. **Rollbar**

---

## Backup

### Antes de Cada Deploy

```bash
# 1. Backup do código
git tag -a v2.0 -m "Versão 2.0 - Múltipla resposta e flashcards"
git push origin v2.0

# 2. Backup dos dados
cp -r data/ backup/data-$(date +%Y%m%d)/

# 3. Backup do banco de dados (se houver)
# mysqldump -u user -p database > backup.sql
```

---

## Rollback (Se Necessário)

### GitHub Pages

```bash
# 1. Reverter para commit anterior
git revert HEAD

# 2. Fazer push
git push origin main
```

### Netlify/Vercel

1. Acesse o dashboard
2. Vá em **Deployments**
3. Clique em **Rollback** no deploy anterior

### Servidor Próprio

```bash
# 1. Restaurar backup
cp -r backup/data-20260322/ data/

# 2. Reiniciar servidor
sudo systemctl restart nginx
```

---

## Atualizações Futuras

### Processo Recomendado

1. Desenvolver em branch separada
2. Testar localmente
3. Fazer merge para `main`
4. Deploy automático (CI/CD)

### Configurar CI/CD (GitHub Actions)

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Validate JSON
        run: |
          node -e "JSON.parse(require('fs').readFileSync('data/clf-c02.json', 'utf8'))"
          node -e "JSON.parse(require('fs').readFileSync('data/aif-c01.json', 'utf8'))"
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

---

## Suporte

### Documentação
- README.md
- ATUALIZACOES_IMPLEMENTADAS.md
- GUIA_FLASHCARDS.md
- CHECKLIST_VALIDACAO.md

### Contato
- **LinkedIn**: [linkedin.com/in/karlarenata-rosario](https://www.linkedin.com/in/karlarenata-rosario/)
- **GitHub Issues**: [github.com/karlarenatadev/projeto-simulados-certificacao-aws/issues](https://github.com/karlarenatadev/projeto-simulados-certificacao-aws/issues)

---

**Boa sorte com o deploy! 🚀**
