#!/bin/bash
# Punto de entrada de la clave SSH restringida de GitHub Actions.
# En authorized_keys la clave queda atada a este script (ver PUBLICAR.md),
# asi que lo UNICO que puede hacer quien tenga la clave es publicar.
# Recibe por SSH_ORIGINAL_COMMAND: "<sha> <ambiente>".
set -euo pipefail

leido="${SSH_ORIGINAL_COMMAND:-}"
SHA="$(echo "$leido" | awk '{print $1}')"
AMBIENTE="$(echo "$leido" | awk '{print $2}')"

exec /home/birteam/deploy/publicar.sh "$SHA" "$AMBIENTE"
