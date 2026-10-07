import { FacebookPageMapping, FacebookLead, WhatsAppConfig, WhatsAppMessageLog } from '../types';

export const AGENCY_FACEBOOK_PAGES: FacebookPageMapping[] = [
  {
    page_id: '1084920194821',
    page_name: 'Apex Global Logistics - Official',
    category: 'Logistics & Supply Chain',
    followers_count: '24.5K',
    lead_forms: [
      { form_id: 'form-apex-01', form_name: 'Freight & Fleet Inquiries 2026', leads_count: 8 },
      { form_id: 'form-apex-02', form_name: 'Enterprise Warehousing RFQ', leads_count: 5 }
    ]
  },
  {
    page_id: '1092837461923',
    page_name: 'Urban Aura Fine Jewels',
    category: 'Luxury Jewelry & Retail',
    followers_count: '58.2K',
    lead_forms: [
      { form_id: 'form-aura-01', form_name: 'Bridal Diamond Collection Consultations', leads_count: 14 },
      { form_id: 'form-aura-02', form_name: 'Bespoke Custom Jewelry Orders', leads_count: 9 }
    ]
  },
  {
    page_id: '1073829104829',
    page_name: 'State Renewable Energy Initiatives',
    category: 'Government & Public Sector',
    followers_count: '12.1K',
    lead_forms: [
      { form_id: 'form-sreb-01', form_name: 'Commercial Solar Subsidies Inquiry', leads_count: 6 }
    ]
  },
  {
    page_id: '1064928194019',
    page_name: 'Zenith Health Diagnostics',
    category: 'Healthcare & Pathology',
    followers_count: '31.4K',
    lead_forms: [
      { form_id: 'form-zenith-01', form_name: 'Corporate Health Checkup Packages', leads_count: 11 }
    ]
  },
  {
    page_id: '1059201948291',
    page_name: 'VK Digi Solutions - Agency Lead Gen',
    category: 'Digital Agency & Marketing',
    followers_count: '18.9K',
    lead_forms: [
      { form_id: 'form-vkd-01', form_name: 'ERP & Web Development Inquiries', leads_count: 19 }
    ]
  }
];

