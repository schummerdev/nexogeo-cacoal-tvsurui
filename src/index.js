import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { register } from './utils/serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker TEMPORARIAMENTE DESABILITADO
// Causa: Cache corrompido impedindo carregamento do bundle
// TODO: Reabilitar após corrigir bundle no Vercel

/*
register({
  onUpdate: (registration) => {
    console.log('🔄 Nova versão disponível! Será aplicada na próxima visita.');

    // Opcional: Mostrar notificação para o usuário sobre atualização
    if (window.confirm('Nova versão disponível! Deseja atualizar agora?')) {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  },
  onSuccess: (registration) => {
    console.log('✅ Service Worker instalado! App pronto para uso offline.');
  }
});
*/