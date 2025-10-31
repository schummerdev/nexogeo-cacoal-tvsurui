// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getUserRole, isAdmin } from '../services/userService';
import { isTokenExpired, getCurrentToken } from '../services/authService';
import { auditHelpers } from '../services/auditService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Preload será implementado separadamente para evitar dependência circular

  // Verificar autenticação na inicialização
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    try {
      const token = getCurrentToken();
      
      if (!token || isTokenExpired(token)) {
        logout();
        return;
      }

      const userData = getCurrentUser();
      if (userData) {
        setUser(userData);
        setIsLoggedIn(true);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Erro ao verificar status de autenticação:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = (userData, token) => {
    try {
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      setUser(userData);
      setIsLoggedIn(true);

      // Log de auditoria para login
      auditHelpers.userLogin(userData.id);
      console.log('🔐 Login auditado:', userData.username);
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  };

  const logout = () => {
    // Log de auditoria para logout
    if (user) {
      auditHelpers.userLogout(user.id);
      console.log('🚪 Logout auditado:', user.username);
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setIsLoggedIn(false);
  };

  // Verificações de permissão
  const hasRole = (role) => {
    return user && user.role === role;
  };

  const hasAnyRole = (roles) => {
    return user && roles.includes(user.role);
  };

  const isUserAdmin = () => {
    return hasRole('admin');
  };

  const isModerator = () => {
    return hasRole('moderator');
  };

  const isEditor = () => {
    return hasRole('editor');
  };

  const canCreatePromotion = () => {
    return hasAnyRole(['admin', 'moderator', 'editor', 'user']);
  };

  const canEditPromotion = () => {
    return hasAnyRole(['admin', 'moderator', 'editor', 'user']);
  };

  const canDeletePromotion = () => {
    return hasAnyRole(['admin', 'moderator']);
  };

  const canViewParticipants = () => {
    return hasRole('admin');
  };

  const canExportData = () => {
    return hasAnyRole(['admin', 'moderator']);
  };

  const canManageUsers = () => {
    return hasRole('admin');
  };

  const canViewReports = () => {
    return hasAnyRole(['admin', 'moderator', 'editor', 'viewer', 'user']);
  };

  const canManageSystem = () => {
    return hasRole('admin');
  };

  const canPerformDraw = () => {
    return hasAnyRole(['admin', 'moderator', 'user']);
  };

  const canCancelWinner = () => {
    return hasRole('admin');
  };

  const canAccessAuditLogs = () => {
    return hasAnyRole(['admin', 'moderator']);
  };

  // Verificar se usuário pode acessar determinada página
  const canAccessPage = (pageName) => {
    if (!user) return false;

    const pagePermissions = {
      'dashboard': () => hasAnyRole(['admin', 'moderator', 'editor', 'viewer']),
      'promocoes': () => hasAnyRole(['admin', 'moderator', 'editor', 'viewer']),
      'participantes': () => canViewParticipants(),
      'sorteio': () => hasAnyRole(['admin', 'moderator', 'editor']),
      'gerador-links': () => hasAnyRole(['admin', 'moderator', 'editor']),
      'configuracoes': () => canManageSystem(),
      'mapas': () => canViewReports(),
      'mapa-participantes': () => canViewReports(),
    };

    const permissionCheck = pagePermissions[pageName];
    return permissionCheck ? permissionCheck() : false;
  };

  const value = {
    // Estado
    user,
    loading,
    isLoggedIn,
    
    // Ações
    login,
    logout,
    checkAuthStatus,
    
    // Verificações de role
    hasRole,
    hasAnyRole,
    isUserAdmin,
    isModerator,
    isEditor,
    
    // Permissões específicas
    canCreatePromotion,
    canEditPromotion,
    canDeletePromotion,
    canViewParticipants,
    canExportData,
    canManageUsers,
    canViewReports,
    canManageSystem,
    canPerformDraw,
    canCancelWinner,
    canAccessAuditLogs,
    canAccessPage,
    
    // Dados do usuário
    userRole: user?.role || 'guest',
    userName: user?.nome || user?.usuario || 'Usuário',
    userEmail: user?.email || '',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;