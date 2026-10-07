import { Client, ServiceCatalog, ClientSubscription, Invoice, Vendor, VendorBill, RecurringVendorExpense, Employee, HrDocument, Quotation, Project, Task } from '../types';

// Helper to get formatted relative dates
const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const subDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 1,
    client_code: 'VKD-CLI-1001',
    name: 'Apex Global Logistics Ltd',
    client_type: 'Corporate',
    contact_person: 'Vikram Malhotra',
    email: 'vikram@apexlogistics.in',
    mobile: '+91 98201 44521',
    city: 'Mumbai',
    address: 'Level 4, Trade Centre, BKC, Bandra East',
    source: 'LinkedIn Outreach',
    status: 'Active',
    start_date: subDays(180),
    notes: 'Priority corporate account with quarterly marketing review.',
    created_at: subDays(180),
    fb_page_id: '1084920194821',
    fb_page_name: 'Apex Global Logistics - Official',
    fb_form_id: 'form-apex-01',
    fb_form_name: 'Freight & Fleet Inquiries 2026',
    fb_auto_whatsapp: true
  },
  {
    id: 2,
    client_code: 'VKD-CLI-1002',
    name: 'State Renewable Energy Board',
    client_type: 'Government',
    contact_person: 'Dr. Ramesh Sharma',
    email: 'secretary@sreb.gov.in',
    mobile: '+91 94140 88210',
    city: 'Jaipur',
    address: 'Vidyut Bhavan, Janpath, Jyothi Nagar',
    source: 'Tender Bid',
    status: 'Active',
    start_date: subDays(360),
    notes: 'Government tender compliance requirements and GST invoice mandates.',
    created_at: subDays(360),
    fb_page_id: '1073829104829',
    fb_page_name: 'State Renewable Energy Initiatives',
    fb_form_id: 'form-sreb-01',
    fb_form_name: 'Commercial Solar Subsidies Inquiry',
    fb_auto_whatsapp: true
  },
  {
    id: 3,
    client_code: 'VKD-CLI-1003',
    name: 'Urban Aura Fine Jewels',
    client_type: 'Retail',
    contact_person: 'Ananya Mehta',
    email: 'contact@urbanaurajewels.com',
    mobile: '+91 97112 33456',
    city: 'Delhi NCR',
    address: 'Shop 14, M-Block Market, Greater Kailash 1',
    source: 'Client Referral',
    status: 'Active',
    start_date: subDays(90),
    notes: 'High-end luxury jewelry eCommerce catalog with weekly promotional updates.',
    created_at: subDays(90),
    fb_page_id: '1092837461923',
    fb_page_name: 'Urban Aura Fine Jewels',
    fb_form_id: 'form-aura-01',
    fb_form_name: 'Bridal Diamond Collection Consultations',
    fb_auto_whatsapp: true
  },
  {
    id: 4,
    client_code: 'VKD-CLI-1004',
    name: 'Zenith Health Diagnostics',
    client_type: 'Corporate',
    contact_person: 'Dr. Alok Verma',
    email: 'billing@zenithhealth.org',
    mobile: '+91 98450 12988',
    city: 'Bengaluru',
    address: 'Plot 82, EPIP Zone, Whitefield',
    source: 'Direct Website Lead',
    status: 'Active',
    start_date: subDays(45),
    notes: 'Pathology booking engine with automated patient SMS reports.',
    created_at: subDays(45),
    fb_page_id: '1064928194019',
    fb_page_name: 'Zenith Health Diagnostics',
    fb_form_id: 'form-zenith-01',
    fb_form_name: 'Corporate Health Checkup Packages',
    fb_auto_whatsapp: true
  },
  {
    id: 5,
    client_code: 'VKD-CLI-1005',
    name: 'Kavita Interiors & Architecture',
    client_type: 'Retail',
    contact_person: 'Kavita Sen',
    email: 'hello@kavitainteriors.in',
    mobile: '+91 98110 55412',
    city: 'Pune',
    address: 'Suite 204, Koregaon Park Plaza',
    source: 'Instagram Ad',
    status: 'Inactive',
    start_date: subDays(280),
    notes: 'Contract concluded after initial website and 3D portfolio delivery.',
    created_at: subDays(280)
  }
];

