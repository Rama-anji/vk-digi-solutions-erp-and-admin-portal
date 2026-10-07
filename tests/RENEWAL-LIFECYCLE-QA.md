# Renewal lifecycle implementation and QA — 2026-09-28

The Renewals dashboard, Subscription Records, Dashboard actions and client profile now consume the same subscription/payment data from `bootstrap`. Existing routes, Admin/Super Admin authorization, CSRF, invoice receipts, audit logging and worker are retained.

## Changed files

Backend: `api/subscriptions.php` (new lifecycle service); `api/actions.php`; `api/repository.php`; `api/index.php`; `api/payments.php`; `api/integrations.php`; `api/setup.php`.

Frontend: `src/App.tsx`; `src/types.ts`; `src/components/AdminTools.tsx`; `src/components/ClientServices.tsx`; `src/components/ClientsView.tsx`; `src/components/DashboardView.tsx`; `src/components/ExpiryNotice.tsx`; `src/components/RenewalPaymentStatus.tsx`; `src/components/RenewalsView.tsx`; new `src/components/RenewSubscriptionButton.tsx` and `src/components/SubscriptionAutoRenew.tsx`.

Schema/documentation: `db.sql`; new `database/migrations/20260928-subscription-lifecycle.sql` and `.php`; `database/RENEWAL-LIFECYCLE.md`; new `database/snapshot-renewal-audit.php` and `database/verify-renewal-preservation.php`; `database/validate-schema.php`; this report.

Tests: new `tests/subscription-lifecycle.php`, `tests/subscription-lifecycle-ui.mjs`, `tests/subscription-sandbox.php`, `tests/subscription-concurrent-worker.php`; updated `tests/backend-checks.php` and `tests/renewal-payment-status.mjs` (now runs receipt-backed lifecycle coverage instead of the obsolete editable Paid dropdown).

Generated output: `dist/index.html` and Vite's hashed JavaScript/CSS assets. Local test-only artifacts include `.db-validation` (isolated MariaDB data, HTTP access denied), `.storage/subscription-qa`, and the private original-record snapshot `.storage/renewal-lifecycle-before/records.json`. The public temporary browser runtime is removed after verification. These test artifacts are not deployment files.

## Schema and preservation

The additive, rerunnable migration adds nullable historical metadata (`current_period_start`, `billing_anchor_day`, `created_at`) and `updated_at`, preserves the existing legacy payment field, adds the `subscription_renewals` ledger linked to existing invoices, and permits email `Processing`. It refreshes subscription views. Unique subscription/previous-expiry and invoice keys prevent duplicated periods. Restrictive foreign keys preserve financial history. No existing payment or period was inferred or backfilled.

Migration ran successfully more than once. A field-by-field comparison against the pre-migration snapshot passed: **11 subscriptions, 4 receipts, 13 invoices, 4 communications**, with every original field unchanged and no records added or removed in these tables. Fresh-schema verification passed **45 checks, 23 tables, 11 views**.

Rollback: stop automation before reverting code; preserve the new ledger, columns and financial records. Do not restore the old unpaid auto-renew behavior or drop populated history. MariaDB DDL is not transactional; migration steps are rerunnable. See `database/RENEWAL-LIFECYCLE.md` for the audit and policy.

## APIs

Existing `api/index.php?action=...` routing remains:

- `bootstrap`: authoritative status, days/countdown, payment, eligibility, renewal history and dashboard counts.
- `renewal_prepare` (new): `{id, expected_expiry}` prepares/reuses one invoice and pending period.
- `renew`: `{id, expected_expiry}` verifies receipts and atomically completes that period; repeat requests return the completed state.
- `subscription_reminder_test` (new): `{id, request_key}` queues an idempotent test to the signed-in administrator.
- `save` / `delete`: validate relationships, dates, amount, cancellation, auto-renew and protected history.
- Existing payment APIs: record/allocate/reconcile receipts; prevent voiding receipts that funded completed periods.
- `email_send` / `email_batch`: persistent send claims, safe retry rules and truthful batch sent/failed/uncertain counts.

## Business rules and corrected bugs

