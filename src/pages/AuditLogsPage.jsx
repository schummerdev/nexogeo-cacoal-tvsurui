// src/pages/AuditLogsPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { exportAuditLogs, cleanupOldLogs } from '../services/auditService';
import './DashboardPages.css';

const AuditLogsPage = () => {
  const { user, isUserAdmin } = useAuth();
  const { showToast } = useToast();
  
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    tableName: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0
  });
  const [totalLogs, setTotalLogs] = useState(0);

  // Verificar se usuário tem acesso (temporariamente desabilitado para debug)
  // TODO: Reativar controle de acesso após configurar roles corretamente
  /* if (!isUserAdmin()) {
    return (
      <>
        <Header
          title="Logs de Auditoria"
          subtitle="Acesso restrito - apenas administradores"
        />
        <div className="access-denied-container">
          <div className="access-denied-content">
            <div className="access-denied-icon">🚫</div>
            <h2>Acesso Negado</h2>
            <p>Você não tem permissão para visualizar os logs de auditoria.</p>
            <p>Apenas administradores podem acessar esta funcionalidade.</p>
            <button
              className="btn btn-primary"
              onClick={() => window.history.back()}
            >
              Voltar
            </button>
          </div>
        </div>
      </>
    );
  } */

  useEffect(() => {
    loadAuditData();
  }, [filters]);

  const loadAuditData = async () => {
    try {
      setLoading(true);

      // Construir URL com parâmetros de filtro
      const queryParams = new URLSearchParams();
      queryParams.append('route', 'audit');
      queryParams.append('action', 'logs');

      if (filters.action) queryParams.append('action_filter', filters.action);
      if (filters.tableName) queryParams.append('table_name', filters.tableName);
      if (filters.startDate) queryParams.append('start_date', filters.startDate);
      if (filters.endDate) queryParams.append('end_date', filters.endDate);
      if (filters.limit) queryParams.append('limit', filters.limit);
      if (filters.offset) queryParams.append('offset', filters.offset);

      const logsUrl = `/api/?${queryParams.toString()}`;
      console.log('🔍 Carregando logs com filtros:', logsUrl);

      // Carregar logs e estatísticas usando API consolidada
      const [logsResponse, statsResponse] = await Promise.allSettled([
        fetch(logsUrl, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch(`/api/?route=audit&action=stats&days=30`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      if (logsResponse.status === 'fulfilled' && logsResponse.value.ok) {
        const logsData = await logsResponse.value.json();
        setLogs(logsData.logs || []);
        setTotalLogs(logsData.total || 0);
      }

      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const statsData = await statsResponse.value.json();
        setStats(statsData);
      }

    } catch (error) {
      console.error('Erro ao carregar dados de auditoria:', error);
      showToast('Erro ao carregar logs de auditoria', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      offset: 0 // Reset para primeira página
    }));
  };

  const handleExport = async (format) => {
    try {
      await exportAuditLogs(filters, format);
      showToast(`Logs exportados em formato ${format.toUpperCase()}`, 'success');
    } catch (error) {
      showToast('Erro ao exportar logs', 'error');
    }
  };

  const handleCleanup = async () => {
    const confirmMessage = `Confirma a limpeza de logs conforme LGPD?

POLÍTICA DE RETENÇÃO:
• Logs de auditoria: 2 anos
• Logs operacionais: 1 ano
• Logs de sistema: 6 meses

Esta ação não pode ser desfeita.`;

    if (window.confirm(confirmMessage)) {
      try {
        const result = await cleanupOldLogs();
        const details = result.details ? '\n\n' + result.details.join('\n') : '';
        showToast(`LGPD: ${result.deleted_count} logs removidos${details}`, 'success');
        loadAuditData(); // Recarregar dados
      } catch (error) {
        showToast('Erro ao executar limpeza LGPD', 'error');
      }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getActionIcon = (action) => {
    const icons = {
      'CREATE': '➕',
      'UPDATE': '✏️',
      'DELETE': '🗑️',
      'VIEW': '👁️',
      'LOGIN': '🔐',
      'LOGOUT': '🚪',
      'EXPORT': '📥',
      'DRAW': '🎲',
      'CANCEL_WINNER': '❌'
    };
    return icons[action] || '📝';
  };

  const getActionColor = (action) => {
    const colors = {
      'CREATE': 'success',
      'UPDATE': 'warning',
      'DELETE': 'danger',
      'VIEW': 'info',
      'LOGIN': 'primary',
      'LOGOUT': 'secondary',
      'EXPORT': 'info',
      'DRAW': 'success',
      'CANCEL_WINNER': 'danger'
    };
    return colors[action] || 'secondary';
  };

  const renderValueChanges = (log) => {
    // FIX: Processar valores para qualquer ação - v2.0
    if (!log.old_values && !log.new_values) {
      return <span className="no-changes">-</span>;
    }

    try {
      const oldValues = log.old_values ? (typeof log.old_values === 'string' ? JSON.parse(log.old_values) : log.old_values) : {};
      const newValues = log.new_values ? (typeof log.new_values === 'string' ? JSON.parse(log.new_values) : log.new_values) : {};

      const changes = [];

      // Para ações que têm ambos old_values e new_values, mostrar diferenças
      if (oldValues && newValues && Object.keys(oldValues).length > 0 && Object.keys(newValues).length > 0) {
        Object.keys(newValues).forEach(key => {
          const oldVal = oldValues[key];
          const newVal = newValues[key];
          const isDifferent = oldVal !== newVal;

          if (isDifferent) {
            // Mascarar senhas
            const oldValMasked = key.toLowerCase().includes('senha') ? '***' : String(oldValues[key] || '').substring(0, 20);
            const newValMasked = key.toLowerCase().includes('senha') ? '***' : String(newValues[key] || '').substring(0, 20);

            changes.push(
              <div key={key} className="value-change">
                <strong>{key}:</strong> {oldValMasked} → {newValMasked}
              </div>
            );
          }
        });
      }

      // Para CREATE, mostrar valores criados
      if (log.action === 'CREATE' && newValues) {
        Object.keys(newValues).slice(0, 3).forEach(key => {
          if (key !== 'id' && key !== 'created_at') {
            const val = key.toLowerCase().includes('senha') ? '***' : String(newValues[key] || '').substring(0, 30);
            changes.push(
              <div key={key} className="value-new">
                <strong>{key}:</strong> {val}
              </div>
            );
          }
        });
      }

      // Para DELETE, mostrar valores removidos
      if (log.action === 'DELETE' && oldValues) {
        Object.keys(oldValues).slice(0, 2).forEach(key => {
          if (key !== 'id') {
            const val = key.toLowerCase().includes('senha') ? '***' : String(oldValues[key] || '').substring(0, 30);
            changes.push(
              <div key={key} className="value-deleted">
                <strong>{key}:</strong> {val}
              </div>
            );
          }
        });
      }

      return changes.length > 0 ? (
        <div className="values-container">
          {changes}
        </div>
      ) : <span className="no-changes">-</span>;

    } catch (error) {
      console.error('Erro ao processar valores:', error);
      return <span className="error-values">Erro ao processar</span>;
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          title="Logs de Auditoria" 
          subtitle="Sistema de monitoramento e conformidade LGPD"
        />
        <div className="dashboard-content">
          <LoadingSpinner />
        </div>
      </>
    );
  }

  return (
    <>
      <Header 
        title="🔍 Logs de Auditoria" 
        subtitle="Sistema de monitoramento e conformidade LGPD"
      />
      
      <div className="dashboard-content audit-logs-page">
        {/* Estatísticas */}
        {stats && (
          <div className="kpi-grid audit-stats">
            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-icon">📊</span>
                <h3>Total de Ações</h3>
              </div>
              <div className="kpi-value">{stats.total_actions || 0}</div>
              <div className="kpi-trend neutral">últimos 30 dias</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-icon">➕</span>
                <h3>Criações</h3>
              </div>
              <div className="kpi-value">{stats.creates || 0}</div>
              <div className="kpi-trend positive">registros</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-icon">✏️</span>
                <h3>Alterações</h3>
              </div>
              <div className="kpi-value">{stats.updates || 0}</div>
              <div className="kpi-trend warning">modificações</div>
            </div>

            <div className="kpi-card">
              <div className="kpi-header">
                <span className="kpi-icon">🗑️</span>
                <h3>Exclusões</h3>
              </div>
              <div className="kpi-value">{stats.deletes || 0}</div>
              <div className="kpi-trend negative">remoções</div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="card audit-filters">
          <h3 className="card-title">🔍 Filtros de Pesquisa</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Ação:</label>
              <select 
                value={filters.action} 
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">Todas as ações</option>
                <option value="CREATE">Criação</option>
                <option value="UPDATE">Alteração</option>
                <option value="DELETE">Exclusão</option>
                <option value="VIEW">Visualização</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="EXPORT">Exportação</option>
                <option value="DRAW">Sorteio</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Tabela:</label>
              <select 
                value={filters.tableName} 
                onChange={(e) => handleFilterChange('tableName', e.target.value)}
              >
                <option value="">Todas as tabelas</option>
                <option value="participantes">Participantes</option>
                <option value="promocoes">Promoções</option>
                <option value="ganhadores">Ganhadores</option>
                <option value="usuarios_admin">Usuários Admin</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Data Início:</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Data Fim:</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button 
              className="btn-secondary"
              onClick={() => setFilters({
                action: '', tableName: '', startDate: '', endDate: '', 
                limit: 50, offset: 0
              })}
            >
              🗑️ Limpar Filtros
            </button>
            
            <div className="export-buttons">
              <button 
                className="btn-primary btn-small"
                onClick={() => handleExport('csv')}
              >
                📋 Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Logs */}
        <div className="card audit-logs-table">
          <div className="card-header">
            <h3 className="card-title">📝 Logs de Auditoria ({totalLogs} registros)</h3>
            <button
              className="btn-danger btn-small"
              onClick={handleCleanup}
              title="Limpeza conforme LGPD: Logs de auditoria (2 anos), Operacionais (1 ano), Sistema (6 meses)"
            >
              🧹 Limpeza LGPD
            </button>
          </div>

          <div className="table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Tabela</th>
                  <th>Registro ID</th>
                  <th>Valores</th>
                  <th>IP</th>
                  <th>Status</th>
                  <th>Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td className="date-cell">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="user-cell">
                        {log.user_name || log.user_id || 'Sistema'}
                      </td>
                      <td className="action-cell">
                        <span className={`action-badge ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)} {log.action}
                        </span>
                      </td>
                      <td className="table-cell">
                        {log.table_name}
                      </td>
                      <td className="record-cell">
                        {log.record_id || '-'}
                      </td>
                      <td className="values-cell">
                        {renderValueChanges(log)}
                      </td>
                      <td className="ip-cell">
                        {log.ip_address || 'N/A'}
                      </td>
                      <td className="status-cell">
                        <span className={`status-badge ${log.response_status >= 400 ? 'error' : 'success'}`}>
                          {log.response_status}
                        </span>
                      </td>
                      <td className="details-cell">
                        {log.error_message && (
                          <span className="error-indicator" title={log.error_message}>
                            ⚠️
                          </span>
                        )}
                        {log.additional_data && (
                          <button
                            className="btn-link btn-small"
                            onClick={async () => {
                              try {
                                const data = typeof log.additional_data === 'string'
                                  ? log.additional_data
                                  : JSON.stringify(log.additional_data, null, 2);

                                if (navigator.clipboard && navigator.clipboard.writeText) {
                                  await navigator.clipboard.writeText(data);
                                  showToast('Dados copiados para área de transferência', 'success');
                                } else {
                                  // Fallback para navegadores sem suporte ao clipboard API
                                  const textArea = document.createElement('textarea');
                                  textArea.value = data;
                                  document.body.appendChild(textArea);
                                  textArea.select();
                                  document.execCommand('copy');
                                  document.body.removeChild(textArea);
                                  showToast('Dados copiados para área de transferência', 'success');
                                }
                              } catch (error) {
                                console.error('Erro ao copiar dados:', error);
                                showToast('Erro ao copiar dados. Tente novamente.', 'error');
                              }
                            }}
                            title="Copiar dados adicionais"
                          >
                            📋
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-state">
                      <div className="empty-message">
                        <span>📭</span>
                        <p>Nenhum log encontrado com os filtros aplicados</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          <div className="pagination">
            <button 
              className="btn-secondary btn-small"
              disabled={filters.offset === 0}
              onClick={() => handleFilterChange('offset', (filters.offset - filters.limit > 0 ? filters.offset - filters.limit : 0))}
            >
              ← Anterior
            </button>
            
            <span className="pagination-info">
              Mostrando {filters.offset + 1} a {(filters.offset + filters.limit < totalLogs ? filters.offset + filters.limit : totalLogs)} de {totalLogs}
            </span>
            
            <button 
              className="btn-secondary btn-small"
              disabled={filters.offset + filters.limit >= totalLogs}
              onClick={() => handleFilterChange('offset', filters.offset + filters.limit)}
            >
              Próxima →
            </button>
          </div>
        </div>

        {/* Informações LGPD */}
        <div className="card lgpd-info">
          <h3 className="card-title">ℹ️ Informações LGPD</h3>
          <div className="lgpd-content">
            <p><strong>Finalidade:</strong> Os logs de auditoria são mantidos para garantir a segurança e conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>
            <p><strong>Base Legal:</strong> Cumprimento de obrigação legal (Art. 7º, II da LGPD) e interesse legítimo (Art. 7º, IX da LGPD).</p>
            <p><strong>Retenção:</strong> Logs de auditoria são mantidos por 2 anos. Logs de sistema por 6 meses a 1 ano conforme criticidade.</p>
            <p><strong>Acesso:</strong> Apenas administradores têm acesso aos logs completos de auditoria.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditLogsPage;