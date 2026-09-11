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

# Compilar guardando lo anterior para poder volver atrás sin recompilar.
if [ -d .next ]; then rm -rf .next.anterior && mv .next .next.anterior; fi
if ! npm run build; then
  anotar "FALLÓ el build de $SHA; restaurando la versión anterior."
  [ -d .next.anterior ] && mv .next.anterior .next
  sudo /bin/systemctl restart "$SERVICIO"
  exit 1
fi

sudo /bin/systemctl restart "$SERVICIO"
anotar "Publicado $SHA y reiniciado $SERVICIO."