export const SERVICES_CATALOG: ServiceCatalog[] = [
  {
    id: 1,
    service_name: 'Enterprise Custom Web Application',
    category: 'Web Development',
    default_rate: 45000,
    billing_frequency: 'One-Time',
    description: 'Full-stack bespoke web platform development with database modeling.'
  },
  {
    id: 2,
    service_name: 'Search Engine Optimization (SEO Pro)',
    category: 'SEO & Performance',
    default_rate: 12000,
    billing_frequency: 'Monthly',
    description: 'Monthly on-page keyword ranking, link velocity, and performance audits.'
  },
  {
    id: 3,
    service_name: 'Digital PR & Content Campaign',
    category: 'Digital Marketing',
    default_rate: 32000,
    billing_frequency: 'Quarterly',
    description: 'Quarterly media releases, executive branding, and influencer partnerships.'
  },
  {
    id: 4,
    service_name: 'Cybersecurity & Code Audit Retainer',
    category: 'Maintenance & AMC',
    default_rate: 28000,
    billing_frequency: 'Half-Yearly',
    description: 'Bi-annual penetration testing, vulnerability assessment, and compliance report.'
  },
  {
    id: 5,
    service_name: 'High-Speed Cloud VPS Hosting & Backups',
    category: 'Cloud & Hosting',
    default_rate: 8500,
    billing_frequency: 'Yearly',
    description: 'Dedicated Hostinger Cloud VPS instance with SSL, automated weekly backups.'
  },
  {
    id: 6,
    service_name: 'Annual Maintenance Contract (AMC)',
    category: 'Maintenance & AMC',
    default_rate: 15000,
    billing_frequency: 'Yearly',
    description: '24/7 security patches, plugin health, database tuning, and emergency turnaround.'
  },
  {
    id: 7,
    service_name: 'Core Web Vitals & Speed Optimization Sprint',
    category: 'SEO & Performance',
    default_rate: 18500,
    billing_frequency: 'Custom',
    custom_duration: '45 Days Sprint',
    description: 'Custom 45-day focused sprint to achieve 90+ Lighthouse score on desktop & mobile.'
  },
  {
    id: 8,
    service_name: 'Social Media & Brand Growth Retainer',
    category: 'Digital Marketing',
    default_rate: 18000,
    billing_frequency: 'Monthly',
    description: 'Content creation, 16 monthly creatives, performance marketing ad management.'
  }
];

export const INITIAL_SERVICES: ServiceCatalog[] = SERVICES_CATALOG;

