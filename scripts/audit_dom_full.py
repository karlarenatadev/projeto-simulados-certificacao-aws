#!/usr/bin/env python3
"""
Auditoria COMPLETA de compatibilidade JavaScript ↔ HTML
Versão expandida com análise de eventos, estrutura DOM, navegação e órfãos
"""

import re
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple

# Diretórios do projeto
PROJECT_ROOT = Path(__file__).parent.parent
SRC_JS = PROJECT_ROOT / "src" / "frontend" / "js"
SRC_HTML = PROJECT_ROOT / "src" / "frontend"

# Padrões regex para seletores DOM
SELECTOR_PATTERNS = {
    "getElementById": re.compile(r'getElementById\(["\']([^"\']+)["\']\)'),
    "querySelector": re.compile(r'querySelector\(["\']([^"\']+)["\']\)'),
    "querySelectorAll": re.compile(r'querySelectorAll\(["\']([^"\']+)["\']\)'),
}

# Padrões para eventos
EVENT_PATTERNS = {
    "addEventListener": re.compile(r'\.addEventListener\(["\'](\w+)["\']'),
    "onclick": re.compile(r'\.onclick\s*='),
    "onchange": re.compile(r'\.onchange\s*='),
    "onsubmit": re.compile(r'\.onsubmit\s*='),
}

# Páginas principais do projeto
HTML_PAGES = {
    "index.html": SRC_HTML / "pages" / "index.html",
    "simulados.html": SRC_HTML / "pages" / "simulados.html",
    "jornada.html": SRC_HTML / "pages" / "jornada.html",
    "diagnostico.html": SRC_HTML / "pages" / "diagnostico.html",
    "flashcards.html": SRC_HTML / "pages" / "flashcards.html",
    "cases.html": SRC_HTML / "pages" / "cases.html",
    "resources.html": SRC_HTML / "pages" / "resources.html",
    "profile.html": SRC_HTML / "pages" / "profile.html",
    "settings.html": SRC_HTML / "pages" / "settings.html",
    "study-sprint.html": SRC_HTML / "pages" / "study-sprint.html",
    "simulator-room.html": SRC_HTML / "pages" / "simulator-room.html",
}


def extract_ids_from_html(html_path: Path) -> Set[str]:
    """Extrai todos os IDs de um arquivo HTML"""
    ids = set()
    try:
        with open(html_path, encoding='utf-8') as f:
            content = f.read()
            ids = set(re.findall(r'id=["\']([^"\']+)["\']', content))
    except Exception as e:
        print(f"[AVISO] Erro ao ler {html_path}: {e}")
    return ids


def extract_classes_from_html(html_path: Path) -> Set[str]:
    """Extrai todas as classes de um arquivo HTML"""
    classes = set()
    try:
        with open(html_path, encoding='utf-8') as f:
            content = f.read()
            # Extrai class="..." e class='...'
            class_matches = re.findall(r'class=["\']([^"\']+)["\']', content)
            for match in class_matches:
                # Separa múltiplas classes
                classes.update(match.split())
    except Exception as e:
        print(f"[AVISO] Erro ao ler {html_path}: {e}")
    return classes


def extract_buttons_from_html(html_path: Path) -> List[Dict]:
    """Extrai informações sobre botões no HTML"""
    buttons = []
    try:
        with open(html_path, encoding='utf-8') as f:
            content = f.read()
            # Procura por <button id="..." ou <button class="..."
            button_pattern = re.compile(
                r'<button[^>]*(?:id=["\']([^"\']+)["\'])?[^>]*(?:class=["\']([^"\']+)["\'])?[^>]*>',
                re.IGNORECASE
            )
            for match in button_pattern.finditer(content):
                btn_id = match.group(1)
                btn_class = match.group(2)
                if btn_id or btn_class:
                    buttons.append({
                        'id': btn_id,
                        'classes': btn_class.split() if btn_class else []
                    })
    except Exception as e:
        print(f"[AVISO] Erro ao ler {html_path}: {e}")
    return buttons


