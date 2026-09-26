/* KLONK · el service worker (27-09-2026). Només fa una cosa: rebre els avisos i obrir l'app en tocar-los.
   No desa res a la memòria cau (sense «fetch»): l'app es carrega sempre de la xarxa, com fins ara. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

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
