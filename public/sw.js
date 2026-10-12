// Service worker de birteam: instalación como app, avisos push y modo sin señal.
// La red manda siempre. Sin señal: las pantallas ya visitadas se muestran en
// su última versión guardada (con un aviso arriba) y si no hay nada guardado,
// una pantalla de "Sin conexión".
const PAGINAS = 'birteam-paginas-v1';
const ESTATICOS = 'birteam-estaticos-v1';
const MAXIMO_PAGINAS = 40;
// Lo que vale guardar para ver sin señal (nada de login, admin ni pagos).
const GUARDABLES = /^\/(panel|reservas|partidos\/[^/]+|canchas\/[^/]+|grupos(\/[^/]+)?|torneos\/[^/]+|turnos|complejo|perfil)$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (evento) =>
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) =>
        Promise.all(nombres.filter((n) => n.startsWith('birteam-') && n !== PAGINAS && n !== ESTATICOS).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  )
);

// Aviso push: llega aunque la app esté cerrada (lugar liberado, recordatorio, mensaje).
self.addEventListener('push', (evento) => {
  let datos = {};
  try {
    datos = evento.data ? evento.data.json() : {};
  } catch {
    datos = { titulo: 'birteam', cuerpo: evento.data ? evento.data.text() : '' };
  }
  evento.waitUntil(
    self.registration.showNotification(datos.titulo || 'birteam', {
      body: datos.cuerpo || '',
      icon: datos.icono || '/icono-192.png',
      badge: datos.icono || '/icono-192.png',
      data: { url: datos.url || '/panel' },
      tag: datos.url || undefined,
    })
  );
});

// Tocar el aviso abre (o enfoca) la app en la pantalla que corresponde.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || '/panel';
  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.navigate(url);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// La app pide borrar lo guardado (al salir, entrar con otra cuenta o cerrar la cuenta).
self.addEventListener('message', (evento) => {
  if (evento.data === 'borrar-guardado') evento.waitUntil(caches.delete(PAGINAS));
});

// Aviso arriba de la pantalla guardada: como regla de estilo (no como elemento),
// así la app no lo borra al cargar.
const AVISO_GUARDADO =
  '<style>body::before{content:"Sin conexión: esto es lo último guardado. Se actualiza solo cuando vuelve la señal.";' +
  'display:block;position:sticky;top:0;z-index:999;background:#f59e1e;color:#0b0d03;font:600 13px system-ui;' +
  'padding:8px 16px;text-align:center}</style>';

const SIN_CONEXION =
  '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · birteam</title>' +
  '<body style="background:#0a0b08;color:#f4f6ea;font-family:system-ui;display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center;margin:0;padding:24px">' +
  '<div><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#818872" stroke-width="1.6" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="#818872"/><path d="M3 3l18 18"/></svg>' +
  '<h1 style="font-size:20px;margin:12px 0 6px">Sin conexión</h1>' +
  '<p style="color:#bbc1a8;font-size:14px;max-width:280px;margin:0 auto 16px">Esta pantalla todavía no estaba guardada. Cuando vuelva la señal, birteam vuelve solo.</p>' +
  '<button onclick="location.reload()" style="background:#a8e617;color:#0b0d03;border:0;border-radius:6px;padding:12px 24px;font-weight:700;font-size:15px">Reintentar</button></div>';

async function guardarPagina(pedido, respuesta) {
  const cache = await caches.open(PAGINAS);
  await cache.put(pedido, respuesta);
  // Solo las últimas visitadas.
  const claves = await cache.keys();
  for (const vieja of claves.slice(0, Math.max(0, claves.length - MAXIMO_PAGINAS))) await cache.delete(vieja);
}

async function navegar(evento) {
  const url = new URL(evento.request.url);
  try {
    const respuesta = await fetch(evento.request);
    const tipo = respuesta.headers.get('content-type') || '';
    if (respuesta.ok && tipo.includes('text/html') && url.origin === location.origin && GUARDABLES.test(url.pathname)) {
      evento.waitUntil(guardarPagina(evento.request, respuesta.clone()));
    }
    return respuesta;
  } catch {
    const guardada = await caches.match(evento.request, { cacheName: PAGINAS, ignoreSearch: false });
    if (guardada) {
      const html = await guardada.text();
      return new Response(html.replace('</head>', AVISO_GUARDADO + '</head>'), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return new Response(SIN_CONEXION, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

// Estilos y scripts de la app: no cambian nunca (llevan hash), así que se
// sirven de lo guardado y las pantallas guardadas se ven bien sin señal.
async function estatico(evento) {
  const cache = await caches.open(ESTATICOS);
  const guardado = await cache.match(evento.request);
  if (guardado) return guardado;
  const respuesta = await fetch(evento.request);
  if (respuesta.ok) {
    evento.waitUntil(
      cache.put(evento.request, respuesta.clone()).then(async () => {
        // Cada versión trae archivos nuevos: se quedan los últimos 150.
        const claves = await cache.keys();
        for (const viejo of claves.slice(0, Math.max(0, claves.length - 150))) await cache.delete(viejo);
      })
    );
  }
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  if (evento.request.method !== 'GET') return;
  if (evento.request.mode === 'navigate') {
    evento.respondWith(navegar(evento));
    return;
  }
  const url = new URL(evento.request.url);
  if (url.origin === location.origin && url.pathname.startsWith('/_next/static/')) {
    evento.respondWith(estatico(evento));
  }
});