export const INITIAL_SUBSCRIPTIONS: ClientSubscription[] = [
  {
    id: 1,
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    service_id: 3,
    service_name: 'High-Speed Cloud VPS Hosting & Backups',
    category: 'Cloud & Hosting',
    billing_cycle: 'Yearly',
    start_date: subDays(359),
    expiry_date: addDays(6),
    amount: 8500,
    status: 'Expiring Soon',
    auto_renew: true,
    days_remaining: 6
  },
  {
    id: 2,
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    service_id: 4,
    service_name: 'Annual Maintenance Contract (AMC)',
    category: 'Maintenance & AMC',
    billing_cycle: 'Yearly',
    start_date: subDays(353),
    expiry_date: addDays(12),
    amount: 15000,
    status: 'Expiring Soon',
    auto_renew: true,
    days_remaining: 12
  },
  {
    id: 3,
    client_id: 2,
    client_name: 'State Renewable Energy Board',
    service_id: 5,
    service_name: 'Corporate Domain & DNS Management',
    category: 'Cloud & Hosting',
    billing_cycle: 'Yearly',
    start_date: subDays(361),
    expiry_date: addDays(4),
    amount: 1200,
    status: 'Expiring Soon',
    auto_renew: true,
    days_remaining: 4
  },
  {
    id: 4,
    client_id: 4,
    client_name: 'Zenith Health Diagnostics',
    service_id: 6,
    service_name: 'Social Media & Brand Growth Retainer',
    category: 'Digital Marketing',
    billing_cycle: 'Monthly',
    start_date: subDays(25),
    expiry_date: addDays(5),
    amount: 18000,
    status: 'Expiring Soon',
    auto_renew: false,
    days_remaining: 5
  },
  {
    id: 5,
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    service_id: 2,
    service_name: 'Search Engine Optimization (SEO Pro)',
    category: 'SEO & Performance',
    billing_cycle: 'Monthly',
    start_date: subDays(15),
    expiry_date: addDays(15),
    amount: 12000,
    status: 'Active',
    auto_renew: true,
    days_remaining: 15
  },
  {
    id: 6,
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    service_id: 3,
    service_name: 'High-Speed Cloud VPS Hosting & Backups',
    category: 'Cloud & Hosting',
    billing_cycle: 'Yearly',
    start_date: subDays(180),
    expiry_date: addDays(185),
    amount: 8500,
    status: 'Active',
    auto_renew: true,
    days_remaining: 185
  }
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1,
    invoice_number: 'INV-2026-001',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    total_amount: 45000,
    gst_tax: 8100,
    grand_total: 53100,
    payment_status: 'Paid',
    due_date: subDays(30),
    created_at: subDays(35),
    gst_rate: 18,
    items: [
      { desc: 'Custom Enterprise Web Portal Development', qty: 1, rate: 35000, hsn_sac: '998314' },
      { desc: 'Hostinger Cloud VPS Setup & SSL Clustering', qty: 1, rate: 10000, hsn_sac: '998315' }
    ],
    notes: 'Paid in full via NEFT wire transfer. Thank you for your business!'
  },
  {
    id: 2,
    invoice_number: 'INV-2026-002',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    total_amount: 23500,
    gst_tax: 4230,
    grand_total: 27730,
    payment_status: 'Pending',
    due_date: addDays(7),
    created_at: subDays(5),
    gst_rate: 18,
    items: [
      { desc: 'GPS Telemetry Live Marker Clustering Module', qty: 1, rate: 15000, hsn_sac: '998314' },
      { desc: 'Monthly Dedicated DevOps Maintenance (Feb 2026)', qty: 1, rate: 8500, hsn_sac: '998313' }
    ],
    notes: 'Net 15 payment terms. Please route payment to HDFC Bank Ltd.'
  },
  {
    id: 3,
    invoice_number: 'INV-2026-003',
    client_id: 2,
    client_name: 'State Renewable Energy Board',
    total_amount: 75000,
    gst_tax: 13500,
    grand_total: 88500,
    payment_status: 'Partial',
    due_date: addDays(10),
    created_at: subDays(12),
    quotation_ref: 'QT-2026-002',
    gst_rate: 18,
    items: [
      { desc: 'Solar Energy Output Tracking Dashboard', qty: 1, rate: 50000, hsn_sac: '998314' },
      { desc: 'Government Open Data API & SCADA Bridge Integration', qty: 1, rate: 25000, hsn_sac: '998314' }
    ],
    notes: '50% advance received. Milestone 2 balance due upon user acceptance testing.'
  },
  {
    id: 4,
    invoice_number: 'INV-2026-004',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    total_amount: 30000,
    gst_tax: 5400,
    grand_total: 35400,
    payment_status: 'Paid',
    due_date: subDays(10),
    created_at: subDays(20),
    quotation_ref: 'QT-2026-003',
    gst_rate: 18,
    items: [
      { desc: 'Luxury Jewellery E-Commerce UI Re-architecture', qty: 1, rate: 20000, hsn_sac: '998314' },
      { desc: 'High-Speed Cloud VPS Hosting & Backups (Annual)', qty: 1, rate: 10000, hsn_sac: '998315' }
    ],
    notes: 'Settled via Razorpay payment link.'
  },
  {
    id: 5,
    invoice_number: 'INV-2026-005',
    client_id: 4,
    client_name: 'Zenith Health Diagnostics',
    total_amount: 18000,
    gst_tax: 3240,
    grand_total: 21240,
    payment_status: 'Pending',
    due_date: addDays(3),
    created_at: subDays(2),
    gst_rate: 18,
    items: [
      { desc: 'Social Media & Brand Growth Retainer (Sprint 1)', qty: 1, rate: 18000, hsn_sac: '998311' }
    ],
    notes: 'First month retainer fee. Payment due upon invoice receipt.'
  }
];

export const INITIAL_VENDORS: Vendor[] = [
  {
    id: 1,
    vendor_name: 'Hostinger International Ltd',
    category: 'Cloud Hosting',
    contact_person: 'Hostinger Enterprise Support',
    phone: '+370 645 03378',
    email: 'enterprise@hostinger.com',
    services_offered: 'High-Performance KVM VPS, Web Hosting & cPanel licenses',
    status: 'Active'
  },
  {
    id: 2,
    vendor_name: 'Pixels & Vectors Studio',
    category: 'UI/UX Design',
    contact_person: 'Kunal Sen',
    phone: '+91 98110 55674',
    email: 'kunal@pixelsandvectors.io',
    services_offered: 'Figma mockups, design systems, vector illustrations',
    status: 'Active'
  },
  {
    id: 3,
    vendor_name: 'CopyCrafters Content Agency',
    category: 'Content & Copy',
    contact_person: 'Pooja Iyer',
    phone: '+91 97401 22891',
    email: 'pooja@copycrafters.co',
    services_offered: 'Technical SEO writing, landing page copywriting, social briefs',
    status: 'Active'
  }
];

