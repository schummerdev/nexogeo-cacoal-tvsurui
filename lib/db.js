// lib/db.js - Conexão com PostgreSQL Neon
const { Pool } = require('pg');

// String de conexão a partir de variável de ambiente
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Configuração do pool de conexões
// 🔐 SEGURANÇA: Configuração SSL segura
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: true, // ✅ Valida certificados SSL (previne MITM)
    // Se Neon requerer CA específico, adicione: ca: process.env.DATABASE_CA_CERT
  }
});

// Função para executar queries
async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Erro na query do banco:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Função para testar conexão
async function testConnection() {
  try {
    const result = await query('SELECT NOW() as current_time, version() as version');
    return {
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Erro ao conectar com o banco:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Função para criar tabelas se não existirem
async function initDatabase() {
  try {
    // Tabela de usuários/administradores
    await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(100) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de configurações da emissora
    await query(`
      CREATE TABLE IF NOT EXISTS configuracoes_emissora (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200),
        logo_url TEXT,
        tema_cor VARCHAR(50) DEFAULT 'nexogeo',
        website VARCHAR(200),
        telefone VARCHAR(50),
        endereco TEXT,
        instagram VARCHAR(200),
        facebook VARCHAR(200),
        youtube VARCHAR(200),
        linkedin VARCHAR(200),
        twitter VARCHAR(200),
        whatsapp VARCHAR(50),
        email VARCHAR(200),
        descricao TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de promoções
    await query(`
      CREATE TABLE IF NOT EXISTS promocoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        descricao TEXT,
        status VARCHAR(20) DEFAULT 'ativo',
        data_inicio DATE,
        data_fim DATE,
        participantes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de participantes
    await query(`
      CREATE TABLE IF NOT EXISTS participantes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(200) NOT NULL,
        email VARCHAR(200),
        telefone VARCHAR(50),
        bairro VARCHAR(100),
        cidade VARCHAR(100),
        promocao_id INTEGER REFERENCES promocoes(id),
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem_source VARCHAR(100),
        origem_medium VARCHAR(100)
      );
    `);

    // Inserir dados iniciais se não existirem
    const adminExists = await query('SELECT COUNT(*) FROM usuarios WHERE usuario = $1', ['admin']);
    if (parseInt(adminExists.rows[0].count) === 0) {
      // 🔐 SEGURANÇA: Gerar senha aleatória forte ao invés de senha padrão
      const bcrypt = require('bcrypt');
      const crypto = require('crypto');

      // Gera senha aleatória de 16 caracteres
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await query(`
        INSERT INTO usuarios (usuario, senha_hash, role)
        VALUES ('admin', $1, 'admin');
      `, [hashedPassword]);

      // ⚠️ IMPORTANTE: Exibir senha temporária APENAS no primeiro deploy
      console.log('\n' + '='.repeat(70));
      console.log('🔐 USUÁRIO ADMIN CRIADO COM SUCESSO!');
      console.log('='.repeat(70));
      console.log('Usuário: admin');
      console.log('Senha temporária:', tempPassword);
      console.log('='.repeat(70));
      console.log('⚠️  MUDE A SENHA IMEDIATAMENTE APÓS O PRIMEIRO LOGIN!');
      console.log('='.repeat(70) + '\n');
    }

    const configExists = await query('SELECT COUNT(*) FROM configuracoes_emissora');
    if (parseInt(configExists.rows[0].count) === 0) {
      await query(`
        INSERT INTO configuracoes_emissora (nome, website, telefone, email, descricao)
        VALUES (
          'NexoGeo Sistema',
          'https://nexogeo.com.br',
          '(11) 99999-9999',
          'contato@nexogeo.com.br',
          'Sistema de Gerenciamento de Promoções'
        );
      `);
    }

    // === TABELAS DA CAIXA MISTERIOSA ===
    console.log('🎮 Inicializando tabelas da Caixa Misteriosa...');

    // Tabela de patrocinadores
    await query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de produtos
    await query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sponsor_id INTEGER NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        clues TEXT[] NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela de jogos/sorteios
    await query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        revealed_clues_count INTEGER NOT NULL DEFAULT 0,
        winner_submission_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Tabela de palpites dos participantes
    await query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        user_neighborhood VARCHAR(255) NOT NULL,
        user_city VARCHAR(255) NOT NULL,
        guess VARCHAR(255) NOT NULL,
        is_correct BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adicionar chave estrangeira para ganhador (se não existir)
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_winner_submission'
          ) THEN
            ALTER TABLE games
            ADD CONSTRAINT fk_winner_submission
            FOREIGN KEY (winner_submission_id)
            REFERENCES submissions(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    } catch (fkError) {
      console.log('⚠️ Chave estrangeira já existe ou erro:', fkError.message);
    }

    // Criar índices para performance (se não existirem)
    await query(`CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_submissions_game_id ON submissions(game_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_products_sponsor_id ON products(sponsor_id);`);

    // Inserir dados de exemplo se não existirem
    const sponsorExists = await query('SELECT COUNT(*) FROM sponsors');
    if (parseInt(sponsorExists.rows[0].count) === 0) {
      console.log('📝 Inserindo dados de exemplo da Caixa Misteriosa...');

      // Inserir patrocinador de exemplo
      const sponsorResult = await query(`
        INSERT INTO sponsors (name)
        VALUES ('Refrio')
        RETURNING id;
      `);

      const sponsorId = sponsorResult.rows[0].id;

      // Inserir produto de exemplo
      await query(`
        INSERT INTO products (sponsor_id, name, clues)
        VALUES ($1, 'geladeira', ARRAY['Eletrônico', 'Para cozinha', 'Gela comida', 'Refrio', 'Modelo 2024']);
      `, [sponsorId]);
    }

    // === TABELAS PARA PARTICIPANTES PÚBLICOS E REFERÊNCIA ===
    console.log('👥 Criando tabelas para participantes públicos...');

    // Tabela para participantes públicos (sem login)
    await query(`
      CREATE TABLE IF NOT EXISTS public_participants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        neighborhood VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 8), -- Geolocalização: latitude
        longitude DECIMAL(11, 8), -- Geolocalização: longitude
        referral_code VARCHAR(50), -- Código que usou para chegar
        referred_by_id INTEGER,
        own_referral_code VARCHAR(50) UNIQUE, -- Código próprio para compartilhar
        extra_guesses INTEGER DEFAULT 0, -- Palpites extras ganhos
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela para rastrear recompensas de referência
    await query(`
      CREATE TABLE IF NOT EXISTS referral_rewards (
        id SERIAL PRIMARY KEY,
        referrer_id INTEGER REFERENCES public_participants(id),
        referred_id INTEGER REFERENCES public_participants(id),
        reward_granted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Modificar tabela submissions para incluir participante público e número do palpite
    try {
      await query(`
        DO $$
        BEGIN
          -- Adicionar coluna para participante público se não existir
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'public_participant_id'
          ) THEN
            ALTER TABLE submissions
            ADD COLUMN public_participant_id INTEGER REFERENCES public_participants(id);
          END IF;

          -- Adicionar coluna para número do palpite se não existir
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'submissions' AND column_name = 'submission_number'
          ) THEN
            ALTER TABLE submissions
            ADD COLUMN submission_number INTEGER DEFAULT 1;
          END IF;
        END $$;
      `);
    } catch (alterError) {
      console.log('⚠️ Erro ao modificar tabela submissions:', alterError.message);
    }

    // Adicionar referência circular para public_participants
    try {
      await query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_public_participants_referred_by'
          ) THEN
            ALTER TABLE public_participants
            ADD CONSTRAINT fk_public_participants_referred_by
            FOREIGN KEY (referred_by_id)
            REFERENCES public_participants(id)
            ON DELETE SET NULL;
          END IF;
        END $$;
      `);
    } catch (fkError) {
      console.log('⚠️ Chave estrangeira para referência já existe ou erro:', fkError.message);
    }

    // Criar índices para performance
    await query(`CREATE INDEX IF NOT EXISTS idx_public_participants_phone ON public_participants(phone);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_public_participants_referral_code ON public_participants(own_referral_code);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_submissions_public_participant ON submissions(public_participant_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id);`);

    console.log('✅ Tabelas da Caixa Misteriosa criadas com sucesso!');
    console.log('✅ Tabelas para participantes públicos criadas com sucesso!');

    return { success: true, message: 'Banco inicializado com sucesso - incluindo Caixa Misteriosa e participantes públicos' };
  } catch (error) {
    console.error('Erro ao inicializar banco:', error);
    return { success: false, error: error.message };
  }
}

// Exportar funções e pool
module.exports = {
  query,
  testConnection,
  initDatabase,
  pool
};