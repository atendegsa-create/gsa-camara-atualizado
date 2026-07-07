import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Registro do Service Worker do PWA e Notificações Push
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('🚀 PWA Service Worker registrado com sucesso:', registration.scope);
        
        // Solicita permissão para notificações nativas
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            console.log('🔔 Permissão de notificação concedida pelo usuário.');
            // Aqui futuramente salvaremos o token de push (endpoint) no Firestore do usuário
          }
        });
      })
      .catch(err => {
        console.error('❌ Falha ao registrar Service Worker do PWA:', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

