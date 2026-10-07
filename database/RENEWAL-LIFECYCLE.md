Renewal lifecycle implementation plan and deployment notes

Audit: React uses a full bootstrap snapshot and refreshes after writes; PHP uses PDO transactions, admin authentication, CSRF, receipt idempotency keys, an audit log, a single worker, and a communications outbox. There is no payment gateway callback or stored card mandate. Existing subscription payment flags are manual labels, not receipt evidence. Existing auto-renew ignores payment. The subscription view stores stale statuses; the directory displays service IDs. Reminder tests call maintenance, which can renew unrelated records.

Plan:
1. Add an immutable renewal-period ledger linked to existing invoices, retain all old subscription/payment fields and history, and add minimal current-period metadata.
2. Centralize date validation, period advancement, authoritative status/countdown, renewal preparation/payment verification, duplicate protection, and safe subscription edits/deletion.
3. Use the existing receipt workflow for payment, lock subscriptions/invoices, and allow one completed renewal per previous expiry. Auto-renew never charges a card: only fully receipted invoices (or zero-price periods) qualify.
4. Keep reminder scheduling at the existing 15-day threshold and one reminder per expiry; isolate admin-addressed test messages. Harden outbox claims against repeat delivery.
5. Wire existing pages to authoritative data, fix names/counts/filtering/statuses, provide payment/history access and busy states, then run rollback-isolated backend and browser tests.

Policy: early and late renewals extend from the previous expiry, preserving the established period policy; one payment buys exactly one period, never a catch-up loop. Monthly arithmetic clamps to month end while retaining the original billing anchor for later periods. INR is the existing application currency. A renewal rate is the total agreed amount; renewal invoices use zero additional tax so no unconfigured charge is added.

Legacy Paid/Unpaid flags are preserved in storage and exposed as legacy information; they do not fabricate receipts or authorize a renewal. Current renewal payment comes from the linked invoice's non-voided receipts. All financial history remains in existing receipts/invoices plus the new period ledger. Only cancelled subscriptions without paid flags or any renewal/communication history can be physically deleted.

Migration: run database/migrations/20260928-subscription-lifecycle.php with the same local migration privileges as existing migrations, before deploying the PHP/frontend changes. It is additive and rerunnable. A private pre-migration snapshot is stored in .storage/renewal-lifecycle-before. Existing paid time and amounts must remain unchanged. No historical renewal/payment records are inferred.

Rollback: stop the existing worker before reverting application code. Keep the new columns/table and all invoice/receipt/history records. Do not drop populated ledger tables or revert to the old unpaid auto-renew code. Export/restore from the private snapshot only as part of a reviewed recovery, never as a routine rollback (it could discard newer payments). Database DDL is not transactional in MariaDB; each migration step is idempotent.