def extract_scripts_from_html(html_path: Path) -> List[str]:
    """Extrai os scripts carregados em cada página HTML"""
    scripts = []
    try:
        with open(html_path, encoding='utf-8') as f:
            content = f.read()
            # Procura por <script src="...">
            script_pattern = re.compile(r'<script[^>]*src=["\']([^"\']+)["\']')
            scripts = script_pattern.findall(content)
    except Exception as e:
        print(f"[AVISO] Erro ao ler {html_path}: {e}")
    return scripts


def extract_selectors_from_js(js_path: Path) -> Dict:
    """Extrai todos os seletores DOM de um arquivo JavaScript"""
    selectors = defaultdict(list)
    try:
        with open(js_path, encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for line_num, line in enumerate(lines, 1):
                for selector_type, pattern in SELECTOR_PATTERNS.items():
                    matches = pattern.finditer(line)
                    for match in matches:
                        selector = match.group(1)
                        selectors[selector].append({
                            'file': js_path.name,
                            'line': line_num,
                            'type': selector_type,
                            'code': line.strip()
                        })
    except Exception as e:
        print(f"[AVISO] Erro ao ler {js_path}: {e}")
    return selectors


def extract_events_from_js(js_path: Path) -> List[Dict]:
    """Extrai eventos registrados no JavaScript"""
    events = []
    try:
        with open(js_path, encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for line_num, line in enumerate(lines, 1):
                # Procura por addEventListener
                if 'addEventListener' in line:
                    # Tenta extrair o elemento e o evento
                    event_match = re.search(r'addEventListener\(["\'](\w+)["\']', line)
                    element_match = re.search(r'getElementById\(["\']([^"\']+)["\']', line)
                    
                    if event_match:
                        events.append({
                            'file': js_path.name,
                            'line': line_num,
                            'event_type': event_match.group(1),
                            'element_id': element_match.group(1) if element_match else None,
                            'code': line.strip()
                        })
    except Exception as e:
        print(f"[AVISO] Erro ao ler {js_path}: {e}")
    return events


def scan_javascript_files() -> Tuple[Dict, List]:
    """Escaneia todos os arquivos JavaScript"""
    all_selectors = defaultdict(list)
    all_events = []
    js_files = list(SRC_JS.rglob("*.js"))
    
    print(f"Escaneando {len(js_files)} arquivos JavaScript...")
    
    for js_file in js_files:
        file_selectors = extract_selectors_from_js(js_file)
        for selector, occurrences in file_selectors.items():
            all_selectors[selector].extend(occurrences)
        
        file_events = extract_events_from_js(js_file)
        all_events.extend(file_events)
    
    return all_selectors, all_events


def scan_html_files() -> Dict:
    """Escaneia todos os arquivos HTML principais"""
    html_data = {}
    
    print(f"Escaneando {len(HTML_PAGES)} arquivos HTML...")
    
    for name, path in HTML_PAGES.items():
        if path.exists():
            ids = extract_ids_from_html(path)
            classes = extract_classes_from_html(path)
            buttons = extract_buttons_from_html(path)
            scripts = extract_scripts_from_html(path)
            
            html_data[name] = {
                'ids': ids,
                'classes': classes,
                'buttons': buttons,
                'scripts': scripts
            }
            print(f"  OK {name}: {len(ids)} IDs, {len(classes)} classes, {len(buttons)} botoes")
        else:
            print(f"  AVISO {name}: arquivo nao encontrado")
            html_data[name] = {
                'ids': set(),
                'classes': set(),
                'buttons': [],
                'scripts': []
            }
    
    return html_data


def check_compatibility(js_selectors: Dict, html_data: Dict) -> Dict:
    """Verifica compatibilidade entre seletores JS e IDs HTML"""
    report = {
        "critical": [],
        "missing": [],
        "wrong_page": [],
        "orphan_js": [],
        "summary": {}
    }
    
    # Coleta todos os IDs de todas as páginas
    all_html_ids = set()
    for page_data in html_data.values():
        all_html_ids.update(page_data['ids'])
    
    # Análise de seletores getElementById
    for selector, occurrences in js_selectors.items():
        # Filtra apenas getElementById
        get_by_id_refs = [o for o in occurrences if o['type'] == 'getElementById']
        
        if not get_by_id_refs:
            continue
        
        # Verifica se o ID existe em alguma página HTML
        if selector not in all_html_ids:
            # Elemento completamente ausente
            for ref in get_by_id_refs:
                report["critical"].append({
                    "selector": selector,
                    "file": ref['file'],
                    "line": ref['line'],
                    "type": "getElementById",
                    "code": ref['code'],
                    "problem": "ID não existe em nenhum HTML",
                    "impact": "Pode causar 'Cannot read properties of null'",
                    "pages": None
                })
        else:
            # Existe, verificar em qual página
            found_in = [page for page, data in html_data.items() if selector in data['ids']]
            
            # Se existe em múltiplas páginas, não é problema
            if len(found_in) > 0:
                # Documentar onde existe para referência
                pass
    
    # Resumo
    report["summary"] = {
        "total_selectors": len(js_selectors),
        "total_html_ids": len(all_html_ids),
        "critical_errors": len(report["critical"]),
        "missing_elements": len(report["missing"]),
    }
    
    return report


def check_events_compatibility(events: List[Dict], html_data: Dict) -> List[Dict]:
    """Verifica se os eventos têm elementos correspondentes no HTML"""
    broken_events = []
    
    all_html_ids = set()
    for page_data in html_data.values():
        all_html_ids.update(page_data['ids'])
    
    for event in events:
        element_id = event.get('element_id')
        if element_id and element_id not in all_html_ids:
            broken_events.append({
                'element_id': element_id,
                'event_type': event['event_type'],
                'file': event['file'],
                'line': event['line'],
                'code': event['code'],
                'problem': 'Elemento não encontrado em nenhum HTML'
            })
    
    return broken_events


def find_orphan_html_elements(html_data: Dict, js_selectors: Dict) -> Dict:
    """Encontra elementos HTML que não são referenciados por nenhum JavaScript"""
    orphans = {}
    
    # IDs referenciados pelo JavaScript
    js_referenced_ids = set(js_selectors.keys())
    
    for page_name, page_data in html_data.items():
        page_ids = page_data['ids']
        
        # IDs que existem no HTML mas não são referenciados
        orphan_ids = page_ids - js_referenced_ids
        
        if orphan_ids:
            orphans[page_name] = {
                'total_ids': len(page_ids),
                'orphan_ids': sorted(orphan_ids),
                'orphan_count': len(orphan_ids)
            }
    
    return orphans


def analyze_script_loading(html_data: Dict) -> Dict:
    """Analisa quais scripts são carregados em cada página"""
    script_analysis = {}
    
    for page_name, page_data in html_data.items():
        scripts = page_data['scripts']
        
        script_analysis[page_name] = {
            'count': len(scripts),
            'scripts': scripts,
            'loads_app_js': any('app.js' in s for s in scripts),
            'loads_modules': any('module' in s for s in scripts)
        }
    
    return script_analysis




def generate_markdown_report_part1(report: Dict, events: List, broken_events: List, 
                                     html_data: Dict, js_selectors: Dict) -> List[str]:
    """Gera a primeira parte do relatório em Markdown (Resumo Executivo e Erros Críticos)"""
    md = []
    
    md.append("# RELATÓRIO DE AUDITORIA COMPLETA — COMPATIBILIDADE JAVASCRIPT ↔ HTML")
    md.append("")
    md.append("**Data:** " + str(PROJECT_ROOT))
    md.append("")
    md.append("---")
    md.append("")
    
    # A. RESUMO EXECUTIVO
    md.append("## A. RESUMO EXECUTIVO")
    md.append("")
    summary = report["summary"]
    md.append(f"- **Seletores JavaScript analisados:** {summary['total_selectors']}")
    
    total_ids = summary['total_html_ids']
    md.append(f"- **IDs HTML encontrados:** {total_ids}")
    
    total_events = len(events)
    md.append(f"- **Eventos addEventListener analisados:** {total_events}")
    
    critical_count = summary['critical_errors']
    md.append(f"- **Erros críticos (getElementById sem elemento):** {critical_count} ❌")
    
    broken_events_count = len(broken_events)
    md.append(f"- **Eventos quebrados:** {broken_events_count} ⚠️")
    
    md.append("")
    md.append("### Status Geral")
    md.append("")
    if critical_count == 0 and broken_events_count == 0:
        md.append("✅ **EXCELENTE** — Nenhum erro crítico detectado!")
    elif critical_count < 10:
        md.append("⚠️ **ATENÇÃO** — Alguns erros críticos foram encontrados.")
    else:
        md.append("❌ **CRÍTICO** — Múltiplos problemas que podem quebrar a aplicação!")
    md.append("")
    
    return md


def generate_markdown_report_part2(report: Dict) -> List[str]:
    """Gera a segunda parte do relatório (Erros Críticos)"""
    md = []
    
    # B. ERROS CRÍTICOS
    md.append("## B. ERROS CRÍTICOS")
    md.append("")
    md.append("Problemas que **QUEBRAM** a aplicação (getElementById retorna null):")
    md.append("")
    
    if report["critical"]:
        # Agrupa por seletor para evitar repetição
        by_selector = defaultdict(list)
        for error in report["critical"]:
            by_selector[error['selector']].append(error)
        
        for i, (selector, errors) in enumerate(sorted(by_selector.items()), 1):
            md.append(f"### [{i}] `{selector}`")
            md.append("")
            md.append(f"**Problema:** {errors[0]['problem']}")
            md.append(f"**Impacto:** {errors[0]['impact']}")
            md.append("")
            md.append(f"**Ocorrências:** {len(errors)}")
            md.append("")
            
            # Lista até 5 ocorrências
            for j, error in enumerate(errors[:5], 1):
                md.append(f"**Ocorrência {j}:**")
                md.append(f"- Arquivo: `{error['file']}`")
                md.append(f"- Linha: {error['line']}")
                md.append("")
                md.append("```javascript")
                md.append(error['code'])
                md.append("```")
                md.append("")
            
            if len(errors) > 5:
                md.append(f"... e mais {len(errors) - 5} ocorrências.")
                md.append("")
            
            md.append("---")
            md.append("")
    else:
        md.append("✅ **Nenhum erro crítico detectado!**")
        md.append("")
    
    return md


def generate_markdown_report_part3(broken_events: List) -> List[str]:
    """Gera a terceira parte do relatório (Eventos Quebrados)"""
    md = []
    
    # F. EVENTOS QUEBRADOS
    md.append("## C. EVENTOS QUEBRADOS")
    md.append("")
    md.append("Eventos addEventListener associados a elementos inexistentes:")
    md.append("")
    
    if broken_events:
        for i, event in enumerate(broken_events[:30], 1):
            md.append(f"### [{i}] Evento `{event['event_type']}` em `{event['element_id']}`")
            md.append("")
            md.append(f"- **Arquivo:** `{event['file']}`")
            md.append(f"- **Linha:** {event['line']}")
            md.append(f"- **Problema:** {event['problem']}")
            md.append("")
            md.append("```javascript")
            md.append(event['code'])
            md.append("```")
            md.append("")
        
        if len(broken_events) > 30:
            md.append(f"... e mais {len(broken_events) - 30} eventos quebrados.")
            md.append("")
    else:
        md.append("✅ **Todos os eventos têm elementos correspondentes!**")
        md.append("")
    
    return md




def generate_markdown_report_part4(orphans: Dict) -> List[str]:
    """Gera a quarta parte do relatório (Elementos HTML Órfãos)"""
    md = []
    
    # E. ELEMENTOS HTML ÓRFÃOS
    md.append("## D. ELEMENTOS HTML ÓRFÃOS")
    md.append("")
    md.append("Elementos importantes que existem no HTML mas **não são utilizados** pelo JavaScript:")
    md.append("")
    
    if orphans:
        total_orphans = sum(data['orphan_count'] for data in orphans.values())
        md.append(f"**Total de elementos órfãos:** {total_orphans}")
        md.append("")
        
        for page_name, data in sorted(orphans.items()):
            md.append(f"### {page_name}")
            md.append("")
            md.append(f"- Total de IDs na página: {data['total_ids']}")
            md.append(f"- IDs órfãos (não referenciados pelo JS): {data['orphan_count']}")
            md.append("")
            
            # Lista até 20 órfãos por página
            orphan_ids = data['orphan_ids'][:20]
            md.append("**IDs órfãos:**")
            md.append("")
            for orphan_id in orphan_ids:
                md.append(f"- `{orphan_id}`")
            md.append("")
            
            if len(data['orphan_ids']) > 20:
                md.append(f"... e mais {len(data['orphan_ids']) - 20} IDs órfãos.")
                md.append("")
    else:
        md.append("✅ **Todos os IDs HTML são referenciados pelo JavaScript!**")
        md.append("")
    
    return md


def generate_markdown_report_part5(script_analysis: Dict) -> List[str]:
    """Gera a quinta parte do relatório (Scripts Carregados)"""
    md = []
    
    # H. CARREGAMENTO DE SCRIPTS
    md.append("## E. ANÁLISE DE CARREGAMENTO DE SCRIPTS")
    md.append("")
    md.append("Análise de quais scripts são carregados em cada página:")
    md.append("")
    
    for page_name, data in sorted(script_analysis.items()):
        md.append(f"### {page_name}")
        md.append("")
        md.append(f"- **Total de scripts:** {data['count']}")
        md.append(f"- **Carrega app.js:** {'✓' if data['loads_app_js'] else '✗'}")
        md.append("")
        
        if data['scripts']:
            md.append("**Scripts carregados:**")
            md.append("")
            for script in data['scripts']:
                md.append(f"- `{script}`")
            md.append("")
        else:
            md.append("⚠️ **Nenhum script carregado**")
            md.append("")
    
    return md


def generate_markdown_report_part6() -> List[str]:
    """Gera a sexta parte do relatório (Fluxo do Simulador)"""
    md = []
    
    # I. FLUXO DO SIMULADOR
    md.append("## F. ANÁLISE DO FLUXO DO SIMULADOR")
    md.append("")
    md.append("Análise específica do fluxo principal da aplicação:")
    md.append("")
    
    md.append("### Fluxo esperado:")
    md.append("")
    md.append("```")
    md.append("index.html (Learning Hub)")
    md.append("    ↓")
    md.append("jornada.html (Trilha Gamificada)")
    md.append("    ↓")
    md.append("diagnostico.html (Diagnóstico de Nivelamento)")
    md.append("    ↓ [questões do diagnóstico]")
    md.append("    ↓ [resultado do diagnóstico]")
    md.append("    ↓")
    md.append("simulados.html (Simulado Principal)")
    md.append("    ↓ [seleção de certificação]")
    md.append("    ↓ [questões do simulado]")
    md.append("    ↓ [resultado do simulado]")
    md.append("```")
    md.append("")
    
    md.append("### Elementos-chave por etapa:")
    md.append("")
    
    # Hub
    md.append("#### 1. Learning Hub (index.html)")
    md.append("")
    md.append("**Elementos necessários:**")
    md.append("- `screen-hub` — Container principal do hub")
    md.append("- `btn-start-journey` — Botão para iniciar jornada")
    md.append("- `btn-start-diagnostic` — Botão para iniciar diagnóstico")
    md.append("- `sidebar-cert-badge` — Badge da certificação ativa")
    md.append("- `hub-best-score` — Melhor pontuação")
    md.append("- `hub-insight-text` — Texto do insight de IA")
    md.append("")
    
    # Jornada
    md.append("#### 2. Jornada (jornada.html)")
    md.append("")
    md.append("**Elementos necessários:**")
    md.append("- `screen-jornada` — Container da tela de jornada")
    md.append("- `gamificacao-trail` — Container da trilha gamificada")
    md.append("- `gamificacao-badges-grid` — Grade de badges")
    md.append("- `guild-leaderboard` — Placar da guilda")
    md.append("")
    
    # Diagnóstico
    md.append("#### 3. Diagnóstico (diagnostico.html)")
    md.append("")
    md.append("**Elementos necessários:**")
    md.append("- `screen-start` — Tela inicial com seleção")
    md.append("- `screen-quiz` — Tela de execução do quiz")
    md.append("- `screen-results` — Tela de resultados")
    md.append("- `certification-select` — Seletor de certificação")
    md.append("- `btn-start-diagnostic` — Botão iniciar diagnóstico")
    md.append("- `progress-bar` — Barra de progresso")
    md.append("- `question-text` — Texto da questão")
    md.append("- `options-container` — Container de opções")
    md.append("- `btn-submit` — Botão confirmar resposta")
    md.append("- `btn-next` — Botão próxima questão")
    md.append("- `btn-finish` — Botão finalizar")
    md.append("")
    
    # Simulado
    md.append("#### 4. Simulado (simulados.html)")
    md.append("")
    md.append("**Elementos necessários:**")
    md.append("- `screen-start` — Tela inicial com filtros")
    md.append("- `screen-quiz` — Tela de execução do simulado")
    md.append("- `certification-select` — Seletor de certificação")
    md.append("- `btn-start-quiz` — Botão iniciar simulação")
    md.append("- `quiz-timer` — Timer do modo exame")
    md.append("- `progress-bar` — Barra de progresso")
    md.append("- `question-text` — Texto da questão")
    md.append("- `options-container` — Container de opções")
    md.append("- `btn-practice-mistakes` — Botão praticar erros")
    md.append("")
    
    return md




def generate_markdown_report_part7(report: Dict, broken_events: List, orphans: Dict) -> List[str]:
    """Gera a sétima parte do relatório (Recomendações)"""
    md = []
    
    # J. RECOMENDAÇÕES
    md.append("## G. RECOMENDAÇÕES")
    md.append("")
    md.append("Ordem sugerida para correção dos problemas encontrados:")
    md.append("")
    
    critical_count = report['summary']['critical_errors']
    broken_events_count = len(broken_events)
    
    md.append("### Prioridade 1: CRÍTICO")
    md.append("")
    if critical_count > 0:
        md.append(f"1. **Corrigir {critical_count} referências getElementById quebradas**")
        md.append("   - Esses erros causam `Cannot read properties of null`")
        md.append("   - Impedem funcionalidades de executar")
        md.append("   - Devem ser corrigidos IMEDIATAMENTE")
        md.append("")
        md.append("   **Ações sugeridas:**")
        md.append("   - Adicionar os IDs faltantes nos HTMLs corretos")
        md.append("   - OU adicionar validação `if (element)` antes de usar")
        md.append("   - OU remover código morto se a funcionalidade foi descontinuada")
    else:
        md.append("✅ **Nenhum problema crítico de getElementById**")
    md.append("")
    
    md.append("### Prioridade 2: ALTO")
    md.append("")
    if broken_events_count > 0:
        md.append(f"2. **Corrigir {broken_events_count} eventos addEventListener quebrados**")
        md.append("   - Eventos que nunca serão disparados")
        md.append("   - Funcionalidades que parecem existir mas não funcionam")
        md.append("")
        md.append("   **Ações sugeridas:**")
        md.append("   - Adicionar elementos faltantes")
        md.append("   - Validar se o elemento existe antes de adicionar o listener")
    else:
        md.append("✅ **Todos os eventos têm elementos correspondentes**")
    md.append("")
    
    md.append("### Prioridade 3: MÉDIO")
    md.append("")
    if orphans:
        total_orphans = sum(data['orphan_count'] for data in orphans.values())
        md.append(f"3. **Revisar {total_orphans} elementos HTML órfãos**")
        md.append("   - Elementos que existem mas não são usados pelo JS")
        md.append("   - Podem ser código legado ou funcionalidades incompletas")
        md.append("")
        md.append("   **Ações sugeridas:**")
        md.append("   - Documentar se são intencionais")
        md.append("   - Remover se forem código morto")
        md.append("   - Conectar ao JS se forem funcionalidades incompletas")
    else:
        md.append("✅ **Nenhum elemento órfão significativo**")
    md.append("")
    
    md.append("### Prioridade 4: BAIXO (Melhorias)")
    md.append("")
    md.append("4. **Adicionar defensive coding**")
    md.append("   - Adicionar validações `if (element)` em todos os seletores")
    md.append("   - Usar `?.` (optional chaining) onde aplicável")
    md.append("   - Adicionar try-catch em blocos críticos")
    md.append("")
    md.append("5. **Padronizar nomenclatura**")
    md.append("   - Consistência entre PT/EN")
    md.append("   - Padrão de hífens vs underscores")
    md.append("   - Singular vs plural")
    md.append("")
    md.append("6. **Documentar contratos DOM**")
    md.append("   - Documentar quais elementos cada página deve ter")
    md.append("   - Criar testes automatizados de estrutura DOM")
    md.append("   - Validar HTMLs em CI/CD")
    md.append("")
    
    return md


def save_report(md_lines: List[str], output_path: str):
    """Salva o relatório em arquivo Markdown"""
    output_file = PROJECT_ROOT / output_path
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md_lines))
    
    print(f"\n[OK] Relatorio salvo em: {output_file}")
    return output_file


