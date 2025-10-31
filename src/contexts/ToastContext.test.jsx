import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastContext';

// Mock do componente Toast
jest.mock('../components/Toast/Toast', () => {
  return function MockToast({ message, type, onClose }) {
    return (
      <div data-testid={`toast-${type}`} className={`toast toast-${type}`}>
        <span data-testid="toast-message">{message}</span>
        <button data-testid="toast-close" onClick={onClose}>
          ×
        </button>
      </div>
    );
  };
});

// Mock do setTimeout
jest.useFakeTimers();

// Componente de teste para usar o hook useToast
const TestComponent = () => {
  const { showToast, removeToast } = useToast();
  
  return (
    <div>
      <button 
        data-testid="show-success" 
        onClick={() => showToast('Sucesso!', 'success')}
      >
        Mostrar Sucesso
      </button>
      <button 
        data-testid="show-error" 
        onClick={() => showToast('Erro!', 'error')}
      >
        Mostrar Erro
      </button>
      <button 
        data-testid="show-warning" 
        onClick={() => showToast('Aviso!', 'warning')}
      >
        Mostrar Aviso
      </button>
      <button 
        data-testid="show-info" 
        onClick={() => showToast('Informação!', 'info')}
      >
        Mostrar Info
      </button>
      <button 
        data-testid="show-default" 
        onClick={() => showToast('Mensagem padrão')}
      >
        Mostrar Padrão
      </button>
      <button 
        data-testid="remove-toast" 
        onClick={() => removeToast(Date.now())}
      >
        Remover Toast
      </button>
    </div>
  );
};

// Componente que tenta usar useToast fora do Provider
const ComponentWithoutProvider = () => {
  try {
    useToast();
    return <div>Should not render</div>;
  } catch (error) {
    return <div data-testid="error-message">{error.message}</div>;
  }
};

describe('ToastContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('ToastProvider', () => {
    test('deve renderizar children corretamente', () => {
      render(
        <ToastProvider>
          <div data-testid="test-child">Test Child</div>
        </ToastProvider>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    test('deve renderizar container de toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      const toastContainer = document.querySelector('.toast-container');
      expect(toastContainer).toBeInTheDocument();
    });
  });

  describe('useToast hook', () => {
    test('deve lançar erro quando usado fora do ToastProvider', () => {
      render(<ComponentWithoutProvider />);
      
      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'useToast must be used within a ToastProvider'
      );
    });

    test('deve fornecer funções showToast e removeToast', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      expect(screen.getByTestId('show-success')).toBeInTheDocument();
      expect(screen.getByTestId('remove-toast')).toBeInTheDocument();
    });
  });

  describe('showToast function', () => {
    test('deve mostrar toast de sucesso', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-success').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Sucesso!');
    });

    test('deve mostrar toast de erro', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-error').click();
      });

      expect(screen.getByTestId('toast-error')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Erro!');
    });

    test('deve mostrar toast de aviso', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-warning').click();
      });

      expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Aviso!');
    });

    test('deve mostrar toast de informação', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-info').click();
      });

      expect(screen.getByTestId('toast-info')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Informação!');
    });

    test('deve usar tipo "success" como padrão', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-default').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-message')).toHaveTextContent('Mensagem padrão');
    });

    test('deve mostrar múltiplos toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      act(() => {
        screen.getByTestId('show-success').click();
      });

      act(() => {
        screen.getByTestId('show-error').click();
      });

      act(() => {
        screen.getByTestId('show-warning').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-error')).toBeInTheDocument();
      expect(screen.getByTestId('toast-warning')).toBeInTheDocument();
    });
  });

  describe('removeToast function', () => {
    test('deve remover toast ao clicar no botão de fechar', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Mostrar toast
      act(() => {
        screen.getByTestId('show-success').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();

      // Remover toast
      act(() => {
        screen.getByTestId('toast-close').click();
      });

      expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
    });

    test('deve permitir remoção manual de toasts', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Mostrar toast
      act(() => {
        screen.getByTestId('show-success').click();
      });

      // Verificar se toast existe
      const initialMessages = screen.getAllByTestId('toast-message');
      expect(initialMessages).toHaveLength(1);
      expect(initialMessages[0]).toHaveTextContent('Sucesso!');

      // Remover toast
      const closeButton = screen.getByTestId('toast-close');
      
      act(() => {
        closeButton.click();
      });

      // Toast deve ter sido removido
      expect(screen.queryAllByTestId('toast-message')).toHaveLength(0);
    });
  });

  describe('Auto-removal de toasts', () => {
    test('deve remover toast automaticamente após 3 segundos', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Mostrar toast
      act(() => {
        screen.getByTestId('show-success').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();

      // Avançar o tempo por 3 segundos
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
      });
    });

    test('deve remover múltiplos toasts após 3 segundos cada', async () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Mostrar primeiro toast
      act(() => {
        screen.getByTestId('show-success').click();
      });

      // Avançar 1 segundo e mostrar segundo toast
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      act(() => {
        screen.getByTestId('show-error').click();
      });

      expect(screen.getByTestId('toast-success')).toBeInTheDocument();
      expect(screen.getByTestId('toast-error')).toBeInTheDocument();

      // Avançar mais 2 segundos (total 3 segundos para o primeiro)
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('toast-success')).not.toBeInTheDocument();
        expect(screen.getByTestId('toast-error')).toBeInTheDocument();
      });

      // Avançar mais 1 segundo (total 3 segundos para o segundo)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.queryByTestId('toast-error')).not.toBeInTheDocument();
      });
    });
  });

  describe('IDs únicos', () => {
    test('deve gerar múltiplos toasts com IDs diferentes', () => {
      render(
        <ToastProvider>
          <TestComponent />
        </ToastProvider>
      );

      // Mostrar múltiplos toasts rapidamente
      act(() => {
        screen.getByTestId('show-success').click();
        screen.getByTestId('show-error').click();
        screen.getByTestId('show-warning').click();
      });

      // Verificar se múltiplos toasts são renderizados
      const toasts = screen.getAllByTestId(/^toast-/);
      expect(toasts.length).toBeGreaterThan(1);
      
      // Verificar se cada toast tem uma mensagem diferente
      const messages = screen.getAllByTestId('toast-message');
      const messageTexts = messages.map(el => el.textContent);
      const uniqueMessages = [...new Set(messageTexts)];
      expect(uniqueMessages.length).toBe(messageTexts.length);
    });
  });

  describe('Estado do contexto', () => {
    test('deve manter estado correto dos toasts', () => {
      const TestToastState = () => {
        const { showToast } = useToast();
        const [toastCount, setToastCount] = React.useState(0);

        React.useEffect(() => {
          const container = document.querySelector('.toast-container');
          if (container) {
            setToastCount(container.children.length);
          }
        });

        return (
          <div>
            <button onClick={() => showToast('Test', 'success')}>
              Add Toast
            </button>
            <div data-testid="toast-count">{toastCount}</div>
          </div>
        );
      };

      render(
        <ToastProvider>
          <TestToastState />
        </ToastProvider>
      );

      // Inicialmente sem toasts
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      // Adicionar toast
      act(() => {
        screen.getByText('Add Toast').click();
      });

      // Deve ter 1 toast
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
    });
  });
});