import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import { downloadCommercial } from '../utils/pdfUtils';
import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  FileCheck,
  XCircle,
  Eye,
  Trash2,
  Printer,
  Sparkles,
  ArrowRight,
  Receipt,
  Building,
  User,
  Calendar,
  IndianRupee,
  ShieldCheck,
  AlertCircle,
  X,
  FileText,
  SlidersHorizontal,
  PlusCircle,
  HelpCircle,
  Check,
  ArrowLeft } from
'lucide-react';
import {
  Quotation,
  QuotationStatus,
  QuotationLineItem,
  QuotationCustomField,
  Client,
  ServiceCatalog,
  Invoice } from
'../types';

const serviceTerm = (cycle?: string) => ({ Monthly: '1 Month', Quarterly: '3 Months', 'Half-Yearly': '6 Months', Yearly: '1 Year', Custom: 'Custom', 'One-Time': 'Project Scope' }[cycle || 'Monthly'] || '1 Month');

interface QuotationsViewProps {
  company: Record<string,string>;
  selectedQuotationNumber?: string | null;
  quotations: Quotation[];
  clients: Client[];
  services: ServiceCatalog[];
  onAddQuotation: (newQuotation: Omit<Quotation, 'id' | 'created_at'>) => Promise<Quotation>;
  onUpdateQuotation: (updatedQuotation: Quotation) => Promise<Quotation>;
  onDeleteQuotation: (quotationId: number) => void;
  onApproveAndGenerateInvoice: (quotation: Quotation) => Promise<{invoice: Invoice;quotation: Quotation;}>;
  onViewInvoice?: (invoiceNumber: string) => void;
  preselectedServiceId?: number | null;
  onClearPreselectedService?: () => void;
  preselectedClientId?: number | null;
  onClearPreselectedClient?: () => void;
}

