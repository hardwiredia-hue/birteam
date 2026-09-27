#!/bin/bash
# Respaldo diario de birteam: bases de datos y fotos subidas, de los dos
# ambientes. Lo corre el cron del usuario birteam (ver PUBLICAR.md).
#
# Guarda en /home/birteam/respaldos:
#   db-app-2026-09-27.sql.gz        base de produccion
#   db-staging-2026-09-27.sql.gz    base de staging
#   fotos-app-2026-09-27.tar.gz     fotos subidas de produccion
#   fotos-staging-2026-09-27.tar.gz fotos de staging
# Rotacion: diarios 7 dias; los del domingo se conservan 35 dias.
set -euo pipefail

# Los respaldos son la base completa: solo los lee el usuario birteam.
umask 077

DESTINO=/home/birteam/respaldos
FECHA=$(date +%F)
DIA_SEMANA=$(date +%u) # 7 = domingo
BITACORA="$DESTINO/respaldos.log"

mkdir -p "$DESTINO"
chmod 700 "$DESTINO"
anotar() { echo "$(date '+%F %T') $1" >> "$BITACORA"; }

for AMBIENTE in app staging; do
  DIR="/home/birteam/$AMBIENTE"
  [ -f "$DIR/.env.production" ] || continue

  # La URL de la base se lee sin mostrarla jamas.
  DATABASE_URL=$(grep -m1 '^DATABASE_URL=' "$DIR/.env.production" | cut -d= -f2- | tr -d '"')

  if pg_dump --no-owner --no-privileges "$DATABASE_URL" | gzip > "$DESTINO/db-$AMBIENTE-$FECHA.sql.gz"; then
    anotar "db-$AMBIENTE-$FECHA: $(du -h "$DESTINO/db-$AMBIENTE-$FECHA.sql.gz" | cut -f1)"
  else
    anotar "ERROR: fallo el respaldo de la base de $AMBIENTE"
  fi

  if [ -d "$DIR/archivos-subidos" ]; then
    tar -czf "$DESTINO/fotos-$AMBIENTE-$FECHA.tar.gz" -C "$DIR" archivos-subidos
    anotar "fotos-$AMBIENTE-$FECHA: $(du -h "$DESTINO/fotos-$AMBIENTE-$FECHA.tar.gz" | cut -f1)"
  fi

  # El domingo queda una copia larga.
  if [ "$DIA_SEMANA" = "7" ]; then
    cp -f "$DESTINO/db-$AMBIENTE-$FECHA.sql.gz" "$DESTINO/semanal-db-$AMBIENTE-$FECHA.sql.gz" 2>/dev/null || true
  fi
done

# Rotacion: diarios a los 7 dias, semanales a los 35.
find "$DESTINO" -name 'db-*.sql.gz' -mtime +7 -delete
find "$DESTINO" -name 'fotos-*.tar.gz' -mtime +7 -delete
find "$DESTINO" -name 'semanal-*.sql.gz' -mtime +35 -delete
anotar "rotacion lista · en disco: $(du -sh "$DESTINO" | cut -f1)"
