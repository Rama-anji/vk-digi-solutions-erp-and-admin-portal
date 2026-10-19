-- VK Digi Solutions ERP v2: 23 tables covering all current UI data models.
-- Fresh install only, NOT a migration. See database/README.md and UI-FIELD-MAP.md.
-- MariaDB 10.4+ / MySQL 8.0.16+. Never overwrites an existing database.
-- No DROP, fake users, or demo business data. Import without --force.
CREATE DATABASE `vkd_erp_v2` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vkd_erp_v2`;
SET NAMES utf8mb4;
SET SESSION sql_mode='STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET time_zone='+00:00';

CREATE TABLE `admins` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL COMMENT 'PHP password_hash output',
role ENUM('Super Admin','Admin','Finance Manager','Project Manager','HR Executive') NOT NULL DEFAULT 'Admin',
status ENUM('Active','Inactive','Suspended') NOT NULL DEFAULT 'Active',
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE `facebook_pages` (
page_id VARCHAR(100) PRIMARY KEY, page_name VARCHAR(255) NOT NULL,
category VARCHAR(150) NULL, followers_count VARCHAR(50) NULL,
lead_forms JSON NOT NULL COMMENT 'Array: {form_id,form_name,leads_count}; provider count',
CHECK (JSON_TYPE(lead_forms)='ARRAY')
) ENGINE=InnoDB;

CREATE TABLE `clients` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, client_code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
client_type ENUM('Corporate','Government','Retail','Startup','NGO') NOT NULL DEFAULT 'Corporate',
contact_person VARCHAR(100) NOT NULL, email VARCHAR(150) NOT NULL, mobile VARCHAR(25) NOT NULL,
city VARCHAR(80) NULL, address TEXT NULL, source VARCHAR(80) NULL,
status ENUM('Active','Inactive','Lead','Archived') NOT NULL DEFAULT 'Active',
start_date DATE NULL, notes TEXT NULL, custom_fields JSON NULL COMMENT 'Array: {id,name,value}',
fb_page_id VARCHAR(100) NULL, fb_form_id VARCHAR(100) NULL,
fb_auto_whatsapp BOOLEAN NOT NULL DEFAULT FALSE, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
KEY idx_clients_status (status), KEY idx_clients_email (email),
FOREIGN KEY (fb_page_id) REFERENCES facebook_pages (page_id),
CHECK (custom_fields IS NULL OR JSON_TYPE(custom_fields)='ARRAY'),
CHECK (fb_form_id IS NULL OR fb_page_id IS NOT NULL), CHECK (fb_auto_whatsapp IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE `services_catalog` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_name VARCHAR(150) NOT NULL, category VARCHAR(150) NOT NULL,
default_rate DECIMAL(14,2) NOT NULL DEFAULT 0, billing_frequency ENUM('Monthly','Quarterly','Half-Yearly','Yearly','Custom','One-Time') NOT NULL,
custom_duration VARCHAR(255) NULL, description TEXT NULL,
status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
CHECK (default_rate>=0),
CHECK (billing_frequency<>'Custom' OR (custom_duration IS NOT NULL AND CHAR_LENGTH(TRIM(custom_duration))>0))
) ENGINE=InnoDB;

CREATE TABLE `client_subscriptions` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, client_id INT UNSIGNED NOT NULL, service_id INT UNSIGNED NOT NULL,
billing_cycle ENUM('Monthly','Quarterly','Half-Yearly','Yearly','Custom','One-Time') NOT NULL, start_date DATE NOT NULL, expiry_date DATE NOT NULL,
custom_duration VARCHAR(255) NULL,
amount DECIMAL(14,2) NOT NULL,
status ENUM('Active','Expiring Soon','Expired','Cancelled') NOT NULL DEFAULT 'Active',
payment_status ENUM('Paid','Unpaid') NOT NULL DEFAULT 'Unpaid',
current_period_start DATE NULL, billing_anchor_day TINYINT UNSIGNED NULL,
created_at DATETIME NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
auto_renew BOOLEAN NOT NULL DEFAULT TRUE,
FOREIGN KEY (client_id) REFERENCES clients (id), FOREIGN KEY (service_id) REFERENCES services_catalog (id),
KEY idx_sub_expiry (status,expiry_date),
CHECK (amount>=0), CHECK (expiry_date>=start_date), CHECK (auto_renew IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE `quotations` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, quotation_number VARCHAR(50) NOT NULL UNIQUE, client_id INT UNSIGNED NOT NULL,
title VARCHAR(255) NOT NULL, `date` DATE NOT NULL, valid_until DATE NOT NULL,
status ENUM('Draft','Sent','Pending','Approved','Rejected') NOT NULL DEFAULT 'Draft',
discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0, gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
notes TEXT NULL, terms_conditions TEXT NULL,
custom_fields JSON NULL COMMENT 'Array: {id,field_name,field_value}',
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
UNIQUE KEY uq_quote_client (id,client_id), FOREIGN KEY (client_id) REFERENCES clients (id),
CHECK (discount_amount>=0), CHECK (gst_rate BETWEEN 0 AND 100),
CHECK (valid_until>=`date`), CHECK (custom_fields IS NULL OR JSON_TYPE(custom_fields)='ARRAY')
) ENGINE=InnoDB;

CREATE TABLE `invoices` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, invoice_number VARCHAR(50) NOT NULL UNIQUE, client_id INT UNSIGNED NOT NULL,
quotation_id INT UNSIGNED NULL UNIQUE COMMENT 'One invoice per converted quotation',
payment_status ENUM('Paid','Partial','Pending','Overdue') NOT NULL DEFAULT 'Pending',
due_date DATE NOT NULL, created_at DATETIME NOT NULL COMMENT 'UI editable invoice issue date',
notes TEXT NULL, gst_rate DECIMAL(5,2) NOT NULL DEFAULT 18,
discount_amount DECIMAL(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount>=0),
FOREIGN KEY (client_id) REFERENCES clients (id),
FOREIGN KEY (quotation_id,client_id) REFERENCES quotations (id,client_id),
UNIQUE KEY uq_invoice_client (id,client_id),
KEY idx_invoice_due (payment_status,due_date), CHECK (gst_rate BETWEEN 0 AND 100)
) ENGINE=InnoDB;

CREATE TABLE `commercial_items` (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
ui_id VARCHAR(100) NOT NULL COMMENT 'UI string ID scoped to owner',
quotation_id INT UNSIGNED NULL, invoice_id INT UNSIGNED NULL, position INT UNSIGNED NOT NULL,
service_id INT UNSIGNED NULL, service_name VARCHAR(255) NULL COMMENT 'Quoted service label',
description TEXT NOT NULL, quantity DECIMAL(14,4) NOT NULL, unit VARCHAR(50) NULL,
unit_price DECIMAL(14,2) NOT NULL,
amount DECIMAL(28,2) GENERATED ALWAYS AS (ROUND(quantity*unit_price,2)) VIRTUAL,
hsn_sac VARCHAR(30) NULL, billing_cycle ENUM('Monthly','Quarterly','Half-Yearly','Yearly','Custom','One-Time') NULL,
service_duration VARCHAR(255) NULL, custom_duration VARCHAR(255) NULL, start_date DATE NULL,
UNIQUE KEY uq_quote_item (quotation_id,ui_id), UNIQUE KEY uq_invoice_item (invoice_id,ui_id),
UNIQUE KEY uq_quote_position (quotation_id,position), UNIQUE KEY uq_invoice_position (invoice_id,position),
FOREIGN KEY (quotation_id) REFERENCES quotations (id), FOREIGN KEY (invoice_id) REFERENCES invoices (id), FOREIGN KEY (service_id) REFERENCES services_catalog (id),
CHECK ((quotation_id IS NOT NULL)+(invoice_id IS NOT NULL)=1),
CHECK (quantity>=0 AND unit_price>=0)
) ENGINE=InnoDB;

CREATE TABLE `payments_received` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, invoice_id INT UNSIGNED NULL,
unallocated_client_id INT UNSIGNED NULL COMMENT 'Only advances not allocated to an invoice',
amount_received DECIMAL(14,2) NOT NULL,
payment_method ENUM('UPI / NetBanking','NEFT / RTGS','Credit / Debit Card','Cheque','Cash','Stripe / Razorpay') NOT NULL,
transaction_ref VARCHAR(100) NULL, payment_date DATE NOT NULL, notes TEXT NULL,
receipt_key VARCHAR(64) NULL,
UNIQUE KEY uq_receipt_key(receipt_key),
reconciled_at DATETIME NULL, bank_reference VARCHAR(100) NULL,
voided_at DATETIME NULL, void_reason VARCHAR(500) NULL,
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (invoice_id) REFERENCES invoices (id), FOREIGN KEY (unallocated_client_id) REFERENCES clients (id),
CHECK ((invoice_id IS NOT NULL)+(unallocated_client_id IS NOT NULL)=1), CHECK (amount_received>0)
) ENGINE=InnoDB;

CREATE TABLE `vendors` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vendor_name VARCHAR(150) NOT NULL, category VARCHAR(150) NOT NULL,
contact_person VARCHAR(100) NOT NULL, phone VARCHAR(25) NOT NULL, email VARCHAR(150) NOT NULL,
services_offered TEXT NULL, status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active'
) ENGINE=InnoDB;

CREATE TABLE `recurring_vendor_expenses` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vendor_id INT UNSIGNED NOT NULL,
expense_title VARCHAR(255) NOT NULL, category VARCHAR(150) NOT NULL, amount DECIMAL(14,2) NOT NULL,
frequency ENUM('Monthly','Quarterly','Yearly') NOT NULL, day_of_month TINYINT UNSIGNED NOT NULL,
next_run_date DATE NOT NULL, auto_entry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
last_generated_date DATE NULL, notes TEXT NULL,
UNIQUE KEY uq_rec_vendor (id,vendor_id), KEY idx_rec_due (auto_entry_enabled,next_run_date),
FOREIGN KEY (vendor_id) REFERENCES vendors (id),
CHECK (amount>=0), CHECK (day_of_month BETWEEN 1 AND 31), CHECK (auto_entry_enabled IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE `vendor_bills` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, vendor_id INT UNSIGNED NOT NULL,
project_name VARCHAR(255) NOT NULL COMMENT 'UI free-text expense label, not a project FK',
total_amount DECIMAL(14,2) NOT NULL, advance_paid DECIMAL(14,2) NOT NULL DEFAULT 0,
pending_balance DECIMAL(14,2) GENERATED ALWAYS AS (GREATEST(total_amount-advance_paid,0)) VIRTUAL,
status VARCHAR(10) GENERATED ALWAYS AS (CASE WHEN advance_paid>=total_amount THEN 'Paid' WHEN advance_paid>0 THEN 'Partial' ELSE 'Pending' END) VIRTUAL,
bill_date DATE NOT NULL, recurring_expense_id INT UNSIGNED NULL,
recurrence_date DATE NULL COMMENT 'Scheduled occurrence; independent of editable bill date',
UNIQUE KEY uq_rec_occurrence (recurring_expense_id,recurrence_date),
FOREIGN KEY (vendor_id) REFERENCES vendors (id),
FOREIGN KEY (recurring_expense_id,vendor_id) REFERENCES recurring_vendor_expenses (id,vendor_id),
CHECK (total_amount>=0 AND advance_paid>=0),
CHECK ((recurring_expense_id IS NULL AND recurrence_date IS NULL) OR (recurring_expense_id IS NOT NULL AND recurrence_date IS NOT NULL))
) ENGINE=InnoDB;

CREATE TABLE `projects` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, project_title VARCHAR(180) NOT NULL, client_id INT UNSIGNED NOT NULL,
assigned_to VARCHAR(100) NOT NULL COMMENT 'UI free-text assignee, may not be an employee',
priority ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium', status ENUM('Pending','In Progress','Review','Completed') NOT NULL DEFAULT 'Pending',
due_date DATE NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
description TEXT NULL, budget DECIMAL(14,2) NULL,
deadline_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE, alert_threshold_days INT UNSIGNED NOT NULL DEFAULT 3,
lead_email VARCHAR(150) NULL, alert_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
FOREIGN KEY (client_id) REFERENCES clients (id), KEY idx_project_due (status,due_date),
UNIQUE KEY uq_project_client (id,client_id),
CHECK (budget IS NULL OR budget>=0), CHECK (deadline_alerts_enabled IN (0,1) AND alert_acknowledged IN (0,1))
) ENGINE=InnoDB;

CREATE TABLE `tasks` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, project_id INT UNSIGNED NOT NULL, task_title VARCHAR(200) NOT NULL,
description TEXT NULL, assigned_to VARCHAR(100) NOT NULL,
priority ENUM('Low','Medium','High','Urgent') NOT NULL DEFAULT 'Medium', status ENUM('Pending','In Progress','Review','Completed') NOT NULL DEFAULT 'Pending',
due_date DATE NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
tags JSON NULL COMMENT 'Array of strings', estimated_hours DECIMAL(10,2) NULL, completed_at DATETIME NULL,
FOREIGN KEY (project_id) REFERENCES projects (id), KEY idx_task_board (project_id,status),
CHECK (estimated_hours IS NULL OR estimated_hours>=0), CHECK (tags IS NULL OR JSON_TYPE(tags)='ARRAY')
) ENGINE=InnoDB;

CREATE TABLE `employees` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, emp_code VARCHAR(30) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL,
email VARCHAR(150) NOT NULL UNIQUE, phone VARCHAR(25) NOT NULL, designation VARCHAR(100) NOT NULL,
department VARCHAR(80) NOT NULL, joining_date DATE NOT NULL, salary DECIMAL(14,2) NOT NULL,
bank_details TEXT NULL, status VARCHAR(50) NOT NULL DEFAULT 'Active', CHECK (salary>=0)
) ENGINE=InnoDB;

CREATE TABLE `website_infrastructure` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, client_id INT UNSIGNED NOT NULL, domain_name VARCHAR(253) NOT NULL,
registrar VARCHAR(100) NOT NULL, domain_expiry DATE NOT NULL, hosting_provider VARCHAR(100) NOT NULL,
hosting_expiry DATE NOT NULL, ssl_status ENUM('Active','Expiring Soon','Expired','Self-Signed','None') NOT NULL DEFAULT 'Active',
ssl_expiry DATE NULL, server_ip VARCHAR(45) NULL, cpanel_user VARCHAR(80) NULL,
UNIQUE KEY uq_client_domain (client_id,domain_name), FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB;

CREATE TABLE `credential_vault` (
id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, client_id INT UNSIGNED NOT NULL, account_title VARCHAR(120) NOT NULL,
service_type ENUM('cPanel / Hosting','WordPress / CMS','Database','Cloudflare / DNS','Payment Gateway','Social Media','Email / SMTP','Custom App') NOT NULL,
username VARCHAR(120) NOT NULL, encrypted_password TEXT NOT NULL COMMENT 'Authenticated encryption envelope; external key',
notes TEXT NULL, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (client_id) REFERENCES clients (id)
) ENGINE=InnoDB;

CREATE TABLE `documents` (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, ui_id VARCHAR(100) NULL UNIQUE,
client_id INT UNSIGNED NULL, employee_id INT UNSIGNED NULL, project_id INT UNSIGNED NULL,
quotation_id INT UNSIGNED NULL, invoice_id INT UNSIGNED NULL,
file_name VARCHAR(255) NULL, notes TEXT NULL,
category ENUM('Quotation','Invoice','Uploaded Document','Custom Table','Facebook Leads','HR Document') NOT NULL,
file_type ENUM('pdf','doc','docx','xls','xlsx','table','image','other') NULL,
file_size VARCHAR(40) NULL COMMENT 'Exact UI display label',
uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, uploaded_by VARCHAR(150) NULL,
reference_type ENUM('quotation','invoice','custom_table','upload') NULL,
file_url TEXT NULL COMMENT 'Storage path/key, API authorizes downloads', tag VARCHAR(150) NULL,
doc_type ENUM('Offer Letter','Appointment Letter','Payslip','Relieving Letter','Experience Letter','NOC','F&F Statement') NULL,
generated_date DATE NULL,
document_data JSON NULL COMMENT 'CustomTableData OR complete HR template input snapshot',
FOREIGN KEY (client_id) REFERENCES clients (id), FOREIGN KEY (employee_id) REFERENCES employees (id),
FOREIGN KEY (project_id,client_id) REFERENCES projects (id,client_id),
FOREIGN KEY (quotation_id,client_id) REFERENCES quotations (id,client_id),
FOREIGN KEY (invoice_id,client_id) REFERENCES invoices (id,client_id),
KEY idx_documents_folder (client_id,category),
CHECK ((client_id IS NOT NULL)+(employee_id IS NOT NULL)=1),
CHECK ((category='HR Document' AND employee_id IS NOT NULL AND doc_type IS NOT NULL AND generated_date IS NOT NULL AND document_data IS NOT NULL AND project_id IS NULL AND quotation_id IS NULL AND invoice_id IS NULL)
 OR (category<>'HR Document' AND client_id IS NOT NULL AND ui_id IS NOT NULL AND file_name IS NOT NULL AND file_type IS NOT NULL AND doc_type IS NULL)),
CHECK (COALESCE((reference_type='quotation' AND quotation_id IS NOT NULL AND invoice_id IS NULL)
 OR (reference_type='invoice' AND invoice_id IS NOT NULL AND quotation_id IS NULL)
 OR ((reference_type IS NULL OR reference_type IN ('custom_table','upload')) AND invoice_id IS NULL AND quotation_id IS NULL),0)=1),
CHECK (document_data IS NULL OR JSON_TYPE(document_data)='OBJECT'),
CHECK (COALESCE(category<>'Custom Table' OR (document_data IS NOT NULL AND reference_type='custom_table'),0)=1)
) ENGINE=InnoDB;

CREATE TABLE `facebook_leads` (
id VARCHAR(100) PRIMARY KEY, client_id INT UNSIGNED NOT NULL,
fb_page_id VARCHAR(100) NOT NULL, form_id VARCHAR(100) NOT NULL,
ad_id VARCHAR(100) NULL, ad_name VARCHAR(255) NULL, campaign_name VARCHAR(255) NULL,
lead_name VARCHAR(150) NOT NULL, lead_phone VARCHAR(25) NOT NULL, lead_email VARCHAR(150) NOT NULL,
city VARCHAR(80) NULL, service_requested VARCHAR(255) NULL, budget VARCHAR(100) NULL,
custom_answers JSON NULL COMMENT 'Array: {question,answer}',
status ENUM('New','Contacted','Qualified','Proposal Sent','Converted','Lost') NOT NULL DEFAULT 'New',
created_time DATETIME NOT NULL, notes TEXT NULL,
FOREIGN KEY (client_id) REFERENCES clients (id), FOREIGN KEY (fb_page_id) REFERENCES facebook_pages (page_id),
KEY idx_lead_client (client_id,status,created_time),
CHECK (custom_answers IS NULL OR JSON_TYPE(custom_answers)='ARRAY')
) ENGINE=InnoDB;

CREATE TABLE `integration_settings` (
provider VARCHAR(50) PRIMARY KEY COMMENT 'whatsapp for current UI',
config JSON NOT NULL COMMENT 'Nonsecret WhatsAppConfig fields plus templates',
encrypted_secrets TEXT NULL COMMENT 'Encrypted api_token and webhook_verify_token; external key',
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
CHECK (JSON_TYPE(config)='OBJECT'),
CHECK (JSON_CONTAINS_PATH(config,'one','$.api_token','$.webhook_verify_token')=0)
) ENGINE=InnoDB;

CREATE TABLE `communications` (
id VARCHAR(100) PRIMARY KEY, channel ENUM('email','whatsapp') NOT NULL,
purpose ENUM('renewal','project_deadline','message') NOT NULL,
subscription_id INT UNSIGNED NULL, project_id INT UNSIGNED NULL,
lead_id VARCHAR(100) NULL, client_id INT UNSIGNED NULL COMMENT 'Direct client messages only; otherwise join owner',
recipient_name VARCHAR(150) NULL, recipient_phone VARCHAR(25) NULL, recipient_email VARCHAR(150) NULL,
template_used VARCHAR(150) NULL, subject VARCHAR(500) NULL, body LONGTEXT NOT NULL,
status ENUM('Queued','Processing','Sent','Delivered','Read','Failed') NOT NULL DEFAULT 'Queued',
direction ENUM('outbound','inbound') NOT NULL DEFAULT 'outbound',
triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, sent_at DATETIME NULL,
provider_message_id VARCHAR(150) NULL, urgency ENUM('critical','urgent','warning') NULL,
error_message TEXT NULL,
context JSON NULL COMMENT 'Historical renewal/project event snapshot; not live master data',
deduplication_key VARCHAR(190) NULL UNIQUE,
UNIQUE KEY uq_provider_message (channel,provider_message_id),
KEY idx_outbox (status,triggered_at), KEY idx_sub_message (subscription_id,triggered_at),
KEY idx_project_message (project_id,triggered_at), KEY idx_lead_message (lead_id,sent_at),
FOREIGN KEY (subscription_id) REFERENCES client_subscriptions (id), FOREIGN KEY (project_id) REFERENCES projects (id),
FOREIGN KEY (lead_id) REFERENCES facebook_leads (id), FOREIGN KEY (client_id) REFERENCES clients (id),
CHECK ((subscription_id IS NOT NULL)+(project_id IS NOT NULL)+(lead_id IS NOT NULL)+(client_id IS NOT NULL)<=1),
CHECK ((purpose='renewal' AND subscription_id IS NOT NULL AND channel='email') OR (purpose='project_deadline' AND project_id IS NOT NULL AND channel='email') OR purpose='message'),
CHECK (context IS NULL OR JSON_TYPE(context)='OBJECT')
) ENGINE=InnoDB;

CREATE TABLE `activity_logs` (
id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id INT UNSIGNED NULL,
action TEXT NOT NULL, timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES admins (id), KEY idx_activity_time (timestamp)
) ENGINE=InnoDB;

-- Read projections. Computed totals are never separately writable.
CREATE TABLE IF NOT EXISTS subscription_renewals (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 subscription_id INT UNSIGNED NOT NULL,
 previous_expiry DATE NOT NULL,
 period_start DATE NOT NULL,
 period_end DATE NOT NULL,
 billing_cycle VARCHAR(30) NOT NULL,
 custom_duration VARCHAR(255) NULL,
 amount DECIMAL(14,2) NOT NULL,
 currency CHAR(3) NOT NULL DEFAULT 'INR',
 invoice_id INT UNSIGNED NOT NULL,
 status ENUM('Pending Payment','Renewed','Failed') NOT NULL DEFAULT 'Pending Payment',
 attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
 last_attempt_at DATETIME NULL,
 last_error VARCHAR(500) NULL,
 renewed_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_subscription_period (subscription_id,previous_expiry),
 UNIQUE KEY uq_renewal_invoice (invoice_id),
 FOREIGN KEY (subscription_id) REFERENCES client_subscriptions(id),
 FOREIGN KEY (invoice_id) REFERENCES invoices(id),
 CHECK (amount>=0), CHECK (period_end>period_start)
) ENGINE=InnoDB;


CREATE SQL SECURITY INVOKER VIEW v_quotation_totals AS
SELECT q.id,COALESCE(SUM(i.amount),0) AS subtotal,
ROUND(GREATEST(COALESCE(SUM(i.amount),0)-q.discount_amount,0)*q.gst_rate/100,2) AS gst_amount,
GREATEST(COALESCE(SUM(i.amount),0)-q.discount_amount,0)+
ROUND(GREATEST(COALESCE(SUM(i.amount),0)-q.discount_amount,0)*q.gst_rate/100,2) AS grand_total
FROM quotations q LEFT JOIN commercial_items i ON i.quotation_id=q.id
GROUP BY q.id,q.discount_amount,q.gst_rate;

CREATE SQL SECURITY INVOKER VIEW v_quotations AS
SELECT q.*,c.name AS client_name,c.email AS client_email,c.mobile AS client_mobile,
CONCAT_WS(', ',NULLIF(c.address,''),NULLIF(c.city,'')) AS client_address,
t.subtotal,t.gst_amount,t.grand_total,
inv.id AS converted_invoice_id,inv.invoice_number AS converted_invoice_number
FROM quotations q JOIN clients c ON c.id=q.client_id JOIN v_quotation_totals t ON t.id=q.id
LEFT JOIN invoices inv ON inv.quotation_id=q.id;

CREATE SQL SECURITY INVOKER VIEW v_invoice_totals AS
SELECT inv.id,GREATEST(COALESCE(SUM(i.amount),0)-inv.discount_amount,0) AS total_amount,
ROUND(GREATEST(COALESCE(SUM(i.amount),0)-inv.discount_amount,0)*inv.gst_rate/100,2) AS gst_tax,
GREATEST(COALESCE(SUM(i.amount),0)-inv.discount_amount,0)+ROUND(GREATEST(COALESCE(SUM(i.amount),0)-inv.discount_amount,0)*inv.gst_rate/100,2) AS grand_total
FROM invoices inv LEFT JOIN commercial_items i ON i.invoice_id=inv.id
GROUP BY inv.id,inv.gst_rate,inv.discount_amount;

CREATE SQL SECURITY INVOKER VIEW v_invoices AS
SELECT inv.*,c.name AS client_name,q.quotation_number AS quotation_ref,t.total_amount,t.gst_tax,t.grand_total
FROM invoices inv JOIN clients c ON c.id=inv.client_id JOIN v_invoice_totals t ON t.id=inv.id
LEFT JOIN quotations q ON q.id=inv.quotation_id;

CREATE SQL SECURITY INVOKER VIEW v_tasks AS
SELECT t.*,p.project_title,p.client_id,c.name AS client_name
FROM tasks t JOIN projects p ON p.id=t.project_id JOIN clients c ON c.id=p.client_id;

CREATE SQL SECURITY INVOKER VIEW v_projects AS
SELECT p.*,c.name AS client_name,
(SELECT MAX(m.sent_at) FROM communications m WHERE m.project_id=p.id AND m.purpose='project_deadline' AND m.status IN ('Sent','Delivered','Read')) AS alert_sent_at
FROM projects p JOIN clients c ON c.id=p.client_id;

CREATE SQL SECURITY INVOKER VIEW v_subscriptions AS
SELECT s.id,s.client_id,s.service_id,s.billing_cycle,s.custom_duration,s.start_date,s.expiry_date,s.amount,s.auto_renew,s.payment_status,s.current_period_start,s.billing_anchor_day,s.created_at,s.updated_at,
CASE WHEN s.status='Cancelled' THEN 'Cancelled' WHEN s.expiry_date<CURRENT_DATE THEN 'Expired' WHEN DATEDIFF(s.expiry_date,CURRENT_DATE)<=15 THEN 'Expiring Soon' ELSE 'Active' END AS status,
c.name AS client_name,svc.service_name,svc.category,
DATEDIFF(s.expiry_date,CURRENT_DATE) AS days_remaining,
(SELECT MAX(m.sent_at) FROM communications m WHERE m.subscription_id=s.id AND m.purpose='renewal' AND m.status IN ('Sent','Delivered','Read')) AS last_email_sent_at,
COALESCE((SELECT CASE WHEN m.status IN ('Sent','Delivered','Read') THEN 'Sent' ELSE 'Queued' END
FROM communications m WHERE m.subscription_id=s.id AND m.purpose='renewal'
ORDER BY m.triggered_at DESC,m.id DESC LIMIT 1),'Not Triggered') AS email_status
FROM client_subscriptions s JOIN clients c ON c.id=s.client_id JOIN services_catalog svc ON svc.id=s.service_id;

CREATE SQL SECURITY INVOKER VIEW v_facebook_leads AS
SELECT l.*,c.name AS client_name,p.page_name AS fb_page_name,
CASE WHEN EXISTS (SELECT 1 FROM communications m WHERE m.lead_id=l.id AND m.channel='whatsapp' AND m.direction='inbound') THEN 'Replied'
WHEN EXISTS (SELECT 1 FROM communications m WHERE m.lead_id=l.id AND m.channel='whatsapp' AND m.status IN ('Delivered','Read')) THEN 'Delivered'
WHEN EXISTS (SELECT 1 FROM communications m WHERE m.lead_id=l.id AND m.channel='whatsapp' AND m.status='Sent') THEN 'Message Sent'
ELSE 'Not Sent' END AS whatsapp_status,
(SELECT MAX(m.sent_at) FROM communications m WHERE m.lead_id=l.id AND m.channel='whatsapp' AND m.status IN ('Sent','Delivered','Read')) AS last_whatsapp_at
FROM facebook_leads l JOIN clients c ON c.id=l.client_id JOIN facebook_pages p ON p.page_id=l.fb_page_id;

CREATE SQL SECURITY INVOKER VIEW v_payments_received AS
SELECT p.*,COALESCE(i.client_id,p.unallocated_client_id) AS client_id
FROM payments_received p LEFT JOIN invoices i ON i.id=p.invoice_id;

-- Legacy read aliases only; writes belong to the base tables.
CREATE SQL SECURITY INVOKER VIEW client_services_subscriptions AS SELECT * FROM client_subscriptions;
CREATE SQL SECURITY INVOKER VIEW hr_documents AS
SELECT id,employee_id,doc_type,document_data AS document_data_json,generated_date
FROM documents WHERE category='HR Document';

-- First admin must be provisioned with a real password_hash.
-- Schema alone does not connect the React UI or implement API/background jobs.
