import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(path.join(root, 'db.sql'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/types.ts'), 'utf8');
const tables = new Map();
// Split SQL column definitions without splitting ENUMs, JSON paths or expressions.
function splitDefinitions(body) {
  const parts = []; let start = 0, depth = 0, quote = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) { if (ch === quote && body[i - 1] !== '\\') quote = ''; continue; }
    if (ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(body.slice(start, i)); start = i + 1; }
  }
  parts.push(body.slice(start)); return parts;
}
for (const match of sql.matchAll(/CREATE TABLE `?(\w+)`? \(\n([\s\S]*?)\n\) ENGINE/g)) {
  tables.set(match[1], new Set(splitDefinitions(match[2]).map(d => d.trim().match(/^`?(\w+)`?\s/)?.[1])
    .filter(n => n && !['KEY', 'UNIQUE', 'FOREIGN', 'CHECK', 'CONSTRAINT', 'PRIMARY'].includes(n))));
}
const stored = source => ({ kind: 'column', source });
const join = (source, note) => ({ kind: 'join', source, note });
const derived = (source, note) => ({ kind: 'calculated', source, note });
const json = (source, jsonPath, note = '') => ({ kind: 'JSON', source, path: jsonPath, note });
const ownerClient = 'Resolve communications owner: direct client_id, subscription.client_id, project.client_id, or lead.client_id.';
const specs = {
  Admin: { table: 'admins' },
  Client: { table: 'clients', overrides: {
    fb_page_name: join('facebook_pages.page_name', 'Join using clients.fb_page_id.'),
    fb_form_name: json('facebook_pages.lead_forms', '[form_id = clients.fb_form_id].form_name', 'Do not duplicate form names per client.')
  } },
  FacebookPageMapping: { table: 'facebook_pages' },
  FacebookLead: { table: 'facebook_leads', overrides: {
    client_name: join('clients.name', 'Join client_id.'), fb_page_name: join('facebook_pages.page_name', 'Join fb_page_id.'),
    form_name: json('facebook_pages.lead_forms', '[form_id = facebook_leads.form_id].form_name'),
    whatsapp_status: derived('communications.status', 'v_facebook_leads: inbound reply > delivered/read > sent > not sent.'),
    last_whatsapp_at: derived('communications.sent_at', 'v_facebook_leads: latest successful WhatsApp message for lead_id.')
  } },
  WhatsAppTemplate: { jsonColumn: 'integration_settings.config', prefix: 'templates[].' },
  WhatsAppConfig: { jsonColumn: 'integration_settings.config', overrides: {
    api_token: { kind: 'encrypted', source: 'integration_settings.encrypted_secrets', path: 'api_token', note: 'Encrypt server-side; browser receives masked presence only.' },
    webhook_verify_token: { kind: 'encrypted', source: 'integration_settings.encrypted_secrets', path: 'webhook_verify_token', note: 'Encrypt server-side; browser receives masked presence only.' }
  } },
  WhatsAppMessageLog: { table: 'communications', overrides: {
    client_id: derived('communications.client_id', ownerClient), client_name: join('clients.name', ownerClient),
    message_body: stored('communications.body')
  } },
  ServiceCatalog: { table: 'services_catalog' },
  QuotationLineItem: { table: 'commercial_items', overrides: { id: stored('commercial_items.ui_id'), amount: derived('commercial_items.amount', 'Generated ROUND(quantity * unit_price, 2).') } },
  QuotationCustomField: { jsonColumn: 'quotations.custom_fields', prefix: '[].' },
  Quotation: { table: 'quotations', overrides: {
    client_name: join('clients.name', 'v_quotations joins client_id.'), client_email: join('clients.email', 'v_quotations.'),
    client_mobile: join('clients.mobile', 'v_quotations.'), client_address: derived('clients.address', 'v_quotations concatenates address and city.'),
    items: join('commercial_items.quotation_id', 'Rows ordered by position; map QuotationLineItem.'),
    subtotal: derived('commercial_items.amount', 'v_quotation_totals: SUM(amount).'),
    gst_amount: derived('quotations.gst_rate', 'v_quotation_totals: ROUND(MAX(subtotal-discount_amount,0)*gst_rate/100,2).'),
    grand_total: derived('quotations.discount_amount', 'v_quotation_totals: MAX(subtotal-discount_amount,0)+gst_amount.'),
    converted_invoice_id: join('invoices.id', 'Find invoices.quotation_id = quotations.id.'),
    converted_invoice_number: join('invoices.invoice_number', 'Same invoice relation; do not store a second conversion link.')
  } },
  ClientSubscription: { table: 'client_subscriptions', overrides: {
    client_name: join('clients.name', 'v_subscriptions.'), service_name: join('services_catalog.service_name', 'v_subscriptions.'),
    category: join('services_catalog.category', 'v_subscriptions.'), days_remaining: derived('client_subscriptions.expiry_date', 'v_subscriptions: DATEDIFF(expiry_date,CURRENT_DATE).'),
    last_email_sent_at: derived('communications.sent_at', 'v_subscriptions: latest successful renewal email.'),
    email_status: derived('communications.status', 'v_subscriptions: latest renewal event, default Not Triggered. The API exposes actual failure status and error details for retry.')
  } },
  RenewalEmailNotification: { table: 'communications', overrides: {
    client_id: derived('client_subscriptions.client_id', 'Join through subscription_id.'),
    body_text: stored('communications.body'), simulated_delivery_id: stored('communications.provider_message_id')
  } },
  InvoiceItem: { table: 'commercial_items', overrides: {
    id: stored('commercial_items.ui_id'), desc: stored('commercial_items.description'), qty: stored('commercial_items.quantity'), rate: stored('commercial_items.unit_price')
  } },
  Invoice: { table: 'invoices', overrides: {
    amount_received: derived('payments_received.amount_received', 'Non-void invoice receipts; preserves manual Paid balances when no receipt history exists.'),
    balance_due: derived('payments_received.amount_received', 'Invoice grand total less non-void receipts, floored at zero.'),
    receipt_count: derived('payments_received.invoice_id', 'All receipt records, including voids, distinguish tracked invoices from legacy manual status.'),
    client_name: join('clients.name', 'v_invoices.'), quotation_ref: join('quotations.quotation_number', 'Resolve to invoices.quotation_id on write; reference must exist and belong to same client.'),
    items: join('commercial_items.invoice_id', 'Rows ordered by position; map InvoiceItem.'),
    total_amount: derived('commercial_items.amount', 'v_invoice_totals: MAX(SUM(amount)-discount_amount,0).'),
    gst_tax: derived('invoices.gst_rate', 'v_invoice_totals: ROUND(discounted total_amount*gst_rate/100,2).'),
    grand_total: derived('commercial_items.amount', 'v_invoice_totals: total_amount+gst_tax.')
  } },
  Vendor: { table: 'vendors' },
  VendorBill: { table: 'vendor_bills', overrides: {
    vendor_name: join('vendors.vendor_name', 'Join vendor_id.'),
    pending_balance: derived('vendor_bills.pending_balance', 'Generated MAX(total_amount-advance_paid,0).'),
    status: derived('vendor_bills.status', 'Generated Paid/Partial/Pending from total_amount and advance_paid.')
  } },
  RecurringVendorExpense: { table: 'recurring_vendor_expenses', overrides: { vendor_name: join('vendors.vendor_name', 'Join vendor_id.') } },
  Employee: { table: 'employees' },
  HrDocument: { table: 'documents', overrides: { employee_name: join('employees.name', 'Join employee_id. category=HR Document.') } },
  ProjectDeadlineNotification: { table: 'communications', overrides: { client_name: json('communications.context', 'client_name', 'Historical event snapshot.') } },
  Project: { table: 'projects', overrides: {
    client_name: join('clients.name', 'v_projects.'), alert_sent_at: derived('communications.sent_at', 'v_projects: latest successful project deadline email.')
  } },
  Task: { table: 'tasks', overrides: {
    project_title: join('projects.project_title', 'v_tasks.'), client_id: join('projects.client_id', 'v_tasks; no duplicate client_id in tasks.'),
    client_name: join('clients.name', 'v_tasks joins through project.')
  } },
  TableCellData: { jsonColumn: 'documents.document_data', prefix: 'rows[].cells.<columnId>.' },
  CustomTableRow: { jsonColumn: 'documents.document_data', prefix: 'rows[].' },
  CustomTableData: { jsonColumn: 'documents.document_data' },
  StoredClientFile: { table: 'documents', overrides: {
    id: stored('documents.ui_id'), client_name: join('clients.name', 'Join client_id; folders are grouped by client, no folder table.'),
    project_name: join('projects.project_title', 'Join project_id.'),
    table_data: stored('documents.document_data'),
    reference_id: derived('documents.reference_type', 'quotation: quotations.quotation_number; invoice: invoices.invoice_number; custom_table: document_data.id; upload: omitted. Resolve number/id to FK on write.')
  } }
};
for (const field of ['client_name','client_email','client_contact','service_name','category','amount','billing_cycle','expiry_date','days_remaining','auto_renew']) {
  specs.RenewalEmailNotification.overrides[field] = json('communications.context', field, 'Immutable event-time display snapshot; live values come from subscription and client joins.');
}
for (const field of ['project_title','assigned_to','lead_email','due_date','days_remaining']) {
  specs.ProjectDeadlineNotification.overrides[field] = json('communications.context', field, 'Immutable event-time display snapshot.');
}
const coverage = {};
for (const match of types.matchAll(/export interface (\w+) \{\n([\s\S]*?)\n\}/g)) {
  const name = match[1], spec = specs[name];
  if (!spec) throw new Error(`Unmapped UI interface ${name}`);
  coverage[name] = {};
  for (const prop of match[2].matchAll(/^  (\w+)\??:/gm)) {
    const field = prop[1];
    const entry = spec.overrides?.[field] ?? (spec.jsonColumn
      ? json(spec.jsonColumn, (spec.prefix ?? '') + field)
      : stored(`${spec.table}.${field}`));
    const [table, column] = entry.source.split('.');
    if (!tables.get(table)?.has(column)) throw new Error(`Missing storage: ${name}.${field} => ${entry.source}`);
    coverage[name][field] = entry;
  }
}
if (tables.size !== 22) throw new Error(`Expected 22 tables; got ${tables.size}`);
const count = Object.values(coverage).reduce((sum, fields) => sum + Object.keys(fields).length, 0);
const output = JSON.stringify(coverage, null, 2) + '\n';
const mapPath = path.join(root, 'database/ui-field-map.json');
let md = '# UI field coverage\n\nGenerated by `node database/check-ui-coverage.mjs --write`.\n\n'
  + `${count} typed fields across ${Object.keys(coverage).length} UI interfaces; 22 base tables.\n\n`
  + 'Each field has a column, JSON path, join, or calculation. JSON nested objects are detailed below and in README.md. This verifies schema coverage, not a working API.\n\n';
for (const [name, fields] of Object.entries(coverage)) {
  md += `## ${name}\n\n| UI field | Storage | Mapping |\n|---|---|---|\n`;
  for (const [field, e] of Object.entries(fields)) md += `| \`${field}\` | ${e.kind}: \`${e.source}${e.path ? ':' + e.path : ''}\` | ${(e.note ?? '').replaceAll('|', '\\|')} |\n`;
  md += '\n';
}
if (process.argv.includes('--write')) {
  fs.writeFileSync(mapPath, output);
  fs.writeFileSync(path.join(root, 'database/UI-FIELD-MAP.md'), md);
} else {
  if (fs.readFileSync(mapPath, 'utf8') !== output || fs.readFileSync(path.join(root, 'database/UI-FIELD-MAP.md'), 'utf8') !== md) {
    throw new Error('Coverage artifacts differ from current UI/schema. Review then run with --write.');
  }
}
console.log(`PASS: ${count} fields, ${Object.keys(coverage).length} interfaces, ${tables.size} base tables; no unmapped fields.`);
