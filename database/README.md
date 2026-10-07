# Database for the current superadmin UI

`../db.sql` is the canonical schema. It defines **22 base tables and 11 read views** and targets a **new `vkd_erp_v2` database**. It does not drop, alter, or import records into the existing `vkd_erp` database. It is a fresh-install design, not a migration. There are no default passwords or invented production records.

The [field-by-field map](UI-FIELD-MAP.md) covers **312 fields in all 27 interfaces in `src/types.ts`**, including nested custom table rows and cells. [ui-field-map.json](ui-field-map.json) is the machine-readable equivalent. Forms, sidebar sections, print templates, notifications, and the infrastructure/vault forms were also reviewed. A field can be a stored column, a JSON member, a joined value, or a calculation; it does not need a duplicate physical column with the same name.

## Pages and sections

| UI page / section | Tables and read sources |
|---|---|
| Login, admin profile | `admins`; sessions remain server-side; no session table required for current PHP session storage |
| Dashboard, client account totals | `clients`, `v_invoices`, `vendor_bills`, `v_subscriptions`, `v_projects`; totals/counts grouped at query time |
| Clients: list, add, edit, details, CSV import | `clients`; custom fields in `custom_fields`; Facebook names joined from `facebook_pages` |
| Services: list, add, edit, archive, pricing | `services_catalog`; all UI categories accepted; Custom duration and status included |
| Renewals: list, create, renew, auto-renew toggle | `client_subscriptions`, `v_subscriptions` |
| Renewal email queue, history, preview | `communications`, `purpose='renewal'`, `channel='email'` |
| Invoices: ledger, builder, editor, preview, GST, payment state | `invoices`, `commercial_items`, `v_invoices`; `payments_received` supports actual payments/advances |
| Quotations: builder, preview, custom fields, status, conversion | `quotations`, `commercial_items`, `v_quotations`; conversion link stored only at `invoices.quotation_id` |
| Files: organization folders, uploads, categories, tags, project assignment | `documents`; folder is a grouping by client, not another table |
| Custom table editor: headers, sections, merged cells, formatting | `documents.document_data`, category `Custom Table` |
| Facebook pages, forms, lead import/list/detail, lead status | `facebook_pages`, `facebook_leads`, `v_facebook_leads` |
| Vendors: bills, ledger, settlement | `vendors`, `vendor_bills` |
| Recurring vendor costs: add, edit, schedule, auto-entry, run now | `recurring_vendor_expenses`, `vendor_bills.recurrence_date` |
| Web infrastructure | `website_infrastructure`; all fields named in the placeholder page |
| Credential vault | `credential_vault`; reversible authenticated encryption, not password hashes |
| Projects: create, board, detail, budget, deadline alerts | `projects`, `v_projects`, `communications` for deadline emails |
| Tasks: create, edit, board, tags, hours, completion | `tasks`, `v_tasks` |
| HR: employee selector, letters, payslips, NOC, PDF/print | `employees`, `documents` with category `HR Document`; `hr_documents` is a legacy read view |
| WhatsApp: settings, templates, send, logs, replies | `integration_settings`, `communications` |
| Topbar alert bell, renewal/project badges | Computed from current subscriptions/projects and message history |
| Company letterhead and fixed print-template text | Currently constants in UI. If made editable, use `integration_settings` with provider `company` and the object contract below |
| PHP/SQL explorer and download | Imports `db.sql` directly; schema source is not copied into TypeScript |

## Why 22 tables

The old 16-table schema omitted several complete modules. This design adds their storage while combining naturally related structures:

- **One `commercial_items` table** for invoice and quotation lines, with exactly one owner per row. They still have separate headers because their lifecycle and editable fields differ.
- **One `documents` table** for client files, custom matrices and HR documents. It stores metadata/content; binary files live in controlled file storage.
- **One `communications` table** for renewal emails, project alerts and WhatsApp history/outbox.
- **One `integration_settings` table** for settings and nested templates.
- Custom fields, page lead forms, lead answers, task tags and matrix cells stay in their owning record as JSON instead of adding many small tables.

Core searchable business entities and commercial lines remain relational. This is a practical compact design, not a claim that 22 is the mathematical minimum.

## No duplicated master data or writable totals

Client/vendor/project/page/form names are resolved through their IDs. Tasks inherit their client through the project. An invoice's quotation reference and a quotation's converted invoice are two directions of one foreign key. An allocated payment inherits its client from its invoice; only unallocated advances use `unallocated_client_id`.

