// api/audit.js - Sistema de auditoria e logs consolidado
const jwt = require('jsonwebtoken');
const databasePool = require('./_lib/database');
const { getSecureHeaders, getJWTSecret } = require('./_lib/security');

// Função principal para roteamento
module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));

  const { action } = req.query;

  try {
    switch (action) {
      case 'logs':
        return await handleLogs(req, res);
      case 'create':
        return await createAuditLog(req, res);
      case 'search':
        return await searchAuditLogs(req, res);
      default:
        return await getAuditLogs(req, res);
    }
  } catch (error) {
    console.error('Erro em audit:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
};

// Função para lidar com logs (migrado de logs.js)
async function handleLogs(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const decoded = verifyToken(req);

    if (req.method === 'GET') {
      return await getLogs(req, res, decoded);
    } else if (req.method === 'POST') {
      return await createLog(req, res, decoded);
    } else {
      return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

// Middleware para verificar o token
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new Error('Token de autorização não fornecido');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, getJWTSecret());
    return decoded;
  } catch (error) {
    throw new Error('Token inválido ou expirado');
  }
};

// Middleware para auditoria automática
const auditMiddleware = (action, tableName) => {
  return async (req, res, next) => {
    // Capturar dados da requisição
    const startTime = Date.now();
    const originalJson = res.json;
    
    // Interceptar resposta para capturar status e dados
    res.json = function(data) {
      const executionTime = Date.now() - startTime;
      
      // Log assíncrono para não afetar performance
      setImmediate(async () => {
        try {
          await logAuditAction({
            user_id: req.user?.id || null,
            action: action,
            table_name: tableName,
            record_id: extractRecordId(req, data),
            old_values: req.auditOldData || null,
            new_values: extractNewData(data),
            ip_address: getClientIP(req),
            user_agent: req.get('User-Agent') || null,
            session_id: req.sessionID || null,
            request_method: req.method,
            request_url: req.originalUrl,
            response_status: res.statusCode,
            execution_time: executionTime,
            error_message: res.statusCode >= 400 ? data?.message : null,
            additional_data: {
              query_params: req.query,
              body_size: JSON.stringify(req.body || {}).length,
              timestamp: new Date().toISOString()
            }
          });
        } catch (error) {
          console.error('Erro ao registrar auditoria:', error);
        }
      });
      
      originalJson.call(this, data);
    };
    
    next();
  };
};

// Função principal para log de auditoria
const logAuditAction = async (logData) => {
  try {
    const query = `
      INSERT INTO audit_logs (
        user_id, action, table_name, record_id, old_values, new_values,
        ip_address, user_agent, session_id, request_method, request_url,
        response_status, execution_time, error_message, additional_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `;
    
    await databasePool.query(query, [
      logData.user_id,
      logData.action,
      logData.table_name,
      logData.record_id,
      logData.old_values,
      logData.new_values,
      logData.ip_address,
      logData.user_agent,
      logData.session_id,
      logData.request_method,
      logData.request_url,
      logData.response_status,
      logData.execution_time,
      logData.error_message,
      logData.additional_data
    ]);
  } catch (error) {
    console.error('Erro ao inserir log de auditoria:', error);
  }
};

