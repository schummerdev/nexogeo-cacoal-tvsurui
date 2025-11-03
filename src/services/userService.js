// src/services/userService.js

// Função para obter dados do usuário logado
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('userData');

    // ✅ SEGURANÇA: Token agora é HttpOnly cookie, usar apenas userData
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed;
    }

    return null;
  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    return null;
  }
};

// Função para verificar se o usuário é administrador
export const isAdmin = () => {
  const user = getCurrentUser();
  return user && user.role === 'admin';
};

// Função para verificar se o usuário está logado
export const isAuthenticated = () => {
  // ✅ SEGURANÇA: Token agora é HttpOnly cookie
  // Verificar se há dados de usuário em localStorage (token está no servidor)
  return !!localStorage.getItem('userData');
};

// Função para obter o role do usuário
export const getUserRole = () => {
  const user = getCurrentUser();
  return user ? user.role : 'user';
};