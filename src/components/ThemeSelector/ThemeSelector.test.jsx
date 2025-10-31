import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ThemeSelector from './ThemeSelector';
import { useTheme } from '../../contexts/ThemeContext';

// Mock do useTheme
jest.mock('../../contexts/ThemeContext');
const mockUseTheme = useTheme;

describe('ThemeSelector', () => {
  const mockThemes = {
    azul: { name: 'Azul', primary: '#3b82f6' },
    verde: { name: 'Verde', primary: '#10b981' },
    vermelho: { name: 'Vermelho', primary: '#ef4444' },
    roxo: { name: 'Roxo', primary: '#8b5cf6' },
    dark: { name: 'Escuro', primary: '#3b82f6' }
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

  describe('Renderização padrão (dropdown)', () => {
    test('deve renderizar seletor dropdown por padrão', () => {
      render(<ThemeSelector />);
      
      expect(screen.getByTitle('Alterar tema')).toBeInTheDocument();
      expect(screen.getByText('🎨')).toBeInTheDocument();
      expect(screen.getByText('Azul')).toBeInTheDocument();
      expect(screen.getByText('▼')).toBeInTheDocument();
    });

    test('deve mostrar tema atual no botão trigger', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'verde',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });

      render(<ThemeSelector />);
      
      expect(screen.getByText('Verde')).toBeInTheDocument();
    });

    test('não deve mostrar dropdown inicialmente', () => {
      render(<ThemeSelector />);
      
      expect(screen.queryByText('Vermelho')).not.toBeInTheDocument();
      expect(screen.queryByText('Roxo')).not.toBeInTheDocument();
    });
  });

  describe('Interações do dropdown', () => {
    test('deve abrir dropdown ao clicar no trigger', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      expect(screen.getByText('Verde')).toBeInTheDocument();
      expect(screen.getByText('Vermelho')).toBeInTheDocument();
      expect(screen.getByText('Roxo')).toBeInTheDocument();
      expect(screen.getByText('Escuro')).toBeInTheDocument();
    });

    test('deve fechar dropdown ao clicar novamente no trigger', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      
      // Abrir
      fireEvent.click(trigger);
      expect(screen.getByText('Verde')).toBeInTheDocument();
      
      // Fechar
      fireEvent.click(trigger);
      expect(screen.queryByText('Verde')).not.toBeInTheDocument();
    });

    test('deve mostrar tema atual como ativo', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      const azulOption = document.querySelector('.theme-option.active');
      expect(azulOption).toHaveClass('active');
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    test('deve chamar changeTheme ao selecionar tema', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      const verdeOption = screen.getByText('Verde').closest('button');
      fireEvent.click(verdeOption);
      
      expect(mockChangeTheme).toHaveBeenCalledWith('verde');
    });

    test('deve fechar dropdown após selecionar tema', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      const verdeOption = screen.getByText('Verde').closest('button');
      fireEvent.click(verdeOption);
      
      // Dropdown deve estar fechado
      expect(screen.queryByText('Verde')).not.toBeInTheDocument();
    });
  });

  describe('Renderização inline (select)', () => {
    test('deve renderizar select quando inline=true', () => {
      render(<ThemeSelector inline={true} />);
      
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Azul')).toBeInTheDocument();
      expect(screen.queryByText('🎨')).not.toBeInTheDocument();
    });

    test('deve mostrar label por padrão no modo inline', () => {
      render(<ThemeSelector inline={true} />);
      
      expect(screen.getByText('Tema:')).toBeInTheDocument();
    });

    test('deve ocultar label quando showLabel=false', () => {
      render(<ThemeSelector inline={true} showLabel={false} />);
      
      expect(screen.queryByText('Tema:')).not.toBeInTheDocument();
    });

    test('deve chamar changeTheme ao alterar select', () => {
      render(<ThemeSelector inline={true} />);
      
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'roxo' } });
      
      expect(mockChangeTheme).toHaveBeenCalledWith('roxo');
    });

    test('deve mostrar todas as opções no select', () => {
      render(<ThemeSelector inline={true} />);
      
      expect(screen.getByRole('option', { name: 'Azul' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Verde' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Vermelho' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Roxo' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Escuro' })).toBeInTheDocument();
    });

    test('deve selecionar tema atual no select', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'dark',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });

      render(<ThemeSelector inline={true} />);
      
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('dark');
    });
  });

  describe('Cores e estilos dos temas', () => {
    test('deve mostrar preview de cor para cada tema no dropdown', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      const previews = document.querySelectorAll('.theme-preview');
      expect(previews).toHaveLength(5);
      
      // Verificar algumas cores específicas
      const verdePreview = Array.from(previews).find(
        preview => preview.style.backgroundColor === 'rgb(16, 185, 129)'
      );
      expect(verdePreview).toBeInTheDocument();
    });

    test('deve aplicar cor correta para cada tema', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      // Encontrar o botão do tema verde
      const verdeButton = screen.getByText('Verde').closest('button');
      const preview = verdeButton.querySelector('.theme-preview');
      
      expect(preview).toHaveStyle('background-color: #10b981');
    });
  });

  describe('Acessibilidade', () => {
    test('deve ter título no botão trigger', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      expect(trigger).toHaveAttribute('title', 'Alterar tema');
    });

    test('deve ter labels apropriados no modo inline', () => {
      render(<ThemeSelector inline={true} />);
      
      const label = screen.getByText('Tema:');
      const select = screen.getByRole('combobox');
      
      expect(label).toHaveClass('theme-label');
      expect(select).toHaveClass('theme-select');
    });

    test('deve ser navegável por teclado no modo inline', () => {
      render(<ThemeSelector inline={true} />);
      
      const select = screen.getByRole('combobox');
      expect(select).not.toHaveAttribute('disabled');
      expect(select.value).toBeDefined();
    });
  });

  describe('Estados visuais', () => {
    test('deve mostrar seta rotacionada quando dropdown está aberto', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      fireEvent.click(trigger);
      
      const arrow = document.querySelector('.theme-arrow');
      expect(arrow).toHaveClass('open');
    });

    test('deve remover classe open quando dropdown fecha', () => {
      render(<ThemeSelector />);
      
      const trigger = screen.getByTitle('Alterar tema');
      
      // Abrir
      fireEvent.click(trigger);
      expect(document.querySelector('.theme-arrow')).toHaveClass('open');
      
      // Fechar
      fireEvent.click(trigger);
      expect(document.querySelector('.theme-arrow')).not.toHaveClass('open');
    });

    test('deve aplicar classes CSS corretas', () => {
      render(<ThemeSelector />);
      
      expect(document.querySelector('.theme-selector')).toBeInTheDocument();
      expect(document.querySelector('.theme-selector-trigger')).toBeInTheDocument();
      expect(document.querySelector('.theme-icon')).toBeInTheDocument();
      expect(document.querySelector('.theme-name')).toBeInTheDocument();
      expect(document.querySelector('.theme-arrow')).toBeInTheDocument();
    });

    test('deve aplicar classes CSS corretas no modo inline', () => {
      render(<ThemeSelector inline={true} />);
      
      expect(document.querySelector('.theme-selector-inline')).toBeInTheDocument();
      expect(document.querySelector('.theme-label')).toBeInTheDocument();
      expect(document.querySelector('.theme-select')).toBeInTheDocument();
    });
  });

  describe('Casos extremos', () => {
    test('deve funcionar com tema não existente', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'inexistente',
        themes: mockThemes,
        changeTheme: mockChangeTheme
      });

      expect(() => {
        render(<ThemeSelector />);
      }).not.toThrow();
    });

    test('deve funcionar com objeto de temas vazio', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'azul',
        themes: {},
        changeTheme: mockChangeTheme
      });

      const { container } = render(<ThemeSelector />);
      expect(container.firstChild).toBeNull();
    });

    test('deve funcionar sem changeTheme', () => {
      mockUseTheme.mockReturnValue({
        currentTheme: 'azul',
        themes: mockThemes,
        changeTheme: undefined
      });

      expect(() => {
        render(<ThemeSelector />);
      }).not.toThrow();
    });
  });

  describe('Props', () => {
    test('deve funcionar com props padrão', () => {
      render(<ThemeSelector />);
      
      // Modo dropdown por padrão
      expect(screen.getByTitle('Alterar tema')).toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('deve respeitar prop inline', () => {
      const { rerender } = render(<ThemeSelector inline={false} />);
      expect(screen.getByTitle('Alterar tema')).toBeInTheDocument();
      
      rerender(<ThemeSelector inline={true} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    test('deve respeitar prop showLabel', () => {
      const { rerender } = render(<ThemeSelector inline={true} showLabel={true} />);
      expect(screen.getByText('Tema:')).toBeInTheDocument();
      
      rerender(<ThemeSelector inline={true} showLabel={false} />);
      expect(screen.queryByText('Tema:')).not.toBeInTheDocument();
    });
  });
});