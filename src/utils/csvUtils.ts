import { Client, Invoice, ClientSubscription, ClientType, InvoiceStatus } from '../types';

/**
 * Escapes and formats a single value for CSV (RFC 4180 compliant).
 * Encloses in double quotes if it contains commas, newlines, or quotes.
 */
export function formatCSVCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM.
 * BOM (\uFEFF) ensures Excel and Numbers render UTF-8 (currency symbols, Indian names, etc.) seamlessly.
 */
export function triggerCSVDownload(csvContent: string, fileName: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parses raw CSV string into a 2D array of string cells, complying with RFC 4180.
 * Accurately parses multiline fields, commas inside quotes, and escaped quotes.
 */
export function parseRawCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;
  const text = csvText.replace(/^\uFEFF/, ''); // strip BOM if present

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i++;
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      i++;
      continue;
    }

    if ((char === '\r' || char === '\n') && !inQuotes) {
      // End of row
      currentRow.push(currentCell.trim());
      // Skip \r\n pair
      if (char === '\r' && nextChar === '\n') {
        i += 2;
      } else {
        i++;
      }
      // Only push non-empty rows
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += char;
    i++;
  }

  // Final dangling cell
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes a header string for fuzzy matching (e.g., "Contact Person" -> "contactperson")
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/* ============================================================================
 * CLIENTS EXPORT & IMPORT
 * ============================================================================ */

export interface ClientExportOptions {
  fileName?: string;
  invoices?: Invoice[];
  subscriptions?: ClientSubscription[];
  mode?: 'standard' | 'reporting';
}

/**
 * Export Client Directory or Comprehensive Client Report to CSV
 */
export function exportClientsToCSV(clients: Client[], options?: ClientExportOptions): void {
  const mode = options?.mode || 'standard';
  const timestamp = new Date().toISOString().split('T')[0];

  if (mode === 'reporting') {
    // Reporting Mode: Includes financial ledger calculations and active services
    const headers = [
      'Client Code',
      'Client / Company Name',
      'Account Type',
      'Contact Person',
      'Email Address',
      'Mobile Number',
      'City',
      'Address',
      'Active Subscriptions Count',
      'Total Billed (INR)',
      'Total Paid (INR)',
      'Outstanding Balance (INR)',
      'Account Status',
      'Start Date',
      'Client Since',
      'Notes'
    ];

    const rows = clients.map(client => {
      const clientInvoices = (options?.invoices || []).filter(i => i.client_id === client.id);
      const totalInvoiced = clientInvoices.reduce((acc, i) => acc + i.grand_total, 0);
      const totalPaid = clientInvoices.reduce((acc, i) => acc + (i.amount_received ?? (i.payment_status==='Paid'?i.grand_total:0)), 0);
      const balance = Math.max(0, totalInvoiced - totalPaid);

      const activeSubsCount = (options?.subscriptions || []).filter(
        s => s.client_id === client.id && s.status !== 'Cancelled'
      ).length;

      return [
        formatCSVCell(client.client_code),
        formatCSVCell(client.name),
        formatCSVCell(client.client_type),
        formatCSVCell(client.contact_person),
        formatCSVCell(client.email),
        formatCSVCell(client.mobile),
        formatCSVCell(client.city),
        formatCSVCell(client.address),
        formatCSVCell(activeSubsCount),
        formatCSVCell(totalInvoiced),
        formatCSVCell(totalPaid),
        formatCSVCell(balance),
        formatCSVCell(client.status),
        formatCSVCell(client.start_date || client.created_at),
        formatCSVCell(client.created_at),
        formatCSVCell(client.notes || '')
      ].join(',');
    });

    const csvData = [headers.map(formatCSVCell).join(','), ...rows].join('\r\n');
    triggerCSVDownload(csvData, options?.fileName || `VKD_Client_Reporting_Ledger_${timestamp}.csv`);
  } else {
    // Standard Directory Mode
    const headers = [
      'Client Code',
      'Company Name',
      'Client Type',
      'Contact Person',
      'Email',
      'Mobile',
      'City',
      'Address',
      'Lead Source',
      'Status',
      'Start Date',
      'Notes',
      'Created Date'
    ];

    const rows = clients.map(c => [
      formatCSVCell(c.client_code),
      formatCSVCell(c.name),
      formatCSVCell(c.client_type),
      formatCSVCell(c.contact_person),
      formatCSVCell(c.email),
      formatCSVCell(c.mobile),
      formatCSVCell(c.city),
      formatCSVCell(c.address),
      formatCSVCell(c.source),
      formatCSVCell(c.status),
      formatCSVCell(c.start_date || c.created_at),
      formatCSVCell(c.notes || ''),
      formatCSVCell(c.created_at)
    ].join(','));

    const csvData = [headers.map(formatCSVCell).join(','), ...rows].join('\r\n');
    triggerCSVDownload(csvData, options?.fileName || `VKD_Clients_Directory_${timestamp}.csv`);
  }
}

