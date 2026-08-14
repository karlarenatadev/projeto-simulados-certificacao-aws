import json
import pandas as pd
import os
from pathlib import Path

# Pega o caminho da pasta onde este script está e sobe um nível para achar a raiz do projeto
BASE_DIR = Path(__file__).resolve().parents[3]
PASTA_DATA = BASE_DIR / "data" / "questions"

def gerar_relatorio(caminho_arquivo):
    nome_arquivo = os.path.basename(caminho_arquivo)
    
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        try:
            dados = json.load(f)
            if not dados:
                print(f"📭 {nome_arquivo}: O arquivo está vazio.")
                return 0
        except json.JSONDecodeError:
            print(f"❌ Erro: {nome_arquivo} contém um JSON inválido.")
            return 0
            
    df = pd.DataFrame(dados)
    total_questoes = len(df)
    
    print(f"\n📊 AUDITORIA TÉCNICA: {nome_arquivo.upper()}")
    print("-" * 45)
    print(f"Total de Questões: {total_questoes}")
    
    # Verifica se as colunas novas já existem no JSON
    if 'difficulty' in df.columns:
        print("\n✅ DISTRIBUIÇÃO POR NÍVEL:")
        print(df['difficulty'].value_counts().to_string())
    
    if 'service' in df.columns:
        print("\n☁️ COBERTURA DE SERVIÇOS (TOP 5):")
        print(df['service'].value_counts().head(5).to_string())
    
    print("-" * 45)
    return total_questoes

if __name__ == "__main__":
    total_geral = 0
    
    print("\n🚀 INICIANDO CONTAGEM DO BANCO DE DADOS...")
    
    # Percorre apenas o banco oficial de questoes.
    if not PASTA_DATA.exists():
        print(f"Aviso: pasta de dados nao encontrada: {PASTA_DATA}")
    elif not PASTA_DATA.is_dir():
        print(f"Erro: o caminho de dados existe, mas nao e uma pasta: {PASTA_DATA}")
    else:
        for caminho_completo in sorted(PASTA_DATA.glob("*.json")):
            if "backup" not in caminho_completo.name:
                total_geral += gerar_relatorio(caminho_completo)
            
    print("=" * 45)
    print(f"🏆 TOTAL GERAL NO BANCO: {total_geral} QUESTÕES")
    print("=" * 45)
