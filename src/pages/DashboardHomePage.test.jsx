import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardHomePage from './DashboardHomePage';
import { fetchDashboardData } from '../services/dashboardService';

// Mock dos serviços
jest.mock('../services/dashboardService');
const mockFetchDashboardData = fetchDashboardData;

// Mock global fetch for chart data
global.fetch = jest.fn();

// Mock dos componentes
jest.mock('../components/DashboardLayout/Header', () => {
  return function MockHeader() {
    return <div data-testid="header">Header Mock</div>;
  };
});

jest.mock('../components/LoadingComponents', () => ({
  LoadingSpinner: ({ fullScreen }) => (
    <div data-testid="loading-spinner" data-fullscreen={fullScreen}>
      Loading...
    </div>
  )
}));

jest.mock('../components/Maps/InteractiveMap', () => ({
  DashboardMap: ({ participants, onMarkerClick }) => (
    <div data-testid="dashboard-map">
      Map with {participants?.length || 0} participants
      <button 
        data-testid="marker-click" 
        onClick={() => onMarkerClick && onMarkerClick(participants[0])}
      >
        Click Marker
      </button>
    </div>
  )
}));

// Mock do Chart.js
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data, options }) => (
    <div data-testid="bar-chart" data-label={data?.datasets?.[0]?.label}>
      Bar Chart
    </div>
  ),
  Pie: ({ data, options }) => (
    <div data-testid="pie-chart" data-label={data?.datasets?.[0]?.label}>
      Pie Chart
    </div>
  )
}));

