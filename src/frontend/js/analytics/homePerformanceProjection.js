import { LearningAnalytics } from "./learningAnalytics.js";
import { normalizeCertificationId } from "../utils/certUtils.js";
import { createHistoryTimeline } from "../utils/historyTimeline.js";

export function createHomePerformanceProjection(storage, certificationId) {
  if (!storage) {
    throw new Error("[HomePerformance] storage is required.");
  }

  const normalizedCertId =
    normalizeCertificationId(certificationId) || "clf-c02";
  const history = storage.getHistory?.() ?? [];
  const timeline = createHistoryTimeline(history, {
    certificationId: normalizedCertId,
  });
  const analytics = new LearningAnalytics(storage);
  const profile = analytics.getLearningProfile(normalizedCertId, { timeline });

  return {
    certificationId: normalizedCertId,
    timeline,
    profile,
  };
}

export function getReadinessViewModel(profile, language = "pt") {
  const examsTaken = Number(profile?.overview?.examsTaken) || 0;
  const rawReadiness = Number(profile?.overview?.readiness);
  const readiness = Number.isFinite(rawReadiness)
    ? Math.max(0, Math.min(100, Math.round(rawReadiness)))
    : 0;

  let statusKey = "readiness_not_started";
  if (examsTaken > 0 && readiness >= 85) {
    statusKey = "readiness_ready";
  } else if (examsTaken > 0 && readiness >= 65) {
    statusKey = "readiness_almost_ready";
  } else if (examsTaken > 0) {
    statusKey = "readiness_in_progress";
  }

  return { readiness, examsTaken, statusKey, language };
}
