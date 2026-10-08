#!/bin/bash
# Reset de MySQL 9.7 (instalador oficial Oracle) + base de datos para el CRM.
# Ejecutar con:  sudo bash ~/Projects/crm-minerva/scripts/reset-mysql.sh
set -euo pipefail

BASEDIR=/usr/local/mysql
DATADIR=/usr/local/mysql/data
SOCKET=/tmp/mysql.sock
LABEL=com.oracle.oss.mysql.mysqld
CREDS="$HOME/.crm_minerva_db_creds"

echo "==> 1/5 Deteniendo el servicio MySQL de Oracle"
launchctl unload "/Library/LaunchDaemons/${LABEL}.plist" 2>/dev/null || true
pkill -f "${BASEDIR}/bin/mysqld" 2>/dev/null || true

for i in $(seq 1 20); do
  pgrep -f "${BASEDIR}/bin/mysqld" >/dev/null || break
  sleep 1
done
if pgrep -f "${BASEDIR}/bin/mysqld" >/dev/null; then
  echo "ERROR: mysqld sigue corriendo. Abortando sin tocar datos." >&2
  exit 1
fi
echo "    mysqld detenido."

echo "==> 2/5 Arrancando con --skip-grant-tables (para poder cambiar el password)"
sudo -u _mysql "${BASEDIR}/bin/mysqld" \
  --user=_mysql \
  --basedir="${BASEDIR}" \
  --datadir="${DATADIR}" \
  --plugin-dir="${BASEDIR}/lib/plugin" \
  --socket="${SOCKET}" \
  --skip-grant-tables \
  --skip-networking \
  --log-error="${DATADIR}/reset.err" &
MYSQLD_PID=$!

for i in $(seq 1 30); do
  mysqladmin --socket="${SOCKET}" ping >/dev/null 2>&1 && break
  sleep 1
done
mysqladmin --socket="${SOCKET}" ping >/dev/null 2>&1 || {
  echo "ERROR: mysqld no arrancó. Mirá ${DATADIR}/reset.err" >&2
  exit 1
}
echo "    listo."

echo "==> 3/5 Restableciendo la contraseña de root"
ROOT_PW="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"
DEV_PW="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"

mysql --socket="${SOCKET}" <<SQL
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY '${ROOT_PW}';
SQL

echo "    root restablecida."

echo "==> 4/5 Creando base de datos y usuario dedicado para el CRM"
mysql --socket="${SOCKET}" -u root -p"${ROOT_PW}" <<SQL
CREATE DATABASE IF NOT EXISTS crm_minerva
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'crm_dev'@'localhost' IDENTIFIED BY '${DEV_PW}';
GRANT ALL PRIVILEGES ON crm_minerva.* TO 'crm_dev'@'localhost';
FLUSH PRIVILEGES;
SQL

echo "    base 'crm_minerva' y usuario 'crm_dev' creados."

echo "==> 5/5 Cerrando el modo inseguro y restaurando el servicio normal"
kill "${MYSQLD_PID}" 2>/dev/null || true
wait "${MYSQLD_PID}" 2>/dev/null || true
sleep 3
launchctl load "/Library/LaunchDaemons/${LABEL}.plist"

for i in $(seq 1 30); do
  mysqladmin --socket="${SOCKET}" -u root -p"${ROOT_PW}" ping >/dev/null 2>&1 && break
  sleep 1
done
mysqladmin --socket="${SOCKET}" -u root -p"${ROOT_PW}" ping >/dev/null 2>&1 || {
  echo "ERROR: el servicio normal no arrancó. Mirá ${DATADIR}/mysqld.local.err" >&2
  exit 1
}

umask 077
cat > "${CREDS}" <<EOF
# Credenciales locales de desarrollo — CRM Minerva
# NO versionar. La de producción va en las variables de entorno de Vercel.
DATABASE_URL="mysql://crm_dev:${DEV_PW}@localhost:3306/crm_minerva"
MYSQL_ROOT_PASSWORD="${ROOT_PW}"
EOF
chmod 600 "${CREDS}"

echo
echo "============================================================"
echo " Listo. Credenciales guardadas en: ${CREDS}"
echo " Base: crm_minerva | Usuario: crm_dev"
echo "============================================================"
