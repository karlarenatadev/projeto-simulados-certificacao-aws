# A3 AWS Design System v1

Este documento estabelece as diretrizes e padrões do Design System da plataforma de simulados A3 AWS, desenvolvido para substituir as antigas classes utilitárias do padrão Tailwind-like por componentes semânticos, flexíveis e altamente temáticos (Dark Mode nativo).

## 1. Princípios do Design System
1. **Semântica primeiro:** As classes devem refletir *o que* o componente é (ex: `.a3-card`, `.a3-button-primary`), não a aparência física (como `bg-blue-500`).
2. **Tokens Dinâmicos:** As cores e espaçamentos provêm do `tokens.css`. Não há uso de `#hex` hardcoded nos arquivos de componentes ou no código HTML/JS.
3. **Escalabilidade (BEM pattern livre):** Utilizamos namespaces claros (`.a3-*`) e modificadores para estados (`.a3-button-danger`, `.a3-option-correct`).

---

## 2. Design Tokens Oficiais (`tokens.css` e `themes.css`)
O coração do nosso CSS baseia-se nas seguintes variáveis:

### Cores Base (Primitivas)
- `--a3-tech-blue`: Azul principal (Call to Action, Botões primários, Links ativos).
- `--a3-deep-sea`: Azul escuro profundo (Backgrounds, Headers).
- `--a3-sky-frost`: Azul gelo claro (Acentos, highlights).
- `--a3-accent` / `--a3-amethyst-velvet`: Cores de destaque para gamificação e alertas.

### Status Semântico
- `--a3-success`: Verde (Respostas corretas, aprovação).
- `--a3-danger`: Vermelho (Respostas incorretas, alertas de erro).
- `--a3-warning`: Laranja/Amarelo (Atenção, reprovação).
- `--a3-info`: Azul claro (Dicas, feedbacks neutros).

### Superfícies (Variam entre Light/Dark)
- `--bg-main`: Fundo principal da aplicação.
- `--bg-card`: Fundo dos elementos em card.
- `--a3-surface-soft`: Fundo suave para contrastes leves.
- `--a3-surface-raised`: Fundo elevado (ex: modais, popups).
- `--border-theme`: Cor das bordas (varia com o tema).

---

## 3. Componentes Disponíveis (`components/`)
Abaixo a lista de componentes oficiais migrados na v1:

### 🔹 Estruturais e Cards
- `.a3-card`: Base de cartões para qualquer conteúdo de grid.
- `.a3-stat-card`: Card para painel de resultados e dashboard.
  - Modificadores: `.a3-stat-card-success`, `.a3-stat-card-warning`, `.a3-stat-card-danger`.
- `.a3-result-card`: Card grande para apresentação de score final do simulado.

### 🔹 Botões
- `.a3-button` (ou equivalente semântico nas abas): Classe base de cliques estruturados.
- `.a3-button-primary`: Ação primária.
- `.a3-button-secondary` / `.a3-button-outline`: Ações secundárias.
- `.a3-button-danger`: Ações destrutivas.

### 🔹 Tipografia e Status
- `.a3-badge`: Etiquetas de tag/status genérico.
- `.a3-skill-badge`: Etiqueta usada nos resultados para detalhar serviços específicos da AWS.
  - Modificadores: `.a3-skill-badge-success`, `.a3-skill-badge-danger`.
- `.text-main`: Cor de texto padrão adaptável (Light/Dark).
- `.text-muted`: Texto secundário / legendas.

### 🔹 Elementos do Quiz
- `.a3-question-card`: Estrutura da questão.
- `.a3-option`: Botão/div de alternativa de resposta.
  - Estados: `.a3-option-selected`, `.a3-option-correct`, `.a3-option-wrong`.
- `.a3-feedback`: Quadro com a explicação do gabarito.
  - Modificadores: `.a3-feedback-success`, `.a3-feedback-error`.

### 🔹 Progresso
- `.a3-progress`: Container da barra.
- `.a3-progress-bar`: O preenchimento colorido interno.

---

## 4. Regras de Estilização

### 🚫 Classes Proibidas (Legado)
Para garantir consistência e evitar dependências no CSS utilitário antigo, **não utilize** em novos códigos:
- Classes estruturais e visuais tailwind-like: `.rounded-xl`, `.shadow-md`, `.flex`, `.grid`, `.p-4`, `.m-2` (exceto caso necessário explicitamente, preferível colocar no escopo semântico da classe).
- Cores de background legadas: `.bg-gray-100`, `.bg-slate-800`, `.bg-orange-500`, `.bg-blue-600`.
- Cores de texto legadas: `.text-gray-700`, `.text-slate-200`, `.text-orange-500`.

### ⚠️ Classes Permitidas (Transição e Compatibilidade)
Alguns aliases antigos foram mantidos provisoriamente porque pacotes externos de HTML ou scripts podem invocá-los antes de uma re-renderização total, ou porque fornecem utilidades difíceis de portar imediatamente:
- `.bg-white`, `.aws-bg-dark`
- Cores que já foram re-mapeadas e não afetam diretamente componentes visuais migrados e foram identificadas como "usadas" (verificadas pela Auditoria de Classes).

### 📐 Padrão para Novos Componentes
1. Crie o arquivo css em `src/frontend/styles/components/[nome].css`.
2. Adicione ao `build.cjs` para concatenação.
3. Use sempre as variáveis de cor e espaçamento do arquivo de tokens.
4. Prefira uso de BEM CSS `.a3-block__element--modifier`.
5. Garanta que o seletor raiz tenha suporte para `.dark .a3-block` (se houver mudanças estruturais de dark mode que fujam da paleta de cores raiz).

---
*Gerado durante a Finalização da Refatoração de Design System v1*
