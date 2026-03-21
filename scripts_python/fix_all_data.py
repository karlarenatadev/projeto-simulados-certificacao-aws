import json
import os

# 1. CONFIGURAÇÃO DE CAMINHOS
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_DATA = os.path.join(BASE_DIR, "data")

# 2. MAPEAMENTO OFICIAL DE DOMÍNIOS POR EXAME
EXAMES_CONFIG = {
    "clf-c02": ["conceitos-cloud", "seguranca", "tecnologia", "faturamento"],
    "saa-c03": ["design-resiliente", "design-performance", "seguranca-aplicacoes", "design-custo"],
    "aif-c01": ["fundamentals-ai-ml", "fundamentals-genai", "applications-foundation-models", "guidelines-responsible-ai", "security-compliance-governance"],
    "dva-c02": ["desenvolvimento-servicos", "implementacao", "seguranca-app", "resolucao-problemas"]
}

# Dicionário para traduzir domínios errados (como os de IA que caíram no SAA)
TRADUCAO_DOMINIOS = {
    "amazon-bedrock": "design-performance",
    "prompt-engineering": "design-performance",
    "fundamentos-ia": "conceitos-ia",
    # Mapeamento de migração para AIF-C01 (domínios antigos → novos)
    "conceitos-ia": "fundamentals-ai-ml",
    "ia-generativa": "fundamentals-genai",
    "implementacao-ia": "applications-foundation-models",
    "seguranca-ia": "security-compliance-governance"
}

def curar_tudo():
    print("🚀 Iniciando a Grande Cura dos Dados...")
    
    for id_exame, dominios_validos in EXAMES_CONFIG.items():
        caminho = os.path.join(PASTA_DATA, f"{id_exame}.json")
        
        if not os.path.exists(caminho):
            print(f"⚠️  Arquivo {id_exame}.json não encontrado. Pulando...")
            continue
            
        print(f"📦 Processando {id_exame}...")
        
        with open(caminho, 'r', encoding='utf-8') as f:
            try:
                dados = json.load(f)
            except json.JSONDecodeError:
                print(f"❌ Erro ao ler {id_exame}.json. O arquivo pode estar corrompido.")
                continue

        corrigidas = 0
        for item in dados:
            # --- CORREÇÃO 1: Campos Faltantes ---
            if 'subdomain' not in item: item['subdomain'] = "geral"
            if 'service' not in item: item['service'] = "AWS"
            if 'tags' not in item: item['tags'] = ["ajuste-automatico"]
            if 'type' not in item: item['type'] = "scenario"
            
            # --- CORREÇÃO 2: Domínios Inválidos ---
            dom_atual = item['domain'].lower().strip()
            
            # Se o domínio não estiver na lista permitida para este exame específico
            if dom_atual not in dominios_validos:
                # Tenta traduzir se soubermos o que é, senão coloca o primeiro da lista
                novo_dom = TRADUCAO_DOMINIOS.get(dom_atual, dominios_validos[0])
                item['domain'] = novo_dom
            else:
                item['domain'] = dom_atual # Apenas normaliza o texto

            corrigidas += 1

        # Salva o arquivo limpo
        with open(caminho, 'w', encoding='utf-8') as f:
            json.dump(dados, f, indent=2, ensure_ascii=False)
            
        print(f"   ✅ {corrigidas} questões verificadas/curadas em {id_exame}.json")

    print("\n✨ Todos os bancos de dados estão agora em conformidade com o Pydantic!")

if __name__ == "__main__":
    curar_tudo()