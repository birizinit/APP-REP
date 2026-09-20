/**
 * Service worker do Representei.
 *
 * Duas funções: manter o app utilizável quando o sinal cai no meio da
 * estrada, e receber os avisos push de rota, visita e comissão.
 */

const VERSAO = "representei-v1";
const ESTATICOS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/icone-192.png",
  "/icone-512.png",
];

// ------------------------------------------------------------------
// Ciclo de vida
// ------------------------------------------------------------------

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches
      .open(VERSAO)
      .then((cache) => cache.addAll(ESTATICOS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(chaves.filter((c) => c !== VERSAO).map((c) => caches.delete(c))),
      )
      .then(() => self.clients.claim()),
  );
});

// ------------------------------------------------------------------
// Rede
// ------------------------------------------------------------------

self.addEventListener("fetch", (evento) => {
  const requisicao = evento.request;

  if (requisicao.method !== "GET") return;

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin) return;
  // dados sempre frescos
  if (url.pathname.startsWith("/api/")) return;

  // navegação: tenta a rede, cai para o cache, depois para a página offline
  if (requisicao.mode === "navigate") {
    evento.respondWith(
      fetch(requisicao)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
          return resposta;
        })
        .catch(() =>
          caches
            .match(requisicao)
            .then((emCache) => emCache ?? caches.match("/offline"))
            .then((resposta) => resposta ?? Response.error()),
        ),
    );
    return;
  }

  // estáticos do Next: cache primeiro
  if (url.pathname.startsWith("/_next/static") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    evento.respondWith(
      caches.match(requisicao).then(
        (emCache) =>
          emCache ??
          fetch(requisicao).then((resposta) => {
            const copia = resposta.clone();
            caches.open(VERSAO).then((cache) => cache.put(requisicao, copia));
            return resposta;
          }),
      ),
    );
  }
});

// ------------------------------------------------------------------
// Push
// ------------------------------------------------------------------

self.addEventListener("push", (evento) => {
  let dados = { titulo: "Representei", corpo: "", url: "/" };

  try {
    if (evento.data) dados = { ...dados, ...evento.data.json() };
  } catch {
    if (evento.data) dados.corpo = evento.data.text();
  }

  const urgente = dados.tipo === "COMISSAO_VENCIDA" || dados.tipo === "CLIENTE_EM_RISCO";

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/icone-192.png",
      badge: "/icone-192.png",
      tag: dados.tipo ?? "representei",
      renotify: false,
      requireInteraction: urgente,
      vibrate: urgente ? [80, 40, 80] : [40],
      data: { url: dados.url ?? "/" },
      actions: [{ action: "abrir", title: "Abrir" }],
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = evento.notification.data?.url ?? "/";

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const janela of janelas) {
        if (janela.url.includes(self.location.origin) && "focus" in janela) {
          janela.navigate?.(destino);
          return janela.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
