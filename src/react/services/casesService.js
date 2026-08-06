/**
 * casesService — gerenciamento de cases (Cenários Arquiteturais AWS)
 */
import { api } from './api';

/**
 * Busca todos os cases arquiteturais do backend.
 * @returns {Promise<Array>} Array de cases
 */
export async function fetchCases() {
  try {
    const data = await api.get('/cases');
    // Mapeando do formato do banco pro frontend
    return data.map(c => ({
      id: c.id.toString(),
      title: c.title,
      certifications: [c.certification],
      scenario: c.scenario,
      requirements: c.requirements,
      solution: { description: c.solution_description },
      services: c.services_used,
      difficulty: c.difficulty,
      completed: c.completed || false
    }));
  } catch (err) {
    console.error('Falha ao buscar cases do backend:', err);
    return [];
  }
}

/**
 * Marca um case como concluído via backend.
 * @param {string|number} id ID do case
 */
export async function markCompleted(id) {
  try {
    await api.post(`/cases/${id}/complete`);
    return true;
  } catch (err) {
    console.error('Falha ao concluir case:', err);
    return false;
  }
}

/**
 * Verifica se o case foi concluído.
 * Agora é derivado diretamente do estado que veio da API fetchCases, 
 * não mantemos localmente por ID separado se possível, 
 * ou passamos "caseData.completed" no componente.
 * @deprecated - Não usar no frontend conectado
 */
export function isCompleted(id) {
  return false;
}

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Básico', color: 'var(--color-success)', icon: '🌱' },
  medium: { label: 'Intermediário', color: 'var(--color-warning)', icon: '🚀' },
  hard: { label: 'Avançado', color: 'var(--color-danger)', icon: '🔥' },
};
