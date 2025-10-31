import { fetchParticipantes, deleteParticipante, updateParticipante } from './participanteService';
import { getCurrentToken } from './authService';

// Mock do authService
jest.mock('./authService');
const mockGetCurrentToken = getCurrentToken;

// Mock do fetch global
global.fetch = jest.fn();

describe('ParticipanteService', () => {
  beforeEach(() => {
    // Limpar todos os mocks antes de cada teste
    fetch.mockClear();
    mockGetCurrentToken.mockClear();
    console.error = jest.fn(); // Mock console.error para testes
  });

  describe('fetchParticipantes', () => {
    test('deve buscar participantes com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const mockParticipantes = [
        { id: 1, nome: 'João Silva', telefone: '11999999999' },
        { id: 2, nome: 'Maria Santos', telefone: '11888888888' }
      ];

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockParticipantes })
      });

      const result = await fetchParticipantes();

      expect(fetch).toHaveBeenCalledWith('/api/participantes', {
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockParticipantes);
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(fetchParticipantes()).rejects.toThrow(
        'Token de acesso não encontrado. Faça login para continuar.'
      );
    });

    test('deve lançar erro quando token está expirado (401)', async () => {
      const mockToken = 'expired-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(fetchParticipantes()).rejects.toThrow(
        'Token expirado. Faça login novamente.'
      );
    });

    test('deve lançar erro genérico para outros status', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(fetchParticipantes()).rejects.toThrow(
        'Erro na requisição: 500 Internal Server Error'
      );
    });

    test('deve retornar array vazio quando data é undefined', async () => {
      const mockToken = 'valid-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      });

      const result = await fetchParticipantes();
      expect(result).toEqual([]);
    });
  });

  describe('deleteParticipante', () => {
    test('deve deletar participante com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const participanteId = 1;
      const mockResponse = { success: true, message: 'Participante excluído com sucesso' };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await deleteParticipante(participanteId);

      expect(fetch).toHaveBeenCalledWith(`/api/participantes?id=${participanteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockToken}`
        }
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(deleteParticipante(1)).rejects.toThrow(
        'Token de acesso não encontrado. Faça login para continuar.'
      );
    });

    test('deve lançar erro quando token está expirado (401)', async () => {
      const mockToken = 'expired-token';
      mockGetCurrentToken.mockReturnValue(mockToken);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401
      });

      await expect(deleteParticipante(1)).rejects.toThrow(
        'Token expirado. Faça login novamente.'
      );
    });

    test('deve extrair mensagem de erro específica do backend', async () => {
      const mockToken = 'valid-token';
      const customErrorMessage = 'Não é possível excluir participante com sorteios';
      
      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: customErrorMessage })
      });

      await expect(deleteParticipante(1)).rejects.toThrow(customErrorMessage);
    });
  });

  describe('updateParticipante', () => {
    test('deve atualizar participante com sucesso', async () => {
      const mockToken = 'mock-jwt-token';
      const participanteId = 1;
      const participanteData = {
        nome: 'João Silva Atualizado',
        telefone: '11999999999',
        email: 'joao@email.com'
      };
      const mockResponse = { success: true, data: { id: 1, ...participanteData } };

      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await updateParticipante(participanteId, participanteData);

      expect(fetch).toHaveBeenCalledWith(`/api/participantes?id=${participanteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mockToken}`
        },
        body: JSON.stringify(participanteData)
      });
      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro quando não há token', async () => {
      mockGetCurrentToken.mockReturnValue(null);

      await expect(updateParticipante(1, {})).rejects.toThrow(
        'Token de acesso não encontrado. Faça login para continuar.'
      );
    });

    test('deve lançar erro para telefone duplicado (409)', async () => {
      const mockToken = 'valid-token';
      
      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          error: 'DUPLICATE_PHONE_IN_PROMOTION',
          message: 'Este telefone já está sendo usado por outro participante nesta promoção!'
        })
      });

      await expect(updateParticipante(1, { telefone: '11999999999' })).rejects.toThrow(
        'Este número de telefone já está sendo usado por outro participante.'
      );
    });

    test('deve lançar erro genérico para telefone duplicado quando não há mensagem específica', async () => {
      const mockToken = 'valid-token';
      
      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({})
      });

      await expect(updateParticipante(1, {})).rejects.toThrow(
        'Este número de telefone já está sendo usado por outro participante.'
      );
    });

    test('deve fazer log de dados detalhados em caso de erro', async () => {
      const mockToken = 'valid-token';
      const participanteData = { nome: 'Test', telefone: '123456789' };
      
      mockGetCurrentToken.mockReturnValue(mockToken);
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          message: 'Dados inválidos',
          received_body: participanteData,
          stack: 'Error stack trace'
        })
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(updateParticipante(1, participanteData)).rejects.toThrow('Dados inválidos');
      
      expect(consoleSpy).toHaveBeenCalledWith('Detalhes do erro 400:', expect.any(Object));
      expect(consoleSpy).toHaveBeenCalledWith('Dados enviados:', participanteData);
      expect(consoleSpy).toHaveBeenCalledWith('Stack trace:', 'Error stack trace');
      
      consoleSpy.mockRestore();
    });
  });
});