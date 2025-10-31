// src/pages/ModeratorDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './DashboardPages.css';

const ModeratorDashboardPage = () => {
  const { user, userName } = useAuth();
  const { showToast } = useToast();
  
  const [moderatorStats, setModeratorStats] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [recentPromotions, setRecentPromotions] = useState([]);
  const [sorteioStats, setSorteioStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadModeratorDashboardData();
  }, []);

  const loadModeratorDashboardData = async () => {
    try {
      setLoading(true);
      
      const [statsResponse, actionsResponse, promotionsResponse, sorteioResponse] = await Promise.allSettled([
        fetch('/api/dashboard?action=moderator-stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=pending-actions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=recent-promotions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=sorteio-stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const data = await statsResponse.value.json();
        setModeratorStats(data);
      }

      if (actionsResponse.status === 'fulfilled' && actionsResponse.value.ok) {
        const data = await actionsResponse.value.json();
        setPendingActions(data.actions || []);
      }

      if (promotionsResponse.status === 'fulfilled' && promotionsResponse.value.ok) {
        const data = await promotionsResponse.value.json();
        setRecentPromotions(data.promotions || []);
      }

      if (sorteioResponse.status === 'fulfilled' && sorteioResponse.value.ok) {
        const data = await sorteioResponse.value.json();
        setSorteioStats(data);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard moderador:', error);
      showToast('Erro ao carregar dados do moderador', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPromotion = () => {
    window.location.href = '/dashboard/promocoes?action=create';
  };

  const handleQuickSorteio = () => {
    window.location.href = '/dashboard/sorteio';
  };

  const handlePromotionAction = async (promotionId, action) => {
    try {
      let endpoint = '';
      let method = 'POST';
      
      switch (action) {
        case 'activate':
          endpoint = `/api/promocoes/${promotionId}/activate`;
          break;
        case 'pause':
          endpoint = `/api/promocoes/${promotionId}/pause`;
          break;
        case 'view':
          window.location.href = `/dashboard/promocoes?id=${promotionId}`;
          return;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (response.ok) {
        showToast(`Promoção ${action === 'activate' ? 'ativada' : 'pausada'} com sucesso!`, 'success');
        loadModeratorDashboardData();
      } else {
        const error = await response.json();
        showToast(`Erro: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error(`Erro em ${action}:`, error);
      showToast(`Erro ao ${action} promoção`, 'error');
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          title={`Painel Moderador - ${userName}`}
          subtitle="Gestão de promoções e controle de sorteios"
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
        title={`🔧 Painel Moderador - ${userName}`}
        subtitle="Gestão de promoções e controle de sorteios"
      />
      
      <div className="dashboard-content moderator-dashboard">
        {/* KPIs do Moderador */}
        <div className="kpi-grid">
          <div className="kpi-card moderator-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">🎁</span>
              <h3>Promoções Gerenciadas</h3>
            </div>
            <div className="kpi-value">{moderatorStats?.promocoesGerenciadas || 0}</div>
            <div className="kpi-trend positive">
              {moderatorStats?.promocoesAtivas || 0} ativas
            </div>
          </div>

          <div className="kpi-card moderator-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">🎲</span>
              <h3>Sorteios Realizados</h3>
            </div>
            <div className="kpi-value">{sorteioStats?.totalSorteios || 0}</div>
            <div className="kpi-trend positive">
              {sorteioStats?.sorteiosEsseMes || 0} este mês
            </div>
          </div>

          <div className="kpi-card moderator-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">👥</span>
              <h3>Participantes Ativos</h3>
            </div>
            <div className="kpi-value">{moderatorStats?.participantesAtivos || 0}</div>
            <div className="kpi-trend positive">
              +{moderatorStats?.novosPariticipantes || 0} novos
            </div>
          </div>

          <div className="kpi-card moderator-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">⚡</span>
              <h3>Ações Pendentes</h3>
            </div>
            <div className="kpi-value">{pendingActions.length}</div>
            <div className="kpi-trend neutral">
              requerem atenção
            </div>
          </div>
        </div>

        {/* Ações Rápidas para Moderador */}
        <div className="card moderator-actions">
          <h3 className="card-title">🚀 Ações Rápidas</h3>
          <div className="quick-actions-grid">
            <button 
              className="quick-action-btn create-promotion"
              onClick={handleQuickPromotion}
            >
              <span className="action-icon">🎁</span>
              <span className="action-label">Nova Promoção</span>
            </button>
            
            <button 
              className="quick-action-btn start-sorteio"
              onClick={handleQuickSorteio}
            >
              <span className="action-icon">🎲</span>
              <span className="action-label">Realizar Sorteio</span>
            </button>
            
            <button 
              className="quick-action-btn view-participants"
              onClick={() => window.location.href = '/dashboard/participantes'}
            >
              <span className="action-icon">👥</span>
              <span className="action-label">Ver Participantes</span>
            </button>
            
            <button 
              className="quick-action-btn view-analytics"
              onClick={() => window.location.href = '/dashboard/mapas'}
            >
              <span className="action-icon">📊</span>
              <span className="action-label">Analytics</span>
            </button>
          </div>
        </div>

        {/* Ações Pendentes */}
        {pendingActions.length > 0 && (
          <div className="card pending-actions">
            <h3 className="card-title">⚠️ Ações Pendentes</h3>
            <div className="pending-list">
              {pendingActions.map((action, index) => (
                <div key={index} className="pending-item">
                  <div className="pending-icon">{action.icon || '⚠️'}</div>
                  <div className="pending-content">
                    <div className="pending-title">{action.title}</div>
                    <div className="pending-description">{action.description}</div>
                    <div className="pending-urgency">
                      <span className={`urgency-badge ${action.urgency}`}>
                        {action.urgency === 'high' && '🔴 Alta'}
                        {action.urgency === 'medium' && '🟡 Média'}
                        {action.urgency === 'low' && '🟢 Baixa'}
                      </span>
                    </div>
                  </div>
                  <div className="pending-actions">
                    <button className="btn-primary btn-small">
                      Resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promoções Recentes */}
        <div className="card recent-promotions">
          <h3 className="card-title">🎁 Promoções Recentes</h3>
          <div className="promotions-table">
            {recentPromotions.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Status</th>
                    <th>Participantes</th>
                    <th>Data Fim</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPromotions.map((promotion) => (
                    <tr key={promotion.id}>
                      <td>
                        <div className="promotion-name">
                          <strong>{promotion.nome}</strong>
                          <small>{promotion.descricao}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge ${promotion.status}`}>
                          {promotion.status}
                        </span>
                      </td>
                      <td>{promotion.participantes || 0}</td>
                      <td>{new Date(promotion.data_fim).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="btn-icon-small"
                            onClick={() => handlePromotionAction(promotion.id, 'view')}
                            title="Ver detalhes"
                          >
                            👁️
                          </button>
                          {promotion.status === 'ativa' ? (
                            <button 
                              className="btn-icon-small"
                              onClick={() => handlePromotionAction(promotion.id, 'pause')}
                              title="Pausar promoção"
                            >
                              ⏸️
                            </button>
                          ) : (
                            <button 
                              className="btn-icon-small"
                              onClick={() => handlePromotionAction(promotion.id, 'activate')}
                              title="Ativar promoção"
                            >
                              ▶️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-promotions">
                <span>📭</span>
                <p>Nenhuma promoção recente</p>
                <button className="btn-primary" onClick={handleQuickPromotion}>
                  Criar Primeira Promoção
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Estatísticas de Sorteio */}
        {sorteioStats && (
          <div className="card sorteio-analytics">
            <h3 className="card-title">🎲 Analytics de Sorteios</h3>
            <div className="analytics-grid">
              <div className="analytic-item">
                <div className="analytic-value">{sorteioStats.ganhadores || 0}</div>
                <div className="analytic-label">Total de Ganhadores</div>
              </div>
              <div className="analytic-item">
                <div className="analytic-value">{sorteioStats.participacaoMedia || 0}%</div>
                <div className="analytic-label">Taxa de Participação</div>
              </div>
              <div className="analytic-item">
                <div className="analytic-value">{sorteioStats.promocoesSorteadas || 0}</div>
                <div className="analytic-label">Promoções Sorteadas</div>
              </div>
              <div className="analytic-item">
                <div className="analytic-value">{sorteioStats.proximoSorteio || 'N/A'}</div>
                <div className="analytic-label">Próximo Sorteio</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ModeratorDashboardPage;