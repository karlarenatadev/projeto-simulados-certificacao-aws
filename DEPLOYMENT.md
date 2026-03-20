# 🚀 Guia de Deployment

## Visão Geral

Este guia explica como fazer o deployment da aplicação em diferentes plataformas de hospedagem.

---

## 📋 Pré-requisitos

A aplicação é 100% client-side (frontend), portanto:

✅ **Não requer:**
- Servidor backend
- Base de dados
- Node.js runtime
- Configuração de ambiente

✅ **Requer apenas:**
- Servidor web estático (HTTP)
- Conexão à internet (para CDNs)

---

## 🌐 Opções de Hospedagem

### 1. GitHub Pages (Recomendado - Gratuito)

#### Passo a Passo

1. **Criar repositório no GitHub**
```bash
git init
git add .
git commit -m "Initial commit - Simulador AWS"
git branch -M main
git remote add origin https://github.com/seu-usuario/simulador-aws.git
git push -u origin main
```

2. **Ativar GitHub Pages**
- Vá para Settings → Pages
- Source: Deploy from a branch
- Branch: main / (root)
- Clique em Save

3. **Acessar**
- URL: `https://seu-usuario.github.io/simulador-aws/`
- Disponível em ~2 minutos

#### Vantagens
- ✅ Gratuito
- ✅ HTTPS automático
- ✅ Deploy automático via git push
- ✅ Domínio customizado suportado

---

### 2. Netlify (Recomendado - Gratuito)

#### Passo a Passo

