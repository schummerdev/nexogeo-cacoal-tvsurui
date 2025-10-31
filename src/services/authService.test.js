import { login, logout, getCurrentToken, isTokenExpired } from './authService';

// Mock do fetch para testes
global.fetch = jest.fn();

// Mock do window.location
delete window.location;
window.location = { href: '' };

describe('AuthService', () => {
  beforeEach(() => {
    // Limpar localStorage e mocks antes de cada teste
    localStorage.clear();
    fetch.mockClear();
    window.location.href = '';
  });

  describe('login', () => {
    test('deve fazer login com credenciais válidas', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            email: 'test@nexogeo.com',
            nome: 'Usuário Teste'
          }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await login('test@nexogeo.com', 'senha123');
      
      expect(fetch).toHaveBeenCalledWith('/api/?route=auth&endpoint=login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@nexogeo.com',
          senha: 'senha123'
        })
      });

      expect(result).toEqual(mockResponse);
    });

    test('deve lançar erro para credenciais inválidas', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Credenciais inválidas' })
      });

      await expect(login('wrong@email.com', 'wrongsenha')).rejects.toThrow('Credenciais inválidas');
    });

    test('deve lançar erro genérico quando não consegue ler resposta', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Parse error'); }
      });

      await expect(login('test@email.com', 'senha')).rejects.toThrow('Parse error');
    });
  });

  describe('logout', () => {
    test('deve limpar dados de autenticação e redirecionar', () => {
      // Simular usuário logado
      localStorage.setItem('authToken', 'test-token');
      localStorage.setItem('userData', JSON.stringify({ id: 1, nome: 'Test' }));

      logout();

      expect(localStorage.getItem('authToken')).toBeNull();
      expect(localStorage.getItem('userData')).toBeNull();
      expect(window.location.href).toBe('/login');
    });
  });

  describe('getCurrentToken', () => {
    test('deve retornar token quando existe', () => {
      localStorage.setItem('authToken', 'valid-token');
      expect(getCurrentToken()).toBe('valid-token');
    });

    test('deve retornar null quando token não existe', () => {
      expect(getCurrentToken()).toBeNull();
    });
  });

  describe('isTokenExpired', () => {
    test('deve retornar true quando token é null', () => {
      expect(isTokenExpired(null)).toBe(true);
    });

    test('deve retornar true quando token é undefined', () => {
      expect(isTokenExpired(undefined)).toBe(true);
    });

    test('deve retornar true quando token tem formato inválido', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
    });

    test('deve verificar expiração do token válido', () => {
      // Mock de um token JWT válido com exp no futuro
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // +1 hora
      const payload = btoa(JSON.stringify({ exp: futureTime }));
      const token = `header.${payload}.signature`;
      
      expect(isTokenExpired(token)).toBe(false);
    });

    test('deve retornar true para token expirado', () => {
      // Mock de um token JWT expirado
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // -1 hora
      const payload = btoa(JSON.stringify({ exp: pastTime }));
      const token = `header.${payload}.signature`;
      
      expect(isTokenExpired(token)).toBe(true);
    });

    test('deve retornar true quando payload não pode ser parseado', () => {
      const token = 'header.invalid-base64.signature';
      expect(isTokenExpired(token)).toBe(true);
    });
  });
});