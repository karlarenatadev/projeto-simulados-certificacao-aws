import { api } from './api.js';
import { storageGet, storageSet } from './storageService.js';

const COMPLETED_KEY = 'cases_completed';
const CACHE_KEY = 'cases_cache';
const CACHE_TTL = 5 * 60 * 1000;

export const FALLBACK_CASES = [
  { id: 'static-website', title: 'Site Estático de Alta Performance', scenario: 'Uma startup precisa hospedar um site marketing global com latência mínima e custo reduzido. Sem servidor.', difficulty: 'beginner', certifications: ['CLF-C02','SAA-C03'], services: ['S3','CloudFront','Route 53'] },
  { id: 'serverless-api', title: 'API Serverless Escalável', scenario: 'E-commerce precisa de API que suporte picos de Black Friday sem provisionar servidores manualmente.', difficulty: 'intermediate', certifications: ['SAA-C03','DVA-C02'], services: ['Lambda','API Gateway','DynamoDB'] },
  { id: 'data-lake', title: 'Data Lake para Analytics', scenario: 'Empresa de varejo quer centralizar dados de múltiplas fontes para análise com BI e ML.', difficulty: 'advanced', certifications: ['SAA-C03'], services: ['S3','Glue','Athena','QuickSight'] },
  { id: 'multi-tier-web', title: 'Aplicação Web Multi-Tier', scenario: 'Sistema corporativo precisa de arquitetura resiliente com banco de dados, cache e balanceamento de carga.', difficulty: 'intermediate', certifications: ['SAA-C03'], services: ['EC2','RDS','ElastiCache','ALB','Auto Scaling'] },
  { id: 'disaster-recovery', title: 'Disaster Recovery Multi-Region', scenario: 'Banco digital precisa garantir RPO de 1h e RTO de 4h para seus sistemas críticos.', difficulty: 'advanced', certifications: ['SAA-C03'], services: ['Route 53','RDS','S3','CloudFormation'] },
  { id: 'iot-pipeline', title: 'Pipeline IoT em Tempo Real', scenario: 'Fábrica quer monitorar sensores industriais em tempo real e detectar anomalias automaticamente.', difficulty: 'advanced', certifications: ['SAA-C03','AIF-C01'], services: ['IoT Core','Kinesis','Lambda','DynamoDB'] },
  { id: 'ml-pipeline', title: 'Pipeline de Machine Learning', scenario: 'Time de Data Science precisa de infraestrutura para treinar, versionar e servir modelos ML.', difficulty: 'advanced', certifications: ['AIF-C01','SAA-C03'], services: ['SageMaker','S3','ECR','Lambda'] },
  { id: 'microservices', title: 'Arquitetura de Microsserviços', scenario: 'Aplicação monolítica legacy precisa ser migrada para microsserviços com deploy independente.', difficulty: 'advanced', certifications: ['DVA-C02','SAA-C03'], services: ['ECS','ECR','API Gateway','SQS','SNS'] },
];

export const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Iniciante',      className: 'difficulty--beginner' },
  intermediate: { label: 'Intermediário',  className: 'difficulty--intermediate' },
  advanced:     { label: 'Avançado',        className: 'difficulty--advanced' },
};

export async function fetchCases(filters = {}) {
  const cached = storageGet(CACHE_KEY);
  if (cached?.timestamp && Date.now() - cached.timestamp < CACHE_TTL) {
    return applyFilters(cached.data, filters);
  }
  try {
    const data = await api.get('/cases');
    if (Array.isArray(data) && data.length > 0) {
      storageSet(CACHE_KEY, { data, timestamp: Date.now() });
      return applyFilters(data, filters);
    }
  } catch {
    // API indisponível — usa fallback
  }
  return applyFilters(FALLBACK_CASES, filters);
}

function applyFilters(cases, { certification, difficulty } = {}) {
  return cases.filter(c => {
    if (certification && !c.certifications?.some(cert => cert.toLowerCase().includes(certification.toLowerCase()))) return false;
    if (difficulty && c.difficulty !== difficulty) return false;
    return true;
  });
}

export function isCompleted(id) {
  const list = storageGet(COMPLETED_KEY) ?? [];
  return list.includes(id);
}

export function markCompleted(id) {
  const list = storageGet(COMPLETED_KEY) ?? [];
  if (!list.includes(id)) {
    storageSet(COMPLETED_KEY, [...list, id]);
  }
}