1. **Via Interface Web**
- Acesse [netlify.com](https://netlify.com)
- Clique em "Add new site" → "Deploy manually"
- Arraste a pasta do projeto
- Pronto!

2. **Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

#### Vantagens
- ✅ Gratuito
- ✅ HTTPS automático
- ✅ Deploy em segundos
- ✅ Preview de branches
- ✅ Domínio customizado
- ✅ Formulários e funções serverless (futuro)

---

### 3. Vercel (Recomendado - Gratuito)

#### Passo a Passo

1. **Via Interface Web**
- Acesse [vercel.com](https://vercel.com)
- Clique em "New Project"
- Importe do GitHub ou faça upload
- Deploy automático

2. **Via Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Vantagens
- ✅ Gratuito
- ✅ HTTPS automático
- ✅ Deploy instantâneo
- ✅ Edge network global
- ✅ Analytics integrado

---

### 4. AWS S3 + CloudFront (Profissional)

#### Passo a Passo

1. **Criar bucket S3**
```bash
aws s3 mb s3://simulador-aws-certificacoes
aws s3 website s3://simulador-aws-certificacoes --index-document index.html
```

2. **Upload dos ficheiros**
```bash
aws s3 sync . s3://simulador-aws-certificacoes --exclude ".git/*"
```

3. **Configurar CloudFront**
- Criar distribuição CloudFront
- Origin: bucket S3
- Default root object: index.html
- Ativar HTTPS

4. **Configurar permissões**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::simulador-aws-certificacoes/*"
    }
  ]
}
```

#### Vantagens
- ✅ Infraestrutura AWS (tema do projeto!)
- ✅ Alta disponibilidade
- ✅ CDN global
- ✅ Escalabilidade ilimitada
- ⚠️ Custo: ~$0.50-2/mês

---

### 5. Firebase Hosting (Google)

#### Passo a Passo

1. **Instalar Firebase CLI**
```bash
npm install -g firebase-tools
firebase login
```

2. **Inicializar projeto**
```bash
firebase init hosting
# Escolha: public directory = . (raiz)
# Configure como single-page app: No
```

3. **Deploy**
```bash
firebase deploy --only hosting
```

#### Vantagens
- ✅ Gratuito (até 10GB/mês)
- ✅ HTTPS automático
- ✅ CDN global
- ✅ Rollback fácil

---

### 6. Servidor Próprio (Apache/Nginx)

#### Apache (.htaccess)

```apache
# .htaccess
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar compressão
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript
</IfModule>

# Cache de assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
```

#### Nginx (nginx.conf)

```nginx
server {
    listen 80;
    server_name simulador-aws.com;
    root /var/www/simulador-aws;
    index index.html;

    # Compressão
    gzip on;
    gzip_types text/css application/javascript text/html;

    # Cache
    location ~* \.(css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔒 Configuração de Segurança

### Content Security Policy (CSP)

Adicione ao `<head>` do index.html:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://fonts.googleapis.com;
  font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com;
  img-src 'self' data:;
  connect-src 'self';
">
```

### Headers de Segurança

Configure no servidor:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## ⚡ Otimização de Performance

### 1. Minificação

**HTML:**
```bash
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments index.html -o index.min.html
```

**CSS:**
```bash
npm install -g csso-cli
csso style.css -o style.min.css
```

**JavaScript:**
```bash
npm install -g terser
terser app.js -o app.min.js -c -m
terser data.js -o data.min.js -c -m
```

### 2. CDN para Assets

Considere hospedar ficheiros estáticos em CDN:
- Cloudflare
- AWS CloudFront
- Google Cloud CDN

### 3. Service Worker (PWA)

Crie `sw.js` para cache offline:

```javascript
const CACHE_NAME = 'simulador-aws-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/data.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

---

## 📊 Monitorização

### Google Analytics

Adicione ao `<head>`:

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

### Plausible Analytics (Alternativa Privacy-Friendly)

```html
<script defer data-domain="seu-dominio.com" src="https://plausible.io/js/script.js"></script>
```

---

## 🧪 Testes Pré-Deploy

### Checklist

- [ ] Testar em Chrome, Firefox, Safari, Edge
- [ ] Testar em mobile (iOS e Android)
- [ ] Verificar console sem erros
- [ ] Testar todas as funcionalidades
- [ ] Verificar localStorage funciona
- [ ] Testar geração de PDF
- [ ] Verificar responsividade
- [ ] Testar navegação por teclado
- [ ] Validar HTML (validator.w3.org)
- [ ] Testar performance (Lighthouse)

### Lighthouse Score Alvo

- Performance: > 90
- Accessibility: > 95
- Best Practices: > 90
- SEO: > 90

---

## 🌍 Domínio Customizado

### Configuração DNS

**Para GitHub Pages:**
```
Type: CNAME
Name: www
Value: seu-usuario.github.io
```

**Para Netlify/Vercel:**
```
Type: CNAME
Name: www
Value: seu-site.netlify.app (ou vercel.app)
```

**Para CloudFront:**
```
Type: A
Name: @
Value: [CloudFront IP]

Type: CNAME
Name: www
Value: [CloudFront domain]
```

---

## 🔄 CI/CD Automático

### GitHub Actions

Crie `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: .
```

---

## 📱 PWA (Progressive Web App)

### manifest.json

Crie `manifest.json`:

```json
{
  "name": "Simulador IA - Certificações AWS",
  "short_name": "Simulador AWS",
  "description": "Prepare-se para certificações AWS com simulados realistas",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#232f3e",
  "theme_color": "#ff9900",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Adicione ao `<head>`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#ff9900">
```

---

## 🐛 Troubleshooting

### CDNs não carregam

**Problema:** Tailwind/Chart.js não funciona  
**Solução:** Verificar conexão internet ou usar versões locais

### localStorage não funciona

**Problema:** Dados não salvam  
**Solução:** Verificar se não está em modo privado/anónimo

### PDF não gera

**Problema:** Botão não funciona  
**Solução:** Permitir pop-ups no browser

---

## 📞 Suporte

Problemas com deployment?
- Abra uma issue no GitHub
- Consulte documentação da plataforma
- Verifique logs de erro

---

**Última atualização:** 2024-03-20
