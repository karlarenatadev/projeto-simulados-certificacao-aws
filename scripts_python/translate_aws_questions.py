#!/usr/bin/env python3
"""
Script de Tradução Inteligente PT-BR -> EN-US para Questões AWS
Usa o arquivo de backup em português e cria versões em inglês
mantendo integridade estrutural e termos técnicos AWS.

USO:
    python translate_aws_questions.py clf-c02
    python translate_aws_questions.py saa-c03
    python translate_aws_questions.py all
"""

import json
import sys
import re
from pathlib import Path

# Mapeamento de traduções contextuais
CONTEXT_TRANSLATIONS = {
    # Inícios de perguntas
    r"Uma startup de software está lançando": "A software startup is launching",
    r"Uma empresa de tecnologia precisa": "A technology company needs",
    r"Uma agência de marketing digital está": "A digital marketing agency is",
    r"Uma empresa tradicional está": "A traditional company is",
    r"Uma organização financeira precisa": "A financial organization needs",
    r"Uma startup de análise de dados precisa": "A data analytics startup needs",
    r"Uma empresa está planejando": "A company is planning",
    r"Uma aplicação de e-commerce": "An e-commerce application",
    r"Uma equipe de desenvolvimento está": "A development team is",
    r"Uma empresa precisa garantir": "A company needs to ensure",
    r"Uma grande corporação multinacional está": "A large multinational corporation is",
    r"Uma empresa de desenvolvimento de software está": "A software development company is",
    r"Uma startup de tecnologia está": "A technology startup is",
    r"Uma empresa de varejo online": "An online retail company",
    r"Uma agência de marketing digital gera": "A digital marketing agency generates",
    r"Uma empresa de tecnologia financeira": "A financial technology company",
    r"Uma empresa de comércio eletrônico está": "An e-commerce company is",
    r"Uma plataforma de mídia social": "A social media platform",
    r"Uma empresa de análise de dados tem": "A data analytics company has",
    r"Uma organização governamental está": "A government organization is",
    
    # Frases comuns em perguntas
    r"espera um crescimento de usuários imprevisível": "expects unpredictable user growth",
    r"precisam de um modelo de precificação": "need a pricing model",
    r"que lhes permita pagar apenas pelos recursos que consomem": "that allows them to pay only for the resources they consume",
    r"sem compromissos de longo prazo": "without long-term commitments",
    r"grandes investimentos iniciais": "large upfront investments",
    r"Qual modelo de preços da AWS": "Which AWS pricing model",
    r"seria mais adequado": "would be most suitable",
    r"considerando sua necessidade de": "considering their need for",
    r"flexibilidade e custos iniciais minimizados": "flexibility and minimized initial costs",
    
    # Segurança
    r"garantir que apenas usuários autenticados e autorizados": "ensure that only authenticated and authorized users",
    r"acessem recursos específicos": "access specific resources",
    r"buckets S3 contendo dados sensíveis": "S3 buckets containing sensitive data",
    r"funções Lambda que processam": "Lambda functions that process",
    r"informações financeiras": "financial information",
    r"controle de acesso granular": "granular access control",
    r"princípio do menor privilégio": "principle of least privilege",
    r"gerenciar identidades e permissões": "manage identities and permissions",
    
    # Armazenamento
    r"hospedar um site estático": "host a static website",
    r"altamente disponível": "highly available",
    r"escalável para lidar com picos de tráfego": "scalable to handle traffic spikes",
    r"custo otimizado": "cost-optimized",
    r"sem a necessidade de gerenciar servidores": "without the need to manage servers",
    r"infraestrutura complexa": "complex infrastructure",
    r"solução simples e robusta": "simple and robust solution",
    
    # Benefícios da nuvem
    r"evitar os grandes investimentos iniciais": "avoid large upfront investments",
    r"compra de hardware": "purchasing hardware",
    r"servidores, equipamentos de rede e sistemas de armazenamento": "servers, networking equipment, and storage systems",
    r"depreciados ao longo do tempo": "depreciated over time",
    r"mudar o modelo de despesa de capital para despesa operacional": "shift from a capital expenditure model to an operational expenditure model",
    r"Qual benefício da computação em nuvem": "Which cloud computing benefit",
    
    # Explicações comuns
    r"é ideal para": "is ideal for",
    r"é o serviço correto para": "is the correct service for",
    r"permite": "allows",
    r"garante": "ensures",
    r"oferece": "offers",
    r"fornece": "provides",
    r"protege": "protects",
    r"gerencia": "manages",
    r"cargas de trabalho imprevisíveis": "unpredictable workloads",
    r"de curto prazo": "short-term",
    r"paga apenas pela capacidade utilizada": "pay only for the capacity used",
    r"por hora ou segundo": "per hour or second",
    r"sem compromissos": "without commitments",
    r"exigem um compromisso de uso": "require a usage commitment",
    r"não é adequado para": "is not suitable for",
    r"cenário de imprevisibilidade": "unpredictability scenario",
    r"tolerantes a interrupções": "tolerant to interruptions",
    r"geralmente não é o caso": "is generally not the case",
    r"produto recém-lançado": "newly launched product",
}

