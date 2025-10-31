import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Importar estilos globais responsivos
import './index.css';

// Importar contextos
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';

// Importar componentes críticos (carregados imediatamente)
import { LoadingSpinner } from './components/LoadingComponents';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout/DashboardLayout';

// Lazy loading das páginas (carregadas sob demanda)
const CapturaForm = React.lazy(() => import('./components/CapturaForm/CapturaForm'));
const SucessoPage = React.lazy(() => import('./pages/SucessoPage'));
const LoginForm = React.lazy(() => import('./components/LoginForm/LoginForm'));
const DashboardHomePage = React.lazy(() => import('./pages/DashboardHomePage'));
const PromocoesPage = React.lazy(() => import('./pages/PromocoesPage'));
const ParticipantesPage = React.lazy(() => import('./pages/ParticipantesPage'));
const GeradorLinksPage = React.lazy(() => import('./pages/GeradorLinksPage'));
const SorteioPage = React.lazy(() => import('./pages/SorteioPage'));
const SorteioPublicoPage = React.lazy(() => import('./pages/SorteioPublicoPage'));
const ConfiguracoesPage = React.lazy(() => import('./pages/ConfiguracoesPage'));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage'));
const MapasPage = React.lazy(() => import('./pages/MapasPage'));
const MapaParticipantesPage = React.lazy(() => import('./pages/MapaParticipantesPage'));
const CaixaMisteriosaPage = React.lazy(() => import('./pages/CaixaMisteriosaPage'));
const CaixaMisteriosaPub = React.lazy(() => import('./pages/CaixaMisteriosaPub'));
const CaixaMisteriosaSorteioPage = React.lazy(() => import('./pages/CaixaMisteriosaSorteioPage'));
const DemoPage = React.lazy(() => import('./pages/DemoPage'));

// Importar hook de autenticação
import { useAuth } from './contexts/AuthContext';

// Componente de loading para lazy loading
const PageLoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'var(--color-background)'
  }}>
    <LoadingSpinner message="Carregando página..." />
  </div>
);

// Componente para proteger rotas (mantendo para compatibilidade)
const PrivateRoute = ({ children }) => {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <Suspense fallback={<PageLoadingSpinner />}>
              <Routes>
                {/* Rotas Públicas */}
                <Route path="/participar" element={<CapturaForm />} />
                <Route path="/sucesso" element={<SucessoPage />} />
                <Route path="/sorteio-publico" element={<SorteioPublicoPage />} />
                <Route path="/caixa-misteriosa-pub" element={<CaixaMisteriosaPub />} />
                <Route path="/caixa-misteriosa-pub/:gameId" element={<CaixaMisteriosaPub />} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/login" element={<LoginForm />} />

                {/* Rotas para Janelas Externas (sem layout) */}
                <Route path="/external/mapas" element={
                  <PrivateRoute>
                    <Suspense fallback={<LoadingSpinner message="Carregando mapa externo..." />}>
                      <MapasPage />
                    </Suspense>
                  </PrivateRoute>
                } />
                <Route path="/external/chart" element={
                  <PrivateRoute>
                    <Suspense fallback={<LoadingSpinner message="Carregando gráfico externo..." />}>
                      <DashboardHomePage />
                    </Suspense>
                  </PrivateRoute>
                } />

                {/* Rotas Privadas (dentro do Layout do Dashboard) */}
                <Route
                  path="/dashboard"
                  element={
                    <PrivateRoute>
                      <DashboardLayout />
                    </PrivateRoute>
                  }
                >
                  {/* A rota "index" é a padrão para /dashboard */}
                  <Route index element={
                    <Suspense fallback={<LoadingSpinner message="Carregando dashboard..." />}>
                      <DashboardHomePage />
                    </Suspense>
                  } />
                  <Route path="promocoes" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando promoções..." />}>
                      <PromocoesPage />
                    </Suspense>
                  } />
                  <Route path="participantes" element={
                    <ProtectedRoute requireAnyRole={['admin', 'moderator', 'editor', 'viewer']}>
                      <Suspense fallback={<LoadingSpinner message="Carregando participantes..." />}>
                        <ParticipantesPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="gerador-links" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando gerador..." />}>
                      <GeradorLinksPage />
                    </Suspense>
                  } />
                  <Route path="sorteio" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando sorteio..." />}>
                      <SorteioPage />
                    </Suspense>
                  } />
                  <Route path="configuracoes" element={
                    <ProtectedRoute requireRole="admin" showAccessDenied={true}>
                      <Suspense fallback={<LoadingSpinner message="Carregando configurações..." />}>
                        <ConfiguracoesPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="audit-logs" element={
                    <ProtectedRoute requireRole="admin" showAccessDenied={true}>
                      <Suspense fallback={<LoadingSpinner message="Carregando logs de auditoria..." />}>
                        <AuditLogsPage />
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  <Route path="mapas" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando mapas..." />}>
                      <MapasPage />
                    </Suspense>
                  } />
                  <Route path="mapa-participantes" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando origem dos links..." />}>
                      <MapaParticipantesPage />
                    </Suspense>
                  } />
                  <Route path="caixa-misteriosa" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando Caixa Misteriosa..." />}>
                      <CaixaMisteriosaPage />
                    </Suspense>
                  } />
                  <Route path="caixa-misteriosa/sorteio" element={
                    <Suspense fallback={<LoadingSpinner message="Carregando Sorteio..." />}>
                      <CaixaMisteriosaSorteioPage />
                    </Suspense>
                  } />
                </Route>

                {/* Rota padrão para redirecionar para o login ou dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 