#!/usr/bin/env python3
"""
Auditoria completa de compatibilidade JavaScript ↔ HTML
Identifica elementos esperados pelo JS mas ausentes no DOM
"""

import re
import json
from pathlib import Path
from collections import defaultdict

# Diretórios do projeto
PROJECT_ROOT = Path(__file__).parent.parent
SRC_JS = PROJECT_ROOT / "src" / "frontend" / "js"
SRC_HTML = PROJECT_ROOT / "src" / "frontend"

# Padrões regex para seletores DOM
PATTERNS = {
    "getElementById": re.compile(r'getElementById\(["\']([^"\']+)["\']\)'),
    "querySelector": re.compile(r'querySelector\(["\']([^"\']+)["\']\)'),
    "querySelectorAll": re.compile(r'querySelectorAll\(["\']([^"\']+)["\']\)'),
}

def extract_ids_from_html(html_path):
    """Extrai todos os IDs de um arquivo HTML"""
    ids = set()
    try:
        with open(html_path, encoding='utf-8') as f:
            content = f.read()
            # Procura por id="algo" ou id='algo'
            ids = set(re.findall(r'id=["\']([^"\']+)["\']', content))
    except Exception as e:
        print(f"[AVISO] Erro ao ler {html_path}: {e}")
    return ids

def extract_selectors_from_js(js_path):
    """Extrai todos os seletores DOM de um arquivo JavaScript"""
    selectors = defaultdict(list)
    try:
        with open(js_path, encoding='utf-8') as f:
            content = f.read()
            lines = content.split('\n')
            
            for line_num, line in enumerate(lines, 1):
                for selector_type, pattern in PATTERNS.items():
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

def scan_javascript_files():
    """Escaneia todos os arquivos JavaScript"""
    all_selectors = defaultdict(list)
    js_files = list(SRC_JS.rglob("*.js"))
    
    print(f"Escaneando {len(js_files)} arquivos JavaScript...")
    
    for js_file in js_files:
        file_selectors = extract_selectors_from_js(js_file)
        for selector, occurrences in file_selectors.items():
            all_selectors[selector].extend(occurrences)
    
    return all_selectors

def scan_html_files():
    """Escaneia todos os arquivos HTML principais"""
    html_files = {
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
    
    all_ids = {}
    print(f"Escaneando {len(html_files)} arquivos HTML...")
    
    for name, path in html_files.items():
        if path.exists():
            ids = extract_ids_from_html(path)
            all_ids[name] = ids
            print(f"  OK {name}: {len(ids)} IDs encontrados")
        else:
            print(f"  AVISO {name}: arquivo nao encontrado")
            all_ids[name] = set()
    
    return all_ids

def check_compatibility(js_selectors, html_ids):
    """Verifica compatibilidade entre seletores JS e IDs HTML"""
    report = {
        "critical": [],
        "missing": [],
        "orphan_js": [],
        "summary": {}
    }
    
    all_html_ids = set()
    for ids in html_ids.values():
        all_html_ids.update(ids)
    
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
            # Existe, mas verificar em qual página
            found_in = [page for page, ids in html_ids.items() if selector in ids]
            
            if len(found_in) == 0:
                report["missing"].append({
                    "selector": selector,
                    "references": len(get_by_id_refs),
                    "files": list(set(r['file'] for r in get_by_id_refs))
                })
    
    # Resumo
    report["summary"] = {
        "total_selectors": len(js_selectors),
        "total_html_ids": len(all_html_ids),
        "critical_errors": len(report["critical"]),
        "missing_elements": len(report["missing"]),
    }
    
    return report

def generate_markdown_report(report, output_path):
    """Gera relatório em Markdown"""
    md = []
    
    md.append("# RELATORIO DE AUDITORIA — COMPATIBILIDADE JAVASCRIPT <-> HTML")
    md.append("")
    md.append("**Data:** " + str(Path.cwd()))
    md.append("")
    md.append("---")
    md.append("")
    
    # A. RESUMO EXECUTIVO
    md.append("## A. RESUMO EXECUTIVO")
    md.append("")
    summary = report["summary"]
    md.append(f"- **Seletores JavaScript analisados:** {summary['total_selectors']}")
    md.append(f"- **IDs HTML encontrados:** {summary['total_html_ids']}")
    md.append(f"- **Erros criticos:** {summary['critical_errors']} [CRITICO]")
    md.append(f"- **Elementos ausentes:** {summary['missing_elements']} [AVISO]")
    md.append("")
    
    # B. ERROS CRÍTICOS
    md.append("## B. ERROS CRITICOS")
    md.append("")
    
    if report["critical"]:
        md.append("Problemas que **QUEBRAM** a aplicacao:")
        md.append("")
        
        for i, error in enumerate(report["critical"][:50], 1):  # Limita a 50 primeiros
            md.append(f"### [{i}] `{error['selector']}`")
            md.append("")
            md.append(f"- **Arquivo:** `{error['file']}`")
            md.append(f"- **Linha:** {error['line']}")
            md.append(f"- **Tipo:** `{error['type']}`")
            md.append(f"- **Problema:** {error['problem']}")
            md.append(f"- **Impacto:** {error['impact']}")
            md.append("")
            md.append("```javascript")
            md.append(error['code'])
            md.append("```")
            md.append("")
    else:
        md.append("[OK] Nenhum erro critico detectado!")
        md.append("")
    
    # C. ELEMENTOS AUSENTES
    md.append("## C. ELEMENTOS HTML AUSENTES")
    md.append("")
    
    if report["missing"]:
        md.append(f"Total de elementos referenciados mas nao encontrados: **{len(report['missing'])}**")
        md.append("")
        
        for item in report["missing"][:30]:  # Limita a 30
            md.append(f"- `{item['selector']}` — {item['references']} referencias em: {', '.join(item['files'])}")
        
        md.append("")
    else:
        md.append("[OK] Todos os elementos HTML necessarios existem!")
        md.append("")
    
    # Salva relatório
    output_file = PROJECT_ROOT / output_path
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))
    
    print(f"\n[OK] Relatorio salvo em: {output_file}")
    return output_file

def main():
    print("AUDITORIA DE COMPATIBILIDADE JS <-> HTML")
    print("=" * 60)
    print("")
    
    # 1. Escanear JavaScript
    js_selectors = scan_javascript_files()
    print(f"[OK] Total de seletores encontrados: {len(js_selectors)}")
    print("")
    
    # 2. Escanear HTML
    html_ids = scan_html_files()
    print("")
    
    # 3. Verificar compatibilidade
    print("Verificando compatibilidade...")
    report = check_compatibility(js_selectors, html_ids)
    print("")
    
    # 4. Gerar relatório
    print("Gerando relatorio...")
    report_file = generate_markdown_report(report, "docs/AUDITORIA_DOM_COMPATIBILIDADE.md")
    
    # 5. Resumo final
    print("")
    print("=" * 60)
    print("RESUMO FINAL:")
    print(f"  Erros críticos: {report['summary']['critical_errors']}")
    print(f"  Elementos ausentes: {report['summary']['missing_elements']}")
    print("=" * 60)

if __name__ == "__main__":
    main()