export const INITIAL_VENDOR_BILLS: VendorBill[] = [
  {
    id: 1,
    vendor_id: 1,
    vendor_name: 'Hostinger International Ltd',
    project_name: 'Cloud VPS Hosting Fleet (Q1 2026)',
    total_amount: 24000,
    advance_paid: 24000,
    pending_balance: 0,
    status: 'Paid',
    bill_date: subDays(25)
  },
  {
    id: 2,
    vendor_id: 2,
    vendor_name: 'Pixels & Vectors Studio',
    project_name: 'Apex Logistics Design System & UX',
    total_amount: 35000,
    advance_paid: 15000,
    pending_balance: 20000,
    status: 'Partial',
    bill_date: subDays(10)
  },
  {
    id: 3,
    vendor_id: 3,
    vendor_name: 'CopyCrafters Content Agency',
    project_name: 'Urban Aura Luxury Jewelry Brand Copy',
    total_amount: 18000,
    advance_paid: 5000,
    pending_balance: 13000,
    status: 'Partial',
    bill_date: subDays(7)
  }
];

export const INITIAL_RECURRING_EXPENSES: RecurringVendorExpense[] = [
  {
    id: 1,
    vendor_id: 1,
    vendor_name: 'Hostinger International Ltd',
    expense_title: 'KVM 8 VPS Cloud Node Hosting Cluster',
    category: 'Cloud Infrastructure',
    amount: 8500,
    frequency: 'Monthly',
    day_of_month: 1,
    next_run_date: '2026-10-01',
    auto_entry_enabled: true,
    last_generated_date: subDays(19),
    notes: 'Primary server cluster hosting client production portals'
  },
  {
    id: 2,
    vendor_id: 2,
    vendor_name: 'Pixels & Vectors Studio',
    expense_title: 'Figma Enterprise Organization 5-Seat License',
    category: 'SaaS Subscriptions',
    amount: 4200,
    frequency: 'Monthly',
    day_of_month: 5,
    next_run_date: '2026-10-05',
    auto_entry_enabled: true,
    last_generated_date: subDays(15),
    notes: 'Design systems and prototype collaboration seats'
  },
  {
    id: 3,
    vendor_id: 3,
    vendor_name: 'CopyCrafters Content Agency',
    expense_title: 'Monthly SEO Article & Technical Copy Retainer',
    category: 'Content Retainer',
    amount: 12000,
    frequency: 'Monthly',
    day_of_month: 10,
    next_run_date: '2026-10-10',
    auto_entry_enabled: false,
    last_generated_date: subDays(40),
    notes: '4 bi-weekly technical blog posts & press releases'
  }
];

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 1,
    emp_code: 'VKD-EMP-001',
    name: 'Rohit Verma',
    email: 'rohit.v@vkdsolutions.com',
    phone: '+91 98330 11223',
    designation: 'Principal Full-Stack Engineer',
    department: 'Engineering',
    joining_date: '2024-03-01',
    salary: 85000,
    bank_details: 'HDFC Bank | A/C: 50100492837192 | IFSC: HDFC0000288',
    status: 'Active'
  },
  {
    id: 2,
    emp_code: 'VKD-EMP-002',
    name: 'Sneha Kapoor',
    email: 'sneha.k@vkdsolutions.com',
    phone: '+91 99201 88473',
    designation: 'Senior UI/UX & Brand Designer',
    department: 'Creative Design',
    joining_date: '2024-06-15',
    salary: 65000,
    bank_details: 'ICICI Bank | A/C: 102938475610 | IFSC: ICIC0001029',
    status: 'Active'
  },
  {
    id: 3,
    emp_code: 'VKD-EMP-003',
    name: 'Amitabh Sengupta',
    email: 'amitabh.s@vkdsolutions.com',
    phone: '+91 97182 99014',
    designation: 'DevOps & Security Specialist',
    department: 'Infrastructure',
    joining_date: '2024-09-01',
    salary: 75000,
    bank_details: 'Axis Bank | A/C: 918273645102 | IFSC: UTIB0000845',
    status: 'Active'
  }
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 1,
    quotation_number: 'VKD-QT-2026-001',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    client_email: 'vikram@apexlogistics.in',
    client_mobile: '+91 98201 44521',
    client_address: 'Level 4, Trade Centre, BKC, Bandra East, Mumbai',
    title: 'Fleet Tracking Web Portal & Cloud VPS Infrastructure',
    date: subDays(14),
    valid_until: addDays(16),
    status: 'Approved',
    items: [
      {
        id: 'item-1',
        service_id: 1,
        service_name: 'Enterprise Custom Web Application',
        description: 'Bespoke real-time logistics dashboard, GPS API integration, and driver trip logs.',
        quantity: 1,
        unit: 'Milestone Scope',
        unit_price: 52000,
        amount: 52000
      },
      {
        id: 'item-2',
        service_id: 3,
        service_name: 'High-Speed Cloud VPS Hosting & Backups',
        description: 'Hostinger Cloud VPS setup, 4 Core CPU, 16GB RAM, SSL & automated weekly disaster backups.',
        quantity: 1,
        unit: 'Annual License',
        unit_price: 8500,
        amount: 8500
      }
    ],
    subtotal: 60500,
    discount_amount: 2500,
    gst_rate: 18,
    gst_amount: 10440,
    grand_total: 68440,
    notes: 'Quotation approved by CFO Vikram Malhotra. Invoicing converted.',
    terms_conditions: '50% advance upon contract signing. Remaining 50% on UAT signoff. AMC starts after 90-day defect warranty.',
    custom_fields: [
      { id: 'cf-1', field_name: 'Payment Terms', field_value: '50% Advance, 50% on UAT' },
      { id: 'cf-2', field_name: 'Project Timeline', field_value: '6 Weeks from Advance' },
      { id: 'cf-3', field_name: 'Client PO Number', field_value: 'PO-APEX-2026-991' }
    ],
    converted_invoice_id: 1,
    converted_invoice_number: 'INV-2026-001',
    created_at: subDays(14)
  },
  {
    id: 2,
    quotation_number: 'VKD-QT-2026-002',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    client_email: 'contact@urbanaurajewels.com',
    client_mobile: '+91 97112 33456',
    client_address: 'Shop 14, M-Block Market, Greater Kailash 1, Delhi NCR',
    title: 'Luxury E-Commerce Catalog & Instagram Ad Growth Campaign',
    date: subDays(5),
    valid_until: addDays(25),
    status: 'Sent',
    items: [
      {
        id: 'item-3',
        service_id: 6,
        service_name: 'Social Media & Brand Growth Retainer',
        description: 'Special festive campaign: 24 custom high-jewelry motion reels, ad budget management, influencer coordination.',
        quantity: 3,
        unit: 'Months',
        unit_price: 16500, // Custom negotiated offered price vs default 18,000
        amount: 49500
      },
      {
        id: 'item-4',
        service_id: 2,
        service_name: 'Search Engine Optimization (SEO Pro)',
        description: 'E-commerce keyword optimization for diamond rings, gold pendants, and local Delhi NCR discovery.',
        quantity: 3,
        unit: 'Months',
        unit_price: 11000, // Custom price offered vs default 12,000
        amount: 33000
      }
    ],
    subtotal: 82500,
    discount_amount: 3500,
    gst_rate: 18,
    gst_amount: 14220,
    grand_total: 93220,
    notes: 'Proposal sent to Ananya Mehta via WhatsApp and official email. Follow-up scheduled for Tuesday.',
    terms_conditions: 'Retainer invoices raised on the 1st of every month. 18% GST applicable. Creatives approved 48 hrs in advance.',
    custom_fields: [
      { id: 'cf-4', field_name: 'Campaign Duration', field_value: 'Quarterly (Q4 Festive)' },
      { id: 'cf-5', field_name: 'Account Manager', field_value: 'Sneha Kapoor' }
    ],
    created_at: subDays(5)
  },
  {
    id: 3,
    quotation_number: 'VKD-QT-2026-003',
    client_id: 4,
    client_name: 'Zenith Health Diagnostics',
    client_email: 'billing@zenithhealth.org',
    client_mobile: '+91 98450 12988',
    client_address: 'Plot 82, EPIP Zone, Whitefield, Bengaluru',
    title: 'HIPAA Compliant Patient Report Portal & SMS Gateway',
    date: subDays(2),
    valid_until: addDays(12),
    status: 'Pending',
    items: [
      {
        id: 'item-5',
        service_id: 1,
        service_name: 'Enterprise Custom Web Application',
        description: 'Secure patient test report download portal with OTP authentication and WhatsApp PDF dispatch.',
        quantity: 1,
        unit: 'Milestone Scope',
        unit_price: 68000,
        amount: 68000
      },
      {
        id: 'item-6',
        service_id: 4,
        service_name: 'Annual Maintenance Contract (AMC)',
        description: '24/7 hospital uptime guarantee, automated encrypted database backups, and health dashboard.',
        quantity: 1,
        unit: 'Yearly AMC',
        unit_price: 18000,
        amount: 18000
      }
    ],
    subtotal: 86000,
    discount_amount: 0,
    gst_rate: 18,
    gst_amount: 15480,
    grand_total: 101480,
    notes: 'Medical board committee review pending approval.',
    terms_conditions: 'Strict NDA & Patient Data Privacy adherence. Payment within 15 days of invoice date.',
    custom_fields: [
      { id: 'cf-6', field_name: 'SLA Guarantee', field_value: '99.9% Uptime with 2hr emergency response' },
      { id: 'cf-7', field_name: 'Compliance', field_value: 'NABH / ISO 27001 Data Standards' }
    ],
    created_at: subDays(2)
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 1,
    project_title: 'Apex Fleet Tracking & Telemetry Portal',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    assigned_to: 'Rahul Sharma',
    priority: 'High',
    status: 'In Progress',
    due_date: addDays(18),
    created_at: subDays(30),
    description: 'Enterprise telemetry web application with real-time GPS fleet clustering, driver mobile dispatch, and automated transit SMS notifications.',
    budget: 180000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3,
    alert_acknowledged: false
  },
  {
    id: 2,
    project_title: 'State Solar Subsidy Approval Engine',
    client_id: 2,
    client_name: 'State Renewable Energy Board',
    assigned_to: 'Priya Nair',
    priority: 'Urgent',
    status: 'In Progress',
    due_date: addDays(2), // Due in 2 days -> Triggers Deadline Alert!
    created_at: subDays(45),
    description: 'Citizen rooftop solar subsidy portal featuring multi-tier administrative approval hierarchy, Aadhaar e-KYC validation, and automated DBT ledger.',
    budget: 240000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3,
    alert_acknowledged: false
  },
  {
    id: 3,
    project_title: 'Urban Aura Luxury Shopify Store & AR Try-On',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    assigned_to: 'Sneha Kapoor',
    priority: 'Medium',
    status: 'Review',
    due_date: addDays(12),
    created_at: subDays(20),
    description: 'High-jewelry eCommerce platform featuring interactive 3D rotational previewer, custom ring builder, Razorpay checkout, and Instagram shop syncing.',
    budget: 125000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3,
    alert_acknowledged: false
  },
  {
    id: 4,
    project_title: 'Zenith Patient Diagnostics & WhatsApp Report Gateway',
    client_id: 4,
    client_name: 'Zenith Health Diagnostics',
    assigned_to: 'Vikram Malhotra',
    priority: 'High',
    status: 'Pending',
    due_date: addDays(25),
    created_at: subDays(10),
    description: 'HIPAA-compliant medical lab report retrieval engine with secure OTP verification, PDF encryption, and Twilio automated WhatsApp dispatch.',
    budget: 95000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3,
    alert_acknowledged: false
  },
  {
    id: 5,
    project_title: 'MediCare Emergency Telehealth & Ambulance Triage',
    client_id: 4,
    client_name: 'Zenith Health Diagnostics',
    assigned_to: 'Ananya Mehta',
    priority: 'Urgent',
    status: 'Review',
    due_date: addDays(1), // Due Tomorrow (1 day remaining) -> Triggers Deadline Alert!
    created_at: subDays(14),
    description: 'Real-time telemetry and VoIP triage gateway connecting district trauma teams with on-call casualty physicians.',
    budget: 110000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3,
    alert_acknowledged: false
  }
];

