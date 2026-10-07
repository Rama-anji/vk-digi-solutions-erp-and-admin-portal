# VK Digi Solutions ERP

The React panel uses the PHP API in `api/` and the XAMPP MariaDB database **vkd_erp_v2**. Records persist in the database. Open tabs refresh from the server every three seconds.

## Run locally

1. Start **Apache** and **MySQL** in XAMPP.
2. Run `npm.cmd install` if dependencies are missing.
3. Run `npm.cmd run dev`. Use the localhost URL printed by Vite. This also runs automation once per minute.
4. Read the initial login from **`.storage/initial-login.txt`**. Change the password in **Integrations & Settings** after signing in.

For the built app, run `npm.cmd run build` and open:

`http://localhost/vk-digi-solutions-erp-%26-admin-portal/`

XAMPP serves the build through `index.php`. For unattended automation without the development server, schedule `C:\xampp\php\php.exe` with argument `api\worker.php`, using this project as the working directory, once per minute. A database lock prevents overlapping workers.

## Where to enter credentials

Use **Integrations & Settings**:

- **Company**: legal name, address, tax identifiers, bank details, terms and authorized signatory. Previews and PDFs use these values.
- **Email / SMTP**: host, port, encryption, username, password and sender email. Enable automatic sending when ready; queued notices can also be sent manually from Renewals.
- **WhatsApp**: Business Account ID, phone number ID, access token, app secret, verification token and Graph API version.
- **Facebook**: access/page token, app secret, verification token and Graph API version. Map client pages and forms in **Files & Drive**.

Secrets are encrypted in `integration_settings.encrypted_secrets`; the browser receives presence flags only. Leaving a secret blank keeps its saved value. Database credentials and the encryption key are in **`api/config.local.php`**, excluded from exports and version control. Preserve this key when backing up or moving the database.

Meta callback: **`api/whatsapp_webhook.php`** under the project's public HTTPS address. Settings displays the local URL; localhost cannot receive Meta callbacks. Configure `messages` and/or `leadgen` subscriptions in Meta. Incoming events require a valid signature.

Saved WhatsApp templates may include an approved Meta payload:

```json
{
  "id": "greeting",
  "name": "lead_greeting",
  "category": "LEAD_GREETING",
  "label": "Lead greeting",
  "text": "Hello {{lead_name}}",
  "meta_template": {
    "name": "your_approved_template_name",
    "language": { "code": "en_US" },
    "components": [{ "type": "body", "parameters": [{ "type": "text", "text": "{{lead_name}}" }] }]
  }
}
```

Match the approved template's language and components. Automatic greetings require the global switch and each client's permission in WhatsApp settings. New imported Facebook leads queue one greeting each; the worker sends them. See [Meta's template reference](https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/types/TemplateObject/).

**Live external delivery is unverified because account credentials have not been supplied.** Missing credentials produce visible errors and failed records, never fabricated success.

## Database and automation

`db.sql` defines **22 tables and 11 views**. Quotation/invoice line items share a table; files, custom tables and HR snapshots share a documents table; communications share an outbox. Master names and totals are joined or calculated.

The existing **vkd_crm** database was preserved and has not been migrated. Standalone old PHP pages remain legacy files. The connected application is the React panel with `api/index.php`.

For fresh XAMPP setup, `C:\xampp\php\php.exe api\setup.php` creates the database, restricted runtime account, administrator and private config. Once configured, it applies additive schema extensions without replacing records. Do not re-import all SQL over existing data.

Automatic renewal advances internal subscription dates; it does not charge cards or renew external hosting/domain accounts. Recurring expenses create due bills once per occurrence. Actual expiry/deadline dates generate reminder queues. Automatic email requires its setting to be enabled.

Uploads use authenticated downloads. PDF/image uploads support previews. Commercial PDFs use saved records, custom tables retain structured sections and merged cells, and HR history stores employee/company snapshots. The source-code ZIP is a backend source bundle, not a complete deployment package.

## Verification

The latest company-owner walkthrough and remaining operational limits are documented in [tests/OWNER-AUDIT.md](tests/OWNER-AUDIT.md). Run `node tests/owner-journey.mjs` to repeat the browser workflow; it retains clearly marked fictional records.

Persistent fictional records can be added with `C:\xampp\php\php.exe database\seed-demo.php`. It uses stable DEMO markers, preserves existing records on reruns, and does not send messages or change integration settings. The September 22 populated-data audit is in [tests/DYNAMIC-AUDIT.md](tests/DYNAMIC-AUDIT.md).

Old PHP module bookmarks redirect to the corresponding connected portal screens. Original standalone PHP files are retained; their separate database is not migrated.

- `npm.cmd run lint`
- `npm.cmd run build`
- `node database/check-ui-coverage.mjs`
- `node tests/functional.mjs` — API workflows and every navigation page.
- `node tests/page-editors.mjs` — all 16 pages, seven HR templates, quote/invoice edits and browser uploads.
- `node tests/browser-flows.mjs` — forms, PDFs, popups, cross-tab refresh and logout.
- `node tests/api-errors.mjs` — rollback, upload fields, delivery failures and HTTP protection.
- `C:\xampp\php\php.exe tests/backend-checks.php` — encryption, dates, renewals and template payloads; rolls back its changes.
- `C:\xampp\php\php.exe tests/webhook-checks.php` — signed callbacks and duplicate prevention; restores settings.

Browser tests default to `http://localhost:3003`; set `TEST_URL` if the port changes. They use installed Playwright Chromium and the local initial-login file. Functional/browser tests create marked QA fixtures. Run `C:\xampp\php\php.exe tests\cleanup.php` after testing.

See [field coverage](database/UI-FIELD-MAP.md) and [database notes](database/README.md).
