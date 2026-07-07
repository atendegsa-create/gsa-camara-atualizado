// Service Worker da GSA Câmara de Mediação e Arbitragem
// Gerenciamento robusto de notificações push e ciclo de vida do PWA

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escuta os eventos de Notificação Push vindos do Backend da GSA
self.addEventListener('push', function(event) {
  let data = { title: 'GSA Câmara', body: 'Nova atualização disponível.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'GSA Câmara', body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    
    // Configurações de som e feedback físico do aparelho
    sound: '/sounds/notification.mp3', // Caminho do áudio carregado na pasta public
    vibrate: [200, 100, 200, 100, 200], // Padrão de vibração: vibra, para, vibra, para...
    
    // Garante que a notificação apareça como prioridade alta no sistema operacional
    tag: data.tag || 'gsa-alert-default',
    renotify: true, // Substitui notificações com a mesma tag alertando o usuário
    requireInteraction: true, // Mantém o alerta na tela do celular até que o usuário clique ou limpe
    
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Abre o aplicativo na tela correta ou foca em uma aba já aberta quando o cliente clica na notificação
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const targetUrl = event.notification.data?.url || '/';
  
  // Resolve de forma robusta buscando clientes de janela ativos no navegador
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Tenta encontrar uma aba existente com o mesmo domínio que possa ser focada
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        const clientUrl = new URL(client.url);
        const targetParsedUrl = new URL(targetUrl, self.location.origin);
        
        // Se a aba estiver no mesmo domínio, foca nela e navega para a URL profunda
        if (clientUrl.origin === targetParsedUrl.origin && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      
      // Se não houver abas abertas no mesmo domínio, abre uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
