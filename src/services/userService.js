// src/services/userService.js

// Função para obter dados do usuário logado
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');
    
    // Preferir userData se existir
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed;
    }
    
    // Fallback: tentar extrair do token
    if (token) {
      // Se for um token JWT
      if (token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          id: payload.id,
          usuario: payload.usuario,
          role: payload.role || 'user'
        };
      }
      // Se for token base64 simples (Google Auth)
      else {
        const decoded = JSON.parse(atob(token));
        return {
          id: decoded.id,
          usuario: decoded.usuario,
          role: decoded.role || 'user',
          email: decoded.email,
          loginType: decoded.loginType
        };
      }
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
  const token = localStorage.getItem('authToken');
  return !!token;
};

// Função para obter o role do usuário
export const getUserRole = () => {
  const user = getCurrentUser();
  return user ? user.role : 'user';
};