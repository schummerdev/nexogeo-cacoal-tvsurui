// src/__tests__/testUtils.jsx - Utilitários para testes
import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';

// Mock do AuthContext para testes
export const MockAuthProvider = ({ children, mockUser = null, mockRole = 'admin' }) => {
  const mockAuthValue = {
    user: mockUser || { 
      id: 1, 
      nome: 'Test User', 
      email: 'test@example.com', 
      role: mockRole 
    },
    isLoggedIn: !!mockUser,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
    getUserRole: () => mockRole,
    isUserAdmin: () => mockRole === 'admin',
    canCreatePromotion: () => ['admin', 'moderator'].includes(mockRole),
    canEditPromotion: () => ['admin', 'moderator', 'editor'].includes(mockRole),
    canDeletePromotion: () => ['admin'].includes(mockRole),
    canViewParticipants: () => ['admin', 'moderator', 'editor', 'viewer'].includes(mockRole),
    canPerformDraw: () => ['admin', 'moderator'].includes(mockRole),
    canExportData: () => ['admin', 'moderator', 'editor'].includes(mockRole),
    canViewReports: () => ['admin', 'moderator', 'editor', 'viewer'].includes(mockRole),
    canManageUsers: () => ['admin'].includes(mockRole),
    hasAnyRole: (roles) => roles.includes(mockRole),
    canAccessAuditLogs: () => ['admin'].includes(mockRole)
  };

  return (
    <div data-testid="mock-auth-provider">
      {React.cloneElement(children, { ...mockAuthValue })}
    </div>
  );
};

// Mock do ToastContext para testes
export const MockToastProvider = ({ children }) => {
  const mockToastValue = {
    showToast: jest.fn(),
    toasts: []
  };

  return (
    <div data-testid="mock-toast-provider">
      {React.cloneElement(children, mockToastValue)}
    </div>
  );
};

// Wrapper completo para testes
export const TestWrapper = ({ 
  children, 
  mockUser = null, 
  mockRole = 'admin',
  includeRouter = true,
  includeAuth = true,
  includeToast = true 
}) => {
  let wrapper = children;

  if (includeToast) {
    wrapper = <MockToastProvider>{wrapper}</MockToastProvider>;
  }

  if (includeAuth) {
    wrapper = (
      <MockAuthProvider mockUser={mockUser} mockRole={mockRole}>
        {wrapper}
      </MockAuthProvider>
    );
  }

  if (includeRouter) {
    wrapper = <BrowserRouter>{wrapper}</BrowserRouter>;
  }

  return wrapper;
};

// Função de render customizada com providers
export const renderWithProviders = (
  ui, 
  {
    mockUser = null,
    mockRole = 'admin',
    includeRouter = true,
    includeAuth = true,
    includeToast = true,
    ...renderOptions
  } = {}
) => {
  const Wrapper = ({ children }) => (
    <TestWrapper
      mockUser={mockUser}
      mockRole={mockRole}
      includeRouter={includeRouter}
      includeAuth={includeAuth}
      includeToast={includeToast}
    >
      {children}
    </TestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Wrapper mais simples apenas com AuthProvider real
export const AuthTestWrapper = ({ children, initialUser = null }) => {
  const mockLocalStorage = {
    getItem: jest.fn((key) => {
      if (key === 'authToken') return initialUser ? 'mock-token' : null;
      if (key === 'userData') return initialUser ? JSON.stringify(initialUser) : null;
      return null;
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export const renderWithAuth = (ui, { initialUser = null, ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <AuthTestWrapper initialUser={initialUser}>
      {children}
    </AuthTestWrapper>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

export default {
  MockAuthProvider,
  MockToastProvider,  
  TestWrapper,
  renderWithProviders,
  AuthTestWrapper,
  renderWithAuth
};