import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Header from './Header';
import { getCurrentUser } from '../../services/userService';

// Mock do ThemeSelector
jest.mock('../ThemeSelector/ThemeSelector', () => {
  return function MockThemeSelector() {
    return <div data-testid="theme-selector">Theme Selector Mock</div>;
  };
});

// Mock do userService
jest.mock('../../services/userService');
const mockGetCurrentUser = getCurrentUser;

// Mock do window.location
delete window.location;
window.location = { href: '' };

describe('Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.location.href = '';
    
    // Mock padrão do usuário
    mockGetCurrentUser.mockReturnValue({
      usuario: 'João Silva',
      role: 'user'
    });
  });

  describe('Renderização básica', () => {
    test('deve renderizar título obrigatório', () => {
      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument(); // header element
    });

    test('deve renderizar título e subtítulo quando fornecidos', () => {
      render(<Header title="Dashboard" subtitle="Painel de controle" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Painel de controle')).toBeInTheDocument();
    });

    test('não deve renderizar subtítulo quando não fornecido', () => {
      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.queryByText('Painel de controle')).not.toBeInTheDocument();
    });

    test('deve aplicar classes CSS corretas', () => {
      render(<Header title="Dashboard" />);
      
      expect(screen.getByRole('banner')).toHaveClass('header');
      expect(document.querySelector('.header-content')).toBeInTheDocument();
      expect(document.querySelector('.header-titles')).toBeInTheDocument();
      expect(document.querySelector('.header-user-info')).toBeInTheDocument();
    });
  });

  describe('Informações do usuário', () => {
    test('deve exibir nome do usuário padrão', () => {
      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, João Silva')).toBeInTheDocument();
      expect(screen.getByText('Usuário')).toBeInTheDocument(); // role padrão
    });

    test('deve exibir inicial do nome no avatar', () => {
      render(<Header title="Dashboard" />);
      
      const avatar = document.querySelector('.user-initial');
      expect(avatar).toHaveTextContent('J'); // Primeira letra de João
    });

    test('deve exibir "Administrador" para usuário admin', () => {
      mockGetCurrentUser.mockReturnValue({
        usuario: 'Admin User',
        role: 'admin'
      });

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Admin User')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });

    test('deve usar campo "name" se "usuario" não existir', () => {
      mockGetCurrentUser.mockReturnValue({
        name: 'Maria Santos',
        role: 'user'
      });

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Maria Santos')).toBeInTheDocument();
      expect(screen.getByText('M')).toBeInTheDocument(); // Avatar inicial
    });

    test('deve usar "Usuário" como fallback quando não há dados', () => {
      mockGetCurrentUser.mockReturnValue(null);

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Usuário')).toBeInTheDocument();
      expect(screen.getByText('U')).toBeInTheDocument(); // Avatar inicial
      expect(screen.getByText('Usuário')).toBeInTheDocument(); // Role padrão
    });

    test('deve usar "Usuário" como fallback para dados vazios', () => {
      mockGetCurrentUser.mockReturnValue({});

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Usuário')).toBeInTheDocument();
      expect(screen.getByText('Usuário')).toBeInTheDocument();
    });
  });

  describe('ThemeSelector', () => {
    test('deve renderizar o ThemeSelector', () => {
      render(<Header title="Dashboard" />);
      
      expect(screen.getByTestId('theme-selector')).toBeInTheDocument();
    });
  });

  describe('Botão de logout', () => {
    test('deve renderizar botão de logout com ícone', () => {
      render(<Header title="Dashboard" />);
      
      const logoutButton = screen.getByTitle('Sair');
      expect(logoutButton).toBeInTheDocument();
      expect(logoutButton).toHaveClass('logout-button-header');
      expect(logoutButton.querySelector('.logout-icon-header')).toBeInTheDocument();
      expect(logoutButton).toHaveTextContent('🚪');
    });

    test('deve executar logout ao clicar no botão', () => {
      // Mock localStorage
      const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
      
      render(<Header title="Dashboard" />);
      
      const logoutButton = screen.getByTitle('Sair');
      fireEvent.click(logoutButton);
      
      expect(removeItemSpy).toHaveBeenCalledWith('authToken');
      expect(removeItemSpy).toHaveBeenCalledWith('userData');
      expect(window.location.href).toBe('/login');
      
      removeItemSpy.mockRestore();
    });

    test('deve ser acessível por teclado', () => {
      render(<Header title="Dashboard" />);
      
      const logoutButton = screen.getByTitle('Sair');
      expect(logoutButton).toHaveAttribute('title', 'Sair');
      expect(logoutButton.tagName).toBe('BUTTON'); // Elemento focusable
    });
  });

  describe('Layout e estrutura', () => {
    test('deve ter estrutura correta de elementos', () => {
      render(<Header title="Dashboard" subtitle="Subtítulo" />);
      
      // Verificar hierarquia de elementos
      const header = screen.getByRole('banner');
      expect(header.querySelector('.header-content')).toBeInTheDocument();
      expect(header.querySelector('.header-titles')).toBeInTheDocument();
      expect(header.querySelector('.header-user-info')).toBeInTheDocument();
      
      // Verificar elementos específicos
      expect(header.querySelector('.header-title')).toHaveTextContent('Dashboard');
      expect(header.querySelector('.header-subtitle')).toHaveTextContent('Subtítulo');
      expect(header.querySelector('.user-avatar')).toBeInTheDocument();
      expect(header.querySelector('.user-details')).toBeInTheDocument();
    });

    test('deve posicionar elementos corretamente', () => {
      render(<Header title="Dashboard" />);
      
      const headerContent = document.querySelector('.header-content');
      const titles = document.querySelector('.header-titles');
      const userInfo = document.querySelector('.header-user-info');
      
      expect(headerContent).toContainElement(titles);
      expect(headerContent).toContainElement(userInfo);
    });
  });

  describe('Casos extremos', () => {
    test('deve lidar com título vazio', () => {
      render(<Header title="" />);
      
      expect(screen.getByRole('banner')).toBeInTheDocument();
      // O componente ainda deve renderizar mesmo com título vazio
    });

    test('deve lidar com nome de usuário muito longo', () => {
      mockGetCurrentUser.mockReturnValue({
        usuario: 'Nome Muito Longo Com Muitas Palavras Para Testar',
        role: 'user'
      });

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Nome Muito Longo Com Muitas Palavras Para Testar')).toBeInTheDocument();
      expect(screen.getByText('N')).toBeInTheDocument(); // Primeira letra
    });

    test('deve lidar com caracteres especiais no nome', () => {
      mockGetCurrentUser.mockReturnValue({
        usuario: 'José María',
        role: 'admin'
      });

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, José María')).toBeInTheDocument();
      expect(screen.getByText('J')).toBeInTheDocument();
      expect(screen.getByText('Administrador')).toBeInTheDocument();
    });

    test('deve lidar com getCurrentUser retornando undefined', () => {
      mockGetCurrentUser.mockReturnValue(undefined);

      render(<Header title="Dashboard" />);
      
      expect(screen.getByText('Olá, Usuário')).toBeInTheDocument();
      expect(screen.getByText('Usuário')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    test('deve aceitar títulos dinâmicos', () => {
      const { rerender } = render(<Header title="Primeira Página" />);
      expect(screen.getByText('Primeira Página')).toBeInTheDocument();
      
      rerender(<Header title="Segunda Página" />);
      expect(screen.getByText('Segunda Página')).toBeInTheDocument();
      expect(screen.queryByText('Primeira Página')).not.toBeInTheDocument();
    });

    test('deve aceitar subtítulos dinâmicos', () => {
      const { rerender } = render(<Header title="Dashboard" subtitle="Primeiro subtítulo" />);
      expect(screen.getByText('Primeiro subtítulo')).toBeInTheDocument();
      
      rerender(<Header title="Dashboard" subtitle="Segundo subtítulo" />);
      expect(screen.getByText('Segundo subtítulo')).toBeInTheDocument();
      expect(screen.queryByText('Primeiro subtítulo')).not.toBeInTheDocument();
    });

    test('deve permitir remover subtítulo dinamicamente', () => {
      const { rerender } = render(<Header title="Dashboard" subtitle="Com subtítulo" />);
      expect(screen.getByText('Com subtítulo')).toBeInTheDocument();
      
      rerender(<Header title="Dashboard" />);
      expect(screen.queryByText('Com subtítulo')).not.toBeInTheDocument();
    });
  });
});