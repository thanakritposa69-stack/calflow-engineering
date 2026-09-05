const CACHE = "calflow-v11";
const BASE = new URL(self.registration.scope).pathname;
const SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}favicon.svg`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(url, { cache: "reload" })))).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("calflow-") && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
    const windows = await self.clients.matchAll({ type: "window" });
    await Promise.all(windows.map((client) => client.navigate(client.url)));
  })());
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  const request = event.request.mode === "navigate" ? new Request(event.request, { cache: "no-store" }) : event.request;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match(BASE))));
});
