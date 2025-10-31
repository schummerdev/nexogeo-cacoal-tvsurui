import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Mock do localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do document.documentElement
const mockSetProperty = jest.fn();
Object.defineProperty(document, 'documentElement', {
  value: {
    style: {
      setProperty: mockSetProperty
    }
  }
});

// Componente de teste para usar o hook useTheme
const TestComponent = () => {
  const { currentTheme, themes, changeTheme, currentThemeData } = useTheme();
  
  return (
    <div>
      <div data-testid="current-theme">{currentTheme}</div>
      <div data-testid="current-theme-name">{currentThemeData.name}</div>
      <div data-testid="themes-count">{Object.keys(themes).length}</div>
      <button 
        data-testid="change-to-verde" 
        onClick={() => changeTheme('verde')}
      >
        Mudar para Verde
      </button>
      <button 
        data-testid="change-to-dark" 
        onClick={() => changeTheme('dark')}
      >
        Mudar para Escuro
      </button>
      <button 
        data-testid="change-to-invalid" 
        onClick={() => changeTheme('inexistente')}
      >
        Tema Inválido
      </button>
    </div>
  );
};

// Componente que tenta usar useTheme fora do Provider
const ComponentWithoutProvider = () => {
  try {
    useTheme();
    return <div>Should not render</div>;
  } catch (error) {
    return <div data-testid="error-message">{error.message}</div>;
  }
};

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('azul');
    mockSetProperty.mockClear();
  });

  describe('ThemeProvider', () => {
    test('deve renderizar children corretamente', () => {
      render(
        <ThemeProvider>
          <div data-testid="test-child">Test Child</div>
        </ThemeProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    test('deve carregar tema padrão do localStorage', () => {
      localStorageMock.getItem.mockReturnValue('verde');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('verde');
      expect(screen.getByTestId('current-theme-name')).toHaveTextContent('Verde');
    });

    test('deve usar tema azul como padrão quando localStorage está vazio', () => {
      localStorageMock.getItem.mockReturnValue(null);

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('azul');
      expect(screen.getByTestId('current-theme-name')).toHaveTextContent('Azul');
    });

    test('deve aplicar variáveis CSS do tema inicial', () => {
      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Verificar se as variáveis CSS foram aplicadas
      expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', '#3b82f6');
      expect(mockSetProperty).toHaveBeenCalledWith('--color-background', '#f8fafc');
      expect(mockSetProperty).toHaveBeenCalledWith('--color-text', '#1e293b');
    });
  });

  describe('useTheme hook', () => {
    test('deve fornecer informações do tema atual', () => {
      localStorageMock.getItem.mockReturnValue('roxo');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('roxo');
      expect(screen.getByTestId('current-theme-name')).toHaveTextContent('Roxo');
      expect(screen.getByTestId('themes-count')).toHaveTextContent('5'); // azul, verde, vermelho, roxo, dark
    });

    test('deve lançar erro quando usado fora do ThemeProvider', () => {
      render(<ComponentWithoutProvider />);
      
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'useTheme must be used within a ThemeProvider'
      );
    });
  });

  describe('changeTheme function', () => {
    test('deve mudar tema e salvar no localStorage', () => {
      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Tema inicial
      expect(screen.getByTestId('current-theme')).toHaveTextContent('azul');

      // Mudar para verde
      act(() => {
        screen.getByTestId('change-to-verde').click();
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('verde');
      expect(screen.getByTestId('current-theme-name')).toHaveTextContent('Verde');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('nexogeo-theme', 'verde');
    });

    test('deve aplicar variáveis CSS ao mudar tema', () => {
      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Limpar calls anteriores
      mockSetProperty.mockClear();

      // Mudar para tema escuro
      act(() => {
        screen.getByTestId('change-to-dark').click();
      });

      // Verificar se as variáveis CSS do tema escuro foram aplicadas
      expect(mockSetProperty).toHaveBeenCalledWith('--color-background', '#111827');
      expect(mockSetProperty).toHaveBeenCalledWith('--color-text', '#f9fafb');
      expect(mockSetProperty).toHaveBeenCalledWith('--color-surface', '#1f2937');
    });

    test('deve ignorar mudança para tema inválido', () => {
      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Tema inicial
      expect(screen.getByTestId('current-theme')).toHaveTextContent('azul');

      // Tentar mudar para tema inexistente
      act(() => {
        screen.getByTestId('change-to-invalid').click();
      });

      // Tema deve permanecer o mesmo
      expect(screen.getByTestId('current-theme')).toHaveTextContent('azul');
    });
  });

  describe('Todos os temas', () => {
    const themeNames = ['azul', 'verde', 'vermelho', 'roxo', 'dark'];

    themeNames.forEach(themeName => {
      test(`deve aplicar tema ${themeName} corretamente`, () => {
        localStorageMock.getItem.mockReturnValue(themeName);

        render(
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        );

        expect(screen.getByTestId('current-theme')).toHaveTextContent(themeName);
        
        // Verificar se pelo menos algumas variáveis CSS foram aplicadas
        expect(mockSetProperty).toHaveBeenCalledWith('--color-primary', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-background', expect.any(String));
        expect(mockSetProperty).toHaveBeenCalledWith('--color-text', expect.any(String));
      });
    });
  });

  describe('Estrutura dos temas', () => {
    test('todos os temas devem ter propriedades obrigatórias', () => {
      const TestThemeStructure = () => {
        const { themes } = useTheme();
        const requiredProperties = [
          'name', 'primary', 'primaryDark', 'primaryLight', 
          'secondary', 'background', 'surface', 'text', 
          'textSecondary', 'border', 'success', 'warning', 
          'danger', 'gradient'
        ];

        return (
          <div>
            {Object.entries(themes).map(([key, theme]) => (
              <div key={key}>
                {requiredProperties.map(prop => (
                  <div key={`${key}-${prop}`} data-testid={`${key}-${prop}`}>
                    {theme[prop] ? 'has-property' : 'missing-property'}
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      };

      render(
        <ThemeProvider>
          <TestThemeStructure />
        </ThemeProvider>
      );

      const themeNames = ['azul', 'verde', 'vermelho', 'roxo', 'dark'];
      const requiredProperties = [
        'name', 'primary', 'primaryDark', 'primaryLight', 
        'secondary', 'background', 'surface', 'text', 
        'textSecondary', 'border', 'success', 'warning', 
        'danger', 'gradient'
      ];

      themeNames.forEach(themeName => {
        requiredProperties.forEach(prop => {
          expect(screen.getByTestId(`${themeName}-${prop}`)).toHaveTextContent('has-property');
        });
      });
    });
  });

  describe('Persistência de estado', () => {
    test('deve salvar mudanças de tema no localStorage', () => {
      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Mudar para verde
      act(() => {
        screen.getByTestId('change-to-verde').click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('nexogeo-theme', 'verde');

      // Mudar para escuro
      act(() => {
        screen.getByTestId('change-to-dark').click();
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('nexogeo-theme', 'dark');
    });
  });

  describe('Dados do tema atual', () => {
    test('currentThemeData deve retornar o objeto do tema atual', () => {
      const TestCurrentThemeData = () => {
        const { currentThemeData, changeTheme } = useTheme();
        
        return (
          <div>
            <div data-testid="current-primary">{currentThemeData.primary}</div>
            <div data-testid="current-name">{currentThemeData.name}</div>
            <button onClick={() => changeTheme('vermelho')}>Mudar para Vermelho</button>
          </div>
        );
      };

      localStorageMock.getItem.mockReturnValue('azul');

      render(
        <ThemeProvider>
          <TestCurrentThemeData />
        </ThemeProvider>
      );

      // Verificar dados do tema azul
      expect(screen.getByTestId('current-primary')).toHaveTextContent('#3b82f6');
      expect(screen.getByTestId('current-name')).toHaveTextContent('Azul');

      // Mudar para vermelho
      act(() => {
        screen.getByText('Mudar para Vermelho').click();
      });

      // Verificar dados do tema vermelho
      expect(screen.getByTestId('current-primary')).toHaveTextContent('#ef4444');
      expect(screen.getByTestId('current-name')).toHaveTextContent('Vermelho');
    });
  });
});