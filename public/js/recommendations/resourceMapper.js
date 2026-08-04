/**
 * @fileoverview Resource Mapper — Fase 7
 *
 * Mapeia domínios AWS para recursos de estudo estruturados.
 * Cada recurso segue a estrutura que futuramente pode alimentar um RAG/Bedrock.
 *
 * @module recommendations/resourceMapper
 */

/** @type {CloudLibraryEntry[]} */
const CLOUD_LIBRARY = [
  {
    topic: "Networking",
    certifications: ["saa-c03", "soa-c02", "dva-c02"],
    difficulty: "intermediate",
    domainKeywords: ["network", "vpc", "subnet", "route", "gateway", "transit"],
    resources: [
      {
        type: "documentation",
        title: "Amazon VPC User Guide",
        url: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
      },
      {
        type: "documentation",
        title: "VPC Peering Guide",
        url: "https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html",
      },
      {
        type: "whitepaper",
        title: "AWS Best Practices for VPC Design",
        url: "https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/introduction.html",
      },
      {
        type: "faq",
        title: "Amazon VPC FAQ",
        url: "https://aws.amazon.com/vpc/faqs/",
      },
    ],
  },
  {
    topic: "Security",
    certifications: ["saa-c03", "clf-c02", "scs-c02"],
    difficulty: "intermediate",
    domainKeywords: [
      "security",
      "iam",
      "policy",
      "encryption",
      "kms",
      "secrets",
      "guard",
    ],
    resources: [
      {
        type: "documentation",
        title: "AWS IAM User Guide",
        url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html",
      },
      {
        type: "whitepaper",
        title: "AWS Security Best Practices",
        url: "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
      },
      {
        type: "documentation",
        title: "AWS KMS Developer Guide",
        url: "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html",
      },
    ],
  },
  {
    topic: "Storage",
    certifications: ["saa-c03", "clf-c02", "dva-c02"],
    difficulty: "beginner",
    domainKeywords: ["storage", "s3", "ebs", "efs", "glacier", "backup"],
    resources: [
      {
        type: "documentation",
        title: "Amazon S3 User Guide",
        url: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
      },
      {
        type: "documentation",
        title: "Amazon EBS User Guide",
        url: "https://docs.aws.amazon.com/ebs/latest/userguide/what-is-ebs.html",
      },
      {
        type: "whitepaper",
        title: "AWS Storage Best Practices",
        url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/storage.html",
      },
    ],
  },
  {
    topic: "Compute",
    certifications: ["saa-c03", "clf-c02", "dva-c02"],
    difficulty: "beginner",
    domainKeywords: [
      "compute",
      "ec2",
      "lambda",
      "ecs",
      "eks",
      "fargate",
      "auto scaling",
    ],
    resources: [
      {
        type: "documentation",
        title: "Amazon EC2 User Guide",
        url: "https://docs.aws.amazon.com/ec2/index.html",
      },
      {
        type: "documentation",
        title: "AWS Lambda Developer Guide",
        url: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html",
      },
    ],
  },
  {
    topic: "Databases",
    certifications: ["saa-c03", "dva-c02"],
    difficulty: "intermediate",
    domainKeywords: [
      "database",
      "rds",
      "dynamodb",
      "aurora",
      "elasticache",
      "redshift",
    ],
    resources: [
      {
        type: "documentation",
        title: "Amazon RDS User Guide",
        url: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html",
      },
      {
        type: "documentation",
        title: "Amazon DynamoDB Developer Guide",
        url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html",
      },
    ],
  },
  {
    topic: "High Availability & Disaster Recovery",
    certifications: ["saa-c03", "soa-c02"],
    difficulty: "advanced",
    domainKeywords: [
      "disaster",
      "recovery",
      "availability",
      "failover",
      "multi-az",
      "multi-region",
      "resilience",
    ],
    resources: [
      {
        type: "whitepaper",
        title: "Disaster Recovery of Workloads on AWS",
        url: "https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-workloads-on-aws.html",
      },
      {
        type: "whitepaper",
        title: "AWS Reliability Pillar",
        url: "https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html",
      },
    ],
  },
  {
    topic: "Architecture Best Practices",
    certifications: ["saa-c03"],
    difficulty: "advanced",
    domainKeywords: [
      "well architected",
      "architecture",
      "design",
      "best practice",
    ],
    resources: [
      {
        type: "whitepaper",
        title: "AWS Well-Architected Framework",
        url: "https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html",
      },
    ],
  },
  {
    topic: "Cloud Concepts",
    certifications: ["clf-c02", "aif-c01"],
    difficulty: "beginner",
    domainKeywords: [
      "cloud",
      "concept",
      "shared responsibility",
      "pricing",
      "global infrastructure",
    ],
    resources: [
      {
        type: "documentation",
        title: "Introduction to AWS Cloud",
        url: "https://docs.aws.amazon.com/whitepapers/latest/aws-overview/introduction.html",
      },
      {
        type: "faq",
        title: "AWS Cloud FAQ",
        url: "https://aws.amazon.com/what-is-aws/",
      },
    ],
  },
  {
    topic: "AI & Machine Learning",
    certifications: ["aif-c01"],
    difficulty: "intermediate",
    domainKeywords: [
      "ai",
      "ml",
      "machine learning",
      "bedrock",
      "sagemaker",
      "rekognition",
    ],
    resources: [
      {
        type: "documentation",
        title: "Amazon Bedrock User Guide",
        url: "https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html",
      },
      {
        type: "documentation",
        title: "Amazon SageMaker Developer Guide",
        url: "https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html",
      },
    ],
  },
];

export class ResourceMapper {
  /**
   * Retorna os recursos mais relevantes para um domínio e certificação.
   *
   * @param {string} domainName - Nome do domínio (ex: 'Networking')
   * @param {string} certId     - ID da certificação (ex: 'saa-c03')
   * @returns {Resource[]}
   */
  getResources(domainName, certId) {
    const normalizedCert = certId?.toLowerCase();
    const normalizedDomain = domainName?.toLowerCase() || "";

    // Tenta correspondência direta ou por keyword
    const entry = CLOUD_LIBRARY.find((lib) => {
      const nameMatch = lib.topic.toLowerCase() === normalizedDomain;
      const keywordMatch = lib.domainKeywords.some((kw) =>
        normalizedDomain.includes(kw),
      );
      const certMatch =
        !normalizedCert || lib.certifications.includes(normalizedCert);
      return (nameMatch || keywordMatch) && certMatch;
    });

    return entry ? entry.resources : [];
  }

  /**
   * Retorna a biblioteca completa, filtrada opcionalmente por certificação.
   * @param {string} [certId]
   * @returns {CloudLibraryEntry[]}
   */
  getLibrary(certId) {
    if (!certId) return CLOUD_LIBRARY;
    const normalizedCert = certId.toLowerCase();
    return CLOUD_LIBRARY.filter((entry) =>
      entry.certifications.includes(normalizedCert),
    );
  }
}

/**
 * @typedef {Object} CloudLibraryEntry
 * @property {string} topic
 * @property {string[]} certifications
 * @property {'beginner'|'intermediate'|'advanced'} difficulty
 * @property {string[]} domainKeywords
 * @property {Resource[]} resources
 */

/**
 * @typedef {Object} Resource
 * @property {'documentation'|'whitepaper'|'faq'|'video'|'course'} type
 * @property {string} title
 * @property {string} url
 */