export interface ParseClientsResult {
  clients: Omit<Client, 'id'>[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}

/**
 * Parses and validates CSV content for importing clients.
 */
export function parseClientsFromCSV(csvText: string, existingClients: Client[] = []): ParseClientsResult {
  const parsed = parseRawCSV(csvText);
  const errors: string[] = [];
  const warnings: string[] = [];
  const clients: Omit<Client, 'id'>[] = [];

  if (parsed.length === 0) {
    return { clients: [], errors: ['The provided CSV file is empty.'], warnings: [], totalRows: 0 };
  }

  const rawHeaders = parsed[0];
  const headerMap: { [key: string]: number } = {};

  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  // Check required column for company name
  const nameIdx = headerMap['companyname'] ?? headerMap['clientname'] ?? headerMap['name'] ?? headerMap['client'];
  if (nameIdx === undefined) {
    return {
      clients: [],
      errors: ['Missing required column: "Company Name" or "Client Name". Please check the CSV header.'],
      warnings: [],
      totalRows: parsed.length - 1
    };
  }

  const codeIdx = headerMap['clientcode'] ?? headerMap['code'];
  const typeIdx = headerMap['clienttype'] ?? headerMap['type'] ?? headerMap['accounttype'];
  const contactIdx = headerMap['contactperson'] ?? headerMap['contact'] ?? headerMap['person'];
  const emailIdx = headerMap['email'] ?? headerMap['emailaddress'];
  const mobileIdx = headerMap['mobile'] ?? headerMap['phone'] ?? headerMap['mobilenumber'];
  const cityIdx = headerMap['city'] ?? headerMap['location'];
  const addressIdx = headerMap['address'] ?? headerMap['billingaddress'];
  const sourceIdx = headerMap['leadsource'] ?? headerMap['source'];
  const statusIdx = headerMap['status'] ?? headerMap['accountstatus'];
  const startIdx = headerMap['startdate'] ?? headerMap['contractstartdate'] ?? headerMap['onboardingdate'];
  const notesIdx = headerMap['notes'] ?? headerMap['remarks'] ?? headerMap['description'];
  const createdIdx = headerMap['createddate'] ?? headerMap['createdat'] ?? headerMap['clientsince'];

  const existingCodes = new Set(existingClients.map(c => c.client_code.toUpperCase()));
  let nextCodeNum = 1000 + existingClients.length + 1;

  for (let r = 1; r < parsed.length; r++) {
    const row = parsed[r];
    if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue; // skip blank rows
    }

    const name = row[nameIdx]?.trim() || '';
    if (!name) {
      warnings.push(`Row #${r + 1}: Skipped due to empty Company/Client Name.`);
      continue;
    }

    let client_code = (codeIdx !== undefined ? row[codeIdx]?.trim() : '') || '';
    if (!client_code) {
      client_code = `VKD-CLI-${nextCodeNum++}`;
    } else if (existingCodes.has(client_code.toUpperCase())) {
      warnings.push(`Row #${r + 1} (${name}): Code "${client_code}" already exists, generated new code.`);
      client_code = `VKD-CLI-${nextCodeNum++}`;
    }
    existingCodes.add(client_code.toUpperCase());

    // Client type resolution
    const rawType = (typeIdx !== undefined ? row[typeIdx]?.trim() : '') || 'Corporate';
    const validTypes: ClientType[] = ['Corporate', 'Government', 'Retail', 'Startup', 'NGO'];
    const matchedType = validTypes.find(t => t.toLowerCase() === rawType.toLowerCase()) || 'Corporate';

    // Status resolution
    const rawStatus = (statusIdx !== undefined ? row[statusIdx]?.trim() : '') || 'Active';
    const validStatuses = ['Active', 'Inactive', 'Lead'] as const;
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Active';

    const client: Omit<Client, 'id'> = {
      client_code,
      name,
      client_type: matchedType,
      contact_person: (contactIdx !== undefined ? row[contactIdx]?.trim() : '') || 'Contact Manager',
      email: (emailIdx !== undefined ? row[emailIdx]?.trim() : '') || `contact@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      mobile: (mobileIdx !== undefined ? row[mobileIdx]?.trim() : '') || '+91 98000 00000',
      city: (cityIdx !== undefined ? row[cityIdx]?.trim() : '') || 'Mumbai',
      address: (addressIdx !== undefined ? row[addressIdx]?.trim() : '') || '',
      source: (sourceIdx !== undefined ? row[sourceIdx]?.trim() : '') || 'CSV Import',
      status: matchedStatus,
      start_date: (startIdx !== undefined && row[startIdx]?.trim()) ? row[startIdx].trim() : ((createdIdx !== undefined && row[createdIdx]?.trim()) ? row[createdIdx].trim() : new Date().toISOString().split('T')[0]),
      notes: (notesIdx !== undefined ? row[notesIdx]?.trim() : '') || 'Imported via CSV',
      created_at: (createdIdx !== undefined && row[createdIdx]?.trim()) ? row[createdIdx].trim() : new Date().toISOString().split('T')[0]
    };

    clients.push(client);
  }

  return {
    clients,
    errors,
    warnings,
    totalRows: parsed.length - 1
  };
}

/**
 * Returns sample CSV template for clients import
 */
export function getSampleClientsCSV(): string {
  return [
    'Client Code,Company Name,Client Type,Contact Person,Email,Mobile,City,Address,Lead Source,Status,Notes',
    'VKD-CLI-1005,Nirmaan Infrastructure Ltd,Corporate,Rajesh Singhania,rajesh@nirmaaninfra.in,+91 98110 54321,Pune,"Block B, Hinjewadi Phase 1",Client Referral,Active,High-value enterprise construction portal',
    'VKD-CLI-1006,Vedic Herbals & Organics,Retail,Pooja Sundaram,pooja@vedicherbals.co.in,+91 97400 67890,Bengaluru,"Indiranagar 100ft Road",Direct Website Lead,Active,D2C Shopify store migration'
  ].join('\r\n');
}


/* ============================================================================
 * INVOICES EXPORT & IMPORT
 * ============================================================================ */

export interface InvoiceExportOptions {
  fileName?: string;
}

/**
 * Export Invoice Data to CSV
 */
export function exportInvoicesToCSV(invoices: Invoice[], options?: InvoiceExportOptions): void {
  const timestamp = new Date().toISOString().split('T')[0];
  const headers = [
    'Invoice Number',
    'Client ID',
    'Client Name',
    'Subtotal (INR)',
    'GST Tax (18%) (INR)',
    'Grand Total (INR)',
    'Payment Status',
    'Due Date',
    'Invoice Date', 'Received (INR)', 'Outstanding (INR)'
  ];

  const rows = invoices.map(inv => [
    formatCSVCell(inv.invoice_number),
    formatCSVCell(inv.client_id),
    formatCSVCell(inv.client_name || 'Client'),
    formatCSVCell(inv.total_amount),
    formatCSVCell(inv.gst_tax),
    formatCSVCell(inv.grand_total),
    formatCSVCell(inv.payment_status),
    formatCSVCell(inv.due_date),
    formatCSVCell(inv.created_at), formatCSVCell(inv.amount_received ?? (inv.payment_status==='Paid'?inv.grand_total:0)), formatCSVCell(inv.balance_due ?? (inv.payment_status==='Paid'?0:inv.grand_total))
  ].join(','));

  const csvData = [headers.map(formatCSVCell).join(','), ...rows].join('\r\n');
  triggerCSVDownload(csvData, options?.fileName || `VKD_Invoices_GST_Ledger_${timestamp}.csv`);
}

export interface ParseInvoicesResult {
  invoices: Omit<Invoice, 'id'>[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}

/**
 * Parses and validates CSV content for importing invoices.
 * Automatically links to existing clients when matching client name or ID.
 */
export function parseInvoicesFromCSV(csvText: string, existingClients: Client[] = [], existingInvoices: Invoice[] = []): ParseInvoicesResult {
  const parsed = parseRawCSV(csvText);
  const errors: string[] = [];
  const warnings: string[] = [];
  const invoices: Omit<Invoice, 'id'>[] = [];

  if (parsed.length === 0) {
    return { invoices: [], errors: ['The provided CSV file is empty.'], warnings: [], totalRows: 0 };
  }

  const rawHeaders = parsed[0];
  const headerMap: { [key: string]: number } = {};

  rawHeaders.forEach((h, idx) => {
    headerMap[normalizeHeader(h)] = idx;
  });

  const invNumIdx = headerMap['invoicenumber'] ?? headerMap['invoiceno'] ?? headerMap['invno'] ?? headerMap['number'];
  const clientNameIdx = headerMap['clientname'] ?? headerMap['client'] ?? headerMap['companyname'];
  const clientIdIdx = headerMap['clientid'];
  const subtotalIdx = headerMap['subtotal'] ?? headerMap['totalamount'] ?? headerMap['amount'];
  const gstIdx = headerMap['gsttax'] ?? headerMap['gst'] ?? headerMap['tax'];
  const grandTotalIdx = headerMap['grandtotal'] ?? headerMap['total'] ?? headerMap['finalamount'];
  const statusIdx = headerMap['paymentstatus'] ?? headerMap['status'];
  const dueDateIdx = headerMap['duedate'] ?? headerMap['due'];
  const createdIdx = headerMap['invoicedate'] ?? headerMap['createdat'] ?? headerMap['date'];

  const existingNumbers = new Set(existingInvoices.map(i => i.invoice_number.toUpperCase()));
  let nextInvSeq = existingInvoices.length + 1;

  for (let r = 1; r < parsed.length; r++) {
    const row = parsed[r];
    if (row.length === 0 || row.every(cell => !cell || cell.trim() === '')) {
      continue;
    }

    // Determine client link
    const rawClientName = clientNameIdx !== undefined ? row[clientNameIdx]?.trim() : '';
    const rawClientId = clientIdIdx !== undefined ? parseInt(row[clientIdIdx]?.trim(), 10) : NaN;

    let matchedClient = existingClients.find(c => {
      if (!isNaN(rawClientId) && c.id === rawClientId) return true;
      if (rawClientName && c.name.toLowerCase() === rawClientName.toLowerCase()) return true;
      return false;
    });

    if (!matchedClient && existingClients.length > 0) {
      // Fallback: match by partial name or use first client
      matchedClient = existingClients.find(c => rawClientName && c.name.toLowerCase().includes(rawClientName.toLowerCase())) || existingClients[0];
      if (rawClientName) {
        warnings.push(`Row #${r + 1}: Client "${rawClientName}" not found exactly; mapped to "${matchedClient.name}".`);
      }
    }

