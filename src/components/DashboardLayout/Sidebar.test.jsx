import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';

// Mock do ThemeContext
jest.mock('../../contexts/ThemeContext');
const mockUseTheme = useTheme;

describe('Sidebar', () => {
  const mockThemes = {
    azul: { name: 'Azul', gradient: 'linear-gradient(to right, #3b82f6, #1d4ed8)' },
    verde: { name: 'Verde', gradient: 'linear-gradient(to right, #10b981, #047857)' },
    vermelho: { name: 'Vermelho', gradient: 'linear-gradient(to right, #ef4444, #dc2626)' },
    roxo: { name: 'Roxo', gradient: 'linear-gradient(to right, #8b5cf6, #7c3aed)' },
    dark: { name: 'Escuro', gradient: 'linear-gradient(to right, #374151, #1f2937)' }
  };

  const mockChangeTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      currentTheme: 'azul',
      themes: mockThemes,
      changeTheme: mockChangeTheme
    });
  });

  const renderWithRouter = (component) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  describe('Renderização básica', () => {
    test('deve renderizar sidebar com logo e título', () => {
      renderWithRouter(<Sidebar />);
      
      expect(screen.getByRole('complementary')).toBeInTheDocument(); // aside element
      expect(screen.getByText('🎯 NexoGeo')).toBeInTheDocument();
      expect(screen.getByText('Painel Administrativo')).toBeInTheDocument();
    });

    test('deve aplicar classes CSS corretas', () => {
      renderWithRouter(<Sidebar />);
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('sidebar');
      expect(document.querySelector('.sidebar-header')).toBeInTheDocument();
      expect(document.querySelector('.sidebar-nav')).toBeInTheDocument();
    });

    test('deve ter estrutura correta de elementos', () => {
      renderWithRouter(<Sidebar />);
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar.querySelector('.sidebar-header')).toBeInTheDocument();
      expect(sidebar.querySelector('.sidebar-nav')).toBeInTheDocument();
      expect(sidebar.querySelector('.theme-selector')).toBeInTheDocument();
    });
  });

  describe('Links de navegação', () => {
    const expectedLinks = [
      { to: '/dashboard', text: 'Painel de Controle', icon: '📊' },
      { to: '/dashboard/promocoes', text: 'Promoções', icon: '🎁' },
      { to: '/dashboard/participantes', text: 'Participantes', icon: '👥' },
      { to: '/dashboard/gerador-links', text: 'Gerador de Links', icon: '🔗' },
      { to: '/dashboard/sorteio', text: 'Módulo de Sorteio', icon: '🎲' },
      { to: '/dashboard/mapas', text: 'Mapas Interativos', icon: '🗺️' },
      { to: '/dashboard/mapa-participantes', text: 'Origem dos Links', icon: '📊' },
      { to: '/dashboard/configuracoes', text: 'Configurações', icon: '⚙️' }
    ];

    test('deve renderizar todos os links de navegação', () => {
      renderWithRouter(<Sidebar />);
      
      expectedLinks.forEach(link => {
        expect(screen.getByText(link.text)).toBeInTheDocument();
      });
      
      // Verificar ícones (alguns são duplicados)
      expect(screen.getAllByText('📊')).toHaveLength(2); // Painel de Controle e Origem dos Links
      expect(screen.getByText('🎁')).toBeInTheDocument();
      expect(screen.getByText('👥')).toBeInTheDocument();
      expect(screen.getByText('🔗')).toBeInTheDocument();
      expect(screen.getByText('🎲')).toBeInTheDocument();
      expect(screen.getByText('🗺️')).toBeInTheDocument();
      expect(screen.getByText('⚙️')).toBeInTheDocument();
    });

    test('deve ter links com href corretos', () => {
      renderWithRouter(<Sidebar />);
      
      expectedLinks.forEach(link => {
        const linkElement = screen.getByText(link.text).closest('a');
        expect(linkElement).toHaveAttribute('href', link.to);
      });
    });

    test('deve aplicar classes corretas aos links', () => {
      renderWithRouter(<Sidebar />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('nav-item');
      });
    });

    test('deve usar NavLink para navegação ativa', () => {
      renderWithRouter(<Sidebar />);
      
      const dashboardLink = screen.getByText('Painel de Controle').closest('a');
      expect(dashboardLink).toHaveClass('nav-item');
      // NavLink adiciona classes baseadas na rota ativa
    });
  });

  describe('Seletor de temas', () => {
    test('deve renderizar título do seletor de temas', () => {
      renderWithRouter(<Sidebar />);
      
      expect(screen.getByText('🎨 Tema')).toBeInTheDocument();
    });

    test('deve renderizar botões para todos os temas', () => {
      renderWithRouter(<Sidebar />);
      
      Object.entries(mockThemes).forEach(([key, theme]) => {
        const themeButton = screen.getByTitle(`Tema ${theme.name}`);
        expect(themeButton).toBeInTheDocument();
      });
    });

    test('deve mostrar nome do tema atual', () => {
      renderWithRouter(<Sidebar />);
      
      expect(screen.getByText('Azul')).toBeInTheDocument();
    });

    test('deve marcar tema atual com ✓', () => {
      renderWithRouter(<Sidebar />);
      
      // O tema atual (azul) deve ter o checkmark
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    test('deve chamar changeTheme ao clicar em tema', () => {
      renderWithRouter(<Sidebar />);
      
      const verdeButton = screen.getByTitle('Tema Verde');
      fireEvent.click(verdeButton);
      
      expect(mockChangeTheme).toHaveBeenCalledWith('verde');
    });

    test('deve aplicar estilos corretos ao tema ativo', () => {
      renderWithRouter(<Sidebar />);
      
      const azulButton = screen.getByTitle('Tema Azul');
      expect(azulButton).toHaveStyle('border: 2px solid white');
      expect(azulButton).toHaveStyle('transform: scale(1.1)');
    });

    test('deve aplicar gradiente correto a cada tema', () => {
      renderWithRouter(<Sidebar />);
      
      Object.entries(mockThemes).forEach(([key, theme]) => {
        const themeButton = screen.getByTitle(`Tema ${theme.name}`);
        expect(themeButton).toHaveStyle(`background: ${theme.gradient}`);
      });
    });
  });

  describe('Interações do usuário', () => {
    test('deve permitir navegação por teclado nos links', () => {
      renderWithRouter(<Sidebar />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link.tagName).toBe('A'); // Links são focusable por padrão
      });
    });

    test('deve permitir navegação por teclado nos botões de tema', () => {
      renderWithRouter(<Sidebar />);
      
      Object.values(mockThemes).forEach(theme => {
        const themeButton = screen.getByTitle(`Tema ${theme.name}`);
        expect(themeButton.tagName).toBe('BUTTON');
      });
    });

    test('deve ter títulos (tooltips) nos botões de tema', () => {
      renderWithRouter(<Sidebar />);
      
      Object.entries(mockThemes).forEach(([key, theme]) => {
        const themeButton = screen.getByTitle(`Tema ${theme.name}`);
        expect(themeButton).toHaveAttribute('title', `Tema ${theme.name}`);
      });
    });
  });

  describe('Estados visuais', () => {
    test('deve atualizar tema atual quando contexto muda', () => {
      // Primeiro render com tema azul
      const { rerender } = renderWithRouter(<Sidebar />);
      expect(screen.getByText('Azul')).toBeInTheDocument();
      
      // Simular mudança de tema no contexto
      mockUseTheme.mockReturnValue({
        currentTheme: 'verde',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });
      
      // Rerender com router wrapper
      rerender(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );
      expect(screen.getByText('Verde')).toBeInTheDocument();
    });

    test('deve mover ✓ para novo tema ativo', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'verde',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });

      renderWithRouter(<Sidebar />);
      
      const verdeButton = screen.getByTitle('Tema Verde');
      expect(verdeButton).toContainElement(screen.getByText('✓'));
    });
  });

  describe('Casos extremos', () => {
    test('deve lidar com temas vazios', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'azul',
        themes: {},
        changeTheme: mockChangeTheme
      });

      renderWithRouter(<Sidebar />);
      
      // Deve renderizar sem quebrar
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    test('deve lidar com tema atual não existente', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'inexistente',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });

      renderWithRouter(<Sidebar />);
      
      // Não deve quebrar, mas não vai mostrar nome do tema
      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    test('deve funcionar sem changeTheme', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'azul',
        themes: mockThemes,
        changeTheme: undefined
      });

      expect(() => {
        renderWithRouter(<Sidebar />);
      }).not.toThrow();
    });
  });

  describe('Layout responsivo', () => {
    test('deve ter estrutura flexível para diferentes tamanhos', () => {
      renderWithRouter(<Sidebar />);
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar).toHaveClass('sidebar');
      
      // A estrutura deve permitir que o theme selector fique no final
      const themeSelector = sidebar.querySelector('.theme-selector');
      expect(themeSelector).toHaveStyle('margin-top: auto');
    });

    test('deve organizar botões de tema em flexwrap', () => {
      renderWithRouter(<Sidebar />);
      
      const themeContainer = document.querySelector('.theme-selector > div:nth-child(2)');
      expect(themeContainer).toHaveStyle('display: flex');
      expect(themeContainer).toHaveStyle('flex-wrap: wrap');
      expect(themeContainer).toHaveStyle('gap: 8px');
    });
  });

  describe('Acessibilidade', () => {
    test('deve usar elemento aside semanticamente correto', () => {
      renderWithRouter(<Sidebar />);
      
      const sidebar = screen.getByRole('complementary');
      expect(sidebar.tagName).toBe('ASIDE');
    });

    test('deve usar nav para área de navegação', () => {
      renderWithRouter(<Sidebar />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveClass('sidebar-nav');
    });

    test('deve ter hierarquia de heading correta', () => {
      renderWithRouter(<Sidebar />);
      
      const title = screen.getByRole('heading', { level: 2 });
      expect(title).toHaveTextContent('🎯 NexoGeo');
    });

    test('deve ter contraste adequado para texto', () => {
      renderWithRouter(<Sidebar />);
      
      // Os estilos inline devem garantir contraste adequado
      const themeLabel = screen.getByText('🎨 Tema');
      expect(themeLabel.closest('div')).toHaveStyle('color: rgba(255, 255, 255, 0.7)');
    });
  });

  describe('Props e contexto', () => {
    test('deve funcionar corretamente com diferentes temas do contexto', () => {
      const customThemes = {
        custom1: { name: 'Custom 1', gradient: 'linear-gradient(red, blue)' },
        custom2: { name: 'Custom 2', gradient: 'linear-gradient(green, yellow)' }
      };

      mockUseTheme.mockReturnValue({
        currentTheme: 'custom1',
        themes: customThemes,
        changeTheme: mockChangeTheme
      });

      renderWithRouter(<Sidebar />);
      
      expect(screen.getByTitle('Tema Custom 1')).toBeInTheDocument();
      expect(screen.getByTitle('Tema Custom 2')).toBeInTheDocument();
      expect(screen.getByText('Custom 1')).toBeInTheDocument();
    });
  });
});