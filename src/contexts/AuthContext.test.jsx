// src/contexts/AuthContext.test.jsx - Testes para o contexto de autenticação
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { login, logout } from '../services/authService';

// Mock dos serviços
jest.mock('../services/authService');
const mockLogin = login;
const mockLogout = logout;

// Componente de teste para usar o hook
const TestComponent = () => {
  const {
    user,
    isLoggedIn,
    login: authLogin,
    logout: authLogout,
    loading,
    getUserRole,
    isUserAdmin,
    canCreatePromotion,
    canEditPromotion,
    canDeletePromotion,
    canViewParticipants,
    canPerformDraw,
    canExportData,
    canViewReports,
    canManageUsers,
    hasAnyRole,
    canAccessAuditLogs
  } = useAuth();

  return (
    <div>
      <div data-testid="user-data">{JSON.stringify(user)}</div>
      <div data-testid="is-logged-in">{isLoggedIn.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user-role">{getUserRole()}</div>
      <div data-testid="is-admin">{isUserAdmin().toString()}</div>
      <div data-testid="can-create-promotion">{canCreatePromotion().toString()}</div>
      <div data-testid="can-edit-promotion">{canEditPromotion().toString()}</div>
      <div data-testid="can-delete-promotion">{canDeletePromotion().toString()}</div>
      <div data-testid="can-view-participants">{canViewParticipants().toString()}</div>
      <div data-testid="can-perform-draw">{canPerformDraw().toString()}</div>
      <div data-testid="can-export-data">{canExportData().toString()}</div>
      <div data-testid="can-view-reports">{canViewReports().toString()}</div>
      <div data-testid="can-manage-users">{canManageUsers().toString()}</div>
      <div data-testid="has-admin-role">{hasAnyRole(['admin']).toString()}</div>
      <div data-testid="can-access-audit">{canAccessAuditLogs().toString()}</div>
      <button onClick={() => authLogin('test@example.com', 'password')}>Login</button>
      <button onClick={authLogout}>Logout</button>
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

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Estado inicial', () => {
    test('deve inicializar com usuário não logado', () => {
      renderWithAuth(<TestComponent />);

      expect(screen.getByTestId('user-data')).toHaveTextContent('null');
      expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('user-role')).toHaveTextContent('guest');
    });

    test('deve carregar usuário do localStorage se existir', async () => {
      const mockUserData = {
        id: 1,
        nome: 'Test User',
        email: 'test@example.com',
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
    });
  });

  describe('Permissões por role - Admin', () => {
    const mockAdminUser = {
      id: 1,
      nome: 'Admin User',
      email: 'admin@example.com',
      role: 'admin'
    };

    beforeEach(async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'admin-token';
        if (key === 'userData') return JSON.stringify(mockAdminUser);
        return null;
      });

      renderWithAuth(<TestComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    test('admin deve ter todas as permissões', () => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('true');
      expect(screen.getByTestId('can-create-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-edit-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-delete-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-view-participants')).toHaveTextContent('true');
      expect(screen.getByTestId('can-perform-draw')).toHaveTextContent('true');
      expect(screen.getByTestId('can-export-data')).toHaveTextContent('true');
      expect(screen.getByTestId('can-view-reports')).toHaveTextContent('true');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('true');
      expect(screen.getByTestId('can-access-audit')).toHaveTextContent('true');
    });
  });

  describe('Permissões por role - Moderator', () => {
    const mockModeratorUser = {
      id: 2,
      nome: 'Moderator User',
      email: 'mod@example.com',
      role: 'moderator'
    };

    beforeEach(async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'mod-token';
        if (key === 'userData') return JSON.stringify(mockModeratorUser);
        return null;
      });

      renderWithAuth(<TestComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    test('moderator deve ter permissões limitadas', () => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('can-create-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-edit-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-delete-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-participants')).toHaveTextContent('true');
      expect(screen.getByTestId('can-perform-draw')).toHaveTextContent('true');
      expect(screen.getByTestId('can-export-data')).toHaveTextContent('true');
      expect(screen.getByTestId('can-view-reports')).toHaveTextContent('true');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
      expect(screen.getByTestId('can-access-audit')).toHaveTextContent('false');
    });
  });

  describe('Permissões por role - Editor', () => {
    const mockEditorUser = {
      id: 3,
      nome: 'Editor User',
      email: 'editor@example.com',
      role: 'editor'
    };

    beforeEach(async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'editor-token';
        if (key === 'userData') return JSON.stringify(mockEditorUser);
        return null;
      });

      renderWithAuth(<TestComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    test('editor deve ter permissões básicas', () => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('can-create-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-edit-promotion')).toHaveTextContent('true');
      expect(screen.getByTestId('can-delete-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-participants')).toHaveTextContent('true');
      expect(screen.getByTestId('can-perform-draw')).toHaveTextContent('false');
      expect(screen.getByTestId('can-export-data')).toHaveTextContent('true');
      expect(screen.getByTestId('can-view-reports')).toHaveTextContent('true');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
    });
  });

  describe('Permissões por role - Viewer', () => {
    const mockViewerUser = {
      id: 4,
      nome: 'Viewer User',
      email: 'viewer@example.com',
      role: 'viewer'
    };

    beforeEach(async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'viewer-token';
        if (key === 'userData') return JSON.stringify(mockViewerUser);
        return null;
      });

      renderWithAuth(<TestComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    test('viewer deve ter apenas permissões de visualização', () => {
      expect(screen.getByTestId('is-admin')).toHaveTextContent('false');
      expect(screen.getByTestId('can-create-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-edit-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-delete-promotion')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-participants')).toHaveTextContent('true');
      expect(screen.getByTestId('can-perform-draw')).toHaveTextContent('false');
      expect(screen.getByTestId('can-export-data')).toHaveTextContent('false');
      expect(screen.getByTestId('can-view-reports')).toHaveTextContent('true');
      expect(screen.getByTestId('can-manage-users')).toHaveTextContent('false');
    });
  });

  describe('Funções de login e logout', () => {
    test('deve fazer login com sucesso', async () => {
      const mockUserData = {
        token: 'jwt-token-123',
        user: { id: 1, nome: 'Test User', email: 'test@example.com', role: 'admin' }
      };

      mockLogin.mockResolvedValueOnce(mockUserData);

      renderWithAuth(<TestComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password');
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'jwt-token-123');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockUserData.user));
      });
    });

    test('deve fazer logout com sucesso', async () => {
      // Primeiro configurar usuário logado
      const mockUserData = {
        id: 1,
        nome: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'mock-token';
        if (key === 'userData') return JSON.stringify(mockUserData);
        return null;
      });

      renderWithAuth(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('authToken');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('userData');
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-logged-in')).toHaveTextContent('false');
        expect(screen.getByTestId('user-data')).toHaveTextContent('null');
      });
    });
  });

  describe('hasAnyRole', () => {
    test('deve verificar se usuário tem algum dos roles especificados', async () => {
      const mockUserData = {
        id: 1,
        nome: 'Moderator User',
        email: 'mod@example.com',
        role: 'moderator'
      };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'authToken') return 'mod-token';
        if (key === 'userData') return JSON.stringify(mockUserData);
        return null;
      });

      const TestRoleComponent = () => {
        const { hasAnyRole } = useAuth();
        return (
          <div>
            <div data-testid="has-admin-mod">{hasAnyRole(['admin', 'moderator']).toString()}</div>
            <div data-testid="has-editor-viewer">{hasAnyRole(['editor', 'viewer']).toString()}</div>
          </div>
        );
      };

      renderWithAuth(<TestRoleComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('has-admin-mod')).toHaveTextContent('true');
        expect(screen.getByTestId('has-editor-viewer')).toHaveTextContent('false');
      });
    });
  });

  describe('Tratamento de erros', () => {
    test('deve tratar erro de login', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Login failed'));

      const TestErrorComponent = () => {
        const { login: authLogin } = useAuth();
        const [error, setError] = React.useState(null);

        const handleLogin = async () => {
          try {
            await authLogin('test@example.com', 'wrong-password');
          } catch (err) {
            setError(err.message);
          }
        };

        return (
          <div>
            <button onClick={handleLogin}>Login</button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      renderWithAuth(<TestErrorComponent />);

      const loginButton = screen.getByText('Login');
      fireEvent.click(loginButton);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });
    });
  });
});