    const clientId = matchedClient?.id || 1;
    const clientName = matchedClient?.name || rawClientName || 'Client';

    // Numbers calculation
    const rawSubtotal = subtotalIdx !== undefined ? parseFloat(row[subtotalIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;
    const rawGrandTotal = grandTotalIdx !== undefined ? parseFloat(row[grandTotalIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;
    let rawGst = gstIdx !== undefined ? parseFloat(row[gstIdx]?.replace(/[^0-9.]/g, '') || '0') : 0;

    let totalAmount = rawSubtotal;
    let grandTotal = rawGrandTotal;

    if (totalAmount === 0 && grandTotal > 0) {
      totalAmount = Math.round(grandTotal / 1.18);
      rawGst = grandTotal - totalAmount;
    } else if (totalAmount > 0 && grandTotal === 0) {
      rawGst = Math.round(totalAmount * 0.18);
      grandTotal = totalAmount + rawGst;
    } else if (totalAmount === 0 && grandTotal === 0) {
      totalAmount = 10000;
      rawGst = 1800;
      grandTotal = 11800;
      warnings.push(`Row #${r + 1}: Missing amounts; defaulted to Subtotal ₹10,000 + GST ₹1,800 = ₹11,800.`);
    }

    // Invoice Number
    let invNum = (invNumIdx !== undefined ? row[invNumIdx]?.trim() : '') || '';
    if (!invNum) {
      invNum = `INV-2026-${String(nextInvSeq++).padStart(3, '0')}`;
    } else if (existingNumbers.has(invNum.toUpperCase())) {
      warnings.push(`Row #${r + 1}: Invoice Number "${invNum}" already exists, generated unique sequence.`);
      invNum = `INV-2026-${String(nextInvSeq++).padStart(3, '0')}`;
    }
    existingNumbers.add(invNum.toUpperCase());

    // Status
    const rawStatus = (statusIdx !== undefined ? row[statusIdx]?.trim() : '') || 'Pending';
    const validStatuses: InvoiceStatus[] = ['Paid', 'Partial', 'Pending', 'Overdue'];
    const matchedStatus = validStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase()) || 'Pending';

    // Dates
    const today = new Date().toISOString().split('T')[0];
    const dueDate = (dueDateIdx !== undefined && row[dueDateIdx]?.trim()) ? row[dueDateIdx].trim() : new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
    const createdDate = (createdIdx !== undefined && row[createdIdx]?.trim()) ? row[createdIdx].trim() : today;

    invoices.push({
      invoice_number: invNum,
      client_id: clientId,
      client_name: clientName,
      total_amount: totalAmount,
      gst_tax: rawGst,
      grand_total: grandTotal,
      payment_status: matchedStatus,
      due_date: dueDate,
      created_at: createdDate
    });
  }

  return {
    invoices,
    errors,
    warnings,
    totalRows: parsed.length - 1
  };
}

/**
 * Returns sample CSV template for invoices import
 */
export function getSampleInvoicesCSV(): string {
  return [
    'Invoice Number,Client Name,Subtotal,GST Tax,Grand Total,Payment Status,Due Date,Invoice Date',
    'INV-2026-006,Apex Global Logistics Ltd,50000,9000,59000,Paid,2026-04-10,2026-03-25',
    'INV-2026-007,Urban Aura Fine Jewels,25000,4500,29500,Pending,2026-04-15,2026-03-28'
  ].join('\r\n');
}
