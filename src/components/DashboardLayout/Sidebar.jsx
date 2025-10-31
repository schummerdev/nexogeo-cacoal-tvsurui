import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLayout } from '../../contexts/LayoutContext';
import './DashboardLayout.css';

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar } = useLayout();
  const { currentTheme, themes, changeTheme } = useTheme();
  const { canAccessPage, canViewParticipants, canManageSystem, canViewReports } = useAuth();

  return (
    <>
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/imagens/logo.png" alt="NexoGeo Logo" className="sidebar-logo" />
          <h2 className="sidebar-title">NexoGeo</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/dashboard" end className="nav-item">
            <span className="nav-icon">📊</span>
            Painel de Controle
          </NavLink>
          
          <NavLink to="/dashboard/promocoes" className="nav-item">
            <span className="nav-icon">🎁</span>
            Promoções
          </NavLink>
          
          {canViewParticipants() && (
            <NavLink to="/dashboard/participantes" className="nav-item">
              <span className="nav-icon">👥</span>
              Participantes
            </NavLink>
          )}

          <NavLink to="/dashboard/sorteio" className="nav-item">
            <span className="nav-icon">🎲</span>
            Módulo de Sorteio
          </NavLink>
          
          <NavLink to="/dashboard/caixa-misteriosa" className="nav-item">
            <span className="nav-icon">📦</span>
            Caixa Misteriosa
          </NavLink>
          
          {canViewReports() && (
            <NavLink to="/dashboard/mapas" className="nav-item">
              <span className="nav-icon">🗺️</span>
              Mapas Interativos
            </NavLink>
          )}
          
          {canViewReports() && (
            <NavLink to="/dashboard/mapa-participantes" className="nav-item">
              <span className="nav-icon">📊</span>
              Origem dos Links
            </NavLink>
          )}
          
          {canManageSystem() && (
            <NavLink to="/dashboard/configuracoes" className="nav-item">
              <span className="nav-icon">⚙️</span>
              Configurações
            </NavLink>
          )}
        </nav>
        
        {/* Seletor de Tema */}
        <div className="theme-selector" style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
          marginTop: 'auto'
        }}>
          <div style={{ 
            marginBottom: '8px',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            🎨 Tema
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px' 
          }}>
            {Object.entries(themes).map(([key, theme]) => (
              <button
                key={key}
                onClick={() => changeTheme(key)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: currentTheme === key ? '2px solid white' : '2px solid transparent',
                  background: theme.gradient,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: currentTheme === key ? '0 0 0 2px rgba(255, 255, 255, 0.3)' : 'var(--shadow-sm)',
                  transform: currentTheme === key ? 'scale(1.1)' : 'scale(1)',
                  position: 'relative'
                }}
                title={`Tema ${theme.name}`}
                onMouseOver={(e) => {
                  if (currentTheme !== key) {
                    e.target.style.transform = 'scale(1.05)';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentTheme !== key) {
                    e.target.style.transform = 'scale(1)';
                  }
                }}
              >
                {currentTheme === key && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.7)'
                  }}>
                    ✓
                  </div>
                )}
              </button>
            ))}
          </div>
          <div style={{
            marginTop: '8px',
            fontSize: '0.6875rem',
            color: 'rgba(255, 255, 255, 0.6)',
            textAlign: 'center'
          }}>
            {themes[currentTheme]?.name}
          </div>
        </div>
      </aside>
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
    </>
  );
};

export default Sidebar; 