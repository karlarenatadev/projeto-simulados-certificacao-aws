import json
import os
from generator import AWSQuestion # Importa sua regra do outro arquivo

def validar_banco_existente():
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pasta_data = os.path.join(BASE_DIR, "data")
    
    for arquivo in os.listdir(pasta_data):
        if arquivo.endswith(".json"):
            print(f"🧐 Validando {arquivo}...")
            with open(os.path.join(pasta_data, arquivo), 'r', encoding='utf-8') as f:
                dados = json.load(f)
                
            erros = 0
            for item in dados:
                try:
                    AWSQuestion(**item) # Tenta validar cada questão
                except Exception as e:
                    print(f"   ❌ Erro na questão ID {item.get('id')}: {e}")
                    erros += 1
            
            if erros == 0:
                print(f"   ✅ {arquivo} está 100% perfeito!")
            else:
                print(f"   ⚠️ {arquivo} tem {erros} erros para corrigir.")

if __name__ == "__main__":
    validar_banco_existente()