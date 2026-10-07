import { RenewSubscriptionButton, RenewSubscription } from './RenewSubscriptionButton';
import { SubscriptionAutoRenew } from './SubscriptionAutoRenew';
import { RenewalPaymentStatus, UpdateRenewalPayment } from './RenewalPaymentStatus';
import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import React, { useState } from 'react';
import { needsRenewalAttention } from '../utils/renewalStatus';
import {
  RefreshCw,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Plus,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  Filter,
  Check,
  X,
  ArrowLeft,
  Mail,
  Send,
  MailCheck,
  Inbox,
  Copy,
  Terminal,
  Search,
  Sparkles,
  Info } from
'lucide-react';
import { ClientSubscription, Client, ServiceCatalog, BillingCycle, RenewalEmailNotification } from '../types';



interface RenewalsViewProps {
  summary: { all: number; active: number; expiring: number; expired: number; queuedEmails: number };
  company: Record<string,string>;
  services: ServiceCatalog[];
  subscriptions: ClientSubscription[];
  clients: Client[];
  onRenew: RenewSubscription;
  onUpdateRenewalPayment: UpdateRenewalPayment;
  onAddSubscription: (newSub: Partial<ClientSubscription>) => Promise<unknown>;
  onToggleAutoRenew?: (subId: number, autoRenew: boolean) => void;
  emailNotifications?: RenewalEmailNotification[];
  onSendEmail?: (notificationId: string) => void;
  onSendAllEmails?: () => void;
  onMarkExpiringSoon?: (subId: number) => void;
}

export const RenewalsView: React.FC<RenewalsViewProps> = ({
  company, summary,
  services: SERVICES_CATALOG,
  subscriptions,
  clients,
  onRenew, onUpdateRenewalPayment,
  onAddSubscription,
  onToggleAutoRenew,
  emailNotifications = [],
  onSendEmail,
  onSendAllEmails,
  onMarkExpiringSoon
}) => {
  const [pageMode, setPageMode] = useState<'list' | 'add' | 'email_center'>('list');
  const [filter, setFilter] = useState<'All' | 'Expiring Soon' | 'Active' | 'Expired'>('All');
  const [autoRenewFilter, setAutoRenewFilter] = useState<'all' | 'manual_only' | 'auto_only'>('all');

  // Email Notification Center State
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState<'all' | 'queued' | 'sent'>('all');
  const [emailSearchQuery, setEmailSearchQuery] = useState('');
  const [sendingNotifId, setSendingNotifId] = useState<string | null>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [showSmtpLogs, setShowSmtpLogs] = useState<boolean>(false);

  // New Subscription Form
  const [selectedClientId, setSelectedClientId] = useState<number>(clients[0]?.id || 1);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(SERVICES_CATALOG[0]?.id || 0);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(SERVICES_CATALOG[0]?.billing_frequency || 'Monthly');
  const [customDuration, setCustomDuration] = useState<string>(SERVICES_CATALOG[0]?.custom_duration || '45 days');
  const [amount, setAmount] = useState<number>(SERVICES_CATALOG[0]?.default_rate || 0);
  const [newSubAutoRenew, setNewSubAutoRenew] = useState<boolean>(true);

  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  // Expiry alert metrics
  const expiringSubs = subscriptions.filter(s => s.status === 'Expiring Soon');
  const expiringCount = summary.expiring;
  const manualExpiringCount = expiringSubs.filter((s) => !s.auto_renew).length;
  const autoExpiringCount = expiringSubs.filter((s) => s.auto_renew).length;

  // Email notification metrics
  const queuedEmails = emailNotifications.filter((n) => n.status === 'Queued');
  const queuedCount = summary.queuedEmails;
  const sentEmails = emailNotifications.filter((n) => n.status === 'Sent');
  const sentCount = sentEmails.length;

  // Filtered subscription list based on status and auto-renew toggle
  const filteredSubs = subscriptions.filter(sub => {
    const search = subscriptionSearch.trim().toLowerCase();
    if (search && ![sub.client_name, sub.service_name, sub.custom_duration].some(value => value?.toLowerCase().includes(search))) return false;
    if (filter === 'Expiring Soon' && sub.status !== 'Expiring Soon') return false;
    if (filter === 'Expired' && sub.status !== 'Expired') return false;
    if (filter === 'Active' && !['Active', 'Expiring Soon'].includes(sub.status)) return false;
    if (autoRenewFilter === 'manual_only' && sub.auto_renew) return false;
    if (autoRenewFilter === 'auto_only' && !sub.auto_renew) return false;
    return true;
  });

  // Filtered email notification list
  const filteredNotifications = emailNotifications.filter((n) => {
    if (emailFilter === 'queued' && n.status !== 'Queued') return false;
    if (emailFilter === 'sent' && n.status !== 'Sent') return false;
    if (emailSearchQuery.trim()) {
      const q = emailSearchQuery.toLowerCase();
      return (
        n.client_name.toLowerCase().includes(q) ||
        n.client_email.toLowerCase().includes(q) ||
        n.service_name.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q));

    }
    return true;
  });

  // Currently active notification in preview pane
  const activeNotif = emailNotifications.find((n) => n.id === selectedNotifId) || filteredNotifications[0] || emailNotifications[0];

  const handleCreateSub = async (e: React.FormEvent) => {try {
      e.preventDefault();
      const client = clients.find((c) => c.id === selectedClientId);
      const service = SERVICES_CATALOG.find((s) => s.id === selectedServiceId);

      if (creating) return;
      setCreating(true);
      await onAddSubscription({
        client_id: selectedClientId,
        client_name: client?.name || 'Client',
        service_id: selectedServiceId,
        service_name: service?.service_name || 'Service',
        category: service?.category || 'Cloud & Hosting',
        billing_cycle: billingCycle,
        custom_duration: billingCycle === 'Custom' ? customDuration : undefined,
        amount: amount,
        status: 'Active',
        auto_renew: billingCycle !== 'One-Time' && newSubAutoRenew
      });

      setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));} finally { setCreating(false); }};

  const handleTriggerSendEmail = async (notifId: string) => {
    if (sendingBatch || sendingNotifId) return;
    setSendingNotifId(notifId);
    try { await onSendEmail?.(notifId); }
    catch (error: any) { window.dispatchEvent(new CustomEvent('portal:error',{detail:error.message})); }
    finally { setSendingNotifId(null); }
  };

  const handleSendBatch = async () => {
    if(sendingBatch || sendingNotifId) return;
    setSendingBatch(true);
    try { await onSendAllEmails?.(); }
    catch(error:any) { window.dispatchEvent(new CustomEvent('portal:error',{detail:error.message})); }
    finally { setSendingBatch(false); }
  };
  const handleCopyEmail = (notif: RenewalEmailNotification) => {
    navigator.clipboard.writeText(notif.body_text);
    setCopiedEmailId(notif.id);
    setTimeout(() => setCopiedEmailId(null), 2500);
  };

  /* =========================================================================
   * PAGE 1: ASSIGN SERVICE SUBSCRIPTION (Dedicated In-Page Screen, No Popups)
   * ========================================================================= */
  if (pageMode === 'add') {
    return (
      <div className="renewals-page space-y-6 animate-in fade-in">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Subscriptions &amp; Renewals
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Assign Recurring Service to Client</h2>
            <p className="text-xs text-slate-500">Set the service term and renewal date.</p>
          </div>
          <div className="flex items-center space-x-2">
            <ActionButton
              type="button"
              onClick={() => setPageMode('list')}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
              
              Cancel
            </ActionButton>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E7EB] shadow-xs max-w-2xl mx-auto">
          <form onSubmit={handleCreateSub} className="space-y-5"><fieldset disabled={creating} className="space-y-5">
            {/* Client Select */}
            <div>
              <label className="block text-xs font-bold text-[#004077] uppercase tracking-wider mb-2">
                Client Profile
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004077]">
                
                {clients.map((c) =>
                <option key={c.id} value={c.id}>
                    {c.client_code} - {c.name} ({c.client_type})
                  </option>
                )}
              </select>
            </div>

            {/* Service Select */}
            <div>
              <label className="block text-xs font-bold text-[#004077] uppercase tracking-wider mb-2">
                Service Catalog Deliverable
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  setSelectedServiceId(sId);
                  const found = SERVICES_CATALOG.find((s) => s.id === sId);
                  if (found) {
                    setAmount(found.default_rate);
                    setBillingCycle(found.billing_frequency);
                    setCustomDuration(found.custom_duration || '45 days');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004077]">
                
                {SERVICES_CATALOG.map((s) =>
                <option key={s.id} value={s.id}>
                    {s.service_name} &bull; {s.category} (₹{s.default_rate.toLocaleString('en-IN')})
                  </option>
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Billing Cycle */}
              <div>
                <label className="block text-xs font-bold text-[#004077] uppercase tracking-wider mb-2">
                  Billing Frequency
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004077]">
                  
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Custom">Custom Duration</option>
                  <option value="One-Time">One-Time Project</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-[#004077] uppercase tracking-wider mb-2">
                  Recurring Fee (INR)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    value={amount}
                    step="0.01"
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                    min={0}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004077]" />
                  
                </div>
              </div>
            </div>

            {billingCycle === 'Custom' &&
            <div>
                <label className="block text-xs font-bold text-[#004077] uppercase tracking-wider mb-2">
                  Custom Duration Term
                </label>
                <input
                type="text"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                placeholder="e.g. 45 days or 2 months"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#004077]" />
              
              </div>
            }

            {/* Auto-Renew Option */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-[#004077]">Automatic Renewal Cycle</p>
                <p className="text-[11px] text-slate-500">Renew after expiry only when the renewal invoice is fully paid.</p>
              </div>
              <button
                type="button"
                disabled={billingCycle === 'One-Time'}
                onClick={() => setNewSubAutoRenew(!newSubAutoRenew)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                newSubAutoRenew && billingCycle !== 'One-Time' ? 'bg-emerald-600' : 'bg-slate-300'}`
                }>
                
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  newSubAutoRenew && billingCycle !== 'One-Time' ? 'translate-x-5' : 'translate-x-0'}`
                  } />
                
              </button>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setPageMode('list')}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition text-xs">
                
                Cancel &amp; Return
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold transition shadow-sm text-xs">
                
                {creating ? 'Saving...' : 'Assign & Save Service'}
              </ActionButton>
            </div>
          </fieldset></form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 2: AUTOMATED MOCK EMAIL NOTIFICATION DISPATCHER & OUTBOX (No Popups)
   * ========================================================================= */
  if (pageMode === 'email_center') {
    return (
      <div className="renewals-page space-y-6 animate-in fade-in">
        {/* Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Subscriptions &amp; Renewals
            </ActionButton>
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#004077] flex items-center justify-center font-bold">
                <Mail size={18} />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#004077] tracking-tight">
                  Renewal Email Reminders
                </h2>
                <p className="text-xs text-slate-500">Review reminders for services due within 15 days.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-y-2">
            <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                {queuedCount} Queued
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                {sentCount} Dispatched
              </span>
            </div>

            {queuedCount > 0 &&
            <ActionButton
              onClick={handleSendBatch} disabled={sendingBatch || !!sendingNotifId}
              className="px-4 py-2.5 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition flex items-center space-x-1.5"
              title="Send all currently queued automated renewal reminder emails">
              
                <Send size={14} />
                <span>{sendingBatch ? 'Sending...' : `Dispatch All Queued (${queuedCount})`}</span>
              </ActionButton>
            }
          </div>
        </div>

        {/* Split Layout: Left List + Right Email Client Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Notification Outbox / Queue List (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden flex flex-col">
            {/* Filter and Search Bar */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
              <div className="relative">
                <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={emailSearchQuery}
                  onChange={(e) => setEmailSearchQuery(e.target.value)}
                  placeholder="Filter by client, email, or service..."
                  className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] transition" />
                
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1.5 bg-slate-200/60 p-1 rounded-xl">
                <button
                  onClick={() => setEmailFilter('all')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center ${
                  emailFilter === 'all' ?
                  'bg-white text-[#004077] shadow-xs' :
                  'text-slate-600 hover:text-slate-900'}`
                  }>
                  
                  All ({emailNotifications.length})
                </button>
                <button
                  onClick={() => setEmailFilter('queued')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center flex items-center justify-center space-x-1 ${
                  emailFilter === 'queued' ?
                  'bg-amber-500 text-white shadow-xs' :
                  'text-slate-600 hover:text-slate-900'}`
                  }>
                  
                  <span>Queued</span>
                  <span className={`text-[9px] px-1.5 rounded-full ${emailFilter === 'queued' ? 'bg-white/30 text-white' : 'bg-amber-200 text-amber-900'}`}>
                    {queuedCount}
                  </span>
                </button>
                <button
                  onClick={() => setEmailFilter('sent')}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition text-center flex items-center justify-center space-x-1 ${
                  emailFilter === 'sent' ?
                  'bg-emerald-600 text-white shadow-xs' :
                  'text-slate-600 hover:text-slate-900'}`
                  }>
                  
                  <span>Dispatched</span>
                  <span className={`text-[9px] px-1.5 rounded-full ${emailFilter === 'sent' ? 'bg-white/30 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                    {sentCount}
                  </span>
                </button>
              </div>
            </div>

            {/* List of Notification Cards */}
            <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
              {filteredNotifications.map((notif) => {
                const isSelected = activeNotif?.id === notif.id;
                const isSending = sendingNotifId === notif.id;

                return (
                  <div
                    key={notif.id}
                    onClick={() => setSelectedNotifId(notif.id)}
                    className={`p-4 cursor-pointer transition flex flex-col space-y-2 relative ${
                    isSelected ?
                    'bg-blue-50/60 border-l-4 border-l-[#004077]' :
                    'hover:bg-slate-50 border-l-4 border-l-transparent'}`
                    }>
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="font-bold text-xs text-slate-800">{notif.client_name}</p>
                        <p className="text-[11px] text-slate-500">{notif.client_contact} &bull; {notif.recipient_email || notif.client_email}</p>
                      </div>
                      
                      {notif.status !== 'Sent' ?
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          <Clock size={10} className="mr-1" />
                          {notif.status}
                        </span> :

                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          <MailCheck size={10} className="mr-1" />
                          Dispatched
                        </span>
                      }
                    </div>

                    <div className="text-[11px] font-medium text-slate-700 truncate">
                      {notif.service_name}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                          {notif.days_remaining < 0 ? 'Expired ' + Math.abs(notif.days_remaining) + 'd ago' : notif.days_remaining === 0 ? 'Expires today' : 'Expires in ' + notif.days_remaining + 'd'}
                        </span>
                        <span>₹{notif.amount.toLocaleString('en-IN')}</span>
                      </div>

                      {notif.status !== 'Sent' ?
                      <ActionButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTriggerSendEmail(notif.id);
                        }}
                        disabled={sendingBatch || sendingNotifId !== null || !['Queued', 'Failed'].includes(notif.status)}
                        className="px-2.5 py-1 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-lg font-bold text-[10px] transition flex items-center space-x-1">
                        
                          {isSending ?
                        <RefreshCw size={10} className="animate-spin" /> :

                        <Send size={10} />
                        }
                          <span>{isSending ? 'Sending...' : 'Send Email'}</span>
                        </ActionButton> :

                      <span className="text-emerald-700 font-medium">
                          Sent: {notif.sent_at?.split(' ')[0]}
                        </span>
                      }
                    </div>
                  </div>);

              })}

              {filteredNotifications.length === 0 &&
              <div className="p-8 text-center text-slate-400">
                  <Inbox size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">No email notifications found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Subscriptions marked 'Expiring Soon' appear here automatically.</p>
                </div>
              }
            </div>
          </div>

          {/* Right Column: Full Email Preview & Dispatch Console (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            {activeNotif ?
            <div className="flex flex-col h-full">
                {/* Simulated Email Client Top Bar */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#004077] text-white">
                          AUTOMATED NOTIFICATION
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Trigger: status === 'Expiring Soon'
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 leading-snug">
                        {activeNotif.subject}
                      </h3>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <button
                      onClick={() => handleCopyEmail(activeNotif)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition flex items-center space-x-1"
                      title="Copy plain-text email message to clipboard">
                      
                        {copiedEmailId === activeNotif.id ?
                      <>
                            <Check size={13} className="text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </> :

                      <>
                            <Copy size={13} />
                            <span>Copy Text</span>
                          </>
                      }
                      </button>

                      {activeNotif.status !== 'Sent' ?
                    <ActionButton
                      onClick={() => handleTriggerSendEmail(activeNotif.id)}
                      disabled={sendingBatch || sendingNotifId !== null || !['Queued', 'Failed'].includes(activeNotif.status)}
                      className="px-4 py-1.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm">
                      
                          {sendingNotifId === activeNotif.id ?
                      <RefreshCw size={13} className="animate-spin" /> :

                      <Send size={13} />
                      }
                          <span>{sendingNotifId === activeNotif.id ? 'Dispatching via SMTP...' : 'Send Email'}</span>
                        </ActionButton> :

                    <ActionButton
                      onClick={() => handleTriggerSendEmail(activeNotif.id)}
                      disabled={sendingBatch || sendingNotifId !== null || !['Queued', 'Failed'].includes(activeNotif.status)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center space-x-1.5">
                      
                          <RotateCw size={12} />
                          <span>Already sent</span>
                        </ActionButton>
                    }
                    </div>
                  </div>

                  {/* Envelope Header Details */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-400 font-medium w-14">From:</span>
                        <span className="font-semibold text-slate-800">
                          {company.legal_name} &lt;{company.email || 'Configure SMTP sender'}&gt;
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Status: {activeNotif.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 font-medium w-14">To:</span>
                      <span className="font-semibold text-slate-800">
                        {activeNotif.client_contact} &lt;{activeNotif.recipient_email || activeNotif.client_email}&gt;
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                      <div>
                        <span>Triggered At: </span>
                        <span className="font-mono text-slate-700">{activeNotif.triggered_at}</span>
                      </div>
                      {activeNotif.sent_at &&
                    <div>
                          <span>Dispatched At: </span>
                          <span className="font-mono text-emerald-700 font-bold">{activeNotif.sent_at}</span>
                        </div>
                    }
                      {activeNotif.simulated_delivery_id &&
                    <div className="font-mono text-[10px] text-slate-400">
                          {activeNotif.simulated_delivery_id}
                        </div>
                    }
                    </div>
                  </div>
                </div>

                {/* Email Body Visual Canvas (Formatted HTML Agency Template) */}
                <div className="p-6 bg-[#F8FAFC] flex-1 overflow-y-auto max-h-[500px]"><div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 max-w-xl mx-auto"><p className="text-xs font-bold text-[#004077] mb-3">Saved email content{activeNotif.notice_kind === 'test' ? ' - TEST ONLY' : ''}</p><p className="text-xs text-red-700 mb-3">{activeNotif.error_message}</p><pre className="whitespace-pre-wrap font-sans text-xs text-slate-700">{activeNotif.body_text}</pre></div></div>

                {/* Footer Action Bar */}
                <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {activeNotif.status === 'Sent' ?
                  <span className="text-emerald-700 font-semibold flex items-center">
                        <CheckCircle2 size={13} className="mr-1 text-emerald-600" />
                        Sent to {activeNotif.recipient_email || activeNotif.client_email} on {activeNotif.sent_at}
                      </span> :

                  <span className="text-amber-700 font-semibold flex items-center">
                        <Clock size={13} className="mr-1 text-amber-600" />
                        Status: {activeNotif.status}
                      </span>
                  }
                  </span>

                  {activeNotif.status !== 'Sent' ?
                <ActionButton
                  onClick={() => handleTriggerSendEmail(activeNotif.id)}
                  disabled={sendingBatch || sendingNotifId !== null || !['Queued', 'Failed'].includes(activeNotif.status)}
                  className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm">
                  
                      {sendingNotifId === activeNotif.id ?
                  <RefreshCw size={13} className="animate-spin" /> :

                  <Send size={13} />
                  }
                      <span>{sendingNotifId === activeNotif.id ? 'Dispatching...' : 'Dispatch Email Now'}</span>
                    </ActionButton> :

                <ActionButton
                  onClick={() => handleTriggerSendEmail(activeNotif.id)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center space-x-1.5">
                  
                      <RotateCw size={13} />
                      <span>Already sent</span>
                    </ActionButton>
                }
                </div>

              </div> :

            <div className="p-16 text-center text-slate-400">
                <Mail size={36} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Select an email notice to preview</p>
              </div>
            }
          </div>

        </div>
      </div>);

  }

  /* =========================================================================
   * MAIN PAGE: SUBSCRIPTIONS & RENEWALS DASHBOARD (List Mode)
   * ========================================================================= */
  return (
    <div className="renewals-page space-y-6">
      
      {/* Top Banner Alert: Expiring Services & Automated Email Notification Queue */}
      {expiringCount > 0 &&
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EF7C00] text-white flex items-center justify-center shrink-0 font-bold shadow-xs">
              <AlertTriangle size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <h3 className="font-bold text-sm text-[#004077]">
                  {expiringCount} Subscriptions Expiring Within 15 Days
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                  {manualExpiringCount} Manual Outreach Needed
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {autoExpiringCount} Auto-Renew Scheduled
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200 flex items-center space-x-1">
                  <Mail size={10} className="mr-0.5" />
                  <span>{queuedCount} Emails Awaiting Delivery</span>
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Review upcoming renewals and record payments before extending services. Reminder emails are queued for delivery by your existing schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            {queuedCount > 0 &&
          <ActionButton
            onClick={handleSendBatch} disabled={sendingBatch || !!sendingNotifId}
            className="px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white shadow-xs"
            title="Send all currently queued automated renewal reminder emails">
            
                <Send size={13} />
                <span>{sendingBatch ? 'Sending...' : `Send Queued Emails (${queuedCount})`}</span>
              </ActionButton>
          }

            <button
            onClick={() => {
              setPageMode('email_center');
              setEmailFilter('all');
            }}
            className="px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 bg-[#004077] hover:bg-[#00355F] text-white shadow-xs"
            title="Open Renewal Email Reminders">
            
              <Mail size={13} />
              <span>Email Notification Center ({emailNotifications.length})</span>
            </button>

            <button
            onClick={() => {
              setFilter('Expiring Soon');
              setAutoRenewFilter('manual_only');
            }}
            className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 ${
            filter === 'Expiring Soon' && autoRenewFilter === 'manual_only' ?
            'bg-rose-600 text-white shadow-xs' :
            'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'}`
            }
            title="Show only expiring services that require manual client intervention">
            
              <AlertTriangle size={13} />
              <span>Manual Action Queue ({manualExpiringCount})</span>
            </button>
          </div>
        </div>
      }

      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#004077] tracking-tight">Renewals &amp; Expiry</h2>
          
        </div>
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setPageMode('email_center')}
            className="px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#004077] border border-blue-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Inspect all automated renewal notification emails">
            
            <Mail size={15} />
            <span>Email Outbox ({queuedCount} Queued)</span>
          </button>
          
          <ActionButton
            onClick={() => setPageMode('add')}
            className="px-4 py-2.5 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition flex items-center justify-center space-x-1.5 shrink-0">
            
            <Plus size={15} />
            <span>+ Assign New Service</span>
          </ActionButton>
        </div>
      </div>

      <div className="renewals-mobile-filters">
        <label>Status<select aria-label="Filter renewal status" value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}>
          <option value="All">All subscriptions ({summary.all})</option><option value="Active">Active ({summary.active})</option><option value="Expiring Soon">Expiring soon ({summary.expiring})</option><option value="Expired">Expired ({summary.expired})</option>
        </select></label>
        <label>Auto-renew<select aria-label="Filter auto-renew" value={autoRenewFilter} onChange={e=>setAutoRenewFilter(e.target.value as typeof autoRenewFilter)}>
          <option value="all">All</option><option value="manual_only">Manual only</option><option value="auto_only">Auto on</option>
        </select></label>
      </div>
      {/* Filter Tabs & Auto-Renew Alert Sub-Filters */}
      <div className="renewals-desktop-filters flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => setFilter('Expiring Soon')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
            filter === 'Expiring Soon' ?
            'bg-[#EF7C00] text-white shadow-xs' :
            'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
            }>
            
            <Clock size={13} />
            <span>Expiring Soon (&le; 15 Days)</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded-full text-[10px]">{expiringCount}</span>
          </button>

          <button
            onClick={() => setFilter('Active')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'Active' ?
            'bg-[#004077] text-white shadow-xs' :
            'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
            }>
            
            Active Subscriptions ({summary.active})
          </button>

          <button
            onClick={() => setFilter('All')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
            filter === 'All' ?
            'bg-[#004077] text-white shadow-xs' :
            'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
            }>
            
            All Subscriptions ({summary.all})
          </button>
        </div>

        {/* Auto-Renew Alert Queue Filter Toggle Buttons */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center space-x-1">
            <Filter size={11} />
            <span>Auto-Renew:</span>
          </span>
          <button
            onClick={() => setAutoRenewFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
            autoRenewFilter === 'all' ?
            'bg-white text-[#004077] shadow-xs' :
            'text-slate-600 hover:text-slate-900'}`
            }>
            
            All
          </button>
          <button
            onClick={() => setAutoRenewFilter('manual_only')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
            autoRenewFilter === 'manual_only' ?
            'bg-amber-500 text-white shadow-xs' :
            'text-slate-600 hover:text-slate-900'}`
            }
            title="Filter to show only subscriptions where Auto-Renew is OFF">
            
            <ShieldAlert size={11} />
            <span>Manual Only</span>
            {filter === 'Expiring Soon' && manualExpiringCount > 0 &&
            <span className={`text-[9px] px-1 rounded-full ${autoRenewFilter === 'manual_only' ? 'bg-white/30 text-white' : 'bg-amber-200 text-amber-900'}`}>
                {manualExpiringCount}
              </span>
            }
          </button>
          <button
            onClick={() => setAutoRenewFilter('auto_only')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
            autoRenewFilter === 'auto_only' ?
            'bg-emerald-600 text-white shadow-xs' :
            'text-slate-600 hover:text-slate-900'}`
            }
            title="Filter to show only subscriptions where Auto-Renew is ON">
            
            <ShieldCheck size={11} />
            <span>Auto ON</span>
            {filter === 'Expiring Soon' && autoExpiringCount > 0 &&
            <span className={`text-[9px] px-1 rounded-full ${autoRenewFilter === 'auto_only' ? 'bg-white/30 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                {autoExpiringCount}
              </span>
            }
          </button>
        </div>
      </div>

      <div className="renewals-search flex flex-wrap items-center gap-3">
        <button className="portal-secondary" aria-pressed={filter === 'Expired'} onClick={() => setFilter('Expired')}>Expired ({summary.expired})</button>
        <input aria-label="Search subscriptions" className="rounded-xl border border-slate-300 p-3 text-sm" placeholder="Search client or service" value={subscriptionSearch} onChange={e => setSubscriptionSearch(e.target.value)} />
        <p className="text-xs text-slate-500">Auto-renew extends fully paid periods. No automatic card charge is configured.</p>
      </div>
      {/* Subscriptions Table with Automated Email Actions */}
      <div className="renewals-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="renewals-table w-full text-left text-xs">
            <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Service Offering</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Status &amp; Countdown</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Email Reminder</th>
                <th className="py-3 px-4 text-right">Renewal Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubs.map((sub) => {
                const notif = emailNotifications.find((n) => n.subscription_id === sub.id);
                const isSending = notif && sendingNotifId === notif.id;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td data-label="Client" className="py-3.5 px-4 font-bold text-slate-800">
                      {sub.client_name}
                    </td>
                    <td data-label="Service" className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700">{sub.service_name}</span>
                      <span className="block text-[10px] text-slate-400">{sub.category}</span>
                    </td>
                    <td data-label="Cycle" className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                        {sub.billing_cycle}{sub.billing_cycle === 'Custom' ? ' / ' + sub.custom_duration : ''}
                      </span>
                    </td>
                    <td data-label="Expiry" className="py-3.5 px-4 font-semibold text-slate-700">
                      {sub.expiry_date}
                    </td>
                    <td data-label="Status" className="py-3.5 px-4">
                      <span className={sub.status === 'Expired' ? 'font-bold text-red-700' : sub.status === 'Cancelled' ? 'text-slate-500' : 'font-bold text-[#004077]'}>{sub.countdown}</span>
                    </td>

                    {/* Auto-Renew Switch */}
                    <td data-label="Auto-renew" className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <SubscriptionAutoRenew subscription={sub} onToggle={onToggleAutoRenew} />

                        {sub.auto_renew ?
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <ShieldCheck size={11} className="mr-1 text-emerald-600" />
                            Auto
                          </span> :

                        <span className="inline-flex items-center text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                            <ShieldAlert size={11} className="mr-1 text-amber-600" />
                            Manual
                          </span>
                        }
                      </div>
                    </td>

                    <td data-label="Rate" className="py-3.5 px-4 font-bold text-slate-800">
                      ₹ {sub.amount.toLocaleString('en-IN')}
                    </td>

                    {/* Email Reminder Notification Outreach Column */}
                    <td data-label="Reminder" className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <p className="font-semibold">{notif ? (notif.notice_kind === 'test' ? 'Test: ' : '') + notif.status : sub.status === 'Cancelled' ? 'Cancelled' : sub.days_remaining! > 15 ? 'Normal (> 15 days)' : 'Awaiting scheduled reminder'}</p>
                        <p className="text-slate-500">Last reminder: {sub.last_email_sent_at || 'Not sent'}</p>
                        <p className="text-slate-500">Reminder eligible from: {sub.next_reminder_date}</p>
                        {notif && <><ActionButton onClick={() => { setSelectedNotifId(notif.id); setPageMode('email_center'); }}>View Notice</ActionButton>
                          {['Queued', 'Failed'].includes(notif.status) && <ActionButton disabled={!!sendingNotifId} onClick={() => handleTriggerSendEmail(notif.id)}>{isSending ? 'Sending...' : notif.status === 'Failed' ? 'Retry delivery' : 'Send queued reminder'}</ActionButton>}</>}
                        <ActionButton disabled={testingId !== null} title="Queue a test reminder to your administrator email without changing this subscription" onClick={async () => { setTestingId(sub.id); try { await onMarkExpiringSoon?.(sub.id); } catch (e: any) { showPopup(e.message); } finally { setTestingId(null); } }}>{testingId === sub.id ? 'Queuing...' : 'Queue test reminder'}</ActionButton>
                      </div>
                    </td>

                    {/* Renewal Action */}
                    <td data-label="Renewal" className="py-3.5 px-4 text-right">
                      <RenewalPaymentStatus subscription={sub} onUpdate={onUpdateRenewalPayment} /><br />
<RenewSubscriptionButton subscription={sub} onRenew={onRenew} />
                    </td>
                  </tr>);

              })}

              {filteredSubs.length === 0 &&
              <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                    <p className="font-medium text-slate-600">No subscriptions match the selected criteria.</p>
                    {autoRenewFilter !== 'all' &&
                  <ActionButton
                    onClick={() => setAutoRenewFilter('all')}
                    className="mt-2 text-xs text-[#004077] font-bold underline hover:text-[#EF7C00]">
                    
                        Reset Auto-Renew filter to view all
                      </ActionButton>
                  }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

    </div>);

};
