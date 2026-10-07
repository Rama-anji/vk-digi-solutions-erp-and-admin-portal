# Payment and integration follow-up — 23 September 2026

- Production build and TypeScript checks passed.
- Production smoke test passed across all 16 pages, subfolder webhook links and private-file protection. PHP syntax checks passed for payment, integration and worker code.
- A manual worker run completed successfully with zero due renewals, bills, reminders or delivery failures and both automatic sending switches disabled. Its heartbeat was saved. This does not verify scheduled operation.
- `payment-checks.php`: 16 backend assertions passed; temporary changes rolled back. Covers exact partial balances, overpayment and sub-paise rejection, idempotent retries, protected status/client/deletion, advance allocation, reconciliation, and retained void history.
- `payments-ui.mjs`: owner login through logout passed. Covers partial receipt persistence, manual statement matching, advance allocation, reversal, CSV history, six viewport sizes, saved SMTP diagnostics, and protected API rejection after logout. Marked PAYMENT-QA dummy invoices/receipts are retained.
- Screenshots and the latest browser result are in `test-results/payments`.
- SMTP, WhatsApp and Facebook credentials remain unconfigured. No external test messages were sent. Live delivery, callbacks, and lead synchronization remain unverified.
- Windows SYSTEM task installation was rejected by automatic approval review pending explicit approval for persistent elevated execution. The installation script is prepared; the task is not installed.
- XAMPP services were initially stopped. Apache was started and MariaDB was brought up in a console process for verification. This is not verification of unattended startup after reboot.

See `INTEGRATION-SETUP.md` for credential entry and receipt instructions. Browser checks are local Chromium checks; they do not establish all-device compatibility.
