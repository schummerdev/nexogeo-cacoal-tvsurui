// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import Header from '../components/DashboardLayout/Header';
import { LoadingSpinner } from '../components/LoadingComponents';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { auditHelpers } from '../services/auditService';
import './DashboardPages.css';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboardPage = () => {
  const { user, userName } = useAuth();
  const { showToast } = useToast();

  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [promocoes, setPromocoes] = useState([]);
  const [selectedPromocao, setSelectedPromocao] = useState('todas');
  const [loading, setLoading] = useState(true);

  // Detectar se está em modo janela externa para gráficos
  const urlParams = new URLSearchParams(window.location.search);
  const isExternalWindow = urlParams.get('external') === 'true';
  const chartType = urlParams.get('chart'); // 'participantes' ou 'origem'
  const chartPromocao = urlParams.get('promocao') || 'todas';

  // Definir opções dos gráficos antes dos condicionais de retorno
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 30,
        ticks: {
          stepSize: 3
        },
        grid: {
          color: '#374151'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxTicksLimit: 3,
          callback: function (value, index) {
            const label = this.getLabelForValue(value);
            return label.length > 20 ? label.substring(0, 20) + '...' : label;
          }
        }
      }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: false
      }
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Se está em modo externo, aplicar filtro inicial
    if (isExternalWindow && chartPromocao !== 'todas') {
      setSelectedPromocao(chartPromocao);
    }

    // Atualização automática a cada 5 minutos (300000ms)
    const autoRefreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh: Recarregando dados do dashboard...');
      loadDashboardData();
    }, 300000); // 5 minutos

    // Limpar interval quando componente for desmontado
    return () => {
      clearInterval(autoRefreshInterval);
    };
  }, []);

  // Recarregar gráfico quando filtro muda na janela externa
  useEffect(() => {
    if (isExternalWindow && chartType === 'origem') {
      loadOrigemData();
    }
  }, [selectedPromocao, isExternalWindow, chartType]);

  // Recarregar apenas gráfico de origem quando filtro muda
  useEffect(() => {
    if (selectedPromocao !== 'todas') {
      loadOrigemData();
    }
  }, [selectedPromocao]);

  const loadOrigemData = async () => {
    try {
      const response = await fetch(`/api/dashboard?action=origem-cadastros&promocao_id=${selectedPromocao}`, {
        credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          const colors = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
          const newOrigemData = {
            labels: data.data.map(item => item.origem),
            datasets: [{
              data: data.data.map(item => item.total),
              backgroundColor: colors.slice(0, data.data.length),
              borderWidth: 0
            }]
          };

          setChartData(prev => ({
            ...prev,
            origemCadastros: newOrigemData
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados de origem:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Carregar dados em paralelo - USAR API PRINCIPAL
      const [dashboardResponse, promocoesResponse, participantesResponse, origemResponse] = await Promise.allSettled([
        fetch('/api/?route=dashboard', {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        }),
        fetch('/api/?route=promocoes', {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        }),
        fetch('/api/?route=dashboard&action=participantes-por-promocao', {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        }),
        fetch(`/api/?route=dashboard&action=origem-cadastros&promocao_id=${selectedPromocao}`, {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        })
      ]);

      // Processar dados do dashboard
      if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.ok) {
        const data = await dashboardResponse.value.json();
        console.log('📊 Resposta dashboard completa:', data);
        console.log('🔍 Estrutura data:', JSON.stringify(data, null, 2));
        if (data.success) {
          // CORRIGIR: API retorna data.data.participantes_total, não data.data.totals.participantes
          const apiData = data.data || {};
          console.log('📋 Dados da API encontrados:', JSON.stringify(apiData, null, 2));
          setStats({
            promocoesAtivas: apiData.promocoes_ativas || 0,
            totalParticipantes: apiData.participantes_total || 0, // Unique
            totalParticipacoes: apiData.participacoes_total || 0, // Total entries
            participantes_24h: apiData.participantes_24h || 0
          });
          console.log('📈 Stats processadas (CORRIGIDO):', {
            promocoesAtivas: apiData.promocoes_ativas,
            unique: apiData.participantes_total,
            total: apiData.participacoes_total,
            participantes_24h: apiData.participantes_24h
          });
        }
      }

      // Processar promoções para dropdown
      if (promocoesResponse.status === 'fulfilled' && promocoesResponse.value.ok) {
        const promocoesData = await promocoesResponse.value.json();
        if (promocoesData.success && promocoesData.data) {
          setPromocoes(promocoesData.data);
        }
      }

      // Processar dados reais do gráfico participantes por promoção
      let participantesPorPromocao = {
        labels: ['Nenhuma promoção encontrada'],
        datasets: [{
          data: [0],
          backgroundColor: ['#EF4444'],
          borderWidth: 0
        }]
      };

      if (participantesResponse.status === 'fulfilled' && participantesResponse.value.ok) {
        const participantesData = await participantesResponse.value.json();
        console.log('📊 Dados participantes por promoção:', participantesData);
        if (participantesData.success && participantesData.data && participantesData.data.length > 0) {
          participantesPorPromocao = {
            labels: participantesData.data.map(item =>
              item.promocao.length > 30 ? item.promocao.substring(0, 30) + '...' : item.promocao
            ),
            datasets: [{
              data: participantesData.data.map(item => item.participantes),
              backgroundColor: ['#4F46E5', '#EF4444', '#10B981', '#F59E0B'],
              borderWidth: 0
            }]
          };
        } else {
          console.log('⚠️ Sem dados de participantes por promoção');
        }
      }

      // Processar dados reais do gráfico origem dos cadastros
      let origemCadastros = {
        labels: ['Sem dados'],
        datasets: [{
          data: [1],
          backgroundColor: ['#9CA3AF'],
          borderWidth: 0
        }]
      };

      if (origemResponse.status === 'fulfilled' && origemResponse.value.ok) {
        const origemData = await origemResponse.value.json();
        console.log('🍰 Dados origem dos cadastros:', origemData);
        if (origemData.success && origemData.data && origemData.data.length > 0) {
          const colors = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
          origemCadastros = {
            labels: origemData.data.map(item => item.origem),
            datasets: [{
              data: origemData.data.map(item => item.total),
              backgroundColor: colors.slice(0, origemData.data.length),
              borderWidth: 0
            }]
          };
        } else {
          console.log('⚠️ Sem dados de origem dos cadastros');
        }
      }

      // --- NOVOS GRÁFICOS CAIXA MISTERIOSA ---

      // Buscar dados de participação da Caixa Misteriosa
      let caixaMisteriosaParticipation = {
        labels: ['Sem dados'],
        datasets: [{
          data: [0],
          backgroundColor: ['#9CA3AF'],
          borderWidth: 0
        }]
      };

      try {
        const cmPartResponse = await fetch('/api/caixa-misteriosa/stats/participation', {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        });

        if (cmPartResponse.ok) {
          const cmPartData = await cmPartResponse.json();
          console.log('🎲 Dados participação Caixa Misteriosa (últimos 5 jogos):', cmPartData);
          if (cmPartData.success && cmPartData.data && cmPartData.data.length > 0) {
            caixaMisteriosaParticipation = {
              labels: cmPartData.data.map(item =>
                `Jogo ${item.game_id} - ${item.product_name.length > 20 ? item.product_name.substring(0, 20) + '...' : item.product_name}`
              ),
              datasets: [{
                data: cmPartData.data.map(item => item.total_submissions),
                backgroundColor: ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'],
                borderWidth: 0
              }]
            };
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados de participação da Caixa Misteriosa:', error);
      }

      // Buscar dados de novos cadastros por dia (Caixa Misteriosa)
      let caixaMisteriosaNewRegistrations = {
        labels: ['Sem dados'],
        datasets: [{
          data: [0],
          backgroundColor: ['#9CA3AF'],
          borderWidth: 0
        }]
      };

      try {
        const cmNewRegResponse = await fetch('/api/caixa-misteriosa/stats/new-registrations', {
          credentials: 'include' // SEGURANÇA: Enviar cookies HttpOnly
        });

        if (cmNewRegResponse.ok) {
          const cmNewRegData = await cmNewRegResponse.json();
          console.log('📈 Dados novos cadastros por dia:', cmNewRegData);
          if (cmNewRegData.success && cmNewRegData.data && cmNewRegData.data.length > 0) {
            caixaMisteriosaNewRegistrations = {
              labels: cmNewRegData.data.map(item => {
                const date = new Date(item.date);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }).reverse(), // Inverter para mostrar do mais antigo para o mais recente
              datasets: [{
                data: cmNewRegData.data.map(item => item.new_registrations).reverse(),
                backgroundColor: ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'],
                borderWidth: 0
              }]
            };
          }
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados de novos cadastros:', error);
      }

      setChartData({
        participantesPorPromocao,
        origemCadastros,
        caixaMisteriosaParticipation,
        caixaMisteriosaNewRegistrations
      });

      // Log de auditoria para visualização do dashboard
      try {
        auditHelpers.viewDashboard();
        console.log('🔐 Visualização do dashboard auditada');
      } catch (auditError) {
        console.warn('⚠️ Erro no log de auditoria (visualização dashboard):', auditError);
      }

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      showToast('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <>
        {!isExternalWindow && (
          <Header
            title="Visão geral do sistema de promoções"
            subtitle="Painel Administrativo"
          />
        )}
        <div className={isExternalWindow ? "external-window-content" : "dashboard-content"}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

  // Layout simplificado para janela externa de gráficos
  if (isExternalWindow && chartType) {
    const chartTitle = chartType === 'participantes' ? '📊 Participações por Promoção' : '🍰 Origem dos Cadastros';
    const currentChart = chartType === 'participantes' ? chartData?.participantesPorPromocao : chartData?.origemCadastros;

    return (
      <div style={{
        padding: '20px',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background)',
        color: 'var(--color-text)'
      }}>
        {/* Header Compacto */}
        <div style={{
          marginBottom: '20px',
          padding: '16px 20px',
          background: 'var(--color-card)',
          borderRadius: '8px',
          border: '1px solid var(--color-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
              {chartTitle}
            </h2>
            {chartType === 'origem' && promocoes.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  Promoção:
                </label>
                <select
                  value={selectedPromocao}
                  onChange={(e) => setSelectedPromocao(e.target.value)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-background)',
                    color: 'var(--color-text)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="todas">Todas as Promoções</option>
                  {promocoes.map((promocao) => (
                    <option key={promocao.id} value={promocao.id}>
                      {promocao.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {chartType === 'origem' && (
            <p style={{ margin: '8px 0 0 0', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              Filtro: {chartPromocao === 'todas' ? 'Todas as Promoções' : `Promoção ID: ${chartPromocao}`}
            </p>
          )}
        </div>

        {/* Gráfico em Tela Cheia */}
        <div style={{ flex: 1, padding: '20px', background: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
          {currentChart ? (
            chartType === 'participantes' ? (
              <Bar data={currentChart} options={{
                ...barOptions,
                maintainAspectRatio: false,
                responsive: true
              }} />
            ) : (
              <Pie data={currentChart} options={{
                ...pieOptions,
                maintainAspectRatio: false,
                responsive: true
              }} />
            )
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <LoadingSpinner />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        title="Visão geral do sistema de promoções"
        subtitle="Painel Administrativo"
      />

      <div className="dashboard-content classic-dashboard">
        {/* Cards de Estatísticas - Reorganizados */}
        <div className="stats-grid three-cards">
          <div
            className="stat-card red clickable"
            onClick={() => window.open('/promocoes-ativas', '_blank')}
          >
            <div className="stat-icon">🎯</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.promocoesAtivas || 0}</div>
              <div className="stat-label">Promoções Ativas</div>
              <div className="stat-action">👆 Ver página pública</div>
            </div>
          </div>

          <div
            className="stat-card teal clickable"
            onClick={() => window.location.href = '/dashboard/participantes'}
          >
            <div className="stat-icon">📱</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalParticipantes || 0}</div>
              <div className="stat-label">Participantes Únicos (Celular)</div>
              <div className="stat-action">👆 Ver lista de únicos</div>
            </div>
          </div>

          <div
            className="stat-card blue clickable"
            onClick={() => window.location.href = '/dashboard/participantes'}
          >
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.totalParticipacoes || 0}</div>
              <div className="stat-label">Total de Participações</div>
              <div className="stat-action">👆 Ver todas as entradas</div>
            </div>
          </div>

          <div
            className="stat-card purple clickable"
            onClick={() => window.location.href = '/dashboard/sorteio'}
          >
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-number">{stats?.participantes_24h || 0}</div>
              <div className="stat-label">Participações 24h</div>
              <div className="stat-action">🔵 Fazer Sorteio</div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="charts-container">
          {/* Gráfico de Barras - Participantes por Promoção */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="chart-title">📊 Participações por Promoção</h3>
            </div>
            <div className="chart-wrapper" style={{ position: 'relative' }}>
              {chartData?.participantesPorPromocao && (
                <Bar
                  data={chartData.participantesPorPromocao}
                  options={barOptions}
                />
              )}
              {/* Ícone de lupa para expansão */}
              <button
                onClick={() => {
                  const url = `/external/chart?chart=participantes&external=true`;
                  window.open(url, 'GraficoParticipantes', 'width=900,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  opacity: '0.8',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '1';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '0.8';
                  e.target.style.transform = 'scale(1)';
                }}
                title="🔍 Expandir gráfico em janela separada"
              >
                🔍
              </button>
            </div>
          </div>

          {/* Gráfico de Pizza - Origem dos Cadastros */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="chart-title">👋 Origem dos Cadastros</h3>
            </div>
            <div className="chart-subtitle">Filtrar por Promoção:</div>
            <select
              className="chart-filter"
              value={selectedPromocao}
              onChange={(e) => setSelectedPromocao(e.target.value)}
            >
              <option value="todas">Todas as Promoções</option>
              {promocoes.map((promocao) => (
                <option key={promocao.id} value={promocao.id}>
                  {promocao.nome}
                </option>
              ))}
            </select>
            <div className="chart-wrapper" style={{ position: 'relative' }}>
              {chartData?.origemCadastros && (
                <Pie
                  data={chartData.origemCadastros}
                  options={pieOptions}
                />
              )}
              {/* Ícone de lupa para expansão */}
              <button
                onClick={() => {
                  const url = `/external/chart?chart=origem&promocao=${selectedPromocao}&external=true`;
                  window.open(url, 'GraficoOrigem', 'width=900,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=yes,resizable=yes');
                }}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'rgba(16, 185, 129, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  opacity: '0.8',
                  transition: 'all 0.2s ease',
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.opacity = '1';
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.opacity = '0.8';
                  e.target.style.transform = 'scale(1)';
                }}
                title="🔍 Expandir gráfico em janela separada"
              >
                🔍
              </button>
            </div>
          </div>
        </div>

        {/* Gráficos Caixa Misteriosa */}
        <div className="charts-container">
          {/* Gráfico de Barras - Participação Caixa Misteriosa (por Jogo) */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="chart-title">🎲 Caixa Misteriosa - Participação por Jogo</h3>
            </div>
            <div className="chart-subtitle">Últimos 5 jogos - Total de palpites</div>
            <div className="chart-wrapper">
              {chartData?.caixaMisteriosaParticipation && (
                <Bar
                  data={chartData.caixaMisteriosaParticipation}
                  options={barOptions}
                />
              )}
            </div>
          </div>

          {/* Gráfico de Barras - Novos Cadastros por Dia */}
          <div className="chart-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="chart-title">📈 Caixa Misteriosa - Novos Cadastros por Dia</h3>
            </div>
            <div className="chart-subtitle">Últimos 7 dias - Total de novos participantes</div>
            <div className="chart-wrapper">
              {chartData?.caixaMisteriosaNewRegistrations && (
                <Bar
                  data={chartData.caixaMisteriosaNewRegistrations}
                  options={barOptions}
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default AdminDashboardPage;