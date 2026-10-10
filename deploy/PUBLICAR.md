# Publicar birteam — staging y producción

Dos ambientes en el mismo servidor (CWP + PostgreSQL), una regla:

| Rama | Dominio | Carpeta | Servicio | Puerto interno | Base |
|---|---|---|---|---|---|
| `staging` | staging.birteam.com | `/home/birteam/staging` | `birteam-staging` | 3001 | `birteam_staging` |
| `produccion` | birteam.com | `/home/birteam/app` | `birteam` | 3007 | `birteam` |

> Producción usa el **3007** porque el 3000 ya está tomado por otro servicio del
> servidor. Si algún día se migra de máquina, elegir puertos libres y mantener
> esta tabla al día.

Cada push a esas ramas dispara GitHub Actions: primero **revisar** (tipos + build) y,
si pasa, **publicar** por SSH con una clave que solo puede ejecutar el script de
publicación. Los puertos 3000/3001 **nunca** se abren a internet: solo los ve el
proxy del vhost.

## 1 · DNS

En el DNS de birteam.com, dos registros A hacia la IP del servidor:

```
birteam.com          A   <IP-del-servidor>
staging.birteam.com  A   <IP-del-servidor>
```

## 2 · Preparar el servidor (una sola vez)

Como root (o pedíselo a Claude en el VPS pasándole este archivo):

```bash
# Usuario y carpetas
useradd -m birteam 2>/dev/null || true
sudo -u birteam git clone https://github.com/hardwiredia-hue/birteam /home/birteam/app
sudo -u birteam git clone https://github.com/hardwiredia-hue/birteam /home/birteam/staging
sudo -u birteam cp -r /home/birteam/app/deploy /home/birteam/deploy
chmod +x /home/birteam/deploy/publicar.sh /home/birteam/deploy/publicar-remoto.sh

# Bases de datos
sudo -u postgres psql -c "CREATE USER birteam WITH PASSWORD '<una-clave-fuerte>';"
sudo -u postgres psql -c "CREATE DATABASE birteam OWNER birteam;"
sudo -u postgres psql -c "CREATE DATABASE birteam_staging OWNER birteam;"
```

`.env.production` en **cada** carpeta (nunca se commitea ni se muestra):

```bash
# /home/birteam/app/.env.production
DATABASE_URL="postgresql://birteam:<clave>@127.0.0.1:5432/birteam"
# /home/birteam/staging/.env.production
DATABASE_URL="postgresql://birteam:<clave>@127.0.0.1:5432/birteam_staging"
```

> Con `127.0.0.1`, no `localhost`: en este servidor Postgres escucha solo en
> IPv4 y `localhost` resuelve a `::1`, así que la conexión fallaría.

Servicios systemd — `/etc/systemd/system/birteam.service` (y el gemelo
`birteam-staging.service` cambiando carpeta y puerto):

```ini
[Unit]
Description=birteam (produccion)
After=network.target postgresql.service

[Service]
User=birteam
WorkingDirectory=/home/birteam/app
Environment=NODE_ENV=production
# --hostname explícito: next start (Next 15) ignora la variable HOSTNAME,
# y sin esto queda escuchando en todas las interfaces.
ExecStart=/usr/bin/npx next start -p 3007 --hostname 127.0.0.1
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload
systemctl enable --now birteam birteam-staging
```

Permiso para que el script reinicie los servicios (solo eso) —
`/etc/sudoers.d/birteam-publicacion`:

```
birteam ALL=(root) NOPASSWD: /bin/systemctl restart birteam, /bin/systemctl restart birteam-staging
```

## 3 · Vhosts en CWP

Para cada dominio (birteam.com y staging.birteam.com):

1. Crear el dominio/subdominio en CWP apuntando al usuario `birteam`.
2. **Antes de tocar un vhost existente, copia con fecha**:
   `cp conf.conf conf.conf.respaldo-$(date +%F)`.
3. Configurar el vhost como proxy inverso a `http://127.0.0.1:3007`
   (staging: `3001`).