- Asia/Kolkata server date determines Active, Expiring Soon (0–15 inclusive), Expired and Cancelled. Pending Payment, Ready to renew and Renewed describe the payment/renewal operation separately. Negative “Active” countdowns are removed; expired rows have their own filter.
- Calendar monthly/quarterly/half-yearly/yearly arithmetic clamps short months and preserves the billing anchor. Explicit expiry edits establish the correct day. Custom day/week periods advance exactly; month/year custom periods use calendar arithmetic.
- Both early and late renewal extend from **previous expiry**, one period per payment. Zero-price agreements can renew without a receipt. Rates remain decimal INR; receipt comparisons use integer paise. Renewal invoices use the agreed total with no additional unconfigured GST.
- Paid/Unpaid is derived from non-voided receipts on the linked renewal invoice. Changing a frontend label cannot authorize renewal. The next period becomes Unpaid after completion; the paid historical period remains visible. Legacy flags remain stored without inventing receipts.
- Subscription locks, invoice/receipt locks, transactions and unique period keys prevent double renewal. Receipt voiding follows the subscription lock order and cannot invalidate a completed period.
- Auto-renew persists independently of expiry. The existing worker advances only fully paid or zero-price periods. Unpaid attempts preserve expiry and create one pending-payment notice; repeated runs do not repeatedly charge or record the same failed attempt.
- Reminder scheduling retains the existing 15-day threshold and one production reminder per expiry, including overdue records. Test notices use a separate deduplication key and administrator recipient. They do not run maintenance or alter payments/expiry.
- Queued counts include only actual Queued subscription emails. Message locks and a persistent Processing claim prevent duplicate sends. Definitive rejection is Failed and retryable. A lost acknowledgement after upload remains Processing for provider-log verification. SMTP acceptance is labeled Sent, not Delivered. Batch results disclose partial failures.
- Subscription Records shows service names instead of foreign-key IDs. Search and auto/manual/status filters combine over the complete bootstrap dataset; this application has no subscription pagination.
- Period/client/service fields are protected once history exists; an issued invoice also fixes rate/cycle. Deletion requires cancellation and no paid flags, renewal or communication history. Client profile cancellation turns auto-renew off. Existing financial history is retained.
- Payment, renew, toggle, assignment and email actions show pending states and server errors; server responses refresh all affected views.

## Executed checks

Commands use `C:/xampp/php/php.exe` for PHP and `npm.cmd` on Windows.

| Command/check | Result |
| --- | --- |
| `npm.cmd run lint` | Pass (configured TypeScript no-emit check) |
| `npm.cmd run build` | Pass; existing large-bundle advisory remains |
| PHP `-l` on all changed PHP implementation, migration and test files | Pass |
| `php tests/subscription-lifecycle.php` | Pass: date boundaries/calendar/custom/anchors, invalid input, decimal rates, receipt idempotency, unpaid/paid renewal, early/late periods, protected history, auto-renew, reminder isolation/deduplication, counts and rollback |
| `php tests/backend-checks.php` | Pass, writes rolled back |
| `php tests/payment-checks.php` | Pass, writes rolled back |
| `php tests/edge-cases.php` | Pass, writes rolled back; includes custom quotation conversion and unrelated repository regressions |
| `php database/migrations/20260928-subscription-lifecycle.php` | Pass, including repeat execution |
| `php database/verify-renewal-preservation.php` | Pass, every original field unchanged |
| `php database/validate-schema.php` | Pass, 45 disposable-schema checks |
| `node tests/subscription-lifecycle-ui.mjs` | Pass, isolated database and local SMTP stub |

Browser/API checks cover unauthorized renewal/payment/delete/toggle/test, forged Paid rejection, timezone mismatch (Los Angeles browser), today/tomorrow/15/16/-1/-30 boundaries, search/no matches/manual/auto filters, service names, read-only payment in directory, actual receipt entry, renewal with an intentionally lost HTTP response, refresh/history, idempotent retry, mobile table scrolling, test-recipient isolation, invalid email, SMTP rejection/retry, lost SMTP acknowledgement, truthful partial batch failures, and two independent concurrent PHP renewal transactions producing one period. No browser runtime errors occurred. External icon-font requests were deliberately blocked in the browser fixture.

No separate package `test` or `type-check` command exists. The project-specific PHP and Playwright checks above were used. No external client emails or live payment-provider requests were sent.

## Operational limits

- There is no integrated charging gateway, stored mandate or payment webhook in this app; auto-renew consumes recorded receipts. Gateway callback testing is therefore inapplicable. Completed-renewal refunds/credits require an approved accounting process; no new refund system was invented.
- SMTP cannot guarantee exactly-once delivery after an ambiguous network failure. Such messages deliberately require provider-log verification before any manual recovery. Live SMTP credentials/provider delivery were not tested; protocol behavior was tested locally.
- The shared XAMPP MySQL process restarted during testing. Remaining browser/schema tests used an isolated server at port 33317. This work does not diagnose or repair that separate database-service stability issue.
- Existing large JavaScript bundle size remains a build advisory. No unrelated bundle redesign was included.

## Assignment follow-up
The local database was stopped when the save failure was investigated; it was restarted. The same no-date assignment payload then passed rollback-only checks on the application database for Yearly, Monthly, Custom and One-Time. Database connection errors now return 503 with an actionable MySQL message. All Subscriptions is the initial filter. Form defaults use the selected catalogue rate/cycle/custom duration and One-Time assignments disable auto-renew. The expanded browser suite passed real Monthly/Custom/One-Time saves, persisted client/service relationships, and the All default after refresh. Localhost login and Renewals loaded with no JavaScript runtime errors; the external icon stylesheet was deliberately blocked during automation. Type-check, PHP syntax check and production build passed.
