// Service worker for local + push notifications.
// No fetch handler / no caching to avoid breaking the Lovable preview.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Page -> SW message bridge to display notifications via the SW
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

// Real Web Push handler — fires even when the app is closed.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Reminder", body: event.data?.text?.() || "" };
  }
  const title = payload.title || "Reminder";
  const options = {
    body: payload.body || "",
    tag: payload.tag || "reminder",
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    data: payload.data || { url: "/" },
    requireInteraction: false,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            try { client.navigate(targetUrl); } catch {}
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      })
  );
});
