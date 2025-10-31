import { 
  fetchPromocoes, 
  createPromocao, 
  updatePromocao, 
  deletePromocao, 
  getPromocaoById 
} from './promocaoService';
import { getCurrentToken } from './authService';

// Mock do authService
jest.mock('./authService');
const mockGetCurrentToken = getCurrentToken;

// Mock do fetch global
global.fetch = jest.fn();

describe('PromocaoService', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockGetCurrentToken.mockClear();
    console.error = jest.fn();
  });

  describe('fetchPromocoes', () => {
    test('deve buscar promoções com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const mockPromocoes = [
        { 
          id: 1, 
          titulo: 'Promoção Verão', 
          descricao: 'Ganhe prêmios incríveis',
          ativo: true,
          data_inicio: '2024-01-01',
          data_fim: '2024-12-31'
        },
        { 
          id: 2, 
          titulo: 'Black Friday', 
          descricao: 'Ofertas imperdíveis',
          ativo: true,
          data_inicio: '2024-11-01',
          data_fim: '2024-11-30'
        }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPromocoes })
      });

      const result = await fetchPromocoes();

      expect(fetch).toHaveBeenCalledWith('/api/promocoes', {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockPromocoes);
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(fetchPromocoes()).rejects.toThrow(
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

      await expect(fetchPromocoes()).rejects.toThrow(
        'Token expirado. Faça login novamente.'
      );
    });
  });

  describe('createPromocao', () => {
    test('deve criar promoção com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoData = {
        titulo: 'Nova Promoção',
        descricao: 'Descrição da promoção',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        ativo: true
      };
      const mockResponse = { 
        success: true, 
        data: { id: 3, ...promocaoData } 
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createPromocao(promocaoData);

      expect(fetch).toHaveBeenCalledWith('/api/promocoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify(promocaoData)
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve validar dados obrigatórios', async () => {
      const mockToken = 'valid-token';
      const promocaoIncompleta = {
        titulo: 'Título apenas'
        // Faltando outros campos obrigatórios
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Campos obrigatórios não preenchidos'
        })
      });

      await expect(createPromocao(promocaoIncompleta)).rejects.toThrow(
        'Campos obrigatórios não preenchidos'
      );
    });
  });

  describe('updatePromocao', () => {
    test('deve atualizar promoção com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const updateData = {
        titulo: 'Promoção Atualizada',
        descricao: 'Nova descrição'
      };
      const mockResponse = { 
        success: true, 
        data: { id: promocaoId, ...updateData } 
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await updatePromocao(promocaoId, updateData);

      expect(fetch).toHaveBeenCalledWith(`/api/promocoes?id=${promocaoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify(updateData)
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro para promoção não encontrada', async () => {
      const mockToken = 'valid-token';
      const promocaoId = 999;

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          message: 'Promoção não encontrada'
        })
      });

      await expect(updatePromocao(promocaoId, {})).rejects.toThrow(
        'Promoção não encontrada'
      );
    });
  });

  describe('deletePromocao', () => {
    test('deve deletar promoção com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockResponse = { 
        success: true, 
        message: 'Promoção excluída com sucesso' 
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await deletePromocao(promocaoId);

      expect(fetch).toHaveBeenCalledWith(`/api/promocoes?id=${promocaoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro ao tentar deletar promoção com participantes', async () => {
      const mockToken = 'valid-token';
      const promocaoId = 1;

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          message: 'Não é possível excluir promoção com participantes ativos'
        })
      });

      await expect(deletePromocao(promocaoId)).rejects.toThrow(
        'Não é possível excluir promoção com participantes ativos'
      );
    });
  });

  describe('getPromocaoById', () => {
    test('deve buscar promoção por ID com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const promocaoId = 1;
      const mockPromocao = {
        id: promocaoId,
        titulo: 'Promoção Específica',
        descricao: 'Descrição detalhada',
        ativo: true,
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31'
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPromocao })
      });

      const result = await getPromocaoById(promocaoId);

      expect(fetch).toHaveBeenCalledWith(`/api/promocoes/${promocaoId}`, {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockPromocao);
    });

    test('deve lançar erro para promoção não encontrada', async () => {
      const mockToken = 'valid-token';
      const promocaoId = 999;

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(getPromocaoById(promocaoId)).rejects.toThrow(
        'Erro na requisição: 404'
      );
    });

    test('deve tratar erro de rede', async () => {
      const mockToken = 'valid-token';
      const promocaoId = 1;

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(getPromocaoById(promocaoId)).rejects.toThrow('Network error');
    });
  });

  describe('Testes de integração', () => {
    test('deve manter consistência entre create e fetch', async () => {
      const mockToken = 'mock-jwt-token';
      const novaPromocao = {
        titulo: 'Promoção Teste',
        descricao: 'Teste de integração',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        ativo: true
      };

      mockGetCurrentToken.mockReturnValue(mockToken);
      
      // Mock para criação
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 1, ...novaPromocao } })
      });

      // Mock para busca
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 1, ...novaPromocao }] })
      });

      await createPromocao(novaPromocao);
      const promocoes = await fetchPromocoes();

      expect(promocoes).toHaveLength(1);
      expect(promocoes[0]).toMatchObject(novaPromocao);
    });
  });
});