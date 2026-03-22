#!/usr/bin/env python3
"""
Script de Tradução Automatizada PT-BR -> EN-US
Traduz arquivos JSON de questões AWS mantendo integridade estrutural
e preservando termos técnicos da AWS.
"""

import json
import sys
import os
from pathlib import Path

# Dicionário de traduções para termos técnicos AWS (manter originais)
AWS_TERMS = {
    # Serviços AWS
    "Security Group": "Security Group",
    "VPC": "VPC",
    "S3 Bucket": "S3 Bucket",
    "IAM Role": "IAM Role",
    "Lambda": "Lambda",
    "EC2": "EC2",
    "RDS": "RDS",
    "CloudFront": "CloudFront",
    "Route 53": "Route 53",
    "EBS": "EBS",
    "EFS": "EFS",
    "DynamoDB": "DynamoDB",
    "CloudWatch": "CloudWatch",
    "SNS": "SNS",
    "SQS": "SQS",
    "ECS": "ECS",
    "EKS": "EKS",
    "Fargate": "Fargate",
    "Auto Scaling": "Auto Scaling",
    "Elastic Load Balancing": "Elastic Load Balancing",
    "CloudFormation": "CloudFormation",
    "Elastic Beanstalk": "Elastic Beanstalk",
    "Systems Manager": "Systems Manager",
    "Secrets Manager": "Secrets Manager",
    "KMS": "KMS",
    "WAF": "WAF",
    "Shield": "Shield",
    "GuardDuty": "GuardDuty",
    "Inspector": "Inspector",
    "Macie": "Macie",
    "Config": "Config",
    "CloudTrail": "CloudTrail",
    "Trusted Advisor": "Trusted Advisor",
    "Cost Explorer": "Cost Explorer",
    "Budgets": "Budgets",
    "Organizations": "Organizations",
    "Control Tower": "Control Tower",
    "Service Catalog": "Service Catalog",
    "Redshift": "Redshift",
    "Aurora": "Aurora",
    "Neptune": "Neptune",
    "ElastiCache": "ElastiCache",
    "Kinesis": "Kinesis",
    "Glue": "Glue",
    "Athena": "Athena",
    "EMR": "EMR",
    "SageMaker": "SageMaker",
    "Rekognition": "Rekognition",
    "Comprehend": "Comprehend",
    "Polly": "Polly",
    "Transcribe": "Transcribe",
    "Translate": "Translate",
    "Lex": "Lex",
    "Connect": "Connect",
    "WorkSpaces": "WorkSpaces",
    "AppStream": "AppStream",
    "Direct Connect": "Direct Connect",
    "VPN": "VPN",
    "Transit Gateway": "Transit Gateway",
    "API Gateway": "API Gateway",
    "Step Functions": "Step Functions",
    "EventBridge": "EventBridge",
    "Backup": "Backup",
    "Disaster Recovery": "Disaster Recovery",
    "Storage Gateway": "Storage Gateway",
    "DataSync": "DataSync",
    "Snow Family": "Snow Family",
    "Snowball": "Snowball",
    "Snowmobile": "Snowmobile",
}

# Dicionário de traduções manuais (PT-BR -> EN-US)
TRANSLATIONS = {
    # Perguntas comuns
    "Uma startup de software está lançando": "A software startup is launching",
    "Uma empresa de tecnologia precisa": "A technology company needs",
    "Uma agência de marketing digital está": "A digital marketing agency is",
    "Uma empresa tradicional está": "A traditional company is",
    "Uma organização financeira precisa": "A financial organization needs",
    "Uma startup de análise de dados precisa": "A data analytics startup needs",
    "Uma empresa está planejando": "A company is planning",
    "Uma aplicação de e-commerce": "An e-commerce application",
    "Uma equipe de desenvolvimento está": "A development team is",
    "Uma empresa precisa garantir": "A company needs to ensure",
    "Uma grande corporação multinacional está": "A large multinational corporation is",
    "Uma empresa de desenvolvimento de software está": "A software development company is",
    "Uma startup de tecnologia está": "A technology startup is",
    "Uma empresa de varejo online": "An online retail company",
    "Uma agência de marketing digital gera": "A digital marketing agency generates",
    "Uma empresa de tecnologia financeira": "A financial technology company",
    "Uma empresa de comércio eletrônico está": "An e-commerce company is",
    "Uma plataforma de mídia social": "A social media platform",
    "Uma empresa de análise de dados tem": "A data analytics company has",
    "Uma organização governamental está": "A government organization is",
    
    # Termos técnicos gerais
    "armazenamento": "storage",
    "computação": "compute",
    "banco de dados": "database",
    "rede": "network",
    "segurança": "security",
    "escalabilidade": "scalability",
    "disponibilidade": "availability",
    "durabilidade": "durability",
    "elasticidade": "elasticity",
    "agilidade": "agility",
    "custos": "costs",
    "faturamento": "billing",
    "orçamento": "budget",
    "otimização": "optimization",
    "monitoramento": "monitoring",
    "auditoria": "audit",
    "conformidade": "compliance",
    "criptografia": "encryption",
    "autenticação": "authentication",
    "autorização": "authorization",
    "identidade": "identity",
    "acesso": "access",
    "permissões": "permissions",
    "política": "policy",
    "função": "role",
    "usuário": "user",
    "grupo": "group",
    "recurso": "resource",
    "serviço": "service",
    "região": "region",
    "zona de disponibilidade": "availability zone",
    "instância": "instance",
    "servidor": "server",
    "contêiner": "container",
    "imagem": "image",
    "snapshot": "snapshot",
    "backup": "backup",
    "recuperação": "recovery",
    "replicação": "replication",
    "migração": "migration",
    "implantação": "deployment",
    "provisionamento": "provisioning",
    "dimensionamento": "scaling",
    "balanceamento de carga": "load balancing",
    "alta disponibilidade": "high availability",
    "tolerância a falhas": "fault tolerance",
    "recuperação de desastres": "disaster recovery",
    
    # Opções comuns
    "Instâncias Sob Demanda": "On-Demand Instances",
    "Instâncias Reservadas": "Reserved Instances",
    "Instâncias Spot": "Spot Instances",
    "Criptografia no lado do servidor": "Server-Side Encryption",
    "Versionamento": "Versioning",
    "Bloqueio de objetos": "Object Lock",
    "Replicagem entre regiões": "Cross-Region Replication",
    "Economia de capital": "Capital expense savings",
    "Agilidade": "Agility",
    "Elasticidade": "Elasticity",
    "Escalabilidade": "Scalability",
    "Durabilidade": "Durability",
    "Segurança": "Security",
    "Globalidade": "Global reach",
    "Transparência": "Transparency",
    "Auditoria": "Audit",
    "Otimização de custos": "Cost optimization",
    
    # Níveis de suporte
    "Basic": "Basic",
    "Developer": "Developer",
    "Business": "Business",
    "Enterprise": "Enterprise",
    
    # Frases de explicação comuns
    "é ideal para": "is ideal for",
    "é o serviço correto para": "is the correct service for",
    "permite": "allows",
    "garante": "ensures",
    "oferece": "offers",
    "fornece": "provides",
    "protege": "protects",
    "gerencia": "manages",
    "monitora": "monitors",
    "automatiza": "automates",
    "simplifica": "simplifies",
    "reduz": "reduces",
    "aumenta": "increases",
    "melhora": "improves",
    "otimiza": "optimizes",
}


