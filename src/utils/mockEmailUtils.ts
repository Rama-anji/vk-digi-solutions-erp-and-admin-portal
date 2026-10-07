import { Client, ClientSubscription, RenewalEmailNotification } from '../types';

/**
 * Generates an automated renewal reminder subject line based on urgency and service details.
 */
export function generateRenewalEmailSubject(
  serviceName: string,
  daysRemaining: number,
  clientName: string
): string {
  if (daysRemaining <= 0) {
    return `[URGENT: ACTION REQUIRED] Your ${serviceName} subscription expired today - VK Digi Solutions`;
  }
  if (daysRemaining <= 3) {
    return `[FINAL NOTICE] Action Required: ${serviceName} expires in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} - VK Digi Solutions`;
  }
  if (daysRemaining <= 7) {
    return `[URGENT RENEWAL] ${serviceName} expiring in ${daysRemaining} days - VK Digi Solutions`;
  }
  return `[RENEWAL NOTICE] Upcoming renewal for ${serviceName} (${daysRemaining} days remaining) - VK Digi Solutions`;
}

/**
 * Formats the email body with structured agency letterhead details.
 */
export function generateRenewalEmailBody(
  client: { name: string; contact_person: string; email: string },
  sub: ClientSubscription
): string {
  const urgencyText = sub.days_remaining && sub.days_remaining <= 5
    ? 'CRITICAL NOTICE: Service interruption or domain suspension may occur if renewal is not confirmed prior to the expiry cutoff.'
    : 'Please arrange for renewal authorization to ensure zero service disruption.';

  const autoRenewNotice = sub.auto_renew
    ? '• AUTO-RENEWAL STATUS: ENABLED (This service is slated for automatic renewal cycle. If you wish to make changes, please notify us before expiry).'
    : '• AUTO-RENEWAL STATUS: MANUAL OUTREACH REQUIRED (Please confirm invoice approval and payment clearance before expiry to prevent downtime).';

  return `Dear ${client.contact_person || client.name},

Greetings from VK Digi Solutions Pvt Ltd.

This is an automated notification from our billing and hosting infrastructure regarding your ongoing digital service subscription.

=======================================================
RENEWAL SUMMARY
=======================================================
• Client Name: ${client.name}
• Subscribed Service: ${sub.service_name}
• Category: ${sub.category || 'Cloud & Hosting'}
• Current Expiry Date: ${sub.expiry_date}
• Days Remaining: ${sub.days_remaining ?? 'Under 15'} days
• Renewal Billing Cycle: ${sub.billing_cycle}
• Renewal Rate: ₹${sub.amount.toLocaleString('en-IN')} (+ 18% GST applicable)
${autoRenewNotice}

${urgencyText}

=======================================================
REMITTANCE & WIRE DETAILS
=======================================================
Bank Name: HDFC Bank Ltd
Account Name: VK Digi Solutions Pvt Ltd
Current Account: 50200049182391
IFSC Code: HDFC0000060 (Fort Branch, Mumbai)
UPI ID: billing.vkd@hdfcbank

For online payment gateway links, purchase orders, or updated tax invoices, please reply directly to this notice or contact our dedicated renewals desk:

Email: renewals@vkdsolutions.com | billing@vkdsolutions.com
Phone: +91 98200 12345
Office: 402-404, Corporate Cyber Tower, Infotech City, Mumbai 400051

Thank you for choosing VK Digi Solutions as your technology partner.

Warm regards,
Automated Renewals & Infrastructure Desk
VK Digi Solutions Pvt Ltd
https://vkdsolutions.com`;
}

/**
 * Creates a new RenewalEmailNotification object from a subscription and client.
 */
export function createRenewalNotification(
  sub: ClientSubscription,
  client: Client,
  status: 'Queued' | 'Sent' = 'Queued',
  sentAt?: string
): RenewalEmailNotification {
  const daysRemaining = sub.days_remaining ?? 10;
  const subject = generateRenewalEmailSubject(sub.service_name || 'Service', daysRemaining, client.name);
  const body = generateRenewalEmailBody(client, sub);
  const now = new Date().toISOString();

  return {
    id: `NOTIF-${sub.id}-${Date.now().toString(36).toUpperCase()}`,
    subscription_id: sub.id,
    client_id: sub.client_id,
    client_name: client.name,
    client_email: client.email,
    client_contact: client.contact_person || 'Authorized Contact',
    service_name: sub.service_name || 'Service',
    category: sub.category || 'Cloud & Hosting',
    amount: sub.amount,
    billing_cycle: sub.billing_cycle,
    expiry_date: sub.expiry_date,
    days_remaining: daysRemaining,
    auto_renew: sub.auto_renew,
    subject,
    body_text: body,
    status,
    triggered_at: now.split('T')[0] + ' ' + now.split('T')[1].substring(0, 5),
    sent_at: sentAt,
    simulated_delivery_id: status === 'Sent' 
      ? `<msg-vkd-${Date.now().toString().slice(-6)}@smtp.vkdsolutions.com>`
      : undefined
  };
}

/**
 * Generates initial mock notifications for all existing subscriptions that are marked 'Expiring Soon'.
 */
export function generateInitialNotifications(
  subscriptions: ClientSubscription[],
  clients: Client[]
): RenewalEmailNotification[] {
  const expiring = subscriptions.filter(s => s.status === 'Expiring Soon');
  
  return expiring.map((sub, index) => {
    const client = clients.find(c => c.id === sub.client_id) || {
      id: sub.client_id,
      name: sub.client_name || 'Valued Client',
      contact_person: 'Managing Director',
      email: 'contact@client.in'
    } as Client;

    // Simulate that the first item was sent 1 day ago as proof of historical dispatch, others are Queued
    const isSent = index === 0;
    const sentDate = isSent ? '2026-09-18 10:30' : undefined;

    return createRenewalNotification(sub, client, isSent ? 'Sent' : 'Queued', sentDate);
  });
}
