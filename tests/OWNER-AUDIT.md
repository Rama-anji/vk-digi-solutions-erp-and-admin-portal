# Company-owner journey audit — 23 September 2026

## Verdict

The tested core owner journey passes from login through logout on the built local application. This is not a claim that every production requirement is complete: customer partial-payment reconciliation and real external-service delivery remain outside the verified working scope.

## Browser journey completed

The test uses actual forms and buttons for writes, and reads the authenticated API to verify persisted results. Fictional records are marked `OWNER QA` and retained in the database.

1. Incorrect credentials rejected; valid owner login opens the dashboard.
2. Register a client and reload to confirm persistence.
3. Create a service with a decimal currency rate.
4. Approve a quotation; verify automatic invoice/subscription creation and GST calculation: ₹10,000.55 becomes ₹11,800.65.
5. Download an invoice PDF; mark the invoice Paid and verify persistence.
6. Create a client project and a completed task; verify completion timestamp.
7. Create a vendor and a ₹5,000.25 bill with ₹1,500.10 advance; verify ₹3,500.15 pending.
8. Reject a ₹4,000 settlement; accept ₹3,500.15 and verify Paid/zero balance.
9. Create an employee, download a payslip PDF and save HR document history.
10. Save website infrastructure and a fictional encrypted credential; reveal it through the authorized UI.
11. Upload a client file; confirm exact downloaded bytes.
12. Renew the newly converted subscription; verify the expiry advances in the database.
13. Open company and SMTP settings without changing live configuration.
14. Reconcile the dashboard's receivable headline against unpaid invoice statuses and confirm overdue subscriptions appear in its renewal queue.
15. Sign out, reload, and verify the protected API returns HTTP 401.

`node tests/owner-journey.mjs` completed with `OWNER JOURNEY PASSED`, without unexpected browser errors or confirmation dialogs. Current evidence: `test-results/owner/latest.json` and `test-results/owner/dashboard.png`. Older failure artifacts may remain from discovery runs; the latest completed journey is authoritative.

## Defects corrected

- Vendor bill amount fields combined `min=1` and `step=500`, causing ordinary amounts such as ₹5,000 to fail browser validation. Currency inputs now permit two decimal places across bills, recurring expenses, service pricing, project budgets, invoice rates, quotation rates/discounts and subscription fees.
- Vendor settlements could exceed the outstanding bill because an HTML max on a non-submit button did not enforce validation. The UI now rejects overpayment, and the repository independently rejects cumulative advances above the bill total.
- The dashboard labeled total invoicing as Client Receivables. Its headline now shows the unpaid-status balance; total invoicing appears separately.
- Renewal warnings omitted expired subscriptions. Dashboard, navigation count and renewal queue now include non-cancelled subscriptions overdue or due within 15 days, using server-calculated days remaining.
- New invoice notes showed the literal `{company.legal_name}`. They now interpolate the configured company name.
- Custom-duration examples included unsupported text such as “Sprint”; examples now match the backend's accepted duration syntax.
- Client selects in administration forms now have explicit accessible names.

## Other verification

TypeScript checking and production build passed. Backend date/encryption/renewal checks and edge-case regressions passed, rolling back their temporary data. The vendor-overpayment regression is included in `tests/edge-cases.php`. Production navigation/private-file protection checks were rerun.

## Remaining boundaries for an owner

Follow-up: customer receipt entry, advance allocation, manual statement matching and void history are now implemented and tested. Dashboard/client balances use recorded partial amounts. See `PAYMENTS-AUTOMATION-VERIFICATION.md` for current results; the partial-receipts finding below records the original audit state.

- **Customer partial receipts:** the UI edits invoice payment status, but does not provide a complete receipt-entry, allocation and bank-reconciliation workflow. Receivable totals still treat Partial invoices as fully outstanding until marked Paid. Do not use this as a reconciled accounting ledger.
- **External delivery:** live SMTP email, WhatsApp delivery and Facebook synchronization were not performed. They require configured accounts and a separate delivery verification. No external messages were sent in this audit.
- **Renewal meaning:** internal renewal advances the subscription date; it does not pay for or renew a real registrar/hosting account.
- **Automation operation:** an unattended deployment still needs the documented worker schedule. A successful manual renewal is not evidence that a scheduler is running.
- Browser results are for the local Chromium/XAMPP environment and marked test data. They do not establish backup recovery, hosting-deployment behavior, all role permissions or real-device compatibility.
