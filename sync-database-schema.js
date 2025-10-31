// Script para sincronizar esquema do banco local com PostgreSQL online
require('dotenv').config();
const { Pool } = require('pg');

async function syncDatabaseSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_7EADUX3QeGaO@ep-hidden-fog-ac2jlx9e-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Verificando estrutura das tabelas...\n');

    // Verificar estrutura de cada tabela
    const tables = ['usuarios_admin', 'emissoras', 'promocoes', 'participantes', 'ganhadores'];
    
    for (const tableName of tables) {
      console.log(`📋 Tabela: ${tableName}`);
      
      // Verificar se a tabela existe
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = $1
        )
      `, [tableName]);
      
      if (!tableExists.rows[0].exists) {
        console.log(`❌ Tabela ${tableName} não existe!`);
        continue;
      }

      // Listar colunas
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      console.log('Colunas existentes:');
      columns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
      });
      console.log();
    }

    // Criar/atualizar tabelas com schema completo
    console.log('🔧 Sincronizando tabelas...\n');

    // 1. Usuarios Admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios_admin (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Emissoras (com todos os campos de redes sociais)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS emissoras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        logo_url TEXT,
        tema_cor VARCHAR(50) DEFAULT 'branco',
        website TEXT,
        telefone VARCHAR(50),
        endereco TEXT,
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        youtube VARCHAR(255),
        linkedin VARCHAR(255),
        twitter VARCHAR(255),
        whatsapp VARCHAR(50),
        email VARCHAR(255),
        descricao TEXT
      )
    `);

    // Adicionar colunas de redes sociais se não existirem
    const socialColumns = [
      'website', 'telefone', 'endereco', 'instagram', 'facebook', 
      'youtube', 'linkedin', 'twitter', 'whatsapp', 'email', 'descricao'
    ];
    
    for (const column of socialColumns) {
      try {
        await pool.query(`ALTER TABLE emissoras ADD COLUMN ${column} TEXT`);
        console.log(`✅ Coluna ${column} adicionada à tabela emissoras`);
      } catch (error) {
        if (error.code !== '42701') { // Ignore "column already exists"
          console.log(`⚠️  Erro ao adicionar ${column}: ${error.message}`);
        }
      }
    }

    // 3. Promocoes (com slug e link_participacao)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS promocoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        descricao TEXT,
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'ativa',
        link_participacao TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar colunas slug e link_participacao se não existirem
    try {
      await pool.query(`ALTER TABLE promocoes ADD COLUMN slug VARCHAR(255)`);
      console.log(`✅ Coluna slug adicionada à tabela promocoes`);
    } catch (error) {
      if (error.code !== '42701') {
        console.log(`⚠️  Erro ao adicionar slug: ${error.message}`);
      }
    }

    try {
      await pool.query(`ALTER TABLE promocoes ADD COLUMN link_participacao TEXT`);
      console.log(`✅ Coluna link_participacao adicionada à tabela promocoes`);
    } catch (error) {
      if (error.code !== '42701') {
        console.log(`⚠️  Erro ao adicionar link_participacao: ${error.message}`);
      }
    }

    // Criar índice para slug
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_promocoes_slug ON promocoes (slug)`);
    } catch (error) {
      console.log(`⚠️  Erro ao criar índice slug: ${error.message}`);
    }

    // 4. Participantes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS participantes (
        id SERIAL PRIMARY KEY,
        promocao_id INTEGER NOT NULL,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(50) NOT NULL,
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        origem_source VARCHAR(255),
        origem_medium VARCHAR(255),
        participou_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (promocao_id) REFERENCES promocoes(id) ON DELETE CASCADE
      )
    `);

    // 5. Ganhadores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ganhadores (
        id SERIAL PRIMARY KEY,
        promocao_id INTEGER NOT NULL,
        participante_id INTEGER NOT NULL,
        sorteado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (promocao_id) REFERENCES promocoes(id),
        FOREIGN KEY (participante_id) REFERENCES participantes(id)
      )
    `);

    console.log('\n✅ Sincronização de schema concluída!');
    console.log('📊 Verificando dados de teste...\n');

    // Verificar se há dados
    for (const tableName of tables) {
      const count = await pool.query(`SELECT COUNT(*) as total FROM ${tableName}`);
      console.log(`${tableName}: ${count.rows[0].total} registros`);
    }

  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  } finally {
    await pool.end();
  }
}

syncDatabaseSchema();