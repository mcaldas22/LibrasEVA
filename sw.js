// ═══════════════════════════════════════════════════════════════════════
//  LibrasEVA – Service Worker  (sw.js)
//  Estratégia: Cache First para assets estáticos, Network First para dados
// ═══════════════════════════════════════════════════════════════════════

const CACHE_NAME = "libraseva-v5";

const STATIC_ASSETS = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./data/terms.json",
  "./data/video_tabs.json",
  "./data/local_catalog.json"
];

// ── INSTALL: pré-cache dos assets estáticos ────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pré-cacheando assets estáticos…");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpa caches antigos ────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log("[SW] Deletando cache antigo:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Cache First para assets; Network First para APIs ───────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Ignorar requisições não-http (ex: chrome-extension://)
  if (!url.protocol.startsWith("http")) return;

  // Network First para Firebase / Firestore / Storage
  if (
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebasestorage.googleapis.com") ||
    url.hostname.includes("supabase.co")
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // App shell crítico: evita ficar preso em JS/CSS antigo.
  if (
    event.request.mode === "navigate" ||
    ["script", "style"].includes(event.request.destination)
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache First para assets locais
  event.respondWith(cacheFirst(event.request));
});

// ── Estratégia: Cache First ───────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Página offline de fallback
    const cached404 = await caches.match("./index.html");
    return cached404 || new Response("Sem conexão e sem cache.", { status: 503 });
  }
}

// ── Estratégia: Network First ─────────────────────────────────────────
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}
