import { fetchDashboardData } from './dashboardService';
import { getCurrentToken } from './authService';

// Mock do authService
jest.mock('./authService');
const mockGetCurrentToken = getCurrentToken;

// Mock do fetch global
global.fetch = jest.fn();

describe('DashboardService', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockGetCurrentToken.mockClear();
    console.error = jest.fn();
  });

  describe('fetchDashboardData', () => {
    test('deve buscar dados do dashboard com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const mockDashboardData = {
        totais: {
          totalPromocoes: 5,
          totalParticipantes: 150,
          promocoesAtivas: 3,
          participacoesHoje: 25
        },
        participantesPorPromocao: [
          { promocao: 'Promoção Verão', participantes: 75 },
          { promocao: 'Black Friday', participantes: 50 }
        ],
        origemCadastros: [
          { origem: 'Site', quantidade: 80 },
          { origem: 'App Mobile', quantidade: 45 }
        ],
        participantesComLocalizacao: [
          {
            id: 1,
            nome: 'João Silva',
            latitude: -23.5505,
            longitude: -46.6333
          }
        ]
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockDashboardData })
      });

      const result = await fetchDashboardData();

      expect(fetch).toHaveBeenCalledWith('/api/promocoes?action=dashboard', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });
      expect(result).toEqual({ data: mockDashboardData });
    });

    test('deve buscar dados com filtros específicos', async () => {
      const mockToken = 'valid-token';
      const filters = {
        periodo: '30d',
        promocao_id: 1
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await fetchDashboardData(filters);

      expect(fetch).toHaveBeenCalledWith('/api/promocoes?action=dashboard', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${mockToken}`,
          'Content-Type': 'application/json'
        }
      });
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(fetchDashboardData()).rejects.toThrow(
        'Token de acesso não encontrado. Faça login para continuar.'
      );
    });

    test('deve lançar erro quando token está expirado', async () => {
      const mockToken = 'expired-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(fetchDashboardData()).rejects.toThrow(
        'Token expirado. Faça login novamente.'
      );
    });

    test('deve lançar erro para outros status HTTP', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchDashboardData()).rejects.toThrow(
        'Erro na requisição: 500 Internal Server Error'
      );
    });

    test('deve lidar com erro de rede', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchDashboardData()).rejects.toThrow('Network error');
    });

    test('deve processar dados vazios corretamente', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null })
      });

      const result = await fetchDashboardData();
      expect(result).toEqual({ data: null });
    });

    test('deve construir query string corretamente com múltiplos parâmetros', async () => {
      const mockToken = 'valid-token';
      const filters = {
        periodo: '7d',
        promocao_id: 2,
        origem: 'site',
        data_inicio: '2024-01-01',
        data_fim: '2024-01-31'
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} })
      });

      await fetchDashboardData();

      expect(fetch).toHaveBeenCalledWith(
        '/api/promocoes?action=dashboard',
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
    });
  });
});