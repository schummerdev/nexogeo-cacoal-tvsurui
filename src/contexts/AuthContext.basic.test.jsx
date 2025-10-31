// src/contexts/AuthContext.basic.test.jsx - Testes básicos para o contexto de autenticação
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';

// Mock dos serviços
jest.mock('../services/authService', () => ({
  login: jest.fn(),
  logout: jest.fn()
}));

// Componente de teste simples
const TestComponent = () => {
  const auth = useAuth();
  
  if (!auth) {
    return <div>Loading...</div>;
  }

  const {
    user,
    isLoggedIn,
    loading,
    getUserRole,
    isUserAdmin
  } = auth;

  return (
    <div>
      <div data-testid="user-data">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="is-logged-in">{isLoggedIn.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user-role">{getUserRole ? getUserRole() : 'no-role'}</div>
      <div data-testid="is-admin">{isUserAdmin ? isUserAdmin().toString() : 'false'}</div>
    </div>
  );
};

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

const renderWithAuth = (ui) => {
  return render(
    <BrowserRouter>
      <AuthProvider>{ui}</AuthProvider>
    </BrowserRouter>
  );
};

describe('AuthContext - Testes Básicos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('deve inicializar com usuário não logado', async () => {
    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-data')).toHaveTextContent('null');
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
    expect(screen.getByTestId('user-role')).toHaveTextContent('guest');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  test('deve carregar usuário admin do localStorage', async () => {
    const mockUserData = {
      id: 1,
      nome: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'mock-token';
      if (key === 'userData') return JSON.stringify(mockUserData);
      return null;
    });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUserData));
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('user-role')).toHaveTextContent('admin');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
  });

  test('deve carregar usuário moderator do localStorage', async () => {
    const mockUserData = {
      id: 2,
      nome: 'Moderator User',
      email: 'mod@example.com',
      role: 'moderator'
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'mod-token';
      if (key === 'userData') return JSON.stringify(mockUserData);
      return null;
    });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUserData));
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('user-role')).toHaveTextContent('moderator');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });

  test('deve carregar usuário viewer do localStorage', async () => {
    const mockUserData = {
      id: 4,
      nome: 'Viewer User',
      email: 'viewer@example.com',
      role: 'viewer'
    };

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'authToken') return 'viewer-token';
      if (key === 'userData') return JSON.stringify(mockUserData);
      return null;
    });

    renderWithAuth(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('user-data')).toHaveTextContent(JSON.stringify(mockUserData));
    expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
    expect(screen.getByTestId('user-role')).toHaveTextContent('viewer');
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
  });
});