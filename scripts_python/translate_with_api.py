#!/usr/bin/env python3
"""
Script de Tradução Profissional PT-BR -> EN-US para Questões AWS
Usa Google Translate (gratuito via deep-translator) para tradução completa
mantendo integridade estrutural e termos técnicos AWS.

INSTALAÇÃO:
    pip install deep-translator

USO:
    python scripts_python/translate_with_api.py clf-c02
    python scripts_python/translate_with_api.py all
"""

import json
import sys
import re
import time
import os
from pathlib import Path

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False
    print("⚠️  AVISO: Biblioteca 'deep-translator' não encontrada.")
    print("   Instale com: pip install deep-translator")
    print()

# Termos técnicos AWS que NÃO devem ser traduzidos
AWS_TECHNICAL_TERMS = [
    "AWS", "Amazon", "EC2", "S3", "RDS", "Lambda", "VPC", "IAM", "CloudFront",
    "Route 53", "EBS", "EFS", "DynamoDB", "CloudWatch", "SNS", "SQS", "ECS",
    "EKS", "Fargate", "Auto Scaling", "Elastic Load Balancing", "CloudFormation",
    "Elastic Beanstalk", "Systems Manager", "Secrets Manager", "KMS", "WAF",
    "Shield", "GuardDuty", "Inspector", "Macie", "Config", "CloudTrail",
    "Trusted Advisor", "Cost Explorer", "Budgets", "Organizations", "Control Tower",
    "Service Catalog", "Redshift", "Aurora", "Neptune", "ElastiCache", "Kinesis",
    "Glue", "Athena", "EMR", "SageMaker", "Rekognition", "Comprehend", "Polly",
    "Transcribe", "Translate", "Lex", "Connect", "WorkSpaces", "AppStream",
    "Direct Connect", "VPN", "Transit Gateway", "API Gateway", "Step Functions",
    "EventBridge", "Backup", "Storage Gateway", "DataSync", "Snow Family",
    "Snowball", "Snowmobile", "Security Group", "S3 Bucket", "IAM Role",
    "On-Demand", "Reserved Instance", "Spot Instance", "Savings Plan",
    "CapEx", "OpEx", "SQL", "NoSQL", "DDoS", "XSS", "HTML", "CSS", "JavaScript",
]

def protect_aws_terms(text):
    """
    Substitui termos técnicos AWS por placeholders antes da tradução.
    """
    placeholders = {}
    protected_text = text
    
    for i, term in enumerate(AWS_TECHNICAL_TERMS):
        if term in text:
            placeholder = f"__AWS_TERM_{i}__"
            placeholders[placeholder] = term
            protected_text = protected_text.replace(term, placeholder)
    
    return protected_text, placeholders

def restore_aws_terms(text, placeholders):
    """
    Restaura os termos técnicos AWS após a tradução.
    """
    restored_text = text
    for placeholder, term in placeholders.items():
        restored_text = restored_text.replace(placeholder, term)
    return restored_text

def translate_text(text, translator):
    """
    Traduz texto de PT-BR para EN-US preservando termos técnicos.
    """
    if not text or not isinstance(text, str):
        return text
    
    if not TRANSLATOR_AVAILABLE:
        return text
    
    try:
        # Protege termos técnicos
        protected_text, placeholders = protect_aws_terms(text)
        
        # Traduz o texto
        translated = translator.translate(protected_text)
        
        # Restaura termos técnicos
        final_text = restore_aws_terms(translated, placeholders)
        
        # Delay seguro para evitar bloqueio do Google Translate
        time.sleep(1)
        
        return final_text
        
    except Exception as e:
        print(f"\n   ⚠️  Erro na tradução: {e}")
        print(f"   Retornando texto original...")
        return text

def translate_question_obj(question, translator):
    """
    Traduz um objeto de questão completo.
    """
    translated = question.copy()
    
    # Traduz a pergunta
    if "question" in translated:
        translated["question"] = translate_text(translated["question"], translator)
    
    # Traduz as opções
    if "options" in translated and isinstance(translated["options"], list):
        translated["options"] = [
            translate_text(opt, translator) for opt in translated["options"]
        ]
    
    # Traduz a explicação
    if "explanation" in translated:
        translated["explanation"] = translate_text(translated["explanation"], translator)
    
    return translated

