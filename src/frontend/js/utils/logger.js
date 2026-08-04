/* eslint-disable no-console */
/**
 * utils/logger.js (Observabilidade)
 * Implementa 3 camadas de observabilidade:
 * 1. Logs Técnicos (Debug, Warn, Error)
 * 2. Eventos de Negócio (Ações do usuário no domínio)
 * 3. Métricas Analíticas (Performance e contadores de produto)
 */

const IS_DEV = false;

// Fila Local (Queue agnóstica) para batch processing futuro
const telemetryQueue = {
  events: [],
  metrics: [],
  flush() {
    // Em produção, isso faria POST batch para um /api/telemetry
    const snapshot = {
      events: [...this.events],
      metrics: [...this.metrics]
    };
    this.events = [];
    this.metrics = [];
    if (IS_DEV) console.log("[Telemetry Flush]", snapshot);
  }
};

/**
 * 1. Logs Técnicos
 */
export const logger = {
  info: (...args) => {
    if (IS_DEV) console.log("[INFO]", ...args);
  },
  warn: (...args) => {
    console.warn("[WARN]", ...args);
  },
  error: (...args) => {
    console.error("[ERROR]", ...args);
  }
};

/**
 * 2. Eventos de Negócio
 * (ex: SimuladoIniciado, RespostaSubmetida, ModuloConcluido)
 */
export const dispatchBusinessEvent = (eventName, payload = {}) => {
  const event = {
    type: 'BUSINESS_EVENT',
    name: eventName,
    payload,
    timestamp: Date.now()
  };
  telemetryQueue.events.push(event);
  logger.info(`[Business Event] ${eventName}`, payload);
};

/**
 * 3. Métricas Analíticas
 * (ex: tempo carregamento, % acertos p/ recomendação)
 */
export const recordMetric = (metricName, value, tags = {}) => {
  const metric = {
    type: 'METRIC',
    name: metricName,
    value,
    tags,
    timestamp: Date.now()
  };
  telemetryQueue.metrics.push(metric);
  logger.info(`[Metric] ${metricName}: ${value}`, tags);
};

/* eslint-enable no-console */