4. Emitir SSL (Let's Encrypt desde CWP) para ambos dominios.

## 4 · Clave de publicación

En el servidor, generar una clave SOLO para esto:

```bash
ssh-keygen -t ed25519 -f /tmp/clave-publicacion -N "" -C "github-actions-birteam"
```

En `/home/birteam/.ssh/authorized_keys`, la pública **restringida**:

```
restrict,command="/home/birteam/deploy/publicar-remoto.sh" ssh-ed25519 AAAA... github-actions-birteam
```

Con eso, aunque la clave se filtre, lo único que puede hacer es publicar.

## 5 · Secretos en GitHub

En el repo → Settings → Secrets and variables → Actions:

| Secreto | Qué va |
|---|---|
| `SSH_CLAVE_PRIVADA` | El contenido de `/tmp/clave-publicacion` (la privada). Borrala del servidor después. |
| `SSH_SERVIDOR` | IP o host del servidor. |
| `SSH_CLAVE_DEL_SERVIDOR` | La línea de `ssh-keyscan -t ed25519 <IP>` (huella del servidor). |
| `SSH_USUARIO` | Opcional, por defecto `birteam`. |
| `SSH_PUERTO` | **Obligatorio en este servidor**: SSH no atiende en el 22, usar el puerto real. |

Nota: el usuario `birteam` necesita shell real (`/bin/bash`) — con `/sbin/nologin`
el `command=` forzado de la clave nunca corre. Compensado en `sshd_config` con
`Match User birteam` + `PasswordAuthentication no`.

## 6 · Publicar

```bash
git push origin staging      # → staging.birteam.com
git push origin produccion   # → birteam.com
```

El flujo de trabajo diario: se trabaja en la rama principal, se prueba empujando a
`staging`, y cuando staging se ve bien se empuja a `produccion`. La bitácora de lo
publicado queda en `/home/birteam/publicaciones.log`. Si un build falla en el
servidor, el script restaura la versión anterior solo.

## Recordatorios automáticos

El endpoint `/api/tareas` vence las invitaciones de la lista de espera (2 h)
y manda los recordatorios (24 h antes y reconfirmación 2 h antes). Lo dispara
un cron del servidor cada 10 minutos. Puesta en marcha (una vez por ambiente):

```bash
# 1. Generar una clave y agregarla a cada .env.production (sin mostrarla):
#    TAREAS_CLAVE="<clave larga aleatoria>"
openssl rand -hex 32

# 2. Reiniciar los servicios para que tomen la variable:
systemctl restart birteam birteam-staging

# 3. Cron del usuario birteam (crontab -u birteam -e), una línea por ambiente:
*/10 * * * * curl -s -X POST -H "X-Tarea-Clave: <clave-produccion>" http://127.0.0.1:3007/api/tareas >/dev/null 2>&1
*/10 * * * * curl -s -X POST -H "X-Tarea-Clave: <clave-staging>" http://127.0.0.1:3001/api/tareas >/dev/null 2>&1
```

Sin `TAREAS_CLAVE` el endpoint contesta 503 y no hace nada; con clave
incorrecta, 401. Cada aviso sale una sola vez (control de duplicados).

## Notificaciones push

Los avisos (lugar liberado, recordatorios, mensajes directos) también llegan
como notificaciones del navegador/celular aunque la app esté cerrada. Cada
ambiente necesita su par de claves VAPID en `.env.production` (una sola vez):

```bash
# 1. Generar el par de claves (repetir para cada ambiente, claves distintas):
cd /home/birteam/app && npx web-push generate-vapid-keys
cd /home/birteam/staging && npx web-push generate-vapid-keys

# 2. Agregar a cada .env.production (sin mostrar el archivo):
#    VAPID_PUBLIC_KEY="<publicKey>"
#    VAPID_PRIVATE_KEY="<privateKey>"

# 3. Reiniciar para que tomen las variables:
systemctl restart birteam birteam-staging
```

Sin claves configuradas la app funciona igual: los avisos quedan solo en la
campanita y el interruptor "Avisos en este dispositivo" no aparece en Perfil.
La clave privada nunca sale del servidor; la pública la lee el navegador
desde `/api/push/clave`.

## Respaldos automáticos

`deploy/respaldo.sh` respalda todos los días las bases (pg_dump) y las fotos
subidas de los dos ambientes en `/home/birteam/respaldos`, con rotación:
diarios 7 días, los del domingo 35. Puesta en marcha (una vez):

```bash
cp -f /home/birteam/app/deploy/respaldo.sh /home/birteam/deploy/
chmod +x /home/birteam/deploy/respaldo.sh
# Probarlo a mano una vez:
sudo -u birteam /home/birteam/deploy/respaldo.sh && tail -5 /home/birteam/respaldos/respaldos.log
# Cron del usuario birteam, todos los días a las 4:30:
# 30 4 * * * /home/birteam/deploy/respaldo.sh >/dev/null 2>&1
```

Restaurar una base: `gunzip -c db-app-<fecha>.sql.gz | psql "$DATABASE_URL"`
(sobre una base vacía). Las fotos: destarar en la carpeta del ambiente.

## Subida de videos

Los clips de las jugadas pesan hasta 60 MB. El nginx de cada vhost tiene que
aceptar cuerpos de ese tamaño (el límite de fábrica es 1 MB y corta también
las fotos). En los vhosts de birteam.com y staging.birteam.com (bloque
`server` o `location /`), respaldando antes el archivo con fecha:

```
client_max_body_size 80m;
```

y recargar: `nginx -t && systemctl reload nginx`.

## Ingreso con Google

El botón "Continuar con Google" aparece solo si el ambiente tiene credenciales.
Una sola vez:

1. En Google Cloud Console (console.cloud.google.com) → APIs y servicios →
   Pantalla de consentimiento OAuth: tipo Externo, nombre "birteam", dominio
   birteam.com, y publicarla (no hace falta verificación para login básico).
2. Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web:
   - Orígenes autorizados: https://birteam.com y https://staging.birteam.com
   - URIs de redireccionamiento autorizados:
     https://birteam.com/api/auth/google/volver
     https://staging.birteam.com/api/auth/google/volver
3. Agregar a CADA .env.production (sin mostrarlos):
   GOOGLE_CLIENT_ID="<id>.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="<secreto>"
   URL_PUBLICA="https://birteam.com"        (en staging: https://staging.birteam.com)
4. systemctl restart birteam birteam-staging

El mismo par de credenciales sirve para los dos ambientes (las dos URIs están
autorizadas). Cuentas nuevas por Google completan @usuario y datos en
/registro/completar; si el email ya existía, Google queda vinculado y entra.

## Cobros con Mercado Pago

Modelo marketplace (Checkout Pro + OAuth): cada complejo conecta SU cuenta de
Mercado Pago desde "Mi complejo"; los cobros van directo a esa cuenta y birteam
retiene solo su comisión (`marketplace_fee`, se fija en Backoffice › Pagos, por
defecto 0 %). birteam no guarda datos de tarjetas ni retiene plata de terceros.
Sin estas variables el cobro online no aparece y todo sigue como antes.

Una sola vez:

1. Con la cuenta de Mercado Pago de birteam, en Mercado Pago Developers → Tus
   integraciones → Crear aplicación (producto: pagos online / Checkout Pro,
   con OAuth habilitado para operar a nombre de vendedores). Confirmar con
   Mercado Pago que la cuenta tenga habilitado el modelo marketplace / split
   de pagos en Argentina y sus condiciones vigentes antes de cobrar comisión.
2. En la aplicación → OAuth / URL de redireccionamiento:
     https://birteam.com/api/mercadopago/volver
     https://staging.birteam.com/api/mercadopago/volver
   Habilitar el permiso de acceso sin conexión (offline_access) para poder
   renovar los tokens sin que el dueño vuelva a conectarse.
3. Webhooks → Configurar notificaciones → copiar la clave secreta (las URLs
   de aviso las manda birteam en cada pago, no hace falta cargarlas).
4. Agregar a CADA .env.production (sin mostrarlos):
   MP_CLIENT_ID="<client id / app id>"
   MP_CLIENT_SECRET="<client secret>"
   MP_WEBHOOK_SECRET="<clave secreta de webhooks>"
   MP_CLAVE_CIFRADO="<salida de: openssl rand -hex 32>"   (una distinta por ambiente)
   URL_PUBLICA="https://birteam.com"        (en staging: https://staging.birteam.com)
5. systemctl restart birteam birteam-staging
6. Backoffice › Pagos muestra ✓/✗ por variable (nunca sus valores).

Simulador (para probar sin credenciales): en STAGING, Backoffice › Pagos ›
"Prender el simulador". Los complejos conectan una cuenta de prueba y el pago
se aprueba o rechaza a mano en una pantalla amarilla marcada "SIMULADOR DE
PAGOS". No se cobra nada. En producción no se puede prender (la app lo sabe
por la carpeta /home/birteam/staging y por el archivo .ambiente que deja
publicar.sh). Las cuentas y pagos simulados nunca se mezclan con los reales.

Cómo funciona: el jugador elige el turno → queda retenido 15 minutos → paga en
Mercado Pago → birteam consulta el pago a la API de Mercado Pago (con el token
del complejo) y recién ahí confirma. El aviso (webhook) se valida con la firma
`x-signature`; aunque llegue, nada se confirma sin la consulta a la API. Si el
pago llega tarde y el turno ya no está, o el jugador ya había cancelado, se
devuelve solo. Cancelaciones del complejo, o del jugador con más de 6 h de
anticipación, devuelven el pago antes de cancelar (si Mercado Pago no acepta
la devolución, el turno sigue en pie y queda registrado). Todo queda en el
registro de eventos de Backoffice › Pagos. MP_CLAVE_CIFRADO cifra los tokens
de los dueños: si se pierde, los dueños tienen que volver a conectar.

## Reglas fijas

- Nunca abrir 3000/3001 a internet.
- Nunca mostrar ni copiar el contenido de `.env.production`.
- Respaldar con fecha cualquier vhost antes de pisarlo.
- La clave de GitHub vive solo en los secretos de Actions.
- Nada de `DROP DATABASE` ni resets sin pedido explícito.
