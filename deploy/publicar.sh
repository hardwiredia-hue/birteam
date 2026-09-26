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

# Validación estricta: esto llega desde afuera.
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

# Una publicación por ambiente a la vez.
exec 9>"/tmp/birteam-publicar-$AMBIENTE.lock"
flock -n 9 || { echo "Ya hay una publicación de $AMBIENTE en curso."; exit 1; }

cd "$DIR"
anotar "Publicando $SHA"

git fetch origin
git checkout -f "$SHA"

npm ci --no-audit --no-fund

# En el servidor la base es PostgreSQL; el repo trae SQLite para desarrollo.
sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma

# Variables del ambiente (DATABASE_URL, etc.) sin mostrarlas jamás.
set -a; . ./.env.production; set +a

npx prisma generate
npx prisma db push --skip-generate

# Catálogos (deportes, geografía): la siembra es idempotente, solo agrega lo
# que falta y nunca pisa datos cargados.
npx tsx prisma/seed.ts

# Compilar A UN COSTADO: el .next vivo no se toca hasta tener el nuevo listo,
# así el sitio sigue sirviendo durante todo el build (sin 500 de ventana).
rm -rf .next.nuevo
if ! DIST_DIR=.next.nuevo npm run build; then
  anotar "FALLÓ el build de $SHA; la versión anterior sigue en el aire, sin tocar."
  rm -rf .next.nuevo
  exit 1
fi

# Intercambio instantáneo + reinicio. Lo anterior queda para volver atrás.
rm -rf .next.anterior
[ -d .next ] && mv .next .next.anterior
mv .next.nuevo .next
sudo /bin/systemctl restart "$SERVICIO"
anotar "Publicado $SHA y reiniciado $SERVICIO."

# Los scripts de publicación del repo pisan la copia viva para la PRÓXIMA
# corrida, así el circuito se actualiza solo.
cp -f deploy/publicar.sh deploy/publicar-remoto.sh /home/birteam/deploy/ 2>/dev/null || true
