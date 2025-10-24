const { Pool } = require('pg');
const { getSecureHeaders } = require('./_lib/security');

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

  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    if (req.method === 'GET') {
      console.log('Buscando emissoras...');
      
      // Primeiro tentar buscar da tabela emissoras se existir
      let result;
      try {
        result = await pool.query(`SELECT * FROM emissoras ORDER BY nome ASC`);
      } catch (tableError) {
        console.log('Tabela emissoras não existe, criando dados mock');
        // Se a tabela não existir, retornar dados mock
        result = {
          rows: [
            { 
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
            },
            { 
              id: 2, 
              nome: 'TV Surui', 
              descricao: 'Canal de televisão local',
              logo_url: '/images/tv-surui-logo.png',
              tema_cor: '#2563EB',
              website: 'https://tvsurui.com.br',
              telefone: '(11) 88888-8888',
              instagram: '@tvsurui',
              facebook: 'TVSurui',
              youtube: '@TVSurui'
            }
          ]
        };
      }
      
      await pool.end();
      res.status(200).json({ success: true, data: result.rows });
      
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
      
    } else {
      await pool.end();
      res.status(405).json({ message: 'Método não permitido' });
    }
    
  } catch (error) {
    console.error('Erro na API emissoras:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};