import json
import os
import time
import shutil
from generator import fabricar_questoes, BASE_DIR, EXAMES_CONFIG
from sanity_check import filter_valid_schema
from aws_semantic_validator import validate_semantics
from duplicate_detector import remove_duplicates

def executar_pipeline_etl(exame_id: str, nivel: str, qtd: int, dry_run: bool = False):
    print(f"\n=== INICIANDO PIPELINE DE DADOS PARA {exame_id.upper()} ===")
    caminho_json = os.path.join(BASE_DIR, "data", "questions", f"{exame_id}.json")
    
    # Carrega banco existente para verificar duplicatas
    banco_existente = []
    if os.path.exists(caminho_json):
        with open(caminho_json, 'r', encoding='utf-8') as f:
            banco_existente = json.load(f)
            
    ultimo_id = max([q.get('id', 1000) for q in banco_existente]) if banco_existente else 1000

    # ETAPA 1: Extract (Gerar com IA)
    print("\n[Etapa 1/4] Gerando conteúdo bruto com LLM...")
    raw_questions = fabricar_questoes(exame_id, nivel, qtd)
    if not raw_questions:
        return

    # ETAPA 2: Transform - Schema Validation
    print(f"\n[Etapa 2/4] Validando Schema de {len(raw_questions)} questões...")
    schema_valid_questions = filter_valid_schema(raw_questions)

    # ETAPA 3: Transform - Semantic Validation
    print(f"\n[Etapa 3/4] Validando Semântica e Lógica AWS para {exame_id.upper()}...")
    semantic_valid_questions = validate_semantics(schema_valid_questions, exame_id) 

    # ETAPA 4: Transform - Deduplication
    print(f"\n[Etapa 4/4] Buscando e removendo duplicatas no dataset...")
    final_questions = remove_duplicates(semantic_valid_questions, banco_existente)

    # ETAPA 5: Load (Salvar no Banco)
    if final_questions:
        print(f"\n💾 Salvando {len(final_questions)} novas questões aprovadas...")
        for q in final_questions:
            ultimo_id += 1
            q['id'] = ultimo_id
            banco_existente.append(q)
            
        if dry_run:
            print(f"🔍 DRY-RUN: seriam gravadas {len(final_questions)} questões em {caminho_json}")
            return

        backup_dir = os.path.join(BASE_DIR, "data", "backups")
        os.makedirs(backup_dir, exist_ok=True)
        shutil.copy2(caminho_json, os.path.join(backup_dir, f"{exame_id}_pipeline_backup.json"))
        with open(caminho_json, 'w', encoding='utf-8') as f:
            json.dump(banco_existente, f, indent=2, ensure_ascii=False)
        print("✅ Pipeline executado com sucesso!")
    else:
        print("\n❌ Nenhuma questão sobreviveu aos filtros de qualidade do Pipeline.")

if __name__ == "__main__":
    print("🚀 Iniciando a máquina de geração em lote para TODAS as certificações...")
    
    # Pega a lista de exames automaticamente do seu config (clf-c02, saa-c03, aif-c01, dva-c02)
    exames_ativos = list(EXAMES_CONFIG.keys())
    
    # Configurações do lote
    nivel_desejado = "medium" # Pode trocar para 'hard' ou 'easy' quando quiser
    qtd_por_exame = 2 # Mantendo em 2 por vez para proteger a cota da API
    
    dry_run = "--dry-run" in os.sys.argv
    for exame in exames_ativos:
        print(f"\n{'-'*50}")
        print(f"🎯 Iniciando processamento para: {exame.upper()}")
        print(f"{'-'*50}")
        
        executar_pipeline_etl(exame, nivel_desejado, qtd_por_exame, dry_run=dry_run)
        
        # Pausa de segurança para não tomar bloqueio (Rate Limit) do Gemini
        print("\n⏳ Pausando por 15 segundos para esfriar a API do Google...")
        time.sleep(15)
        
    print("\n🎉 GERAÇÃO EM LOTE FINALIZADA! Todos os bancos foram atualizados.")
