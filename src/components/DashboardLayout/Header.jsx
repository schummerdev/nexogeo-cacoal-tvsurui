import React from 'react';
import ThemeSelector from '../ThemeSelector/ThemeSelector';
import { getCurrentUser } from '../../services/userService';
import { useLayout } from '../../contexts/LayoutContext';
import './DashboardLayout.css';

const Header = ({ title, subtitle, children }) => {
  const { toggleSidebar } = useLayout();
  // Busca informações do usuário do localStorage usando o serviço
  const currentUser = getCurrentUser();
  const userName = currentUser?.usuario || currentUser?.name || 'Usuário';
  const userRole = currentUser?.role === 'admin' ? 'Administrador' : 'Usuário';

  const handleLogout = () => {
    // Remove o token de autenticação
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');

    // Redireciona para a tela de login
    window.location.href = '/login';
  };

  return (
    <header className="header">
      {/* Botão do menu mobile */}
      <button onClick={toggleSidebar} className="mobile-menu-toggle" aria-label="Abrir menu">
        ☰
      </button>

      <div className="header-content">
        <div className="header-titles">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>

        <div className="header-user-info">
          {/* Renderiza children (botões customizados) antes dos outros elementos */}
          {children}
          <ThemeSelector />
          <div className="user-avatar">
            <span className="user-initial">{(userName || 'U').charAt(0).toUpperCase()}</span>
          </div>
          <div className="user-details">
            <span className="user-greeting">Olá, {userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <button onClick={handleLogout} className="logout-button-header" title="Sair">
            <span className="logout-icon-header">🚪</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 