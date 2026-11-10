#!/bin/bash
# Crea el usuario que usa el back (DB_USERNAME / DB_PASSWORD de .env.docker) con permisos SOLO sobre DB_NAME.
# Lo ejecuta la imagen de MySQL la primera vez, después de 01_marketdata_db.sql.
set -e
BASE="${DB_NAME:-marketdata_db}"
if [ -z "$DB_USERNAME" ] || [ "$DB_USERNAME" = "root" ]; then
  echo "[gwu] DB_USERNAME vacío o root: no se crea usuario (el back usará root con MYSQL_ROOT_PASSWORD)"
  exit 0
fi
echo "[gwu] creando usuario $DB_USERNAME para la base $BASE"
mysql --protocol=socket -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOSQL
CREATE USER IF NOT EXISTS '${DB_USERNAME}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USERNAME}'@'%' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES, CREATE VIEW, SHOW VIEW, TRIGGER, LOCK TABLES, EXECUTE ON \`${BASE}\`.* TO '${DB_USERNAME}'@'%';
FLUSH PRIVILEGES;
EOSQL