export const INITIAL_FACEBOOK_LEADS: FacebookLead[] = [
  {
    id: 'fb-lead-101',
    client_id: 1, // Apex Global Logistics
    client_name: 'Apex Global Logistics Ltd',
    fb_page_id: '1084920194821',
    fb_page_name: 'Apex Global Logistics - Official',
    form_id: 'form-apex-01',
    form_name: 'Freight & Fleet Inquiries 2026',
    ad_id: 'ad-apex-771',
    ad_name: 'Pan-India Cold Chain Freight Ad',
    campaign_name: 'Q1 Logistics Scaler Campaign',
    lead_name: 'Rajiv Sengupta',
    lead_phone: '+91 98310 99482',
    lead_email: 'rajiv.sengupta@easterncargo.in',
    city: 'Kolkata',
    service_requested: 'Temperature Controlled Warehousing (15,000 sq.ft)',
    budget: '₹3,50,000 / mo',
    custom_answers: [
      { question: 'Required Volume', answer: '40 TEU containers monthly' },
      { question: 'Implementation Timeline', answer: 'Within 30 days' }
    ],
    status: 'Qualified',
    created_time: '2026-03-19T14:32:00Z',
    whatsapp_status: 'Delivered',
    last_whatsapp_at: '2026-03-19T14:35:12Z',
    notes: 'Interested in annual contract. Wants dedicated account manager.'
  },
  {
    id: 'fb-lead-102',
    client_id: 1, // Apex Global Logistics
    client_name: 'Apex Global Logistics Ltd',
    fb_page_id: '1084920194821',
    fb_page_name: 'Apex Global Logistics - Official',
    form_id: 'form-apex-01',
    form_name: 'Freight & Fleet Inquiries 2026',
    ad_id: 'ad-apex-772',
    ad_name: 'Port-to-Door Container Express',
    campaign_name: 'Q1 Logistics Scaler Campaign',
    lead_name: 'Meenakshi Iyer',
    lead_phone: '+91 98450 11293',
    lead_email: 'm.iyer@chemcorpindia.com',
    city: 'Chennai',
    service_requested: 'Hazardous Chemical Logistics',
    budget: '₹8,00,000 per shipment',
    custom_answers: [
      { question: 'Compliance Documentation', answer: 'ISO & Hazmat certified required' }
    ],
    status: 'New',
    created_time: '2026-03-20T08:15:00Z',
    whatsapp_status: 'Not Sent',
    notes: 'Inbound lead received via Facebook Lead Ads instant form.'
  },
  {
    id: 'fb-lead-103',
    client_id: 3, // Urban Aura Fine Jewels
    client_name: 'Urban Aura Fine Jewels',
    fb_page_id: '1092837461923',
    fb_page_name: 'Urban Aura Fine Jewels',
    form_id: 'form-aura-01',
    form_name: 'Bridal Diamond Collection Consultations',
    ad_id: 'ad-aura-301',
    ad_name: 'Solitaire & Polki Heritage Carousel',
    campaign_name: 'Spring Wedding Season 2026',
    lead_name: 'Pooja Kapoor',
    lead_phone: '+91 98110 54321',
    lead_email: 'pooja.kapoor92@gmail.com',
    city: 'Delhi NCR',
    service_requested: 'Custom Bridal Diamond Set (Choker + Earrings)',
    budget: '₹12,50,000 - ₹15,00,000',
    custom_answers: [
      { question: 'Wedding Date', answer: 'November 2026' },
      { question: 'Preferred Metal', answer: '18K Rose Gold with VVS Solitaire' }
    ],
    status: 'Proposal Sent',
    created_time: '2026-03-18T18:20:00Z',
    whatsapp_status: 'Replied',
    last_whatsapp_at: '2026-03-18T18:25:00Z',
    notes: 'Private boutique VIP appointment booked for Saturday 3 PM.'
  },
  {
    id: 'fb-lead-104',
    client_id: 3, // Urban Aura Fine Jewels
    client_name: 'Urban Aura Fine Jewels',
    fb_page_id: '1092837461923',
    fb_page_name: 'Urban Aura Fine Jewels',
    form_id: 'form-aura-02',
    form_name: 'Bespoke Custom Jewelry Orders',
    ad_id: 'ad-aura-305',
    ad_name: 'Artisan Emerald Necklaces Reel',
    campaign_name: 'Spring Wedding Season 2026',
    lead_name: 'Kavita Singhania',
    lead_phone: '+91 99201 88472',
    lead_email: 'kavita@singhaniagroup.com',
    city: 'Mumbai',
    service_requested: 'Emerald Cocktail Ring with Baguette Diamonds',
    budget: '₹4,50,000',
    custom_answers: [
      { question: 'Ring Size', answer: '14 Indian Standard' }
    ],
    status: 'Contacted',
    created_time: '2026-03-19T11:45:00Z',
    whatsapp_status: 'Message Sent',
    last_whatsapp_at: '2026-03-19T11:50:30Z',
    notes: 'Sent catalog PDF via WhatsApp Business.'
  },
  {
    id: 'fb-lead-105',
    client_id: 2, // State Renewable Energy Board
    client_name: 'State Renewable Energy Board',
    fb_page_id: '1073829104829',
    fb_page_name: 'State Renewable Energy Initiatives',
    form_id: 'form-sreb-01',
    form_name: 'Commercial Solar Subsidies Inquiry',
    ad_id: 'ad-solar-11',
    ad_name: 'Rooftop Solar Subsidy Video Ad',
    campaign_name: 'State Clean Green Mission',
    lead_name: 'Dinesh Rathore',
    lead_phone: '+91 94141 33219',
    lead_email: 'drathore@textilemills.org',
    city: 'Bhilwara',
    service_requested: '500 kW Industrial Rooftop Solar Grid',
    budget: '₹2,20,00,000',
    custom_answers: [
      { question: 'Connected Load', answer: '750 kVA' },
      { question: 'Roof Area', answer: '45,000 sq ft shed' }
    ],
    status: 'Qualified',
    created_time: '2026-03-17T09:10:00Z',
    whatsapp_status: 'Message Sent',
    last_whatsapp_at: '2026-03-17T09:15:00Z',
    notes: 'Site inspection scheduled with SREB certified technical auditors.'
  }
];

