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

php /var/www/html/scripts/render-init.php || echo "WARNING: database initialisation failed; starting the web server anyway." >&2

# Render's free plan has no cron jobs, so run the automation worker every minute in the background.
if [ "${RUN_AUTOMATION_LOOP:-1}" = "1" ]; then
    (while true; do php /var/www/html/api/worker.php || echo "Automation worker run failed." >&2; sleep 60; done) &
fi

exec apache2-foreground
