#!/usr/bin/env python3
"""
Script de Geração Automática de Questões AWS
Balanceia automaticamente os níveis de dificuldade em cada certificação.

USO:
    python scripts_python/auto_generate_questions.py clf-c02
    python scripts_python/auto_generate_questions.py all
    python scripts_python/auto_generate_questions.py --balance-all
"""

import json
import sys
import os
from pathlib import Path
from generator import fabricar_questoes, EXAMES_CONFIG

# Metas de distribuição ideal por certificação
TARGET_DISTRIBUTION = {
    "clf-c02": {
        "easy": 60,      # 60 questões fáceis
        "medium": 70,    # 70 questões médias
        "hard": 60,      # 60 questões difíceis
        "total": 190
    },
    "saa-c03": {
        "easy": 60,
        "medium": 64,
        "hard": 60,
        "total": 184
    },
    "dva-c02": {
        "easy": 30,
        "medium": 40,
        "hard": 30,
        "total": 100
    },
    "aif-c01": {
        "easy": 40,
        "medium": 50,
        "hard": 28,
        "total": 118
    }
}

# Quantidade de questões a gerar por lote
BATCH_SIZE = 10


def analyze_current_distribution(cert_id):
    """
    Analisa a distribuição atual de questões por dificuldade.
    """
    file_path = f"data/{cert_id}.json"
    
    if not os.path.exists(file_path):
        print(f"❌ Arquivo não encontrado: {file_path}")
        return None
    
    with open(file_path, 'r', encoding='utf-8') as f:
        questions = json.load(f)
    
    distribution = {
        "easy": len([q for q in questions if q.get("difficulty") == "easy"]),
        "medium": len([q for q in questions if q.get("difficulty") == "medium"]),
        "hard": len([q for q in questions if q.get("difficulty") == "hard"]),
        "total": len(questions)
    }
    
    return distribution


def calculate_needed_questions(cert_id):
    """
    Calcula quantas questões precisam ser geradas para cada nível.
    """
    current = analyze_current_distribution(cert_id)
    if not current:
        return None
    
    target = TARGET_DISTRIBUTION.get(cert_id)
    if not target:
        print(f"⚠️  Certificação {cert_id} não tem meta definida")
        return None
    
    needed = {
        "easy": max(0, target["easy"] - current["easy"]),
        "medium": max(0, target["medium"] - current["medium"]),
        "hard": max(0, target["hard"] - current["hard"])
    }
    
    return {
        "current": current,
        "target": target,
        "needed": needed
    }


def generate_questions_for_level(cert_id, difficulty, quantity):
    """
    Gera questões para um nível específico.
    """
    if quantity <= 0:
        return []
    
    print(f"\n{'='*70}")
    print(f"🎯 Gerando {quantity} questões de nível '{difficulty}' para {cert_id.upper()}")
    print(f"{'='*70}")
    
    all_generated = []
    remaining = quantity
    
    while remaining > 0:
        batch_size = min(BATCH_SIZE, remaining)
        print(f"\n📦 Lote: {batch_size} questões...")
        
        questions = fabricar_questoes(cert_id, difficulty, batch_size)
        
        if questions:
            all_generated.extend(questions)
            remaining -= len(questions)
            print(f"✅ Geradas: {len(questions)} questões")
            print(f"📊 Progresso: {len(all_generated)}/{quantity}")
        else:
            print(f"❌ Falha ao gerar questões. Tentando novamente...")
            continue
    
    return all_generated


def save_questions(cert_id, new_questions):
    """
    Adiciona novas questões ao arquivo existente.
    """
    file_path = f"data/{cert_id}.json"
    
    # Carrega questões existentes
    with open(file_path, 'r', encoding='utf-8') as f:
        existing_questions = json.load(f)
    
    # Adiciona novas questões
    existing_questions.extend(new_questions)
    
    # Salva arquivo atualizado
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing_questions, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 Arquivo atualizado: {file_path}")
    print(f"   Total de questões: {len(existing_questions)}")


def balance_certification(cert_id):
    """
    Balanceia a distribuição de questões de uma certificação.
    """
    print(f"\n{'='*70}")
    print(f"📊 ANÁLISE: {cert_id.upper()}")
    print(f"{'='*70}")
    
    analysis = calculate_needed_questions(cert_id)
    if not analysis:
        return False
    
    current = analysis["current"]
    target = analysis["target"]
    needed = analysis["needed"]
    
    # Exibe status atual
    print(f"\n📈 Distribuição Atual:")
    print(f"   Fácil:        {current['easy']:3d} / {target['easy']:3d} (faltam {needed['easy']})")
    print(f"   Intermediário: {current['medium']:3d} / {target['medium']:3d} (faltam {needed['medium']})")
    print(f"   Difícil:      {current['hard']:3d} / {target['hard']:3d} (faltam {needed['hard']})")
    print(f"   Total:        {current['total']:3d} / {target['total']:3d}")
    
    total_needed = sum(needed.values())
    
    if total_needed == 0:
        print(f"\n✅ Certificação já está balanceada!")
        return True
    
    print(f"\n🎯 Necessário gerar: {total_needed} questões")
    
    # Confirma com usuário
    response = input(f"\n❓ Deseja gerar {total_needed} questões para {cert_id.upper()}? (s/n): ")
    if response.lower() != 's':
        print("❌ Operação cancelada pelo usuário")
        return False
    
    # Gera questões por nível
    all_new_questions = []
    
    for difficulty, quantity in needed.items():
        if quantity > 0:
            questions = generate_questions_for_level(cert_id, difficulty, quantity)
            all_new_questions.extend(questions)
    
    # Salva questões
    if all_new_questions:
        save_questions(cert_id, all_new_questions)
        
        # Exibe resumo final
        final_dist = analyze_current_distribution(cert_id)
        print(f"\n{'='*70}")
        print(f"✅ CONCLUÍDO: {cert_id.upper()}")
        print(f"{'='*70}")
        print(f"   Fácil:        {final_dist['easy']}")
        print(f"   Intermediário: {final_dist['medium']}")
        print(f"   Difícil:      {final_dist['hard']}")
        print(f"   Total:        {final_dist['total']}")
        
        return True
    else:
        print(f"\n❌ Nenhuma questão foi gerada")
        return False


def main():
    """
    Função principal.
    """
    print("\n" + "="*70)
    print("🤖 GERADOR AUTOMÁTICO DE QUESTÕES AWS")
    print("   Balanceamento de Níveis de Dificuldade")
    print("="*70)
    
    # Verifica argumentos
    if len(sys.argv) < 2:
        print("\n❌ Uso incorreto!")
        print("\nExemplos:")
        print("   python scripts_python/auto_generate_questions.py clf-c02")
        print("   python scripts_python/auto_generate_questions.py all")
        print("   python scripts_python/auto_generate_questions.py --balance-all")
        sys.exit(1)
    
    arg = sys.argv[1].lower()
    
    # Define certificações a processar
    if arg == "all" or arg == "--balance-all":
        cert_ids = list(TARGET_DISTRIBUTION.keys())
    else:
        cert_ids = [arg]
    
    # Processa cada certificação
    success_count = 0
    for cert_id in cert_ids:
        if balance_certification(cert_id):
            success_count += 1
    
    # Resumo final
    print(f"\n{'='*70}")
    print(f"✅ RESUMO FINAL")
    print(f"{'='*70}")
    print(f"   Certificações processadas: {success_count}/{len(cert_ids)}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