// Log de acesso a dados pessoais
const logDataAccess = async (logData) => {
  try {
    const query = `
      INSERT INTO data_access_logs (
        user_id, participant_id, data_type, access_reason, 
        legal_basis, masked_data, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await databasePool.query(query, [
      logData.user_id,
      logData.participant_id,
      logData.data_type,
      logData.access_reason,
      logData.legal_basis || 'legitimate_interest',
      logData.masked_data,
      logData.ip_address,
      logData.user_agent
    ]);
  } catch (error) {
    console.error('Erro ao inserir log de acesso a dados:', error);
  }
};

// Log de consentimento
const logConsent = async (logData) => {
  try {
    const query = `
      INSERT INTO consent_logs (
        participant_id, consent_type, consent_given, consent_text,
        consent_version, ip_address, user_agent, withdrawal_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await databasePool.query(query, [
      logData.participant_id,
      logData.consent_type,
      logData.consent_given,
      logData.consent_text,
      logData.consent_version,
      logData.ip_address,
      logData.user_agent,
      logData.withdrawal_reason
    ]);
  } catch (error) {
    console.error('Erro ao inserir log de consentimento:', error);
  }
};

// Funções auxiliares
const getClientIP = (req) => {
  return req.ip || 
         req.connection?.remoteAddress || req.socket?.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
};

const extractRecordId = (req, responseData) => {
  // Tentar extrair ID do response
  if (responseData?.data?.id) return responseData.data.id;
  if (responseData?.id) return responseData.id;
  
  // Tentar extrair ID da URL
  const urlParts = req.originalUrl.split('/');
  const lastPart = urlParts[urlParts.length - 1];
  const id = parseInt(lastPart);
  
  return isNaN(id) ? null : id;
};

const extractNewData = (responseData) => {
  if (!responseData) return null;
  
  // Remover dados sensíveis antes de logar
  const sanitized = { ...responseData };
  delete sanitized.senha;
  delete sanitized.password;
  delete sanitized.token;
  
  return sanitized;
};

// Handler principal das rotas de auditoria
module.exports = async (req, res) => {
  const headers = getSecureHeaders();
  Object.keys(headers).forEach(key => res.setHeader(key, headers[key]));
  
  const { method } = req;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;
  
  try {
    // POST /api/audit/log - Registrar ação de auditoria
    if (method === 'POST' && path === '/api/audit/log') {
      const { action, table_name, record_id, additional_data } = req.body;
      
      await logAuditAction({
        user_id: req.user?.id || null,
        action,
        table_name,
        record_id,
        old_values: null,
        new_values: additional_data,
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID,
        request_method: 'MANUAL_LOG',
        request_url: req.originalUrl,
        response_status: 200,
        execution_time: 0,
        error_message: null,
        additional_data: additional_data
      });
      
      return res.status(200).json({ success: true });
    }
    
    // POST /api/audit/data-access - Log de acesso a dados
    if (method === 'POST' && path === '/api/audit/data-access') {
      const { participant_id, data_type, access_reason, masked_data } = req.body;
      
      await logDataAccess({
        user_id: req.user?.id || null,
        participant_id,
        data_type,
        access_reason,
        legal_basis: 'legitimate_interest',
        masked_data,
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent')
      });
      
      return res.status(200).json({ success: true });
    }
    
    // POST /api/audit/consent - Log de consentimento
    if (method === 'POST' && path === '/api/audit/consent') {
      const { participant_id, consent_type, consent_given, consent_text, consent_version } = req.body;
      
      await logConsent({
        participant_id,
        consent_type,
        consent_given,
        consent_text,
        consent_version,
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent'),
        withdrawal_reason: null
      });
      
      return res.status(200).json({ success: true });
    }
    
    // GET /api/audit/logs - Buscar logs de auditoria
    if (method === 'GET' && path === '/api/audit/logs') {
      const { user_id, action, table_name, start_date, end_date, limit = 50, offset = 0 } = url.searchParams;
      
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params = [];
      let paramCount = 0;
      
      if (user_id) {
        query += ` AND user_id = $${++paramCount}`;
        params.push(user_id);
      }
      
      if (action) {
        query += ` AND action = $${++paramCount}`;
        params.push(action);
      }
      
      if (table_name) {
        query += ` AND table_name = $${++paramCount}`;
        params.push(table_name);
      }
      
      if (start_date) {
        query += ` AND created_at >= $${++paramCount}`;
        params.push(start_date);
      }
      
      if (end_date) {
        query += ` AND created_at <= $${++paramCount}`;
        params.push(end_date);
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
      params.push(limit, offset);
      
      const result = await databasePool.query(query, params);
      
      return res.status(200).json({
        logs: result.rows,
        total: result.rowCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
    }
    
    // GET /api/audit/stats - Estatísticas de auditoria
    if (method === 'GET' && path === '/api/audit/stats') {
      const { days = 30 } = url.searchParams;
      
      const result = await databasePool.query('SELECT * FROM get_audit_stats($1)', [days]);
      
      return res.status(200).json(result.rows[0] || {});
    }
    
    // GET /api/audit/data-access-logs - Logs de acesso a dados
    if (method === 'GET' && path === '/api/audit/data-access-logs') {
      const { participant_id, data_type, start_date, end_date, limit = 50 } = url.searchParams;
      
      let query = `
        SELECT dal.*, p.nome as participant_name, u.nome as user_name
        FROM data_access_logs dal
        LEFT JOIN participantes p ON p.id = dal.participant_id
        LEFT JOIN usuarios_admin u ON u.id = dal.user_id
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 0;
      
      if (participant_id) {
        query += ` AND dal.participant_id = $${++paramCount}`;
        params.push(participant_id);
      }
      
      if (data_type) {
        query += ` AND dal.data_type = $${++paramCount}`;
        params.push(data_type);
      }
      
      if (start_date) {
        query += ` AND dal.created_at >= $${++paramCount}`;
        params.push(start_date);
      }
      
      if (end_date) {
        query += ` AND dal.created_at <= $${++paramCount}`;
        params.push(end_date);
      }
      
      query += ` ORDER BY dal.created_at DESC LIMIT $${++paramCount}`;
      params.push(limit);
      
      const result = await databasePool.query(query, params);
      
      return res.status(200).json({
        logs: result.rows,
        total: result.rowCount
      });
    }
    
    // POST /api/audit/cleanup - Limpeza de logs antigos
    if (method === 'POST' && path === '/api/audit/cleanup') {
      const result = await databasePool.query('SELECT cleanup_old_logs()');
      const deletedCount = result.rows[0].cleanup_old_logs;
      
      // Log da limpeza
      await logAuditAction({
        user_id: req.user?.id || null,
        action: 'CLEANUP',
        table_name: 'audit_logs',
        record_id: null,
        old_values: null,
        new_values: { deleted_count: deletedCount },
        ip_address: getClientIP(req),
        user_agent: req.get('User-Agent'),
        session_id: req.sessionID,
        request_method: 'POST',
        request_url: req.originalUrl,
        response_status: 200,
        execution_time: 0,
        error_message: null,
        additional_data: { operation: 'cleanup_old_logs' }
      });
      
      return res.status(200).json({
        success: true,
        deleted_count: deletedCount,
        message: `${deletedCount} registros antigos foram removidos`
      });
    }
    
    return res.status(404).json({ error: 'Endpoint não encontrado' });
    
  } catch (error) {
    console.error('Erro na API de auditoria:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
};