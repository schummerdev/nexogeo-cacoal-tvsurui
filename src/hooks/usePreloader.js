// src/hooks/usePreloader.js - Hook para preload inteligente
import React, { useEffect, useCallback, useState } from 'react';

// Lista de componentes críticos para preload baseado no role
const PRELOAD_COMPONENTS = {
  admin: [
    () => import('../pages/ConfiguracoesPage'),
    () => import('../pages/AdminDashboardPage'),
    () => import('../pages/AuditLogsPage'),
    () => import('../components/Maps/InteractiveMap'),
    () => import('../components/Dashboard/ModernChart')
  ],
  moderator: [
    () => import('../pages/ModeratorDashboardPage'),
    () => import('../pages/SorteioPage'),
    () => import('../pages/PromocoesPage'),
    () => import('../components/Maps/InteractiveMap')
  ],
  editor: [
    () => import('../pages/UserDashboardPage'),
    () => import('../pages/PromocoesPage'),
    () => import('../pages/ParticipantesPage')
  ],
  viewer: [
    () => import('../pages/ViewerDashboardPage'),
    () => import('../pages/MapasPage'),
    () => import('../components/Dashboard/ModernChart')
  ]
};

// Hook principal para preload inteligente
export const usePreloader = () => {
  // Implementação simplificada para evitar dependência circular
  const [preloadStatus, setPreloadStatus] = useState({
    completed: [],
    failed: [],
    inProgress: []
  });

  // Retorna status padrão sem dependência do AuthContext
  return { preloadStatus };
};

// Hook para preload de componente específico
export const useComponentPreload = (componentImport, shouldPreload = true) => {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState(null);

  const preload = useCallback(async () => {
    if (isPreloaded || isPreloading) return;

    setIsPreloading(true);
    setPreloadError(null);

    try {
      await componentImport();
      setIsPreloaded(true);
      console.log('✅ Componente precarregado com sucesso');
    } catch (error) {
      setPreloadError(error);
      console.warn('❌ Erro no preload do componente:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [componentImport, isPreloaded, isPreloading]);

  useEffect(() => {
    if (shouldPreload) {
      preload();
    }
  }, [shouldPreload, preload]);

  return {
    isPreloaded,
    isPreloading,
    preloadError,
    preload
  };
};

// Hook para preload baseado em interação (hover/focus)
export const useInteractionPreload = (componentImport) => {
  const { preload } = useComponentPreload(componentImport, false);

  const handlers = {
    onMouseEnter: preload,
    onFocus: preload
  };

  return handlers;
};

// Hook para preload baseado em visibilidade (Intersection Observer)
export const useVisibilityPreload = (componentImport, threshold = 0.1) => {
  const [ref, setRef] = useState(null);
  const { preload } = useComponentPreload(componentImport, false);

  useEffect(() => {
    if (!ref || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            preload();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    observer.observe(ref);

    return () => {
      if (ref) observer.unobserve(ref);
    };
  }, [ref, preload, threshold]);

  return setRef;
};

// Hook para preload baseado em tempo (delay)
export const useDelayedPreload = (componentImport, delay = 3000) => {
  const { preload } = useComponentPreload(componentImport, false);

  useEffect(() => {
    const timer = setTimeout(preload, delay);
    return () => clearTimeout(timer);
  }, [preload, delay]);
};

export default {
  usePreloader,
  useComponentPreload,
  useInteractionPreload,
  useVisibilityPreload,
  useDelayedPreload
};