export const INITIAL_TASKS: Task[] = [
  // 1. Pending Column Tasks
  {
    id: 1,
    project_id: 1,
    project_title: 'Apex Fleet Tracking & Telemetry Portal',
    client_name: 'Apex Global Logistics Ltd',
    task_title: 'Configure Hostinger MySQL Replica & Auto Backup Script',
    description: 'Set up cron job for daily encrypted database snapshots and offsite S3 synchronization.',
    assigned_to: 'Rahul Sharma',
    priority: 'High',
    status: 'Pending',
    due_date: addDays(4),
    created_at: subDays(4),
    tags: ['DevOps', 'Database'],
    estimated_hours: 6
  },
  {
    id: 2,
    project_id: 2,
    project_title: 'State Solar Subsidy Approval Engine',
    client_name: 'State Renewable Energy Board',
    task_title: 'Conduct Security Audit & OWASP Vulnerability Scan',
    description: 'Perform penetration testing for public citizen form submissions, SQL injection prevention, and CSRF token audit.',
    assigned_to: 'Priya Nair',
    priority: 'Urgent',
    status: 'Pending',
    due_date: addDays(6),
    created_at: subDays(3),
    tags: ['Security', 'Govt Compliance'],
    estimated_hours: 12
  },
  {
    id: 3,
    project_id: 3,
    project_title: 'Urban Aura Luxury Shopify Store & AR Try-On',
    client_name: 'Urban Aura Fine Jewels',
    task_title: 'Integrate Meta Conversion API & Festive Catalog Feed',
    description: 'Sync jewelry inventory with Meta Commerce Manager and configure server-side conversion tracking.',
    assigned_to: 'Sneha Kapoor',
    priority: 'Medium',
    status: 'Pending',
    due_date: addDays(10),
    created_at: subDays(2),
    tags: ['Marketing', 'Shopify'],
    estimated_hours: 8
  },
  {
    id: 4,
    project_id: 4,
    project_title: 'Zenith Patient Diagnostics & WhatsApp Report Gateway',
    client_name: 'Zenith Health Diagnostics',
    task_title: 'Twilio WhatsApp Template Approval & Webhook Setup',
    description: 'Submit HSM message templates with medical disclaimers to Meta and bind webhook event listeners.',
    assigned_to: 'Vikram Malhotra',
    priority: 'High',
    status: 'Pending',
    due_date: addDays(7),
    created_at: subDays(1),
    tags: ['API', 'WhatsApp'],
    estimated_hours: 5
  },

  // 2. In Progress Column Tasks
  {
    id: 5,
    project_id: 1,
    project_title: 'Apex Fleet Tracking & Telemetry Portal',
    client_name: 'Apex Global Logistics Ltd',
    task_title: 'Implement GPS Live Map with Vehicle Marker Clustering',
    description: 'Interactive Leaflet view showing active trucks across Western corridor with speed alerts and geo-fencing polygons.',
    assigned_to: 'Rahul Sharma',
    priority: 'Urgent',
    status: 'In Progress',
    due_date: addDays(3),
    created_at: subDays(6),
    tags: ['Frontend', 'Maps'],
    estimated_hours: 16
  },
  {
    id: 6,
    project_id: 2,
    project_title: 'State Solar Subsidy Approval Engine',
    client_name: 'State Renewable Energy Board',
    task_title: 'Develop District Officer Multi-Tier Approval Matrix',
    description: 'Hierarchical role-based approval steps with digital signature stamping and audit log trails.',
    assigned_to: 'Priya Nair',
    priority: 'High',
    status: 'In Progress',
    due_date: addDays(5),
    created_at: subDays(8),
    tags: ['Workflow', 'Backend'],
    estimated_hours: 14
  },
  {
    id: 7,
    project_id: 3,
    project_title: 'Urban Aura Luxury Shopify Store & AR Try-On',
    client_name: 'Urban Aura Fine Jewels',
    task_title: 'Build 3D Diamond Ring Rotational Canvas with Studio Lighting',
    description: 'Three.js / WebGL shader optimization for realistic diamond refraction and gold lustre on mobile devices.',
    assigned_to: 'Sneha Kapoor',
    priority: 'Medium',
    status: 'In Progress',
    due_date: addDays(4),
    created_at: subDays(5),
    tags: ['3D/WebGL', 'UI/UX'],
    estimated_hours: 20
  },
  {
    id: 8,
    project_id: 4,
    project_title: 'Zenith Patient Diagnostics & WhatsApp Report Gateway',
    client_name: 'Zenith Health Diagnostics',
    task_title: 'Design HIPAA Compliant Patient OTP Authentication Portal',
    description: 'Two-factor authentication flow with SMS OTP verification and patient birth-year matching before PDF decrypt.',
    assigned_to: 'Ananya Mehta',
    priority: 'High',
    status: 'In Progress',
    due_date: addDays(8),
    created_at: subDays(4),
    tags: ['UI/UX', 'Figma'],
    estimated_hours: 10
  },

  // 3. Review Column Tasks
  {
    id: 9,
    project_id: 3,
    project_title: 'Urban Aura Luxury Shopify Store & AR Try-On',
    client_name: 'Urban Aura Fine Jewels',
    task_title: 'Cross-Browser Mobile Checkout & Speed Index Audit',
    description: 'Ensure Lighthouse Performance score > 90 on 4G networks and test Razorpay UPI one-click intent flow.',
    assigned_to: 'Sneha Kapoor',
    priority: 'Medium',
    status: 'Review',
    due_date: addDays(2),
    created_at: subDays(7),
    tags: ['QA', 'Performance'],
    estimated_hours: 8
  },
  {
    id: 10,
    project_id: 2,
    project_title: 'State Solar Subsidy Approval Engine',
    client_name: 'State Renewable Energy Board',
    task_title: 'Aadhaar e-KYC Verification API Integration & Test Suite',
    description: 'Verify UIDAI sandbox responses, error handling for expired OTPs, and encrypted token caching.',
    assigned_to: 'Rahul Sharma',
    priority: 'Urgent',
    status: 'Review',
    due_date: addDays(1),
    created_at: subDays(9),
    tags: ['Govt API', 'Testing'],
    estimated_hours: 12
  },
  {
    id: 11,
    project_id: 1,
    project_title: 'Apex Fleet Tracking & Telemetry Portal',
    client_name: 'Apex Global Logistics Ltd',
    task_title: 'Driver Dispatched Trip SMS Webhook Handler Verification',
    description: 'Simulate high-concurrency dispatch pings and verify delivery status webhooks update vehicle state.',
    assigned_to: 'Vikram Malhotra',
    priority: 'High',
    status: 'Review',
    due_date: addDays(2),
    created_at: subDays(6),
    tags: ['Webhooks', 'QA'],
    estimated_hours: 6
  },

  // 4. Completed Column Tasks
  {
    id: 12,
    project_id: 1,
    project_title: 'Apex Fleet Tracking & Telemetry Portal',
    client_name: 'Apex Global Logistics Ltd',
    task_title: 'Database Schema Normalization & Foreign Key Constraints',
    description: 'Designed MySQL 8 relational tables for tracking devices, trips, drivers, and maintenance logs in db.sql.',
    assigned_to: 'Rahul Sharma',
    priority: 'High',
    status: 'Completed',
    due_date: subDays(3),
    created_at: subDays(15),
    tags: ['Database', 'Architecture'],
    estimated_hours: 14,
    completed_at: subDays(3)
  },
  {
    id: 13,
    project_id: 2,
    project_title: 'State Solar Subsidy Approval Engine',
    client_name: 'State Renewable Energy Board',
    task_title: 'Stakeholder Wireframes Sign-off & Technical SOW Approval',
    description: 'Presented interactive Figma prototypes to energy board directors and finalized SLA commitments.',
    assigned_to: 'Priya Nair',
    priority: 'Urgent',
    status: 'Completed',
    due_date: subDays(5),
    created_at: subDays(25),
    tags: ['Planning', 'Client SOW'],
    estimated_hours: 18,
    completed_at: subDays(5)
  },
  {
    id: 14,
    project_id: 3,
    project_title: 'Urban Aura Luxury Shopify Store & AR Try-On',
    client_name: 'Urban Aura Fine Jewels',
    task_title: 'High-Resolution Product Catalog Asset Optimization',
    description: 'Converted 180+ luxury jewelry stills to WebP format with lossless alpha transparency and color profiling.',
    assigned_to: 'Sneha Kapoor',
    priority: 'Low',
    status: 'Completed',
    due_date: subDays(2),
    created_at: subDays(12),
    tags: ['Assets', 'Design'],
    estimated_hours: 7,
    completed_at: subDays(2)
  },
  {
    id: 15,
    project_id: 4,
    project_title: 'Zenith Patient Diagnostics & WhatsApp Report Gateway',
    client_name: 'Zenith Health Diagnostics',
    task_title: 'Domain DNS Setup & Cloudflare Enterprise SSL Validation',
    description: 'Configured CAA records, strict HSTS, and origin certificate binding on Hostinger cloud server.',
    assigned_to: 'Vikram Malhotra',
    priority: 'Medium',
    status: 'Completed',
    due_date: subDays(1),
    created_at: subDays(8),
    tags: ['DNS', 'Security'],
    estimated_hours: 4,
    completed_at: subDays(1)
  },
  {
    id: 16,
    project_id: 5,
    project_title: 'MediCare Emergency Telehealth & Ambulance Triage',
    client_name: 'Zenith Health Diagnostics',
    task_title: 'Ambulance VoIP WebRTC Audio Channel Latency Calibration',
    description: 'Ensure peer-to-peer audio packet latency < 120ms across 4G/5G mobile tower handoffs.',
    assigned_to: 'Ananya Mehta',
    priority: 'Urgent',
    status: 'In Progress',
    due_date: addDays(1),
    created_at: subDays(5),
    tags: ['WebRTC', 'Audio/VoIP'],
    estimated_hours: 8
  },
  {
    id: 17,
    project_id: 5,
    project_title: 'MediCare Emergency Telehealth & Ambulance Triage',
    client_name: 'Zenith Health Diagnostics',
    task_title: 'District Emergency Room Multi-Screen Dispatch Dashboard QA',
    description: 'Verify siren visual alert state on secondary casualty monitor and patient vitals telemetry feed.',
    assigned_to: 'Vikram Malhotra',
    priority: 'High',
    status: 'Review',
    due_date: addDays(1),
    created_at: subDays(3),
    tags: ['QA', 'Telehealth'],
    estimated_hours: 6
  }
];