Line amount is a generated value. Invoice/quotation totals are views over line items, and vendor pending balance/status are generated values. Do not write derived columns or trust submitted totals. Financial calculations use decimal arithmetic and two-decimal currency rounding; the current demo sometimes rounds tax to whole rupees, so the eventual adapter must use the server's returned totals consistently.

Quoted item names/prices are commercial terms, so they deliberately remain on the line even when the catalogue changes. `communications.context` is an immutable event-time snapshot, not a second editable client record. Its expiry, amount, recipient context and deadline remain accurate when the subscription/project later changes. A finalized HR document similarly snapshots template inputs. Ordinary joins show **current** client contact information; if immutable issued invoice/quotation PDFs are required, preserve the rendered file in `documents` instead of duplicating the live master fields on every record.

Invoice `payment_status` remains an explicit field because the current UI edits it directly. `payments_received` stores actual transactions. When payment APIs are implemented, update status and payment records atomically and define whether manual overrides remain allowed. Current demo dashboards treat only fully Paid invoices as paid; a real collection balance should sum actual payments, including partial receipts. Vendor settlement currently stores cumulative `advance_paid`; the UI has no individual vendor-payment history, and this schema does not invent one.

## JSON contracts and nested fields

JSON validity and object/array shape are checked in SQL. The API must validate member types, required keys and IDs before saving; these JSON collections are not protected by relational foreign keys.

| Column / key | Complete nested shape |
|---|---|
| `clients.custom_fields` | `[{id,name,value}]` |
| `quotations.custom_fields` | `[{id,field_name,field_value}]` |
| `facebook_pages.lead_forms` | `[{form_id,form_name,leads_count}]`; unique form IDs within page; `leads_count` is Meta's provider total, not necessarily the count of locally imported leads |
| `facebook_leads.custom_answers` | `[{question,answer}]` |
| `tasks.tags` | String array; normalize duplicate tags in API |
| `integration_settings.config`, provider `whatsapp` | `waba_id`, `phone_number_id`, `business_phone_number`, `default_country_code`, `auto_greeting_enabled`, `webhook_status`, `templates` |
| `templates[]` | `id`, `name`, `category`, `label`, `text`; template IDs unique within config; categories match `WhatsAppTemplate` |
| `integration_settings.encrypted_secrets` | Encrypted object holding `api_token`, `webhook_verify_token`; application key outside database. The browser must receive masked presence, not the saved secrets |
| `documents.document_data` for custom tables | `id`, `title`, `headlineKicker`, `description`, `theme`, `headlineAlign`, `columns`, `rows`, `created_at`, `updated_at` |
| `columns[]` | `id`, `header`, `width`, `align` |
| `rows[]` | `id`, `isSectionHeadline`, `headlineText`, `headlineSubtitle`, `headlineTheme`, `cells` |
| `rows[].cells[columnId]` | `id`, `content`, `rowSpan`, `colSpan`, `isHeader`, `align`, `bold`, `isMergedHidden` |
| `documents.document_data` for HR | Full template snapshot: employee name/code/email/phone/designation/department/joining date/salary/bank details; reference/date; probation months; location; salary month; basic/HRA/special allowance; PF/PT/TDS deductions; gross/deductions/net; relieving date; letter text; company/signature details |
| `communications.context`, renewal | `client_name`, `client_email`, `client_contact`, `service_name`, `category`, `amount`, `billing_cycle`, `expiry_date`, `days_remaining`, `auto_renew` |
| `communications.context`, project deadline | `project_title`, `client_name`, `assigned_to`, `lead_email`, `due_date`, `days_remaining` |
| Optional `integration_settings.config`, provider `company` | `legal_name`, `display_name`, `address`, `city`, `state`, `postal_code`, `country`, `email`, `phone`, `website`, `gstin`, `pan`, `cin`, `logo_url`, `bank_name`, `account_name`, `account_number`, `ifsc`, `upi_id`, `authorized_signatory`, `signature_url`, `stamp_url`, `default_terms`; these are currently print constants, not editable form fields |

Empty optional JSON arrays should be returned to the UI as `[]`. Custom table JSON preserves exact camelCase keys from the editor, including all cell formatting. Search, filters, open tabs, modal state, selection, drag state, print visibility, toasts, current date and calculated CSS badges are transient UI state and do not need database columns.

## Database guarantees and application rules

Database constraints enforce unique client/document/employee codes, one owner per commercial line and document, valid money/rates, valid billing/status choices, valid JSON containers, same-client quotation conversion and file/project links, and same-vendor recurring bills. Foreign keys use restrictive deletes: removing a referenced master record requires an intentional workflow, not automatic loss of invoices/files/history.

