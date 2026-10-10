#!/bin/bash
# Publica birteam en el servidor. Corre EN el servidor, invocado por
# publicar-remoto.sh (la clave SSH restringida de GitHub Actions).
#
#   ./publicar.sh <sha-completo> <staging|produccion>
#
# staging    → /home/birteam/staging  · servicio birteam-staging · puerto 3001
# produccion → /home/birteam/app      · servicio birteam         · puerto 3000
set -euo pipefail

SHA="${1:-}"
AMBIENTE="${2:-}"

# Validacion estricta: esto llega desde afuera.
[[ "$SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "SHA inválido."; exit 1; }
[[ "$AMBIENTE" =~ ^(staging|produccion)$ ]] || { echo "Ambiente inválido."; exit 1; }

if [ "$AMBIENTE" = "produccion" ]; then
  DIR=/home/birteam/app
  SERVICIO=birteam
else
  DIR=/home/birteam/staging
  SERVICIO=birteam-staging
fi
BITACORA=/home/birteam/publicaciones.log

anotar() {
  echo "$(date '+%F %T') [$AMBIENTE] $1" | tee -a "$BITACORA"
}

# Una publicacion por ambiente a la vez.
exec 9>"/tmp/birteam-publicar-$AMBIENTE.lock"
flock -n 9 || { echo "Ya hay una publicación de $AMBIENTE en curso."; exit 1; }

cd "$DIR"
anotar "Publicando $SHA"

git fetch origin
git checkout -f "$SHA"

# Marca del ambiente para la app (ej: el simulador de pagos solo se prende en staging).
echo "$AMBIENTE" > .ambiente

npm ci --no-audit --no-fund

# En el servidor la base es PostgreSQL; el repo trae SQLite para desarrollo.
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# Variables del ambiente (DATABASE_URL, etc.) sin mostrarlas jamas.
set -a; . ./.env.production; set +a

npx prisma generate
# --accept-data-loss: si no, un indice unico nuevo frena el deploy.
npx prisma db push --skip-generate --accept-data-loss

# Catalogos (deportes, geografia): siembra idempotente, nunca pisa datos.
npx tsx prisma/seed.ts

# Compilar A UN COSTADO: el .next vivo sigue sirviendo hasta tener el nuevo.
rm -rf .next.nuevo
if ! DIST_DIR=.next.nuevo npm run build; then
  anotar "FALLÓ el build de $SHA; la versión anterior sigue en el aire, sin tocar."
  rm -rf .next.nuevo
  exit 1
fi

# Intercambio instantaneo + reinicio. Lo anterior queda para volver atras.
rm -rf .next.anterior
if [ -d .next ]; then mv .next .next.anterior; fi
mv .next.nuevo .next
sudo /bin/systemctl restart "$SERVICIO"
anotar "Publicado $SHA y reiniciado $SERVICIO."

# Autoactualizacion para la PROXIMA corrida: copia aparte y mv (inodo nuevo),
# asi bash sigue leyendo la version vieja y nunca ejecuta medio archivo.
for f in publicar.sh publicar-remoto.sh respaldo.sh; do
  cp -p "deploy/$f" "/home/birteam/deploy/.$f.n" && mv -f "/home/birteam/deploy/.$f.n" "/home/birteam/deploy/$f"
done 2>/dev/null || true
