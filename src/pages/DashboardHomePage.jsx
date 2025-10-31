// src/pages/DashboardHomePage.jsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import AdminDashboardPage from './AdminDashboardPage';
import ModeratorDashboardPage from './ModeratorDashboardPage';
import UserDashboardPage from './UserDashboardPage';
import ViewerDashboardPage from './ViewerDashboardPage';
import { LoadingSpinner } from '../components/LoadingComponents';

const DashboardHomePage = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p>⚠️ Erro de autenticação</p>
        <button 
          className="btn-primary"
          onClick={() => window.location.href = '/login'}
        >
          Fazer Login
        </button>
      </div>
    );
  }

  // Renderizar dashboard baseado no role do usuário
  switch (userRole) {
    case 'admin':
      return <AdminDashboardPage />;
    
    case 'moderator':
      return <ModeratorDashboardPage />;
    
    case 'viewer':
      return <ViewerDashboardPage />;
    
    case 'editor':
    case 'user':
    default:
      return <UserDashboardPage />;
  }
};

export default DashboardHomePage;