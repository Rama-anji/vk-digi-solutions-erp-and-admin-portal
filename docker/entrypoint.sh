#!/bin/sh
set -eu

: "${PORT:=10000}"
: "${DB_HOST:?Set DB_HOST to the production MySQL hostname}"
: "${DB_NAME:?Set DB_NAME to the production database name}"
: "${DB_USER:?Set DB_USER to the production database user}"
: "${DB_PASSWORD:?Set DB_PASSWORD to the production database password}"
: "${APP_KEY:?Set APP_KEY to a base64 encoded 32 byte key}"

if [ "${#APP_KEY}" -lt 40 ]; then
    echo "APP_KEY must be a base64 encoded 32 byte key." >&2
    exit 1
fi

sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/*:10000/*:${PORT}/" /etc/apache2/sites-available/000-default.conf
mkdir -p /var/www/html/.storage/uploads /var/www/html/.storage/sessions
chown -R www-data:www-data /var/www/html/.storage

exec apache2-foreground
