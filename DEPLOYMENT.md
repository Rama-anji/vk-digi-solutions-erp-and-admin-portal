# Deploy on Render (free plan) with Aiven MySQL

1. Create an Aiven MySQL service. From its connection information, collect the host, port, database name, username and password. Use an empty database for a fresh installation.
2. In Render, create a Blueprint from this GitHub repository using `render.yaml`. It creates one free Docker web service.
3. Enter `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` from Aiven. The Aiven project CA certificate (public, not secret) is committed at `docker/aiven-ca.pem` and used via `DB_SSL_CA`; certificate verification is enabled. If the Aiven project changes, replace that file.
4. Render generates `APP_KEY` and `INITIAL_ADMIN_PASSWORD`. Keep `APP_KEY` unchanged after storing encrypted vault or integration secrets. The initial administrator email is `admin@vkdsolutions.com`.
5. On startup the container initialises an empty database from `db.sql` and creates the first administrator. Existing administrator credentials are preserved. If the database is unreachable, the web server still starts and the error is written to the Render logs.
6. Verify `/api/index.php?action=session` and sign in.

Free plan limits:
- The service sleeps after 15 minutes without traffic; the first request afterwards takes up to about a minute.
- There is no persistent disk: uploaded files are lost on every restart or redeploy.
- There are no cron jobs. The container runs `api/worker.php` every minute in the background while it is awake (set `RUN_AUTOMATION_LOOP=0` to disable).
- Aiven's free MySQL powers off when unused. Power it on in the Aiven console, then restart the Render service.

Do not import db.sql into an existing populated database. Consult database/README.md for migrations. Local `api/config.local.php` is excluded from Git and Docker; production uses environment variables.

References: https://render.com/docs/blueprint-spec and https://aiven.io/docs/products/mysql/howto/connect-with-php
