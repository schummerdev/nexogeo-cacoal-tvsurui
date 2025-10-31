// api/lib/cache.js - Sistema de cache Redis/Memória para Vercel
const crypto = require('crypto');

// Cache em memória para desenvolvimento/fallback
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.expiration = new Map();
    
    // Limpar entradas expiradas a cada 5 minutos
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    
    const value = this.cache.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttlSeconds = 3600) {
    this.cache.set(key, JSON.stringify(value));
    this.expiration.set(key, Date.now() + (ttlSeconds * 1000));
  }

  async delete(key) {
    this.cache.delete(key);
    this.expiration.delete(key);
  }

  async exists(key) {
    return this.cache.has(key) && !this.isExpired(key);
  }

  isExpired(key) {
    const expireTime = this.expiration.get(key);
    return expireTime && Date.now() > expireTime;
  }

  cleanup() {
    let cleaned = 0;
    for (const [key, expireTime] of this.expiration.entries()) {
      if (Date.now() > expireTime) {
        this.cache.delete(key);
        this.expiration.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`🧹 Limpeza de cache: ${cleaned} entradas removidas`);
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      type: 'memory',
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Cache Redis para produção
class RedisCache {
  constructor() {
    this.client = null;
    this.isConnecting = false;
    this.connected = false;
  }

  async getClient() {
    if (this.client && this.connected) {
      return this.client;
    }

    if (this.isConnecting) {
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.client;
    }

    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL não configurado');
    }

    this.isConnecting = true;

    try {
      // Usar biblioteca Redis compatível com Vercel
      const redis = require('redis');
      
      this.client = redis.createClient({
        url: process.env.REDIS_URL,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        },
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis recusou conexão');
            return new Error('Redis recusou conexão');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Tempo limite de retry do Redis atingido');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('error', (err) => {
        console.error('❌ Erro no cliente Redis:', err);
        this.connected = false;
      });

      this.client.on('connect', () => {
        console.log('✅ Conectado ao Redis');
        this.connected = true;
      });

      this.client.on('end', () => {
        console.log('➖ Conexão Redis encerrada');
        this.connected = false;
      });

      await this.client.connect();
      
      console.log('✅ Redis inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao conectar Redis:', error.message);
      this.client = null;
      this.connected = false;
      throw error;
    } finally {
      this.isConnecting = false;
    }

    return this.client;
  }

  async get(key) {
    try {
      const client = await this.getClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('❌ Erro ao buscar do Redis:', error.message);
      return null;
    }
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      const client = await this.getClient();
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('❌ Erro ao salvar no Redis:', error.message);
      throw error;
    }
  }

  async delete(key) {
    try {
      const client = await this.getClient();
      await client.del(key);
    } catch (error) {
      console.error('❌ Erro ao deletar do Redis:', error.message);
    }
  }

  async exists(key) {
    try {
      const client = await this.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('❌ Erro ao verificar existência no Redis:', error.message);
      return false;
    }
  }

  getStats() {
    return {
      connected: this.connected,
      type: 'redis',
    };
  }
}

// Cache Manager - Decidir entre Redis e Memory
class CacheManager {
  constructor() {
    this.cache = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Tentar Redis primeiro se configurado
      if (process.env.REDIS_URL) {
        console.log('🔄 Tentando conectar ao Redis...');
        this.cache = new RedisCache();
        await this.cache.getClient();
        console.log('✅ Cache Redis ativo');
      } else {
        throw new Error('Redis não configurado, usando cache em memória');
      }
    } catch (error) {
      console.log('⚠️ Redis indisponível, usando cache em memória:', error.message);
      this.cache = new MemoryCache();
      console.log('✅ Cache em memória ativo');
    }

    this.initialized = true;
  }

  async get(key) {
    await this.initialize();
    return this.cache.get(key);
  }

  async set(key, value, ttlSeconds = 3600) {
    await this.initialize();
    return this.cache.set(key, value, ttlSeconds);
  }

  async delete(key) {
    await this.initialize();
    return this.cache.delete(key);
  }

  async exists(key) {
    await this.initialize();
    return this.cache.exists(key);
  }

  // Utilitários para cache de queries
  generateQueryKey(table, query, params = []) {
    const queryHash = crypto.createHash('md5').update(query + JSON.stringify(params)).digest('hex');
    return `query:${table}:${queryHash}`;
  }

  generateKey(prefix, ...parts) {
    return [prefix, ...parts].join(':');
  }

  // Cache específico para promoções
  async cachePromocoes(promocoes, ttlSeconds = 300) { // 5 minutos
    const key = 'promocoes:list';
    await this.set(key, promocoes, ttlSeconds);
  }

  async getCachedPromocoes() {
    const key = 'promocoes:list';
    return this.get(key);
  }

  async invalidatePromocoes() {
    const key = 'promocoes:list';
    await this.delete(key);
  }

  // Cache específico para participantes
  async cacheParticipantes(promocaoId, participantes, ttlSeconds = 180) { // 3 minutos
    const key = `participantes:promocao:${promocaoId}`;
    await this.set(key, participantes, ttlSeconds);
  }

  async getCachedParticipantes(promocaoId) {
    const key = `participantes:promocao:${promocaoId}`;
    return this.get(key);
  }

  async invalidateParticipantes(promocaoId) {
    const key = `participantes:promocao:${promocaoId}`;
    await this.delete(key);
  }

  // Cache para estatísticas do dashboard
  async cacheDashboardStats(stats, ttlSeconds = 600) { // 10 minutos
    const key = 'dashboard:stats';
    await this.set(key, stats, ttlSeconds);
  }

  async getCachedDashboardStats() {
    const key = 'dashboard:stats';
    return this.get(key);
  }

  getStats() {
    return this.cache ? this.cache.getStats() : { type: 'not_initialized' };
  }

  // Health check
  async healthCheck() {
    try {
      const testKey = 'health:check';
      const testValue = { timestamp: Date.now() };
      
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);
      
      const healthy = retrieved && retrieved.timestamp === testValue.timestamp;
      
      return {
        healthy,
        stats: this.getStats(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Exportar instância singleton
const cacheManager = new CacheManager();

module.exports = cacheManager;