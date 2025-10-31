// src/components/LazyComponents.jsx - Componentes com lazy loading
import {
  withChartLazyLoading,
  withMapLazyLoading,
  withModalLazyLoading,
  withLazyLoading
} from '../utils/lazyLoader';

// === CHARTS ===
export const LazyModernChart = withChartLazyLoading(
  () => import('./Dashboard/ModernChart'),
  'Carregando gráficos modernos...'
);

export const LazyOrigemCadastrosChart = withChartLazyLoading(
  () => import('./Dashboard/OrigemCadastrosChart'),
  'Carregando gráfico de origem...'
);

export const LazyParticipacoesPorHoraChart = withChartLazyLoading(
  () => import('./Dashboard/ParticipacoesPorHoraChart'),
  'Carregando gráfico de participações...'
);

// === MAPS ===
export const LazyInteractiveMap = withMapLazyLoading(
  () => import('./Maps/InteractiveMap'),
  'Carregando mapa interativo...'
);

// === MODALS ===
export const LazyEditParticipanteModal = withModalLazyLoading(
  () => import('./EditParticipanteModal'),
  'Carregando editor de participante...'
);

export const LazyConfirmModal = withModalLazyLoading(
  () => import('./DashboardLayout/ConfirmModal'),
  'Carregando modal de confirmação...'
);

// === FORMS ===
export const LazyCapturaForm = withLazyLoading(
  () => import('./CapturaForm/CapturaForm'),
  'Carregando formulário de captura...'
);

// === THEME SELECTOR ===
export const LazyThemeSelector = withLazyLoading(
  () => import('./ThemeSelector/ThemeSelector'),
  'Carregando seletor de tema...'
);

// === TOASTS ===
export const LazyToast = withLazyLoading(
  () => import('./Toast/Toast'),
  'Carregando notificação...'
);

// Export default com todos os componentes lazy
export default {
  LazyModernChart,
  LazyOrigemCadastrosChart,
  LazyParticipacoesPorHoraChart,
  LazyInteractiveMap,
  LazyEditParticipanteModal,
  LazyConfirmModal,
  LazyCapturaForm,
  LazyThemeSelector,
  LazyToast
};