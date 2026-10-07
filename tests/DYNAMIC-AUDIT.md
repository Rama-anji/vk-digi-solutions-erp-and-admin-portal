# Populated database audit — 22 September 2026

The local MariaDB `vkd_erp_v2` database now retains fictional DEMO and QA records. Existing portal layouts and legacy PHP source files were preserved. Production assets were rebuilt in `dist`.

## Persistent demo data

`C:\xampp\php\php.exe database\seed-demo.php` creates three clients, two services (monthly and custom 45-day), three subscriptions (expired, expiring soon, active), three quotations, three invoices (overdue, partial, paid), three projects, twelve tasks across all board states, three employees, three vendors and bills, three recurring expenses, infrastructure and encrypted vault entries, a Facebook page with three leads, three custom tables and three saved HR examples. Commercial documents are indexed into Files & Drive automatically.

The script is CLI-only, transactional, restricted to the configured application database, and repeat-safe. It preserves subsequent edits. Demo dates are relative to the first run. Addresses use example.invalid; automatic demo renewal, vendor entry and lead greetings are disabled. It sends no external messages. QA records from workflow tests are also retained as requested.

## Fixes

- Custom quotation services now carry their saved duration through initial selection, catalogue selection and added lines. Half-yearly and one-time duration defaults are also correct. A custom billing cycle always exposes its duration input.
- Editing a completed task preserves its original completion timestamp; reopening clears it.
- Partial Facebook client mapping updates use the saved page and reject forms belonging to another page.
- Legacy PHP module bookmarks and clean module URLs now redirect to the corresponding authenticated portal screen. Old add-client and create-invoice links retain their creation intent. Standalone legacy PHP source and its separate database remain intact; legacy routes now use the connected application.
- Sidebar buttons retain stable accessible names when populated data adds alert badges; counts remain available as accessible descriptions. Styling is unchanged.

## Verified

| Area | Result |
|---|---|
| TypeScript, production build, PHP syntax, 312-field schema mapping | Passed |
| API CRUD, custom fields, taxes/discounts, conversion and retry protection | Passed |
| All 16 production navigation screens with populated data | Passed; screenshots in test-results/demo |
| Original login styling and controls, desktop/mobile login, directory editors | Passed |
| Seven HR templates, invoice/quotation editing and browser uploads | Passed |
| Invoice, quotation and HR PDF downloads; saved HR history | Passed |
| Real file byte round trip, vault reveal, cross-tab refresh, logout | Passed |
| Import rollback, invalid item rollback, CSRF/authentication and private-file protection | Passed |
| Encryption, month-end/leap-day renewal and queue deduplication | Passed |
| Signed webhook validation, receipts and inbound deduplication | Passed with local synthetic callbacks; original settings restored |
| Custom service selection and 45-day conversion regression | Passed |
| Task completion and partial mapping regressions | Passed; test writes rolled back |

Commands run: `functional.mjs`, `api-errors.mjs`, `page-editors.mjs`, `browser-flows.mjs`, `ui-restoration.mjs`, `production-smoke.mjs`, `demo-ui.mjs`, `backend-checks.php`, `webhook-checks.php`, and `edge-cases.php` under tests, plus build/lint and database field coverage. The demo seed was run twice with identical row counts.

## Limits

Real SMTP delivery, WhatsApp delivery and Facebook synchronization remain unverified without configured external accounts. Local failure handling and signed webhook behavior passed. No external message was sent. Desktop module screenshots and mobile login were covered; this is not exhaustive mobile coverage of every module or a guarantee that every possible input works. The build passes with a large JavaScript bundle warning. Invoice payment status remains manually editable; these tests do not establish a full bank/payment reconciliation workflow.

Open the application at http://localhost/vk-digi-solutions-erp-%26-admin-portal/ . Credentials remain in the existing private `.storage/initial-login.txt` file.
