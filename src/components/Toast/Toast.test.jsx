import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Toast from './Toast';

// Mock do setTimeout e clearTimeout
jest.useFakeTimers();

describe('Toast', () => {
  const defaultProps = {
    message: 'Test message',
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Renderização básica', () => {
    test('deve renderizar toast com mensagem', () => {
      render(<Toast {...defaultProps} />);
      
      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByText('Sucesso!')).toBeInTheDocument(); // título padrão
      expect(screen.getByText('✅')).toBeInTheDocument(); // ícone padrão
    });

    test('deve renderizar com tipo success por padrão', () => {
      render(<Toast {...defaultProps} />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-success');
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Sucesso!')).toBeInTheDocument();
    });

    test('deve renderizar botão de fechar por padrão', () => {
      render(<Toast {...defaultProps} />);
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('×');
    });
  });

  describe('Tipos de toast', () => {
    test('deve renderizar toast de sucesso', () => {
      render(<Toast {...defaultProps} type="success" />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-success');
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('Sucesso!')).toBeInTheDocument();
    });

    test('deve renderizar toast de erro', () => {
      render(<Toast {...defaultProps} type="error" />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-error');
      expect(screen.getByText('❌')).toBeInTheDocument();
      expect(screen.getByText('Erro!')).toBeInTheDocument();
    });

    test('deve renderizar toast de aviso', () => {
      render(<Toast {...defaultProps} type="warning" />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-warning');
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('Atenção!')).toBeInTheDocument();
    });

    test('deve renderizar toast de informação', () => {
      render(<Toast {...defaultProps} type="info" />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-info');
      expect(screen.getByText('ℹ️')).toBeInTheDocument();
      expect(screen.getByText('Informação')).toBeInTheDocument();
    });

    test('deve usar tipo success para tipo inválido', () => {
      render(<Toast {...defaultProps} type="invalid" />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toHaveClass('toast-success');
      expect(screen.getByText('📄')).toBeInTheDocument(); // ícone padrão para tipo inválido
      expect(screen.getByText('Notificação')).toBeInTheDocument(); // título padrão para tipo inválido
    });
  });

  describe('Título customizado', () => {
    test('deve renderizar título customizado quando fornecido', () => {
      render(<Toast {...defaultProps} title="Título Customizado" />);
      
      expect(screen.getByText('Título Customizado')).toBeInTheDocument();
      expect(screen.queryByText('Sucesso!')).not.toBeInTheDocument();
    });

    test('deve usar título padrão quando não fornecido', () => {
      render(<Toast {...defaultProps} type="error" />);
      
      expect(screen.getByText('Erro!')).toBeInTheDocument();
    });
  });

  describe('Funcionalidade de fechar', () => {
    test('deve chamar onClose quando botão de fechar é clicado', () => {
      const mockOnClose = jest.fn();
      render(<Toast {...defaultProps} onClose={mockOnClose} />);
      
      const closeButton = screen.getByRole('button');
      closeButton.click();
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('deve esconder botão de fechar quando closable é false', () => {
      render(<Toast {...defaultProps} closable={false} />);
      
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('deve mostrar botão de fechar quando closable é true', () => {
      render(<Toast {...defaultProps} closable={true} />);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Auto-close com duration', () => {
    test('deve chamar onClose automaticamente após duration padrão (4000ms)', () => {
      const mockOnClose = jest.fn();
      render(<Toast {...defaultProps} onClose={mockOnClose} />);
      
      expect(mockOnClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(4000);
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('deve chamar onClose após duration customizada', () => {
      const mockOnClose = jest.fn();
      render(<Toast {...defaultProps} onClose={mockOnClose} duration={2000} />);
      
      expect(mockOnClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(mockOnClose).not.toHaveBeenCalled();
      
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    test('não deve auto-close quando duration é 0', () => {
      const mockOnClose = jest.fn();
      render(<Toast {...defaultProps} onClose={mockOnClose} duration={0} />);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('não deve auto-close quando duration é negativa', () => {
      const mockOnClose = jest.fn();
      render(<Toast {...defaultProps} onClose={mockOnClose} duration={-1000} />);
      
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup de timer', () => {
    test('deve limpar timer quando componente é desmontado', () => {
      const mockOnClose = jest.fn();
      const { unmount } = render(<Toast {...defaultProps} onClose={mockOnClose} duration={2000} />);
      
      // Desmontar antes do timer completar
      unmount();
      
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      // onClose não deve ser chamado após unmount
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    test('deve limpar timer anterior quando duration muda', () => {
      const mockOnClose = jest.fn();
      const { rerender } = render(<Toast {...defaultProps} onClose={mockOnClose} duration={5000} />);
      
      // Avançar parcialmente
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      // Mudar duration
      rerender(<Toast {...defaultProps} onClose={mockOnClose} duration={1000} />);
      
      // Timer antigo deve ter sido limpo, novo timer deve estar ativo
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Estrutura HTML e CSS', () => {
    test('deve ter estrutura HTML correta', () => {
      render(<Toast {...defaultProps} />);
      
      const toast = document.querySelector('.toast');
      expect(toast).toBeInTheDocument();
      
      const icon = document.querySelector('.toast-icon');
      expect(icon).toBeInTheDocument();
      
      const body = document.querySelector('.toast-body');
      expect(body).toBeInTheDocument();
      
      const title = document.querySelector('.toast-title');
      expect(title).toBeInTheDocument();
      
      const message = document.querySelector('.toast-message');
      expect(message).toBeInTheDocument();
      
      const closeBtn = document.querySelector('.toast-close');
      expect(closeBtn).toBeInTheDocument();
    });

    test('deve aplicar classes CSS corretas para cada tipo', () => {
      const types = ['success', 'error', 'warning', 'info'];
      
      types.forEach(type => {
        const { unmount } = render(<Toast {...defaultProps} type={type} />);
        
        const toast = document.querySelector('.toast');
        expect(toast).toHaveClass(`toast-${type}`);
        
        unmount();
      });
    });
  });

  describe('Acessibilidade', () => {
    test('botão de fechar deve ter função de botão', () => {
      render(<Toast {...defaultProps} />);
      
      const closeButton = screen.getByRole('button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveClass('toast-close');
    });

    test('deve ter conteúdo textual legível', () => {
      render(<Toast {...defaultProps} message="Mensagem importante" title="Título importante" />);
      
      expect(screen.getByText('Título importante')).toBeInTheDocument();
      expect(screen.getByText('Mensagem importante')).toBeInTheDocument();
    });
  });

  describe('Casos extremos', () => {
    test('deve funcionar com mensagem vazia', () => {
      render(<Toast {...defaultProps} message="" />);
      
      const message = document.querySelector('.toast-message');
      expect(message).toBeInTheDocument();
      expect(message).toHaveTextContent('');
    });

    test('deve funcionar com título vazio', () => {
      render(<Toast {...defaultProps} title="" />);
      
      const title = document.querySelector('.toast-title');
      expect(title).toBeInTheDocument();
      // Quando title é string vazia, o componente usa o título padrão
      expect(title).toHaveTextContent('Sucesso!');
    });

    test('deve funcionar sem onClose', () => {
      expect(() => {
        render(<Toast message="Test" />);
      }).not.toThrow();
      
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    test('deve lidar com onClose undefined durante auto-close', () => {
      const { rerender } = render(<Toast {...defaultProps} duration={1000} />);
      
      // Remover onClose
      rerender(<Toast message="Test" duration={1000} />);
      
      // Não deve lançar erro quando timer dispara (não deveria haver timer)
      expect(() => {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }).not.toThrow();
    });
  });

  describe('Props obrigatórias vs opcionais', () => {
    test('deve funcionar apenas com message', () => {
      render(<Toast message="Apenas mensagem" />);
      
      expect(screen.getByText('Apenas mensagem')).toBeInTheDocument();
      expect(screen.getByText('Sucesso!')).toBeInTheDocument(); // título padrão
    });

    test('deve funcionar com todas as props', () => {
      const mockOnClose = jest.fn();
      render(
        <Toast 
          message="Mensagem completa"
          type="warning"
          title="Título completo"
          onClose={mockOnClose}
          closable={true}
          duration={3000}
        />
      );
      
      expect(screen.getByText('Mensagem completa')).toBeInTheDocument();
      expect(screen.getByText('Título completo')).toBeInTheDocument();
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});