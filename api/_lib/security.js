// api/_lib/security.js - Configurações de segurança centralizadas
// ✅ SEGURANÇA: Rate limiting persistente em PostgreSQL (previne ataques através de restarts)
const crypto = require('crypto');
// ⚠️ IMPORTANTE: query é importada DENTRO das funções que a usam, não no top-level
// Isto evita falhas de carregamento do módulo se lib/db.js não estiver pronto

// Gerar JWT_SECRET forte se não estiver definido
const generateSecureSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Obter JWT_SECRET seguro
const getJWTSecret = () => {
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️ JWT_SECRET não definido. Gerando temporário (use variável de ambiente em produção)');
    // Em produção, isso deveria falhar, mas para desenvolvimento geramos um temporário
    return process.env.NODE_ENV === 'production'
      ? (() => { throw new Error('JWT_SECRET é obrigatório em produção'); })()
      : generateSecureSecret();
  }

  // Verificar se o secret é forte o suficiente
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
  }

  return process.env.JWT_SECRET;
};

// Configurações CORS seguras
const getCORSOrigins = () => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'https://nexogeo2.vercel.app'];

  return allowedOrigins;
};

// Validar origem CORS
const isValidOrigin = (origin) => {
  if (!origin) return false; // Bloquer requests sem origem

  const allowedOrigins = getCORSOrigins();
  return allowedOrigins.includes(origin);
};

// Headers seguros padrão
const getSecureHeaders = (origin = null) => {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };

  // CORS dinâmico baseado na origem
  if (origin && isValidOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  } else {
    // Fallback para desenvolvimento local
    headers['Access-Control-Allow-Origin'] = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://nexogeo2.vercel.app';
  }

  headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With';
  headers['Access-Control-Allow-Credentials'] = 'true';
  headers['Access-Control-Max-Age'] = '86400';

  return headers;
};

// ✅ SEGURANÇA: Rate limiting em memória (fallback legado - para desenvolvimento)
const rateLimitStore = new Map();

const checkRateLimit = (clientId, maxRequests = 100, windowMs = 60000) => {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Limpar entradas antigas
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.lastRequest < windowStart) {
      rateLimitStore.delete(key);
    }
  }

  const clientData = rateLimitStore.get(clientId) || { count: 0, firstRequest: now, lastRequest: now };

  // Reset window se necessário
  if (clientData.firstRequest < windowStart) {
    clientData.count = 0;
    clientData.firstRequest = now;
  }

  clientData.count++;
  clientData.lastRequest = now;
  rateLimitStore.set(clientId, clientData);

  return {
    allowed: clientData.count <= maxRequests,
    count: clientData.count,
    remaining: Math.max(0, maxRequests - clientData.count),
    resetTime: clientData.firstRequest + windowMs
  };
};

// ✅ SEGURANÇA: Extrair IP do cliente (suporta x-forwarded-for com múltiplos IPs)
const extractClientIp = (req) => {
  let ip = req.headers['x-forwarded-for'] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';

  // x-forwarded-for pode ter múltiplos IPs separados por vírgula
  // Pegar apenas o primeiro IP real do cliente
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim();
  }

  return ip;
};

// ✅ SEGURANÇA: Rate limiting persistente em PostgreSQL
/**
 * Verifica e aplica rate limiting persistente usando PostgreSQL
 *
 * Padrão fail-open: se o banco falhar, permite a requisição (melhor UX que bloquear por erro)
 * Probabilistic cleanup: 10% chance de limpar registros antigos a cada chamada
 *
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {number} maxRequests - Máximo de requisições permitidas
 * @param {number} windowMs - Janela de tempo em ms (ex: 60000 = 1 minuto)
 * @param {string} endpoint - Nome do endpoint para identificação
 * @returns {null|true} null se permitido, true se bloqueado (resposta 429 já enviada)
 */
const rateLimit = async (req, res, maxRequests, windowMs, endpoint) => {
  try {
    // ⚠️ Importar query lazily para evitar problemas de carregamento do módulo
    let query;
    try {
      query = require('../../lib/db').query;  // ✅ FIXADO: caminho correto ../../lib/db (não ../lib/db)
    } catch (dbError) {
      console.error('[SECURITY] ⚠️ Erro ao carregar db.js em rate limiting:', dbError.message);
      // Fail-open: permitir requisição se DB não estiver disponível
      return null;
    }

    // Extrair IP e user_id
    const ip = extractClientIp(req);
    const userId = req.user?.id || null;

    // Calcular tempo da janela
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    // Contar requisições recentes no banco
    const countResult = await query(
      `SELECT COUNT(*) as request_count FROM rate_limits
       WHERE ip = $1 AND user_id IS NOT DISTINCT FROM $2 AND endpoint = $3 AND created_at > $4`,
      [ip, userId, endpoint, windowStart]
    );

    const requestCount = parseInt(countResult.rows[0].request_count) || 0;

    // Preparar headers de rate limit
    const resetTime = new Date(windowStart.getTime() + windowMs).toISOString();
    const remaining = Math.max(0, maxRequests - requestCount - 1);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', resetTime);

    // Se ultrapassou limite, retornar 429
    if (requestCount >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Muitas requisições. Tente novamente em alguns momentos.',
        retryAfter: Math.ceil((new Date(resetTime).getTime() - now.getTime()) / 1000)
      }) || true; // Indica que foi bloqueado
    }

    // Inserir este request no banco
    await query(
      `INSERT INTO rate_limits (ip, user_id, endpoint, created_at) VALUES ($1, $2, $3, $4)`,
      [ip, userId, endpoint, now]
    );

    // Probabilistic cleanup: 10% chance de limpar registros antigos
    if (Math.random() < 0.1) {
      // Executar cleanup em background (sem await)
      query('SELECT cleanup_old_rate_limits()').catch(err =>
        console.error('❌ Erro no cleanup de rate limits:', err.message)
      );
    }

    return null; // Permitido
  } catch (error) {
    // ✅ Padrão fail-open: se o banco falhar, permitir requisição
    console.error('⚠️ Erro no rate limiting persistente:', error.message);
    console.error('   Permitindo requisição por fail-open pattern');
    return null; // Permitir requisição mesmo com erro
  }
};

// ✅ SEGURANÇA: Rate limiting específico para login (5 req / 15 min)
const rateLimitLogin = async (req, res) => {
  return await rateLimit(req, res, 5, 15 * 60 * 1000, 'auth_login');
};

// ✅ SEGURANÇA: Rate limiting específico para sorteios (3 req / 5 min)
const rateLimitSorteio = async (req, res) => {
  return await rateLimit(req, res, 3, 5 * 60 * 1000, 'sorteio_sortear');
};

// ✅ SEGURANÇA: Rate limiting para criação de registros (10 req / 1 min)
const rateLimitCreate = async (req, res) => {
  return await rateLimit(req, res, 10, 60 * 1000, 'criar_registro');
};

// ✅ SEGURANÇA: Rate limiting global (100 req / 1 min)
const rateLimitGlobal = async (req, res) => {
  return await rateLimit(req, res, 100, 60 * 1000, 'global');
};

module.exports = {
  getJWTSecret,
  getCORSOrigins,
  isValidOrigin,
  getSecureHeaders,
  checkRateLimit,
  generateSecureSecret,
  extractClientIp,
  rateLimit,
  rateLimitLogin,
  rateLimitSorteio,
  rateLimitCreate,
  rateLimitGlobal
};