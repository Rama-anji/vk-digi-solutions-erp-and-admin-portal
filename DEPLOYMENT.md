# Deploy on Render with Aiven MySQL

1. Create an Aiven MySQL service. From its connection information, collect the host, port, database name, username, password, and CA certificate. Use an empty database for a fresh installation.
2. In Render, create a Blueprint from this GitHub repository using `render.yaml`. The blueprint includes a paid Starter web service with persistent uploads and a paid scheduled automation job; review the displayed charges before creating services.
3. Enter `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` from Aiven for both services. The Aiven project CA certificate (public, not secret) is committed at `docker/aiven-ca.pem` and used via `DB_SSL_CA`. Certificate verification is enabled. Do not commit credentials or certificates.
4. Render generates `APP_KEY` and `INITIAL_ADMIN_PASSWORD`; the automation job references the web service's application key. Keep APP_KEY unchanged after storing encrypted integrations. The initial administrator email is `admin@vkdsolutions.com`.
5. On first web startup, the application initializes an empty database from `db.sql` and creates the first administrator. Read the generated password privately from the Render environment settings. Existing administrator credentials are preserved. This is not an upgrade migration or a transfer of local data.
6. Verify `/api/index.php?action=session`, sign in, and confirm a saved record and upload survive a redeploy. Check the automation job logs after the web service initializes the schema.

Do not import db.sql into an existing populated database. Consult database/README.md for migrations. Local `api/config.local.php` is excluded from Git and Docker; production uses environment variables.

References: https://render.com/docs/blueprint-spec and https://aiven.io/docs/products/mysql/howto/connect-with-php
