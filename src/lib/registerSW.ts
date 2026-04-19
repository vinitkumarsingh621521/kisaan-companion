/**
 * Lightweight service worker registration with iframe/preview guard.
 * Only registers in production, top-level, non-Lovable-preview contexts.
 */
export function registerSW() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const host = window.location.hostname;
  const isPreview =
    host.includes("id-preview--") ||
    host.includes("lovableproject.com") ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isInIframe || isPreview) {
    // Clean up any leftover SWs registered on previous visits.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("[SW] registration failed", e);
    });
  });
}
