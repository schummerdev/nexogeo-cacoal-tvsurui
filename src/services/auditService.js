// src/services/auditService.js
// Serviço de auditoria para conformidade LGPD

const API_BASE_URL = '/api';

/**
 * Log de ação de auditoria
 */
export const logAction = async (action, tableName, recordId, additionalData = {}, oldValues = null, newValues = null) => {
  try {
    const url = `${API_BASE_URL}/?route=audit&action=log`;
    const payload = {
      action,
      table_name: tableName,
      record_id: recordId,
      old_values: oldValues,
      new_values: newValues,
      additional_data: additionalData,
      timestamp: new Date().toISOString()
    };

    console.log('🔍 Tentando registrar log de auditoria:', { url, payload });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('❌ Erro ao registrar log de auditoria:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Detalhes do erro:', errorText);
    } else {
      const result = await response.json();
      console.log('✅ Log de auditoria registrado com sucesso:', result);
    }
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error);
  }
};

/**
 * Log de acesso a dados pessoais
 */
export const logDataAccess = async (participantId, dataType, accessReason, maskedData = true) => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=audit&action=data-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        participant_id: participantId,
        data_type: dataType,
        access_reason: accessReason,
        masked_data: maskedData,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Erro ao registrar acesso a dados:', response.statusText);
    }
  } catch (error) {
    console.error('Erro ao registrar acesso a dados:', error);
  }
};

/**
 * Log de consentimento LGPD
 */
export const logConsent = async (participantId, consentType, consentGiven, consentText, version) => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=audit&action=consent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        participant_id: participantId,
        consent_type: consentType,
        consent_given: consentGiven,
        consent_text: consentText,
        consent_version: version,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Erro ao registrar consentimento:', response.statusText);
    }
  } catch (error) {
    console.error('Erro ao registrar consentimento:', error);
  }
};

/**
 * Buscar logs de auditoria
 */
export const fetchAuditLogs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.userId) queryParams.append('user_id', filters.userId);
    if (filters.action) queryParams.append('action', filters.action);
    if (filters.tableName) queryParams.append('table_name', filters.tableName);
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);

    const response = await fetch(`${API_BASE_URL}/?route=audit&action=logs&${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar logs de auditoria');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    throw error;
  }
};

/**
 * Buscar logs de acesso a dados
 */
export const fetchDataAccessLogs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.participantId) queryParams.append('participant_id', filters.participantId);
    if (filters.dataType) queryParams.append('data_type', filters.dataType);
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(`${API_BASE_URL}/?route=audit&action=data-access-logs&${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar logs de acesso a dados');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar logs de acesso a dados:', error);
    throw error;
  }
};

/**
 * Buscar estatísticas de auditoria
 */
export const fetchAuditStats = async (daysBack = 30) => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=audit&action=stats&days=${daysBack}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar estatísticas de auditoria');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar estatísticas de auditoria:', error);
    throw error;
  }
};

/**
 * Exportar logs de auditoria
 */
export const exportAuditLogs = async (filters = {}, format = 'csv') => {
  try {
    // Construir URL garantindo que route e action sejam corretos
    const queryParams = new URLSearchParams();
    queryParams.append('route', 'audit');
    queryParams.append('action', 'export');
    queryParams.append('format', format);

    // Adicionar filtros (excluindo route e action para evitar conflitos)
    Object.keys(filters).forEach(key => {
      if (key !== 'route' && key !== 'action' && filters[key]) {
        queryParams.append(key, filters[key]);
      }
    });

    const exportUrl = `${API_BASE_URL}/?${queryParams.toString()}`;
    console.log('📄 Exportando com URL:', exportUrl);

    const response = await fetch(exportUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao exportar logs de auditoria');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    throw error;
  }
};

/**
 * Validar retenção de dados
 */
export const checkDataRetention = async (recordId, dataType) => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=audit&action=retention-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({
        record_id: recordId,
        data_type: dataType
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao verificar retenção de dados');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar retenção:', error);
    throw error;
  }
};

/**
 * Executar limpeza de logs antigos
 */
