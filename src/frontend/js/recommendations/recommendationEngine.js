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
    const resources = this.resourceMapper.getResources(certId, domainSlug);
    const actions = [];

    // 1. Simulado focado (prioridade máxima)
    actions.push({
      type: "practice",
      title: "studyNow.start_quiz_action",
      description: "studyNow.review_domain_desc",
      descriptionVariables: { threshold: domain.score },
      domain: domain.name,
      route: `./simulados.html?mode=focus&domain=${domainSlug}&cert=${certId}`,
      icon: "fa-solid fa-bullseye",
      style: "primary",
    });

    // 2. Material de estudo (se houver documentação mapeada)
    if (resources && resources.documentation) {
      actions.push({
        type: "theory",
        title: "studyNow.study_docs_action",
        description: "studyNow.review_domain",
        descriptionVariables: { domain: domain.name },
        domain: domain.name,
        route: resources.documentation,
        icon: "fa-solid fa-book-open",
        style: "outline",
        isExternal: true
      });
    }

    return actions;
  }

  _buildFirstExamAction(certId) {
    return {
      type: "empty_state",
      title: "studyNow.empty_state_no_history",
      domain: null,
      route: `./simulados.html?cert=${certId}`,
      icon: "fa-solid fa-play",
      style: "primary",
    };
  }

  _buildReadyForExamAction(certId) {
    return {
      type: "empty_state",
      title: "studyNow.empty_state_doing_great",
      domain: null,
      route: `./simulados.html?cert=${certId}`,
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
