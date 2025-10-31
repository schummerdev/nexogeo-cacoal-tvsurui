// src/utils/lazyLoader.js - Utilitário para lazy loading de componentes
import React, { Suspense } from 'react';
import { LoadingSpinner } from '../components/LoadingComponents';

// Wrapper genérico para lazy loading com loading personalizado
export const withLazyLoading = (importFunc, fallbackMessage = 'Carregando componente...') => {
  const LazyComponent = React.lazy(importFunc);

  return (props) => (
    <Suspense fallback={<LoadingSpinner message={fallbackMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Wrapper para lazy loading de modais
export const withModalLazyLoading = (importFunc, fallbackMessage = 'Carregando modal...') => {
  const LazyModal = React.lazy(importFunc);

  return (props) => (
    <Suspense fallback={
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: 'var(--color-surface)',
          padding: '2rem',
          borderRadius: '12px',
          minWidth: '300px',
          textAlign: 'center'
        }}>
          <LoadingSpinner message={fallbackMessage} />
        </div>
      </div>
    }>
      <LazyModal {...props} />
    </Suspense>
  );
};

// Wrapper para lazy loading de charts
export const withChartLazyLoading = (importFunc, fallbackMessage = 'Carregando gráfico...') => {
  const LazyChart = React.lazy(importFunc);

  return (props) => (
    <Suspense fallback={
      <div style={{
        height: props.height || '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)'
      }}>
        <LoadingSpinner message={fallbackMessage} />
      </div>
    }>
      <LazyChart {...props} />
    </Suspense>
  );
};

// Wrapper para lazy loading de mapas
export const withMapLazyLoading = (importFunc, fallbackMessage = 'Carregando mapa...') => {
  const LazyMap = React.lazy(importFunc);

  return (props) => (
    <Suspense fallback={
      <div style={{
        height: props.height || '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface)',
        borderRadius: '8px',
        border: '1px solid var(--color-border)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        }}>
          <LoadingSpinner message={fallbackMessage} />
        </div>
      </div>
    }>
      <LazyMap {...props} />
    </Suspense>
  );
};

// Lazy loading com retry para componentes que podem falhar
export const withRetryLazyLoading = (importFunc, fallbackMessage = 'Carregando...', maxRetries = 3) => {
  let retryCount = 0;

  const LazyComponent = React.lazy(() =>
    importFunc().catch(error => {
      console.warn(`Erro ao carregar componente (tentativa ${retryCount + 1}/${maxRetries}):`, error);

      if (retryCount < maxRetries - 1) {
        retryCount++;
        // Retry após delay exponencial
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(importFunc());
          }, Math.pow(2, retryCount) * 1000);
        });
      }

      throw error;
    })
  );

  return (props) => (
    <Suspense fallback={<LoadingSpinner message={fallbackMessage} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Preload de componente (carrega em background sem renderizar)
export const preloadComponent = (importFunc) => {
  const componentImport = importFunc();
  return componentImport;
};

// Hook para preload condicional baseado em interação do usuário
export const usePreloadOnHover = (importFunc) => {
  const preload = React.useCallback(() => {
    preloadComponent(importFunc);
  }, [importFunc]);

  return {
    onMouseEnter: preload,
    onFocus: preload
  };
};