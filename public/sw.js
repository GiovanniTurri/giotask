// Minimal service worker for local notifications.
// Intentionally NOT a PWA / Workbox SW: no fetch handler, no caching.
// This avoids breaking the Lovable preview while still allowing
// ServiceWorkerRegistration.showNotification() on Android Chrome and
// installed iOS PWAs (iOS 16.4+).

self.addEventListener("install", (event) => {
  // Activate immediately on first install
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Take control of open pages right away
  event.waitUntil(self.clients.claim());
});

// Page -> SW message bridge to display notifications via the SW
// (more reliable than `new Notification(...)` on Android Chrome).
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "SHOW_NOTIFICATION") return;

  const { title, options } = data;
  event.waitUntil(
    self.registration.showNotification(title || "Reminder", {
      body: options?.body,
      tag: options?.tag,
      icon: options?.icon || "/favicon.ico",
      badge: options?.badge || "/favicon.ico",
      data: options?.data || {},
      requireInteraction: options?.requireInteraction || false,
    })
  );
});

// When the user taps the notification, focus an existing tab or open one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try {
              client.navigate(targetUrl);
            } catch {
              // navigate may fail cross-origin; ignore
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
