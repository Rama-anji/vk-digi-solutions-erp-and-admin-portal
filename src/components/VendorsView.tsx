import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import {
  Building2,
  Receipt,
  CreditCard,
  Plus,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Phone,
  Mail,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Edit3,
  Trash2,
  Calendar,
  DollarSign,
  Layers,
  ArrowRight,
  Sparkles,
  Server,
  Cloud,
  Clock,
  ShieldCheck,
  Check,
  X } from
'lucide-react';
import { Vendor, VendorBill, RecurringVendorExpense, RecurringFrequency } from '../types';

interface VendorsViewProps {
  vendors: Vendor[];
  vendorBills: VendorBill[];
  recurringExpenses?: RecurringVendorExpense[];
  onAddBill: (newBill: Omit<VendorBill, 'id'>) => void;
  onUpdateBill?: (updatedBill: VendorBill) => void;
  onDeleteBill?: (billId: number) => void;
  onAddRecurringExpense?: (newExp: Omit<RecurringVendorExpense, 'id'>) => void;
  onUpdateRecurringExpense?: (updatedExp: RecurringVendorExpense) => void;
  onDeleteRecurringExpense?: (expId: number) => void;
  onToggleRecurringAutoEntry?: (expId: number, enabled: boolean) => void;
  onTriggerRecurringExpenseBill?: (expId: number) => void;
  onTriggerAllDueRecurringExpenses?: () => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  vendors,
  vendorBills,
  recurringExpenses = [],
  onAddBill,
  onUpdateBill,
  onDeleteBill,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onToggleRecurringAutoEntry,
  onTriggerRecurringExpenseBill,
  onTriggerAllDueRecurringExpenses
}) => {
  // Main view tab: 'bills' | 'recurring'
  const [activeTab, setActiveTab] = useState<'bills' | 'recurring'>('bills');
  const [selectedVendorId, setSelectedVendorId] = useState<number | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Partial' | 'Pending'>('All');

  // In-page form modes (No popups)
  const [showAddBillForm, setShowAddBillForm] = useState(false);
  const [showAddRecurringForm, setShowAddRecurringForm] = useState(false);
  const [editingRecurringExpense, setEditingRecurringExpense] = useState<RecurringVendorExpense | null>(null);

  // Settlement inline modal/state
  const [settlingBillId, setSettlingBillId] = useState<number | null>(null);
  const [settleAmount, setSettleAmount] = useState<number>(0);

  // Form states for new Vendor Bill
  const [newBillVendorId, setNewBillVendorId] = useState<number>(vendors[0]?.id || 1);
  const [newBillProject, setNewBillProject] = useState('');
  const [newBillAmount, setNewBillAmount] = useState<number>(10000);
  const [newBillAdvance, setNewBillAdvance] = useState<number>(0);
  const [newBillDate, setNewBillDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states for Recurring Fixed Expense
  const [recVendorId, setRecVendorId] = useState<number>(vendors[0]?.id || 1);
  const [recTitle, setRecTitle] = useState('');
  const [recCategory, setRecCategory] = useState('Cloud Infrastructure');
  const [recAmount, setRecAmount] = useState<number>(8500);
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('Monthly');
  const [recDayOfMonth, setRecDayOfMonth] = useState<number>(1);
  const [recAutoEntry, setRecAutoEntry] = useState<boolean>(true);
  const [recNotes, setRecNotes] = useState('');

  // Calculations for Bills Ledger
  const filteredBills = vendorBills.filter((bill) => {
    const matchesVendor = selectedVendorId === 'All' || bill.vendor_id === selectedVendorId;
    const matchesStatus = statusFilter === 'All' || bill.status === statusFilter;
    return matchesVendor && matchesStatus;
  });

  const totalBills = filteredBills.reduce((acc, b) => acc + b.total_amount, 0);
  const totalAdvances = filteredBills.reduce((acc, b) => acc + b.advance_paid, 0);
  const totalPending = Math.max(0, totalBills - totalAdvances);

  // Calculations for Recurring Fixed Costs
  const totalMonthlyRecurring = recurringExpenses.reduce((acc, exp) => {
    if (exp.frequency === 'Monthly') return acc + exp.amount;
    if (exp.frequency === 'Quarterly') return acc + Math.round(exp.amount / 3);
    if (exp.frequency === 'Yearly') return acc + Math.round(exp.amount / 12);
    return acc + exp.amount;
  }, 0);

  const activeAutoEntriesCount = recurringExpenses.filter((r) => r.auto_entry_enabled).length;

  // Handlers for Creating Bill
  const handleCreateBillSubmit = async (e: React.FormEvent) => {try {
      e.preventDefault();
      const vendor = vendors.find((v) => v.id === Number(newBillVendorId));
      const pending = Math.max(0, newBillAmount - newBillAdvance);
      const status: 'Paid' | 'Partial' | 'Pending' =
      newBillAdvance >= newBillAmount ? 'Paid' : newBillAdvance > 0 ? 'Partial' : 'Pending';

      await onAddBill({
        vendor_id: Number(newBillVendorId),
        vendor_name: vendor?.vendor_name || 'Vendor Partner',
        project_name: newBillProject.trim() || 'Vendor Service Engagement',
        total_amount: Number(newBillAmount),
        advance_paid: Number(newBillAdvance),
        pending_balance: pending,
        status,
        bill_date: newBillDate
      });

      setNewBillProject('');
      setNewBillAmount(10000);
      setNewBillAdvance(0);
      setShowAddBillForm(false);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Handlers for Creating / Editing Recurring Expense
  const handleSaveRecurringSubmit = async (e: React.FormEvent) => {try {
      e.preventDefault();
      const vendor = vendors.find((v) => v.id === Number(recVendorId));

      if (editingRecurringExpense) {
        if (onUpdateRecurringExpense) {
          await onUpdateRecurringExpense({
            ...editingRecurringExpense,
            vendor_id: Number(recVendorId),
            vendor_name: vendor?.vendor_name || editingRecurringExpense.vendor_name,
            expense_title: recTitle.trim(),
            category: recCategory,
            amount: Number(recAmount),
            frequency: recFrequency,
            day_of_month: Number(recDayOfMonth),
            auto_entry_enabled: recAutoEntry,
            notes: recNotes.trim() || undefined
          });
        }
        setEditingRecurringExpense(null);
      } else {
        const today = new Date();
        let nextRun = new Date();
        nextRun.setDate(Number(recDayOfMonth));
        if (nextRun.getTime() < today.getTime()) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        const nextRunDateStr = nextRun.toISOString().split('T')[0];

        if (onAddRecurringExpense) {
          await onAddRecurringExpense({
            vendor_id: Number(recVendorId),
            vendor_name: vendor?.vendor_name || 'Vendor Partner',
            expense_title: recTitle.trim() || 'Fixed Recurring Expense',
            category: recCategory,
            amount: Number(recAmount),
            frequency: recFrequency,
            day_of_month: Number(recDayOfMonth),
            next_run_date: nextRunDateStr,
            auto_entry_enabled: recAutoEntry,
            notes: recNotes.trim() || undefined
          });
        }
      }

      setRecTitle('');
      setRecNotes('');
      setShowAddRecurringForm(false);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const startEditingRecurring = (exp: RecurringVendorExpense) => {
    setEditingRecurringExpense(exp);
    setRecVendorId(exp.vendor_id);
    setRecTitle(exp.expense_title);
    setRecCategory(exp.category);
    setRecAmount(exp.amount);
    setRecFrequency(exp.frequency);
    setRecDayOfMonth(exp.day_of_month);
    setRecAutoEntry(exp.auto_entry_enabled);
    setRecNotes(exp.notes || '');
    setShowAddRecurringForm(true);
  };

  // Inline Settlement handler
  const handleApplySettlement = async (bill: VendorBill) => {try {
      if (!onUpdateBill) return;
      const additionalPay = Number(settleAmount);
      if (!Number.isFinite(additionalPay) || additionalPay <= 0 || additionalPay > bill.pending_balance) throw new Error('Enter a payment greater than zero and no more than the pending balance.');

      const newAdvance = bill.advance_paid + additionalPay;
      const newPending = Math.max(0, bill.total_amount - newAdvance);
      const newStatus = newPending === 0 ? 'Paid' : 'Partial';

      await onUpdateBill({
        ...bill,
        advance_paid: newAdvance,
        pending_balance: newPending,
        status: newStatus
      });

      setSettlingBillId(null);
      setSettleAmount(0);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  return (
    <div className="vendors-page space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#004077] tracking-tight">Vendor Bills &amp; Ledger</h2>
          
        </div>

        {/* View Switcher Tabs */}
        <div className="vendors-view-tabs flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'bills' ?
            'bg-white text-[#004077] shadow-xs' :
            'text-slate-600 hover:text-slate-900'}`
            }>
            
            <Receipt size={14} />
            <span>Bills &amp; Disbursements ({vendorBills.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
            activeTab === 'recurring' ?
            'bg-white text-[#004077] shadow-xs' :
            'text-slate-600 hover:text-slate-900'}`
            }>
            
            <RefreshCw size={14} className={activeAutoEntriesCount > 0 ? 'text-[#EF7C00]' : ''} />
            <span>Recurring Expenses ({recurringExpenses.length})</span>
            {activeAutoEntriesCount > 0 &&
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="Auto-entry enabled" />
            }
          </button>
        </div>
      </div>

      {/* KPI Cards for Vendor Balances & Recurring Fixed Costs */}
      <div className="vendors-summary grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Billed Expenses</span>
          <h3 className="text-2xl font-black text-slate-800 mt-1">₹ {totalBills.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Total vendor bills</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Advance Disbursements</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-1">₹ {totalAdvances.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Settled milestones &amp; advances</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Liability</span>
          <h3 className="text-2xl font-black text-[#EF7C00] mt-1">₹ {totalPending.toLocaleString('en-IN')}</h3>
          <p className="text-[11px] text-slate-500 mt-1">Outstanding partner balance</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#004077] uppercase tracking-wider">Fixed Monthly Outlay</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[10px] font-bold text-[#004077]">
              {recurringExpenses.length} Services
            </span>
          </div>
          <h3 className="text-2xl font-black text-[#004077] mt-1">₹ {totalMonthlyRecurring.toLocaleString('en-IN')}<span className="text-xs font-normal text-slate-400">/mo</span></h3>
          <p className="text-[11px] text-slate-500 mt-1">Server hosting &amp; SaaS retainers</p>
        </div>
      </div>

      {/* =========================================================================
        * TAB 1: RECURRING EXPENSES (Fixed Costs, Server Hosting, SaaS Subscriptions)
        * ========================================================================= */}
      {activeTab === 'recurring' &&
      <div className="space-y-6 animate-in fade-in">
          
          {/* Action Bar for Recurring Fixed Expenses */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-[#004077]">Recurring Expenses</h3>
              <p className="text-xs text-slate-500">
                Define recurring operational costs (Cloud VPS, SaaS tools, copywriting retainers) with automatic monthly ledger entry triggers.
              </p>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              {/* Batch Trigger Button */}
              <ActionButton
              type="button"
              onClick={onTriggerAllDueRecurringExpenses}
              className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs"
              title="Automatically post monthly vendor bills for all recurring expenses with auto-entry enabled">
              
                <Zap size={14} className="text-[#EF7C00]" />
                <span>Run Monthly Auto-Entry Batch</span>
              </ActionButton>

              {/* Define New Recurring Expense */}
              <ActionButton
              type="button"
              onClick={() => {
                setEditingRecurringExpense(null);
                setRecTitle('');
                setRecNotes('');
                setShowAddRecurringForm(!showAddRecurringForm);
              }}
              className="px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5">
              
                <Plus size={14} />
                <span>{showAddRecurringForm ? 'Close Form' : '+ Define Recurring Expense'}</span>
              </ActionButton>
            </div>
          </div>

          {/* In-Page Form: Define / Edit Recurring Expense */}
          {showAddRecurringForm &&
        <div className="bg-white p-6 rounded-2xl border-2 border-orange-300 shadow-sm animate-in fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-orange-100 text-[#EF7C00] flex items-center justify-center font-bold">
                    <RefreshCw size={14} />
                  </span>
                  <h4 className="font-bold text-sm text-[#004077]">
                    {editingRecurringExpense ? `Edit Fixed Expense: ${editingRecurringExpense.expense_title}` : 'Define New Fixed Recurring Cost'}
                  </h4>
                </div>
                <button
              type="button"
              onClick={() => setShowAddRecurringForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1">
              
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveRecurringSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vendor Partner *</label>
                    <select
                  value={recVendorId}
                  onChange={(e) => setRecVendorId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800">
                  
                      {vendors.map((v) =>
                  <option key={v.id} value={v.id}>
                          {v.vendor_name} ({v.category})
                        </option>
                  )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Expense Title / Service Scope *</label>
                    <input
                  type="text"
                  required
                  placeholder="e.g. KVM 8 VPS Cloud Node Hosting Cluster, Figma Enterprise 5-Seat, Google Workspace"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900" />
                
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800">
                  
                      <option value="Cloud Infrastructure">Cloud Infrastructure &amp; VPS</option>
                      <option value="SaaS Subscriptions">SaaS Subscriptions &amp; Tools</option>
                      <option value="Content Retainer">Content &amp; Copy Retainer</option>
                      <option value="Design & Media">Design &amp; Media Assets</option>
                      <option value="Security & Domain">SSL, Domains &amp; DNS</option>
                      <option value="General Operational">General Operational Outlay</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                    <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={recAmount}
                  onChange={(e) => setRecAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900" />
                
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Billing Frequency</label>
                    <select
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800">
                  
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Day of Month for Auto-Entry</label>
                    <input
                  type="number"
                  min="1"
                  max="28"
                  value={recDayOfMonth}
                  onChange={(e) => setRecDayOfMonth(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold text-slate-900" />
                
                  </div>

                  <div className="sm:col-span-2 flex items-center space-x-3 pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                    type="checkbox"
                    checked={recAutoEntry}
                    onChange={(e) => setRecAutoEntry(e.target.checked)}
                    className="w-4 h-4 rounded text-[#EF7C00] focus:ring-[#004077]" />
                  
                      <span className="font-bold text-slate-800">
                        Enable Monthly Auto-Entry Trigger
                      </span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      (Automatically posts recurring bills into the ledger on schedule)
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Account Notes / Server Details / Reference</label>
                  <input
                type="text"
                placeholder="e.g. Server IP 185.193.64.12, cPanel enterprise support license, renewed via credit card"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800" />
              
                </div>

                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                  <ActionButton
                type="button"
                onClick={() => {
                  setShowAddRecurringForm(false);
                  setEditingRecurringExpense(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
                
                    Cancel
                  </ActionButton>
                  <ActionButton
                type="submit"
                className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-sm transition">
                
                    {editingRecurringExpense ? 'Save Changes' : 'Save Recurring Fixed Expense'}
                  </ActionButton>
                </div>
              </form>
            </div>
        }

          {/* Recurring Expenses Table */}
          <div className="vendors-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="vendors-table w-full text-left text-xs">
                <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vendor Partner</th>
                    <th className="py-3 px-4">Fixed Service Scope</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Amount / Frequency</th>
                    <th className="py-3 px-4">Schedule &amp; Next Run</th>
                    <th className="py-3 px-4 text-center">Auto-Entry</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringExpenses.map((exp) =>
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                      <td data-label="Vendor" className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{exp.vendor_name}</div>
                        {exp.notes &&
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-xs">{exp.notes}</div>
                    }
                      </td>

                      <td data-label="Scope" className="py-3.5 px-4 font-semibold text-slate-700">
                        {exp.expense_title}
                      </td>

                      <td data-label="Category" className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[10px]">
                          {exp.category}
                        </span>
                      </td>

                      <td data-label="Amount" className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 font-mono text-sm">
                          ₹ {exp.amount.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-normal">
                          / {exp.frequency.toLowerCase()}
                        </span>
                      </td>

                      <td data-label="Schedule" className="py-3.5 px-4 text-slate-500">
                        <div className="flex items-center space-x-1 font-medium text-slate-700">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Day {exp.day_of_month} of month</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Next: {exp.next_run_date}
                          {exp.last_generated_date && ` • Last: ${exp.last_generated_date}`}
                        </div>
                      </td>

                      <td data-label="Auto-entry" className="py-3.5 px-4 text-center">
                        <button
                      type="button"
                      onClick={async () => {try {return onToggleRecurringAutoEntry && (await onToggleRecurringAutoEntry(exp.id, !exp.auto_entry_enabled));} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 transition ${
                      exp.auto_entry_enabled ?
                      'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' :
                      'bg-slate-200 text-slate-600 hover:bg-slate-300'}`
                      }
                      title="Toggle automated monthly entry">
                      
                          {exp.auto_entry_enabled ?
                      <>
                              <Play size={10} className="fill-emerald-800" />
                              <span>Active</span>
                            </> :

                      <>
                              <Pause size={10} />
                              <span>Paused</span>
                            </>
                      }
                        </button>
                      </td>

                      <td data-label="Actions" className="py-3.5 px-4 text-right">
                        <div className="vendor-row-actions flex items-center justify-end gap-1.5">
                          {/* Single-Click Auto-Entry Trigger */}
                          <ActionButton
                        type="button"
                        onClick={async () => {try {return onTriggerRecurringExpenseBill && (await onTriggerRecurringExpenseBill(exp.id));} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-[#004077] hover:text-white text-[#004077] rounded-lg font-bold text-[11px] transition inline-flex items-center space-x-1"
                        title="Generate and post this month's bill immediately into the vendor ledger">
                        
                            <Zap size={11} className="text-[#EF7C00]" />
                            <span>Post Bill Now</span>
                          </ActionButton>

                          {/* Edit button */}
                          <button
                        type="button"
                        onClick={() => startEditingRecurring(exp)}
                        className="p-1.5 text-slate-400 hover:text-[#004077] hover:bg-slate-100 rounded-lg transition"
                        title="Edit recurring expense settings">
                        
                            <Edit3 size={13} />
                          </button>

                          {/* Delete button */}
                          <button
                        type="button"
                        onClick={async () => {try {return onDeleteRecurringExpense && (await onDeleteRecurringExpense(exp.id));} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete recurring expense">
                        
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                )}

                  {recurringExpenses.length === 0 &&
                <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No recurring fixed expenses defined yet. Click &quot;+ Define Recurring Expense&quot; above to get started.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      }

      {/* =========================================================================
        * TAB 2: VENDOR BILLS & SETTLEMENTS LEDGER
        * ========================================================================= */}
      {activeTab === 'bills' &&
      <div className="space-y-6 animate-in fade-in">
          
          {/* Action Bar & Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            <div className="vendor-filter-control">
              <label htmlFor="vendor-bills-filter">Vendor partner</label>
              <select id="vendor-bills-filter" value={selectedVendorId} onChange={e=>setSelectedVendorId(e.target.value==='All'?'All':Number(e.target.value))}>
                <option value="All">All Vendors ({vendors.length})</option>
                {vendors.map(vendor=><option key={vendor.id} value={vendor.id}>{vendor.vendor_name}</option>)}
              </select>
              <p>{filteredBills.length} {filteredBills.length===1?'bill':'bills'} shown</p>
            </div>

            {/* Actions: Record Bill */}
            <div className="flex items-center space-x-2 shrink-0">
              <ActionButton
              type="button"
              onClick={() => setShowAddBillForm(!showAddBillForm)}
              className="px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5">
              
                <Plus size={14} />
                <span>{showAddBillForm ? 'Close Form' : '+ Record Vendor Bill'}</span>
              </ActionButton>
            </div>
          </div>

          {/* In-Page Form: Record New Vendor Bill */}
          {showAddBillForm &&
        <div className="bg-white p-6 rounded-2xl border-2 border-[#004077] shadow-sm animate-in fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-[#004077] flex items-center justify-center font-bold">
                    <Receipt size={14} />
                  </span>
                  <h4 className="font-bold text-sm text-[#004077]">Record New Vendor Bill / Expense Voucher</h4>
                </div>
                <button
              type="button"
              onClick={() => setShowAddBillForm(false)}
              className="text-slate-400 hover:text-slate-600 p-1">
              
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateBillSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vendor Partner *</label>
                    <select
                  value={newBillVendorId}
                  onChange={(e) => setNewBillVendorId(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800">
                  
                      {vendors.map((v) =>
                  <option key={v.id} value={v.id}>
                          {v.vendor_name}
                        </option>
                  )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Project / Deliverable Scope *</label>
                    <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics Design System & UX Sprint, Q1 Dedicated Cloud Fleet"
                  value={newBillProject}
                  onChange={(e) => setNewBillProject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-900" />
                
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Bill Date</label>
                    <input
                  type="date"
                  required
                  value={newBillDate}
                  onChange={(e) => setNewBillDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900" />
                
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Bill Amount (₹) *</label>
                    <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={newBillAmount}
                  onChange={(e) => setNewBillAmount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900" />
                
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Advance Paid / Disbursed (₹)</label>
                    <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBillAdvance}
                  onChange={(e) => setNewBillAdvance(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-semibold text-slate-900" />
                
                  </div>

                  <div className="sm:col-span-2 flex items-center justify-end space-x-2 pt-5">
                    <ActionButton
                  type="button"
                  onClick={() => setShowAddBillForm(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
                  
                      Cancel
                    </ActionButton>
                    <ActionButton
                  type="submit"
                  className="px-5 py-2 bg-[#004077] hover:bg-[#00355F] text-white font-bold rounded-xl text-xs shadow-sm transition">
                  
                      Save to Ledger
                    </ActionButton>
                  </div>
                </div>
              </form>
            </div>
        }

          {/* Bills Ledger Table */}
          <div className="vendors-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="vendors-table w-full text-left text-xs">
                <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vendor Partner</th>
                    <th className="py-3 px-4">Project / Service Scope</th>
                    <th className="py-3 px-4">Bill Date</th>
                    <th className="py-3 px-4">Total Bill</th>
                    <th className="py-3 px-4">Advance Paid</th>
                    <th className="py-3 px-4">Pending Liability</th>
                    <th className="py-3 px-4">Settlement Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBills.map((bill) => {
                  const isSettling = settlingBillId === bill.id;
                  return (
                    <tr key={bill.id} className="hover:bg-slate-50 transition">
                        <td data-label="Vendor" className="py-3.5 px-4 font-bold text-slate-800">
                          {bill.vendor_name}
                        </td>

                        <td data-label="Scope" className="py-3.5 px-4 text-slate-700 font-medium">
                          <div className="flex items-center space-x-1.5">
                            <span>{bill.project_name}</span>
                            {bill.recurring_expense_id &&
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-[#004077] font-bold text-[9px] uppercase tracking-wider inline-flex items-center space-x-0.5">
                                <Zap size={9} className="text-[#EF7C00]" />
                                <span>Auto-Entry</span>
                              </span>
                          }
                          </div>
                        </td>

                        <td data-label="Bill date" className="py-3.5 px-4 text-slate-500 font-mono">
                          {bill.bill_date}
                        </td>

                        <td data-label="Total" className="py-3.5 px-4 font-bold text-slate-800 font-mono">
                          ₹ {bill.total_amount.toLocaleString('en-IN')}
                        </td>

                        <td data-label="Paid" className="py-3.5 px-4 font-semibold text-emerald-600 font-mono">
                          ₹ {bill.advance_paid.toLocaleString('en-IN')}
                        </td>

                        <td data-label="Pending" className="py-3.5 px-4 font-mono">
                          {bill.pending_balance > 0 ?
                        <span className="font-bold text-amber-700">₹ {bill.pending_balance.toLocaleString('en-IN')}</span> :

                        <span className="text-emerald-600 font-bold text-[10px]">Fully Settled</span>
                        }
                        </td>

                        <td data-label="Status" className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                        bill.status === 'Paid' ?
                        'bg-emerald-100 text-emerald-800' :
                        bill.status === 'Partial' ?
                        'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'}`
                        }>
                            {bill.status.toUpperCase()}
                          </span>
                        </td>

                        <td data-label="Actions" className="py-3.5 px-4 text-right">
                          <div className="vendor-row-actions flex items-center justify-end gap-1.5">
                            {bill.pending_balance > 0 &&
                          <>
                                {isSettling ?
                            <div className="flex items-center space-x-1">
                                    <input
                                type="number"
                                min="1"
                                max={bill.pending_balance}
                                step="0.01"
                                value={settleAmount}
                                onChange={(e) => setSettleAmount(Number(e.target.value))}
                                aria-label="Payment amount" placeholder="Amount"
                                className="w-20 p-1 border border-slate-300 rounded text-xs font-mono" />
                              
                                    <ActionButton
                                type="button"
                                onClick={() => handleApplySettlement(bill)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold">
                                
                                      Pay
                                    </ActionButton>
                                    <button
                                type="button"
                                onClick={() => setSettlingBillId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600">
                                
                                      <X size={12} />
                                    </button>
                                  </div> :

                            <ActionButton
                              type="button"
                              onClick={() => {
                                setSettlingBillId(bill.id);
                                setSettleAmount(bill.pending_balance);
                              }}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#004077] hover:text-white text-slate-700 font-bold text-[10px] rounded-lg transition">
                              
                                    Disburse Pay
                                  </ActionButton>
                            }
                              </>
                          }

                            {onDeleteBill &&
                          <button
                            type="button"
                            onClick={async () => {try {return await onDeleteBill(bill.id);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                            title="Delete bill">
                            
                                <Trash2 size={13} />
                              </button>
                          }
                          </div>
                        </td>
                      </tr>);

                })}

                  {filteredBills.length === 0 &&
                <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No vendor bills found matching current filter.
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          </div>

        </div>
      }

    </div>);

};
