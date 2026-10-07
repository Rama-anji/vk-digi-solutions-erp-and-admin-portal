import { ActionButton } from './ActionButton';
import { useTimedMessage } from '../useTimedMessage';
import { downloadCommercial } from '../utils/pdfUtils';
import { PaymentReceipts } from './PaymentReceipts';
import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Printer,
  Plus,
  Trash2,
  Building2,
  CheckCircle,
  Clock,
  X,
  FileCheck,
  Download,
  Upload,
  ArrowLeft,
  Check,
  Edit3,
  Search,
  Calendar,
  DollarSign,
  AlertCircle,
  FileText,
  Percent,
  Sparkles,
  Tag } from
'lucide-react';
import { Invoice, Client, InvoiceStatus } from '../types';
import { exportInvoicesToCSV, parseInvoicesFromCSV, getSampleInvoicesCSV } from '../utils/csvUtils';
import { CsvImportModal } from './CsvImportModal';

interface InvoicesViewProps {
  payments: any[];
  run: (action:string,payload:any,success?:string)=>Promise<any>;
  today: string;
  company: Record<string,string>;
  openCreate?: boolean;
  onClearIntent?: () => void;
  invoices: Invoice[];
  clients: Client[];
  onAddInvoice: (newInv: Invoice) => Promise<Invoice>;
  onUpdateInvoice?: (updatedInv: Invoice) => void;
  onDeleteInvoice?: (invoiceId: number) => void;
  onImportInvoices?: (newInvoices: Omit<Invoice, 'id'>[]) => void;
  selectedInvoiceNumber?: string | null;
}

type InvoicePageMode = 'ledger' | 'create' | 'import' | 'edit';

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  payments, run, today,
  company,
  openCreate, onClearIntent,
  invoices,
  clients,
  onAddInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onImportInvoices,
  selectedInvoiceNumber
}) => {
  // Page Mode: 'ledger' | 'create' | 'import' | 'edit' (In-page, no popups)
  const [pageMode, setPageMode] = useState<InvoicePageMode>('ledger');
  useEffect(() => {if (openCreate) {setPageMode('create');onClearIntent?.();}}, [openCreate]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(() => {
    if (selectedInvoiceNumber) {
      const found = invoices.find((i) => i.invoice_number === selectedInvoiceNumber);
      if (found) return found;
    }
    return invoices[0] || null;
  });

  // Search & Status filters for invoice ledger
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceStatus>('All');
  const [feedbackMsg, setFeedbackMsg] = useTimedMessage();

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);

  };

  useEffect(() => {
    if (selectedInvoiceNumber) {
      const found = invoices.find((i) => i.invoice_number === selectedInvoiceNumber);
      if (found) {
        setSelectedInvoice(found);
        setPageMode('ledger');
      }
    }
  }, [selectedInvoiceNumber, invoices]);

  // Keep selectedInvoice in sync with updated invoices prop
  useEffect(() => {
    if (selectedInvoice) {
      const updated = invoices.find((i) => i.id === selectedInvoice.id);
      if (updated) {
        setSelectedInvoice(updated);
      }
    } else if (invoices.length > 0) {
      setSelectedInvoice(invoices[0]);
    }
  }, [invoices]);

  /* =========================================================================
   * NEW INVOICE BUILDER STATE
   * ========================================================================= */
  const [builderClientId, setBuilderClientId] = useState<number>(clients[0]?.id || 1);
  const [builderInvoiceNumber, setBuilderInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${String(Math.max(0,...invoices.map(i=>Number(i.invoice_number.match(/^INV-\d{4}-(\d+)$/)?.[1] || 0))) + 1).padStart(3, '0')}`);
  const [builderIssueDate, setBuilderIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [builderDueDate, setBuilderDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [builderStatus, setBuilderStatus] = useState<InvoiceStatus>('Pending');
  const [builderQuotationRef, setBuilderQuotationRef] = useState('');
  const [builderNotes, setBuilderNotes] = useState(`Standard Net 15 payment terms. Thank you for choosing ${company.legal_name || 'VK Digi Solutions'}.`);
  const [builderGstRate, setBuilderGstRate] = useState<number>(18);
  const [createLineItems, setCreateLineItems] = useState<{desc: string;qty: number;rate: number;hsn_sac?: string;}[]>([
  { desc: 'Custom Enterprise Web Portal Development', qty: 1, rate: 45000, hsn_sac: '998314' },
  { desc: 'Hostinger Cloud VPS Setup & SSL Clustering', qty: 1, rate: 8500, hsn_sac: '998315' }]
  );

  const addCreateLineItem = () => {
    setCreateLineItems([...createLineItems, { desc: '', qty: 1, rate: 0, hsn_sac: '998314' }]);
  };

  const removeCreateLineItem = (index: number) => {
    setCreateLineItems(createLineItems.filter((_, i) => i !== index));
  };

  const updateCreateLineItem = (index: number, field: string, value: any) => {
    const updated = [...createLineItems];
    (updated[index] as any)[field] = value;
    setCreateLineItems(updated);
  };

  const createSubtotal = createLineItems.reduce((acc, item) => acc + Number(item.qty) * Number(item.rate), 0);
  const createGstTax = Math.round(createSubtotal * builderGstRate) / 100;
  const createGrandTotal = createSubtotal + createGstTax;

  const handleCreateInvoice = async (e: React.FormEvent) => {try {
      e.preventDefault();
      const client = clients.find((c) => c.id === builderClientId);
      const newInv: Invoice = {
        id: invoices.length > 0 ? Math.max(...invoices.map((i) => i.id)) + 1 : 1,
        invoice_number: builderInvoiceNumber.trim() || `INV-${new Date().getFullYear()}-${String(Math.max(0,...invoices.map(i=>Number(i.invoice_number.match(/^INV-\d{4}-(\d+)$/)?.[1] || 0))) + 1).padStart(3, '0')}`,
        client_id: builderClientId,
        client_name: client?.name || 'Client',
        total_amount: createSubtotal,
        gst_tax: createGstTax,
        grand_total: createGrandTotal,
        payment_status: builderStatus,
        due_date: builderDueDate,
        created_at: builderIssueDate,
        quotation_ref: builderQuotationRef.trim() || undefined,
        notes: builderNotes.trim() || undefined,
        gst_rate: builderGstRate,
        items: createLineItems.map((it) => ({
          desc: it.desc.trim() || 'Professional IT Services',
          qty: Math.max(1, Number(it.qty) || 1),
          rate: Math.max(0, Number(it.rate) || 0),
          hsn_sac: it.hsn_sac?.trim() || '998314'
        }))
      };
      const savedInvoice = await onAddInvoice(newInv);
      setSelectedInvoice(savedInvoice);
      setPageMode('ledger');
      showFeedback(`Invoice ${newInv.invoice_number} generated successfully!`);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  /* =========================================================================
   * EDIT INVOICE STATE & HANDLERS
   * ========================================================================= */
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editFormData, setEditFormData] = useState<{
    invoice_number: string;
    client_id: number;
    payment_status: InvoiceStatus;
    created_at: string;
    due_date: string;
    quotation_ref: string;
    notes: string;
    gst_rate: number;
    discount_amount: number;
    items: {desc: string;qty: number;rate: number;hsn_sac?: string;}[];
  }>({
    invoice_number: '',
    client_id: 1,
    payment_status: 'Pending',
    created_at: '',
    due_date: '',
    quotation_ref: '',
    notes: '',
    gst_rate: 18,
    discount_amount: 0,
    items: []
  });

  const startEditingInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    const initialItems = inv.items && inv.items.length > 0 ?
    inv.items.map((it) => ({ ...it, hsn_sac: it.hsn_sac || '998314' })) :
    [{
      desc: inv.quotation_ref ? `Deliverables under Quote ${inv.quotation_ref}` : 'Web Portal Architecture & Cloud Setup',
      qty: 1,
      rate: inv.total_amount,
      hsn_sac: '998314'
    }];

    setEditFormData({
      invoice_number: inv.invoice_number,
      client_id: inv.client_id,
      payment_status: inv.payment_status,
      created_at: inv.created_at,
      due_date: inv.due_date,
      quotation_ref: inv.quotation_ref || '',
      notes: inv.notes || 'Standard Net 15 payment terms. Thank you for your business.',
      gst_rate: inv.gst_rate ?? 18,
      discount_amount: inv.discount_amount ?? 0,
      items: initialItems
    });
    setPageMode('edit');
  };

  const addEditLineItem = () => {
    setEditFormData((prev) => ({
      ...prev,
      items: [...prev.items, { desc: '', qty: 1, rate: 0, hsn_sac: '998314' }]
    }));
  };

  const removeEditLineItem = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateEditLineItem = (index: number, field: string, value: any) => {
    setEditFormData((prev) => {
      const updated = [...prev.items];
      (updated[index] as any)[field] = value;
      return { ...prev, items: updated };
    });
  };

  const editSubtotal = editFormData.items.reduce((acc, item) => acc + Number(item.qty) * Number(item.rate), 0);
  const editTaxable = Math.max(0, editSubtotal - editFormData.discount_amount);
  const editGstTax = Math.round(editTaxable * (editFormData.gst_rate ?? 18)) / 100;
  const editGrandTotal = editTaxable + editGstTax;

  const handleSaveEditedInvoice = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!editingInvoice) return;

      const client = clients.find((c) => c.id === Number(editFormData.client_id));
      const updated: Invoice = {
        ...editingInvoice,
        invoice_number: editFormData.invoice_number.trim() || editingInvoice.invoice_number,
        client_id: Number(editFormData.client_id),
        client_name: client?.name || editingInvoice.client_name || 'Client',
        payment_status: editFormData.payment_status,
        created_at: editFormData.created_at,
        due_date: editFormData.due_date,
        quotation_ref: editFormData.quotation_ref.trim() || undefined,
        notes: editFormData.notes.trim() || undefined,
        gst_rate: Number(editFormData.gst_rate),
        discount_amount: Number(editFormData.discount_amount),
        items: editFormData.items.map((it) => ({
          desc: it.desc.trim() || 'Service Deliverable',
          qty: Math.max(1, Number(it.qty) || 1),
          rate: Math.max(0, Number(it.rate) || 0),
          hsn_sac: it.hsn_sac?.trim() || '998314'
        })),
        total_amount: editSubtotal,
        gst_tax: editGstTax,
        grand_total: editGrandTotal
      };

      if (onUpdateInvoice) {
        await onUpdateInvoice(updated);
      }
      setSelectedInvoice(updated);
      setPageMode('ledger');
      showFeedback(`Invoice ${updated.invoice_number} successfully updated!`);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleQuickStatusChange = async (inv: Invoice, newStatus: InvoiceStatus) => {try {
      const updated: Invoice = { ...inv, payment_status: newStatus };
      if (onUpdateInvoice) {
        await onUpdateInvoice(updated);
      }
      if (selectedInvoice?.id === inv.id) {
        setSelectedInvoice(updated);
      }
      showFeedback(`Invoice ${inv.invoice_number} status marked as "${newStatus}".`);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleQuickExtendDueDate = async (inv: Invoice, days: number) => {try {
      const current = new Date(inv.due_date);
      current.setDate(current.getDate() + days);
      const newDueDate = current.toISOString().split('T')[0];
      const updated: Invoice = { ...inv, due_date: newDueDate };
      if (onUpdateInvoice) {
        await onUpdateInvoice(updated);
      }
      if (selectedInvoice?.id === inv.id) {
        setSelectedInvoice(updated);
      }
      showFeedback(`Extended ${inv.invoice_number} due date by +${days} days (Due: ${newDueDate}).`);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleDeleteInvoiceClick = async (inv: Invoice) => {try {
      if (window.confirm(`Are you sure you want to delete Invoice ${inv.invoice_number} (${inv.client_name})? This action cannot be undone.`)) {
        if (onDeleteInvoice) {
          await onDeleteInvoice(inv.id);
        }
        if (selectedInvoice?.id === inv.id) {
          const remaining = invoices.filter((i) => i.id !== inv.id);
          setSelectedInvoice(remaining[0] || null);
        }
        setPageMode('ledger');
        showFeedback(`Invoice ${inv.invoice_number} deleted from ledger.`);
      }
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.client_name && inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.quotation_ref && inv.quotation_ref.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || inv.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* =========================================================================
   * PAGE: EDIT INVOICE (Dedicated In-Page Screen, No Popups)
   * ========================================================================= */
  if (pageMode === 'edit' && editingInvoice) {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('ledger')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Invoice Ledger
            </ActionButton>
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-xl bg-orange-100 text-[#EF7C00] flex items-center justify-center font-bold">
                <Edit3 size={16} />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#004077] tracking-tight">
                  Edit Invoice: {editingInvoice.invoice_number}
                </h2>
                <p className="text-xs text-slate-500">
                  Update line items, quantities, pricing, HSN codes, dates, and payment status. Tax calculations update live.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ActionButton
              type="button"
              onClick={() => setPageMode('ledger')}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
              
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => {
                const form = document.getElementById('edit-tax-invoice-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Save &amp; Update Invoice</span>
            </ActionButton>
          </div>
        </div>

        {/* Edit Form Body */}
        <form id="edit-tax-invoice-form" onSubmit={handleSaveEditedInvoice} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Form Details & Line Items */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Card 1: Core Invoice Meta */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
                <h3 className="font-bold text-xs text-[#004077] uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText size={14} />
                  <span>Invoice Metadata &amp; Client Assignment</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.invoice_number}
                      onChange={(e) => setEditFormData({ ...editFormData, invoice_number: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client / Organization *</label>
                    <select
                      value={editFormData.client_id}
                      onChange={(e) => setEditFormData({ ...editFormData, client_id: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]">
                      
                      {clients.map((c) =>
                      <option key={c.id} value={c.id}>
                          {c.name} ({c.client_code})
                        </option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                    <select
                      value={editFormData.payment_status}
                      disabled={!!editingInvoice.receipt_count}
                      onChange={(e) => setEditFormData({ ...editFormData, payment_status: e.target.value as InvoiceStatus })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]">
                      
                      <option value="Pending">Pending</option>
                      <option value="Partial">Partial</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                    </select>
                    {!!editingInvoice.receipt_count && <p className="mt-1 text-xs text-slate-500">Recorded receipts determine this status. Manage payments from the invoice receipt panel.</p>}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                    <input
                      type="date"
                      required
                      value={editFormData.created_at}
                      onChange={(e) => setEditFormData({ ...editFormData, created_at: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Payment Due Date</label>
                    <input
                      type="date"
                      required
                      value={editFormData.due_date}
                      onChange={(e) => setEditFormData({ ...editFormData, due_date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Quotation Reference (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. QT-2026-001"
                      value={editFormData.quotation_ref}
                      onChange={(e) => setEditFormData({ ...editFormData, quotation_ref: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>
                </div>
              </div>

              {/* Card 2: Deliverables & Line Items */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-[#004077] uppercase tracking-wider flex items-center space-x-1.5">
                      <Receipt size={14} />
                      <span>Invoice Deliverables &amp; Billable Items ({editFormData.items.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Adjust service descriptions, quantities, and rates. Subtotals and 18% GST recalculate automatically.
                    </p>
                  </div>
                  <ActionButton
                    type="button"
                    onClick={addEditLineItem}
                    className="px-3 py-1.5 bg-[#EF7C00]/10 hover:bg-[#EF7C00]/20 text-[#EF7C00] font-bold text-xs rounded-xl transition flex items-center space-x-1">
                    
                    <Plus size={14} />
                    <span>Add Item</span>
                  </ActionButton>
                </div>

                <div className="space-y-3">
                  {editFormData.items.map((item, idx) => {
                    const rowTotal = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                    return (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-slate-300 transition space-y-2">
                        
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>Item #{idx + 1}</span>
                          <span className="font-mono text-slate-700">Line Amount: ₹ {rowTotal.toLocaleString('en-IN')}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                          <div className="sm:col-span-6">
                            <input
                              type="text"
                              required
                              placeholder="Service or deliverable description..."
                              value={item.desc}
                              onChange={(e) => updateEditLineItem(idx, 'desc', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                            
                          </div>

                          <div className="sm:col-span-2">
                            <input
                              type="text"
                              placeholder="HSN/SAC (998314)"
                              value={item.hsn_sac || ''}
                              onChange={(e) => updateEditLineItem(idx, 'hsn_sac', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-center text-slate-700 focus:ring-2 focus:ring-[#004077]" />
                            
                          </div>

                          <div className="sm:col-span-1">
                            <input
                              type="number"
                              min="1"
                              placeholder="Qty"
                              value={item.qty}
                              onChange={(e) => updateEditLineItem(idx, 'qty', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold text-slate-900 focus:ring-2 focus:ring-[#004077]" />
                            
                          </div>

                          <div className="sm:col-span-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Unit Rate ₹"
                              value={item.rate}
                              onChange={(e) => updateEditLineItem(idx, 'rate', e.target.value)}
                              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-right font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#004077]" />
                            
                          </div>

                          <div className="sm:col-span-1 flex items-center justify-center">
                            {editFormData.items.length > 1 ?
                            <button
                              type="button"
                              onClick={() => removeEditLineItem(idx)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Remove line item">
                              
                                <Trash2 size={15} />
                              </button> :

                            <span className="text-[10px] text-slate-300 font-bold">Fixed</span>
                            }
                          </div>
                        </div>
                      </div>);

                  })}
                </div>

                {/* Quick Add Presets */}
                <div className="pt-3 border-t border-slate-100 flex items-center space-x-2 flex-wrap gap-y-2">
                  <span className="text-[11px] font-bold text-slate-500">Quick Insert:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData((prev) => ({
                        ...prev,
                        items: [...prev.items, { desc: 'Full-Stack Web Development & UI Sprint', qty: 1, rate: 35000, hsn_sac: '998314' }]
                      }));
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition">
                    
                    + Web Dev (₹35k)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData((prev) => ({
                        ...prev,
                        items: [...prev.items, { desc: 'Cloud VPS Server Infrastructure & Backups', qty: 1, rate: 10000, hsn_sac: '998315' }]
                      }));
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition">
                    
                    + VPS Hosting (₹10k)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData((prev) => ({
                        ...prev,
                        items: [...prev.items, { desc: 'Monthly Dedicated SEO & Growth Retainer', qty: 1, rate: 18000, hsn_sac: '998311' }]
                      }));
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition">
                    
                    + SEO Retainer (₹18k)
                  </button>
                </div>
              </div>

              {/* Card 3: Notes & Terms */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-3 text-xs">
                <label className="block font-bold text-slate-700">
                  Payment Notes, Bank Details &amp; Commercial Terms
                </label>
                <textarea
                  rows={3}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Notes shown on printable invoice..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
              </div>

            </div>

            {/* Right Column: Live Tax Breakdown & Actions */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Summary Card */}
              <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 space-y-4">
                <h3 className="font-bold text-xs text-[#004077] uppercase tracking-wider">
                  Live Financial Computation
                </h3>

                {/* GST Rate Selector */}
                <div className="space-y-1 text-xs">
                  <label className="block font-bold text-slate-700">GST Slab Rate</label>
                  <select
                    value={editFormData.gst_rate}
                    onChange={(e) => setEditFormData({ ...editFormData, gst_rate: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]">
                    
                    <option value={18}>18% GST (Standard Services - 9% CGST + 9% SGST)</option>
                    <option value={12}>12% GST (6% CGST + 6% SGST)</option>
                    <option value={5}>5% GST (2.5% CGST + 2.5% SGST)</option>
                    <option value={0}>0% / Exempt / SEZ Export</option>
                  </select>
                </div>

                {/* Calculation Breakdown Box */}
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal:</span>
                    <span className="font-bold text-white font-mono">₹ {editSubtotal.toLocaleString('en-IN')}</span>
                  </div>

                  <label className="block">Discount (INR)<input aria-label="Discount amount" className="block border rounded p-2 text-slate-900" type="number" min="0" step="0.01" value={editFormData.discount_amount} onChange={e=>setEditFormData({...editFormData,discount_amount:Number(e.target.value)})}/></label>
                  {editFormData.gst_rate > 0 ?
                  <>
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>CGST ({editFormData.gst_rate / 2}%):</span>
                        <span className="font-mono">₹ {Number((editGstTax / 2).toFixed(2)).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300 text-[11px]">
                        <span>SGST ({editFormData.gst_rate / 2}%):</span>
                        <span className="font-mono">₹ {Number((editGstTax / 2).toFixed(2)).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-orange-400 font-bold border-t border-slate-800 pt-1">
                        <span>Total GST ({editFormData.gst_rate}%):</span>
                        <span className="font-mono">₹ {editGstTax.toLocaleString('en-IN')}</span>
                      </div>
                    </> :

                  <div className="text-[11px] text-emerald-400 font-bold border-t border-slate-800 pt-1">
                      GST Exempt (0%)
                    </div>
                  }

                  <div className="flex justify-between text-base font-black text-white border-t-2 border-slate-700 pt-2">
                    <span>Grand Total:</span>
                    <span className="text-[#EF7C00] font-mono font-black">₹ {editGrandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <ActionButton
                    type="submit"
                    className="w-full py-3 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-2">
                    
                    <Check size={16} />
                    <span>Save &amp; Update Tax Invoice</span>
                  </ActionButton>

                  <ActionButton
                    type="button"
                    onClick={() => setPageMode('ledger')}
                    className="w-full py-2.5 border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold rounded-xl text-xs transition">
                    
                    Discard Changes
                  </ActionButton>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-50/70 rounded-2xl border border-red-200 p-5 space-y-2 text-xs">
                <span className="font-bold text-red-900 block">Danger Zone</span>
                <p className="text-[11px] text-red-700">
                  Delete this invoice from the billing ledger and client files archive.
                </p>
                <ActionButton
                  type="button"
                  onClick={() => handleDeleteInvoiceClick(editingInvoice)}
                  className="w-full py-2 bg-white hover:bg-red-600 hover:text-white text-red-600 font-bold rounded-xl border border-red-300 transition text-xs flex items-center justify-center space-x-1.5">
                  
                  <Trash2 size={13} />
                  <span>Delete Invoice Permanently</span>
                </ActionButton>
              </div>

            </div>

          </div>
        </form>
      </div>);

  }

  /* =========================================================================
   * PAGE: GENERATE GST INVOICE (Create Dedicated In-Page Screen, No Popup)
   * ========================================================================= */
  if (pageMode === 'create') {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('ledger')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Invoice Ledger
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Create Invoice</h2>
            <p className="text-xs text-slate-500">Add items, review tax and save the invoice.</p>
          </div>
          <div className="flex items-center space-x-2">
            <ActionButton
              type="button"
              onClick={() => setPageMode('ledger')}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
              
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => {
                const form = document.getElementById('tax-invoice-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Issue Tax Invoice</span>
            </ActionButton>
          </div>
        </div>

        {/* Builder Form Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8">
          <form id="tax-invoice-form" onSubmit={handleCreateInvoice} className="space-y-6 text-xs max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Select Client *</label>
                <select
                  value={builderClientId}
                  onChange={(e) => setBuilderClientId(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800">
                  
                  {clients.map((c) =>
                  <option key={c.id} value={c.id}>
                      {c.name} ({c.client_code}) - {c.city}
                    </option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Number *</label>
                <input
                  type="text"
                  required
                  value={builderInvoiceNumber}
                  onChange={(e) => setBuilderInvoiceNumber(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800" />
                
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issue Date</label>
                <input
                  type="date"
                  required
                  value={builderIssueDate}
                  onChange={(e) => setBuilderIssueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs" />
                
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  required
                  value={builderDueDate}
                  onChange={(e) => setBuilderDueDate(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs" />
                
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                <select
                  value={builderStatus}
                  onChange={(e) => setBuilderStatus(e.target.value as InvoiceStatus)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold">
                  
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
            </div>

            {/* Line Items Container */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Invoice Deliverables &amp; Services</span>
                <ActionButton
                  type="button"
                  onClick={addCreateLineItem}
                  className="px-3 py-1 bg-white border border-slate-300 text-xs font-bold text-[#EF7C00] hover:bg-orange-50 rounded-lg transition">
                  
                  + Add Line Item
                </ActionButton>
              </div>
              
              <div className="space-y-2.5">
                {createLineItems.map((item, idx) =>
                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <input
                    type="text"
                    placeholder="Service description"
                    value={item.desc}
                    onChange={(e) => updateCreateLineItem(idx, 'desc', e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs"
                    required />
                  
                    <input
                    type="text"
                    placeholder="HSN/SAC"
                    value={item.hsn_sac || ''}
                    onChange={(e) => updateCreateLineItem(idx, 'hsn_sac', e.target.value)}
                    className="w-20 p-2 border border-slate-200 rounded-lg text-xs text-center font-mono" />
                  
                    <div className="flex items-center gap-2">
                      <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateCreateLineItem(idx, 'qty', Number(e.target.value))}
                      className="w-16 p-2 border border-slate-200 rounded-lg text-xs text-center font-bold" />
                    
                      <input
                      type="number"
                      min="0"
                      placeholder="Rate ₹"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) => updateCreateLineItem(idx, 'rate', Number(e.target.value))}
                      className="w-28 p-2 border border-slate-200 rounded-lg text-xs text-right font-mono font-bold" />
                    
                      {createLineItems.length > 1 &&
                    <button
                      type="button"
                      onClick={() => removeCreateLineItem(idx)}
                      className="text-slate-400 hover:text-red-600 p-1.5"
                      title="Remove item">
                      
                          <Trash2 size={15} />
                        </button>
                    }
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Tax Summary Calculation */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-2 text-right">
              <div className="text-slate-300 text-xs">
                Subtotal: <span className="font-bold text-white">₹ {createSubtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-slate-300 text-xs">
                GST (18%): <span className="font-bold text-orange-400">₹ {createGstTax.toLocaleString('en-IN')}</span>
              </div>
              <div className="text-base font-black text-white pt-2 border-t border-slate-800">
                Total Payable: ₹ {createGrandTotal.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setPageMode('ledger')}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">
                
                Cancel &amp; Return
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold transition shadow-sm">
                
                Issue &amp; Post Invoice
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE: IMPORT INVOICES CSV (Dedicated In-Page Screen, No Popup)
   * ========================================================================= */
  if (pageMode === 'import') {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('ledger')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Invoice Ledger
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Import Invoice Ledger from CSV</h2>
            <p className="text-xs text-slate-500">
              Bulk import past invoices, amounts, due dates, and payment statuses via structured CSV data.
            </p>
          </div>
        </div>

        <CsvImportModal
          isOpen={true}
          renderAsPage={true}
          onClose={() => setPageMode('ledger')}
          title="Import Invoice Ledger from CSV"
          description="Upload an existing CSV file or paste tabular invoice records from billing systems/Excel."
          type="invoices"
          sampleCsv={getSampleInvoicesCSV()}
          sampleFilename="vkd_invoices_sample_template.csv"
          parseFunction={(text) => {
            const res = parseInvoicesFromCSV(text, clients, invoices);
            return {
              data: res.invoices,
              errors: res.errors,
              warnings: res.warnings,
              totalRows: res.totalRows
            };
          }}
          onConfirmImport={async (parsedInvoices) => {try {
              if (onImportInvoices) {
                await onImportInvoices(parsedInvoices);
              } else {
                parsedInvoices.forEach(async (inv) => {try {
                    await onAddInvoice({
                      ...inv,
                      id: invoices.length + 1
                    });
                  } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}});
              }
              setPageMode('ledger');
            } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}} />
        
      </div>);

  }

  /* =========================================================================
   * PAGE 0: DEFAULT INVOICE LEDGER & PREVIEW VIEW
   * ========================================================================= */
  return (
    <div className="space-y-6">
      
      {/* Toast Feedback */}
      {feedbackMsg &&
      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle size={15} className="text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      }

      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#004077] tracking-tight">Invoices &amp; Billing</h2>
          
        </div>
        <div className="flex items-center flex-wrap gap-2">
          {/* Export CSV Button */}
          <ActionButton
            onClick={() => exportInvoicesToCSV(invoices)}
            className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Export all invoice records and GST values to CSV">
            
            <Download size={14} className="text-[#004077]" />
            <span>Export CSV</span>
          </ActionButton>

          {/* Import CSV Button */}
          <ActionButton
            onClick={() => setPageMode('import')}
            className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            title="Import invoice data from CSV file">
            
            <Upload size={14} className="text-[#EF7C00]" />
            <span>Import CSV</span>
          </ActionButton>

          {/* New Invoice Button */}
          <ActionButton
            onClick={() => {
              setBuilderInvoiceNumber(`INV-${new Date().getFullYear()}-${String(Math.max(0,...invoices.map(i=>Number(i.invoice_number.match(/^INV-\d{4}-(\d+)$/)?.[1] || 0))) + 1).padStart(3, '0')}`);
              setPageMode('create');
            }}
            className="px-4 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5">
            
            <Plus size={15} />
            <span>+ Generate GST Invoice</span>
          </ActionButton>
        </div>
      </div>

      {/* Main Two-Panel Layout: Invoice List & Live Print Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Invoices List with Search & Status Filters */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-4 space-y-3">
            
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs text-[#004077] uppercase tracking-wider">
                All Invoices ({filteredInvoices.length}/{invoices.length})
              </h3>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by invoice # or client..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center space-x-1.5 text-xs overflow-x-auto pb-1">
              {(['All', 'Pending', 'Partial', 'Paid'] as const).map((status) => {
                const count = status === 'All' ? invoices.length : invoices.filter((i) => i.payment_status === status).length;
                const isSelected = statusFilter === status;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] whitespace-nowrap transition ${
                    isSelected ?
                    'bg-[#004077] text-white' :
                    'bg-slate-100 hover:bg-slate-200 text-slate-600'}`
                    }>
                    
                    {status} ({count})
                  </button>);

              })}
            </div>

            {/* Invoices Scroll List */}
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredInvoices.map((inv) => {
                const isSelected = selectedInvoice?.id === inv.id;
                return (
                  <div
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer group relative ${
                    isSelected ?
                    'bg-blue-50/70 border-[#004077] ring-1 ring-[#004077]' :
                    'bg-white hover:bg-slate-50 border-slate-200'}`
                    }>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[#004077] group-hover:text-[#EF7C00] transition">
                        {inv.invoice_number}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        inv.payment_status === 'Paid' ?
                        'bg-emerald-100 text-emerald-800' :
                        inv.payment_status === 'Partial' ?
                        'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'}`
                        }>
                          {inv.payment_status}
                        </span>

                        {/* Quick Edit Icon */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingInvoice(inv);
                          }}
                          className="p-1 text-slate-400 hover:text-[#EF7C00] hover:bg-white rounded-md transition"
                          title="Edit this invoice">
                          
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="font-semibold text-xs text-slate-800 mt-1 truncate">{inv.client_name}</p>
                    
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[11px]">
                      <span className="text-slate-400">Due: {inv.due_date}</span>
                      <span className="font-bold text-slate-900 font-mono">₹ {inv.grand_total.toLocaleString('en-IN')}</span>
                    </div>
                  </div>);

              })}

              {filteredInvoices.length === 0 &&
              <div className="p-6 text-center text-slate-400 text-xs">
                  No invoices matching filter.
                </div>
              }
            </div>
          </div>
        </div>

        {/* Right Column: Printable & Editable Invoice Preview Sheet */}
        <div className="lg:col-span-7">
          {selectedInvoice&&<PaymentReceipts key={selectedInvoice.id} invoice={selectedInvoice} payments={payments} run={run} today={today}/>}
          {selectedInvoice ?
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-lg p-6 sm:p-8 relative" id="printable-invoice">
              
              {/* Print & Edit Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 mb-5 print:hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Official Invoice Preview
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-bold">
                    {selectedInvoice.invoice_number}
                  </span>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  {/* EDIT INVOICE BUTTON */}
                  <ActionButton
                  onClick={() => startEditingInvoice(selectedInvoice)}
                  className="px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  title="Edit line items, rates, dates, and client details">
                  
                    <Edit3 size={14} />
                    <span>Edit Invoice</span>
                  </ActionButton>

                  {/* Print Button */}
                  <ActionButton
                  onClick={() => selectedInvoice && downloadCommercial('invoice', selectedInvoice)}
                  className="px-3.5 py-2 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5">
                  
                    <Printer size={14} />
                    <span>Print / PDF</span>
                  </ActionButton>

                  {/* Delete Button */}
                  <button
                  onClick={() => handleDeleteInvoiceClick(selectedInvoice)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="Delete this invoice">
                  
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Admin In-Place Quick Controls Bar (Print Hidden) */}
              <div className="mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs print:hidden">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-bold">Quick Status:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    {(['Pending', 'Partial', 'Paid'] as const).map((st) =>
                  <button
                    key={st}
                    disabled={!!selectedInvoice.receipt_count}
                    title={selectedInvoice.receipt_count?'Status is calculated from payment receipts':undefined}
                    type="button"
                    onClick={() => handleQuickStatusChange(selectedInvoice, st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                    selectedInvoice.payment_status === st ?
                    st === 'Paid' ? 'bg-emerald-600 text-white' : st === 'Partial' ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white' :
                    'text-slate-600 hover:bg-slate-100'}`
                    }>
                    
                        {st}
                      </button>
                  )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-bold">Extend Due:</span>
                  <button
                  type="button"
                  onClick={() => handleQuickExtendDueDate(selectedInvoice, 7)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition text-[11px]">
                  
                    +7 Days
                  </button>
                  <button
                  type="button"
                  onClick={() => handleQuickExtendDueDate(selectedInvoice, 15)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition text-[11px]">
                  
                    +15 Days
                  </button>
                </div>
              </div>

              {/* Brand Letterhead */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#004077] text-white flex items-center justify-center font-black text-xl">
                      VK
                    </div>
                    <div>
                      <h2 className="font-black text-lg text-[#004077] leading-none">{company.legal_name}</h2>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Private Limited &bull; GST Registered</p>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-3 space-y-0.5">
                    <p>{company.address}</p>
                    <p>{[company.city,company.state,company.postal_code].filter(Boolean).join(", ")}</p>
                    <p><strong>GSTIN:</strong> {company.gstin} | <strong>PAN:</strong> {company.pan}</p>
                    <p>{company.email} &bull; {company.phone}</p>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <h3 className="text-xl font-black text-[#004077] tracking-tight">TAX INVOICE</h3>
                  <div className="mt-2 space-y-1 text-xs text-slate-600">
                    <p><strong>Invoice No:</strong> <span className="font-mono font-bold">{selectedInvoice.invoice_number}</span></p>
                    {selectedInvoice.quotation_ref &&
                  <p><strong>Quotation Ref:</strong> <span className="font-mono text-[#EF7C00] font-bold">{selectedInvoice.quotation_ref}</span></p>
                  }
                    <p><strong>Date:</strong> {selectedInvoice.created_at}</p>
                    <p><strong>Payment Due:</strong> {selectedInvoice.due_date}</p>
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[11px] font-bold mt-1 ${
                  selectedInvoice.payment_status === 'Paid' ?
                  'bg-emerald-100 text-emerald-800' :
                  selectedInvoice.payment_status === 'Partial' ?
                  'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'}`
                  }>
                      STATUS: {selectedInvoice.payment_status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bill To Info */}
              <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bill To:</span>
                <h4 className="font-bold text-sm text-slate-800 mt-0.5">{selectedInvoice.client_name}</h4>
                <p className="text-xs text-slate-600 mt-0.5">Client ID: VKD-CLI-{selectedInvoice.client_id}</p>
                <p className="text-xs text-slate-500">Client account</p>
              </div>

              {/* Line Items Table */}
              <div className="mt-6 border border-slate-200 rounded-xl overflow-x-auto" tabIndex={0} aria-label="Invoice line items">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4 w-12 text-center">#</th>
                      <th className="py-2.5 px-4">Item Description</th>
                      <th className="py-2.5 px-4 text-center">HSN/SAC</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-4 text-right">Taxable Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items && selectedInvoice.items.length > 0 ?
                  selectedInvoice.items.map((item, idx) => {
                    const lineAmount = (Number(item.qty) || 0) * (Number(item.rate) || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{item.desc}</span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono text-slate-600">{item.hsn_sac || '998314'}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold">{item.qty}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-700">₹ {Number(item.rate).toLocaleString('en-IN')}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                              ₹ {lineAmount.toLocaleString('en-IN')}
                            </td>
                          </tr>);

                  }) :

                  <tr>
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">1</td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-800">
                            {selectedInvoice.quotation_ref ? `Deliverables under Quote ${selectedInvoice.quotation_ref}` : 'Web Portal Architecture & Cloud Setup'}
                          </span>
                          <p className="text-[11px] text-slate-500">Professional IT, Development &amp; Cloud Maintenance Services</p>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-600">998314</td>
                        <td className="py-3 px-4 text-center font-mono text-slate-800 font-bold">1</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">₹ {selectedInvoice.total_amount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          ₹ {selectedInvoice.total_amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                  }
                  </tbody>
                </table>
              </div>

              {/* Tax Computation Breakdown */}
              <div className="mt-6 flex justify-end">
                <div className="w-full sm:w-72 space-y-1.5 text-xs">
                  {!!selectedInvoice.discount_amount && <div className="flex justify-between text-slate-600"><span>Discount:</span><span>INR {selectedInvoice.discount_amount.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Subtotal:</span>
                    <span className="font-bold font-mono">₹ {selectedInvoice.total_amount.toLocaleString('en-IN')}</span>
                  </div>
                  
                  {selectedInvoice.gst_tax > 0 ?
                <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST ({(selectedInvoice.gst_rate ?? 18) / 2}%):</span>
                        <span className="font-mono">₹ {(selectedInvoice.gst_tax / 2).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST ({(selectedInvoice.gst_rate ?? 18) / 2}%):</span>
                        <span className="font-mono">₹ {(selectedInvoice.gst_tax / 2).toLocaleString('en-IN')}</span>
                      </div>
                    </> :

                <div className="flex justify-between text-emerald-700 font-bold">
                      <span>GST (0% Exempt):</span>
                      <span>₹ 0</span>
                    </div>
                }

                  <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2 text-sm">
                    <span>Total (INR):</span>
                    <span className="text-[#004077] font-mono font-black text-base">₹ {selectedInvoice.grand_total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Notes & Terms (if defined) */}
              {selectedInvoice.notes &&
            <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">
                    Invoice Remarks &amp; Terms
                  </span>
                  <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-line">
                    {selectedInvoice.notes}
                  </p>
                </div>
            }

              {/* Payment Details & Bank Transfer */}
              <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">Bank Wire Details</span>
                  <p className="text-slate-600">Bank: <strong>{company.bank_name}</strong></p>
                  <p className="text-slate-600">Account Name: <strong>{company.account_name || company.legal_name}</strong></p>
                  <p className="text-slate-600">A/C No: <strong>{company.account_number}</strong></p>
                  <p className="text-slate-600">IFSC: <strong>{company.ifsc}</strong></p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1 text-[11px] uppercase tracking-wider">Declaration</span>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.
                    </p>
                  </div>
                  <div className="mt-4 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Authorised Signatory</p>
                    <p className="text-xs font-bold text-[#004077]">{company.legal_name}</p>
                  </div>
                </div>
              </div>

            </div> :

          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
              <Receipt size={40} className="mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No invoice selected</p>
              <p className="text-xs mt-1">Select an invoice from the list on the left to view, edit, or print the official Tax Invoice.</p>
            </div>
          }
        </div>

      </div>

    </div>);

};
