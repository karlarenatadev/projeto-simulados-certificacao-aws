#!/usr/bin/env python3
"""
Script para corrigir inconsistências entre type e correct nos arquivos JSON
"""

import json
from pathlib import Path

def fix_question_types(file_path):
    """Corrige o type das questões baseado no formato de correct"""
    print(f"\n🔧 Processando: {file_path.name}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    fixed_count = 0
    
    for question in questions:
        correct = question.get('correct')
        q_type = question.get('type', 'multiple-choice')
        
        # Se correct é lista mas type é multiple-choice, corrige
        if isinstance(correct, list) and q_type == 'multiple-choice':
            question['type'] = 'multiple-answer'
            fixed_count += 1
            print(f"  ✅ Corrigido: {question.get('service', 'N/A')} - type alterado para 'multiple-answer'")
        
        # Se correct é int mas type é multiple-answer, corrige
        elif isinstance(correct, int) and q_type == 'multiple-answer':
            question['type'] = 'multiple-choice'
            fixed_count += 1
            print(f"  ✅ Corrigido: {question.get('service', 'N/A')} - type alterado para 'multiple-choice'")
    
    if fixed_count > 0:
        # Salva arquivo corrigido
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)
        print(f"  💾 {fixed_count} questões corrigidas e salvas")
    else:
        print(f"  ✅ Nenhuma correção necessária")
    
    return fixed_count

def main():
    """Processa todos os arquivos JSON na pasta data/"""
    base_dir = Path(__file__).parent.parent
    data_dir = base_dir / 'data'
    
    print("🚀 Iniciando correção de tipos de questões...")
    print("=" * 60)
    
    total_fixed = 0
    
    for json_file in data_dir.glob('*.json'):
        # Ignora backups
        if 'backup' in json_file.name:
            continue
        
        fixed = fix_question_types(json_file)
        total_fixed += fixed
    
    print()
    print("=" * 60)
    print(f"✅ Concluído! Total de questões corrigidas: {total_fixed}")

if __name__ == '__main__':
    main()
