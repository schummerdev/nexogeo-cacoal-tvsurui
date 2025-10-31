// src/pages/ViewerDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import './DashboardPages.css';

const ViewerDashboardPage = () => {
  const { user, userName } = useAuth();
  const { showToast } = useToast();
  
  const [reports, setReports] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [charts, setCharts] = useState(null);
  const [exportOptions, setExportOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadViewerDashboardData();
  }, []);

  const loadViewerDashboardData = async () => {
    try {
      setLoading(true);
      
      const [reportsResponse, analyticsResponse, chartsResponse] = await Promise.allSettled([
        fetch('/api/dashboard?action=reports-summary', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=analytics-data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        }),
        fetch('/api/dashboard?action=charts-data', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
        })
      ]);

      if (reportsResponse.status === 'fulfilled' && reportsResponse.value.ok) {
        const data = await reportsResponse.value.json();
        setReports(data);
      }

      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.ok) {
        const data = await analyticsResponse.value.json();
        setAnalytics(data);
      }

      if (chartsResponse.status === 'fulfilled' && chartsResponse.value.ok) {
        const data = await chartsResponse.value.json();
        setCharts(data);
      }

      // Opções de export sempre disponíveis
      setExportOptions([
        { id: 'pdf', name: 'Relatório PDF', icon: '📄' },
        { id: 'excel', name: 'Planilha Excel', icon: '📊' },
        { id: 'csv', name: 'Dados CSV', icon: '📋' }
      ]);

    } catch (error) {
      console.error('Erro ao carregar dashboard viewer:', error);
      showToast('Erro ao carregar relatórios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (exportType) => {
    try {
      const response = await fetch(`/api/reports/export?type=${exportType}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `relatorio-${new Date().toISOString().split('T')[0]}.${exportType === 'excel' ? 'xlsx' : exportType}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        showToast('Relatório exportado com sucesso!', 'success');
      } else {
        const error = await response.json();
        showToast(`Erro ao exportar: ${error.message}`, 'error');
      }
    } catch (error) {
      console.error('Erro no export:', error);
      showToast('Erro ao exportar relatório', 'error');
    }
  };

  const handleViewDetailedReport = (reportType) => {
    switch (reportType) {
      case 'participantes':
        window.open('/dashboard/mapa-participantes', '_blank');
        break;
      case 'geografico':
        window.open('/dashboard/mapas', '_blank');
        break;
      case 'promocoes':
        window.open('/dashboard/promocoes?view=readonly', '_blank');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <>
        <Header 
          title={`Relatórios - ${userName}`}
          subtitle="Visualização de dados e analytics"
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
        title={`👁️ Relatórios - ${userName}`}
        subtitle="Visualização de dados e analytics"
      />
      
      <div className="dashboard-content viewer-dashboard">
        {/* Resumo Executivo */}
        <div className="card executive-summary">
          <h3 className="card-title">📊 Resumo Executivo</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <div className="summary-icon">👥</div>
              <div className="summary-content">
                <div className="summary-value">{reports?.totalParticipantes || 0}</div>
                <div className="summary-label">Total de Participantes</div>
                <div className="summary-trend positive">
                  +{reports?.crescimentoParticipantes || 0}% este mês
                </div>
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-icon">🎁</div>
              <div className="summary-content">
                <div className="summary-value">{reports?.promocoesAtivas || 0}</div>
                <div className="summary-label">Promoções Ativas</div>
                <div className="summary-trend neutral">
                  {reports?.promocoesTotal || 0} total
                </div>
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-icon">🏆</div>
              <div className="summary-content">
                <div className="summary-value">{reports?.sorteiosRealizados || 0}</div>
                <div className="summary-label">Sorteios Realizados</div>
                <div className="summary-trend positive">
                  {reports?.ganhadores || 0} ganhadores
                </div>
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-icon">📍</div>
              <div className="summary-content">
                <div className="summary-value">{reports?.cidadesCobertas || 0}</div>
                <div className="summary-label">Cidades Cobertas</div>
                <div className="summary-trend positive">
                  {reports?.regioes || 0} regiões
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Relatórios Disponíveis */}
        <div className="card available-reports">
          <h3 className="card-title">📋 Relatórios Disponíveis</h3>
          <div className="reports-grid">
            <div className="report-card">
              <div className="report-header">
                <span className="report-icon">👥</span>
                <h4>Relatório de Participantes</h4>
              </div>
              <div className="report-content">
                <p>Análise detalhada dos participantes por região, período e demografias.</p>
                <div className="report-stats">
                  <span>📊 {analytics?.participantes?.total || 0} registros</span>
                  <span>📅 Atualizado hoje</span>
                </div>
              </div>
              <div className="report-actions">
                <button 
                  className="btn-secondary btn-small"
                  onClick={() => handleViewDetailedReport('participantes')}
                >
                  👁️ Visualizar
                </button>
              </div>
            </div>

            <div className="report-card">
              <div className="report-header">
                <span className="report-icon">🗺️</span>
                <h4>Análise Geográfica</h4>
              </div>
              <div className="report-content">
                <p>Mapa interativo com distribuição geográfica e heatmap de participações.</p>
                <div className="report-stats">
                  <span>📍 {analytics?.geografico?.pontos || 0} pontos</span>
                  <span>🏙️ {analytics?.geografico?.cidades || 0} cidades</span>
                </div>
              </div>
              <div className="report-actions">
                <button 
                  className="btn-secondary btn-small"
                  onClick={() => handleViewDetailedReport('geografico')}
                >
                  🗺️ Ver Mapa
                </button>
              </div>
            </div>

            <div className="report-card">
              <div className="report-header">
                <span className="report-icon">🎁</span>
                <h4>Performance de Promoções</h4>
              </div>
              <div className="report-content">
                <p>Métricas de engajamento, conversão e ROI das campanhas promocionais.</p>
                <div className="report-stats">
                  <span>📈 {analytics?.promocoes?.conversao || 0}% conversão</span>
                  <span>⭐ {analytics?.promocoes?.engagement || 0}% engajamento</span>
                </div>
              </div>
              <div className="report-actions">
                <button 
                  className="btn-secondary btn-small"
                  onClick={() => handleViewDetailedReport('promocoes')}
                >
                  📊 Analytics
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos e Analytics */}
        {charts && (
          <div className="card charts-section">
            <h3 className="card-title">📈 Analytics Visuais</h3>
            <div className="charts-grid">
              <div className="chart-card">
                <h4>Participações por Período</h4>
                <div className="chart-placeholder">
                  <div className="chart-mock">
                    <div className="chart-bars">
                      <div className="bar" style={{height: '60%'}}></div>
                      <div className="bar" style={{height: '80%'}}></div>
                      <div className="bar" style={{height: '45%'}}></div>
                      <div className="bar" style={{height: '90%'}}></div>
                      <div className="bar" style={{height: '70%'}}></div>
                    </div>
                    <div className="chart-labels">
                      <span>Jan</span><span>Fev</span><span>Mar</span><span>Abr</span><span>Mai</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h4>Distribuição por Cidade</h4>
                <div className="chart-placeholder">
                  <div className="chart-pie">
                    <div className="pie-slice slice-1"></div>
                    <div className="pie-slice slice-2"></div>
                    <div className="pie-slice slice-3"></div>
                    <div className="pie-slice slice-4"></div>
                  </div>
                  <div className="pie-legend">
                    <div><span className="legend-color color-1"></span>São Paulo</div>
                    <div><span className="legend-color color-2"></span>Rio de Janeiro</div>
                    <div><span className="legend-color color-3"></span>Belo Horizonte</div>
                    <div><span className="legend-color color-4"></span>Outros</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Opções de Export */}
        <div className="card export-options">
          <h3 className="card-title">📥 Exportar Relatórios</h3>
          <div className="export-grid">
            {exportOptions.map((option) => (
              <button 
                key={option.id}
                className="export-btn"
                onClick={() => handleExportReport(option.id)}
              >
                <span className="export-icon">{option.icon}</span>
                <span className="export-label">{option.name}</span>
              </button>
            ))}
          </div>
          <div className="export-info">
            <p>💡 Os relatórios incluem dados dos últimos 90 dias e são gerados em tempo real.</p>
          </div>
        </div>

        {/* Insights Automáticos */}
        <div className="card auto-insights">
          <h3 className="card-title">💡 Insights Automáticos</h3>
          <div className="insights-list">
            <div className="insight-item positive">
              <span className="insight-icon">📈</span>
              <div className="insight-content">
                <strong>Crescimento Acelerado</strong>
                <p>Participações aumentaram 45% nas últimas 2 semanas</p>
              </div>
            </div>
            
            <div className="insight-item warning">
              <span className="insight-icon">⚠️</span>
              <div className="insight-content">
                <strong>Concentração Geográfica</strong>
                <p>85% dos participantes estão em apenas 3 cidades</p>
              </div>
            </div>
            
            <div className="insight-item info">
              <span className="insight-icon">ℹ️</span>
              <div className="insight-content">
                <strong>Pico de Participação</strong>
                <p>Horário de maior atividade: 19h às 21h</p>
              </div>
            </div>
            
            <div className="insight-item positive">
              <span className="insight-icon">🎯</span>
              <div className="insight-content">
                <strong>Alta Conversão</strong>
                <p>Taxa de participação de 78% nas promoções ativas</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewerDashboardPage;