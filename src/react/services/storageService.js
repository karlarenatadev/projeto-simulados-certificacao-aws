/**
 * storageService — wrapper seguro sobre localStorage
 *
 * Centraliza todos os acessos ao storage da aplicação.
 * Mantém compatibilidade com o prefixo 'aws_sim_' do vanilla JS.
 */

const PREFIX = 'aws_sim_';

function key(name) {
  return `${PREFIX}${name}`;
}

/**
 * Salva um valor serializado como JSON.
 * @param {string} name  - chave sem prefixo
 * @param {*}      value - qualquer valor serializável
 * @returns {boolean} true se salvo com sucesso
 */
export function storageSet(name, value) {
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Lê e deserializa um valor do storage.
 * @param {string} name         - chave sem prefixo
 * @param {*}      defaultValue - retorno padrão se ausente ou corrompido
 * @returns {*}
 */
export function storageGet(name, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key(name));
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Remove um item do storage.
 * @param {string} name - chave sem prefixo
 */
export function storageRemove(name) {
  try {
    localStorage.removeItem(key(name));
  } catch {
    // storage indisponível — ignora
  }
}

/**
 * Limpa todos os itens com o prefixo aws_sim_.
 * Não remove itens de outras aplicações.
 */
export function storageClearAll() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignora
  }
}

/**
 * Retorna todos os itens com o prefixo aws_sim_ como um objeto.
 * @returns {Record<string, *>}
 */
export function storageGetAll() {
  const result = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX)) {
        const shortKey = k.slice(PREFIX.length);
        result[shortKey] = storageGet(shortKey);
      }
    }
  } catch {
    // ignora
  }
  return result;
}