type PageViewMode = 'list' | 'create' | 'preview';

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  company,
  selectedQuotationNumber,
  quotations,
  clients,
  services,
  onAddQuotation,
  onUpdateQuotation,
  onDeleteQuotation,
  onApproveAndGenerateInvoice,
  onViewInvoice,
  preselectedServiceId,
  onClearPreselectedService,
  preselectedClientId,
  onClearPreselectedClient
}) => {
  // Page mode: NO popups, opens dedicated in-page screens!
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [pageMode, setPageMode] = useState<PageViewMode>('list');

  // Filter & Search states
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Target quotation for preview
  const [previewQuotation, setPreviewQuotation] = useState<Quotation | null>(null);
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState<{invNumber: string;clientName: string;} | null>(null);

  React.useEffect(() => {if (selectedQuotationNumber) {const q = quotations.find((q) => q.quotation_number === selectedQuotationNumber);if (q) {setPreviewQuotation(q);setPageMode('preview');}}}, [selectedQuotationNumber]);
  React.useEffect(() => { if (previewQuotation) setPreviewQuotation(quotations.find(q=>q.id===previewQuotation.id) || null); }, [quotations]);
  // New Quotation Form State
  const initialClient = clients[0] || null;
  const generateNewQuotationNumber = () => {
    const nextSeq = Math.max(0,...quotations.map(q=>Number(q.quotation_number.match(/^VKD-QT-\d{4}-(\d+)$/)?.[1] || 0))) + 1;
    return `VKD-QT-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`;
  };

  const [formData, setFormData] = useState({
    quotation_number: generateNewQuotationNumber(),
    client_id: initialClient ? initialClient.id : 0,
    title: '',
    date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Draft' as QuotationStatus,
    notes: 'Quotation prepared for client review and commercial signoff.',
    terms_conditions: '1. 50% advance upon project authorization. 2. 18% GST extra as applicable. 3. Scope modifications billed separately. 4. Quotation valid for 30 calendar days.',
    discount_amount: 0,
    gst_rate: 18
  });

  // Line items state
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([
  {
    id: `item-${Date.now()}`,
    service_id: services[0]?.id || 0,
    service_name: services[0]?.service_name || 'Custom Agency Service',
    description: services[0]?.description || '',
    quantity: 1,
    unit: 'Month',
    unit_price: services[0]?.default_rate ?? 0,
    amount: services[0]?.default_rate ?? 0,
    billing_cycle: services[0]?.billing_frequency || 'Monthly',
    service_duration: serviceTerm(services[0]?.billing_frequency),
    custom_duration: services[0]?.custom_duration || '',
    start_date: new Date().toISOString().split('T')[0]
  }]
  );

  // Dynamic Custom Fields state
  const [customFields, setCustomFields] = useState<QuotationCustomField[]>([
  { id: 'cf-default-1', field_name: 'Payment Terms', field_value: '50% Advance, 50% on UAT Signoff' },
  { id: 'cf-default-2', field_name: 'Delivery Timeline', field_value: '4 to 6 Weeks' }]
  );

  // Check if preselected service was passed from Services catalog
  React.useEffect(() => {
    if (preselectedServiceId) {
      const s = services.find((srv) => srv.id === preselectedServiceId);
      if (s) {
        setLineItems([
        {
          id: `item-${Date.now()}`,
          service_id: s.id,
          service_name: s.service_name,
          description: s.description,
          quantity: 1,
          unit: s.billing_frequency === 'One-Time' ? 'Project' : s.billing_frequency,
          unit_price: s.default_rate,
          amount: s.default_rate,
          billing_cycle: s.billing_frequency,
          service_duration: serviceTerm(s.billing_frequency),
          custom_duration: s.custom_duration || '',
          start_date: new Date().toISOString().split('T')[0]
        }]
        );
        setFormData((prev) => ({
          ...prev,
          title: `Proposal for ${s.service_name}`
        }));
        setPageMode('create');
        onClearPreselectedService?.();
      }
    }
  }, [preselectedServiceId, services, onClearPreselectedService]);

  // Check if preselected client was passed from Clients view
  React.useEffect(() => {
    if (preselectedClientId) {
      const c = clients.find((cl) => cl.id === preselectedClientId);
      if (c) {
        setFormData((prev) => ({
          ...prev,
          client_id: c.id,
          title: `Commercial Services Proposal for ${c.name}`
        }));
        setPageMode('create');
        onClearPreselectedClient?.();
      }
    }
  }, [preselectedClientId, clients, onClearPreselectedClient]);

  // Handle line item updates
  const handleServiceSelect = (index: number, serviceId: number) => {
    const selectedSrv = services.find((s) => s.id === serviceId);
    if (!selectedSrv) return;

    const cycle = selectedSrv.billing_frequency || 'Monthly';
    const defaultDur = serviceTerm(cycle);

    const updated = [...lineItems];
    updated[index] = {
      ...updated[index],
      service_id: selectedSrv.id,
      service_name: selectedSrv.service_name,
      description: selectedSrv.description,
      unit_price: selectedSrv.default_rate,
      unit: cycle === 'One-Time' ? 'Project' : cycle,
      amount: updated[index].quantity * selectedSrv.default_rate,
      billing_cycle: cycle,
      service_duration: defaultDur,
      custom_duration: selectedSrv.custom_duration || '',
      start_date: updated[index].start_date || formData.date
    };
    setLineItems(updated);
  };

  const handleLinePriceChange = (index: number, newPrice: number) => {
    const updated = [...lineItems];
    updated[index].unit_price = newPrice;
    updated[index].amount = updated[index].quantity * newPrice;
    setLineItems(updated);
  };

  const handleLineQtyChange = (index: number, newQty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = Math.max(1, newQty);
    updated[index].amount = updated[index].quantity * updated[index].unit_price;
    setLineItems(updated);
  };

  const handleLineUnitChange = (index: number, unit: string) => {
    const updated = [...lineItems];
    updated[index].unit = unit;
    setLineItems(updated);
  };

  const handleLineBillingCycleChange = (index: number, cycle: any) => {
    const updated = [...lineItems];
    updated[index].billing_cycle = cycle;
    updated[index].service_duration = serviceTerm(cycle);
    setLineItems(updated);
  };

  const handleLineDurationChange = (index: number, duration: string) => {
    const updated = [...lineItems];
    updated[index].service_duration = duration;
    setLineItems(updated);
  };

  const handleLineCustomDurationChange = (index: number, customDur: string) => {
    const updated = [...lineItems];
    updated[index].custom_duration = customDur;
    setLineItems(updated);
  };

  const handleLineStartDateChange = (index: number, date: string) => {
    const updated = [...lineItems];
    updated[index].start_date = date;
    setLineItems(updated);
  };

  const handleLineDescriptionChange = (index: number, desc: string) => {
    const updated = [...lineItems];
    updated[index].description = desc;
    setLineItems(updated);
  };

  const handleAddLine = () => {
    const defaultSrv = services[0];
    const cycle = defaultSrv?.billing_frequency || 'Monthly';
    setLineItems([
    ...lineItems,
    {
      id: `item-${Date.now()}-${lineItems.length}`,
      service_id: defaultSrv?.id || 0,
      service_name: defaultSrv?.service_name || 'Additional Deliverable',
      description: defaultSrv?.description || '',
      quantity: 1,
      unit: 'Month',
      unit_price: defaultSrv?.default_rate ?? 0,
      amount: defaultSrv?.default_rate ?? 0,
      billing_cycle: cycle,
      service_duration: serviceTerm(cycle),
      custom_duration: defaultSrv?.custom_duration || '',
      start_date: formData.date
    }]
    );
  };

  const handleRemoveLine = (index: number) => {
    if (lineItems.length === 1) {
      showPopup('Quotation must contain at least one line item deliverable.');
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Custom Fields Handlers
  const handleAddCustomField = () => {
    setCustomFields([
    ...customFields,
    {
      id: `cf-${Date.now()}`,
      field_name: '',
      field_value: ''
    }]
    );
  };

  const handleUpdateCustomField = (index: number, name: string, value: string) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], field_name: name, field_value: value };
    setCustomFields(updated);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = lineItems.reduce((acc, item) => acc + item.amount, 0);
  const discountedSubtotal = Math.max(0, subtotal - formData.discount_amount);
  const gstAmount = Math.round(discountedSubtotal * formData.gst_rate) / 100;
  const grandTotal = discountedSubtotal + gstAmount;

  // Pipeline Counts
  const totalQuotationsCount = quotations.length;
  const draftCount = quotations.filter((q) => q.status === 'Draft').length;
  const sentCount = quotations.filter((q) => q.status === 'Sent').length;
  const pendingCount = quotations.filter((q) => q.status === 'Pending').length;
  const approvedCount = quotations.filter((q) => q.status === 'Approved').length;
  const rejectedCount = quotations.filter((q) => q.status === 'Rejected').length;

  const totalPipelineValue = quotations.reduce((acc, q) => acc + q.grand_total, 0);
  const totalApprovedValue = quotations.
  filter((q) => q.status === 'Approved').
  reduce((acc, q) => acc + q.grand_total, 0);

  // Filtered Quotations
  const filteredQuotations = quotations.filter((q) => {
    const matchesStatus = selectedStatusTab === 'All' || q.status === selectedStatusTab;
    const matchesSearch = q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleCreateQuotation = async (e: React.FormEvent) => {try {
      e.preventDefault();
      const selectedClient = clients.find((c) => c.id === Number(formData.client_id));
      if (!selectedClient) {
        showPopup('Please select a valid client.');
        return;
      }

      if (!formData.title.trim()) {
        showPopup('Please enter a proposal title or subject.');
        return;
      }

      const newQuotationData: Omit<Quotation, 'id' | 'created_at'> = {
        quotation_number: formData.quotation_number,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        client_email: selectedClient.email,
        client_mobile: selectedClient.mobile,
        client_address: `${selectedClient.address ? selectedClient.address + ', ' : ''}${selectedClient.city}`,
        title: formData.title.trim(),
        date: formData.date,
        valid_until: formData.valid_until,
        status: formData.status,
        items: lineItems,
        subtotal,
        discount_amount: formData.discount_amount,
        gst_rate: formData.gst_rate,
        gst_amount: gstAmount,
        grand_total: grandTotal,
        notes: formData.notes,
        terms_conditions: formData.terms_conditions,
        custom_fields: customFields.filter((cf) => cf.field_name.trim() !== '')
      };

      const created = editingQuotation ? await onUpdateQuotation({...editingQuotation,...newQuotationData}) : await onAddQuotation(newQuotationData);

      // If created with Approved status directly, trigger auto-invoice
      if (formData.status === 'Approved') {
        const res = await onApproveAndGenerateInvoice(created);
        setLastGeneratedInvoice({
          invNumber: res.invoice.invoice_number,
          clientName: res.quotation.client_name
        });
      }

      setEditingQuotation(null); setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleStatusChange = async (quotation: Quotation, newStatus: QuotationStatus) => {try {
      if (newStatus === 'Approved') {
        const res = await onApproveAndGenerateInvoice(quotation);
        setLastGeneratedInvoice({
          invNumber: res.invoice.invoice_number,
          clientName: res.quotation.client_name
        });
      } else {
        await onUpdateQuotation({
          ...quotation,
          status: newStatus
        });
      }
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center space-x-1">
            <Clock size={10} className="mr-0.5 text-slate-500" />
            <span>Draft</span>
          </span>);

      case 'Sent':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#004077] border border-blue-200 inline-flex items-center space-x-1">
            <Send size={10} className="mr-0.5 text-[#004077]" />
            <span>Sent to Client</span>
          </span>);

      case 'Pending':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center space-x-1">
            <AlertCircle size={10} className="mr-0.5 text-amber-600" />
            <span>Pending Signoff</span>
          </span>);

      case 'Approved':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center space-x-1 shadow-xs">
            <CheckCircle2 size={10} className="mr-0.5 text-emerald-600" />
            <span>Approved &bull; Invoiced</span>
          </span>);

      case 'Rejected':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 inline-flex items-center space-x-1">
            <XCircle size={10} className="mr-0.5 text-red-500" />
            <span>Declined</span>
          </span>);

    }
  };

  /* =========================================================================
   * PAGE 1: PREPARE NEW QUOTATION (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'create') {
    return (
      <div className="quotations-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Quotations Directory
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Create Quotation</h2>
            <p className="text-xs text-slate-500">Choose services, set prices and review your quotation.</p>
          </div>
          <div className="flex items-center space-x-2">
            <ActionButton
              type="button"
              onClick={() => setPageMode('list')}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
              
              Cancel
            </ActionButton>
            <ActionButton
              type="button"
              onClick={() => {
                const form = document.getElementById('quotation-builder-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>{editingQuotation ? 'Save Quotation Changes' : formData.status === 'Approved' ? 'Save & Automatically Generate Invoice' : 'Create & Save Quotation'}</span>
            </ActionButton>
          </div>
        </div>

        {/* Builder Container */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#004077] via-[#EF7C00] to-emerald-500"></div>

          <form id="quotation-builder-form" onSubmit={handleCreateQuotation} className="p-6 sm:p-8 space-y-8 text-xs">
            
            {/* Metadata Section */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quotation Number</label>
                <input
                  type="text"
                  required
                  value={formData.quotation_number}
                  onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-700 font-semibold" />
                
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Client Organization *</label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: Number(e.target.value) })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-800 focus:ring-2 focus:ring-[#004077]">
                  
                  {clients.map((c) =>
                  <option key={c.id} value={c.id}>
                      {c.name} ({c.client_code})
                    </option>
                  )}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Quotation Date</label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg" />
                
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Valid Until (Expiry)</label>
                <input
                  type="date"
                  required
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg" />
                
              </div>
            </div>

            {/* Title & Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Proposal Subject / Project Scope Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enterprise Cloud ERP Migration &amp; AMC Retainer Proposal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Initial Pipeline Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as QuotationStatus })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-800">
                  
                  <option value="Draft">Draft (Internal preparation)</option>
                  <option value="Sent">Sent (Shared with client)</option>
                  <option value="Pending">Pending (Commercial negotiations)</option>
                  <option value="Approved">Approved (Automatically generate Tax Invoice!)</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Line Items Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-1.5">
                    <SlidersHorizontal size={14} className="text-[#EF7C00]" />
                    <span>Deliverable Line Items &amp; Offered Custom Rates</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Add multiple service deliverables, override standard rates with custom pricing, and specify duration units.</p>
                </div>
                <ActionButton
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 py-1.5 bg-[#004077] hover:bg-[#00305a] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1 shadow-xs">
                  
                  <PlusCircle size={13} />
                  <span>Add Line Item</span>
                </ActionButton>
              </div>

              <div className="space-y-2.5">
                {lineItems.map((item, idx) =>
                <div key={item.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="grid grid-cols-12 gap-2.5 items-center">
                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Service Deliverable</label>
                        <select
                        value={item.service_id}
                        onChange={(e) => handleServiceSelect(idx, Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800">
                        
                          {services.map((s) =>
                        <option key={s.id} value={s.id}>
                              {s.service_name} (Std: ₹{s.default_rate} / {s.billing_frequency})
                            </option>
                        )}
                        </select>
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Offered Rate (₹)</label>
                        <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleLinePriceChange(idx, Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900" />
                      
                      </div>

                      <div className="col-span-6 sm:col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Qty</label>
                        <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => handleLineQtyChange(idx, Number(e.target.value))}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-center font-bold" />
                      
                      </div>

                      {/* Billing Cycle Selection */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Billing Cycle</label>
                        <select
                        value={item.billing_cycle || 'Monthly'}
                        onChange={(e) => handleLineBillingCycleChange(idx, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-[#004077]">
                        
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Half-Yearly">Half-Yearly</option>
                          <option value="Yearly">Yearly</option>
                          <option value="Custom">Custom Term</option>
                          <option value="One-Time">One-Time / Fixed</option>
                        </select>
                      </div>

                      {/* Service Duration & Term */}
                      <div className="col-span-6 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Service Duration</label>
                        <select
                        value={item.service_duration || '1 Month'}
                        onChange={(e) => handleLineDurationChange(idx, e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800">
                        
                          <option value="1 Month">1 Month</option>
                          <option value="3 Months">3 Months (Quarter)</option>
                          <option value="6 Months">6 Months (Half-Year)</option>
                          <option value="1 Year">1 Year (Annual)</option>
                          <option value="2 Years">2 Years</option>
                          <option value="Project Scope">Project Scope</option>
                          <option value="Custom">Custom Duration...</option>
                        </select>
                      </div>

                      <div className="col-span-12 sm:col-span-1 text-right">
                        <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Remove line item">
                        
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Secondary Row: Start Date, Custom Duration (if custom), Description and Total */}
                    <div className="grid grid-cols-12 gap-2.5 items-center pt-1 border-t border-slate-200/60">
                      <div className="col-span-6 sm:col-span-3">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Service Start Date</label>
                        <input
                        type="date"
                        value={item.start_date || formData.date}
                        onChange={(e) => handleLineStartDateChange(idx, e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800" />
                      
                      </div>

                      {item.service_duration === 'Custom' || item.billing_cycle === 'Custom' ?
                    <div className="col-span-6 sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Specify Duration</label>
                          <input
                        type="text"
                        placeholder="e.g. 45 Days, 18 Months..."
                        value={item.custom_duration || ''}
                        onChange={(e) => handleLineCustomDurationChange(idx, e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800" />
                      
                        </div> :

                    <div className="col-span-6 sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Auto-Invoice Setup</label>
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md block truncate">
                            ✓ Connects on approval
                          </span>
                        </div>
                    }

                      <div className="col-span-12 sm:col-span-4">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Deliverable Specifications / Notes</label>
                        <input
                        type="text"
                        placeholder="Scope specifications, SLA commitments..."
                        value={item.description}
                        onChange={(e) => handleLineDescriptionChange(idx, e.target.value)}
                        className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-600 placeholder-slate-400" />
                      
                      </div>

                      <div className="col-span-12 sm:col-span-2 text-right">
                        <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Total Amount</label>
                        <span className="font-mono font-black text-[#004077] text-sm block">
                          ₹ {item.amount.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields Section */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles size={14} className="text-[#EF7C00]" />
                  <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">Dynamic Commercial &amp; Project Fields</span>
                </div>
                <ActionButton
                  type="button"
                  onClick={handleAddCustomField}
                  className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition flex items-center space-x-1">
                  
                  <Plus size={12} />
                  <span>Add Custom Field</span>
                </ActionButton>
              </div>

              {customFields.length === 0 ?
              <p className="text-[11px] text-slate-400 italic">No custom fields added yet. Click &quot;Add Custom Field&quot; to define custom SLA, payment milestones, or warranty.</p> :

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {customFields.map((cf, idx) =>
                <div key={cf.id} className="flex items-center space-x-1.5 bg-white p-2 rounded-lg border border-slate-200">
                      <input
                    type="text"
                    placeholder="Field (e.g. Warranty)"
                    value={cf.field_name}
                    onChange={(e) => handleUpdateCustomField(idx, e.target.value, cf.field_value)}
                    className="w-2/5 p-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded" />
                  
                      <input
                    type="text"
                    placeholder="Value (e.g. 1 Year 24/7)"
                    value={cf.field_value}
                    onChange={(e) => handleUpdateCustomField(idx, cf.field_name, e.target.value)}
                    className="w-3/5 p-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded" />
                  
                      <button
                    type="button"
                    onClick={() => handleRemoveCustomField(idx)}
                    className="text-slate-400 hover:text-red-500 p-1">
                    
                        <Trash2 size={13} />
                      </button>
                    </div>
                )}
                </div>
              }
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Proposal Internal Notes</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs" />
                
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Terms &amp; Conditions (Printed on quotation)</label>
                <textarea
                  rows={2}
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_conditions: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs" />
                
              </div>
            </div>

            {/* Financial Summary Calculation Card */}
            <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                  <span>Subtotal: <strong>{formatINR(subtotal)}</strong></span>
                  <span>&bull;</span>
                  <span className="flex items-center space-x-1">
                    <span>Discount (₹):</span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={formData.discount_amount}
                      onChange={(e) => setFormData({ ...formData, discount_amount: Number(e.target.value) })}
                      className="w-20 px-2 py-0.5 bg-slate-800 border border-slate-700 text-white rounded text-xs font-bold" />
                    
                  </span>
                  <span>&bull;</span>
                  <span>GST (18%): <strong>{formatINR(gstAmount)}</strong></span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Calculated in compliance with Indian GST laws (9% CGST + 9% SGST).
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">Total Quotation Value</span>
                <span className="text-2xl font-black text-white">{formatINR(grandTotal)}</span>
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setPageMode('list')}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">
                
                Cancel &amp; Return
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold shadow-md shadow-orange-500/20 transition flex items-center space-x-2">
                
                <CheckCircle2 size={16} />
                <span>
                  {editingQuotation ? 'Save Quotation Changes' : formData.status === 'Approved' ? 'Save & Automatically Generate Invoice' : 'Create & Save Quotation'}
                </span>
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 2: OFFICIAL LETTERHEAD QUOTATION PREVIEW (Dedicated Full Page, No Modal)
   * ========================================================================= */
  if (pageMode === 'preview' && previewQuotation) {
    return (
      <div className="quotations-page space-y-6 animate-in fade-in">
        {/* Navigation Toolbar */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Quotations Directory
            </ActionButton>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-black text-[#004077] tracking-tight">
                Official Commercial Quotation: {previewQuotation.quotation_number}
              </h2>
              {getStatusBadge(previewQuotation.status)}
            </div>
            <p className="text-xs text-slate-500">
              Prepared for <strong>{previewQuotation.client_name}</strong> &bull; Subject: {previewQuotation.title}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {previewQuotation.status !== 'Approved' &&
            <ActionButton
              onClick={() => {
                handleStatusChange(previewQuotation, 'Approved');
                setPageMode('list');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs">
              
                <CheckCircle2 size={14} />
                <span>Approve &amp; Generate Invoice</span>
              </ActionButton>
            }
            <ActionButton
              onClick={() => previewQuotation && downloadCommercial('quotation', previewQuotation)}
              className="px-4 py-2 bg-[#004077] hover:bg-[#00355F] text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs">
              
              <Printer size={14} />
              <span>Print / Export PDF</span>
            </ActionButton>
          </div>
        </div>

        {/* Document Content Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-8 sm:p-12 space-y-8 text-slate-800" id="printable-quotation">
          {/* Agency Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-[#004077] pb-6 gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="w-10 h-10 rounded-xl bg-[#004077] text-white flex items-center justify-center font-black text-lg tracking-wider">
                  VK
                </span>
                <div>
                  <h1 className="text-2xl font-black text-[#004077] tracking-tight">{company.legal_name}</h1>
                  <p className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">
                    Web Development &bull; Digital Marketing &bull; Cloud Services
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">
                {[company.address,company.city,company.state,company.postal_code].filter(Boolean).join(", ")}<br />
                GSTIN: <strong>{company.gstin}</strong> &bull; {company.email}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-black uppercase tracking-widest text-[#EF7C00] block">
                Commercial Proposal
              </span>
              <div className="text-xl font-black font-mono text-[#004077] mt-0.5">
                {previewQuotation.quotation_number}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Date: <strong>{previewQuotation.date}</strong><br />
                Valid Until: <strong>{previewQuotation.valid_until}</strong>
              </div>
            </div>
          </div>

          {/* Client & Scope Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                Quotation Prepared For
              </span>
              <h3 className="font-bold text-slate-900 text-sm">{previewQuotation.client_name}</h3>
              <p className="text-slate-600 mt-1 leading-relaxed">
                {previewQuotation.client_address || 'Registered Corporate Office'}<br />
                Phone: {previewQuotation.client_mobile || 'N/A'}<br />
                Email: {previewQuotation.client_email || 'N/A'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">
                Project Subject / Scope
              </span>
              <h3 className="font-bold text-[#004077] text-sm">{previewQuotation.title}</h3>
              <p className="text-slate-600 mt-1 text-xs">
                {previewQuotation.notes || 'Formal agency quotation based on client business requirements.'}
              </p>
            </div>
          </div>

          {/* Itemized Deliverables Table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto" tabIndex={0} aria-label="Quotation line items">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Service Deliverable &amp; Scope</th>
                  <th className="py-3 px-4 text-center">Qty / Duration</th>
                  <th className="py-3 px-4 text-right">Offered Rate</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewQuotation.items.map((item, i) =>
                <tr key={item.id || i}>
                    <td className="py-3 px-4 font-mono text-slate-400">{i + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.service_name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      ₹ {item.unit_price.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {item.amount.toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Dynamic Custom Fields Display */}
          {previewQuotation.custom_fields && previewQuotation.custom_fields.length > 0 &&
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
              <span className="text-[10px] font-bold text-[#004077] uppercase tracking-wider block">
                Special Specifications &amp; Project Terms
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {previewQuotation.custom_fields.map((cf) =>
              <div key={cf.id} className="text-xs">
                    <span className="text-slate-400 font-bold block text-[10px]">{cf.field_name}:</span>
                    <span className="font-bold text-slate-800">{cf.field_value}</span>
                  </div>
              )}
              </div>
            </div>
          }

          {/* Financial Calculation Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Subtotal:</span>
                <span className="font-bold text-slate-800">₹ {previewQuotation.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {previewQuotation.discount_amount > 0 &&
              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-600">
                  <span>Discount:</span>
                  <span className="font-bold">- ₹ {previewQuotation.discount_amount.toLocaleString('en-IN')}</span>
                </div>
              }
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">GST ({previewQuotation.gst_rate}%):</span>
                <span className="font-bold text-slate-800">₹ {previewQuotation.gst_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between py-2 border-t-2 border-[#004077] text-sm">
                <span className="font-black text-[#004077]">Grand Total:</span>
                <span className="font-black text-[#004077]">₹ {previewQuotation.grand_total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          {previewQuotation.terms_conditions &&
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700 block mb-1 uppercase tracking-wider text-[10px]">
                Terms &amp; Conditions
              </span>
              <p className="text-slate-600 whitespace-pre-line leading-relaxed">
                {previewQuotation.terms_conditions}
              </p>
            </div>
          }

          {/* Authorized Signatory */}
          <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold">Client Confirmation &amp; Stamp</p>
              <div className="h-12 border-b border-dashed border-slate-300 w-44 mt-2"></div>
              <p className="text-[10px] text-slate-500 mt-1">Authorized Signature</p>
            </div>

            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase font-bold">For VK DIGI SOLUTIONS</p>
              <div className="h-12 flex items-end justify-end">
                <span className="font-serif italic font-bold text-[#004077] text-sm border-b border-slate-300 pb-1">
                  Karan Verma
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Managing Director / Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 0: MAIN QUOTATIONS PIPELINE DIRECTORY (Default View)
   * ========================================================================= */
  return (
    <div className="quotations-page space-y-6">
      
      {/* Auto Invoice Notification Banner */}
      {lastGeneratedInvoice &&
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold">
              <Receipt size={18} />
            </div>
            <div>
              <h4 className="font-black text-sm text-emerald-950">
                Automatic Invoice Generated: <span className="underline">{lastGeneratedInvoice.invNumber}</span>
              </h4>
              <p className="text-xs text-emerald-700">
                Tax Invoice successfully created and posted to accounts ledger for client <strong>{lastGeneratedInvoice.clientName}</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onViewInvoice &&
          <ActionButton
            onClick={() => {
              onViewInvoice(lastGeneratedInvoice.invNumber);
              setLastGeneratedInvoice(null);
            }}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition shadow-xs">
            
                <span>View Invoice</span>
                <ArrowRight size={13} />
              </ActionButton>
          }
            <button
            onClick={() => setLastGeneratedInvoice(null)}
            className="p-1.5 text-emerald-600 hover:text-emerald-900 rounded-lg">
            
              <X size={16} />
            </button>
          </div>
        </div>
      }

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-orange-50 text-[#EF7C00] flex items-center justify-center font-bold">
              <FileSpreadsheet size={18} />
            </span>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Quotations</h2>
          </div>
          
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <ActionButton
            onClick={() => {
              setEditingQuotation(null);
              setCustomFields([]);
              setFormData({
                quotation_number: generateNewQuotationNumber(),
                client_id: clients[0]?.id || 0,
                title: '',
                date: new Date().toISOString().split('T')[0],
                valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                status: 'Draft',
                notes: 'Quotation prepared for client review and commercial signoff.',
                terms_conditions: '1. 50% advance upon project authorization. 2. 18% GST extra as applicable. 3. Scope modifications billed separately. 4. Quotation valid for 30 calendar days.',
                discount_amount: 0,
                gst_rate: 18
              });
              setLineItems([
              {
                id: `item-${Date.now()}`,
                service_id: services[0]?.id || 0,
                service_name: services[0]?.service_name || 'Custom Agency Service',
                description: services[0]?.description || '',
                quantity: 1,
                unit: 'Month',
                unit_price: services[0]?.default_rate ?? 0,
                amount: services[0]?.default_rate ?? 0
              }]
              );
              setPageMode('create');
            }}
            className="px-4 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-2">
            
            <Plus size={15} />
            <span>Prepare New Quotation</span>
          </ActionButton>
        </div>
      </div>

      {/* Pipeline Stage Summary Cards */}
      <div className="quotations-summary grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedStatusTab('All')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
          selectedStatusTab === 'All' ?
          'bg-blue-50/70 border-[#004077] ring-2 ring-[#004077]/20 shadow-xs' :
          'bg-white border-slate-200 hover:border-slate-300'}`
          }>
          
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">All Proposals</span>
          <div className="text-xl font-black text-[#004077] mt-1">{totalQuotationsCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">{formatINR(totalPipelineValue)}</span>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Draft')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
          selectedStatusTab === 'Draft' ?
          'bg-slate-100 border-slate-400 ring-2 ring-slate-400/20 shadow-xs' :
          'bg-white border-slate-200 hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Drafts</span>
            <Clock size={12} className="text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-700 mt-1">{draftCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">In preparation</span>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Sent')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
          selectedStatusTab === 'Sent' ?
          'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-xs' :
          'bg-white border-slate-200 hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#004077]">Sent to Client</span>
            <Send size={12} className="text-[#004077]" />
          </div>
          <div className="text-xl font-black text-[#004077] mt-1">{sentCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Awaiting review</span>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Pending')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
          selectedStatusTab === 'Pending' ?
          'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/20 shadow-xs' :
          'bg-white border-slate-200 hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Pending Decision</span>
            <AlertCircle size={12} className="text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-slate-400 block mt-0.5">Commercials open</span>
        </div>

        <div
          onClick={() => setSelectedStatusTab('Approved')}
          className={`p-4 rounded-xl border cursor-pointer transition col-span-2 sm:col-span-1 ${
          selectedStatusTab === 'Approved' ?
          'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs' :
          'bg-white border-slate-200 hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Approved &amp; Won</span>
            <CheckCircle2 size={12} className="text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">{approvedCount}</div>
          <span className="text-[10px] text-emerald-600 block mt-0.5">{formatINR(totalApprovedValue)}</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <label className="quotations-mobile-status">Status<select aria-label="Filter quotation status" value={selectedStatusTab} onChange={e=>setSelectedStatusTab(e.target.value)}>{['All','Draft','Sent','Pending','Approved','Rejected'].map(status=><option key={status} value={status}>{status==='All'?'All quotations':status}</option>)}</select></label>
        {/* Status Pills */}
        <div className="quotations-status-tabs flex items-center space-x-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {['All', 'Draft', 'Sent', 'Pending', 'Approved', 'Rejected'].map((status) =>
          <button
            key={status}
            onClick={() => setSelectedStatusTab(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            selectedStatusTab === status ?
            'bg-[#004077] text-white' :
            'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
            }>
            
              {status}
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search quotations" placeholder="Search quotations..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077]" />
          
        </div>
      </div>

      {/* Quotations Pipeline Table */}
      <div className="quotations-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="quotations-table w-full text-left text-xs">
            <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Quotation # &amp; Subject</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Deliverables &amp; Duration</th>
                <th className="py-3 px-4">Grand Total (Inc GST)</th>
                <th className="py-3 px-4">Valid Until</th>
                <th className="py-3 px-4">Pipeline Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotations.map((q) =>
              <tr key={q.id} className="hover:bg-slate-50/80 transition group">
                  
                  {/* Number & Title */}
                  <td data-label="Quotation" className="py-3.5 px-4">
                    <div className="font-mono font-bold text-[#004077] text-xs group-hover:underline cursor-pointer"
                  onClick={() => {
                    setPreviewQuotation(q);
                    setPageMode('preview');
                  }}>
                    
                      {q.quotation_number}
                    </div>
                    <div className="font-bold text-slate-800 text-xs mt-0.5">{q.title}</div>
                    <span className="text-[10px] text-slate-400">Date: {q.date}</span>
                  </td>

                  {/* Client */}
                  <td data-label="Client" className="py-3.5 px-4">
                    <div className="font-bold text-slate-800 text-xs">{q.client_name}</div>
                    <span className="text-[10px] text-slate-400">{q.client_mobile || q.client_email}</span>
                  </td>

                  {/* Deliverables summary */}
                  <td data-label="Deliverables" className="py-3.5 px-4">
                    <span className="font-semibold text-slate-700 text-xs">
                      {q.items.length} {q.items.length === 1 ? 'service item' : 'service items'}
                    </span>
                    <div className="text-[10px] text-slate-500 truncate max-w-xs">
                      {q.items.map((i) => `${i.service_name} (${i.unit})`).join(', ')}
                    </div>
                  </td>

                  {/* Financial Total */}
                  <td data-label="Total" className="py-3.5 px-4 font-bold text-slate-900 text-xs">
                    {formatINR(q.grand_total)}
                    <span className="text-[10px] text-slate-400 block font-normal">
                      Net: {formatINR(q.subtotal)}
                    </span>
                  </td>

                  {/* Valid Until */}
                  <td data-label="Valid until" className="py-3.5 px-4 text-slate-600 font-mono text-[11px]">
                    {q.valid_until}
                  </td>

                  {/* Pipeline Status */}
                  <td data-label="Status" className="py-3.5 px-4">
                    {getStatusBadge(q.status)}
                  </td>

                  {/* Actions */}
                  <td data-label="Actions" className="py-3.5 px-4 text-right">
                    <div className="quotation-row-actions flex items-center justify-end gap-1.5">
                      <button type="button" className="px-2 py-1.5 bg-slate-100 rounded-lg text-xs" aria-label="Edit quotation" title="Edit quotation" onClick={()=>{setEditingQuotation(q);setFormData({quotation_number:q.quotation_number,client_id:q.client_id,title:q.title,date:q.date,valid_until:q.valid_until,status:q.status,notes:q.notes||'',terms_conditions:q.terms_conditions||'',discount_amount:q.discount_amount,gst_rate:q.gst_rate});setLineItems(q.items.map(i=>({...i})));setCustomFields((q.custom_fields||[]).map(f=>({...f})));setPageMode('create');}}><Pencil size={16} aria-hidden="true" /></button>
                      {/* View & Print Proposal (opens full page) */}
                      <button type="button"
                      onClick={() => {
                        setPreviewQuotation(q);
                        setPageMode('preview');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#004077] hover:text-white text-slate-700 font-bold rounded-lg text-[11px] transition flex items-center space-x-1"
                      aria-label="View quotation" title="View Official Proposal Document">
                      
                        <Eye size={16} aria-hidden="true" />
                        
                      </button>

                      {/* Quick Status Advance */}
                      {q.status === 'Draft' &&
                    <button type="button"
                      onClick={() => handleStatusChange(q, 'Sent')}
                      className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#004077] font-bold rounded-lg text-[11px] transition flex items-center space-x-1"
                      aria-label="Send quotation" title="Mark Sent to Client">
                      
                          <Send size={16} aria-hidden="true" />
                          
                        </button>
                    }

                      {q.status === 'Sent' &&
                    <button
                      onClick={() => handleStatusChange(q, 'Pending')}
                      className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg text-[11px] transition"
                      title="Mark Negotiations Pending">
                      
                          <span>Pending</span>
                        </button>
                    }

                      {q.status !== 'Approved' &&
                    <ActionButton
                      onClick={() => handleStatusChange(q, 'Approved')}
                      className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded-lg text-[11px] transition flex items-center space-x-1 border border-emerald-200"
                      title="Approve &amp; Automatically Generate Invoice">
                      
                          <CheckCircle2 size={12} />
                          <span>Approve &amp; Bill</span>
                        </ActionButton>
                    }

                      {/* Delete */}
                      <button
                      onClick={async () => {try {
                          if (confirm(`Are you sure you want to delete quotation ${q.quotation_number}?`)) {
                            await onDeleteQuotation(q.id);
                          }
                        } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                      className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                      title="Delete Quotation">
                      
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {filteredQuotations.length === 0 &&
              <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileSpreadsheet size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No quotations found in this pipeline view.</p>
                    <p className="text-[11px] mt-1">Click &quot;Prepare New Quotation&quot; above to issue a proposal.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

};
