import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit3,
  Trash2,
  Tag,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  IndianRupee,
  X,
  Sparkles,
  Filter,
  ArrowLeft,
  Check,
  Calendar,
  Zap,
  HelpCircle,
  Clock4 } from
'lucide-react';
import { ServiceCatalog, BillingCycle, Client } from '../types';

type ClientAssignment = { client_id: number; start_date: string; expiry_date: string; auto_renew: boolean };

interface ServicesViewProps {
  services: ServiceCatalog[];
  clients: Client[];
  onOpenClient: (clientId: number) => void;
  onAddService: (newService: Omit<ServiceCatalog, 'id'> & { client_assignment?: ClientAssignment }) => Promise<unknown>;
  onUpdateService: (updatedService: ServiceCatalog) => void;
  onDeleteService: (serviceId: number) => void;
  onNavigateToQuotations?: (prefillServiceId?: number) => void;
}

type PageViewMode = 'list' | 'add' | 'edit';

export const ServicesView: React.FC<ServicesViewProps> = ({
  services,
  clients,
  onOpenClient,
  onAddService,
  onUpdateService,
  onDeleteService,
  onNavigateToQuotations
}) => {
  // Page navigation: NO popups, opens dedicated in-page screens!
  const [pageMode, setPageMode] = useState<PageViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFrequency, setSelectedFrequency] = useState<string>('All');

  // Edit target
  const [editingService, setEditingService] = useState<ServiceCatalog | null>(null);
  const [assignment, setAssignment] = useState<ClientAssignment>({ client_id: 0, start_date: '', expiry_date: '', auto_renew: false });
  const [saving, setSaving] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    service_name: '',
    category: 'Web Development',
    default_rate: 15000,
    billing_frequency: 'Monthly' as BillingCycle,
    custom_duration: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  const categories = ['All', ...Array.from(new Set(services.map((s) => s.category)))];

  // All duration options requested by user:
  // "services also i need option of serivce duration option like montly,quaterly,half yearly, year, coustom"
  const durationOptions: {cycle: BillingCycle;label: string;desc: string;}[] = [
  { cycle: 'Monthly', label: 'Monthly', desc: 'Renews every calendar month' },
  { cycle: 'Quarterly', label: 'Quarterly', desc: 'Every 3 months (Q1-Q4)' },
  { cycle: 'Half-Yearly', label: 'Half-Yearly', desc: 'Every 6 months (Semi-Annual)' },
  { cycle: 'Yearly', label: 'Yearly', desc: 'Every 12 months (Annual AMC)' },
  { cycle: 'Custom', label: 'Custom Duration', desc: 'Configurable timeframe (e.g. 45 Days, 2 Weeks)' },
  { cycle: 'One-Time', label: 'One-Time', desc: 'Fixed delivery milestone' }];


  const filterDurationTabs: ('All' | BillingCycle)[] = [
  'All',
  'Monthly',
  'Quarterly',
  'Half-Yearly',
  'Yearly',
  'Custom',
  'One-Time'];


  const filteredServices = services.filter((service) => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.custom_duration && service.custom_duration.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    const matchesFrequency = selectedFrequency === 'All' || service.billing_frequency === selectedFrequency;
    return matchesSearch && matchesCategory && matchesFrequency;
  });

  const handleOpenAdd = () => {
    setAssignment({ client_id: 0, start_date: new Date().toLocaleDateString('en-CA'), expiry_date: '', auto_renew: false });
    setFormData({
      service_name: '',
      category: 'Web Development',
      default_rate: 15000,
      billing_frequency: 'Monthly',
      custom_duration: '',
      description: '',
      status: 'Active'
    });
    setEditingService(null);
    setPageMode('add');
  };

  const handleOpenEdit = (service: ServiceCatalog) => {
    setEditingService(service);
    setFormData({
      service_name: service.service_name,
      category: service.category,
      default_rate: service.default_rate,
      billing_frequency: service.billing_frequency,
      custom_duration: service.custom_duration || '',
      description: service.description,
      status: service.status || 'Active'
    });
    setPageMode('edit');
  };

  const handleSaveAdd = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (saving) return;
      if (!formData.service_name.trim()) {
        showPopup('Service name is required');
        return;
      }
      if (formData.billing_frequency === 'Custom' && !formData.custom_duration.trim()) {
        showPopup('Please specify the custom duration (e.g., "45 days", "60 Days", "2 Weeks").');
        return;
      }
      if (assignment.client_id && (!assignment.start_date || !assignment.expiry_date || assignment.expiry_date < assignment.start_date)) {
        showPopup('Enter service dates with the end date on or after the start date.');
        return;
      }
      if (assignment.client_id && formData.status !== 'Active') {
        showPopup('Set the catalogue status to Active to assign this service to a client.');
        return;
      }
      setSaving(true);
      await onAddService({
        client_assignment: assignment.client_id ? { ...assignment, auto_renew: formData.billing_frequency !== 'One-Time' && assignment.auto_renew } : undefined,
        service_name: formData.service_name.trim(),
        category: formData.category,
        default_rate: Number(formData.default_rate),
        billing_frequency: formData.billing_frequency,
        custom_duration: formData.billing_frequency === 'Custom' ? formData.custom_duration.trim() : undefined,
        description: formData.description.trim(),
        status: formData.status
      });
      setPageMode('list');
      if (assignment.client_id) onOpenClient(assignment.client_id);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));} finally { setSaving(false); }};

  const handleSaveEdit = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!editingService || !formData.service_name.trim()) return;

      if (formData.billing_frequency === 'Custom' && !formData.custom_duration.trim()) {
        showPopup('Please specify the custom duration (e.g., "45 days", "60 Days", "2 Weeks").');
        return;
      }

      await onUpdateService({
        ...editingService,
        service_name: formData.service_name.trim(),
        category: formData.category,
        default_rate: Number(formData.default_rate),
        billing_frequency: formData.billing_frequency,
        custom_duration: formData.billing_frequency === 'Custom' ? formData.custom_duration.trim() : undefined,
        description: formData.description.trim(),
        status: formData.status
      });
      setEditingService(null);
      setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Summary Metrics
  const totalCatalogValue = services.reduce((acc, s) => acc + s.default_rate, 0);
  const recurringServicesCount = services.filter((s) => s.billing_frequency !== 'One-Time').length;

  /* =========================================================================
   * PAGE 1: ADD SERVICE ENTRY PAGE (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'add') {
    return (
      <div className="services-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Services Catalog
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Add Service</h2>
            <p className="text-xs text-slate-500">Set the service name, price and billing cycle.</p>
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
                const form = document.getElementById('add-service-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              disabled={saving}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>{saving ? 'Saving...' : assignment.client_id ? 'Save Service & View Client Profile' : 'Save Service to Catalog'}</span>
            </ActionButton>
          </div>
        </div>

        {/* Add Service Form Container */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#004077] via-[#005599] to-[#EF7C00]"></div>
          
          <form id="add-service-form" onSubmit={handleSaveAdd} className="p-6 sm:p-8 space-y-8 text-xs">
            <fieldset disabled={saving} className="space-y-8">
            <section className="portal-admin rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
              <h3 className="font-bold text-sm text-[#004077]">Assign to a client</h3>
              <label className="portal-field">Client<select aria-label="Assign to client" value={assignment.client_id} onChange={e => setAssignment({ ...assignment, client_id: Number(e.target.value) })}>
                <option value={0}>Catalogue only - assign later</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name} ({client.client_code})</option>)}
              </select></label>
              <p className="text-xs text-slate-500">Choose a client to show this service in their profile. The rate and billing cycle below will apply to their service.</p>
              {!!assignment.client_id && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="portal-field">Service start date<input type="date" required value={assignment.start_date} onChange={e => setAssignment({ ...assignment, start_date: e.target.value })} /></label>
                <label className="portal-field">Service end date<input type="date" required min={assignment.start_date} value={assignment.expiry_date} onChange={e => setAssignment({ ...assignment, expiry_date: e.target.value })} /></label>
                <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" disabled={formData.billing_frequency === 'One-Time'} checked={formData.billing_frequency !== 'One-Time' && assignment.auto_renew} onChange={e => setAssignment({ ...assignment, auto_renew: e.target.checked })} />Auto-renew this client service</label>
              </div>}
            </section>
            
            {/* Section 1: Basic Information */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Layers size={16} className="text-[#EF7C00]" />
                  <span>1. Service Definition &amp; Categorization</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Service Title / Deliverable Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Enterprise Cloud Infrastructure AMC, UI/UX Design Sprint..."
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                  <p className="text-[10px] text-slate-400 mt-1">Clear, client-facing title appearing on quotations &amp; invoices</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Practice / Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-medium">
                    
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Applications">Mobile Applications</option>
                    <option value="Digital Marketing & SEO">Digital Marketing &amp; SEO</option>
                    <option value="Cloud & DevOps">Cloud &amp; DevOps</option>
                    <option value="Branding & Creative">Branding &amp; Creative</option>
                    <option value="Cybersecurity & Audit">Cybersecurity &amp; Audit</option>
                    <option value="Technical Consulting">Technical Consulting</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Service Duration Options (Monthly, Quarterly, Half-Yearly, Yearly, Custom, One-Time) */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Clock4 size={16} className="text-[#EF7C00]" />
                  <span>2. Service Duration &amp; Billing Cycle</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Choose the contract cadence: Monthly, Quarterly, Half-Yearly, Yearly, or configure a Custom Duration.
                </p>
              </div>

              {/* Duration Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {durationOptions.map((opt) =>
                <label
                  key={opt.cycle}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                  formData.billing_frequency === opt.cycle ?
                  'border-[#004077] bg-blue-50/50 shadow-xs ring-1 ring-[#004077]' :
                  'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                  }>
                  
                    <input
                    type="radio"
                    name="billing_frequency"
                    checked={formData.billing_frequency === opt.cycle}
                    onChange={() => setFormData({ ...formData, billing_frequency: opt.cycle })}
                    className="mt-0.5 text-[#004077] focus:ring-[#004077]" />
                  
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{opt.label}</span>
                        {opt.cycle === 'Custom' &&
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Configurable</span>
                      }
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Custom Duration Input (shown when Custom is selected) */}
              {formData.billing_frequency === 'Custom' &&
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold">
                    <Clock size={15} className="text-amber-700" />
                    <span>Specify Custom Service Duration *</span>
                  </div>
                  <input
                  type="text"
                  required
                  placeholder="e.g. 45 days, 90 days, 2 Weeks, 18 Months..."
                  value={formData.custom_duration}
                  onChange={(e) => setFormData({ ...formData, custom_duration: e.target.value })}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800 text-xs" />
                
                  <p className="text-[10px] text-amber-700">
                    This custom duration label will automatically be appended to client quotations, subscriptions, and tax invoices.
                  </p>
                </div>
              }
            </div>

            {/* Section 3: Pricing & Deliverable Scope */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <IndianRupee size={16} className="text-[#EF7C00]" />
                  <span>3. Pricing Benchmark &amp; Deliverable Scope</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Benchmark Rate (INR ₹) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={formData.default_rate}
                      onChange={(e) => setFormData({ ...formData, default_rate: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Standard list price; custom discounted rates can be tailored per quotation.</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Catalog Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold">
                    
                    <option value="Active">Active (Available for quoting &amp; subscriptions)</option>
                    <option value="Inactive">Inactive (Archived from new quotes)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block font-bold text-slate-700 mb-1.5">Standard Deliverables &amp; Scope Summary</label>
                <textarea
                  rows={3}
                  placeholder="Outline key inclusions, SLA commitments, support response time, and scope boundaries..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] text-slate-800" />
                
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setPageMode('list')}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
                
                Cancel &amp; Return
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-md transition inline-flex items-center space-x-2">
                
                <Check size={15} />
                <span>{saving ? 'Saving...' : assignment.client_id ? 'Save Service & View Client Profile' : 'Save Service to Catalog'}</span>
              </ActionButton>
            </div>
            </fieldset>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 2: EDIT SERVICE ENTRY PAGE (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'edit' && editingService) {
    return (
      <div className="services-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Services Catalog
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">
              Edit Service Entry: <span className="text-[#EF7C00]">{editingService.service_name}</span>
            </h2>
            <p className="text-xs text-slate-500">Update pricing, billing cycle and deliverables.</p>
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
                const form = document.getElementById('edit-service-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Save Service Changes</span>
            </ActionButton>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#004077] via-[#005599] to-[#EF7C00]"></div>
          
          <form id="edit-service-form" onSubmit={handleSaveEdit} className="p-6 sm:p-8 space-y-8 text-xs">
            
            {/* Section 1: Definition */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Layers size={16} className="text-[#EF7C00]" />
                  <span>1. Service Definition &amp; Categorization</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Service Title / Deliverable Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.service_name}
                    onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Practice / Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-medium">
                    
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile Applications">Mobile Applications</option>
                    <option value="Digital Marketing & SEO">Digital Marketing &amp; SEO</option>
                    <option value="Cloud & DevOps">Cloud &amp; DevOps</option>
                    <option value="Branding & Creative">Branding &amp; Creative</option>
                    <option value="Cybersecurity & Audit">Cybersecurity &amp; Audit</option>
                    <option value="Technical Consulting">Technical Consulting</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: Service Duration Options */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Clock4 size={16} className="text-[#EF7C00]" />
                  <span>2. Service Duration &amp; Billing Cycle</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select between Monthly, Quarterly, Half-Yearly, Yearly, or Custom duration options.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {durationOptions.map((opt) =>
                <label
                  key={opt.cycle}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start space-x-3 ${
                  formData.billing_frequency === opt.cycle ?
                  'border-[#004077] bg-blue-50/50 shadow-xs ring-1 ring-[#004077]' :
                  'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                  }>
                  
                    <input
                    type="radio"
                    name="edit_billing_frequency"
                    checked={formData.billing_frequency === opt.cycle}
                    onChange={() => setFormData({ ...formData, billing_frequency: opt.cycle })}
                    className="mt-0.5 text-[#004077] focus:ring-[#004077]" />
                  
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                        <span>{opt.label}</span>
                        {opt.cycle === 'Custom' &&
                      <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Configurable</span>
                      }
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Custom Duration Input */}
              {formData.billing_frequency === 'Custom' &&
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center space-x-2 text-amber-900 font-bold">
                    <Clock size={15} className="text-amber-700" />
                    <span>Specify Custom Service Duration *</span>
                  </div>
                  <input
                  type="text"
                  required
                  placeholder="e.g. 45 days, 90 days, 2 Weeks, 18 Months..."
                  value={formData.custom_duration}
                  onChange={(e) => setFormData({ ...formData, custom_duration: e.target.value })}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 font-semibold text-slate-800 text-xs" />
                
                  <p className="text-[10px] text-amber-700">
                    This custom duration label will automatically be appended to client quotations, subscriptions, and tax invoices.
                  </p>
                </div>
              }
            </div>

            {/* Section 3: Pricing Benchmark & Deliverable Scope */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <IndianRupee size={16} className="text-[#EF7C00]" />
                  <span>3. Pricing Benchmark &amp; Deliverable Scope</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Default Benchmark Rate (INR ₹) *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-slate-400 font-bold">₹</span>
                    <input
                      type="number"
                      required
                      min={0}
                      step={0.01}
                      value={formData.default_rate}
                      onChange={(e) => setFormData({ ...formData, default_rate: Number(e.target.value) })}
                      className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-[#004077]" />
                    
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Catalog Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold">
                    
                    <option value="Active">Active (Available for quoting &amp; subscriptions)</option>
                    <option value="Inactive">Inactive (Archived from new quotes)</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block font-bold text-slate-700 mb-1.5">Standard Deliverables &amp; Scope Summary</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] text-slate-800" />
                
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setPageMode('list')}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition">
                
                Cancel &amp; Return
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-md transition inline-flex items-center space-x-2">
                
                <Check size={15} />
                <span>Save Service Changes</span>
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 0: MASTER SERVICES CATALOG DIRECTORY (Default View)
   * ========================================================================= */
  return (
    <div className="services-page space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-[#004077] flex items-center justify-center font-bold">
              <Layers size={18} />
            </span>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Services &amp; Pricing</h2>
          </div>
          
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          {/* Add Service Button: Opens full page without popup */}
          <ActionButton
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-2">
            
            <Plus size={15} />
            <span>Add New Service Entry</span>
          </ActionButton>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="services-summary grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Services</span>
          <div className="text-2xl font-black text-[#004077] mt-1">{services.length}</div>
          <span className="text-[10px] text-slate-500">Across {categories.length - 1} categories</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Monthly / Retainers</span>
          <div className="text-2xl font-black text-[#EF7C00] mt-1">
            {services.filter((s) => s.billing_frequency === 'Monthly').length}
          </div>
          <span className="text-[10px] text-slate-500">Regular monthly billing</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Quarterly / Annual</span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {services.filter((s) => s.billing_frequency === 'Quarterly' || s.billing_frequency === 'Half-Yearly' || s.billing_frequency === 'Yearly').length}
          </div>
          <span className="text-[10px] text-slate-500">Scheduled AMC cycles</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Custom &amp; One-Time</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            {services.filter((s) => s.billing_frequency === 'Custom' || s.billing_frequency === 'One-Time').length}
          </div>
          <span className="text-[10px] text-slate-500">Custom sprints &amp; projects</span>
        </div>
      </div>

      {/* Filter Tabs: Duration Cadence Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          
          <div className="services-mobile-filters">
            <label>Duration<select aria-label="Filter service duration" value={selectedFrequency} onChange={e=>setSelectedFrequency(e.target.value)}>{filterDurationTabs.map(freq=><option key={freq} value={freq}>{freq==='All'?'All durations':freq}</option>)}</select></label>
            <label>Category<select aria-label="Filter service category" value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}>{categories.map(category=><option key={category} value={category}>{category==='All'?'All categories':category}</option>)}</select></label>
          </div>
          {/* Duration Tabs */}
          <div className="services-duration-tabs flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 text-[11px] font-bold mr-1">Duration:</span>
            {filterDurationTabs.map((freq) =>
            <button
              key={freq}
              onClick={() => setSelectedFrequency(freq)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              selectedFrequency === freq ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
              }>
              
                {freq === 'All' ? `All Durations (${services.length})` : freq}
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search services" placeholder="Search services..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077]" />
            
          </div>
        </div>

        {/* Category Pills */}
        <div className="services-category-tabs flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-slate-100 scrollbar-none">
          <span className="text-slate-400 text-[11px] font-bold mr-1 shrink-0">Category:</span>
          {categories.map((cat) =>
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition whitespace-nowrap ${
            selectedCategory === cat ?
            'bg-[#EF7C00] text-white font-bold' :
            'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
            }>
            
              {cat}
            </button>
          )}
        </div>
      </div>

      {/* Services Table */}
      <div className="services-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="services-table w-full text-left text-xs">
            <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Service Name &amp; Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Service Duration</th>
                <th className="py-3 px-4">Benchmark Rate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredServices.map((service) => {
                const isCustom = service.billing_frequency === 'Custom';
                return (
                  <tr key={service.id} className="hover:bg-slate-50/80 transition">
                    
                    {/* Name & Scope */}
                    <td data-label="Service" className="py-3.5 px-4 max-w-sm">
                      <div className="font-bold text-slate-800 text-sm">{service.service_name}</div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{service.description}</p>
                    </td>

                    {/* Category */}
                    <td data-label="Category" className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center space-x-1">
                        <Tag size={10} className="text-[#004077]" />
                        <span>{service.category}</span>
                      </span>
                    </td>

                    {/* Duration / Frequency Badge */}
                    <td data-label="Duration" className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold inline-flex items-center space-x-1.5 ${
                      service.billing_frequency === 'Monthly' ?
                      'bg-blue-50 text-[#004077] border border-blue-200' :
                      service.billing_frequency === 'Quarterly' ?
                      'bg-indigo-50 text-indigo-800 border border-indigo-200' :
                      service.billing_frequency === 'Half-Yearly' ?
                      'bg-purple-50 text-purple-800 border border-purple-200' :
                      service.billing_frequency === 'Yearly' ?
                      'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      isCustom ?
                      'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs' :
                      'bg-slate-100 text-slate-700 border border-slate-200'}`
                      }>
                        <Clock size={11} />
                        <span>
                          {isCustom && service.custom_duration ? `Custom (${service.custom_duration})` : service.billing_frequency}
                        </span>
                      </span>
                    </td>

                    {/* Benchmark Rate */}
                    <td data-label="Rate" className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                      {formatINR(service.default_rate)}
                      <span className="text-[10px] font-normal text-slate-400 block">
                        {service.billing_frequency === 'One-Time' ?
                        'flat project' :
                        isCustom && service.custom_duration ?
                        `per ${service.custom_duration}` :
                        `per ${service.billing_frequency.toLowerCase()}`}
                      </span>
                    </td>

                    {/* Status */}
                    <td data-label="Status" className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (service.status || 'Active') === 'Active' ?
                      'bg-emerald-100 text-emerald-800' :
                      'bg-slate-100 text-slate-600'}`
                      }>
                        <CheckCircle2 size={10} className="mr-1" />
                        {service.status || 'Active'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td data-label="Actions" className="py-3.5 px-4 text-right">
                      <div className="service-row-actions flex items-center justify-end gap-1.5">
                        {onNavigateToQuotations &&
                        <ActionButton
                          onClick={() => onNavigateToQuotations(service.id)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-[#004077] text-[#004077] hover:text-white font-bold rounded-lg text-[11px] transition flex items-center space-x-1"
                          title="Quote this service in a new proposal">
                          
                            <FileSpreadsheet size={12} />
                            <span className="hidden sm:inline">Quote</span>
                          </ActionButton>
                        }
                        {/* Edit Button: opens dedicated full page */}
                        <button
                          onClick={() => handleOpenEdit(service)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                          title="Edit Service Entry">
                          
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={async () => {try {
                              if (confirm(`Are you sure you want to remove "${service.service_name}" from the catalog?`)) {
                                await onDeleteService(service.id);
                              }
                            } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                          className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition"
                          title="Delete Service">
                          
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>);

              })}
              {filteredServices.length === 0 &&
              <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Layers size={28} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No services match your search or duration filter.</p>
                    <p className="text-[11px] mt-1">Click &quot;Add New Service Entry&quot; above to register a new service.</p>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

};
