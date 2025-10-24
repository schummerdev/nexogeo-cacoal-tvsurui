// API consolidada para resolver limite Vercel (12 funções max)
// Fix: Caminhos de import corrigidos para _handlers/ subfolder
const { query, testConnection, initDatabase } = require('../lib/db.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Verificar se JWT_SECRET existe
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const { getAuthenticatedUser } = require('./_handlers/authHelper.js');
const { checkRateLimit } = require('./_lib/security');
const participantesHandler = require('./_handlers/participantes.js');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // 🔐 SEGURANÇA: Rate limiting global
  const clientId = req.headers['x-forwarded-for'] ||
                   req.connection?.remoteAddress ||
                   req.socket?.remoteAddress ||
                   'unknown';

  // Rate limit mais permissivo em desenvolvimento para evitar erro 429 no React Strict Mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  const rateLimit = isDevelopment ? 200 : 60; // 200 req/min em dev, 60 req/min em prod
  const globalRateLimit = checkRateLimit(clientId, rateLimit, 60000);

  if (!globalRateLimit.allowed) {
    return res.status(429).json({
      success: false,
      message: 'Muitas requisições. Tente novamente em 1 minuto.',
      retryAfter: Math.ceil((globalRateLimit.resetTime - Date.now()) / 1000)
    });
  }

  // CORS seguro - apenas origens permitidas
  const allowedOrigins = [
    'https://tvsurui.com.br',
    'https://nexogeo2.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002'
  ];

  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Headers de segurança
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Extrair route de query params OU do path
  let { route, endpoint } = req.query || {};

  // Se não tem route na query, tentar extrair do path (/api/configuracoes -> route=configuracoes)
  // IMPORTANTE: Só extrai se for rota simples (sem "/" adicional após /api/)
  // Rotas como /api/caixa-misteriosa/game/live são tratadas por handlers separados
  if (!route && req.url) {
    // Tentar extrair com /api/ primeiro (produção Vercel)
    let pathMatch = req.url.match(/^\/api\/([^?\/]+)/);

    // Se não encontrou, tentar sem /api/ (desenvolvimento local - server.js já remove /api)
    if (!pathMatch) {
      pathMatch = req.url.match(/^\/([^?\/]+)/);
    }

    if (pathMatch && pathMatch[1] !== '' && pathMatch[1] !== '/') {
      route = pathMatch[1].split('?')[0]; // Remove query string se houver
      console.log('🔍 [ROUTER] Route extraído do path:', route, 'URL:', req.url);
    }
  }

  console.log('🔍 [ROUTER] Route final:', route, 'Endpoint:', endpoint, 'URL:', req.url);

  // Endpoint para testar conexão com banco
  if (route === 'db') {
    if (endpoint === 'test') {
      try {
        const result = await testConnection();
        return res.status(result.success ? 200 : 500).json(result);
      } catch (error) {
        console.error('❌ Erro no teste de conexão DB:', error.message); // Log apenas no servidor
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor - Conexão com banco de dados',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (endpoint === 'init') {
      try {
        const result = await initDatabase();
        return res.status(result.success ? 200 : 500).json(result);
      } catch (error) {
        console.error('❌ Erro na inicialização do DB:', error.message); // Log apenas no servidor
        return res.status(500).json({
          success: false,
          error: 'Erro interno do servidor - Inicialização do banco de dados',
          timestamp: new Date().toISOString()
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Database API funcionando!',
      endpoints: ['test', 'init'],
      timestamp: new Date().toISOString()
    });
  }

  // Roteamento baseado em query parameter: /api/?route=auth&endpoint=login
  if (route === 'auth') {
    // Autenticação

    try {
      if (endpoint === 'login' || (!endpoint && req.method === 'POST')) {
        if (req.method !== 'POST') {
          return res.status(405).json({
            success: false,
            message: 'Método não permitido. Use POST para login.',
            timestamp: new Date().toISOString()
          });
        }

        // 🔐 SEGURANÇA: Rate limiting extra para login (previne brute force)
        const loginRateLimit = checkRateLimit(`login_${clientId}`, 5, 300000); // 5 tentativas/5min

        if (!loginRateLimit.allowed) {
          return res.status(429).json({
            success: false,
            message: 'Muitas tentativas de login. Tente novamente em 5 minutos.',
            retryAfter: Math.ceil((loginRateLimit.resetTime - Date.now()) / 1000)
          });
        }

        // Autenticação com banco de dados
        const { usuario, email, senha, username, password } = req.body || {};
        const loginField = usuario || email || username;
        const passwordField = senha || password;

        if (!loginField || !passwordField) {
          return res.status(400).json({
            success: false,
            message: 'Email/usuário e senha são obrigatórios',
            timestamp: new Date().toISOString()
          });
        }

        // Buscar usuário no banco de dados
        const userResult = await query('SELECT * FROM usuarios WHERE usuario = $1', [loginField]);

        if (userResult.rows.length === 0) {
          return res.status(401).json({
            success: false,
            message: 'Usuário ou senha incorretos',
            timestamp: new Date().toISOString()
          });
        }

        const user = userResult.rows[0];

        // Verificar senha usando bcrypt
        let isPasswordValid = false;

        // Verificar se a coluna senha_hash existe e tem valor
        if (user.senha_hash) {
          // Usar bcrypt para comparar
          isPasswordValid = await bcrypt.compare(passwordField, user.senha_hash);
          // 🔐 SEGURANÇA: Log sanitizado - não expõe resultado nem usuário completo
          if (process.env.NODE_ENV === 'development') {
            console.log('Tentativa de login:', { usuario: user.usuario.substring(0, 3) + '***', timestamp: new Date().toISOString() });
          }
        } else {
          // If there is no hash, the password cannot be verified securely. Access is denied.
          console.log('⚠️ AVISO DE SEGURANÇA: Tentativa de login para usuário sem senha_hash. Acesso negado.');
          isPasswordValid = false;
        }

        if (!isPasswordValid) {
          return res.status(401).json({
            success: false,
            message: 'Usuário ou senha incorretos',
            timestamp: new Date().toISOString()
          });
        }

        // Login bem-sucedido - gerar JWT real
        const jwt = require('jsonwebtoken');
        const payload = {
          id: user.id,
          usuario: user.usuario,
          role: user.role || 'user',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 dias
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET);

        // Login será registrado automaticamente pelo frontend

        return res.status(200).json({
          success: true,
          message: 'Login realizado com sucesso!',
          token: token,
          user: {
            id: user.id,
            usuario: user.usuario,
            email: user.usuario, // Usando usuario como email
            role: user.role || 'user'
          },
          timestamp: new Date().toISOString()
        });
      }

      if (endpoint === 'logout') {
        return res.status(200).json({
          success: true,
          message: 'Logout realizado com sucesso!',
          timestamp: new Date().toISOString()
        });
      }

      if (endpoint === 'verify') {
        try {
          // Usar função de verificação que valida o token propriamente
          const userId = getUserIdFromRequest(req);

          // Buscar dados do usuário para retornar
          const userResult = await query('SELECT id, usuario, role FROM usuarios WHERE id = $1', [userId]);

          if (userResult.rows.length === 0) {
            return res.status(401).json({
              success: false,
              message: 'Usuário não encontrado',
              timestamp: new Date().toISOString()
            });
          }

          const user = userResult.rows[0];

          return res.status(200).json({
            success: true,
            message: 'Token válido',
            user: {
              id: user.id,
              usuario: user.usuario,
              email: user.usuario,
              role: user.role
            },
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          return res.status(401).json({
            success: false,
            message: 'Token inválido ou expirado',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Endpoint GET padrão para auth
      return res.status(200).json({
        success: true,
        message: 'API Auth funcionando!',
        availableEndpoints: ['login', 'logout', 'verify'],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Erro na API de autenticação:', error.message); // Log apenas no servidor
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor - Autenticação',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para configurações (dados do banco PostgreSQL)
  if (route === 'configuracoes') {
    const { type } = req.query || {};
    console.log('🔍 [BACKEND] Route configuracoes acessado. Type:', type, 'Method:', req.method);

    try {
      // Configurações da emissora
      if (type === 'emissora') {
        console.log('✅ [BACKEND] Entrando no bloco type=emissora');
        // GET - Buscar configurações
        if (req.method === 'GET') {
          const result = await query('SELECT * FROM configuracoes_emissora ORDER BY id DESC LIMIT 1');

          if (result.rows.length === 0) {
          // Inserir configuração padrão da TV Surui baseada nos dados reais
          const insertResult = await query(`
            INSERT INTO configuracoes_emissora (
              nome, website, telefone, email, descricao,
              instagram, facebook, youtube, endereco,
              tema_cor, logo_url
            ) VALUES (
              'TV Surui',
              'https://tvsurui.com.br',
              '(69) 9999-9999',
              'contato@tvsurui.com.br',
              'TV Surui - Sua televisão em Cacoal e região. Programação Comando na TV com sorteios e promoções.',
              'https://instagram.com/tvsurui',
              'https://facebook.com/tvsurui',
              'https://youtube.com/@tvsurui',
              'Cacoal - Rondônia, Brasil',
              'nexogeo',
              'https://placehold.co/150x50/4F46E5/ffffff/png?text=TV+Surui'
            ) RETURNING *
          `);

          return res.status(200).json({
            success: true,
            data: insertResult.rows[0],
            source: 'created',
            timestamp: new Date().toISOString()
          });
        }

          return res.status(200).json({
            success: true,
            data: result.rows[0],
            source: 'database',
            timestamp: new Date().toISOString()
          });
        }

        // PUT - Atualizar configurações da emissora
        if (req.method === 'PUT') {
          await getAuthenticatedUser(req, ['admin']);
          const {
            nome, logoUrl, temaCor, website, telefone, endereco, cidade,
            instagram, facebook, youtube, linkedin, twitter,
            whatsapp, email, descricao
          } = req.body || {};

          // Adicionar coluna cidade se não existir (migração inline)
          try {
            await query(`ALTER TABLE configuracoes_emissora ADD COLUMN IF NOT EXISTS cidade VARCHAR(255)`);
          } catch (err) {
            console.log('Coluna cidade já existe ou erro ao criar:', err.message);
          }

          // Verificar se existe registro
          const existingResult = await query('SELECT id FROM configuracoes_emissora ORDER BY id DESC LIMIT 1');

          if (existingResult.rows.length === 0) {
            // Criar novo registro se não existir
            const insertResult = await query(`
              INSERT INTO configuracoes_emissora (
                nome, logo_url, tema_cor, website, telefone, endereco, cidade,
                instagram, facebook, youtube, linkedin, twitter,
                whatsapp, email, descricao
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
              ) RETURNING *
            `, [nome, logoUrl, temaCor, website, telefone, endereco, cidade,
                instagram, facebook, youtube, linkedin, twitter,
                whatsapp, email, descricao]);

            return res.status(200).json({
              success: true,
              data: insertResult.rows[0],
              message: 'Configurações criadas com sucesso',
              timestamp: new Date().toISOString()
            });
          } else {
            // Atualizar registro existente
            const updateResult = await query(`
              UPDATE configuracoes_emissora
              SET nome = COALESCE($1, nome),
                  logo_url = COALESCE($2, logo_url),
                  tema_cor = COALESCE($3, tema_cor),
                  website = COALESCE($4, website),
                  telefone = COALESCE($5, telefone),
                  endereco = COALESCE($6, endereco),
                  cidade = COALESCE($7, cidade),
                  instagram = COALESCE($8, instagram),
                  facebook = COALESCE($9, facebook),
                  youtube = COALESCE($10, youtube),
                  linkedin = COALESCE($11, linkedin),
                  twitter = COALESCE($12, twitter),
                  whatsapp = COALESCE($13, whatsapp),
                  email = COALESCE($14, email),
                  descricao = COALESCE($15, descricao)
              WHERE id = $16
              RETURNING *
            `, [nome, logoUrl, temaCor, website, telefone, endereco, cidade,
                instagram, facebook, youtube, linkedin, twitter,
                whatsapp, email, descricao, existingResult.rows[0].id]);

            return res.status(200).json({
              success: true,
              data: updateResult.rows[0],
              message: 'Configurações atualizadas com sucesso',
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Lista de administradores
      if (type === 'administradores') {
        // ALL methods here are admin-only
        await getAuthenticatedUser(req, ['admin']);

        if (req.method === 'GET') {
          const result = await query('SELECT id, usuario, role, created_at FROM usuarios ORDER BY created_at DESC');

          return res.status(200).json({
            success: true,
            data: result.rows,
            source: 'database',
            timestamp: new Date().toISOString()
          });
        }

        // Criar novo administrador
        if (req.method === 'POST') {
          const { usuario, role } = req.body || {};

          if (!usuario) {
            return res.status(400).json({
              success: false,
              message: 'Usuário é obrigatório',
              timestamp: new Date().toISOString()
            });
          }

          // Gerar senha temporária mais segura
          const senhaTemporaria = 'temp_' + Date.now().toString().slice(-6);
          const hashedPassword = await bcrypt.hash(senhaTemporaria, 10);

          const insertResult = await query(`
            INSERT INTO usuarios (usuario, senha_hash, role)
            VALUES ($1, $2, $3)
            RETURNING id, usuario, role, created_at
          `, [usuario, hashedPassword, role || 'user']);

          return res.status(201).json({
            success: true,
            data: insertResult.rows[0],
            message: 'Administrador criado com sucesso',
            timestamp: new Date().toISOString()
          });
        }

        // Atualizar administrador existente
        if (req.method === 'PUT') {
          const { id } = req.query || {};
          const { usuario, role } = req.body || {};

          if (!id || !usuario) {
            return res.status(400).json({
              success: false,
              message: 'ID e usuário são obrigatórios',
              timestamp: new Date().toISOString()
            });
          }

          const updateResult = await query(`
            UPDATE usuarios
            SET usuario = $1, role = $2
            WHERE id = $3
            RETURNING id, usuario, role, created_at
          `, [usuario, role || 'user', parseInt(id)]);

          if (updateResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Administrador não encontrado',
              timestamp: new Date().toISOString()
            });
          }

          return res.status(200).json({
            success: true,
            data: updateResult.rows[0],
            message: 'Administrador atualizado com sucesso',
            timestamp: new Date().toISOString()
          });
        }

        // Excluir administrador
        if (req.method === 'DELETE') {
          const { id } = req.query || {};

          if (!id) {
            return res.status(400).json({
              success: false,
              message: 'ID é obrigatório',
              timestamp: new Date().toISOString()
            });
          }

          const deleteResult = await query(`
            DELETE FROM usuarios WHERE id = $1 RETURNING id
          `, [parseInt(id)]);

          if (deleteResult.rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Administrador não encontrado',
              timestamp: new Date().toISOString()
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Administrador excluído com sucesso',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Configurações gerais do sistema (fallback)
      const stats = await query(`
        SELECT
          (SELECT COUNT(*) FROM promocoes) as total_promocoes,
          (SELECT COUNT(*) FROM participantes) as total_participantes,
          (SELECT COUNT(*) FROM usuarios) as total_usuarios
      `);

      return res.status(200).json({
        success: true,
        data: {
          nome: 'NexoGeo Sistema',
          versao: '1.0.0',
          empresa: 'NexoGeo',
          usuario_atual: 'admin',
          estatisticas: stats.rows[0],
          configuracoes: [
            { id: 1, nome: 'Database Status', valor: 'conectado' },
            { id: 2, nome: 'Total Promoções', valor: stats.rows[0].total_promocoes },
            { id: 3, nome: 'Total Participantes', valor: stats.rows[0].total_participantes }
          ]
        },
        source: 'database',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao buscar configurações:', error);

      // Se for erro de autenticação/autorização, retornar 401/403
      if (error.message && (
        error.message.includes('Token') ||
        error.message.includes('autenticação') ||
        error.message.includes('Acesso não autorizado')
      )) {
        return res.status(401).json({
          success: false,
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Erro ao conectar com banco de dados',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para promoções (dados do banco PostgreSQL)
  if (route === 'promocoes') {
    try {
      
      // GET - Listar promoções ou buscar por ID
      if (req.method === 'GET') {
        const { id, status } = req.query || {};

        if (id) {
          // Buscar promoção específica por ID
          const result = await query(`
            SELECT p.*, COUNT(pt.id) as participantes_count
            FROM promocoes p
            LEFT JOIN participantes pt ON p.id = pt.promocao_id
            WHERE p.id = $1
            GROUP BY p.id
          `, [parseInt(id)]);

          if (result.rows.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Promoção não encontrada',
              timestamp: new Date().toISOString()
            });
          }

          return res.status(200).json({
            success: true,
            data: result.rows[0],
            source: 'database',
            timestamp: new Date().toISOString()
          });
        } else {
          // Listar todas as promoções (com filtro de status opcional)
          let queryText = `
            SELECT p.*, COUNT(pt.id) as participantes_count
            FROM promocoes p
            LEFT JOIN participantes pt ON p.id = pt.promocao_id
          `;
          let queryParams = [];

          if (status) {
            queryText += ` WHERE p.status = $1`;
            queryParams.push(status);
          }

          queryText += ` GROUP BY p.id ORDER BY p.id DESC`;

          const result = await query(queryText, queryParams);

          return res.status(200).json({
            success: true,
            data: result.rows,
            total: result.rows.length,
            source: 'database',
            timestamp: new Date().toISOString()
          });
        }
      }

      // POST - Criar nova promoção
      if (req.method === 'POST') {
        await getAuthenticatedUser(req, ['admin']);
        const { nome, descricao, data_inicio, data_fim, status = 'ativa', numero_ganhadores = 1 } = req.body || {};

        if (!nome || !data_inicio || !data_fim) {
          return res.status(400).json({
            success: false,
            message: 'Nome, data de início e data fim são obrigatórios',
            timestamp: new Date().toISOString()
          });
        }

        // Criar slug da promoção
        const slug = nome.toLowerCase()
          .replace(/[áàãâ]/g, 'a')
          .replace(/[éêë]/g, 'e')
          .replace(/[íîï]/g, 'i')
          .replace(/[óôõ]/g, 'o')
          .replace(/[úûü]/g, 'u')
          .replace(/[ç]/g, 'c')
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim();

        const insertResult = await query(`
          INSERT INTO promocoes (nome, descricao, slug, data_inicio, data_fim, status, numero_ganhadores)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `, [nome, descricao, slug, data_inicio, data_fim, status, parseInt(numero_ganhadores)]);

        return res.status(201).json({
          success: true,
          data: insertResult.rows[0],
          message: 'Promoção criada com sucesso',
          timestamp: new Date().toISOString()
        });
      }

      // PUT - Atualizar promoção
      if (req.method === 'PUT') {
        await getAuthenticatedUser(req, ['admin']);
        const { id } = req.query || {};
        const { nome, descricao, status, data_inicio, data_fim, numero_ganhadores } = req.body || {};

        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'ID da promoção é obrigatório',
            timestamp: new Date().toISOString()
          });
        }

        // Buscar dados antigos antes da alteração para auditoria
        const oldPromoDataResult = await query('SELECT * FROM promocoes WHERE id = $1', [parseInt(id)]);
        const oldPromoData = oldPromoDataResult.rows[0] || null;

        const updateResult = await query(`
          UPDATE promocoes
          SET nome = COALESCE($1, nome),
              descricao = COALESCE($2, descricao),
              status = COALESCE($3, status),
              data_inicio = COALESCE($4, data_inicio),
              data_fim = COALESCE($5, data_fim),
              numero_ganhadores = COALESCE($6, numero_ganhadores)
          WHERE id = $7
          RETURNING *
        `, [nome, descricao, status, data_inicio, data_fim, numero_ganhadores, parseInt(id)]);

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Promoção não encontrada',
            timestamp: new Date().toISOString()
          });
        }

        const newPromoData = updateResult.rows[0];

        // Log de auditoria removido - será feito pelo frontend via auditService
        console.log('🎁 Promoção atualizada - auditoria será registrada pelo frontend');


        return res.status(200).json({
          success: true,
          data: updateResult.rows[0],
          message: 'Promoção atualizada com sucesso',
          timestamp: new Date().toISOString()
        });
      }

      // DELETE - Excluir promoção
      if (req.method === 'DELETE') {
        await getAuthenticatedUser(req, ['admin']);
        const { id } = req.query || {};

        if (!id) {
          return res.status(400).json({
            success: false,
            message: 'ID da promoção é obrigatório',
            timestamp: new Date().toISOString()
          });
        }

        const deleteResult = await query(`
          DELETE FROM promocoes WHERE id = $1 RETURNING id, nome
        `, [parseInt(id)]);

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Promoção não encontrada',
            timestamp: new Date().toISOString()
          });
        }

        return res.status(200).json({
          success: true,
          data: deleteResult.rows[0],
          message: 'Promoção excluída com sucesso',
          timestamp: new Date().toISOString()
        });
      }

      // PATCH - Atualizar apenas status da promoção
      if (req.method === 'PATCH') {
        await getAuthenticatedUser(req, ['admin']);
        const { id } = req.query || {};
        const { status } = req.body || {};

        if (!id || !status) {
          return res.status(400).json({
            success: false,
            message: 'ID da promoção e status são obrigatórios',
            timestamp: new Date().toISOString()
          });
        }

        const updateResult = await query(`
          UPDATE promocoes
          SET status = $1
          WHERE id = $2
          RETURNING *
        `, [status, parseInt(id)]);

        if (updateResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Promoção não encontrada',
            timestamp: new Date().toISOString()
          });
        }

        return res.status(200).json({
          success: true,
          data: updateResult.rows[0],
          message: `Status da promoção alterado para '${status}' com sucesso`,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Erro ao gerenciar promoções:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao conectar com banco de dados',
        
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para dashboard (dados do banco PostgreSQL)
  if (route === 'dashboard') {
    const { action } = req.query;

    // Roteamento por ação específica
    if (action === 'participantes-por-promocao') {
      return await getParticipantesPorPromocao(req, res);
    }
    if (action === 'origem-cadastros') {
      return await getOrigemCadastros(req, res);
    }

    // === USER DASHBOARD ENDPOINTS ===
    if (action === 'user-stats') {
      return await getUserStats(req, res);
    }
    if (action === 'user-activity') {
      return await getUserActivity(req, res);
    }
    if (action === 'available-promotions') {
      return await getAvailablePromotions(req, res);
    }

    // === MODERATOR DASHBOARD ENDPOINTS ===
    if (action === 'moderator-stats') {
      return await getModeratorStats(req, res);
    }
    if (action === 'pending-actions') {
      return await getPendingActions(req, res);
    }
    if (action === 'recent-promotions') {
      return await getRecentPromotions(req, res);
    }
    if (action === 'sorteio-stats') {
      return await getSorteioStats(req, res);
    }

    // === VIEWER DASHBOARD ENDPOINTS ===
    if (action === 'reports-summary') {
      return await getReportsSummary(req, res);
    }
    if (action === 'analytics-data') {
      return await getAnalyticsData(req, res);
    }
    if (action === 'charts-data') {
      return await getChartsData(req, res);
    }

    // DEFAULT: Admin stats (quando não há action específica)
    try {
      console.log('📊 [DASHBOARD] Buscando estatísticas com deduplicação...');

      // Query unificada com deduplicação por telefone (alinhada com endpoint unificado)
      const stats = await query(`
        WITH participantes_unificados AS (
          -- Participantes regulares
          SELECT
            telefone as phone,
            participou_em as created_at
          FROM participantes

          UNION ALL

          -- Participantes públicos (Caixa Misteriosa)
          SELECT
            phone,
            created_at
          FROM public_participants
        ),
        participantes_unicos AS (
          -- Deduplicar por telefone, mantendo o mais recente
          SELECT DISTINCT ON (phone)
            phone,
            created_at
          FROM participantes_unificados
          ORDER BY phone, created_at DESC
        )
        SELECT
          (SELECT COUNT(*) FROM promocoes
           WHERE status = 'ativa'
           AND DATE(data_inicio) <= CURRENT_DATE
           AND DATE(data_fim) >= CURRENT_DATE) as promocoes_ativas,
          (SELECT COUNT(*) FROM participantes_unicos) as participantes_total,
          (SELECT COUNT(*) FROM participantes_unicos
           WHERE created_at >= NOW() - INTERVAL '24 hours') as participantes_24h,
          3 as usuarios_ativos,
          (SELECT COUNT(*) FROM promocoes) as promocoes_mes
      `);

      console.log('✅ [DASHBOARD] Estatísticas calculadas:', {
        participantes_total: stats.rows[0].participantes_total,
        participantes_24h: stats.rows[0].participantes_24h
      });

      // Simplificar atividades recentes para não depender de colunas específicas
      const recent_activities = [
        { id: 1, acao: 'Sistema conectado', usuario: 'sistema', data: new Date().toISOString() },
        { id: 2, acao: 'Dashboard carregado', usuario: 'admin', data: new Date().toISOString() }
      ];

      return res.status(200).json({
        success: true,
        data: {
          promocoes_ativas: parseInt(stats.rows[0].promocoes_ativas) || 0,
          participantes_total: parseInt(stats.rows[0].participantes_total) || 0,
          participantes_24h: parseInt(stats.rows[0].participantes_24h) || 0,
          usuarios_ativos: parseInt(stats.rows[0].usuarios_ativos) || 0,
          promocoes_mes: parseInt(stats.rows[0].promocoes_mes) || 0,
          taxa_conversao: '0%',
          recent_activities
        },
        source: 'database',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao conectar com banco de dados',
        
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para participantes - Redirecionando para handler dedicado que inclui endpoint unificado
  if (route === 'participantes') {
    console.log('🔀 [ROUTER] Redirecionando para participantesHandler');
    return participantesHandler(req, res);
  }

  // Rota para sorteios
  if (route === 'sorteio') {
    try {
      const { action, id, promocaoId } = req.query || {};

      // GET /api/sorteio?action=encerradas - Buscar promoções encerradas
      if (req.method === 'GET' && action === 'encerradas') {
        const promocoesResult = await query(`
          SELECT p.*, COUNT(g.id) as total_ganhadores
          FROM promocoes p
          LEFT JOIN ganhadores g ON p.id = g.promocao_id AND g.cancelado = false
          WHERE p.status = 'encerrada'
          GROUP BY p.id
          ORDER BY p.criado_em DESC
          LIMIT 5
        `);

        // Para cada promoção, buscar os ganhadores
        const promocoesComGanhadores = await Promise.all(
          promocoesResult.rows.map(async (promocao) => {
            const ganhadoresResult = await query(`
              SELECT g.id as ganhador_id, g.posicao, g.premio, g.sorteado_em,
                     p.nome as participante_nome, p.telefone, p.cidade
              FROM ganhadores g
              JOIN participantes p ON g.participante_id = p.id
              WHERE g.promocao_id = $1 AND g.cancelado = false
              ORDER BY g.posicao ASC
            `, [promocao.id]);

            return {
              ...promocao,
              ganhadores: ganhadoresResult.rows
            };
          })
        );

        return res.status(200).json({
          success: true,
          data: promocoesComGanhadores,
          total: promocoesComGanhadores.length,
          source: 'database',
          timestamp: new Date().toISOString()
        });
      }

      // GET /api/sorteio?action=ganhadores&id={promocaoId} - Buscar ganhadores de uma promoção
      if (req.method === 'GET' && action === 'ganhadores' && id) {
        const result = await query(`
          SELECT g.*,
                 p.nome as participante_nome,
                 p.telefone as participante_telefone,
                 p.cidade as participante_cidade,
                 p.bairro as participante_bairro,
                 pr.nome as promocao_nome
          FROM ganhadores g
          JOIN participantes p ON g.participante_id = p.id
          JOIN promocoes pr ON g.promocao_id = pr.id
          WHERE g.promocao_id = $1 AND g.cancelado = false
          ORDER BY g.sorteado_em DESC
        `, [parseInt(id)]);

        return res.status(200).json({
          success: true,
          ganhadores: result.rows,
          timestamp: new Date().toISOString()
        });
      }

      // GET /api/sorteio?action=participantes&promocaoId={promocaoId} - Buscar participantes disponíveis
      if (req.method === 'GET' && action === 'participantes' && promocaoId) {
        const result = await query(`
          SELECT p.*
          FROM participantes p
          LEFT JOIN ganhadores g ON p.id = g.participante_id AND g.promocao_id = $1 AND g.cancelado = false
          WHERE p.promocao_id = $1 AND g.id IS NULL
          ORDER BY p.nome ASC
        `, [parseInt(promocaoId)]);

        return res.status(200).json({
          success: true,
          participantes: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      }

      // GET /api/sorteio?action=estatisticas - Obter estatísticas
      if (req.method === 'GET' && action === 'estatisticas') {
        const estatisticasResult = await query(`
          SELECT
            COUNT(DISTINCT g.id) as total_sorteios,
            COUNT(DISTINCT g.participante_id) as total_ganhadores,
            COUNT(DISTINCT g.promocao_id) as promocoes_com_sorteio,
            MAX(g.sorteado_em) as ultimo_sorteio
          FROM ganhadores g
          WHERE g.cancelado = false
        `);

        return res.status(200).json({
          success: true,
          ...estatisticasResult.rows[0],
          timestamp: new Date().toISOString()
        });
      }

      // POST /api/sorteio?action=sortear - Realizar sorteio
      if (req.method === 'POST' && action === 'sortear') {
        await getAuthenticatedUser(req, ['admin']);
        const { promocaoId } = req.body || {};

        if (!promocaoId) {
          return res.status(400).json({
            success: false,
            message: 'ID da promoção é obrigatório',
            timestamp: new Date().toISOString()
          });
        }

        // Buscar participantes disponíveis
        const participantesResult = await query(`
          SELECT p.*
          FROM participantes p
          LEFT JOIN ganhadores g ON p.id = g.participante_id AND g.promocao_id = $1 AND g.cancelado = false
          WHERE p.promocao_id = $1 AND g.id IS NULL
        `, [parseInt(promocaoId)]);

        if (participantesResult.rows.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Não há participantes disponíveis para o sorteio',
            timestamp: new Date().toISOString()
          });
        }

        // Sortear aleatoriamente
        const participantes = participantesResult.rows;
        const ganhadorIndex = Math.floor(Math.random() * participantes.length);
        const ganhador = participantes[ganhadorIndex];

        // Registrar ganhador
        const insertResult = await query(`
          INSERT INTO ganhadores (participante_id, promocao_id, sorteado_em, cancelado, posicao, premio)
          VALUES ($1, $2, NOW(), false, 1, '1º Lugar')
          RETURNING *
        `, [ganhador.id, parseInt(promocaoId)]);

        return res.status(200).json({
          success: true,
          ganhador: {
            ...ganhador,
            data_sorteio: insertResult.rows[0].sorteado_em,
            ganhador_id: insertResult.rows[0].id
          },
          message: 'Sorteio realizado com sucesso!',
          timestamp: new Date().toISOString()
        });
      }

      // DELETE /api/sorteio?action=ganhadores&id={ganhadorId} - Cancelar sorteio
      if (req.method === 'DELETE' && action === 'ganhadores' && id) {
        await getAuthenticatedUser(req, ['admin']);
        const deleteResult = await query(`
          UPDATE ganhadores SET cancelado = true WHERE id = $1 AND cancelado = false RETURNING *
        `, [parseInt(id)]);

        if (deleteResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Ganhador não encontrado',
            timestamp: new Date().toISOString()
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Sorteio cancelado com sucesso',
          data: deleteResult.rows[0],
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Erro ao gerenciar sorteios:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao processar solicitação de sorteio',
        
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para todos os ganhadores - /api/sorteio/ganhadores
  if (req.url && req.url.includes('/sorteio/ganhadores')) {
    try {
      if (req.method === 'GET') {
        const result = await query(`
          SELECT g.*, p.nome as participante_nome, pr.nome as promocao_nome
          FROM ganhadores g
          JOIN participantes p ON g.participante_id = p.id
          JOIN promocoes pr ON g.promocao_id = pr.id
          ORDER BY g.sorteado_em DESC
        `);

        return res.status(200).json({
          success: true,
          ganhadores: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Erro ao buscar todos os ganhadores:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar ganhadores',
        
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota debug-users removida por questões de segurança.

  // Rota debug removida por questões de segurança.

  // Rota para auditoria
  if (route === 'audit') {
    const { action } = req.query;

    try {
      
      // GET /api/?route=audit&action=stats - Estatísticas de auditoria
      if (req.method === 'GET' && action === 'stats') {
        const { days = 30 } = req.query;

        console.log('🔍 Buscando estatísticas de auditoria para:', { days });

        // Buscar estatísticas reais da tabela audit_logs - QUERY SEGURA
        const daysParam = parseInt(days) || 30; // Sanitizar entrada
        if (daysParam < 1 || daysParam > 365) {
          return res.status(400).json({
            success: false,
            error: 'Parâmetro days deve estar entre 1 e 365'
          });
        }

        const auditStats = await query(`
          SELECT
            COUNT(*) as total_actions,
            COUNT(*) FILTER (WHERE action = 'CREATE') as creates,
            COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
            COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
            COUNT(*) FILTER (WHERE action = 'VIEW') as views,
            COUNT(*) FILTER (WHERE error_message IS NOT NULL) as recent_errors
          FROM audit_logs
          WHERE created_at >= NOW() - INTERVAL $1
        `, [`${daysParam} days`]);

        const stats = auditStats.rows[0] || {
          total_actions: 0,
          creates: 0,
          updates: 0,
          deletes: 0,
          views: 0,
          recent_errors: 0
        };

        console.log('📊 Estatísticas calculadas:', stats);

        return res.status(200).json({
          success: true,
          total_actions: parseInt(stats.total_actions) || 0,
          creates: parseInt(stats.creates) || 0,
          updates: parseInt(stats.updates) || 0,
          deletes: parseInt(stats.deletes) || 0,
          views: parseInt(stats.views) || 0,
          recent_errors: parseInt(stats.recent_errors) || 0,
          timestamp: new Date().toISOString()
        });
      }

      // POST /api/?route=audit&action=cleanup - Limpeza de logs antigos conforme LGPD
      if (req.method === 'POST' && action === 'cleanup') {
        try {
          await getAuthenticatedUser(req, ['admin']);
          let totalDeleted = 0;
          const results = [];

          // 1. LOGS DE AUDITORIA (CRÍTICOS) - Retenção: 2 anos conforme LGPD
          // Preservar LOGIN, LOGOUT, DELETE, CREATE, UPDATE por serem logs de auditoria
          const auditQuery = `
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '2 years'
            AND action IN ('LOGIN', 'LOGOUT', 'DELETE', 'CREATE', 'UPDATE')
          `;
          const auditResult = await pool.query(auditQuery);
          const auditDeleted = auditResult.rowCount || 0;
          totalDeleted += auditDeleted;
          results.push(`Logs de auditoria: ${auditDeleted} removidos (>2 anos)`);

          // 2. LOGS DE SISTEMA (BAIXA CRITICIDADE) - Retenção: 6 meses
          // VIEW, EXPORT, ERROR são logs operacionais/sistema
          const systemQuery = `
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '6 months'
            AND action IN ('VIEW', 'EXPORT', 'ERROR', 'PAGE_ACCESS')
          `;
          const systemResult = await pool.query(systemQuery);
          const systemDeleted = systemResult.rowCount || 0;
          totalDeleted += systemDeleted;
          results.push(`Logs de sistema: ${systemDeleted} removidos (>6 meses)`);

          // 3. LOGS OPERACIONAIS (MÉDIA CRITICIDADE) - Retenção: 1 ano
          // DRAW, REPORT são logs importantes mas não críticos
          const operationalQuery = `
            DELETE FROM audit_logs
            WHERE created_at < NOW() - INTERVAL '1 year'
            AND action IN ('DRAW', 'VIEW_REPORT', 'EXPORT_AUDIT')
          `;
          const operationalResult = await pool.query(operationalQuery);
          const operationalDeleted = operationalResult.rowCount || 0;
          totalDeleted += operationalDeleted;
          results.push(`Logs operacionais: ${operationalDeleted} removidos (>1 ano)`);

          console.log(`🧹 Limpeza LGPD executada: ${totalDeleted} logs removidos total`);
          console.log('📋 Detalhes:', results);

          return res.status(200).json({
            success: true,
            deleted_count: totalDeleted,
            message: `Limpeza LGPD: ${totalDeleted} logs removidos`,
            details: results,
            compliance: 'LGPD - Art. 7º, II e IX'
          });
        } catch (error) {
          console.error('❌ Erro ao executar limpeza LGPD:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao executar limpeza de logs conforme LGPD',

          });
        }
      }

      // GET /api/?route=audit&action=logs - Buscar logs de auditoria
      if (req.method === 'GET' && action === 'logs') {
        try {
          await getAuthenticatedUser(req, ['admin']);
          // Buscar logs reais do banco de dados
          const {
            limit = 50,
            offset = 0,
            user_id,
            action_filter: filterAction,
            table_name,
            start_date,
            end_date
          } = req.query;

          console.log('🔍 Parâmetros recebidos:', {
            limit,
            offset,
            user_id,
            filterAction,
            table_name,
            all_query_params: req.query
          });

          let selectQuery = `
            SELECT
              al.id, al.user_id, al.action, al.table_name, al.record_id,
              al.ip_address, al.created_at, al.response_status, al.additional_data,
              al.user_agent, al.request_method, al.request_url,
              al.old_values, al.new_values,
              COALESCE(u.usuario, 'Sistema') as user_name
            FROM audit_logs al
            LEFT JOIN usuarios u ON u.id = al.user_id
            WHERE 1=1
          `;
          const queryParams = [];
          let paramCount = 0;

          // Filtros opcionais
          if (user_id) {
            selectQuery += ` AND al.user_id = $${++paramCount}`;
            queryParams.push(user_id);
          }

          if (filterAction) {
            selectQuery += ` AND al.action = $${++paramCount}`;
            queryParams.push(filterAction);
          }

          if (table_name) {
            selectQuery += ` AND al.table_name = $${++paramCount}`;
            queryParams.push(table_name);
          }

          selectQuery += ` ORDER BY al.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
          queryParams.push(limit, offset);

          console.log('🔍 Buscando logs de auditoria:', {
            query: selectQuery,
            params: queryParams,
            req_query: req.query,
            user_id,
            filterAction,
            table_name,
            limit,
            offset
          });

          // Adicionar filtros de data
          if (start_date) {
            selectQuery += ` AND created_at >= $${++paramCount}`;
            queryParams.push(start_date);
          }

          if (end_date) {
            selectQuery += ` AND created_at <= $${++paramCount}`;
            queryParams.push(end_date);
          }

          selectQuery += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
          queryParams.push(limit, offset);

          // Query segura com parâmetros preparados
          let enhancedQuery = `
            SELECT
              al.id, al.user_id, al.action, al.table_name, al.record_id,
              al.ip_address, al.created_at, al.response_status, al.additional_data,
              al.user_agent, al.request_method, al.request_url,
              al.old_values, al.new_values,
              COALESCE(u.usuario, 'Sistema') as user_name
            FROM audit_logs al
            LEFT JOIN usuarios u ON u.id = al.user_id
            WHERE 1=1
          `;

          const enhancedParams = [];
          let paramIndex = 0;

          // Adicionar filtros usando parâmetros seguros
          if (filterAction) {
            enhancedQuery += ` AND al.action = $${++paramIndex}`;
            enhancedParams.push(filterAction);
          }

          if (table_name) {
            enhancedQuery += ` AND al.table_name = $${++paramIndex}`;
            enhancedParams.push(table_name);
          }

          if (start_date) {
            enhancedQuery += ` AND al.created_at >= $${++paramIndex}`;
            enhancedParams.push(start_date);
          }

          if (end_date) {
            enhancedQuery += ` AND al.created_at <= $${++paramIndex}`;
            enhancedParams.push(end_date);
          }

          enhancedQuery += ` ORDER BY al.created_at DESC LIMIT $${++paramIndex} OFFSET $${++paramIndex}`;
          enhancedParams.push(parseInt(limit), parseInt(offset));

          console.log('🔍 Usando query segura com parâmetros:', enhancedQuery);
          console.log('📊 Parâmetros:', enhancedParams);
          const result = await query(enhancedQuery, enhancedParams);

          console.log('📊 Resultado da busca:', {
            rows_found: result.rows.length,
            first_row: result.rows[0] || 'nenhum',
            query_executed: selectQuery
          });

          // Buscar contagem total simplificada - sempre contar todos os registros
          const countResult = await query('SELECT COUNT(*) as total FROM audit_logs');
          const totalLogs = parseInt(countResult.rows[0]?.total || 0);

          console.log('📊 Logs encontrados:', result.rows.length, 'de', totalLogs, 'total');

          return res.status(200).json({
            success: true,
            logs: result.rows,
            total: totalLogs,
            limit: parseInt(limit),
            offset: parseInt(offset)
          });

        } catch (error) {
          console.error('❌ Erro ao buscar logs de auditoria:', error);

          // Fallback para logs simulados em caso de erro
          const mockLogs = [
            {
              id: 1,
              user_id: 1,
              action: 'LOGIN',
              table_name: 'usuarios_admin',
              record_id: 1,
              ip_address: '127.0.0.1',
              created_at: new Date().toISOString(),
              response_status: 200
            },
            {
              id: 2,
              user_id: 1,
              action: 'VIEW',
              table_name: 'participantes',
              record_id: 101,
              ip_address: '127.0.0.1',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              response_status: 200
            }
          ];

          console.log('⚠️ Usando logs simulados devido ao erro');

          return res.status(200).json({
            success: true,
            logs: mockLogs,
            total: mockLogs.length,
            error: 'Usando dados simulados: ' + error.message
          });
        }
      }

      // GET /api/?route=audit&action=export - Exportar todos os logs reais
      if (req.method === 'GET' && action === 'export') {
        try {
          await getAuthenticatedUser(req, ['admin']);
          // Buscar TODOS os logs reais (sem limit)
          const exportQuery = `
            SELECT
              al.id, al.user_id, al.action, al.table_name, al.record_id,
              al.ip_address, al.created_at, al.response_status, al.additional_data,
              al.user_agent, al.request_method, al.request_url,
              al.old_values, al.new_values,
              COALESCE(u.usuario, 'Sistema') as user_name
            FROM audit_logs al
            LEFT JOIN usuarios u ON u.id = al.user_id
            ORDER BY al.created_at DESC
          `;

          const result = await query(exportQuery);
          console.log('📄 Exportando', result.rows.length, 'logs de auditoria');

          // Gerar CSV com todos os dados
          let csvData = "Data/Hora,Usuario,Acao,Tabela,Registro ID,Valores,IP,Status,User Agent\n";

          result.rows.forEach(log => {
            const date = new Date(log.created_at).toLocaleString('pt-BR');
            const values = log.old_values || log.new_values ?
              JSON.stringify({old: log.old_values, new: log.new_values}).replace(/"/g, '""') : '-';

            csvData += `"${date}","${log.user_name}","${log.action}","${log.table_name}","${log.record_id || '-'}","${values}","${log.ip_address}","${log.response_status}","${log.user_agent || '-'}"\n`;
          });

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
          return res.status(200).send(csvData);

        } catch (error) {
          console.error('Erro ao exportar logs:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao exportar logs de auditoria',
            message: error.message
          });
        }
      }

      // POST /api/?route=audit&action=log - Salvar log de auditoria
      if (req.method === 'POST' && action === 'log') {
        try {
          const { action: logAction, table_name, record_id, additional_data, old_values, new_values } = req.body;

          if (!logAction || !table_name) {
            return res.status(400).json({
              success: false,
              error: 'Campos obrigatórios: action, table_name'
            });
          }

          // Verificar se a tabela existe (opcional)
          const existingTables = ['usuarios_admin', 'participantes', 'promocoes', 'ganhadores', 'reports'];

          console.log('📝 Salvando log de auditoria:', {
            action: logAction,
            table_name,
            record_id,
            additional_data,
            old_values,
            new_values
          });

          // Inserir log na tabela audit_logs com old_values e new_values
          const insertQuery = `
            INSERT INTO audit_logs (
              user_id, action, table_name, record_id,
              old_values, new_values,
              ip_address, user_agent, request_method, request_url,
              response_status, additional_data, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
          `;

          const clientIP = req.headers['x-forwarded-for'] ||
                          req.connection?.remoteAddress ||
                          req.socket?.remoteAddress ||
                          '127.0.0.1';

          // Decodificar JWT token para obter user_id
          const authenticatedUser = await getAuthenticatedUser(req);
          const userId = authenticatedUser.id;

          const values = [
            userId, // user_id from JWT token
            logAction,
            table_name,
            record_id || null,
            old_values ? JSON.stringify(old_values) : null,
            new_values ? JSON.stringify(new_values) : null,
            clientIP,
            req.headers['user-agent'] || null,
            'AUDIT_LOG',
            req.originalUrl || '/api',
            200,
            additional_data ? JSON.stringify(additional_data) : null,
            new Date().toISOString()
          ];

          const result = await query(insertQuery, values);

          console.log('✅ Log de auditoria salvo com ID:', result.rows[0]?.id);

          return res.status(200).json({
            success: true,
            message: 'Log de auditoria registrado com sucesso',
            id: result.rows[0]?.id
          });

        } catch (error) {
          console.error('❌ Erro ao salvar log de auditoria:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao salvar log de auditoria',
            message: error.message
          });
        }
      }

      // POST /api/?route=audit&action=setup - Criar tabelas de auditoria
      if (req.method === 'POST' && action === 'setup') {
        try {
          console.log('🔧 Iniciando setup das tabelas de auditoria...');

          // Script SQL completo para criar tabelas
          const setupSQL = `
            -- Tabela principal de logs de auditoria
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                action VARCHAR(50) NOT NULL,
                table_name VARCHAR(50) NOT NULL,
                record_id INTEGER,
                old_values JSONB,
                new_values JSONB,
                ip_address INET,
                user_agent TEXT,
                session_id VARCHAR(255),
                request_method VARCHAR(10),
                request_url TEXT,
                response_status INTEGER,
                execution_time INTEGER,
                error_message TEXT,
                additional_data JSONB,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- Índices para performance
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
            CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

            -- Inserir alguns logs de teste
            INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, created_at)
            VALUES
              (1, 'LOGIN', 'usuarios_admin', 1, '127.0.0.1', NOW() - INTERVAL '1 hour'),
              (1, 'VIEW', 'participantes', 101, '127.0.0.1', NOW() - INTERVAL '30 minutes')
            ON CONFLICT DO NOTHING;
          `;

          // Executar o SQL
          await query(setupSQL);

          console.log('✅ Tabelas de auditoria criadas com sucesso');

          return res.status(200).json({
            success: true,
            message: 'Tabelas de auditoria criadas com sucesso',
            setup_completed: true
          });

        } catch (error) {
          console.error('❌ Erro ao criar tabelas de auditoria:', error);
          return res.status(500).json({
            success: false,
            error: 'Erro ao criar tabelas de auditoria',
            message: error.message
          });
        }
      }

      // GET /api/?route=audit&action=test-user-id - Testar extração de user_id
      if (req.method === 'GET' && action === 'test-user-id') {
        try {
          const userId = getUserIdFromRequest(req);
          return res.status(200).json({
            success: true,
            userId: userId,
            headers: req.headers.authorization || null,
            message: 'Teste de extração de user_id'
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: error.message,
            headers: req.headers.authorization || null
          });
        }
      }

      // GET /api/?route=audit&action=debug - Debug da tabela audit_logs
      if (req.method === 'GET' && action === 'debug') {
        try {
          // Verificar se a tabela existe
          const tableExistsQuery = `
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_name = 'audit_logs'
            );
          `;
          const tableExists = await query(tableExistsQuery);

          // Contar total de registros
          const countQuery = 'SELECT COUNT(*) as total FROM audit_logs';
          const countResult = await query(countQuery);

          // Buscar primeiros 5 registros
          const sampleQuery = 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5';
          const sampleResult = await query(sampleQuery);

          // Testar query similar à da busca principal
          const testQuery = `
            SELECT id, user_id, action, table_name, record_id,
                   ip_address, created_at, response_status, additional_data,
                   user_agent, request_method, request_url
            FROM audit_logs
            WHERE 1=1
            ORDER BY created_at DESC LIMIT 50 OFFSET 0
          `;
          const testResult = await query(testQuery);

          return res.status(200).json({
            success: true,
            debug: {
              table_exists: tableExists.rows[0].exists,
              total_records: countResult.rows[0].total,
              sample_records: sampleResult.rows,
              test_query_result: testResult.rows,
              test_query_count: testResult.rows.length,
              query_test: 'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5'
            },
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Erro no debug',
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Outras ações de auditoria podem ser adicionadas aqui
      return res.status(200).json({
        success: true,
        message: 'API Audit funcionando!',
        actions: ['stats', 'cleanup', 'logs', 'export', 'setup', 'debug'],
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro na API de auditoria:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro na API de auditoria',
        
        timestamp: new Date().toISOString()
      });
    }
  }

  // Rota para o jogo Caixa Misteriosa (formato original)
  if (req.originalUrl && req.originalUrl.startsWith('/api/caixa-misteriosa')) {
    console.log('🎮 [INDEX] Detectou rota caixa-misteriosa - originalUrl:', req.originalUrl);
    const caixaMisteriosaHandler = require('./caixa-misteriosa.js');
    // Ajustar URL para o padrão original
    const originalUrl = req.originalUrl;
    const path = originalUrl.replace('/api/caixa-misteriosa', '');
    req.originalPath = path;
    console.log('🎮 [INDEX] Path extraído:', path, 'originalPath setado:', req.originalPath);
    return await caixaMisteriosaHandler(req, res);
  }

  // Rota para o jogo Caixa Misteriosa (formato query)
  if (route === 'caixa-misteriosa') {
    const caixaMisteriosaHandler = require('./caixa-misteriosa.js');
    // FIX: Adiciona a manipulação de path que estava faltando
    const originalUrl = req.originalUrl || req.url;
    const path = originalUrl.replace('/api/caixa-misteriosa', '').split('?')[0];
    req.originalPath = path;
    return await caixaMisteriosaHandler(req, res);
  }

  // Rota para gerenciar usuários
  if (route === 'usuarios') {
    try {
      // GET - Listar usuários (Admin Only)
      if (req.method === 'GET') {
        await getAuthenticatedUser(req, ['admin']);
        const result = await query(`
          SELECT id, usuario, role, created_at
          FROM usuarios
          ORDER BY id ASC
        `);

        return res.status(200).json({
          success: true,
          data: result.rows,
          total: result.rows.length,
          timestamp: new Date().toISOString()
        });
      }

      // PATCH - Atualizar senha de usuário
      if (req.method === 'PATCH') {
        const authenticatedUser = await getAuthenticatedUser(req);
        const { id: targetUserId } = req.query || {};
        const { senha } = req.body || {};

        if (!targetUserId) {
          return res.status(400).json({
            success: false,
            message: 'ID do usuário é obrigatório'
          });
        }

        if (!senha) {
          return res.status(400).json({
            success: false,
            message: 'Nova senha é obrigatória'
          });
        }

        // Authorization Check: Admin can change anyone's password. User can only change their own.
        if (authenticatedUser.role !== 'admin' && authenticatedUser.id.toString() !== targetUserId.toString()) {
          return res.status(403).json({ 
            success: false, 
            message: 'Acesso negado. Você não tem permissão para alterar a senha deste usuário.' 
          });
        }

        // Proceed with password update
        const hashedPassword = await bcrypt.hash(senha, 10);
        await query(
          `UPDATE usuarios SET senha_hash = $1 WHERE id = $2`,
          [hashedPassword, parseInt(targetUserId)]
        );

        return res.status(200).json({
          success: true,
          message: 'Senha atualizada com sucesso'
        });
      }

      // POST - Atualizar senhas em lote (Admin Only)
      if (req.method === 'POST') {
        await getAuthenticatedUser(req, ['admin']);
        const { action, senha_padrao } = req.body || {};

        if (action === 'update_all_passwords' && senha_padrao) {
          const hashedPassword = await bcrypt.hash(senha_padrao, 10);
          const result = await query(
            `UPDATE usuarios SET senha_hash = $1`,
            [hashedPassword]
          );

          return res.status(200).json({
            success: true,
            message: `${result.rowCount} usuários atualizados com senha padrão`,
            affected_rows: result.rowCount
          });
        }

        return res.status(400).json({
          success: false,
          message: 'Ação não reconhecida ou dados faltando'
        });
      }

      // If no method matches
      return res.status(405).json({ success: false, message: `Método ${req.method} não permitido para a rota /usuarios` });

    } catch (error) {
      console.error('Erro na rota de usuários:', error);
      // Distinguish between auth failure and other errors
      if (error.message.includes('autenticação') || error.message.includes('autorizado') || error.message.includes('expirado')) {
        return res.status(401).json({ success: false, message: error.message });
      } 
      if (error.message.includes('Acesso negado')) {
        return res.status(403).json({ success: false, message: error.message });
      }
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerenciar usuários',
        
      });
    }
  }

  // Rota para encurtar links
  if (route === 'encurtar-link') {
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, message: 'Método não permitido. Use POST.' });
    }

    try {
      const { url: longUrl } = req.body;

      if (!longUrl) {
        return res.status(400).json({ success: false, message: 'URL é obrigatória.' });
      }

      // Escolher serviço baseado no tipo de URL
      let shortUrl;
      let serviceUsed = 'unknown';

      // Verificar se é URL local (localhost, 127.0.0.1, etc.)
      const isLocalUrl = longUrl.includes('localhost') ||
                        longUrl.includes('127.0.0.1') ||
                        longUrl.includes('192.168.') ||
                        longUrl.includes('10.0.') ||
                        longUrl.includes('172.16.');

      if (isLocalUrl) {
        console.log('🏠 URL local detectada, usando TinyURL diretamente');

        try {
          const tinyUrlResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
            method: 'GET',
            timeout: 10000
          });

          if (tinyUrlResponse.ok) {
            shortUrl = await tinyUrlResponse.text();
            serviceUsed = 'tinyurl';
            console.log('✅ URL local encurtada com TinyURL:', shortUrl);
          } else {
            throw new Error('TinyURL falhou para URL local');
          }
        } catch (localError) {
          console.log('❌ Falha no TinyURL para URL local, usando fallback:', localError.message);
          const crypto = require('crypto');
          const hash = crypto.createHash('md5').update(longUrl).digest('hex').substring(0, 8);
          shortUrl = `${req.headers.host}/s/${hash}`;
          serviceUsed = 'local';
        }
      } else {
        // Para URLs públicas, tentar is.gd primeiro
        try {
        // 1ª Opção: is.gd (gratuito, sem propaganda)
        console.log('🔄 Tentando is.gd para URL:', longUrl);
        const isGdUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
        console.log('🌐 URL da requisição is.gd:', isGdUrl);

        const isGdResponse = await fetch(isGdUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'NexoGeo/1.0 (Link Shortener)'
          },
          timeout: 10000 // Aumentar timeout para 10 segundos
        });

        console.log('📡 Resposta is.gd:', isGdResponse.status, isGdResponse.statusText);

        if (isGdResponse.ok) {
          const isGdResult = await isGdResponse.text();
          console.log('📄 Resultado is.gd raw:', JSON.stringify(isGdResult));

          const cleanResult = isGdResult.trim();
          if (cleanResult.startsWith('http')) {
            shortUrl = cleanResult;
            serviceUsed = 'is.gd';
            console.log('✅ URL encurtada com is.gd (sem propaganda):', shortUrl);
          } else {
            console.log('❌ is.gd retornou erro:', cleanResult);
            throw new Error('is.gd retornou erro: ' + cleanResult);
          }
        } else {
          console.log('❌ is.gd status não OK:', isGdResponse.status);
          throw new Error(`is.gd retornou status ${isGdResponse.status}`);
        }
      } catch (isGdError) {
        console.log('⚠️ is.gd falhou, tentando TinyURL:', isGdError.message);

        try {
          // 2ª Opção: TinyURL (backup)
          const tinyUrlResponse = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`, {
            method: 'GET',
            timeout: 5000
          });

          if (tinyUrlResponse.ok) {
            shortUrl = await tinyUrlResponse.text();
            serviceUsed = 'tinyurl';
            console.log('⚠️ URL encurtada com TinyURL (tem propaganda):', shortUrl);
          } else {
            throw new Error('TinyURL não disponível');
          }
        } catch (tinyError) {
          console.log('❌ Ambos serviços falharam, usando fallback local:', tinyError.message);

          // 3ª Opção: Fallback local
          const crypto = require('crypto');
          const hash = crypto.createHash('md5').update(longUrl).digest('hex').substring(0, 8);
          shortUrl = `${req.headers.host}/s/${hash}`;
          serviceUsed = 'local';
          console.log('🔧 URL encurtada com fallback local:', shortUrl);
        }
      }
      } // Fechar o bloco else para URLs públicas

      return res.status(200).json({
        success: true,
        shortUrl: shortUrl,
        originalUrl: longUrl,
        service: serviceUsed,
        message: serviceUsed === 'is.gd' ? 'Link encurtado sem propaganda' :
                serviceUsed === 'tinyurl' ? 'Link encurtado (pode ter propaganda)' :
                'Link encurtado localmente'
      });

    } catch (error) {
      console.error('Erro ao encurtar URL:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno ao encurtar o link.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Serviço temporariamente indisponível'
      });
    }
  }

  // Rota padrão (index)
  return res.status(200).json({
    success: true,
    message: 'API Index funcionando!',
    method: req.method,
    url: req.url,
    routes: [
      'GET /api/ - Index da API',
      'GET /api/?route=auth - Status da autenticação',
      'POST /api/?route=auth&endpoint=login - Login',
      'POST /api/?route=auth&endpoint=logout - Logout',
      'GET /api/?route=auth&endpoint=verify - Verificar token',
      'GET /api/?route=configuracoes - Configurações do sistema',
      'GET /api/?route=promocoes - Lista de promoções',
      'POST /api/?route=promocoes - Criar promoção',
      'PUT /api/?route=promocoes&id={id} - Atualizar promoção',
      'GET /api/?route=dashboard - Dados do dashboard',
      'GET /api/?route=participantes - Lista de participantes',
      'POST /api/?route=participantes - Cadastrar participante',
      'PUT /api/?route=participantes&id={id} - Atualizar participante',
      'GET /api/?route=usuarios - Lista de usuários',
      'PATCH /api/?route=usuarios&id={id} - Atualizar senha de usuário',
      'POST /api/?route=usuarios - Atualizar senhas em lote',
      'GET /api/?route=sorteio&action=encerradas - Promoções encerradas',
      'POST /api/?route=sorteio&action=sortear - Realizar sorteio',
      'GET /api/?route=sorteio&action=ganhadores&id={promocaoId} - Ganhadores',
      'GET /api/?route=sorteio&action=participantes&promocaoId={id} - Participantes disponíveis',
      'GET /api/?route=sorteio&action=estatisticas - Estatísticas de sorteios',
      'DELETE /api/?route=sorteio&action=ganhadores&id={ganhadorId} - Cancelar sorteio'
    ],
    timestamp: new Date().toISOString()
  });
}

// Função para gráfico "Participantes por Promoção"
async function getParticipantesPorPromocao(req, res) {
  try {
    console.log('📊 Carregando participantes por promoção...');
    const result = await query(`
      SELECT
        p.nome as promocao,
        COUNT(par.id) as participantes
      FROM promocoes p
      LEFT JOIN participantes par ON par.promocao_id = p.id
      GROUP BY p.id, p.nome
      HAVING COUNT(par.id) > 0
      ORDER BY p.criado_em DESC
      LIMIT 4
    `);

    console.log('📊 Dados encontrados:', result.rows);
    return res.status(200).json({
      success: true,
      data: result.rows,
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro em participantes por promoção:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar participantes por promoção',
      data: []
    });
  }
}

// Função para gráfico "Origem dos Cadastros"
async function getOrigemCadastros(req, res) {
  try {
    const { promocao_id } = req.query;
    console.log('🍰 Carregando origem dos cadastros para promoção:', promocao_id);

    let origemQuery = `
      SELECT
        CASE
          WHEN origem_source IS NULL OR origem_source = '' THEN 'Não informado'
          ELSE INITCAP(origem_source)
        END as origem,
        COUNT(*) as total
      FROM participantes
    `;

    let queryParams = [];
    if (promocao_id && promocao_id !== 'todas') {
      origemQuery += ` WHERE promocao_id = $1`;
      queryParams.push(promocao_id);
    }

    origemQuery += `
      GROUP BY
        CASE
          WHEN origem_source IS NULL OR origem_source = '' THEN 'Não informado'
          ELSE INITCAP(origem_source)
        END
      HAVING COUNT(*) > 0
      ORDER BY total DESC
      LIMIT 8
    `;

    const result = await query(origemQuery, queryParams);
    console.log('🍰 Dados de origem encontrados:', result.rows);

    return res.status(200).json({
      success: true,
      data: result.rows.map(row => ({
        origem: row.origem,
        total: parseInt(row.total)
      })),
      source: 'database',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro em origem dos cadastros:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro ao buscar origem dos cadastros',
      data: []
    });
  }
}

// ========================
// USER DASHBOARD FUNCTIONS
// ========================

// Estatísticas do usuário específico
async function getUserStats(req, res) {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoes_ativas,
        (SELECT COUNT(*) FROM participantes) as total_participacoes,
        (SELECT COUNT(*) FROM usuarios) as total_usuarios
    `);

    const userData = {
      totalActions: 12, // Mock - ações do usuário nos últimos 30 dias
      permissions: 4, // Mock - número de permissões do usuário
      lastLoginFormatted: 'Hoje',
      sessionTime: '2h 15min'
    };

    return res.status(200).json({
      success: true,
      data: {
        ...userData,
        promocoes_ativas: parseInt(stats.rows[0].promocoes_ativas) || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getUserStats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Atividades recentes do usuário
async function getUserActivity(req, res) {
  try {
    // Mock data - em produção seria baseado no user_id do token
    const activities = [
      {
        icon: '👁️',
        title: 'Visualizou dashboard',
        details: 'Acessou painel principal',
        timeAgo: '5 min atrás',
        status: 'success'
      },
      {
        icon: '🎁',
        title: 'Acessou promoções',
        details: 'Visualizou lista de promoções ativas',
        timeAgo: '1h atrás',
        status: 'info'
      },
      {
        icon: '📊',
        title: 'Visualizou relatórios',
        details: 'Acessou analytics do sistema',
        timeAgo: '2h atrás',
        status: 'success'
      }
    ];

    return res.status(200).json({
      success: true,
      activities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getUserActivity:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Promoções disponíveis para o usuário
async function getAvailablePromotions(req, res) {
  try {
    const result = await query(`
      SELECT
        id, nome, descricao, data_inicio, data_fim, status,
        (SELECT COUNT(*) FROM participantes WHERE promocao_id = p.id) as participantes
      FROM promocoes p
      WHERE status = 'ativa'
        AND data_inicio <= NOW()
        AND data_fim >= NOW()
      ORDER BY data_inicio DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      promotions: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getAvailablePromotions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ============================
// MODERATOR DASHBOARD FUNCTIONS
// ============================

// Estatísticas do moderador
async function getModeratorStats(req, res) {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM promocoes) as promocoesGerenciadas,
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoesAtivas,
        (SELECT COUNT(*) FROM participantes) as participantesAtivos,
        (SELECT COUNT(*) FROM participantes WHERE participou_em >= CURRENT_DATE - INTERVAL '7 days') as novosPariticipantes
    `);

    return res.status(200).json({
      success: true,
      data: {
        promocoesGerenciadas: parseInt(stats.rows[0].promocoesgerenciadas) || 0,
        promocoesAtivas: parseInt(stats.rows[0].promocoesativas) || 0,
        participantesAtivos: parseInt(stats.rows[0].participantesativos) || 0,
        novosPariticipantes: parseInt(stats.rows[0].novospariticipantes) || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getModeratorStats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Ações pendentes para moderador
async function getPendingActions(req, res) {
  try {
    // Mock data - em produção buscaria ações que precisam de aprovação
    const actions = [
      {
        icon: '🎁',
        title: 'Nova promoção aguardando aprovação',
        description: 'Promoção "Sorteio de Verão" precisa ser revisada',
        urgency: 'medium'
      },
      {
        icon: '👤',
        title: 'Participante com dados incompletos',
        description: 'Verificar participação de João Silva',
        urgency: 'low'
      }
    ];

    return res.status(200).json({
      success: true,
      actions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getPendingActions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Promoções recentes para moderador
async function getRecentPromotions(req, res) {
  try {
    const result = await query(`
      SELECT
        id, nome, descricao, status, data_inicio, data_fim,
        (SELECT COUNT(*) FROM participantes WHERE promocao_id = p.id) as participantes
      FROM promocoes p
      ORDER BY data_inicio DESC
      LIMIT 10
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getRecentPromotions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Estatísticas de sorteios
async function getSorteioStats(req, res) {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM ganhadores) as totalSorteios,
        (SELECT COUNT(*) FROM ganhadores WHERE data_sorteio >= DATE_TRUNC('month', CURRENT_DATE)) as sorteiosEsseMes,
        (SELECT COUNT(*) FROM ganhadores) as ganhadores,
        (SELECT AVG(CASE WHEN LENGTH(premio) > 0 THEN 85 ELSE 0 END)) as participacaoMedia,
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoesSorteadas
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalSorteios: parseInt(stats.rows[0].totalsorteios) || 0,
        sorteiosEsseMes: parseInt(stats.rows[0].sorteiossemmes) || 0,
        ganhadores: parseInt(stats.rows[0].ganhadores) || 0,
        participacaoMedia: parseInt(stats.rows[0].participacaomedia) || 0,
        promocoesSorteadas: parseInt(stats.rows[0].promocoessorteadas) || 0,
        proximoSorteio: 'Em breve'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getSorteioStats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// ===========================
// VIEWER DASHBOARD FUNCTIONS
// ===========================

// Resumo de relatórios para viewer
async function getReportsSummary(req, res) {
  try {
    const stats = await query(`
      SELECT
        (SELECT COUNT(*) FROM participantes) as totalParticipantes,
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') as promocoesAtivas,
        (SELECT COUNT(*) FROM promocoes) as promocoesTotal,
        (SELECT COUNT(*) FROM ganhadores) as sorteiosRealizados,
        (SELECT COUNT(*) FROM ganhadores) as ganhadores,
        (SELECT COUNT(DISTINCT cidade) FROM participantes WHERE cidade IS NOT NULL) as cidadesCobertas
    `);

    const growth = await query(`
      SELECT COUNT(*) as crescimento
      FROM participantes
      WHERE participou_em >= DATE_TRUNC('month', CURRENT_DATE)
    `);

    return res.status(200).json({
      success: true,
      data: {
        totalParticipantes: parseInt(stats.rows[0].totalparticipantes) || 0,
        promocoesAtivas: parseInt(stats.rows[0].promocoesativas) || 0,
        promocoesTotal: parseInt(stats.rows[0].promocoestotal) || 0,
        sorteiosRealizados: parseInt(stats.rows[0].sorteiosrealizados) || 0,
        ganhadores: parseInt(stats.rows[0].ganhadores) || 0,
        cidadesCobertas: parseInt(stats.rows[0].cidadescobertas) || 0,
        regioes: Math.ceil((parseInt(stats.rows[0].cidadescobertas) || 0) / 3),
        crescimentoParticipantes: Math.round(((parseInt(growth.rows[0].crescimento) || 0) / (parseInt(stats.rows[0].totalparticipantes) || 1)) * 100)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getReportsSummary:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Dados de analytics para viewer
async function getAnalyticsData(req, res) {
  try {
    const participantes = await query(`
      SELECT COUNT(*) as total FROM participantes
    `);

    const geografico = await query(`
      SELECT
        COUNT(*) as pontos,
        COUNT(DISTINCT cidade) as cidades
      FROM participantes
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    `);

    const promocoes = await query(`
      SELECT
        (SELECT COUNT(*) FROM promocoes WHERE status = 'ativa') * 78 / 100 as conversao,
        (SELECT COUNT(*) FROM participantes) * 85 / 100 as engagement
    `);

    return res.status(200).json({
      success: true,
      data: {
        participantes: {
          total: parseInt(participantes.rows[0].total) || 0
        },
        geografico: {
          pontos: parseInt(geografico.rows[0].pontos) || 0,
          cidades: parseInt(geografico.rows[0].cidades) || 0
        },
        promocoes: {
          conversao: parseInt(promocoes.rows[0].conversao) || 0,
          engagement: parseInt(promocoes.rows[0].engagement) || 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getAnalyticsData:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Dados de gráficos para viewer
async function getChartsData(req, res) {
  try {
    const participacoesPorMes = await query(`
      SELECT
        DATE_TRUNC('month', participou_em) as mes,
        COUNT(*) as participacoes
      FROM participantes
      WHERE participou_em >= NOW() - INTERVAL '5 months'
      GROUP BY DATE_TRUNC('month', participou_em)
      ORDER BY mes ASC
    `);

    const cidadesTop = await query(`
      SELECT
        cidade,
        COUNT(*) as total
      FROM participantes
      WHERE cidade IS NOT NULL AND cidade != ''
      GROUP BY cidade
      ORDER BY total DESC
      LIMIT 4
    `);

    return res.status(200).json({
      success: true,
      data: {
        participacoes_por_mes: participacoesPorMes.rows,
        cidades_top: cidadesTop.rows
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro em getChartsData:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}