export const cleanupOldLogs = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=audit&action=cleanup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao executar limpeza de logs');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro na limpeza de logs:', error);
    throw error;
  }
};

/**
 * Buscar logs de sistema
 */
export const fetchSystemLogs = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters.level) queryParams.append('level', filters.level);
    if (filters.component) queryParams.append('component', filters.component);
    if (filters.startDate) queryParams.append('start_date', filters.startDate);
    if (filters.endDate) queryParams.append('end_date', filters.endDate);
    if (filters.limit) queryParams.append('limit', filters.limit);

    const response = await fetch(`${API_BASE_URL}/?route=audit&action=system-logs&${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar logs de sistema');
    }

    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar logs de sistema:', error);
    throw error;
  }
};

/**
 * Log de erro sistemático
 */
export const logError = async (errorType, component, errorMessage, additionalData = {}) => {
  try {
    await logAction('ERROR', 'system_errors', null, {
      error_type: errorType,
      component: component,
      error_message: errorMessage,
      ...additionalData
    });
    console.log('🔥 Erro registrado na auditoria:', { errorType, component, errorMessage });
  } catch (auditError) {
    console.error('❌ Falha ao registrar erro na auditoria:', auditError);
  }
};

/**
 * Log de navegação/acesso
 */
export const logPageAccess = async (pageName, additionalData = {}) => {
  try {
    await logAction('PAGE_ACCESS', 'navigation', null, {
      page_name: pageName,
      ...additionalData
    });
  } catch (error) {
    console.error('❌ Erro ao registrar acesso à página:', error);
  }
};

/**
 * Helpers para facilitar o uso
 */
export const auditHelpers = {
  // Log para visualização de participante
  viewParticipant: (participantId) =>
    logDataAccess(participantId, 'full_profile', 'admin_view', false),

  // Log para exportação de dados
  exportParticipants: (participantIds) =>
    participantIds.forEach(id =>
      logDataAccess(id, 'export', 'data_export', false)
    ),

  // Log para sorteio
  performDraw: (promotionId, winnerId) =>
    logAction('DRAW', 'promocoes', promotionId, { winner_id: winnerId }),

  // Log para cancelamento de ganhador
  cancelWinner: (winnerId, reason) =>
    logAction('CANCEL_WINNER', 'ganhadores', winnerId, { reason }),

  // Log para login
  userLogin: (userId) =>
    logAction('LOGIN', 'usuarios_admin', userId),

  // Log para logout
  userLogout: (userId) =>
    logAction('LOGOUT', 'usuarios_admin', userId),

  // Log para criação de promoção
  createPromotion: (promotionId) =>
    logAction('CREATE', 'promocoes', promotionId),

  // Log para criação de participante
  createParticipant: (participantId) =>
    logAction('CREATE', 'participantes', participantId),

  // Log para edição de participante
  editParticipant: (participantId, oldData, newData) =>
    logAction('UPDATE', 'participantes', participantId, {}, oldData, newData),

  // Log para acesso a relatórios
  viewReports: (reportType) =>
    logAction('VIEW_REPORT', 'reports', null, { report_type: reportType }),

  // Log para visualização do dashboard
  viewDashboard: () =>
    logAction('VIEW', 'dashboard', null, { page: 'admin_dashboard' }),

  // Log para tentativas de exclusão bloqueadas
  blockedDeletion: (table, recordId, reason) =>
    logAction('BLOCKED_DELETE', table, recordId, { block_reason: reason }),

  // Log para exportações de auditoria
  exportAuditLogs: (format, filters) =>
    logAction('EXPORT_AUDIT', 'audit_logs', null, { format, filters }),

  // Log para exportação de dados
  exportData: (format, metadata) =>
    logAction('EXPORT', 'participantes', null, { format, ...metadata })
};

export default {
  logAction,
  logDataAccess,
  logConsent,
  fetchAuditLogs,
  fetchDataAccessLogs,
  fetchAuditStats,
  exportAuditLogs,
  checkDataRetention,
  cleanupOldLogs,
  fetchSystemLogs,
  logError,
  logPageAccess,
  auditHelpers
};