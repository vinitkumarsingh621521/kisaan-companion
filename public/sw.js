/* KrishiMitra Service Worker — minimal offline cache */
const VERSION = "krishimitra-v1";
const CORE = ["/", "/manifest.webmanifest", "/placeholder.svg"];
const RUNTIME = `${VERSION}-runtime`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for GETs; network-first for navigations.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Supabase auth/realtime; let them fail-fast online.
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/auth/")) return;

  // Navigation: network-first, fallback to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Static + API: stale-while-revalidate
  event.respondWith(
    caches.open(RUNTIME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

// Allow page to broadcast skipWaiting
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
