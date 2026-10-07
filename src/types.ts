export type ClientType = 'Corporate' | 'Government' | 'Retail' | 'Startup' | 'NGO';
export type BillingCycle = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly' | 'Custom' | 'One-Time';
export type SubscriptionStatus = 'Active' | 'Expiring Soon' | 'Expired' | 'Cancelled';
export type InvoiceStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue';
export type ProjectStatus = 'Pending' | 'In Progress' | 'Review' | 'Completed';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Admin {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface Client {
  id: number;
  client_code: string;
  name: string;
  client_type: ClientType;
  contact_person: string;
  email: string;
  mobile: string;
  city: string;
  address: string;
  source: string;
  status: 'Active' | 'Inactive' | 'Lead';
  start_date?: string;
  notes: string;
  created_at: string;
  custom_fields?: { id: string; name: string; value: string }[];
  // Facebook Pages & Lead Ads Integration
  fb_page_id?: string;
  fb_page_name?: string;
  fb_form_id?: string;
  fb_form_name?: string;
  fb_auto_whatsapp?: boolean;
}

export interface FacebookPageMapping {
  page_id: string;
  page_name: string;
  category?: string;
  followers_count?: string;
  lead_forms: { form_id: string; form_name: string; leads_count: number }[];
}

export interface FacebookLead {
  id: string;
  client_id: number;
  client_name: string;
  fb_page_id: string;
  fb_page_name: string;
  form_id: string;
  form_name: string;
  ad_id?: string;
  ad_name?: string;
  campaign_name?: string;
  lead_name: string;
  lead_phone: string;
  lead_email: string;
  city?: string;
  service_requested?: string;
  budget?: string;
  custom_answers?: { question: string; answer: string }[];
  status: 'New' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Converted' | 'Lost';
  created_time: string; // ISO date/time
  whatsapp_status: 'Not Sent' | 'Message Sent' | 'Delivered' | 'Replied';
  last_whatsapp_at?: string;
  notes?: string;
}

export interface WhatsAppTemplate {
  meta_template?: { name: string; language: { code: string }; components?: unknown[] };
  id: string;
  name: string;
  category: 'LEAD_GREETING' | 'RENEWAL_REMINDER' | 'INVOICE_SENT' | 'PROPOSAL' | 'CUSTOM';
  label: string;
  text: string;
}

export interface WhatsAppConfig {
  waba_id: string;
  phone_number_id: string;
  business_phone_number: string;
  api_token: string;
  webhook_verify_token: string;
  default_country_code: string;
  auto_greeting_enabled: boolean;
  webhook_status: 'Connected' | 'Disconnected' | 'Pending';
  templates: WhatsAppTemplate[];
}

export interface WhatsAppMessageLog {
  id: string;
  recipient_name: string;
  recipient_phone: string;
  client_id?: number;
  client_name?: string;
  lead_id?: string;
  template_used?: string;
  message_body: string;
  status: 'Sent' | 'Delivered' | 'Read' | 'Failed';
  sent_at: string;
  direction: 'outbound' | 'inbound';
}

export interface ServiceCatalog {
  id: number;
  service_name: string;
  category: string;
  default_rate: number;
  billing_frequency: BillingCycle;
  custom_duration?: string;
  description: string;
  status?: 'Active' | 'Inactive';
}

export type QuotationStatus = 'Draft' | 'Sent' | 'Pending' | 'Approved' | 'Rejected';

export interface QuotationLineItem {
  id: string;
  service_id?: number;
  service_name: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  billing_cycle?: BillingCycle;
  service_duration?: string; // e.g. "Monthly (1 Mo)", "Quarterly (3 Mo)", "Half-Yearly (6 Mo)", "Yearly (1 Yr)", "Custom"
  custom_duration?: string;
  start_date?: string;
}

export interface QuotationCustomField {
  id: string;
  field_name: string;
  field_value: string;
}

export interface Quotation {
  id: number;
  quotation_number: string;
  client_id: number;
  client_name: string;
  client_email?: string;
  client_mobile?: string;
  client_address?: string;
  title: string;
  date: string;
  valid_until: string;
  status: QuotationStatus;
  items: QuotationLineItem[];
  subtotal: number;
  discount_amount: number;
  gst_rate: number;
  gst_amount: number;
  grand_total: number;
  notes?: string;
  terms_conditions?: string;
  custom_fields: QuotationCustomField[];
  converted_invoice_id?: number;
  converted_invoice_number?: string;
  created_at: string;
}

export interface SubscriptionRenewal {
  id: number; period_start: string; period_end: string; amount: number; currency: string;
  invoice_id: number; invoice_number: string; status: 'Pending Payment' | 'Renewed' | 'Failed'; payment_status: 'Paid' | 'Unpaid';
  renewed_at?: string; last_error?: string;
}
export interface ClientSubscription {
  countdown?: string;
  renewal_state?: string;
  renewal_error?: string;
  can_renew?: boolean;
  legacy_payment_status?: 'Paid' | 'Unpaid';
  renewal_invoice_id?: number;
  renewal_invoice_number?: string;
  renewal_history?: SubscriptionRenewal[];
  next_reminder_date?: string;
  current_period_start?: string;
  currency?: string;
  payment_status?: 'Paid' | 'Unpaid';
  custom_duration?: string;
  id: number;
  client_id: number;
  client_name?: string;
  service_id: number;
  service_name?: string;
  category?: string;
  billing_cycle: BillingCycle;
  start_date: string;
  expiry_date: string;
  amount: number;
  status: SubscriptionStatus;
  auto_renew: boolean;
  days_remaining?: number;
  last_email_sent_at?: string;
  email_status?: 'Not Triggered' | 'Queued' | 'Sent';
}

export interface RenewalEmailNotification {
  recipient_email?: string;
  id: string;
  subscription_id: number;
  client_id: number;
  client_name: string;
  client_email: string;
  client_contact: string;
  service_name: string;
  category: string;
  amount: number;
  billing_cycle: BillingCycle;
  expiry_date: string;
  days_remaining: number;
  auto_renew: boolean;
  subject: string;
  body_text: string;
  status: 'Queued' | 'Processing' | 'Sent' | 'Failed';
  notice_kind?: string;
  error_message?: string;
  triggered_at: string;
  sent_at?: string;
  simulated_delivery_id?: string;
}

export interface InvoiceItem {
  id?: string;
  desc: string;
  qty: number;
  rate: number;
  hsn_sac?: string;
}

export interface Invoice {
  amount_received?: number;
  balance_due?: number;
  receipt_count?: number;
  discount_amount?: number;
  id: number;
  invoice_number: string;
  client_id: number;
  client_name?: string;
  total_amount: number;
  gst_tax: number;
  grand_total: number;
  payment_status: InvoiceStatus;
  due_date: string;
  created_at: string;
  quotation_ref?: string;
  notes?: string;
  items?: InvoiceItem[];
  gst_rate?: number;
}

export interface Vendor {
  id: number;
  vendor_name: string;
  category: string;
  contact_person: string;
  phone: string;
  email: string;
  services_offered: string;
  status: 'Active' | 'Inactive';
}

export interface VendorBill {
  id: number;
  vendor_id: number;
  vendor_name?: string;
  project_name: string;
  total_amount: number;
  advance_paid: number;
  pending_balance: number;
  status: 'Paid' | 'Partial' | 'Pending';
  bill_date: string;
  recurring_expense_id?: number;
}

export type RecurringFrequency = 'Monthly' | 'Quarterly' | 'Yearly';

export interface RecurringVendorExpense {
  id: number;
  vendor_id: number;
  vendor_name: string;
  expense_title: string;
  category: string;
  amount: number;
  frequency: RecurringFrequency;
  day_of_month: number;
  next_run_date: string;
  auto_entry_enabled: boolean;
  last_generated_date?: string;
  notes?: string;
}

export interface Employee {
  id: number;
  emp_code: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  joining_date: string;
  salary: number;
  bank_details: string;
  status: string;
}

export interface HrDocument {
  id: number;
  employee_id: number;
  employee_name?: string;
  doc_type: 'Offer Letter' | 'Appointment Letter' | 'Payslip' | 'Relieving Letter' | 'Experience Letter' | 'NOC' | 'F&F Statement';
  document_data: any;
  generated_date: string;
}

// Projects & Tasks Workflow Engine
export interface ProjectDeadlineNotification {
  id: string;
  project_id: number;
  project_title: string;
  client_name: string;
  assigned_to: string;
  lead_email?: string;
  due_date: string;
  days_remaining: number;
  subject: string;
  body: string;
  status: 'Queued' | 'Sent';
  sent_at?: string;
  urgency: 'critical' | 'urgent' | 'warning';
}

export interface Project {
  id: number;
  project_title: string;
  client_id: number;
  client_name?: string;
  assigned_to: string;
  priority: Priority;
  status: ProjectStatus;
  due_date: string;
  created_at: string;
  description?: string;
  budget?: number;
  // Deadline Alert settings & status
  deadline_alerts_enabled?: boolean;
  alert_threshold_days?: number; // default 3 days
  lead_email?: string;
  alert_acknowledged?: boolean;
  alert_sent_at?: string;
}

export interface Task {
  id: number;
  project_id: number;
  project_title?: string;
  client_id?: number;
  client_name?: string;
  task_title: string;
  description?: string;
  assigned_to: string;
  priority: Priority;
  status: ProjectStatus;
  due_date: string;
  created_at?: string;
  tags?: string[];
  estimated_hours?: number;
  completed_at?: string;
}

// Client Organization Files & Drive System
export type FileCategory = 'Quotation' | 'Invoice' | 'Uploaded Document' | 'Custom Table' | 'Facebook Leads';

export interface TableCellData {
  id: string;
  content: string;
  rowSpan?: number;
  colSpan?: number;
  isHeader?: boolean;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  isMergedHidden?: boolean; // if cell is absorbed by another cell's colSpan/rowSpan
}

export interface CustomTableRow {
  id: string;
  isSectionHeadline?: boolean;
  headlineText?: string;
  headlineSubtitle?: string;
  headlineTheme?: 'navy' | 'slate' | 'emerald' | 'amber' | 'blue';
  cells: Record<string, TableCellData>;
}

export interface CustomTableData {
  id: string;
  title: string;
  headlineKicker?: string;
  description?: string;
  theme?: 'navy' | 'slate' | 'emerald' | 'amber' | 'indigo';
  headlineAlign?: 'left' | 'center' | 'right';
  columns: { id: string; header: string; width?: string; align?: 'left' | 'center' | 'right' }[];
  rows: CustomTableRow[];
  created_at: string;
  updated_at: string;
}

export interface StoredClientFile {
  notes?: string;
  id: string;
  client_id: number;
  client_name: string; // Organisation Name
  file_name: string;
  category: FileCategory;
  file_type: 'pdf' | 'doc' | 'docx' | 'xls' | 'xlsx' | 'table' | 'image' | 'other';
  file_size: string; // e.g. '145 KB'
  uploaded_at: string;
  uploaded_by?: string;
  reference_id?: string | number; // e.g. quotation_number or invoice_number
  reference_type?: 'quotation' | 'invoice' | 'custom_table' | 'upload';
  table_data?: CustomTableData;
  file_url?: string;
  tag?: string;
  project_id?: number;
  project_name?: string;
}
