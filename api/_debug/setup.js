const { Pool } = require('pg');
const { getSecureHeaders } = require('./_lib/security');

async function processCreateDatabaseMigration(req, res) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('=== INICIANDO MIGRAÇÃO DO BANCO DE DADOS ===');
    
    const migrations = [];

    // 1. Verificar se tabela usuarios existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      await pool.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          usuario VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      migrations.push('Tabela usuarios criada');
    }

    // 2. Verificar colunas existentes
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
    `);
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Colunas existentes:', existingColumns);

    // 3. Adicionar coluna role
    if (!existingColumns.includes('role')) {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
      migrations.push('Coluna role adicionada');
    }

    // 4. Adicionar coluna google_id
    if (!existingColumns.includes('google_id')) {
      try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE`);
        migrations.push('Coluna google_id adicionada com constraint UNIQUE');
      } catch (constraintError) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255)`);
        migrations.push('Coluna google_id adicionada (sem constraint UNIQUE devido a conflito)');
      }
    }

    // 5. Adicionar coluna email
    if (!existingColumns.includes('email')) {
      try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN email VARCHAR(255) UNIQUE`);
        migrations.push('Coluna email adicionada com constraint UNIQUE');
      } catch (constraintError) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN email VARCHAR(255)`);
        migrations.push('Coluna email adicionada (sem constraint UNIQUE devido a conflito)');
      }
    }

    // 6. Adicionar coluna name
    if (!existingColumns.includes('name')) {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN name VARCHAR(255)`);
      migrations.push('Coluna name adicionada');
    }

    // 7. Adicionar coluna picture
    if (!existingColumns.includes('picture')) {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN picture TEXT`);
      migrations.push('Coluna picture adicionada');
    }

    // 8. Verificar estrutura final
    const finalStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'usuarios' 
      ORDER BY ordinal_position
    `);

    // 9. Contar usuários
    const userCount = await pool.query('SELECT COUNT(*) as total FROM usuarios');

    await pool.end();

    res.status(200).json({
      success: true,
      message: 'Migração concluída com sucesso',
      migrations: migrations,
      structure: finalStructure.rows,
      userCount: parseInt(userCount.rows[0].total),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na migração:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro na migração: ' + error.message,
      error: error.stack 
    });
  }
}

