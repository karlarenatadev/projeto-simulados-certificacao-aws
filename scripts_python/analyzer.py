import json
import pandas as pd
import os

# Pega o caminho da pasta onde este script está e sobe um nível para achar a raiz do projeto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_DATA = os.path.join(BASE_DIR, "data")

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
    
    # Percorre todos os arquivos da pasta 'data' automaticamente
    for arquivo in sorted(os.listdir(PASTA_DATA)):
        if arquivo.endswith(".json") and "backup" not in arquivo:
            caminho_completo = os.path.join(PASTA_DATA, arquivo)
            total_geral += gerar_relatorio(caminho_completo)
            
    print("=" * 45)
    print(f"🏆 TOTAL GERAL NO BANCO: {total_geral} QUESTÕES")
    print("=" * 45)