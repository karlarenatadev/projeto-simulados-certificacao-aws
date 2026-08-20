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
import { normalizeDomain } from "../domainTaxonomy.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { normalizeServiceId } from "../utils/serviceIdentity.js";
import { buildExamTipsRecommendation } from "./examTips.js";

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

  /**
   * Converte um DiagnosticResult em contextos de recomendação.
   * O resultado do diagnóstico continua sendo a fonte dos scores e domínios.
   * Este método não seleciona cards ou questões.
   *
   * @param {object} diagnosticResult Resultado estruturado do diagnóstico.
   * @returns {object|null} Contrato de recomendações ou null para entrada inválida.
   */
  generateDiagnosticRecommendations(diagnosticResult) {
    if (
      !diagnosticResult ||
      !diagnosticResult.certificationId ||
      !Array.isArray(diagnosticResult.domainResults)
    ) {
      return null;
    }

    const certificationId = normalizeCertificationId(
      diagnosticResult.certificationId,
    );
    const weakDomainIds = new Set(
      (diagnosticResult.weakDomains || [])
        .map((domain) =>
          typeof domain === "string" ? domain : domain?.domainId || domain?.id,
        )
        .map((domain) => normalizeDomain(certificationId, domain))
        .filter(Boolean),
    );
    const strongDomainIds = new Set(
      (diagnosticResult.strongDomains || [])
        .map((domain) =>
          typeof domain === "string" ? domain : domain?.domainId || domain?.id,
        )
        .map((domain) => normalizeDomain(certificationId, domain))
        .filter(Boolean),
    );

    const priorities = diagnosticResult.domainResults
      .map((domain) => {
        const domainId = normalizeDomain(
          certificationId,
          domain.domainId || domain.id,
        );
        if (!domainId || typeof domain.score !== "number") return null;

        const isWeak = weakDomainIds.has(domainId);
        const isStrong = strongDomainIds.has(domainId);

        return {
          domainId,
          score: domain.score,
          priority: isWeak
            ? domain.score < 50
              ? "high"
              : "medium"
            : "low",
          status: isWeak ? "weak" : isStrong ? "strong" : "unclassified",
        };
      })
      .filter(Boolean);

    const weakDomains = [...weakDomainIds];
    const questionIds = (diagnosticResult.answers || [])
      .map((answer) => answer.id || answer.questionId)
      .filter(Boolean);
    const hasWeakDomains = weakDomains.length > 0;
    const normalizeSignals = (signals) =>
      (Array.isArray(signals) ? signals : [])
        .filter((signal) => signal?.id && Number.isFinite(signal.occurrences))
        .map((signal) => ({
          id: signal.id,
          occurrences: signal.occurrences,
          ...(signal.evidence ? { evidence: signal.evidence } : {}),
        }));
    const weakServices = normalizeSignals(diagnosticResult.weakServices);
    const weakTopics = normalizeSignals(diagnosticResult.weakTopics);
    const strongServices = weakServices
      .filter((signal) => signal.evidence === "strong")
      .map((signal) => normalizeServiceId(signal.id))
      .filter(Boolean);
    const secondaryServices = weakServices
      .filter((signal) => signal.evidence !== "strong")
      .map((signal) => normalizeServiceId(signal.id))
      .filter(Boolean);
    const hasCaseSignals = weakServices.length > 0 || weakDomains.length > 0;

    return {
      source: "diagnostic",
      certificationId,
      overallScore: diagnosticResult.overallScore,
      weakDomains,
      strongDomains: [...strongDomainIds],
      weakServices,
      weakTopics,
      priorities,
      recommendations: {
        flashcards: {
          enabled: hasWeakDomains,
          type: "flashcards",
          context: {
            source: "diagnostic",
            certificationId,
            weakDomains,
          },
        },
        questions: {
          enabled: hasWeakDomains,
          type: "targeted-practice",
          context: {
            source: "diagnostic",
            mode: "targeted-practice",
            certificationId,
            domains: weakDomains,
            weakDomains,
            questionIds,
          },
        },
        labs: {
          enabled: weakServices.length > 0,
          type: "labs",
          context: {
            source: "diagnostic",
            certificationId,
            services: [...new Set([...strongServices, ...secondaryServices])],
            strongServices: [...new Set(strongServices)],
            secondaryServices: [...new Set(secondaryServices)],
            weakDomains,
          },
        },
        cases: {
          enabled: hasCaseSignals,
          type: "cases",
          context: {
            source: "diagnostic",
            certificationId,
            services: [...new Set([...strongServices, ...secondaryServices])],
            strongServices: [...new Set(strongServices)],
            secondaryServices: [...new Set(secondaryServices)],
            weakDomains,
            weakTopics,
          },
        },
        tips: buildExamTipsRecommendation({
          source: "diagnostic",
          certificationId,
          weakDomains,
          weakServices,
          weakTopics,
        }),
      },
    };
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