export const INITIAL_WHATSAPP_CONFIG: WhatsAppConfig = {
  waba_id: 'WABA-920184729104829',
  phone_number_id: '109384729104820',
  business_phone_number: '+91 98200 12345',
  api_token: 'EAAOx_VKD_META_CLOUD_API_TOKEN_PERMANENT_SYSTEM_USER_9921',
  webhook_verify_token: 'vkd_waba_secure_verify_token_2026',
  default_country_code: '+91',
  auto_greeting_enabled: true,
  webhook_status: 'Connected',
  templates: [
    {
      id: 'tmpl-lead-greet',
      name: 'lead_instant_welcome',
      category: 'LEAD_GREETING',
      label: 'Instant Facebook Lead Greeting',
      text: 'Namaste {{lead_name}}! 🙏 Thank you for reaching out to {{client_name}} via our Facebook Ad. We received your request regarding "{{service_requested}}". Our specialist will assist you shortly. In the meantime, would you like us to share our brochure or schedule a call?'
    },
    {
      id: 'tmpl-quote-sent',
      name: 'quotation_ready_alert',
      category: 'PROPOSAL',
      label: 'Quotation Proposal Alert',
      text: 'Hello {{client_name}}, your customized quotation proposal #{{quote_number}} has been prepared by VK Digi Solutions. Total Estimate: ₹{{amount}}. You can view or approve it directly. Please let us know if any revisions are needed!'
    },
    {
      id: 'tmpl-renew-alert',
      name: 'service_renewal_reminder',
      category: 'RENEWAL_REMINDER',
      label: 'Domain / Hosting Renewal Alert',
      text: 'Reminder: Dear {{client_name}}, your subscription for {{service_name}} is due for renewal on {{expiry_date}} ({{days_left}} days remaining). Please confirm renewal to ensure uninterrupted service.'
    },
    {
      id: 'tmpl-invoice-sent',
      name: 'gst_invoice_notification',
      category: 'INVOICE_SENT',
      label: 'GST Tax Invoice Notification',
      text: 'Dear {{client_name}}, Tax Invoice #{{invoice_number}} for ₹{{amount}} has been generated. Payment status: {{status}}. Kindly find the digital copy attached.'
    },
    {
      id: 'tmpl-custom',
      name: 'custom_agency_message',
      category: 'CUSTOM',
      label: 'Direct Custom Message',
      text: 'Hello {{lead_name}}, this is the team at {{client_name}}. Following up on your inquiry—are you available for a brief discussion today?'
    }
  ]
};

export const INITIAL_WHATSAPP_LOGS: WhatsAppMessageLog[] = [
  {
    id: 'wlog-01',
    recipient_name: 'Rajiv Sengupta',
    recipient_phone: '+91 98310 99482',
    client_id: 1,
    client_name: 'Apex Global Logistics Ltd',
    lead_id: 'fb-lead-101',
    template_used: 'lead_instant_welcome',
    message_body: 'Namaste Rajiv Sengupta! 🙏 Thank you for reaching out to Apex Global Logistics Ltd via our Facebook Ad. We received your request regarding "Temperature Controlled Warehousing (15,000 sq.ft)". Our specialist will assist you shortly.',
    status: 'Delivered',
    sent_at: '2026-03-19 14:35:12',
    direction: 'outbound'
  },
  {
    id: 'wlog-02',
    recipient_name: 'Pooja Kapoor',
    recipient_phone: '+91 98110 54321',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    lead_id: 'fb-lead-103',
    template_used: 'lead_instant_welcome',
    message_body: 'Namaste Pooja Kapoor! 🙏 Thank you for contacting Urban Aura Fine Jewels via Facebook. We have received your inquiry for Bridal Diamond Collection Consultations.',
    status: 'Read',
    sent_at: '2026-03-18 18:25:00',
    direction: 'outbound'
  },
  {
    id: 'wlog-03',
    recipient_name: 'Kavita Singhania',
    recipient_phone: '+91 99201 88472',
    client_id: 3,
    client_name: 'Urban Aura Fine Jewels',
    lead_id: 'fb-lead-104',
    template_used: 'lead_instant_welcome',
    message_body: 'Namaste Kavita Singhania! Thank you for inquiring about Bespoke Custom Jewelry Orders at Urban Aura Fine Jewels.',
    status: 'Sent',
    sent_at: '2026-03-19 11:50:30',
    direction: 'outbound'
  }
];
