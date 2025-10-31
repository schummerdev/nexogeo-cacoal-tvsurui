// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ 
  children, 
  requireRole = null, 
  requireAnyRole = null, 
  requirePermission = null,
  fallbackPath = '/login',
  showAccessDenied = false 
}) => {
  const { user, loading, isLoggedIn, hasRole, hasAnyRole: hasAnyRoleAuth } = useAuth();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se não está logado, redireciona para login
  if (!isLoggedIn || !user) {
    return <Navigate to="/login" replace />;
  }

  // Verificar role específico
  if (requireRole && !hasRole(requireRole)) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar qualquer um dos roles
  if (requireAnyRole && !hasAnyRoleAuth(requireAnyRole)) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Verificar permissão específica
  if (requirePermission && typeof requirePermission === 'function' && !requirePermission()) {
    if (showAccessDenied) {
      return <AccessDenied />;
    }
    return <Navigate to={fallbackPath} replace />;
  }

  // Se passou em todas as verificações, renderiza o componente
  return children;
};

// Componente para exibir acesso negado
const AccessDenied = () => {
  return (
    <div className="access-denied-container">
      <div className="access-denied-content">
        <div className="access-denied-icon">🚫</div>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <p>Entre em contato com o administrador se acredita que isso é um erro.</p>
        <button 
          className="btn btn-primary"
          onClick={() => window.history.back()}
        >
          Voltar
        </button>
      </div>
    </div>
  );
};

export default ProtectedRoute;