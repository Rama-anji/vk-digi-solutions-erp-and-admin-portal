import { RenewSubscriptionButton, RenewSubscription } from './RenewSubscriptionButton';
import { SubscriptionAutoRenew } from './SubscriptionAutoRenew';
import { RenewalPaymentStatus, UpdateRenewalPayment } from './RenewalPaymentStatus';
import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { needsRenewalAttention } from '../utils/renewalStatus';
import {
  Users,
  RefreshCw,
  Receipt,
  Building2,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  FileCheck,
  CalendarDays,
  Plus,
  FileSpreadsheet,
  ShieldCheck,
  ShieldAlert,
  Filter } from
'lucide-react';
import { Client, ClientSubscription, Invoice, VendorBill } from '../types';

interface DashboardViewProps {
  clients: Client[];
  subscriptions: ClientSubscription[];
  invoices: Invoice[];
  vendorBills: VendorBill[];
  onNavigate: (tab: string) => void;
  onRenew: RenewSubscription;
  onUpdateRenewalPayment: UpdateRenewalPayment;
  onNewClient: () => void;
  onNewInvoice: () => void;
  onExportClientReport?: () => void;
  onToggleAutoRenew?: (subId: number, autoRenew: boolean) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  clients,
  subscriptions,
  invoices,
  vendorBills,
  onNavigate,
  onRenew, onUpdateRenewalPayment,
  onNewClient,
  onNewInvoice,
  onExportClientReport,
  onToggleAutoRenew
}) => {
  const [alertFilter, setAlertFilter] = useState<'all' | 'manual_only' | 'auto_only'>('all');

  // Financial Calculations
  const totalInvoiced = invoices.reduce((acc, inv) => acc + inv.grand_total, 0);
  const totalPaidInvoices = invoices.reduce((acc, inv) => acc + (inv.amount_received ?? (inv.payment_status==='Paid'?inv.grand_total:0)), 0);
  const clientOutstanding = Math.max(0, totalInvoiced - totalPaidInvoices);

  const totalVendorBills = vendorBills.reduce((acc, bill) => acc + bill.total_amount, 0);
  const totalVendorAdvances = vendorBills.reduce((acc, bill) => acc + bill.advance_paid, 0);
  const vendorPendingBalance = Math.max(0, totalVendorBills - totalVendorAdvances);

  const allExpiringSubs = subscriptions.filter(needsRenewalAttention);
  const manualExpiringCount = allExpiringSubs.filter((s) => !s.auto_renew).length;
  const autoExpiringCount = allExpiringSubs.filter((s) => s.auto_renew).length;

  const expiringSubs = allExpiringSubs.filter((s) => {
    if (alertFilter === 'manual_only') return !s.auto_renew;
    if (alertFilter === 'auto_only') return s.auto_renew;
    return true;
  });

  const activeSubs = subscriptions.filter((s) => s.status === 'Active');

  const formatINR = (val: number) => {
    return '₹ ' + val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-black text-[#004077] tracking-tight">VKD Dashboard</h1>
            <span className="px-2 py-0.5 bg-blue-100 text-[#004077] text-[10px] font-bold rounded-md uppercase tracking-wider">
              VKD ERP
            </span>
          </div>
          
        </div>
        <div className="flex items-center space-x-2.5">
          {onExportClientReport &&
          <ActionButton
            onClick={onExportClientReport}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Download comprehensive Client Reporting ledger (CSV) with invoiced, paid, and outstanding balances">
            
              <FileSpreadsheet size={14} className="text-[#004077]" />
              <span>Export Client Report</span>
            </ActionButton>
          }
          <ActionButton
            onClick={onNewClient}
            className="px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5">
            
            <Plus size={14} />
            <span>+ New Client</span>
          </ActionButton>
          <ActionButton
            onClick={onNewInvoice}
            className="px-3.5 py-2 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition flex items-center space-x-1.5">
            
            <Receipt size={14} />
            <span>Generate Invoice</span>
          </ActionButton>
        </div>
      </div>

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Active Clients */}
        <div
          onClick={() => onNavigate('clients')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition cursor-pointer group">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#004077] flex items-center justify-center group-hover:bg-[#004077] group-hover:text-white transition">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-[#004077]">{clients.length}</h3>
          </div>
        </div>

        {/* Card 2: Renewal Alerts (Expiring Soon <= 15 days) */}
        <div
          onClick={() => onNavigate('renewals')}
          className="bg-white p-5 rounded-2xl border border-orange-200 shadow-xs hover:shadow-md transition cursor-pointer group relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100/50 rounded-bl-full -mr-2 -mt-2 pointer-events-none"></div>
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Expiring in ≤ 15 Days</span>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#EF7C00] flex items-center justify-center font-bold">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3 relative z-10">
            <h3 className="text-2xl font-black text-[#EF7C00]">{expiringSubs.length} Services</h3>
            <p className="text-[11px] text-orange-600 font-semibold mt-1 flex items-center space-x-1">
              <span>Immediate renewal required</span>
            </p>
          </div>
        </div>

        {/* Card 3: Client Invoiced & Outstanding Balance */}
        <div
          onClick={() => onNavigate('invoices')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition cursor-pointer group">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Receivables</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{formatINR(clientOutstanding)}</h3>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Total invoiced:</span>
              <span className="font-bold text-amber-600">{formatINR(totalInvoiced)}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Vendor Balance Tracker */}
        <div
          onClick={() => onNavigate('vendors')}
          className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs hover:shadow-md transition cursor-pointer group">
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Vendor Bills</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-700 group-hover:text-white transition">
              <Building2 size={18} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-slate-800">{formatINR(vendorPendingBalance)}</h3>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Paid Advances:</span>
              <span className="font-bold text-emerald-600">{formatINR(totalVendorAdvances)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Expiry & Renewal Alerts Section (15-Day Logic) */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#004077]/5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EF7C00] text-white flex items-center justify-center font-bold">
              <Clock size={16} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-sm text-[#004077] tracking-tight">Upcoming &amp; Overdue Renewals</h2>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold text-[10px] rounded-full border border-amber-200">
                  {allExpiringSubs.length} Expiring
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Auto-Renew Filter Toggle */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setAlertFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                alertFilter === 'all' ?
                'bg-white text-[#004077] shadow-xs' :
                'text-slate-600 hover:text-slate-900'}`
                }>
                
                All ({allExpiringSubs.length})
              </button>
              <button
                onClick={() => setAlertFilter('manual_only')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                alertFilter === 'manual_only' ?
                'bg-amber-500 text-white shadow-xs' :
                'text-slate-600 hover:text-slate-900'}`
                }
                title="Show only expiring services that require manual outreach">
                
                <ShieldAlert size={11} />
                <span>Manual Required ({manualExpiringCount})</span>
              </button>
              <button
                onClick={() => setAlertFilter('auto_only')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ${
                alertFilter === 'auto_only' ?
                'bg-emerald-600 text-white shadow-xs' :
                'text-slate-600 hover:text-slate-900'}`
                }
                title="Show expiring services with automated renewal active">
                
                <ShieldCheck size={11} />
                <span>Auto ON ({autoExpiringCount})</span>
              </button>
            </div>

            <button
              onClick={() => onNavigate('renewals')}
              className="text-xs font-bold text-[#004077] hover:text-[#00355F] flex items-center space-x-1 px-2 py-1">
              
              <span>All Subscriptions</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Alert Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Service &amp; Plan</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Time Left</th>
                <th className="py-3 px-4">Auto-Renew</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expiringSubs.map((sub) =>
              <tr key={sub.id} className="hover:bg-amber-50/50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    <div>{sub.client_name}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-medium text-slate-700">{sub.service_name}</span>
                    <span className="block text-[10px] text-slate-400">{sub.category}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md text-[10px]">
                      {sub.billing_cycle}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-600">
                    {sub.expiry_date}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <Clock size={10} className="mr-1" />
                      {sub.countdown}
                    </span>
                  </td>

                  {/* Auto-Renew Toggle Switch */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2">
                      <SubscriptionAutoRenew subscription={sub} onToggle={onToggleAutoRenew} />
                      <span className={`text-[10px] font-bold ${sub.auto_renew ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {sub.auto_renew ? 'Auto ON' : 'Manual'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-bold text-slate-800">
                    {formatINR(sub.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <RenewalPaymentStatus subscription={sub} onUpdate={onUpdateRenewalPayment} /><br />
<RenewSubscriptionButton subscription={sub} onRenew={onRenew} />
                  </td>
                </tr>
              )}
              {expiringSubs.length === 0 &&
              <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 size={24} className="mx-auto mb-1 text-emerald-500" />
                    <p className="font-medium">No services match the selected filter criteria.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

      </div>

      {/* Two-Column Grid: Invoices & Vendor Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Invoices Ledger */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#004077]">Recent Invoices</h3>
            <ActionButton
              onClick={() => onNavigate('invoices')}
              className="text-xs font-bold text-[#EF7C00] hover:underline">
              
              View All Invoices
            </ActionButton>
          </div>
          <div className="space-y-3">
            {invoices.slice(0, 4).map((inv) =>
            <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-800">{inv.invoice_number}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  inv.payment_status === 'Paid' ?
                  'bg-emerald-100 text-emerald-800' :
                  inv.payment_status === 'Partial' ?
                  'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'}`
                  }>
                      {inv.payment_status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{inv.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-slate-800">{formatINR(inv.grand_total)}</p>
                  <p className="text-[10px] text-slate-400">Due: {inv.due_date}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Ledger Summary */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[#004077]">Vendor Payables</h3>
            <button
              onClick={() => onNavigate('vendors')}
              className="text-xs font-bold text-[#EF7C00] hover:underline">
              
              Vendor Ledger
            </button>
          </div>
          <div className="space-y-3">
            {vendorBills.map((bill) =>
            <div key={bill.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{bill.project_name}</span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`
                }>
                    {bill.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{bill.vendor_name}</p>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Bill: {formatINR(bill.total_amount)} &bull; Adv: {formatINR(bill.advance_paid)}</span>
                  <span className="font-bold text-indigo-700">Pending: {formatINR(bill.pending_balance)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>);

};
