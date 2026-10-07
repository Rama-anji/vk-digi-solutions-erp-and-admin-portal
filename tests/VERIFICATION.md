# Local verification — 22 September 2026

## UI restoration

The original login layout was recovered from the downloaded project and reconnected to real authentication. Its brand header, centered card, navy/orange gradient, icons, field layout and orange sign-in button are preserved. Demo-password autofill was replaced with account guidance.

New administration directories, settings, popups and HR controls now follow the existing pages' navy/orange palette, rounded cards, compact typography and form styling. Existing dashboard, client, billing, quotation, file and project layouts were retained.

`node tests/ui-restoration.mjs` passed desktop/mobile login checks, real authentication/error handling, password visibility/help, directory editor opening/cancellation, settings fields and HR presentation. Screenshots were reviewed; production navigation through all 16 pages also passed. These checks do not add business records.

The connected runtime is React + PHP + XAMPP MariaDB 10.4.32, using `vkd_erp_v2` on port 3306. Apache and MySQL were restarted and the tests below verified the application after restart.

## Passed checks

- TypeScript checking and production build; PHP syntax checks for all API modules.
- Schema coverage: 312 fields in 27 UI interfaces, 22 physical tables and 11 views.
- Authenticated production navigation through all 16 sidebar pages, with no browser JavaScript errors. Repeated after removing test records to cover empty pages.
- Client creation/update/custom fields; service catalog/custom duration; subscription renewal; quotation items/discount/tax/custom fields; idempotent quotation-to-invoice conversion; vendor recurrence; project/task completion; employee/HR snapshots; infrastructure; encrypted vault; Facebook page/form/lead records; custom-table JSON persistence.
- Browser client form save and reload; quotation editor; invoice discount editor; actual file upload; seven HR templates; HR history; invoice, quotation and HR PDF signatures; vault reveal/close; modal cancellation; settings navigation; second-tab refresh; logout.
- Upload/download byte equality, saved display name/type/notes, executable-file rejection, authenticated downloads.
- Failed import and line-item update rollbacks, invalid CSRF and unauthenticated access rejection, private-file HTTP protection.
- Encryption at rest, credential redaction, month-end/leap-year calculations, repeat-safe automatic renewal, repeat-safe approved-template greeting queue.
- Webhook verification challenge, invalid-signature rejection, signed status updates, prevention of status regression and duplicate inbound messages. Temporary webhook secrets were restored.

## Cleanup and boundaries

QA business records and their uploaded files were removed. The v2 database retains its administrator, company/integration defaults and audit history. The pre-existing legacy database was not migrated or modified by this implementation.

Live Meta and SMTP delivery was not tested: account credentials have not been supplied. The application reports missing credentials and provider failures instead of simulating success. Enter credentials in Integrations & Settings, then verify delivery with the actual accounts.

Live refresh uses three-second polling. Automatic renewal advances internal subscription records; it does not charge customers or provision external services. Automation requires the development worker or a scheduled CLI worker.

The production build succeeds with a non-blocking large JavaScript chunk warning. Browser checks cover the listed workflows; they are not a claim that every possible combination of input, browser, permission or provider response has been exhaustively tested.
