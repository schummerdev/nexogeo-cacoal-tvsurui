import { 
  realizarSorteio, 
  buscarGanhadores, 
  buscarTodosGanhadores, 
  cancelarSorteio,
  buscarParticipantesDisponiveis,
  obterEstatisticas,
  buscarPromocoesAtivas,
  atualizarStatusPromocao
} from './sorteioService';
import { getCurrentToken } from './authService';

// Mock do authService
jest.mock('./authService');
const mockGetCurrentToken = getCurrentToken;

// Mock do fetch global
global.fetch = jest.fn();

describe('SorteioService', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockGetCurrentToken.mockClear();
    console.error = jest.fn();
    console.log = jest.fn();
    console.warn = jest.fn();
  });

  describe('realizarSorteio', () => {
    test('deve realizar sorteio com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockResponse = {
        success: true,
        ganhador: {
          id: 1,
          nome: 'João Silva',
          telefone: '11999999999',
          data_sorteio: '2024-01-15T10:30:00Z'
        }
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await realizarSorteio(promocaoId);

      expect(fetch).toHaveBeenCalledWith('/api/sorteio?action=sortear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify({ promocaoId })
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(realizarSorteio(1)).rejects.toThrow(
        'Token de acesso não encontrado. Faça login para continuar.'
      );
    });

    test('deve lançar erro quando token está expirado', async () => {
      const mockToken = 'expired-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Token expired'
      });

      await expect(realizarSorteio(1)).rejects.toThrow(
        'Token expirado. Faça login novamente.'
      );
    });

    test('deve lançar erro quando não há participantes suficientes', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Não há participantes suficientes para o sorteio'
      });

      await expect(realizarSorteio(1)).rejects.toThrow(
        'Erro 400: Não há participantes suficientes para o sorteio'
      );
    });

    test('deve atualizar status da promoção para "encerrada" após sorteio bem-sucedido', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockSorteioResponse = { success: true, ganhador: { id: 1 } };
      const mockStatusResponse = { success: true, message: 'Status atualizado' };

      mockGetCurrentToken.mockReturnValue(mockToken);
      
      // Mock para o sorteio
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSorteioResponse
      });
      
      // Mock para atualização de status
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      await realizarSorteio(promocaoId);

      // Verificar se ambas as chamadas foram feitas
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Primeira chamada - sorteio
      expect(fetch).toHaveBeenNthCalledWith(1, '/api/sorteio?action=sortear', expect.any(Object));
      
      // Segunda chamada - atualizar status
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/promocoes/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify({ promocaoId: 1, status: 'encerrada' })
      });

      // Verificar log de sucesso
      expect(console.log).toHaveBeenCalledWith('✅ Status da promoção 1 atualizado para \'encerrada\' após sorteio');
    });

    test('deve continuar mesmo se falhar ao atualizar status após sorteio', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockSorteioResponse = { success: true, ganhador: { id: 1 } };

      mockGetCurrentToken.mockReturnValue(mockToken);
      
      // Mock para o sorteio (sucesso)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSorteioResponse
      });
      
      // Mock para atualização de status (falha)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error'
      });

      const result = await realizarSorteio(promocaoId);

      // O sorteio deve retornar normalmente
      expect(result).toEqual(mockSorteioResponse);
      
      // Deve ter feito tentativa de atualizar status
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Deve ter logado warning sobre falha no status
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Sorteio realizado com sucesso, mas não foi possível atualizar status da promoção:', 
        expect.any(Error)
      );
    });
  });

  describe('buscarGanhadores', () => {
    test('deve buscar ganhadores de uma promoção', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockGanhadores = [
        {
          id: 1,
          nome: 'João Silva',
          telefone: '11999999999',
          data_sorteio: '2024-01-15T10:30:00Z'
        }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ganhadores: mockGanhadores })
      });

      const result = await buscarGanhadores(promocaoId);

      expect(fetch).toHaveBeenCalledWith(`/api/sorteio?action=ganhadores&id=${promocaoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual({ ganhadores: mockGanhadores });
    });
  });

  describe('buscarTodosGanhadores', () => {
    test('deve buscar todos os ganhadores', async () => {
      const mockToken = 'mock-jwt-token';
      const mockGanhadores = [
        {
          id: 1,
          nome: 'João Silva',
          promocao: 'Promoção Verão',
          data_sorteio: '2024-01-15T10:30:00Z'
        },
        {
          id: 2,
          nome: 'Maria Santos',
          promocao: 'Black Friday',
          data_sorteio: '2024-01-20T15:00:00Z'
        }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ganhadores: mockGanhadores })
      });

      const result = await buscarTodosGanhadores();

      expect(fetch).toHaveBeenCalledWith('/api/sorteio/ganhadores', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual({ ganhadores: mockGanhadores });
    });
  });

  describe('cancelarSorteio', () => {
    test('deve cancelar sorteio de um ganhador', async () => {
      const mockToken = 'mock-jwt-token';
      const ganhadorId = 1;
      const mockResponse = {
        success: true,
        message: 'Sorteio cancelado com sucesso'
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await cancelarSorteio(ganhadorId);

      expect(fetch).toHaveBeenCalledWith(`/api/sorteio?action=ganhadores&id=${ganhadorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve atualizar status da promoção para "ativa" após cancelar sorteio', async () => {
      const mockToken = 'mock-jwt-token';
      const ganhadorId = 1;
      const promocaoId = 5;
      const mockCancelResponse = { success: true, message: 'Sorteio cancelado' };
      const mockStatusResponse = { success: true, message: 'Status atualizado' };

      mockGetCurrentToken.mockReturnValue(mockToken);
      
      // Mock para cancelar sorteio
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCancelResponse
      });
      
      // Mock para atualização de status
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatusResponse
      });

      await cancelarSorteio(ganhadorId, promocaoId);

      // Verificar se ambas as chamadas foram feitas
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Primeira chamada - cancelar sorteio
      expect(fetch).toHaveBeenNthCalledWith(1, `/api/sorteio?action=ganhadores&id=${ganhadorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      
      // Segunda chamada - atualizar status
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/promocoes/status', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify({ promocaoId: 5, status: 'ativa' })
      });

      // Verificar log de sucesso
      expect(console.log).toHaveBeenCalledWith('✅ Status da promoção 5 atualizado para \'ativa\' após cancelar sorteio');
    });

    test('deve continuar mesmo se falhar ao atualizar status após cancelar sorteio', async () => {
      const mockToken = 'mock-jwt-token';
      const ganhadorId = 1;
      const promocaoId = 5;
      const mockCancelResponse = { success: true, message: 'Sorteio cancelado' };

      mockGetCurrentToken.mockReturnValue(mockToken);
      
      // Mock para cancelar sorteio (sucesso)
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCancelResponse
      });
      
      // Mock para atualização de status (falha)
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server Error'
      });

      const result = await cancelarSorteio(ganhadorId, promocaoId);

      // O cancelamento deve retornar normalmente
      expect(result).toEqual(mockCancelResponse);
      
      // Deve ter feito tentativa de atualizar status
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Deve ter logado warning sobre falha no status
      expect(console.warn).toHaveBeenCalledWith(
        '⚠️ Sorteio cancelado com sucesso, mas não foi possível atualizar status da promoção:', 
        expect.any(Error)
      );
    });

    test('deve lançar erro ao tentar cancelar sorteio inexistente', async () => {
      const mockToken = 'valid-token';
      const ganhadorId = 999;

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Ganhador não encontrado'
      });

      await expect(cancelarSorteio(ganhadorId)).rejects.toThrow(
        'Erro 404: Ganhador não encontrado'
      );
    });
  });

  describe('buscarParticipantesDisponiveis', () => {
    test('deve buscar participantes disponíveis para sorteio', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockParticipantes = [
        {
          id: 1,
          nome: 'João Silva',
          telefone: '11999999999',
          email: 'joao@email.com'
        },
        {
          id: 2,
          nome: 'Maria Santos',
          telefone: '21888888888',
          email: 'maria@email.com'
        }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ participantes: mockParticipantes })
      });

      const result = await buscarParticipantesDisponiveis(promocaoId);

      expect(fetch).toHaveBeenCalledWith(`/api/sorteio?action=participantes&promocaoId=${promocaoId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual({ participantes: mockParticipantes });
    });
  });

  describe('obterEstatisticas', () => {
    test('deve obter estatísticas de sorteios', async () => {
      const mockToken = 'mock-jwt-token';
      const mockEstatisticas = {
        total_sorteios: 15,
        total_ganhadores: 15,
        promocoes_com_sorteio: 8,
        ultimo_sorteio: '2024-01-20T15:00:00Z'
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEstatisticas
      });

      const result = await obterEstatisticas();

      expect(fetch).toHaveBeenCalledWith('/api/sorteio?action=estatisticas', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockEstatisticas);
    });
  });

  describe('buscarPromocoesAtivas', () => {
    test('deve buscar promoções ativas', async () => {
      const mockToken = 'mock-jwt-token';
      const mockPromocoes = [
        {
          id: 1,
          titulo: 'Promoção Verão',
          participantes_count: 50,
          sorteio_realizado: false
        },
        {
          id: 2,
          titulo: 'Black Friday',
          participantes_count: 75,
          sorteio_realizado: true
        }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ promocoes: mockPromocoes })
      });

      const result = await buscarPromocoesAtivas();

      expect(fetch).toHaveBeenCalledWith('/api/promocoes?status=ativa', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual({ promocoes: mockPromocoes });
    });
  });

  describe('Casos de erro de rede', () => {
    test('deve lidar com erro de rede', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(realizarSorteio(1)).rejects.toThrow('Network error');
    });

    test('deve lançar erro genérico para status desconhecido', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      await expect(realizarSorteio(1)).rejects.toThrow(
        'Erro 500: Internal Server Error'
      );
    });
  });
});