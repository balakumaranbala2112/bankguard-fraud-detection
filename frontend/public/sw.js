// BankGuard Service Worker — FEATURE 7: Push Notifications

const CACHE_NAME = "bankguard-v1";
const OFFLINE_URL = "/";

// Install event — cache shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Push event — show notification
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "BankGuard", body: event.data ? event.data.text() : "New notification" };
  }

  const { title = "BankGuard", body = "", icon = "/icon-192.png", badge = "/badge-72.png", data: extraData = {} } = data;

  const options = {
    body,
    icon,
    badge,
    data: extraData,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: [
      { action: "view", title: "View Dashboard" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click — open app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") return;

  const url = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
