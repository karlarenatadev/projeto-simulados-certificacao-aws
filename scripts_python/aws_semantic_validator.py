import json
import os
import re

def validate_semantics(questions: list, exame_id: str) -> list:
    """Verifica se o conteúdo das questões faz sentido logicamente e respeita o escopo do exame."""
    valid_questions = []
    
    # Constantes para validação de cenário
    PROHIBITED_PHRASES = [
        "o que é",
        "qual é a definição",
        "como funciona",
        "defina",
        "explique o conceito",
        "qual a diferença entre"
    ]
    
    CONTEXT_INDICATORS = [
        "empresa",
        "sistema",
        "precisa",
        "deve",
        "quer",
        "deseja",
        "aplicação",
        "aplicativo",
        "organização",
        "equipe",
        "projeto",
        "solução",
        "arquiteto",
        "desenvolvedor"
    ]
    
    # Dicionário de escopo de serviços por exame
    ESCOPO_SERVICOS = {
        "clf-c02": ["S3", "EC2", "Lambda", "DynamoDB", "RDS", "VPC", "IAM", "CloudFront", "Route 53", "CloudWatch", "CloudTrail", "SNS", "SQS", "WAF", "Shield", "Organizations", "Cost Explorer", "Budgets", "KMS"],
        
        "saa-c03": ["S3", "EC2", "Lambda", "DynamoDB", "RDS", "Aurora", "VPC", "IAM", "CloudFront", "Route 53", "CloudWatch", "CloudTrail", "SNS", "SQS", "KMS", "EKS", "ECS", "Fargate", "Transit Gateway", "Direct Connect", "Snowball", "Redshift", "ElastiCache", "Macie", "GuardDuty", "WAF", "Shield", "Cognito", "API Gateway", "Step Functions", "EventBridge", "Kinesis", "Glue", "Athena", "EFS", "FSx"]
    }
    
    servicos_permitidos = ESCOPO_SERVICOS.get(exame_id, [])

    for q in questions:
        question_text = q['question'].lower()
        
        # 1. Validação de Cenário (NOVA)
        # Verifica se contém frases proibidas
        has_prohibited = any(phrase in question_text for phrase in PROHIBITED_PHRASES)
        if has_prohibited:
            print(f"  ⚠️ Validação de cenário falhou: Questão contém frase proibida (definição direta).")
            continue
        
        # Verifica se tem indicadores de contexto
        has_context = any(indicator in question_text for indicator in CONTEXT_INDICATORS)
        
        # Verifica comprimento mínimo (60 caracteres - ajustado para ser mais flexível)
        min_length = 60
        is_long_enough = len(q['question']) >= min_length
        
        # Questão deve ter contexto OU ser longa o suficiente para conter cenário
        if not has_context and not is_long_enough:
            print(f"  ⚠️ Validação de cenário falhou: Questão não apresenta contexto de negócio (muito curta: {len(q['question'])} chars).")
            continue
        
        # 2. Validação de Coerência
        correct_idx = q['correct']
        correct_text = q['options'][correct_idx]
        
        if correct_text.lower() not in q['explanation'].lower():
            print(f"  ⚠️ Semântica falhou: A justificativa não menciona a resposta correta '{correct_text}'.")
            continue
            
        # 3. Validação de Escopo (só aplica se tivermos uma lista definida para o exame)
        if servicos_permitidos:
            is_valid_service = any(servico.lower() in correct_text.lower() for servico in servicos_permitidos)
            if not is_valid_service and "AWS" not in correct_text and "Amazon" not in correct_text:
                print(f"  ⚠️ Semântica falhou: '{correct_text}' não parece estar no escopo do {exame_id.upper()}.")
                continue
            
        valid_questions.append(q)
        
    return valid_questions

def validate_advanced_semantics(questions: list, exame_id: str) -> list:
    """
    Verifica se a questão é fluida (sem rótulos) e se as opções contêm 'pegadinhas' dignas da AWS.
    """
    valid_questions = []
    
    # Rótulos que quebram a fluidez da leitura (Anti-patterns)
    EXPLICIT_LABELS = [
        "contexto:", "requisito:", "requisitos:", "cenário:", "problema:", "solução:"
    ]
    
    # Lista de serviços comuns para checar se as opções incorretas são plausíveis
    AWS_SERVICES_KEYWORDS = ["Amazon", "AWS", "S3", "EC2", "Lambda", "DynamoDB", "RDS", "VPC", "EMR", "Athena", "Redshift", "Macie", "GuardDuty"]

    for q in questions:
        question_text = q['question'].lower()
        
        # 1. Validação de Fluidez (Sem rótulos explícitos)
        has_explicit_labels = any(label in question_text for label in EXPLICIT_LABELS)
        if has_explicit_labels:
            print(f"  ❌ Rejeitada: A questão usa rótulos engessados como 'Contexto:' ou 'Requisito:'.")
            continue
            
        # 2. Validação de "Pegadinhas" (Qualidade das Opções)
        options = q['options']
        correct_idx = q['correct']
        
        # A) Verifica se as opções têm tamanhos absurdamente diferentes
        # Numa prova real, as opções tendem a ter um comprimento equilibrado.
        tamanhos_opcoes = [len(opt) for opt in options]
        max_len, min_len = max(tamanhos_opcoes), min(tamanhos_opcoes)
        if max_len > (min_len * 4) and min_len < 20: 
            # Ex: Uma opção tem 10 chars ("Amazon S3") e outra tem 80 chars explicando tudo.
            print(f"  ⚠️ Aviso de Pegadinha Fraca: As opções estão muito desbalanceadas em tamanho.")
            
        # B) Verifica se as alternativas incorretas mencionam tecnologias/serviços
        # Se só a correta fala de AWS, não há pegadinha.
        incorrect_options = [opt for i, opt in enumerate(options) if i != correct_idx]
        
        plausible_distractors = 0
        for opt in incorrect_options:
            # Checa se a opção incorreta cita algum serviço ou termo técnico AWS
            if any(keyword.lower() in opt.lower() for keyword in AWS_SERVICES_KEYWORDS):
                plausible_distractors += 1
                
        if plausible_distractors < 2:
            print(f"  ⚠️ Aviso de Pegadinha Fraca: As alternativas incorretas não parecem citar serviços da AWS. Elas podem ser fáceis demais de adivinhar.")
            
        # Se passou pelos bloqueios críticos (como os rótulos explícitos), é válida
        valid_questions.append(q)
        
    return valid_questions

# Função auxiliar para rodar isso em todos os JSONs da pasta data/
def auditar_qualidade_banco():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PASTA_DATA = os.path.join(BASE_DIR, "data")
    
    print("Iniciando auditoria avançada de fluidez e pegadinhas...")
    for arquivo in os.listdir(PASTA_DATA):
        if arquivo.endswith(".json") and not arquivo.startswith("_"):
            print(f"\n🧐 Auditando {arquivo}...")
            caminho = os.path.join(PASTA_DATA, arquivo)
            
            with open(caminho, 'r', encoding='utf-8') as f:
                dados = json.load(f)
            
            # Extraindo o exame do nome do arquivo (ex: clf-c02.json -> clf-c02)
            exame_id = arquivo.split('.')[0].replace('-en', '')
            
            questoes_validas = validate_advanced_semantics(dados, exame_id)
            
            print(f"  Resultado: {len(questoes_validas)} de {len(dados)} questões passaram no crivo de alta qualidade.")

if __name__ == "__main__":
    auditar_qualidade_banco()