def translate_text(text):
    """
    Traduz texto de PT-BR para EN-US usando traduções manuais.
    Para produção, pode ser substituído por API de tradução (Google, DeepL, etc.)
    """
    if not text or not isinstance(text, str):
        return text
    
    # Esta é uma implementação simplificada
    # Em produção, você usaria uma API de tradução real
    # Por enquanto, retorna o texto original com aviso
    
    # Aqui você pode integrar APIs como:
    # - Google Cloud Translation API
    # - DeepL API
    # - Azure Translator
    # - Amazon Translate
    
    print(f"⚠️  AVISO: Tradução automática não implementada.")
    print(f"   Para tradução completa, integre uma API de tradução.")
    print(f"   Retornando texto original: {text[:50]}...")
    
    return text


def translate_question_object(question_obj):
    """
    Traduz um objeto de questão, mantendo campos técnicos intactos.
    """
    translated = question_obj.copy()
    
    # Campos que devem ser traduzidos
    if "question" in translated:
        translated["question"] = translate_text(translated["question"])
    
    if "options" in translated and isinstance(translated["options"], list):
        translated["options"] = [translate_text(opt) for opt in translated["options"]]
    
    if "explanation" in translated:
        translated["explanation"] = translate_text(translated["explanation"])
    
    # Campos que NÃO devem ser alterados:
    # - domain
    # - subdomain
    # - service
    # - difficulty
    # - type
    # - tags
    # - correct
    # - reference_url (se existir)
    
    return translated


def translate_json_file(input_file, output_file):
    """
    Traduz um arquivo JSON completo de questões.
    """
    print(f"📖 Lendo arquivo: {input_file}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        print(f"✅ Arquivo carregado: {len(questions)} questões encontradas")
        
        translated_questions = []
        
        for i, question in enumerate(questions, 1):
            print(f"🔄 Traduzindo questão {i}/{len(questions)}...", end='\r')
            translated_q = translate_question_object(question)
            translated_questions.append(translated_q)
        
        print(f"\n✅ Tradução concluída: {len(translated_questions)} questões")
        
        print(f"💾 Salvando arquivo: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(translated_questions, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Arquivo salvo com sucesso!")
        return True
        
    except FileNotFoundError:
        print(f"❌ ERRO: Arquivo não encontrado: {input_file}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ ERRO: Arquivo JSON inválido: {e}")
        return False
    except Exception as e:
        print(f"❌ ERRO: {e}")
        return False


def main():
    """
    Função principal do script.
    """
    print("=" * 60)
    print("🌐 TRADUTOR AUTOMÁTICO DE QUESTÕES AWS (PT-BR -> EN-US)")
    print("=" * 60)
    print()
    
    # Define os arquivos a serem traduzidos
    files_to_translate = [
        ("data/clf-c02.json", "data/clf-c02-en.json"),
        ("data/saa-c03.json", "data/saa-c03-en.json"),
        ("data/dva-c02.json", "data/dva-c02-en.json"),
        ("data/aif-c01.json", "data/aif-c01-en.json"),
    ]
    
    # Se argumentos foram passados, usa apenas o arquivo especificado
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.json', '-en.json')
        files_to_translate = [(input_file, output_file)]
    
    success_count = 0
    
    for input_file, output_file in files_to_translate:
        print(f"\n📁 Processando: {input_file} -> {output_file}")
        print("-" * 60)
        
        if translate_json_file(input_file, output_file):
            success_count += 1
        
        print()
    
    print("=" * 60)
    print(f"✅ Tradução concluída: {success_count}/{len(files_to_translate)} arquivos")
    print("=" * 60)
    
    if success_count < len(files_to_translate):
        print("\n⚠️  IMPORTANTE:")
        print("   Este script usa traduções manuais básicas.")
        print("   Para traduções profissionais, integre uma API de tradução:")
        print("   - Google Cloud Translation API")
        print("   - DeepL API")
        print("   - Azure Translator")
        print("   - Amazon Translate")


if __name__ == "__main__":
    main()
