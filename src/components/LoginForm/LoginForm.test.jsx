import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import LoginForm from './LoginForm';
import { login } from '../../services/authService';
import { renderWithAuth } from '../../__tests__/testUtils';

// Mock do authService
jest.mock('../../services/authService');
const mockLogin = login;

// Mock do useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

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

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockClear();
  });

  describe('Renderização', () => {
    test('deve renderizar o formulário de login corretamente', () => {
      renderWithAuth(<LoginForm />);

      expect(screen.getByText('🎯 NexoGeo')).toBeInTheDocument();
      expect(screen.getByText('Painel de Controle')).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    });

    test('deve renderizar campos de input com atributos corretos', () => {
      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');

      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
      expect(senhaInput).toHaveAttribute('type', 'password');
      expect(senhaInput).toHaveAttribute('required');
    });
  });

  describe('Interações do usuário', () => {
    test('deve permitir digitar email e senha', () => {
      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });

      expect(emailInput).toHaveValue('test@example.com');
      expect(senhaInput).toHaveValue('password123');
    });

    test('deve submeter o formulário com dados válidos', async () => {
      const mockUserData = {
        token: 'mock-jwt-token',
        user: { id: 1, email: 'test@example.com', nome: 'Test User' }
      };

      mockLogin.mockResolvedValueOnce(mockUserData);

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button', { name: 'Entrar' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'mock-jwt-token');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUserData.user));
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });

  describe('Estados de loading', () => {
    test('deve mostrar estado de loading durante o login', async () => {
      // Mock que demora para resolver
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button', { name: 'Entrar' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Durante o loading
      expect(screen.getByText('Entrando...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    test('deve desabilitar botão durante loading', async () => {
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Tratamento de erros', () => {
    test('deve exibir mensagem de erro quando login falha', async () => {
      const errorMessage = 'Credenciais inválidas';
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button', { name: 'Entrar' });

      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toHaveClass('error-message');
      });

      // Botão deve voltar ao estado normal
      expect(submitButton).not.toBeDisabled();
      expect(screen.getByText('Entrar')).toBeInTheDocument();
    });

    test('deve limpar mensagem de erro ao tentar novo login', async () => {
      const errorMessage = 'Credenciais inválidas';
      mockLogin.mockRejectedValueOnce(new Error(errorMessage));

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button');

      // Primeiro login com erro
      fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'wrongpassword' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Segundo login deve limpar erro
      mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      fireEvent.change(emailInput, { target: { value: 'correct@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'correctpassword' } });
      fireEvent.click(submitButton);

      // Mensagem de erro deve sumir
      expect(screen.queryByText(errorMessage)).not.toBeInTheDocument();
    });
  });

  describe('Validação de formulário', () => {
    test('deve usar validação HTML5 para email', () => {
      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    test('deve usar validação HTML5 para senha', () => {
      renderWithAuth(<LoginForm />);

      const senhaInput = screen.getByLabelText('Senha');
      expect(senhaInput).toHaveAttribute('type', 'password');
      expect(senhaInput).toHaveAttribute('required');
    });

    test('deve submeter formulário com Enter', async () => {
      const mockUserData = {
        token: 'mock-jwt-token',
        user: { id: 1, email: 'test@example.com' }
      };

      mockLogin.mockResolvedValueOnce(mockUserData);

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const form = emailInput.closest('form');

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.submit(form);

      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  describe('Acessibilidade', () => {
    test('deve ter labels associados aos inputs', () => {
      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(senhaInput).toHaveAttribute('id', 'senha');
    });

    test('deve ter estrutura semântica adequada', () => {
      renderWithAuth(<LoginForm />);

      expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
      expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
      expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    });
  });

  describe('Integração com localStorage', () => {
    test('deve salvar token e dados do usuário no localStorage após login bem-sucedido', async () => {
      const mockUserData = {
        token: 'jwt-token-123',
        user: { id: 1, email: 'user@example.com', nome: 'João Silva' }
      };

      mockLogin.mockResolvedValueOnce(mockUserData);

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button', { name: 'Entrar' });

      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'jwt-token-123');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUserData.user));
      });
    });
  });

  describe('Navegação', () => {
    test('deve navegar para dashboard após login bem-sucedido', async () => {
      const mockUserData = {
        token: 'mock-token',
        user: { id: 1, email: 'test@example.com' }
      };

      mockLogin.mockResolvedValueOnce(mockUserData);

      renderWithAuth(<LoginForm />);

      const emailInput = screen.getByLabelText('E-mail');
      const senhaInput = screen.getByLabelText('Senha');
      const submitButton = screen.getByRole('button', { name: 'Entrar' });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(senhaInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});