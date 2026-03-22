#!/usr/bin/env python3
"""
Script Rápido de Geração de Questões AWS
Gera questões sem confirmação para testes rápidos.

USO:
    python scripts_python/quick_generate.py clf-c02 easy 10
    python scripts_python/quick_generate.py saa-c03 hard 5
"""

import json
import sys
from generator import fabricar_questoes


def quick_generate(cert_id, difficulty, quantity):
    """
    Gera questões rapidamente e adiciona ao arquivo.
    """
    print(f"\n{'='*70}")
    print(f"⚡ GERAÇÃO RÁPIDA")
    print(f"{'='*70}")
    print(f"   Certificação: {cert_id.upper()}")
    print(f"   Dificuldade:  {difficulty}")
    print(f"   Quantidade:   {quantity}")
    print(f"{'='*70}\n")
    
    # Gera questões
    print(f"🤖 Gerando questões com IA...")
    questions = fabricar_questoes(cert_id, difficulty, quantity)
    
    if not questions:
        print(f"❌ Falha ao gerar questões")
        return False
    
    print(f"✅ Geradas: {len(questions)} questões")
    
    # Carrega arquivo existente
    file_path = f"data/{cert_id}.json"
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            existing = json.load(f)
    except FileNotFoundError:
        existing = []
    
    # Adiciona novas questões
    existing.extend(questions)
    
    # Salva
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    
    print(f"💾 Salvo em: {file_path}")
    print(f"📊 Total de questões no arquivo: {len(existing)}")
    
    # Mostra distribuição
    from collections import Counter
    dist = Counter(q.get('difficulty') for q in existing)
    print(f"\n📈 Distribuição atual:")
    print(f"   Fácil:        {dist.get('easy', 0)}")
    print(f"   Intermediário: {dist.get('medium', 0)}")
    print(f"   Difícil:      {dist.get('hard', 0)}")
    print(f"   Total:        {len(existing)}")
    
    return True


def main():
    if len(sys.argv) != 4:
        print("\n❌ Uso incorreto!")
        print("\nFormato:")
        print("   python scripts_python/quick_generate.py <cert_id> <difficulty> <quantity>")
        print("\nExemplos:")
        print("   python scripts_python/quick_generate.py clf-c02 easy 10")
        print("   python scripts_python/quick_generate.py saa-c03 hard 5")
        print("   python scripts_python/quick_generate.py dva-c02 medium 15")
        print("\nDificuldades válidas: easy, medium, hard")
        sys.exit(1)
    
    cert_id = sys.argv[1].lower()
    difficulty = sys.argv[2].lower()
    quantity = int(sys.argv[3])
    
    if difficulty not in ['easy', 'medium', 'hard']:
        print(f"❌ Dificuldade inválida: {difficulty}")
        print("   Use: easy, medium ou hard")
        sys.exit(1)
    
    if quantity < 1 or quantity > 50:
        print(f"❌ Quantidade inválida: {quantity}")
        print("   Use um valor entre 1 e 50")
        sys.exit(1)
    
    success = quick_generate(cert_id, difficulty, quantity)
    
    if success:
        print(f"\n✅ Geração concluída com sucesso!\n")
    else:
        print(f"\n❌ Falha na geração\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
