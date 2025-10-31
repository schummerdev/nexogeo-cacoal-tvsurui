// api/lib/database.js - Pool singleton de conexões PostgreSQL
const { Pool } = require('pg');

class DatabasePool {
  constructor() {
    this.pool = null;
    this.isConnecting = false;
  }

  async getPool() {
    if (this.pool) {
      return this.pool;
    }

    if (this.isConnecting) {
      // Aguarda a conexão já em andamento
      while (this.isConnecting) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.pool;
    }

    this.isConnecting = true;
    
    try {
      console.log('🔄 Criando pool singleton de conexões PostgreSQL...');
      
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // máximo de conexões no pool
        min: 2,  // mínimo de conexões mantidas
        idle: 10000, // tempo para fechar conexões idle (10s)
        connectionTimeoutMillis: 10000, // timeout para obter conexão
        idleTimeoutMillis: 30000, // tempo para remover conexão idle
      });

      // Eventos de monitoramento
      this.pool.on('connect', (client) => {
        console.log('✅ Nova conexão estabelecida:', client.processID);
      });

      this.pool.on('error', (err) => {
        console.error('❌ Erro no pool de conexões:', err);
        // Em caso de erro crítico, recria o pool
        this.pool = null;
        this.isConnecting = false;
      });

      this.pool.on('remove', (client) => {
        console.log('➖ Conexão removida do pool:', client.processID);
      });

      // Testa a conexão
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('✅ Pool singleton PostgreSQL inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar pool PostgreSQL:', error);
      this.pool = null;
      throw error;
    } finally {
      this.isConnecting = false;
    }

    return this.pool;
  }

  async query(text, params) {
    const pool = await this.getPool();
    return pool.query(text, params);
  }

  async getClient() {
    const pool = await this.getPool();
    return pool.connect();
  }

  async closePool() {
    if (this.pool) {
      console.log('🔄 Fechando pool de conexões...');
      await this.pool.end();
      this.pool = null;
      console.log('✅ Pool fechado com sucesso');
    }
  }

  // Método para obter estatísticas do pool
  getPoolStats() {
    if (!this.pool) return null;
    
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.pool.options.max,
      minConnections: this.pool.options.min
    };
  }

  // Verificação de saúde do pool
  async healthCheck() {
    try {
      const pool = await this.getPool();
      const client = await pool.connect();
      await client.query('SELECT 1 as health');
      client.release();
      return { healthy: true, stats: this.getPoolStats() };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

// Exportar instância singleton
const databasePool = new DatabasePool();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Recebido SIGINT, fechando pool de conexões...');
  await databasePool.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Recebido SIGTERM, fechando pool de conexões...');
  await databasePool.closePool();
  process.exit(0);
});

module.exports = databasePool;