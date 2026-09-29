/* KLONK · el service worker (27-09-2026). Rep els avisos i obre l'app en tocar-los.
   I SENSE COBERTURA (29-09-2026, REVISIO-PER-VENDRE §4.6): fins avui no desava res, i si el mòbil havia tancat l'app i al
   gimnàs no hi havia xarxa, no s'obria. Ara, per a tot el que és de klonk.fit: PRIMER LA XARXA, sempre (així ningú no es
   queda amb una versió vella: cada càrrega amb xarxa porta la d'ara i en desa la còpia), i NOMÉS si no n'hi ha, la còpia
   de l'última vegada. L'API és un altre domini i no hi passa. Si falla la xarxa i no hi ha còpia, surt l'error de sempre. */
const CAU = "klonk-v1";
const MAX_BYTES = 3 * 1024 * 1024;         // el que és més gros (el model 3D sencer, un vídeo) no es desa

self.addEventListener("install", e => {
  // la pàgina, ja d'entrada: sense ella no s'obre res
  e.waitUntil(caches.open(CAU).then(c => c.add(new Request("./", { cache: "reload" }))).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("klonk-") && k !== CAU).map(k => caches.delete(k))))
    .then(() => self.clients.claim())));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // «la pàgina» és només la portada de l'app (amb o sense ?pago=…): les condicions i la privacitat es desen amb el seu nom,
  // perquè obrir-les no substitueixi la còpia de l'app
  const arrel = new URL(self.registration.scope).pathname;
  const pagina = req.mode === "navigate" && (url.pathname === arrel || url.pathname === arrel + "index.html");
  e.respondWith((async () => {
    try {
      const r = await fetch(req);
      if (r && r.ok && r.type === "basic") {
        const mida = +(r.headers.get("content-length") || 0);
        if (!mida || mida <= MAX_BYTES) {
          const copia = r.clone();
          e.waitUntil(caches.open(CAU).then(c => c.put(pagina ? new Request("./") : req, copia)).catch(() => {}));
        }
      }
      return r;
    } catch (err) {
      const c = await caches.open(CAU);
      const desat = pagina ? (await c.match("./")) || (await c.match(req, { ignoreSearch: true })) : await c.match(req);
      if (desat) return desat;
      throw err;
    }
  })());
});

self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  const feina = [self.registration.showNotification(d.title || "KLONK", {
    body: d.body || "", icon: "icono-192.png", badge: "icono-192.png", tag: d.tag || "klonk", renotify: true, data: { url: d.url || "./" },
  })];
  if (self.navigator && self.navigator.setAppBadge) feina.push(self.navigator.setAppBadge(1).catch(() => {}));
  e.waitUntil(Promise.all(feina));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data || {}).url || "./", self.registration.scope).href;
  // Amb KLONK obert: no es recarrega (es perdria el descans d'un entreno en marxa); se li diu on anar i surt al davant.
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const w = ws.find(x => x.url.startsWith(self.registration.scope));
    if (w) { w.postMessage({ klonk: "avis", url }); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
