/**
 * ✅ SEGURANÇA (ALTO-002): Logger seguro
 * Evita expor informações sensíveis em logs de produção
 *
 * Em PRODUÇÃO: Apenas logs de erro
 * Em DESENVOLVIMENTO: Todos os logs
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Log de desenvolvimento - apareça apenas em dev
 * NÃO incluir informações sensíveis (tokens, senhas, etc)
 */
export const devLog = (...args) => {
  if (isDevelopment) {
    console.log('[DEV]', ...args);
  }
};

/**
 * Log de erro desenvolvimento
 */
export const devError = (...args) => {
  if (isDevelopment) {
    console.error('[DEV ERROR]', ...args);
  }
};

/**
 * Log de erro - SEMPRE apareça (mesmo em produção)
 * Usar apenas para erros reais que precisam de atenção
 */
export const errorLog = (message, error = null) => {
  console.error(
    `[ERROR] ${message}`,
    error ? `- ${error.message}` : ''
  );
};

/**
 * Log de warning - para alertas que não são erros
 */
export const warnLog = (message) => {
  console.warn(`[WARNING] ${message}`);
};

/**
 * Log de sucesso - útil para operações críticas
 */
export const successLog = (message) => {
  if (isDevelopment || process.env.LOG_SUCCESS === 'true') {
    console.log(`[SUCCESS] ${message}`);
  }
};

/**
 * Log de audit - registra ações de segurança
 * Sempre apareça para rastreabilidade
 */
export const auditLog = (action, details = {}) => {
  const timestamp = new Date().toISOString();

  console.log(`[AUDIT] ${timestamp} - ${action}`, {
    ...details,
    // NÃO INCLUIR tokens, senhas, ou dados sensíveis
  });
};

/**
 * Helper para sanitizar dados antes de logar
 */
export const sanitizeForLog = (data) => {
  if (!data) return data;

  const sanitized = { ...data };

  // Remover campos sensíveis
  const sensitiveFields = ['password', 'senha', 'token', 'authToken', 'jwt', 'secret'];

  sensitiveFields.forEach(field => {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};
