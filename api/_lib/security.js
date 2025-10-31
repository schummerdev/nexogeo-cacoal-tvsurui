// api/lib/security.js - Configurações de segurança centralizadas
const crypto = require('crypto');

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

// Rate limiting em memória (simples para Vercel)
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

module.exports = {
  getJWTSecret,
  getCORSOrigins,
  isValidOrigin,
  getSecureHeaders,
  checkRateLimit,
  generateSecureSecret
};