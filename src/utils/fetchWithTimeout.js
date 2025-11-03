/**
 * ✅ SEGURANÇA (ALTO-006): Fetch com timeout automático
 * Previne requisições que ficarão pendentes para sempre
 *
 * @param {string} url - URL para fazer fetch
 * @param {object} options - Opções padrão do fetch
 * @param {number} timeout - Timeout em milissegundos (padrão: 30s)
 * @returns {Promise<Response>} Resposta do fetch ou erro de timeout
 *
 * @example
 * const response = await fetchWithTimeout('/api/data', { method: 'GET' }, 10000);
 */
export const fetchWithTimeout = (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⚠️ Timeout em fetch para ${url} (${timeout}ms)`);
    controller.abort();
  }, timeout);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timeoutId))
    .catch(error => {
      // Detectar se foi abort por timeout
      if (error.name === 'AbortError') {
        throw new Error(
          `Requisição excedeu o timeout de ${timeout}ms. Verifique sua conexão e tente novamente.`
        );
      }

      throw error;
    });
};

/**
 * Wrapper para fetchWithTimeout com timeout padrão de 30 segundos
 * Usar em 90% dos casos
 */
export const fetchAPI = (url, options = {}) => {
  return fetchWithTimeout(url, options, 30000);
};

/**
 * Para requisições que precisam de mais tempo (upload de arquivos, etc)
 */
export const fetchAPILong = (url, options = {}) => {
  return fetchWithTimeout(url, options, 120000); // 2 minutos
};

/**
 * Para requisições rápidas que devem falhar rapidinho
 */
export const fetchAPIFast = (url, options = {}) => {
  return fetchWithTimeout(url, options, 5000); // 5 segundos
};