def main():
    print("=" * 70)
    print("AUDITORIA COMPLETA DE COMPATIBILIDADE JS <-> HTML")
    print("=" * 70)
    print("")
    
    # 1. Escanear JavaScript
    print("[FASE 1] Escaneando arquivos JavaScript...")
    js_selectors, js_events = scan_javascript_files()
    print(f"OK {len(js_selectors)} seletores únicos encontrados")
    print(f"OK {len(js_events)} eventos addEventListener encontrados")
    print("")
    
    # 2. Escanear HTML
    print("[FASE 2] Escaneando arquivos HTML...")
    html_data = scan_html_files()
    total_html_ids = sum(len(data['ids']) for data in html_data.values())
    print(f"OK {total_html_ids} IDs únicos no HTML")
    print("")
    
    # 3. Verificar compatibilidade
    print("[FASE 3] Verificando compatibilidade...")
    report = check_compatibility(js_selectors, html_data)
    print(f"OK Análise de seletores concluída")
    
    broken_events = check_events_compatibility(js_events, html_data)
    print(f"OK Análise de eventos concluída")
    
    orphans = find_orphan_html_elements(html_data, js_selectors)
    print(f"OK Análise de elementos órfãos concluída")
    
    script_analysis = analyze_script_loading(html_data)
    print(f"OK Análise de carregamento de scripts concluída")
    print("")
    
    # 4. Gerar relatório
    print("[FASE 4] Gerando relatório markdown...")
    md_report = []
    
    md_report.extend(generate_markdown_report_part1(report, js_events, broken_events, html_data, js_selectors))
    md_report.extend(generate_markdown_report_part2(report))
    md_report.extend(generate_markdown_report_part3(broken_events))
    md_report.extend(generate_markdown_report_part4(orphans))
    md_report.extend(generate_markdown_report_part5(script_analysis))
    md_report.extend(generate_markdown_report_part6())
    md_report.extend(generate_markdown_report_part7(report, broken_events, orphans))
    
    report_file = save_report(md_report, "docs/AUDITORIA_DOM_COMPLETA.md")
    print("")
    
    # 5. Resumo final
    print("=" * 70)
    print("RESUMO FINAL:")
    print(f"  [CRITICO] Erros criticos (getElementById): {report['summary']['critical_errors']}")
    print(f"  [AVISO] Eventos quebrados: {len(broken_events)}")
    
    total_orphans = sum(data['orphan_count'] for data in orphans.values())
    print(f"  [INFO] Elementos HTML orfaos: {total_orphans}")
    print("=" * 70)
    print("")
    
    # Status final
    if report['summary']['critical_errors'] == 0 and len(broken_events) == 0:
        print("STATUS: EXCELENTE - Nenhum problema critico!")
    elif report['summary']['critical_errors'] < 10:
        print("STATUS: ATENCAO - Alguns problemas encontrados")
    else:
        print("STATUS: CRITICO - Multiplos problemas serios!")
    print("")


if __name__ == "__main__":
    main()
