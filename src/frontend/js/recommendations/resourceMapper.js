/**
 * @fileoverview Resource Mapper — Fase 7
 *
 * Mapeia domínios AWS para recursos de estudo estruturados, com base na certificação.
 *
 * @module recommendations/resourceMapper
 */

const RESOURCE_MAP = {
  "clf-c02": {
    "cloud-concepts": {
      documentation: "https://aws.amazon.com/pt/getting-started/cloud-essentials/",
      labs: []
    },
    "security-compliance": {
      documentation: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html",
      labs: []
    },
    "technology": {
      documentation: "https://aws.amazon.com/pt/products/",
      labs: []
    },
    "billing-pricing": {
      documentation: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html",
      labs: []
    },
    "conceitos-cloud": {
      documentation: "https://aws.amazon.com/pt/getting-started/cloud-essentials/",
      labs: []
    },
    "seguranca": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
      labs: []
    },
    "tecnologia": {
      documentation: "https://aws.amazon.com/pt/products/",
      labs: []
    },
    "faturamento": {
      documentation: "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/billing-what-is.html",
      labs: []
    }
  },
  "saa-c03": {
    "design-secure-architectures": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
      labs: []
    },
    "design-resilient-architectures": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
      labs: []
    },
    "design-high-performing-architectures": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html",
      labs: []
    },
    "design-cost-optimized-architectures": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
      labs: []
    },
    "seguranca-aplicacoes": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
      labs: []
    },
    "design-resiliente": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
      labs: []
    },
    "design-performance": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/performance-efficiency-pillar/welcome.html",
      labs: []
    },
    "design-custo": {
      documentation: "https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html",
      labs: []
    }
  },
  "dva-c02": {
    "development": {
      documentation: "https://aws.amazon.com/pt/developer/",
      labs: []
    },
    "security": {
      documentation: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
      labs: []
    },
    "deployment": {
      documentation: "https://aws.amazon.com/pt/products/developer-tools/",
      labs: []
    },
    "troubleshooting-optimization": {
      documentation: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
      labs: []
    },
    "desenvolvimento-servicos": {
      documentation: "https://aws.amazon.com/pt/developer/",
      labs: []
    },
    "seguranca-app": {
      documentation: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
      labs: []
    },
    "implementacao": {
      documentation: "https://aws.amazon.com/pt/products/developer-tools/",
      labs: []
    },
    "resolucao-problemas": {
      documentation: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
      labs: []
    }
  },
  "ai-practitioner": {
    "fundamentals-ai-ml": {
      documentation: "https://aws.amazon.com/pt/machine-learning/learn/",
      labs: []
    },
    "fundamentals-genai": {
      documentation: "https://aws.amazon.com/pt/generative-ai/",
      labs: []
    },
    "applications-foundation-models": {
      documentation: "https://aws.amazon.com/pt/bedrock/",
      labs: []
    },
    "guidelines-responsible-ai": {
      documentation: "https://aws.amazon.com/pt/machine-learning/responsible-ai/",
      labs: []
    },
    "security-compliance-governance": {
      documentation: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/security-and-compliance.html",
      labs: []
    },
    "inteligencia-artificial": {
      documentation: "https://aws.amazon.com/pt/machine-learning/learn/",
      labs: []
    }
  }
};

export class ResourceMapper {
  /**
   * Mapeia os recursos (documentação, labs, etc) para um domínio de uma certificação específica.
   *
   * @param {string} certId
   * @param {string} domainId
   * @returns {object|null}
   */
  getResources(certId, domainId) {
    if (!certId || !domainId) return null;
    
    // Fallback normalizer
    const normalizedCert = certId.toLowerCase();
    const normalizedDomain = domainId.toLowerCase();

    if (RESOURCE_MAP[normalizedCert] && RESOURCE_MAP[normalizedCert][normalizedDomain]) {
      return RESOURCE_MAP[normalizedCert][normalizedDomain];
    }
    
    // Tenta encontrar em qualquer certificação se não achar na específica
    // (usado para mapeamento legado ou casos genéricos)
    for (const cert of Object.values(RESOURCE_MAP)) {
      if (cert[normalizedDomain]) {
        return cert[normalizedDomain];
      }
    }

    return null;
  }
}