async function processCreateTables(req, res) {
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Conectando ao banco...');
    const client = await pool.connect();

    // Criar tabela emissoras
    console.log('Criando tabela emissoras...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS emissoras (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        logo_url TEXT,
        tema_cor VARCHAR(7) DEFAULT '#007bff',
        website VARCHAR(255),
        telefone VARCHAR(20),
        instagram VARCHAR(255),
        facebook VARCHAR(255),
        youtube VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Criar tabela promocoes
    console.log('Criando tabela promocoes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS promocoes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        descricao TEXT,
        data_inicio DATE NOT NULL,
        data_fim DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'ativa',
        link_participacao TEXT,
        slug VARCHAR(255) UNIQUE,
        emissora_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Adicionar colunas que podem estar faltando (compatibilidade com versões antigas do PostgreSQL)
    console.log('Verificando e adicionando colunas faltantes...');
    
    const addColumnSafely = async (table, column, type, defaultValue = '') => {
      try {
        const checkColumn = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = $2;
        `, [table, column]);
        
        if (checkColumn.rows.length === 0) {
          const alterQuery = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultValue ? ' DEFAULT ' + defaultValue : ''};`;
          await client.query(alterQuery);
          console.log(`Coluna ${column} adicionada à tabela ${table}`);
        }
      } catch (error) {
        console.log(`Erro ao adicionar coluna ${column} em ${table}:`, error.message);
      }
    };

    await addColumnSafely('promocoes', 'emissora_id', 'INTEGER');
    await addColumnSafely('promocoes', 'slug', 'VARCHAR(255)');
    await addColumnSafely('participantes', 'latitude', 'DECIMAL(10, 8)');
    await addColumnSafely('participantes', 'longitude', 'DECIMAL(11, 8)');
    await addColumnSafely('participantes', 'promocao_id', 'INTEGER');
    await addColumnSafely('participantes', 'origem', 'VARCHAR(50)', "'formulario'");
    await addColumnSafely('participantes', 'email', 'VARCHAR(255)');
    await addColumnSafely('participantes', 'bairro', 'VARCHAR(255)');
    await addColumnSafely('participantes', 'cidade', 'VARCHAR(255)');

    // Criar tabela participantes
    console.log('Criando tabela participantes...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS participantes (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        telefone VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        bairro VARCHAR(255),
        cidade VARCHAR(255),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        promocao_id INTEGER REFERENCES promocoes(id),
        participou_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        origem VARCHAR(50) DEFAULT 'formulario'
      );
    `);

    // Inserir dados de exemplo
    console.log('Inserindo dados de exemplo...');
    
    // Inserir emissora padrão
    const emissora = await client.query(`
      INSERT INTO emissoras (nome, logo_url, tema_cor, website, telefone) 
      VALUES ('NexoGeo Radio', 'https://via.placeholder.com/200x100/007bff/ffffff?text=NexoGeo', '#007bff', 'https://nexogeo.com', '(11) 99999-9999')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let emissoraId = 1;
    if (emissora.rows.length > 0) {
      emissoraId = emissora.rows[0].id;
    } else {
      const existingEmissora = await client.query('SELECT id FROM emissoras LIMIT 1');
      if (existingEmissora.rows.length > 0) {
        emissoraId = existingEmissora.rows[0].id;
      }
    }

    // Inserir promoção de exemplo
    const promocao = await client.query(`
      INSERT INTO promocoes (nome, descricao, data_inicio, data_fim, status, slug, emissora_id) 
      VALUES (
        'Promoção de Exemplo', 
        'Uma promoção de teste para demonstração do sistema',
        CURRENT_DATE,
        CURRENT_DATE + INTERVAL '30 days',
        'ativa',
        'promocao-exemplo',
        $1
      )
      ON CONFLICT (slug) DO NOTHING
      RETURNING id;
    `, [emissoraId]);

    let promocaoId = 1;
    if (promocao.rows.length > 0) {
      promocaoId = promocao.rows[0].id;
    } else {
      const existingPromocao = await client.query('SELECT id FROM promocoes LIMIT 1');
      if (existingPromocao.rows.length > 0) {
        promocaoId = existingPromocao.rows[0].id;
      }
    }

    // Inserir participantes de exemplo
    const participantesExemplo = [
      { nome: 'João Silva', telefone: '(11) 99999-1111', cidade: 'São Paulo', bairro: 'Centro', lat: -23.5505, lng: -46.6333 },
      { nome: 'Maria Santos', telefone: '(11) 99999-2222', cidade: 'São Paulo', bairro: 'Vila Madalena', lat: -23.5368, lng: -46.6918 },
      { nome: 'Pedro Oliveira', telefone: '(11) 99999-3333', cidade: 'São Paulo', bairro: 'Ipanema', lat: -23.5629, lng: -46.6744 },
      { nome: 'Ana Costa', telefone: '(11) 99999-4444', cidade: 'Rio de Janeiro', bairro: 'Copacabana', lat: -22.9711, lng: -43.1822 }
    ];

    for (const participante of participantesExemplo) {
      await client.query(`
        INSERT INTO participantes (nome, telefone, cidade, bairro, latitude, longitude, promocao_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT DO NOTHING;
      `, [participante.nome, participante.telefone, participante.cidade, participante.bairro, participante.lat, participante.lng, promocaoId]);
    }

    // Verificar dados criados
    const emissoras = await client.query('SELECT COUNT(*) as total FROM emissoras');
    const promocoes = await client.query('SELECT COUNT(*) as total FROM promocoes');
    const participantes = await client.query('SELECT COUNT(*) as total FROM participantes');

    client.release();
    await pool.end();

    res.status(200).json({
      success: true,
      message: 'Todas as tabelas criadas com sucesso!',
      tables_created: ['emissoras', 'promocoes', 'participantes'],
      data: {
        emissoras: parseInt(emissoras.rows[0].total),
        promocoes: parseInt(promocoes.rows[0].total),
        participantes: parseInt(participantes.rows[0].total)
      }
    });

  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function processMigrateUsers(req, res) {
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Iniciando migração da tabela usuarios...');
    
    // Verificar se a tabela existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'usuarios'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Criar tabela completa se não existe
      await pool.query(`
        CREATE TABLE usuarios (
          id SERIAL PRIMARY KEY,
          usuario VARCHAR(255) UNIQUE NOT NULL,
          senha VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user',
          google_id VARCHAR(255) UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Tabela usuarios criada com todas as colunas');
    } else {
      // Verificar e adicionar colunas que faltam
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios'
      `);
      
      const existingColumns = columnsCheck.rows.map(row => row.column_name);
      console.log('Colunas existentes:', existingColumns);

      // Adicionar role se não existe
      if (!existingColumns.includes('role')) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
        console.log('Coluna role adicionada');
        
        // Atualizar registros existentes para ter role 'admin' se necessário
        await pool.query(`UPDATE usuarios SET role = 'admin' WHERE role IS NULL`);
      }

      // Adicionar google_id se não existe
      if (!existingColumns.includes('google_id')) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE`);
        console.log('Coluna google_id adicionada');
      }

      // Adicionar email se não existe (para futuro OAuth)
      if (!existingColumns.includes('email')) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN email VARCHAR(255) UNIQUE`);
        console.log('Coluna email adicionada');
      }

      // Adicionar name se não existe (para futuro OAuth)
      if (!existingColumns.includes('name')) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN name VARCHAR(255)`);
        console.log('Coluna name adicionada');
      }

      // Adicionar picture se não existe (para futuro OAuth)
      if (!existingColumns.includes('picture')) {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN picture TEXT`);
        console.log('Coluna picture adicionada');
      }
    }

    // Verificar estado final
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'usuarios'
      ORDER BY ordinal_position
    `);

    const userCount = await pool.query('SELECT COUNT(*) FROM usuarios');

    await pool.end();
    
    res.status(200).json({
      success: true,
      message: 'Migração concluída com sucesso',
      data: {
        columns: finalColumns.rows,
        userCount: parseInt(userCount.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Erro na migração:', error);
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error('Erro ao fechar pool:', poolError);
      }
    }
    res.status(500).json({ 
      success: false,
      message: 'Erro na migração: ' + error.message 
    });
  }
}

module.exports = async (req, res) => {
  // Configurar CORS seguro
  const secureHeaders = getSecureHeaders(req.headers.origin);
  Object.entries(secureHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Roteamento baseado no action query parameter
  const { action } = req.query;

  if (action === 'migrate-database') {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Método não permitido' });
      return;
    }
    return await processCreateDatabaseMigration(req, res);
    
  } else if (action === 'migrate-users') {
    if (req.method !== 'POST') {
      res.status(405).json({ message: 'Método não permitido' });
      return;
    }
    return await processMigrateUsers(req, res);
  } else if (action === 'create-tables' || !action) {
    // create-tables é o endpoint padrão
    return await processCreateTables(req, res);
  } else {
    res.status(400).json({ message: 'Ação não encontrada. Use ?action=create-tables ou ?action=migrate-users' });
  }
};