def process_file(input_file, output_file, task_name):
    """
    Processa um arquivo JSON específico de forma incremental.
    """
    if not TRANSLATOR_AVAILABLE:
        print(f"\n❌ Não é possível traduzir sem a biblioteca 'deep-translator'")
        return False
    
    print(f"\n{'='*70}")
    print(f"📁 Processando: {task_name}")
    print(f"   Origem:  {input_file}")
    print(f"   Destino: {output_file}")
    print(f"{'='*70}")
    
    try:
        translator = GoogleTranslator(source='pt', target='en')
        
        # 1. Lê o arquivo original (PT-BR)
        with open(input_file, 'r', encoding='utf-8') as f:
            questions_pt = json.load(f)
            
        # 2. Lê o arquivo já traduzido (EN-US) e mapeia
        existing_en = []
        translated_map_by_id = {}
        
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                try:
                    existing_en = json.load(f)
                    for q in existing_en:
                        if 'id' in q:
                            translated_map_by_id[q['id']] = q
                except json.JSONDecodeError:
                    print(f"   ⚠️ Aviso: Arquivo {output_file} corrompido. Traduzindo do zero.")
        
        print(f"   ✅ Carregado: {len(questions_pt)} questões em PT-BR.")
        if len(existing_en) > 0:
            print(f"   ✅ Encontradas: {len(existing_en)} questões no arquivo EN-US existente.")
            
        print(f"   🔄 Iniciando verificação/tradução...")
        
        translated_questions = []
        novas_traducoes = 0
        used_en_indices = set()
        
        # 3. Processa cada questão
        for i, q in enumerate(questions_pt):
            q_id = q.get('id')
            
            # ESTRATÉGIA 1: Match por ID explícito
            if q_id and q_id in translated_map_by_id:
                translated_questions.append(translated_map_by_id[q_id])
                print(f"   ⏭️ Pulando {i+1}/{len(questions_pt)} (ID detectado) - Já traduzida.     ", end='\r')
                continue
                
            # ESTRATÉGIA 2: Match posicional com verificação de metadados (Fallback)
            matched = False
            if i < len(existing_en) and i not in used_en_indices:
                en_q = existing_en[i]
                
                # Coleta metadados estruturais para garantir que é a mesma questão
                pt_meta = (q.get('service'), q.get('difficulty'), q.get('correct'), len(q.get('options', [])))
                en_meta = (en_q.get('service'), en_q.get('difficulty'), en_q.get('correct'), len(en_q.get('options', [])))
                
                if pt_meta == en_meta:
                    # Se PT-BR recebeu um ID recentemente, garante que a cópia em inglês o herde
                    en_q_copy = en_q.copy()
                    if q_id:
                        en_q_copy['id'] = q_id
                        
                    translated_questions.append(en_q_copy)
                    used_en_indices.add(i)
                    matched = True
                    print(f"   ⏭️ Pulando {i+1}/{len(questions_pt)} (Match de Posição) - Já traduzida. ", end='\r')
            
            if matched:
                continue

            # 4. Se não achou por ID nem por Posição, invoca a API para traduzir!
            print(f"   🔄 Traduzindo nova questão {i+1}/{len(questions_pt)}...{' '*20}", end='\r')
            translated_q = translate_question_obj(q, translator)
            translated_questions.append(translated_q)
            novas_traducoes += 1
                
        print(f"\n   ✅ Processo concluído: {novas_traducoes} novas questões traduzidas.")
        
        # Salva o arquivo traduzido consolidado
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(translated_questions, f, ensure_ascii=False, indent=2)
        
        print(f"   💾 Arquivo salvo: {output_file}")
        return True
        
    except FileNotFoundError:
        print(f"   ❌ ERRO: Arquivo não encontrado: {input_file}")
        return False
    except Exception as e:
        print(f"   ❌ ERRO: {e}")
        return False

def main():
    print("\n" + "="*70)
    print("🌐 TRADUTOR PROFISSIONAL DE QUESTÕES AWS (INCREMENTAL)")
    print("   PT-BR -> EN-US (Google Translate)")
    print("="*70)
    
    if not TRANSLATOR_AVAILABLE:
        print("\n❌ ERRO: Biblioteca 'deep-translator' não instalada")
        sys.exit(1)

    cert_ids = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"]
    
    # Se o utilizador passar um argumento específico (ex: saa-c03), processa só esse
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg != "all":
            cert_ids = [arg]
            
    # Cria a lista de tarefas (arquivos principais e de nivelamento)
    tasks = []
    for cert in cert_ids:
        # Arquivos principais
        tasks.append({
            "in_file": f"data/{cert}.json",
            "out_file": f"data/{cert}-en.json",
            "name": f"{cert.upper()} (Principal)"
        })
        # Arquivos de nivelamento
        tasks.append({
            "in_file": f"data/nivelamento/diagnostic-{cert}.json",
            "out_file": f"data/nivelamento/diagnostic-{cert}-en.json",
            "name": f"{cert.upper()} (Nivelamento/Diagnóstico)"
        })
    
    success_count = 0
    for task in tasks:
        # Só processa se o arquivo original existir para evitar erros sujos na tela
        if os.path.exists(task["in_file"]):
            if process_file(task["in_file"], task["out_file"], task["name"]):
                success_count += 1
        else:
            print(f"\n⚠️ Pulando {task['name']}: Arquivo de origem não encontrado ({task['in_file']})")
            
    print(f"\n{'='*70}")
    print(f"✅ CONCLUÍDO: {success_count} arquivos atualizados")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    main()