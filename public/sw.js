// Service worker mínimo de birteam: habilita la instalación como app.
// La red manda siempre; si no hay red, se avisa con una página simple.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (evento) => {
  if (evento.request.mode !== 'navigate') return;
  evento.respondWith(
    fetch(evento.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
            '<body style="background:#0a0b08;color:#f4f6ea;font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;margin:0;padding:24px">' +
            '<div><p style="font-size:40px;margin:0">📶</p><h1 style="font-size:20px">Sin conexión</h1>' +
            '<p style="color:#bbc1a8;font-size:14px">Cuando vuelva la señal, birteam vuelve solo. Tocá para reintentar.</p>' +
            '<button onclick="location.reload()" style="background:#a8e617;color:#0b0d03;border:0;border-radius:6px;padding:12px 24px;font-weight:700;font-size:15px">Reintentar</button></div>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
    )
  );
});
