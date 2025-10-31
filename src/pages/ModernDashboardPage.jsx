// ModernDashboardPage.jsx - Exemplo de uso de todas as melhorias
import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { 
  LoadingSpinner, 
  SkeletonDashboard, 
  useLoading 
} from '../components/LoadingComponents';
import {
  ModernLineChart,
  ModernPieChart,
  ModernBarChart,
  AnimatedKPICard,
  DashboardStats
} from '../components/Dashboard/ModernChart';

const ModernDashboardPage = () => {
  const { showToast } = useToast();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [dashboardData, setDashboardData] = useState(null);

  // Dados de exemplo
  const lineChartData = [
    { name: 'Jan', value: 400 },
    { name: 'Fev', value: 300 },
    { name: 'Mar', value: 500 },
    { name: 'Abr', value: 280 },
    { name: 'Mai', value: 590 },
    { name: 'Jun', value: 320 },
    { name: 'Jul', value: 700 }
  ];

  const pieChartData = [
    { name: 'Desktop', value: 60 },
    { name: 'Mobile', value: 35 },
    { name: 'Tablet', value: 5 }
  ];

  const barChartData = [
    { name: '0-6h', value: 20 },
    { name: '6-12h', value: 45 },
    { name: '12-18h', value: 80 },
    { name: '18-24h', value: 60 }
  ];

  const kpiStats = [
    {
      icon: '👥',
      value: 1234,
      label: 'Total Participantes',
      trend: 12,
      color: 'primary'
    },
    {
      icon: '🎯',
      value: 89,
      label: 'Conversão (%)',
      trend: 5,
      color: 'success'
    },
    {
      icon: '📊',
      value: 567,
      label: 'Promoções Ativas',
      trend: -2,
      color: 'warning'
    },
    {
      icon: '💰',
      value: 45678,
      label: 'Receita (R$)',
      trend: 18,
      color: 'info'
    }
  ];

  // Simular carregamento de dados
  useEffect(() => {
    startLoading();
    
    const loadData = async () => {
      // Simular API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setDashboardData({
        stats: kpiStats,
        charts: {
          line: lineChartData,
          pie: pieChartData,
          bar: barChartData
        }
      });
      
      stopLoading();
    };

    loadData();
  }, [startLoading, stopLoading]);

  // Demonstrar diferentes tipos de toast
  const showSuccessToast = () => {
    showToast('Dados atualizados com sucesso!', 'success');
  };

  const showErrorToast = () => {
    showToast('Erro ao carregar dados do servidor', 'error');
  };

  const showWarningToast = () => {
    showToast('Alguns dados podem estar desatualizados', 'warning');
  };

  const showInfoToast = () => {
    showToast('Nova funcionalidade disponível!', 'info');
  };

  if (isLoading) {
    return <SkeletonDashboard />;
  }

  return (
    <div style={{ 
      padding: '24px',
      background: 'var(--color-background)',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--color-text)',
          marginBottom: '8px'
        }}>
          Dashboard Moderno 🚀
        </h1>
        <p style={{ 
          color: 'var(--color-text-secondary)',
          fontSize: '1.1rem'
        }}>
          Demonstração das melhorias implementadas
        </p>
      </div>

      {/* Botões para testar toasts */}
      <div className="card-modern" style={{ 
        padding: '24px', 
        marginBottom: '32px'
      }}>
        <h3 style={{ 
          marginBottom: '16px',
          color: 'var(--color-text)',
          fontSize: '1.125rem'
        }}>
          Testar Notificações (Toast Modernizado)
        </h3>
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          flexWrap: 'wrap'
        }}>
          <button 
            className="btn btn-primary hover-lift transition-normal"
            onClick={showSuccessToast}
          >
            ✅ Sucesso
          </button>
          <button 
            className="btn hover-lift transition-normal"
            style={{ 
              background: 'var(--color-danger)', 
              color: 'white',
              border: 'none'
            }}
            onClick={showErrorToast}
          >
            ❌ Erro
          </button>
          <button 
            className="btn hover-lift transition-normal"
            style={{ 
              background: 'var(--color-warning)', 
              color: 'white',
              border: 'none'
            }}
            onClick={showWarningToast}
          >
            ⚠️ Aviso
          </button>
          <button 
            className="btn hover-lift transition-normal"
            style={{ 
              background: 'var(--color-primary)', 
              color: 'white',
              border: 'none'
            }}
            onClick={showInfoToast}
          >
            ℹ️ Info
          </button>
        </div>
      </div>

      {/* KPIs Animados */}
      <DashboardStats stats={dashboardData.stats} />

      {/* Gráficos Modernos */}
      <div className="grid grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        <ModernLineChart 
          data={dashboardData.charts.line}
          title="📈 Crescimento Mensal"
          height={300}
        />
        <ModernPieChart 
          data={dashboardData.charts.pie}
          title="📱 Dispositivos"
          height={300}
        />
      </div>

      <div className="grid grid-2" style={{ gap: '24px', marginBottom: '32px' }}>
        <ModernBarChart 
          data={dashboardData.charts.bar}
          title="⏰ Participações por Horário"
          height={300}
        />
        
        {/* Card com efeitos modernos */}
        <div className="card-glass hover-lift transition-normal" style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
            ✨
          </div>
          <h3 style={{ 
            color: 'var(--color-text)',
            marginBottom: '8px',
            fontSize: '1.25rem'
          }}>
            Glassmorphism
          </h3>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            fontSize: '0.875rem',
            lineHeight: '1.5'
          }}>
            Este card utiliza efeito de vidro com blur e transparência
          </p>
        </div>
      </div>

      {/* Seção de demonstração de classes utilitárias */}
      <div className="grid grid-3" style={{ gap: '24px' }}>
        <div className="card-modern bg-gradient-primary hover-scale transition-normal" style={{
          padding: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h4 style={{ marginBottom: '8px' }}>Gradiente Primary</h4>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Com hover-scale effect
          </p>
        </div>

        <div className="card-modern bg-gradient-forest hover-glow transition-normal" style={{
          padding: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h4 style={{ marginBottom: '8px' }}>Gradiente Forest</h4>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Com hover-glow effect
          </p>
        </div>

        <div className="card-modern bg-gradient-sunset hover-lift transition-slow" style={{
          padding: '24px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h4 style={{ marginBottom: '8px' }}>Gradiente Sunset</h4>
          <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>
            Com hover-lift effect
          </p>
        </div>
      </div>

      {/* Loading spinner demonstrativo */}
      <div className="card-modern" style={{ 
        padding: '24px', 
        marginTop: '32px',
        textAlign: 'center'
      }}>
        <h3 style={{ 
          marginBottom: '24px',
          color: 'var(--color-text)'
        }}>
          Loading Spinners
        </h3>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div>
            <LoadingSpinner size="sm" color="primary" />
            <p style={{ 
              marginTop: '8px', 
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)'
            }}>
              Small
            </p>
          </div>
          <div>
            <LoadingSpinner size="md" color="success" />
            <p style={{ 
              marginTop: '8px', 
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)'
            }}>
              Medium
            </p>
          </div>
          <div>
            <LoadingSpinner size="lg" color="warning" />
            <p style={{ 
              marginTop: '8px', 
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)'
            }}>
              Large
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboardPage;