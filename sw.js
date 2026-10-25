/* Service worker de Ramène ton Tup à Mémé (version web).
 * Il ne sert qu'aux rappels : il affiche la notification envoyée par le serveur (même app fermée)
 * et ouvre le bon prêt quand on la touche.
 * Volontairement AUCUNE mise en cache : chacun a toujours la dernière version de l'app.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Mémé réclame son bien ! 🥡';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    lang: 'fr',
    // Un seul rappel affiché par prêt
    tag: data.loanId ? `pret-${data.loanId}` : undefined,
    data: { loanId: data.loanId || null, familyId: data.familyId || null },
  };
  // Toujours afficher quelque chose : les navigateurs l'exigent pour chaque message reçu
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { loanId, familyId } = event.notification.data || {};
  const url = loanId && familyId ? `/?rappel=${encodeURIComponent(loanId)}&famille=${encodeURIComponent(familyId)}` : '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        // App déjà ouverte : on la met devant et on lui demande d'ouvrir le prêt
        if (loanId && familyId) client.postMessage({ type: 'open-loan', loanId, familyId });
        if ('focus' in client) await client.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
