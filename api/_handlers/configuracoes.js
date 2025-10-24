const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const { getSecureHeaders } = require('./_lib/security');

async function processEmissoras(req, res) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    if (req.method === 'GET') {
      // Verificar se tabela existe primeiro
      try {
        // Verificar se a tabela existe
        await pool.query(`SELECT 1 FROM emissoras LIMIT 1`);
        
        // Tabela existe, buscar dados
        const result = await pool.query(`SELECT * FROM emissoras ORDER BY id ASC LIMIT 1`);
        
        if (result.rows.length > 0) {
          await pool.end();
          res.status(200).json({ success: true, data: result.rows[0] });
          return;
        }
      } catch (tableError) {
        // Tabela não existe, usar dados mock
      }
      
      // Se não encontrou dados, retornar dados mock
      const mockData = { 
        id: 1, 
        nome: 'Radio Surui FM', 
        descricao: 'Emissora principal da região',
        logo_url: '/images/radio-surui-logo.png',
        tema_cor: '#FF6B35',
        website: 'https://radiosurui.com.br',
        telefone: '(11) 99999-9999',
        instagram: '@radiosurui',
        facebook: 'RadioSuruiFM',
        youtube: '@RadioSuruiFM'
      };
      
      await pool.end();
      res.status(200).json({ success: true, data: mockData });
      
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { nome, descricao } = JSON.parse(body);
          
          if (!nome) {
            await pool.end();
            res.status(400).json({ message: 'Nome da emissora é obrigatório' });
            return;
          }

          const result = await pool.query(`
            INSERT INTO emissoras (nome, descricao) 
            VALUES ($1, $2) 
            RETURNING *
          `, [nome, descricao]);
          
          await pool.end();
          res.status(201).json({ success: true, data: result.rows[0] });
          
        } catch (parseError) {
          await pool.end();
          res.status(400).json({ message: 'Dados inválidos' });
        }
      });

    } else if (req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          
          // Verificar se a tabela existe, se não criar
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS emissoras (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                descricao TEXT,
                logo_url TEXT,
                tema_cor VARCHAR(7) DEFAULT '#007bff',
                website VARCHAR(255),
                telefone VARCHAR(20),
                instagram VARCHAR(255),
                facebook VARCHAR(255),
                youtube VARCHAR(255),
                linkedin VARCHAR(255),
                twitter VARCHAR(255),
                whatsapp VARCHAR(20),
                email VARCHAR(255),
                endereco TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          } catch (createError) {
          }

          // Tentar atualizar registro existente ou inserir novo
          let result;
          try {
            result = await pool.query(`
              UPDATE emissoras 
              SET nome = $1, descricao = $2, logo_url = $3, tema_cor = $4, 
                  website = $5, telefone = $6, instagram = $7, facebook = $8, 
                  youtube = $9, linkedin = $10, twitter = $11, whatsapp = $12, 
                  email = $13, endereco = $14
              WHERE id = 1
              RETURNING *
            `, [
              data.nome, data.descricao || '', data.logoUrl || '', data.temaCor || '#007bff',
              data.website || '', data.telefone || '', data.instagram || '', data.facebook || '',
              data.youtube || '', data.linkedin || '', data.twitter || '', data.whatsapp || '',
              data.email || '', data.endereco || ''
            ]);
            

            if (result.rows.length === 0) {
              // Se não atualizou nenhum registro, inserir novo
              result = await pool.query(`
                INSERT INTO emissoras (nome, descricao, logo_url, tema_cor, website, telefone, 
                                     instagram, facebook, youtube, linkedin, twitter, whatsapp, email, endereco)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING *
              `, [
                data.nome, data.descricao || '', data.logoUrl || '', data.temaCor || '#007bff',
                data.website || '', data.telefone || '', data.instagram || '', data.facebook || '',
                data.youtube || '', data.linkedin || '', data.twitter || '', data.whatsapp || '',
                data.email || '', data.endereco || ''
              ]);
            } else {
            }
          } catch (updateError) {
            console.error('❌ Erro ao atualizar emissora:', updateError);
            await pool.end();
            res.status(500).json({ message: 'Erro ao salvar configurações da emissora' });
            return;
          }
          
          await pool.end();
          res.status(200).json({ success: true, data: result.rows[0] });
          
        } catch (parseError) {
          await pool.end();
          res.status(400).json({ message: 'Dados inválidos' });
        }
      });
      
    } else {
      await pool.end();
      res.status(405).json({ message: 'Método não permitido' });
    }
  } catch (error) {
    console.error('Erro na API emissoras:', error);
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error('Erro ao fechar pool:', poolError);
      }
    }
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function processAdministradores(req, res) {
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    if (req.method === 'GET') {
      
      // Verificar/criar tabela usuarios (versão simples)
      try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id SERIAL PRIMARY KEY,
            usuario VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (createError) {
      }
      
      // Primeiro verificar se a coluna role existe
      try {
        await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
      } catch (roleError) {
        // Coluna já existe, ignorar erro
      }

      // Buscar usuários administradores com role
      const result = await pool.query(`
        SELECT id, usuario, COALESCE(role, 'user') as role, created_at
        FROM usuarios 
        ORDER BY created_at DESC
      `);
      
      await pool.end();
      res.status(200).json({ 
        success: true, 
        data: result.rows 
      });
      
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { usuario, senha, role = 'user' } = JSON.parse(body);
          
          if (!usuario || !senha) {
            await pool.end();
            res.status(400).json({ message: 'Usuário e senha são obrigatórios' });
            return;
          }

          // Verificar/criar tabela usuarios
          try {
            await pool.query(`
              CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                usuario VARCHAR(255) UNIQUE NOT NULL,
                senha VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              )
            `);
          } catch (createError) {
              }
          
          // Tentar adicionar colunas individualmente
          try {
            await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
          } catch (roleError) {
            if (!roleError.message.includes('already exists')) {
            }
          }
          
          try {
            await pool.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(255) UNIQUE`);
          } catch (googleError) {
            if (!googleError.message.includes('already exists')) {
            }
          }

          const hashedPassword = await bcryptjs.hash(senha, 10);

          const result = await pool.query(`
            INSERT INTO usuarios (usuario, senha, role) 
            VALUES ($1, $2, $3) 
            RETURNING id, usuario, COALESCE(role, 'user') as role, created_at
          `, [usuario, hashedPassword, role]);
          
          await pool.end();
          res.status(201).json({ 
            success: true, 
            data: result.rows[0],
            message: 'Administrador criado com sucesso'
          });
          
        } catch (parseError) {
          await pool.end();
          console.error('Erro POST administradores:', parseError);
          res.status(400).json({ message: 'Dados inválidos: ' + parseError.message });
        }
      });
      
    } else if (req.method === 'PUT') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      
      if (!id) {
        await pool.end();
        res.status(400).json({ message: 'ID é obrigatório para atualização' });
        return;
      }

      let body = '';
      req.on('data', chunk => body += chunk.toString());
      req.on('end', async () => {
        try {
          const { usuario, role } = JSON.parse(body);
          
          if (!usuario) {
            await pool.end();
            res.status(400).json({ message: 'Usuário é obrigatório' });
            return;
          }

          // Primeiro verificar se a coluna role existe
          try {
            await pool.query(`ALTER TABLE usuarios ADD COLUMN role VARCHAR(50) DEFAULT 'user'`);
          } catch (roleError) {
            // Coluna já existe, ignorar erro
          }

          const result = await pool.query(`
            UPDATE usuarios 
            SET usuario = $1, role = $2
            WHERE id = $3 
            RETURNING id, usuario, COALESCE(role, 'user') as role, created_at
          `, [usuario, role || 'user', id]);
          
          await pool.end();
          if (result.rows.length === 0) {
            res.status(404).json({ message: 'Administrador não encontrado' });
          } else {
            res.status(200).json({ 
              success: true, 
              data: result.rows[0],
              message: 'Administrador atualizado com sucesso'
            });
          }
          
        } catch (parseError) {
          await pool.end();
          res.status(400).json({ message: 'Dados inválidos: ' + parseError.message });
        }
      });
      
    } else if (req.method === 'DELETE') {
      const url = new URL(req.url, 'http://localhost');
      const id = url.searchParams.get('id');
      
      if (!id) {
        await pool.end();
        res.status(400).json({ message: 'ID é obrigatório para exclusão' });
        return;
      }

      const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, usuario', [id]);
      
      await pool.end();
      if (result.rows.length === 0) {
        res.status(404).json({ message: 'Administrador não encontrado' });
      } else {
        res.status(200).json({ 
          success: true, 
          message: `Administrador ${result.rows[0].usuario} excluído com sucesso`
        });
      }
      
    } else {
      await pool.end();
      res.status(405).json({ message: 'Método não permitido' });
    }
    
  } catch (error) {
    console.error('Erro na API configuracoes/administradores:', error);
    if (pool) {
      try {
        await pool.end();
      } catch (poolError) {
        console.error('Erro ao fechar pool:', poolError);
      }
    }
    res.status(500).json({ message: 'Erro interno do servidor: ' + error.message });
  }
}

module.exports = async (req, res) => {
  
  // Configurar CORS seguro
  const secureHeaders = getSecureHeaders(req.headers.origin);
  Object.entries(secureHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Roteamento baseado no endpoint
  const { type } = req.query;

  if (type === 'emissora') {
    return await processEmissoras(req, res);
  } else if (type === 'administradores') {
    return await processAdministradores(req, res);
  } else {
    res.status(400).json({ message: 'Tipo de configuração não especificado. Use ?type=emissora ou ?type=administradores' });
  }
};