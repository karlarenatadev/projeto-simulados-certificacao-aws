#!/usr/bin/env python3
"""
Script de Tradução Profissional PT-BR -> EN-US para Questões AWS
Usa Google Translate (gratuito via deep-translator) para tradução completa
mantendo integridade estrutural e termos técnicos AWS.

INSTALAÇÃO:
    pip install deep-translator

USO:
    python translate_with_api.py clf-c02
    python translate_with_api.py all
"""

import json
import sys
import re
import time
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
        
        # Pequeno delay para evitar rate limiting
        time.sleep(0.1)
        
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
    
    # Mantém campos intactos: domain, subdomain, service, difficulty, type, tags, correct
    
    return translated


def process_file(cert_id):
    """
    Processa um arquivo de certificação específico.
    """
    if not TRANSLATOR_AVAILABLE:
        print(f"\n❌ Não é possível traduzir sem a biblioteca 'deep-translator'")
        print(f"   Instale com: pip install deep-translator")
        return False
    
    input_file = f"data/{cert_id}.json"
    output_file = f"data/{cert_id}-en.json"
    
    print(f"\n{'='*70}")
    print(f"📁 Processando: {cert_id.upper()}")
    print(f"{'='*70}")
    print(f"   Entrada:  {input_file}")
    print(f"   Saída:    {output_file}")
    
    try:
        # Inicializa o tradutor
        translator = GoogleTranslator(source='pt', target='en')
        
        # Lê o arquivo original
        with open(input_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        print(f"   ✅ Carregado: {len(questions)} questões")
        print(f"   🔄 Iniciando tradução (isso pode levar alguns minutos)...")
        
        # Traduz cada questão
        translated_questions = []
        for i, q in enumerate(questions, 1):
            print(f"   🔄 Traduzindo questão {i}/{len(questions)}...", end='\r')
            translated_q = translate_question_obj(q, translator)
            translated_questions.append(translated_q)
        
        print(f"\n   ✅ Tradução concluída: {len(translated_questions)} questões")
        
        # Salva o arquivo traduzido
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(translated_questions, f, ensure_ascii=False, indent=2)
        
        print(f"   💾 Arquivo salvo: {output_file}")
        print(f"   ✅ SUCESSO!")
        
        return True
        
    except FileNotFoundError:
        print(f"   ❌ ERRO: Arquivo não encontrado: {input_file}")
        return False
    except json.JSONDecodeError as e:
        print(f"   ❌ ERRO: JSON inválido: {e}")
        return False
    except Exception as e:
        print(f"   ❌ ERRO: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """
    Função principal.
    """
    print("\n" + "="*70)
    print("🌐 TRADUTOR PROFISSIONAL DE QUESTÕES AWS")
    print("   PT-BR -> EN-US (Google Translate)")
    print("="*70)
    
    if not TRANSLATOR_AVAILABLE:
        print("\n❌ ERRO: Biblioteca 'deep-translator' não instalada")
        print("\n📦 Para instalar, execute:")
        print("   pip install deep-translator")
        print("\nOu se estiver usando requirements.txt:")
        print("   pip install -r scripts_python/requirements.txt")
        sys.exit(1)
    
    # Define quais arquivos processar
    cert_ids = []
    
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg == "all":
            cert_ids = ["clf-c02", "saa-c03", "dva-c02", "aif-c01"]
        else:
            cert_ids = [arg]
    else:
        # Padrão: apenas CLF-C02
        cert_ids = ["clf-c02"]
    
    print(f"\n📋 Arquivos a processar: {', '.join([c.upper() for c in cert_ids])}")
    
    # Processa cada arquivo
    success_count = 0
    for cert_id in cert_ids:
        if process_file(cert_id):
            success_count += 1
    
    # Resumo final
    print(f"\n{'='*70}")
    print(f"✅ CONCLUÍDO: {success_count}/{len(cert_ids)} arquivos traduzidos")
    print(f"{'='*70}")
    
    if success_count < len(cert_ids):
        print("\n⚠️  Alguns arquivos falharam. Verifique os erros acima.")
    
    print("\n💡 Tradução realizada com Google Translate (gratuito)")
    print("   Termos técnicos AWS preservados automaticamente")
    print()


if __name__ == "__main__":
    main()
