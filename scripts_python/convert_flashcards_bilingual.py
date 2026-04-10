#!/usr/bin/env python3
"""
Script to convert flashcard terms to bilingual format
This is a helper script - the actual conversion should be done with proper translations
For now, it creates the structure with placeholders for English translations
"""

import json
import re

# Sample terms that need conversion (add all remaining terms here)
# This is just a template - you would need to add proper English translations

def create_bilingual_term(cert, term_pt, definition_pt, term_en=None, definition_en=None):
    """Create a bilingual flashcard term"""
    return {
        "cert": cert,
        "term": {
            "pt": term_pt,
            "en": term_en or term_pt  # Use Portuguese as fallback if no English provided
        },
        "definition": {
            "pt": definition_pt,
            "en": definition_en or f"[EN] {definition_pt}"  # Placeholder for translation
        }
    }

# Example usage - you would expand this with all terms
bilingual_terms = [
    # SAA-C03 terms
    create_bilingual_term(
        "saa-c03",
        "Amazon S3 Glacier",
        "Classes de armazenamento de baixo custo para arquivamento de dados e backup de longo prazo. Oferece três opções de recuperação: Expedited, Standard e Bulk.",
        "Amazon S3 Glacier",
        "Low-cost storage classes for data archiving and long-term backup. Offers three retrieval options: Expedited, Standard, and Bulk."
    ),
    create_bilingual_term(
        "saa-c03",
        "Amazon VPC (Virtual Private Cloud)",
        "Rede virtual logicamente isolada na AWS onde você pode lançar recursos com controle completo sobre configuração de rede, incluindo sub-redes, tabelas de roteamento e gateways.",
        "Amazon VPC (Virtual Private Cloud)",
        "Logically isolated virtual network in AWS where you can launch resources with complete control over network configuration, including subnets, routing tables, and gateways."
    ),
    # Add more terms here...
]

def generate_js_export(terms):
    """Generate JavaScript export statement"""
    js_code = "export const glossaryTerms = [\n"
    
    for term in terms:
        js_code += "  {\n"
        js_code += f'    cert: "{term["cert"]}",\n'
        js_code += "    term: {\n"
        js_code += f'      pt: "{term["term"]["pt"]}",\n'
        js_code += f'      en: "{term["term"]["en"]}"\n'
        js_code += "    },\n"
        js_code += "    definition: {\n"
        js_code += f'      pt: "{term["definition"]["pt"]}",\n'
        js_code += f'      en: "{term["definition"]["en"]}"\n'
        js_code += "    }\n"
        js_code += "  },\n"
    
    js_code += "];\n"
    return js_code

if __name__ == "__main__":
    print("Bilingual Flashcard Converter")
    print("=" * 50)
    print("\nThis script helps convert flashcard terms to bilingual format.")
    print("You need to provide proper English translations for each term.")
    print("\nGenerated structure:")
    print(generate_js_export(bilingual_terms[:2]))  # Show first 2 as example
