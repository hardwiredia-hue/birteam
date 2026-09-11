# Publicar birteam — staging y producción

Dos ambientes en el mismo servidor (CWP + PostgreSQL), una regla:

| Rama | Dominio | Carpeta | Servicio | Puerto interno | Base |
|---|---|---|---|---|---|
| `staging` | staging.birteam.com | `/home/birteam/staging` | `birteam-staging` | 3001 | `birteam_staging` |
| `produccion` | birteam.com | `/home/birteam/app` | `birteam` | 3000 | `birteam` |

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
DATABASE_URL="postgresql://birteam:<clave>@localhost:5432/birteam"
# /home/birteam/staging/.env.production
DATABASE_URL="postgresql://birteam:<clave>@localhost:5432/birteam_staging"
```

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
ExecStart=/usr/bin/npx next start -p 3000
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
3. Configurar el vhost como proxy inverso a `http://127.0.0.1:3000`
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
| `SSH_PUERTO` | Opcional, por defecto `22`. |

## 6 · Publicar

```bash
git push origin staging      # → staging.birteam.com
git push origin produccion   # → birteam.com
```

El flujo de trabajo diario: se trabaja en la rama principal, se prueba empujando a
`staging`, y cuando staging se ve bien se empuja a `produccion`. La bitácora de lo
publicado queda en `/home/birteam/publicaciones.log`. Si un build falla en el
servidor, el script restaura la versión anterior solo.

## Reglas fijas

- Nunca abrir 3000/3001 a internet.
- Nunca mostrar ni copiar el contenido de `.env.production`.
- Respaldar con fecha cualquier vhost antes de pisarlo.
- La clave de GitHub vive solo en los secretos de Actions.
- Nada de `DROP DATABASE` ni resets sin pedido explícito.
