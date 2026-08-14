#!/usr/bin/env python3
"""
Merge de Contribuições
Consolida questões individuais da pasta contributions/ no arquivo principal
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime
import shutil

class ContributionMerger:
    """Mergeia contribuições individuais no banco principal"""
    
    def __init__(self, cert_id: str, dry_run: bool = False):
        self.cert_id = cert_id
        self.dry_run = dry_run
        self.project_root = Path(__file__).resolve().parents[3]
        self.contributions_dir = self.project_root / 'data' / 'contributions' / cert_id
        self.main_file = self.project_root / 'data' / 'questions' / f'{cert_id}.json'
        self.backup_dir = self.project_root / 'data' / 'backups'
        
        self.merged_count = 0
        self.skipped_count = 0
        self.errors: List[str] = []
    
    def merge(self) -> bool:
        """Executa o merge de todas as contribuições"""
        print(f"🔄 Mergeando contribuições para: {self.cert_id}")
        print("=" * 60)
        
        # 1. Valida ambiente
        if not self._validate_environment():
            return False
        
        # 2. Cria backup do arquivo principal
        if not self.dry_run:
            self._create_backup()
        
        # 3. Carrega arquivo principal
        main_questions = self._load_main_file()
        if main_questions is None:
            return False
        
        # 4. Carrega contribuições
        contributions = self._load_contributions()
        if not contributions:
            print("ℹ️  Nenhuma contribuição encontrada para mergear.")
            return True
        
        # 5. Valida e mergeia cada contribuição
        for contrib_file, question in contributions:
            self._merge_single_contribution(contrib_file, question, main_questions)
        
        # 6. Salva arquivo principal atualizado
        if not self.dry_run and self.merged_count > 0:
            self._save_main_file(main_questions)
        
        # 7. Exibe resultados
        self._display_results()
        
        return len(self.errors) == 0
    
    def _validate_environment(self) -> bool:
        """Valida se o ambiente está correto"""
        if not self.main_file.exists():
            self.errors.append(f"❌ Arquivo principal não encontrado: {self.main_file}")
            return False
        
        if not self.contributions_dir.exists():
            print(f"ℹ️  Pasta de contribuições não existe: {self.contributions_dir}")
            print(f"   Criando pasta...")
            if not self.dry_run:
                self.contributions_dir.mkdir(parents=True, exist_ok=True)
        
        return True
    
    def _create_backup(self):
        """Cria backup do arquivo principal"""
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = self.backup_dir / f'{self.cert_id}_backup_{timestamp}.json'
        
        shutil.copy2(self.main_file, backup_file)
        print(f"💾 Backup criado: {backup_file.name}")
        print()
    
    def _load_main_file(self) -> List[Dict[str, Any]] | None:
        """Carrega arquivo principal"""
        try:
            with open(self.main_file, 'r', encoding='utf-8') as f:
                questions = json.load(f)
            print(f"📂 Arquivo principal carregado: {len(questions)} questões")
            return questions
        except Exception as e:
            self.errors.append(f"❌ Erro ao carregar arquivo principal: {e}")
            return None
    
    def _load_contributions(self) -> List[tuple[Path, Dict[str, Any]]]:
        """Carrega todas as contribuições"""
        contributions = []
        
        for json_file in self.contributions_dir.glob('*.json'):
            # Ignora templates
            if json_file.name.startswith('_'):
                continue
            
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    question = json.load(f)
                contributions.append((json_file, question))
            except Exception as e:
                self.errors.append(f"❌ Erro ao carregar {json_file.name}: {e}")
        
        print(f"📥 Contribuições encontradas: {len(contributions)}")
        print()
        return contributions
    
    def _merge_single_contribution(
        self, 
        contrib_file: Path, 
        question: Dict[str, Any], 
        main_questions: List[Dict[str, Any]]
    ):
        """Mergeia uma única contribuição"""
        print(f"🔍 Processando: {contrib_file.name}")
        
        # Valida questão usando o validador
        from validate_contribution import ContributionValidator
        validator = ContributionValidator(str(contrib_file))
        
        if not validator.validate():
            print(f"   ❌ Validação falhou. Pulando...")
            self.skipped_count += 1
            print()
            return
        
        question_cert = str(
            question.get('certId') or question.get('certification') or self.cert_id
        ).lower()
        if question_cert != self.cert_id.lower():
            self.errors.append(f"Certification mismatch: {question_cert}")
            self.skipped_count += 1
            return

        question_language = str(question.get('language') or 'pt').lower()
        if question_language not in {'pt', 'pt-br', 'portuguese'}:
            self.errors.append(f"Language mismatch: {question_language}")
            self.skipped_count += 1
            return

        # Verifica duplicatas
        if self._is_duplicate(question, main_questions):
            print(f"   ⚠️  Questão duplicada detectada. Pulando...")
            self.skipped_count += 1
            print()
            return
        
        # Remove campo contributor antes de adicionar (não vai para o banco principal)
        question_clean = {k: v for k, v in question.items() if k != 'contributor'}
        
        # Adiciona ao banco principal
        main_questions.append(question_clean)
        self.merged_count += 1
        
        # Move arquivo para pasta de processados
        if not self.dry_run:
            processed_dir = self.contributions_dir / '_processed'
            processed_dir.mkdir(exist_ok=True)
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            new_name = f"{contrib_file.stem}_{timestamp}{contrib_file.suffix}"
            contrib_file.rename(processed_dir / new_name)
            
            print(f"   ✅ Mergeada com sucesso! Movida para _processed/")
        else:
            print(f"   ✅ Seria mergeada (dry-run mode)")
        
        print()
    
    def _is_duplicate(self, question: Dict[str, Any], main_questions: List[Dict[str, Any]]) -> bool:
        """Verifica se a questão já existe no banco"""
        question_text = question.get('question', '').strip().lower()
        
        for existing in main_questions:
            existing_text = existing.get('question', '').strip().lower()
            
            # Comparação exata
            if question_text == existing_text:
                return True
            
            # Comparação de similaridade (opcional - requer string-similarity)
            try:
                from string_similarity import similarity
                if similarity(question_text, existing_text) > 0.9:
                    return True
            except ImportError:
                pass
        
        return False
    
    def _save_main_file(self, questions: List[Dict[str, Any]]):
        """Salva arquivo principal atualizado"""
        try:
            with open(self.main_file, 'w', encoding='utf-8') as f:
                json.dump(questions, f, ensure_ascii=False, indent=2)
            print(f"💾 Arquivo principal atualizado: {len(questions)} questões totais")
        except Exception as e:
            self.errors.append(f"❌ Erro ao salvar arquivo principal: {e}")
    
    def _display_results(self):
        """Exibe resultados do merge"""
        print()
        print("=" * 60)
        print("📊 RESULTADOS DO MERGE")
        print("=" * 60)
        print(f"✅ Questões mergeadas: {self.merged_count}")
        print(f"⚠️  Questões puladas: {self.skipped_count}")
        print(f"❌ Erros: {len(self.errors)}")
        
        if self.errors:
            print()
            print("ERROS:")
            for error in self.errors:
                print(f"  {error}")
        
        if self.dry_run:
            print()
            print("ℹ️  Modo DRY-RUN: Nenhuma alteração foi feita nos arquivos.")
        
        print()


def main():
    """Função principal"""
    if len(sys.argv) < 2:
        print("Uso: python merge_contributions.py <cert-id> [--dry-run]")
        print()
        print("Certificações disponíveis:")
        print("  - clf-c02  (Cloud Practitioner)")
        print("  - saa-c03  (Solutions Architect Associate)")
        print("  - aif-c01  (AI Practitioner)")
        print("  - dva-c02  (Developer Associate)")
        print()
        print("Exemplo:")
        print("  python merge_contributions.py clf-c02")
        print("  python merge_contributions.py saa-c03 --dry-run")
        sys.exit(1)
    
    cert_id = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    
    if dry_run:
        print("🔍 Modo DRY-RUN ativado (nenhuma alteração será feita)")
        print()
    
    merger = ContributionMerger(cert_id, dry_run)
    success = merger.merge()
    
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
