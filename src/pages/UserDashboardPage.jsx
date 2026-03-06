// src/pages/UserDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './DashboardPages.css';

const UserDashboardPage = () => {
  const { user, userName, userRole } = useAuth();
  const { showToast } = useToast();

  const [userStats, setUserStats] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [availablePromotions, setAvailablePromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserDashboardData();
  }, []);

  const loadUserDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar dados limitados para usuário
      const [statsResponse, activityResponse, promotionsResponse] = await Promise.allSettled([
        fetch('/api/dashboard?action=user-stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=user-activity', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=available-promotions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      // Processar estatísticas do usuário
      if (statsResponse.status === 'fulfilled' && statsResponse.value.ok) {
        const data = await statsResponse.value.json();
        setUserStats(data);
      }

      // Processar atividade do usuário
      if (activityResponse.status === 'fulfilled' && activityResponse.value.ok) {
        const data = await activityResponse.value.json();
        setUserActivity(data.activities || []);
      }

      // Processar promoções disponíveis
      if (promotionsResponse.status === 'fulfilled' && promotionsResponse.value.ok) {
        const data = await promotionsResponse.value.json();
        setAvailablePromotions(data.promotions || []);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard usuário:', error);
      showToast('Erro ao carregar seus dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePromotionAction = (promotionId, action) => {
    switch (action) {
      case 'view':
        window.open(`/participar?promocao=${promotionId}`, '_blank');
        break;
      case 'share':
        const url = `${window.location.origin}/participar?promocao=${promotionId}`;
        navigator.clipboard.writeText(url);
        showToast('Link copiado para área de transferência!', 'success');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <>
        <Header
          title={`Meu Painel - ${userName}`}
          subtitle="Suas atividades e promoções disponíveis"
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
        title={`👤 Meu Painel - ${userName}`}
        subtitle="Suas atividades e promoções disponíveis"
      />

      <div className="dashboard-content user-dashboard">
        {/* Badge de Role */}
        <div className="user-role-badge">
          <span className={`role-badge ${userRole}`}>
            {userRole === 'admin' && '🛡️ Administrador'}
            {userRole === 'moderator' && '🔧 Moderador'}
            {userRole === 'editor' && '✏️ Editor'}
            {userRole === 'viewer' && '👁️ Visualizador'}
            {userRole === 'user' && '👤 Usuário'}
          </span>
        </div>

        {/* KPIs do Usuário */}
        <div className="kpi-grid user-kpis">
          <div className="kpi-card user-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">📊</span>
              <h3>Minhas Ações</h3>
            </div>
            <div className="kpi-value">{userStats?.totalActions || 0}</div>
            <div className="kpi-trend neutral">
              últimos 30 dias
            </div>
          </div>

          <div className="kpi-card user-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">🎁</span>
              <h3>Promoções Disponíveis</h3>
            </div>
            <div className="kpi-value">{availablePromotions.length}</div>
            <div className="kpi-trend positive">
              ativas agora
            </div>
          </div>

          <div className="kpi-card user-kpi">
            <div className="kpi-header">
              <span className="kpi-icon">📅</span>
              <h3>Último Acesso</h3>
            </div>
            <div className="kpi-value">{userStats?.lastLoginFormatted || 'Hoje'}</div>
            <div className="kpi-trend neutral">
              {userStats?.sessionTime || '0h'} sessão
            </div>
          </div>

          {userRole !== 'viewer' && (
            <div className="kpi-card user-kpi">
              <div className="kpi-header">
                <span className="kpi-icon">⚡</span>
                <h3>Permissões</h3>
              </div>
              <div className="kpi-value">{userStats?.permissions || 0}</div>
              <div className="kpi-trend positive">
                ações permitidas
              </div>
            </div>
          )}
        </div>

        {/* Promoções Disponíveis */}
        <div className="card available-promotions">
          <h3 className="card-title">🎁 Promoções Disponíveis</h3>
          <div className="promotions-grid">
            {availablePromotions.length > 0 ? (
              availablePromotions.map((promotion) => (
                <div key={promotion.id} className="promotion-card">
                  <div className="promotion-header">
                    <h4>{promotion.nome}</h4>
                    <span className={`promotion-status ${promotion.status}`}>
                      {promotion.status}
                    </span>
                  </div>
                  <div className="promotion-details">
                    <p>{promotion.descricao}</p>
                    <div className="promotion-meta">
                      <span>📅 Até: {new Date(promotion.data_fim).toLocaleDateString('pt-BR')}</span>
                      <span>👥 {promotion.participantes || 0} participações</span>
                    </div>
                  </div>
                  <div className="promotion-actions">
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => handlePromotionAction(promotion.id, 'view')}
                    >
                      👁️ Ver Detalhes
                    </button>
                    <button
                      className="btn-primary btn-small"
                      onClick={() => handlePromotionAction(promotion.id, 'share')}
                    >
                      📋 Copiar Link
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-promotions">
                <span>📭</span>
                <p>Nenhuma promoção disponível no momento</p>
              </div>
            )}
          </div>
        </div>

        {/* Minha Atividade Recente */}
        <div className="card user-activities">
          <h3 className="card-title">📝 Minha Atividade Recente</h3>
          <div className="activities-list">
            {userActivity.length > 0 ? (
              userActivity.map((activity, index) => (
                <div key={index} className="activity-item user-activity">
                  <div className="activity-icon">{activity.icon || '📝'}</div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-details">{activity.details}</div>
                    <div className="activity-time">{activity.timeAgo}</div>
                  </div>
                  <div className="activity-status">
                    <span className={`status-badge ${activity.status}`}>
                      {activity.status === 'success' && '✅'}
                      {activity.status === 'warning' && '⚠️'}
                      {activity.status === 'error' && '❌'}
                      {activity.status === 'info' && 'ℹ️'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activities">
                <span>📭</span>
                <p>Nenhuma atividade recente</p>
                <small>Suas ações aparecerão aqui</small>
              </div>
            )}
          </div>
        </div>

        {/* Links Rápidos */}
        <div className="card quick-links">
          <h3 className="card-title">🚀 Links Rápidos</h3>
          <div className="quick-links-grid">
            {userRole === 'admin' && (
              <Link to="/dashboard/configuracoes" className="quick-link admin">
                <span className="link-icon">⚙️</span>
                <span className="link-label">Configurações</span>
              </Link>
            )}

            {['admin', 'moderator', 'editor'].includes(userRole) && (
              <Link to="/dashboard/promocoes" className="quick-link editor">
                <span className="link-icon">🎁</span>
                <span className="link-label">Gerenciar Promoções</span>
              </Link>
            )}

            {['admin', 'moderator'].includes(userRole) && (
              <Link to="/dashboard/sorteio" className="quick-link moderator">
                <span className="link-icon">🎲</span>
                <span className="link-label">Realizar Sorteios</span>
              </Link>
            )}

            {['admin', 'moderator', 'editor', 'viewer'].includes(userRole) && (
              <Link to="/dashboard/mapas" className="quick-link viewer">
                <span className="link-icon">🗺️</span>
                <span className="link-label">Ver Mapas</span>
              </Link>
            )}

            {/* Link para promoções ativas - disponível para todos */}
            <a href="/promocoes-ativas" target="_blank" rel="noopener noreferrer" className="quick-link user">
              <span className="link-icon">🎁</span>
              <span className="link-label">Ver Promoções Ativas</span>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserDashboardPage;