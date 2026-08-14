/* Adds a clear offline message to the preserved Validation artifact. */
(function installValidationApiGuard(global) {
  const api = global.ValidationAPI;
  if (!api) return;

  const unavailableMessage = "Painel de validação requer conexão com a API.";
  const wrap = (methodName) => {
    const original = api[methodName];
    if (typeof original !== "function") return;

    api[methodName] = async function guardedValidationRequest(...args) {
      try {
        return await original.apply(this, args);
      } catch (error) {
        if (!error?.status) {
          throw new Error(unavailableMessage, { cause: error });
        }
        throw error;
      }
    };
  };

  wrap("fetchPendingQuestions");
  wrap("validateQuestion");
})(typeof window !== "undefined" ? window : globalThis);
