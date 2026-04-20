/* KrishiMitra Service Worker — minimal offline cache */
const VERSION = "krishimitra-v2";
const CORE = ["/", "/manifest.webmanifest", "/placeholder.svg"];
const RUNTIME = `${VERSION}-runtime`;
const MAX_CACHE_BYTES = 2 * 1024 * 1024; // 2 MB cap per response

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

  // Never cache Supabase auth/realtime
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/auth/")) return;

  // Never cache the giant notebook or anything in /notebooks/
  if (url.pathname.endsWith(".ipynb") || url.pathname.startsWith("/notebooks/")) return;

  // Navigation: network-first, fallback to cached shell
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  // Static + API: stale-while-revalidate, but cap by content-length to avoid bloating quota
  event.respondWith(
    caches.open(RUNTIME).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const len = parseInt(res.headers.get("content-length") || "0", 10);
          if (!len || len <= MAX_CACHE_BYTES) {
            cache.put(req, res.clone()).catch(() => {});
          }
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
