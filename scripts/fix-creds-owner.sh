#!/bin/bash
# Devuelve el archivo de credenciales al usuario normal, ya que el script de
# reset corrió con sudo y quedó con owner root.
set -euo pipefail

CREDS="$HOME/.crm_minerva_db_creds"
TARGET_USER="${SUDO_USER:-$USER}"

if [ ! -f "${CREDS}" ]; then
  echo "ERROR: no existe ${CREDS}" >&2
  exit 1
fi

chown "${TARGET_USER}" "${CREDS}"
chmod 600 "${CREDS}"

echo "Listo. Credenciales de ${CREDS} ahora son de ${TARGET_USER} (permisos 600)."