`commercial_items.ui_id` is scoped to its owner, so the same UI line ID may exist in a quotation and its invoice. `documents.ui_id` is the string file ID; HR uses the numeric document primary key. Import adapters must resolve displayed reference numbers into invoice/quotation IDs. The same custom table may have its own JSON ID distinct from the file ID, matching the current UI.

The future API must additionally:

1. Validate page/form membership and unique nested form/template IDs. Keep historical forms available when old leads reference them. Client page mappings are defaults; historical leads can reference an earlier page.
2. Validate JSON member shapes/enums and document category/reference consistency beyond the database ownership checks. Generate authorized file download URLs; never treat a browser URL as proof of upload.
3. Save commercial headers/items atomically. Convert a quotation in one transaction; lock it, require Approved status, create one invoice and copy the agreed line terms. The unique conversion key prevents retries from creating another invoice.
4. Schedule recurring expenses under a row lock; use `(recurring_expense_id, recurrence_date)` as the occurrence key. Clamp day 29/30/31 to the last valid day of each target month. Update `next_run_date` and `last_generated_date` in the same transaction. Importing SQL does not run a scheduler.
5. Generate stable `deduplication_key` values for reminder events and save provider IDs to deduplicate webhook retries. Failed sends remain failures. The API exposes the failure status and error details for retries.
6. Reset alert acknowledgement appropriately when project deadlines change; set/clear task `completed_at` with status transitions. The alert timestamp is derived from successful messages.
7. The local API stores and displays agency time (Asia/Kolkata), and sets the SQL session to +05:30. `days_remaining` uses the SQL session's current date; choose the agency timezone at request level for calendar-day dashboard queries.
8. Hash admin passwords with PHP `password_hash`; encrypt retrievable vault/API secrets with an authenticated cipher and keep the key outside the DB. The PHP API implements sending, encryption and provisioning; DDL alone does not.

## Installation and existing project compatibility

Import `db.sql` into a server using a database-creation account, via phpMyAdmin's SQL import or the MySQL/MariaDB CLI. It creates `vkd_erp_v2`. Do **not** use `--force`: an existing database is an error, not an invitation to continue. DDL is not transactionally rolled back; a failed partial installation requires inspection in the new database.

For shared hosting that pre-creates a prefixed database, make a deployment copy, remove the `CREATE DATABASE` statement and change `USE` to that empty database's exact name. Use a restricted runtime account for the application. Provision the first administrator separately with a real password hash.

The React app is connected to the PHP API in `api/` and the provisioned XAMPP database. Invoice/quotation totals come from `v_invoices` / `v_quotations`; the code explorer exports the current API sources without local credentials. The old standalone PHP pages and their `config.php` remain separate legacy files. Compatibility views are read-only projections, not a legacy migration. See the root README for running and configuring the connected app.

Existing live data needs a separate migration: map old quotation `Accepted` to `Approved`, old `quote_code` to `quotation_number`, deserialize legacy `items_json`, derive line rows from genuine invoice details, map old tax fields, and preserve the original data for reconciliation. Missing historical invoice line details cannot be reconstructed reliably from totals alone. This deliverable does not silently migrate or fabricate them.

## Verification

Run `node database/check-ui-coverage.mjs` to check field mappings against the current UI interfaces and physical columns. After reviewed UI/schema changes, `--write` regenerates the JSON and Markdown maps. This structural check cannot prove an API exists.

`database/validate-schema.php` is an integration test restricted to an isolated server at `127.0.0.1:33317` whose data directory ends in `.db-validation`. It creates a random test schema, imports the DDL, tests valid/invalid relationships, monetary projections, nested JSON round trips and message/recurrence deduplication, then drops only its own test schema. It refuses to run against the ordinary application server. Create the disposable server with XAMPP's `mysql_install_db.exe --datadir=<workspace>/.db-validation --port=33317`, start that directory's `my.ini` with `mysqld.exe --bind-address=127.0.0.1`, run the PHP test, and shut down the disposable instance afterwards.

Compatibility references: [MariaDB JSON](https://mariadb.com/docs/server/reference/data-types/string-data-types/json), [MariaDB generated columns](https://mariadb.com/docs/server/reference/sql-statements/data-definition/create/generated-columns), [MySQL enforced CHECK constraints from 8.0.16](https://dev.mysql.com/blog-archive/mysql-8-0-16-introducing-check-constraint/). MariaDB 10.4.32 is locally integration-tested; MySQL 8 compatibility is targeted but not tested on a MySQL server here.
