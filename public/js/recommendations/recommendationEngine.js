/**
 * @fileoverview Recommendation Engine — Fase 7
 *
 * Transforma o LearningProfile em ações concretas e priorizadas para o usuário.
 * Opera como um motor de regras: analisa lacunas e gera o plano de estudos.
 *
 * REGRAS:
 * - Recebe o LearningProfile (não acessa localStorage diretamente).
 * - Retorna nextActions prontas para renderização.
 * - É orientado a ação, não a "conselho genérico".
 *
 * @module recommendations/recommendationEngine
 */

import { ResourceMapper } from "./resourceMapper.js";

export class RecommendationEngine {
  constructor() {
    this.resourceMapper = new ResourceMapper();
  }

  /**
   * Gera o plano de estudos e injeta nextActions no perfil.
   * Modifica o perfil in-place e também o retorna.
   *
   * @param {import('../analytics/learningAnalytics.js').LearningProfile} profile
   * @returns {import('../analytics/learningAnalytics.js').LearningProfile}
   */
  generateStudyPlan(profile) {
    if (!profile) return profile;

    // Nenhum dado ainda — retorna vazio
    if (!profile.domains || profile.domains.length === 0) {
      profile.nextActions = [this._buildFirstExamAction(profile.certification)];
      return profile;
    }

    // Está pronto para o exame?
    if (profile.overview.readiness >= 85 && !profile.weakAreas.length) {
      profile.nextActions = [
        this._buildReadyForExamAction(profile.certification),
      ];
      return profile;
    }

    // Foca no pior domínio (lista já está ordenada do pior para o melhor)
    const topGap = profile.domains[0];
    profile.nextActions = this._buildActionsForGap(
      topGap,
      profile.certification,
    );

    return profile;
  }

  // ---------------------------------------------------------------------------
  // Builders de ação
  // ---------------------------------------------------------------------------

  _buildActionsForGap(domain, certId) {
    const domainSlug = this._slugify(domain.name);
    const resources = this.resourceMapper.getResources(domain.name, certId);
    const actions = [];

    // 1. Simulado focado (prioridade máxima)
    actions.push({
      type: "practice",
      title: "Fazer simulado focado",
      description: `Praticar questões somente de "${domain.name}" (${domain.score}% de acerto atual)`,
      action: `index.html?mode=focus&domain=${domainSlug}&cert=${certId}`,
      icon: "fa-solid fa-bullseye",
      style: "primary",
    });

    // 2. Revisar erros (se tiver erros mapeados)
    if (domain.mistakes > 0) {
      actions.push({
        type: "review",
        title: `Revisar ${domain.mistakes} erro${domain.mistakes > 1 ? "s" : ""} anteriores`,
        description: `Você tem erros registrados em "${domain.name}". Revise para não repetir.`,
        action: `index.html?mode=review&domain=${domainSlug}&cert=${certId}`,
        icon: "fa-solid fa-rotate-left",
        style: "secondary",
      });
    }

    // 3. Material de estudo
    if (resources.length > 0) {
      actions.push({
        type: "theory",
        title: "Estudar material de referência",
        description: `${resources.length} recurso${resources.length > 1 ? "s" : ""} disponível para "${domain.name}"`,
        action: `study-hub.html?tab=library&domain=${domainSlug}`,
        icon: "fa-solid fa-book-open",
        style: "outline",
        resources,
      });
    }

    return actions;
  }

  _buildFirstExamAction(certId) {
    return {
      type: "practice",
      title: "Fazer seu primeiro simulado",
      description: `Você ainda não tem histórico de ${certId}. Comece agora!`,
      action: `index.html?cert=${certId}`,
      icon: "fa-solid fa-play",
      style: "primary",
    };
  }

  _buildReadyForExamAction(certId) {
    return {
      type: "exam",
      title: "Você está pronto para o exame!",
      description: `Seu Readiness Score é alto. Considere agendar o exame oficial de ${certId.toUpperCase()}.`,
      action: "https://aws.amazon.com/certification/",
      icon: "fa-solid fa-trophy",
      style: "primary",
    };
  }

  _slugify(text) {
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
}
