// src/services/authService.js

// URL da API - usar proxy em desenvolvimento, caminho absoluto em produção
const API_BASE_URL = '/api';

// Função para fazer login
export const login = async (usuario, senha) => {
  try {
    const response = await fetch(`${API_BASE_URL}/?route=auth&endpoint=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ usuario, senha })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Falha no login.');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};

// Função para verificar se o token está expirado
export const isTokenExpired = (token) => {
  if (!token) return true;

  // 🔐 SEGURANÇA: Bloquear tokens mock em produção
  if (token.startsWith('mock-jwt-token-') || token.startsWith('jwt-token-')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 SEGURANÇA: Token mock detectado em produção! Acesso negado.');
      return true; // Rejeitar sempre em produção
    }

    // Em desenvolvimento, permitir tokens mock
    if (token.startsWith('mock-jwt-token-')) {
      const timestamp = parseInt(token.replace('mock-jwt-token-', ''));
      const oneDayInMs = 24 * 60 * 60 * 1000;
      return (Date.now() - timestamp) > oneDayInMs;
    }

    // Token mock genérico
    const parts = token.split('-');
    if (parts.length >= 3) {
      const timestamp = parseInt(parts[2]) || Date.now();
      const oneDayInMs = 24 * 60 * 60 * 1000;
      return (Date.now() - timestamp) > oneDayInMs;
    }
    return false; // Token mock válido (apenas em dev)
  }

  // Para tokens JWT reais
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    // 🔐 SEGURANÇA: Não expor erro no console em produção
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao verificar token:', error);
    }
    return true;
  }
};

// Função para fazer logout
export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userData');
  window.location.href = '/login';
};

// Função para obter o token atual
export const getCurrentToken = () => {
  return localStorage.getItem('authToken');
};