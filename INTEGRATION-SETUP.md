# Enter integration credentials

Sign in as owner and open **Integrations & Settings** in the sidebar. Enter credentials in the fields below, not in chat or source files. Click **Save settings** before checking. Blank saved password/token fields preserve the existing secret.

## Email / SMTP

Enter **SMTP host**, **SMTP port**, **Encryption**, **SMTP username**, **SMTP password**, and **Sender email** using your email provider's values. Typically the provider specifies 587/TLS or 465/SSL. An app password may be required by your provider.

Click **Save settings**, then **Check saved connection**. In **Authorized test email**, enter an inbox you control and click **Send one test email**. Confirm arrival in that inbox; connection success alone does not prove delivery. Enable **Send queued emails automatically** only when you are ready for queued messages to be sent.

### Moving SMTP to live hosting

SMTP settings are stored in `integration_settings` in the database. Passwords are encrypted using the application key in `api/config.local.php`. When migrating the database, preserve that original key securely; otherwise enter the SMTP credentials again in the live site's settings. Never put SMTP passwords in frontend code or `VITE_` variables.

The live PHP installation must have cURL with SMTP/SMTPS support, OpenSSL, a current trusted CA bundle, and outbound access to the provider's SMTP port. Certificate verification stays enabled. Run **Check saved connection** on the live server, then send a single test and confirm its arrival. Local success does not verify the live server's network access or inbox delivery.

For Zoho, confirm the account's SMTP hostname in its mail settings; it depends on the data center and account plan. SMTP code 535 means authentication was rejected. Check the full mailbox username and use an app-specific password when the account requires one. Official guidance: https://www.zoho.com/mail/help/zoho-smtp.html

For Linux hosting, schedule `php /absolute/path/to/api/worker.php` every minute through the hosting control panel after reviewing the queued messages and automatic-send settings. Use the live server's PHP path. The web application alone does not run this background worker.

## WhatsApp

Select **whatsapp**. Enter **WhatsApp Business Account ID**, **Phone number ID**, **Business phone number**, and **Meta access token** from your Meta WhatsApp account. The IDs are not telephone numbers.

Save and check the connection. For incoming callbacks, enter **Meta app secret** and **Webhook verify token**, and configure the displayed public HTTPS webhook address in Meta with the same verification token. A localhost address cannot receive public callbacks.

Use WhatsApp Hub to send an approved template to a recipient who authorized the test. Confirm delivery before enabling **Automatic greeting**.

## Facebook

Select **facebook**. Enter the Page access token and the app/webhook credentials needed by your setup. Save, enter the numeric **Page ID to check**, then check account access.

In **Files & Drive**, open the relevant client and map its Facebook Page and lead form. Synchronize leads and verify that they belong to the correct client. An account-access check alone does not verify lead permissions or webhook delivery.

## Payments

Open **Invoices & Billing**, select an invoice, and use **Record payment**. Choose this invoice or a client advance. Recorded receipts determine received amount, outstanding balance, and status. Advances can be applied to an invoice for the same client.

Use **Match statement** only after checking the transaction against your bank statement. This is manual reconciliation, not a bank feed. Use **Void receipt** with a reason for a mistaken entry; the history remains available in **Export receipts**.

Older manually marked Paid/Partial invoices retain their existing interpretation until actual historical receipts are entered. Enter the complete historical receipts when migrating those invoices to receipt tracking.

## Background automation

`scripts/install-automation.ps1` prepares the Windows task **VKD ERP Automation**, running `api/worker.php` every minute as SYSTEM. Installation is pending explicit approval. A recent worker heartbeat does not by itself prove that a scheduled task is installed.

The worker processes renewals, bills and reminder queues; external sending follows the saved automatic-send switches. Internal renewal updates the subscription record and does not renew a registrar or hosting account.