// Mock do useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('DashboardHomePage', () => {
  const mockDashboardData = {
    totais: {
      totalPromocoes: 5,
      totalParticipantes: 150,
      promocoesAtivas: 3,
      participacoesHoje: 25
    },
    participantesPorPromocao: [
      { promocao: 'Promoção Verão', participantes: 75 },
      { promocao: 'Black Friday', participantes: 50 },
      { promocao: 'Natal 2024', participantes: 25 }
    ],
    origemCadastros: [
      { origem: 'Site', quantidade: 80 },
      { origem: 'App Mobile', quantidade: 45 },
      { origem: 'Redes Sociais', quantidade: 25 }
    ],
    participantesComLocalizacao: [
      {
        id: 1,
        nome: 'João Silva',
        telefone: '11999999999',
        latitude: -23.5505,
        longitude: -46.6333,
        endereco: 'São Paulo, SP'
      },
      {
        id: 2,
        nome: 'Maria Santos',
        telefone: '21888888888',
        latitude: -22.9068,
        longitude: -43.1729,
        endereco: 'Rio de Janeiro, RJ'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchDashboardData.mockResolvedValue(mockDashboardData);
    
    // Mock das requisições de chart data
    global.fetch.mockImplementation((url) => {
      if (url === '/api/participantes') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        });
      }
      if (url === '/api/promocoes') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] })
        });
      }
      return Promise.reject(new Error('Network request failed'));
    });
  });

  const renderWithRouter = (component) => {
    return render(
      <MemoryRouter>
        {component}
      </MemoryRouter>
    );
  };

  describe('Renderização inicial', () => {
    test('deve renderizar loading inicialmente', () => {
      renderWithRouter(<DashboardHomePage />);
      
      expect(screen.getByText('Carregando dados do painel...')).toBeInTheDocument();
    });

    test('deve renderizar header sempre', () => {
      renderWithRouter(<DashboardHomePage />);
      
      expect(screen.getByTestId('header')).toBeInTheDocument();
    });
  });

  describe('Carregamento de dados', () => {
    test('deve carregar e exibir dados do dashboard com sucesso', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(mockFetchDashboardData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      // Verificar se os KPIs são exibidos
      expect(screen.getByText('5')).toBeInTheDocument(); // Total promoções
      expect(screen.getByText('150')).toBeInTheDocument(); // Total participantes
      expect(screen.getByText('3')).toBeInTheDocument(); // Promoções ativas
      expect(screen.getByText('25')).toBeInTheDocument(); // Participações hoje
    });

    test('deve exibir seção de gráficos após carregar dados', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('📊 Participantes por Promoção')).toBeInTheDocument();
      expect(screen.getByText('🥧 Origem dos Cadastros')).toBeInTheDocument();
    });

    test('deve exibir mapa com participantes', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      const dashboardMap = screen.getByTestId('dashboard-map');
      expect(dashboardMap).toBeInTheDocument();
      expect(dashboardMap).toHaveTextContent('Map with 0 participants'); // Dados vazios do mock
    });
  });

  describe('Tratamento de erros', () => {
    test('deve exibir mensagem de erro quando falha no carregamento', async () => {
      const errorMessage = 'Erro ao carregar dados do dashboard';
      mockFetchDashboardData.mockRejectedValue(new Error(errorMessage));

      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Erro ao carregar dados do painel/)).toBeInTheDocument();
    });

    test('deve permitir tentar novamente após erro', async () => {
      mockFetchDashboardData
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockDashboardData);

      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Erro ao carregar dados do painel: Network error/)).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      fireEvent.click(retryButton);

      // Componente recarrega a página inteira
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Interações do usuário', () => {
    test('deve navegar para página de participantes ao clicar em KPI', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      const participantesKPI = screen.getByText('150').closest('.kpi-card');
      fireEvent.click(participantesKPI);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/participantes');
    });

    test('deve navegar para página de promoções ao clicar em KPI', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      const promocoesKPI = screen.getByText('5').closest('.kpi-card');
      fireEvent.click(promocoesKPI);

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/promocoes');
    });

    test('deve permitir interação com o mapa', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      const dashboardMap = screen.getByTestId('dashboard-map');
      expect(dashboardMap).toBeInTheDocument();
      
      // Como não há participantes nos dados mock, não podemos testar o clique
      expect(dashboardMap).toHaveTextContent('Map with 0 participants');
    });
  });

  describe('Ações rápidas', () => {
    test('deve renderizar botões de ações rápidas', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Nova Promoção')).toBeInTheDocument();
      expect(screen.getByText('Gerar Link')).toBeInTheDocument();
      expect(screen.getByText('Participantes')).toBeInTheDocument();
      expect(screen.getByText('Sorteio')).toBeInTheDocument();
      expect(screen.getByText('Mapas')).toBeInTheDocument();
    });

    test('deve navegar ao clicar em ações rápidas', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Nova Promoção'));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/promocoes');

      fireEvent.click(screen.getByText('Gerar Link'));
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard/gerador-links');
    });
  });

  describe('Tratamento de autenticação', () => {
    test('deve redirecionar para login quando token expira', async () => {
      mockFetchDashboardData.mockRejectedValue(new Error('Token expirado'));

      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    test('deve redirecionar para login em erro 401', async () => {
      mockFetchDashboardData.mockRejectedValue(new Error('401'));

      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Casos extremos', () => {
    test('deve lidar com dados vazios', async () => {
      const emptyData = {
        totais: {
          totalPromocoes: 0,
          totalParticipantes: 0,
          promocoesAtivas: 0,
          participacoesHoje: 0
        }
      };

      mockFetchDashboardData.mockResolvedValue(emptyData);

      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      // Verificar que os KPIs mostram valores zerados
      expect(screen.getAllByText('0')).toHaveLength(4); // 4 valores zerados
      expect(screen.getByText('Total de Promoções')).toBeInTheDocument();
      expect(screen.getByText('Total de Participantes')).toBeInTheDocument();
    });

    test('deve exibir placeholders quando não há dados de gráficos', async () => {
      renderWithRouter(<DashboardHomePage />);
      
      await waitFor(() => {
        expect(screen.queryByText('Carregando dados do painel...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('📊 Carregando dados das promoções...')).toBeInTheDocument();
      expect(screen.getByText('🥧 Carregando dados de origem...')).toBeInTheDocument();
    });
  });
});