# Traduções de opções comuns
OPTION_TRANSLATIONS = {
    "Instâncias Sob Demanda": "On-Demand Instances",
    "Instâncias Reservadas": "Reserved Instances",
    "Instâncias Spot": "Spot Instances",
    "Savings Plans": "Savings Plans",
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
    "Basic": "Basic",
    "Developer": "Developer",
    "Business": "Business",
    "Enterprise": "Enterprise",
}


def smart_translate(text):
    """
    Traduz texto usando padrões contextuais e preservando termos técnicos AWS.
    """
    if not text or not isinstance(text, str):
        return text
    
    translated = text
    
    # Aplica traduções contextuais
    for pt_pattern, en_text in CONTEXT_TRANSLATIONS.items():
        translated = re.sub(pt_pattern, en_text, translated, flags=re.IGNORECASE)
    
    # Se ainda está muito em português, retorna aviso
    # (em produção, aqui você chamaria uma API de tradução)
    
    return translated


def translate_option(option):
    """
    Traduz uma opção de resposta.
    """
    # Verifica traduções diretas primeiro
    if option in OPTION_TRANSLATIONS:
        return OPTION_TRANSLATIONS[option]
    
    # Caso contrário, usa tradução inteligente
    return smart_translate(option)


def translate_question_obj(question):
    """
    Traduz um objeto de questão completo.
    """
    translated = question.copy()
    
    # Traduz a pergunta
    if "question" in translated:
        translated["question"] = smart_translate(translated["question"])
    
    # Traduz as opções
    if "options" in translated and isinstance(translated["options"], list):
        translated["options"] = [translate_option(opt) for opt in translated["options"]]
    
    # Traduz a explicação
    if "explanation" in translated:
        translated["explanation"] = smart_translate(translated["explanation"])
    
    # Mantém campos intactos: domain, subdomain, service, difficulty, type, tags, correct
    
    return translated


def process_file(cert_id):
    """
    Processa um arquivo de certificação específico.
    """
    input_file = f"data/{cert_id}.json"
    output_file = f"data/{cert_id}-en.json"
    
    print(f"\n{'='*70}")
    print(f"📁 Processando: {cert_id.upper()}")
    print(f"{'='*70}")
    print(f"   Entrada:  {input_file}")
    print(f"   Saída:    {output_file}")
    
    try:
        # Lê o arquivo original
        with open(input_file, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        
        print(f"   ✅ Carregado: {len(questions)} questões")
        
        # Traduz cada questão
        translated_questions = []
        for i, q in enumerate(questions, 1):
            print(f"   🔄 Traduzindo questão {i}/{len(questions)}...", end='\r')
            translated_q = translate_question_obj(q)
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
        return False


def main():
    """
    Função principal.
    """
    print("\n" + "="*70)
    print("🌐 TRADUTOR AUTOMÁTICO DE QUESTÕES AWS")
    print("   PT-BR -> EN-US")
    print("="*70)
    
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
    
    print("\n💡 NOTA IMPORTANTE:")
    print("   Este script usa traduções baseadas em padrões.")
    print("   Para traduções profissionais completas, considere:")
    print("   - Google Cloud Translation API")
    print("   - DeepL API")
    print("   - Amazon Translate")
    print()


if __name__ == "__main__":
    main()
