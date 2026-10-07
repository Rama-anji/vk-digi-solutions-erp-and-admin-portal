import { UpdateRenewalPayment } from './RenewalPaymentStatus';
import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import { ClientServices } from './ClientServices';
import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building,
  Mail,
  Phone,
  MapPin,
  Layers,
  Receipt,
  ExternalLink,
  Check,
  X,
  Download,
  Upload,
  FileSpreadsheet,
  ChevronDown,
  Edit3,
  Trash2,
  Calendar,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Sparkles,
  Info,
  HelpCircle,
  Briefcase } from
'lucide-react';
import { Client, ClientSubscription, Invoice, ClientType, ServiceCatalog, Quotation, Project, Task, StoredClientFile } from '../types';
import { exportClientsToCSV, parseClientsFromCSV, getSampleClientsCSV, triggerCSVDownload } from '../utils/csvUtils';
import { FolderClosed } from 'lucide-react';

interface ClientsViewProps {
  onUpdateRenewalPayment: UpdateRenewalPayment;
  initialClientId?: number | null;
  openCreate?: boolean;
  onClearIntent?: () => void;
  clients: Client[];
  subscriptions: ClientSubscription[];
  services: ServiceCatalog[];
  onUpdateServiceStatus: (id:number,status:ClientSubscription['status']) => Promise<unknown>;
  invoices: Invoice[];
  quotations: Quotation[];
  projects: Project[];
  tasks: Task[];
  files: StoredClientFile[];
  onOpenQuotation: (number: string, clientId: number) => void;
  onOpenInvoice: (number: string, clientId: number) => void;
  onAddClient: (newClient: Omit<Client, 'id' | 'created_at'>) => void;
  onUpdateClient?: (updatedClient: Client) => void;
  onImportClients?: (newClients: Omit<Client, 'id' | 'created_at'>[]) => void;
  onToggleAutoRenew?: (subId: number, autoRenew: boolean) => void;
  onPrepareQuotation?: (clientId: number) => void;
  onOpenClientFolder?: (clientId: number) => void;
}

type PageViewMode = 'list' | 'add' | 'edit' | 'details' | 'import';

export const ClientsView: React.FC<ClientsViewProps> = ({
  initialClientId, openCreate, onClearIntent, onUpdateRenewalPayment,
  clients,
  subscriptions,
  services,
  onUpdateServiceStatus,
  invoices, quotations, projects, tasks, files, onOpenQuotation, onOpenInvoice,
  onAddClient,
  onUpdateClient,
  onImportClients,
  onToggleAutoRenew,
  onPrepareQuotation,
  onOpenClientFolder
}) => {
  // Page mode: NO popups, opens dedicated in-page views!
  const [pageMode, setPageMode] = useState<PageViewMode>('list');

  // Filter & Search states
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Selected client for details or editing
  const [selectedClientForDetails, setSelectedClientForDetails] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Custom fields state for add/edit client
  const [addCustomFields, setAddCustomFields] = useState<{id: string;name: string;value: string;}[]>([]);
  const [editCustomFields, setEditCustomFields] = useState<{id: string;name: string;value: string;}[]>([]);

  // CSV Import in-page state
  const [csvText, setCsvText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseClientsFromCSV> | null>(null);

  // New Client Form State
  const [formData, setFormData] = useState({
    client_code: `VKD-CLI-${Math.max(1000,...clients.map(c=>Number(c.client_code.match(/^VKD-CLI-(\d+)$/)?.[1] || 0))) + 1}`,
    name: '',
    client_type: 'Corporate' as ClientType,
    contact_person: '',
    email: '',
    mobile: '',
    city: 'Mumbai',
    address: '',
    source: 'Direct Referral',
    status: 'Active' as 'Active' | 'Inactive',
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Edit Client Form State
  const [editFormData, setEditFormData] = useState({
    id: 0,
    client_code: '',
    name: '',
    client_type: 'Corporate' as ClientType,
    contact_person: '',
    email: '',
    mobile: '',
    city: '',
    address: '',
    source: '',
    status: 'Active' as 'Active' | 'Inactive',
    start_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const activeClientsCount = clients.filter((c) => c.status === 'Active').length;
  const inactiveClientsCount = clients.filter((c) => c.status === 'Inactive').length;

  const filteredClients = clients.filter((c) => {
    const matchesType = filterType === 'All' || c.client_type === filterType;
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.client_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  const getClientFinancials = (clientId: number) => {
    const clientInvoices = invoices.filter((i) => i.client_id === clientId);
    const totalInvoiced = clientInvoices.reduce((acc, i) => acc + i.grand_total, 0);
    const totalPaid = clientInvoices.reduce((acc, i) => acc + (i.amount_received ?? (i.payment_status==='Paid'?i.grand_total:0)), 0);
    return {
      invoiced: totalInvoiced,
      paid: totalPaid,
      balance: Math.max(0, totalInvoiced - totalPaid)
    };
  };

  const handleOpenAdd = () => {
    setFormData({
      client_code: `VKD-CLI-${Math.max(1000,...clients.map(c=>Number(c.client_code.match(/^VKD-CLI-(\d+)$/)?.[1] || 0))) + 1}`,
      name: '',
      client_type: 'Corporate',
      contact_person: '',
      email: '',
      mobile: '',
      city: 'Mumbai',
      address: '',
      source: 'Direct Referral',
      status: 'Active',
      start_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setAddCustomFields([]);
    setPageMode('add');
  };

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setEditFormData({
      id: client.id,
      client_code: client.client_code,
      name: client.name,
      client_type: client.client_type,
      contact_person: client.contact_person,
      email: client.email,
      mobile: client.mobile,
      city: client.city,
      address: client.address,
      source: client.source,
      status: client.status === 'Inactive' ? 'Inactive' : 'Active',
      start_date: client.start_date || client.created_at || new Date().toISOString().split('T')[0],
      notes: client.notes
    });
    setEditCustomFields(client.custom_fields || []);
    setPageMode('edit');
  };

  React.useEffect(() => {if (initialClientId) {const c = clients.find((c) => c.id === initialClientId);if (c) {setSelectedClientForDetails(c);setPageMode('details');}}}, [initialClientId]);
  React.useEffect(() => {if (openCreate) {handleOpenAdd();onClearIntent?.();}}, [openCreate]);
  const handleOpenDetails = (client: Client) => {
    setSelectedClientForDetails(client);
    setPageMode('details');
  };

  const handleToggleClientStatus = async (client: Client, e?: React.MouseEvent) => {try {
      if (e) e.stopPropagation();
      const newStatus: 'Active' | 'Inactive' = client.status === 'Active' ? 'Inactive' : 'Active';
      const updated: Client = {
        ...client,
        status: newStatus
      };
      if (onUpdateClient) {
        await onUpdateClient(updated);
      }
      if (selectedClientForDetails?.id === client.id) {
        setSelectedClientForDetails(updated);
      }
      if (editingClient?.id === client.id) {
        setEditingClient(updated);
        setEditFormData((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleSaveEditClient = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!editFormData.name || !editFormData.email || !editFormData.mobile) {
        showPopup('Please fill all mandatory fields: Company Name, Email, and Mobile.');
        return;
      }
      const updated: Client = {
        id: editFormData.id,
        client_code: editFormData.client_code,
        name: editFormData.name,
        client_type: editFormData.client_type,
        contact_person: editFormData.contact_person,
        email: editFormData.email,
        mobile: editFormData.mobile,
        city: editFormData.city,
        address: editFormData.address,
        source: editFormData.source,
        status: editFormData.status,
        start_date: editFormData.start_date,
        notes: editFormData.notes,
        created_at: editingClient?.created_at || new Date().toISOString().split('T')[0],
        custom_fields: editCustomFields.filter((f) => f.name.trim() !== '')
      };

      if (onUpdateClient) {
        await onUpdateClient(updated);
      }
      if (selectedClientForDetails?.id === updated.id) {
        setSelectedClientForDetails(updated);
      }
      setEditingClient(null);
      setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleSubmitNewClient = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!formData.name || !formData.email || !formData.mobile) {
        showPopup('Please fill all mandatory fields: Company Name, Email, and Mobile.');
        return;
      }
      await onAddClient({
        ...formData,
        custom_fields: addCustomFields.filter((f) => f.name.trim() !== '')
      });
      setAddCustomFields([]);
      setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleProcessCsv = (content: string, name?: string) => {
    setCsvText(content);
    if (name) setImportFileName(name);
    const parsed = parseClientsFromCSV(content, clients);
    setParseResult(parsed);
  };

  const handleConfirmImport = async () => {try {
      if (!parseResult || parseResult.clients.length === 0) return;
      if (onImportClients) {
        await onImportClients(parseResult.clients);
      }
      setParseResult(null);
      setCsvText('');
      setImportFileName('');
      setPageMode('list');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  /* =========================================================================
   * PAGE 1: ADD CLIENT PAGE (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'add') {
    return (
      <div className="clients-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Clients Directory
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Add Client</h2>
            <p className="text-xs text-slate-500">
              Create a new client profile with contract start date, operational status, and billing details.
            </p>
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
              onClick={(e) => {
                const form = document.getElementById('add-client-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Save &amp; Register Client</span>
            </ActionButton>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#004077] via-[#005599] to-[#EF7C00]"></div>
          
          <form id="add-client-form" onSubmit={handleSubmitNewClient} className="p-6 sm:p-8 space-y-8 text-xs">
            
            {/* Section 1: Identification & Status */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Building size={16} className="text-[#EF7C00]" />
                  <span>1. Enterprise Identity &amp; Lifecycle</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Client Code</label>
                  <input
                    type="text"
                    required
                    value={formData.client_code}
                    onChange={(e) => setFormData({ ...formData, client_code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-700 font-bold" />
                  
                  <p className="text-[10px] text-slate-400 mt-1">Unique ERP identifier for billing &amp; ledger</p>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Company / Organization Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Global Logistics Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Client Type</label>
                  <select
                    value={formData.client_type}
                    onChange={(e) => setFormData({ ...formData, client_type: e.target.value as ClientType })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-medium">
                    
                    <option value="Corporate">Corporate</option>
                    <option value="Government">Government</option>
                    <option value="Retail">Retail</option>
                    <option value="Startup">Startup</option>
                    <option value="NGO">NGO</option>
                  </select>
                </div>

                {/* Contract / Onboarding Start Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Calendar size={13} className="text-[#EF7C00]" />
                      <span>Start Date (Contract / Onboarding) *</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                  <p className="text-[10px] text-slate-400 mt-1">Official agency contract onboarding start date</p>
                </div>

                {/* Operational Status Toggle */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Account Status *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                      formData.status === 'Active' ?
                      'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-xs' :
                      'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                      }>
                      
                      <input
                        type="radio"
                        name="client_status"
                        checked={formData.status === 'Active'}
                        onChange={() => setFormData({ ...formData, status: 'Active' })}
                        className="sr-only" />
                      
                      <div className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center mr-2.5">
                        {formData.status === 'Active' && <div className="w-2 h-2 rounded-full bg-emerald-600"></div>}
                      </div>
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <UserCheck size={14} className="text-emerald-600" />
                          <span>Active Client</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Live account with active subscriptions &amp; billing</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                      formData.status === 'Inactive' ?
                      'border-slate-400 bg-slate-100 text-slate-900 shadow-xs' :
                      'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                      }>
                      
                      <input
                        type="radio"
                        name="client_status"
                        checked={formData.status === 'Inactive'}
                        onChange={() => setFormData({ ...formData, status: 'Inactive' })}
                        className="sr-only" />
                      
                      <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center mr-2.5">
                        {formData.status === 'Inactive' && <div className="w-2 h-2 rounded-full bg-slate-600"></div>}
                      </div>
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <UserX size={14} className="text-slate-500" />
                          <span>Inactive Client</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Paused, archived, or completed contract engagement</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Person & Details */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Mail size={16} className="text-[#EF7C00]" />
                  <span>2. Contact Personnel &amp; Communications</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Contact Person *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Malhotra"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Official Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. billing@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Mobile / Telephone *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +91 98201 44521"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">City / Region</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Complete Billing Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Level 4, Trade Centre, Bandra Kurla Complex"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Source & Notes */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Briefcase size={16} className="text-[#EF7C00]" />
                  <span>3. Commercial Notes &amp; Acquisition</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Acquisition / Referral Source</label>
                  <input
                    type="text"
                    placeholder="e.g. LinkedIn Outreach, Tender Bid, Website Lead"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Internal Account Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Important client nuances, NDA requirements, billing instructions..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>
              </div>
            </div>

            {/* Section 4: Dynamic Custom Fields */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                    <Sparkles size={16} className="text-[#EF7C00]" />
                    <span>4. Custom Metadata Fields</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Add dynamic corporate attributes like GSTIN, PAN, Dedicated PM, etc.</p>
                </div>
                <ActionButton
                  type="button"
                  onClick={() => {
                    setAddCustomFields([
                    ...addCustomFields,
                    { id: `cf-${Date.now()}`, name: '', value: '' }]
                    );
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs inline-flex items-center space-x-1 transition">
                  
                  <Plus size={13} />
                  <span>Add Field</span>
                </ActionButton>
              </div>

              {addCustomFields.length === 0 ?
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  No custom attributes added yet. Click &quot;Add Field&quot; above to attach GSTIN, Account Executive, or SLA Tier.
                </div> :

              <div className="space-y-3">
                  {addCustomFields.map((field, idx) =>
                <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="w-1/3">
                        <input
                      type="text"
                      placeholder="Field Name (e.g. GSTIN)"
                      value={field.name}
                      onChange={(e) => {
                        const updated = [...addCustomFields];
                        updated[idx].name = e.target.value;
                        setAddCustomFields(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium" />
                    
                      </div>
                      <div className="flex-1">
                        <input
                      type="text"
                      placeholder="Value (e.g. 27AAAAA0000A1Z5)"
                      value={field.value}
                      onChange={(e) => {
                        const updated = [...addCustomFields];
                        updated[idx].value = e.target.value;
                        setAddCustomFields(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium" />
                    
                      </div>
                      <button
                    type="button"
                    onClick={() => {
                      setAddCustomFields(addCustomFields.filter((_, i) => i !== idx));
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                    
                        <Trash2 size={15} />
                      </button>
                    </div>
                )}
                </div>
              }
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
                <span>Save &amp; Register Client</span>
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 2: EDIT CLIENT PAGE (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'edit' && editingClient) {
    return (
      <div className="clients-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Clients Directory
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">
              Edit Client Profile: <span className="text-[#EF7C00]">{editingClient.name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              Update contract start date, operational status (Active / Inactive), points of contact, and custom attributes.
            </p>
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
              onClick={(e) => {
                const form = document.getElementById('edit-client-form') as HTMLFormElement;
                if (form) form.requestSubmit();
              }}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Save Changes</span>
            </ActionButton>
          </div>
        </div>

        {/* Edit Form */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#004077] via-[#005599] to-[#EF7C00]"></div>
          
          <form id="edit-client-form" onSubmit={handleSaveEditClient} className="p-6 sm:p-8 space-y-8 text-xs">
            
            {/* Section 1: Identification & Status */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Building size={16} className="text-[#EF7C00]" />
                  <span>1. Enterprise Identity &amp; Lifecycle</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Client Code</label>
                  <input
                    type="text"
                    required
                    value={editFormData.client_code}
                    onChange={(e) => setEditFormData({ ...editFormData, client_code: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-700 font-bold" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Company / Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Client Type</label>
                  <select
                    value={editFormData.client_type}
                    onChange={(e) => setEditFormData({ ...editFormData, client_type: e.target.value as ClientType })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-medium">
                    
                    <option value="Corporate">Corporate</option>
                    <option value="Government">Government</option>
                    <option value="Retail">Retail</option>
                    <option value="Startup">Startup</option>
                    <option value="NGO">NGO</option>
                  </select>
                </div>

                {/* Contract Start Date */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Calendar size={13} className="text-[#EF7C00]" />
                      <span>Start Date (Contract / Onboarding) *</span>
                    </span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.start_date}
                    onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077] font-semibold text-slate-800" />
                  
                </div>

                {/* Status Toggle Radio */}
                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Account Status *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                      editFormData.status === 'Active' ?
                      'border-emerald-500 bg-emerald-50/50 text-emerald-900 shadow-xs' :
                      'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                      }>
                      
                      <input
                        type="radio"
                        name="edit_client_status"
                        checked={editFormData.status === 'Active'}
                        onChange={() => setEditFormData({ ...editFormData, status: 'Active' })}
                        className="sr-only" />
                      
                      <div className="w-4 h-4 rounded-full border border-emerald-600 flex items-center justify-center mr-2.5">
                        {editFormData.status === 'Active' && <div className="w-2 h-2 rounded-full bg-emerald-600"></div>}
                      </div>
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <UserCheck size={14} className="text-emerald-600" />
                          <span>Active Client</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Live account with active subscriptions &amp; billing</p>
                      </div>
                    </label>

                    <label
                      className={`flex items-center p-3 rounded-xl border cursor-pointer transition ${
                      editFormData.status === 'Inactive' ?
                      'border-slate-400 bg-slate-100 text-slate-900 shadow-xs' :
                      'border-slate-200 hover:bg-slate-50 text-slate-600'}`
                      }>
                      
                      <input
                        type="radio"
                        name="edit_client_status"
                        checked={editFormData.status === 'Inactive'}
                        onChange={() => setEditFormData({ ...editFormData, status: 'Inactive' })}
                        className="sr-only" />
                      
                      <div className="w-4 h-4 rounded-full border border-slate-500 flex items-center justify-center mr-2.5">
                        {editFormData.status === 'Inactive' && <div className="w-2 h-2 rounded-full bg-slate-600"></div>}
                      </div>
                      <div>
                        <div className="font-bold flex items-center space-x-1.5">
                          <UserX size={14} className="text-slate-500" />
                          <span>Inactive Client</span>
                        </div>
                        <p className="text-[10px] text-slate-500">Paused, archived, or completed contract engagement</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Contact Person & Details */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Mail size={16} className="text-[#EF7C00]" />
                  <span>2. Contact Personnel &amp; Communications</span>
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.contact_person}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_person: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Official Email *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Mobile / Telephone *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">City / Region</label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">Complete Billing Address</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>
              </div>
            </div>

            {/* Section 3: Commercial Source & Notes */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4">
                <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                  <Briefcase size={16} className="text-[#EF7C00]" />
                  <span>3. Commercial Notes &amp; Acquisition</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Acquisition Source</label>
                  <input
                    type="text"
                    value={editFormData.source}
                    onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Internal Account Notes</label>
                  <textarea
                    rows={2}
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
                  
                </div>
              </div>
            </div>

            {/* Section 4: Dynamic Custom Fields */}
            <div>
              <div className="border-b border-slate-100 pb-2 mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                    <Sparkles size={16} className="text-[#EF7C00]" />
                    <span>4. Custom Metadata Fields</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Add dynamic corporate attributes like GSTIN, PAN, Account Executive, etc.</p>
                </div>
                <ActionButton
                  type="button"
                  onClick={() => {
                    setEditCustomFields([
                    ...editCustomFields,
                    { id: `cf-${Date.now()}`, name: '', value: '' }]
                    );
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs inline-flex items-center space-x-1 transition">
                  
                  <Plus size={13} />
                  <span>Add Field</span>
                </ActionButton>
              </div>

              {editCustomFields.length === 0 ?
              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                  No custom attributes configured for this client.
                </div> :

              <div className="space-y-3">
                  {editCustomFields.map((field, idx) =>
                <div key={field.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="w-1/3">
                        <input
                      type="text"
                      placeholder="Field Name (e.g. GSTIN)"
                      value={field.name}
                      onChange={(e) => {
                        const updated = [...editCustomFields];
                        updated[idx].name = e.target.value;
                        setEditCustomFields(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium" />
                    
                      </div>
                      <div className="flex-1">
                        <input
                      type="text"
                      placeholder="Value"
                      value={field.value}
                      onChange={(e) => {
                        const updated = [...editCustomFields];
                        updated[idx].value = e.target.value;
                        setEditCustomFields(updated);
                      }}
                      className="w-full p-2 bg-white border border-slate-300 rounded-lg font-medium" />
                    
                      </div>
                      <button
                    type="button"
                    onClick={() => {
                      setEditCustomFields(editCustomFields.filter((_, i) => i !== idx));
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                    
                        <Trash2 size={15} />
                      </button>
                    </div>
                )}
                </div>
              }
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
                <span>Save Profile Changes</span>
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 3: CLIENT PROFILE & COMMERCIAL LEDGER (Dedicated Full Page, No Modal)
   * ========================================================================= */
  if (pageMode === 'details' && selectedClientForDetails) {
    const fin = getClientFinancials(selectedClientForDetails.id);
    const clientSubs = subscriptions.filter((s) => s.client_id === selectedClientForDetails.id);
    const clientInvs = invoices.filter((i) => i.client_id === selectedClientForDetails.id);
    const clientQuotes = quotations.filter(q => q.client_id === selectedClientForDetails.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    const clientProjects = projects.filter(p => p.client_id === selectedClientForDetails.id);
    const projectIds = new Set(clientProjects.map(p => p.id));
    const clientTasks = tasks.filter(t => t.client_id === selectedClientForDetails.id || (t.client_id == null && projectIds.has(t.project_id)));
    const clientFiles = files.filter(f => f.client_id === selectedClientForDetails.id);

    return (
      <div className="client-profile clients-page space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Clients Directory
            </ActionButton>
            <div className="flex items-center space-x-3">
              <h2 className="text-2xl font-black text-[#004077] tracking-tight">{selectedClientForDetails.name}</h2>
              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {selectedClientForDetails.client_code}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              selectedClientForDetails.status === 'Active' ?
              'bg-emerald-100 text-emerald-800' :
              'bg-slate-200 text-slate-700'}`
              }>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                selectedClientForDetails.status === 'Active' ? 'bg-emerald-600' : 'bg-slate-500'}`
                }></span>
                {selectedClientForDetails.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center space-x-3">
              <span>Type: <strong>{selectedClientForDetails.client_type}</strong></span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <Calendar size={13} className="text-[#EF7C00]" />
                <span>Start Date: <strong>{selectedClientForDetails.start_date || selectedClientForDetails.created_at}</strong></span>
              </span>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenClientFolder &&
            <button
              onClick={() => onOpenClientFolder(selectedClientForDetails.id)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition inline-flex items-center space-x-1.5 shadow-2xs"
              title="View files, quotations, invoices & interactive tables for this client">
              
                <FolderClosed size={14} className="text-[#004077]" />
                <span>Files &amp; Drive ({clientFiles.length})</span>
              </button>
            }

            {onPrepareQuotation &&
            <ActionButton
              onClick={() => onPrepareQuotation(selectedClientForDetails.id)}
              className="px-4 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition inline-flex items-center space-x-1.5"
              title="Prepare a commercial quotation for this client">
              
                <FileSpreadsheet size={14} />
                <span>Prepare Quotation</span>
              </ActionButton>
            }

            <ActionButton
              onClick={() => handleToggleClientStatus(selectedClientForDetails)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition inline-flex items-center space-x-1.5 ${
              selectedClientForDetails.status === 'Active' ?
              'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100' :
              'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`
              }>
              
              {selectedClientForDetails.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
              <span>{selectedClientForDetails.status === 'Active' ? 'Set as Inactive' : 'Set as Active'}</span>
            </ActionButton>

            <ActionButton
              onClick={() => handleOpenEdit(selectedClientForDetails)}
              className="px-4 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition inline-flex items-center space-x-1.5">
              
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </ActionButton>
          </div>
        </div>

        {/* Financial & Operational KPI Cards */}
        <div className="clients-summary grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Contract Start Date</div>
            <div className="text-lg font-black text-slate-800 flex items-center space-x-1.5">
              <Calendar size={18} className="text-[#EF7C00]" />
              <span>{selectedClientForDetails.start_date || selectedClientForDetails.created_at}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Client onboarded in agency ERP</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Invoiced</div>
            <div className="text-xl font-black text-[#004077]">₹ {fin.invoiced.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-slate-500 mt-1">{clientInvs.length} invoices generated</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Payments Collected</div>
            <div className="text-xl font-black text-emerald-600">₹ {fin.paid.toLocaleString('en-IN')}</div>
            <div className="text-[11px] text-emerald-700 font-semibold mt-1">Settled in bank account</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Due Outstanding</div>
            <div className={`text-xl font-black ${fin.balance > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              ₹ {fin.balance.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {fin.balance > 0 ? 'Payment reminder pending' : 'Zero balance ledger'}
            </div>
          </div>
        </div>

        {/* Profile Details & Contacts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider border-b border-slate-100 pb-2">
              Communications &amp; Location
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact Person</span>
                <span className="font-bold text-slate-800 text-sm">{selectedClientForDetails.contact_person}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Official Email</span>
                <a href={`mailto:${selectedClientForDetails.email}`} className="font-semibold text-[#004077] hover:underline flex items-center space-x-1">
                  <Mail size={12} />
                  <span>{selectedClientForDetails.email}</span>
                </a>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mobile Phone</span>
                <span className="font-semibold text-slate-700 flex items-center space-x-1">
                  <Phone size={12} />
                  <span>{selectedClientForDetails.mobile}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Location &amp; Address</span>
                <span className="text-slate-700 font-medium">{selectedClientForDetails.address || 'No street address recorded'}, {selectedClientForDetails.city}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Lead Source</span>
                <span className="text-slate-700 font-medium">{selectedClientForDetails.source || 'Direct'}</span>
              </div>
              {selectedClientForDetails.notes &&
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Account Notes</span>
                  <p className="text-slate-600 text-xs italic">{selectedClientForDetails.notes}</p>
                </div>
              }
            </div>

            {/* Custom attributes */}
            {selectedClientForDetails.custom_fields && selectedClientForDetails.custom_fields.length > 0 &&
            <div className="pt-3 border-t border-slate-100">
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-2">Custom Metadata</span>
                <div className="space-y-1.5">
                  {selectedClientForDetails.custom_fields.map((f, i) =>
                <div key={i} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                      <span className="font-bold text-slate-600">{f.name}:</span>
                      <span className="font-mono text-slate-800">{f.value}</span>
                    </div>
                )}
                </div>
              </div>
            }
          </div>

          {/* Subscriptions List */}
          <div className="min-w-0 lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider flex items-center space-x-2">
                <Layers size={16} className="text-[#EF7C00]" />
                <span>Client Services ({clientSubs.length})</span>
              </h3>
            </div>

            <ClientServices key={selectedClientForDetails.id} subscriptions={clientSubs} services={services} onUpdate={onUpdateServiceStatus} onUpdateRenewalPayment={onUpdateRenewalPayment}/>

            <section aria-label="Client quotations" className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider">Quotations ({clientQuotes.length})</h3>
              {clientQuotes.length === 0 ? <p className="p-4 bg-slate-50 rounded-xl text-slate-500 text-xs">No quotations prepared for this client.</p> :
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500"><tr>{['Quotation / Title', 'Date', 'Valid Until', 'Total', 'Status', 'Invoice'].map(label => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
                    <tbody className="divide-y divide-slate-100">{clientQuotes.map(q => <tr key={q.id}>
                      <td className="p-3"><button className="font-bold text-[#004077] hover:underline" onClick={() => onOpenQuotation(q.quotation_number, selectedClientForDetails.id)}>{q.quotation_number}</button><div className="mt-1 text-slate-500">{q.title}</div><div className="mt-1 text-slate-500">{q.items.map(item => item.service_name).join(', ')}</div></td>
                      <td className="p-3 whitespace-nowrap">{q.date}</td><td className="p-3 whitespace-nowrap">{q.valid_until || '-'}</td>
                      <td className="p-3 whitespace-nowrap font-bold">&#8377; {q.grand_total.toLocaleString('en-IN')}</td>
                      <td className="p-3">{q.status}</td>
                      <td className="p-3">{q.converted_invoice_number ? <button className="text-[#004077] hover:underline" onClick={() => onOpenInvoice(q.converted_invoice_number!, selectedClientForDetails.id)}>{q.converted_invoice_number}</button> : '-'}</td>
                    </tr>)}</tbody>
                  </table>
                </div>}
            </section>
            <section aria-label="Client projects and tasks" className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="font-black text-sm text-[#004077] uppercase tracking-wider">Projects ({clientProjects.length}) &amp; Tasks ({clientTasks.length})</h3>
              {clientProjects.length === 0 && <p className="text-xs text-slate-500">No projects for this client.</p>}
              {clientProjects.map(p => <div key={p.id} className="rounded-xl bg-slate-50 p-3 text-xs"><div className="font-bold text-[#004077]">{p.project_title}</div><p className="mt-1 text-slate-600">{p.status} | {p.assigned_to || 'Unassigned'} | Due: {p.due_date || '-'}</p>{p.description && <p className="mt-1 text-slate-500">{p.description}</p>}</div>)}
              {clientTasks.length === 0 && <p className="text-xs text-slate-500">No tasks for this client.</p>}
              {clientTasks.map(t => <div key={t.id} className="border-b border-slate-100 pb-2 text-xs"><div className="font-bold text-slate-700">{t.task_title}</div><p className="mt-1 text-slate-500">{t.status} | {t.assigned_to || 'Unassigned'} | Due: {t.due_date || '-'}</p></div>)}
            </section>
            {/* Invoices List */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-black text-xs text-[#004077] uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Receipt size={14} className="text-[#EF7C00]" />
                <span>Invoice Billing Ledger ({clientInvs.length})</span>
              </h4>
              {clientInvs.length === 0 ?
              <div className="p-4 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                  No invoices generated for this client.
                </div> :

              <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Invoice #</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Grand Total</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientInvs.map((inv) =>
                    <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-[#004077]"><button className="hover:underline" onClick={() => onOpenInvoice(inv.invoice_number, selectedClientForDetails.id)}>{inv.invoice_number}</button></td>
                          <td className="py-2.5 px-3 text-slate-500">{inv.created_at}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-800">₹ {inv.grand_total.toLocaleString('en-IN')}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.payment_status === 'Paid' ?
                        'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'}`
                        }>
                              {inv.payment_status}
                            </span>
                          </td>
                        </tr>
                    )}
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 4: CSV IMPORT (Dedicated Full Page, No Modal Popup)
   * ========================================================================= */
  if (pageMode === 'import') {
    return (
      <div className="clients-page space-y-6 animate-in fade-in">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setPageMode('list')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to Clients Directory
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Bulk Import Clients from CSV</h2>
            <p className="text-xs text-slate-500">
              Upload client lists with Company Name, Start Date, Status (Active/Inactive), and contact points.
            </p>
          </div>
          <ActionButton
            onClick={() => triggerCSVDownload(getSampleClientsCSV(), 'sample_clients_template.csv')}
            className="px-4 py-2 border border-[#004077] text-[#004077] hover:bg-[#004077] hover:text-white font-bold rounded-xl text-xs transition inline-flex items-center space-x-1.5">
            
            <Download size={14} />
            <span>Download Sample CSV</span>
          </ActionButton>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-6">
          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-[#004077] transition bg-slate-50/50">
            <Upload size={36} className="mx-auto text-[#004077] mb-3" />
            <h4 className="font-bold text-slate-700 text-sm mb-1">Upload CSV Document</h4>
            <p className="text-xs text-slate-400 mb-4">Supports headers: Company Name, Start Date, Status, Contact Person, Email, Mobile, City</p>
            
            <label className="px-5 py-2.5 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition inline-block">
              <span>Select File from Computer</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      handleProcessCsv(ev.target?.result as string, file.name);
                    };
                    reader.readAsText(file);
                  }
                }} />
              
            </label>
            {importFileName && <p className="text-xs font-bold text-emerald-700 mt-2">Selected: {importFileName}</p>}
          </div>

          <div>
            <label className="block font-bold text-slate-700 text-xs mb-1.5">Or Paste Raw CSV Data Directly:</label>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => handleProcessCsv(e.target.value, 'Pasted Data')}
              placeholder="Paste raw CSV with header row here..."
              className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#004077]" />
            
          </div>

          {parseResult &&
          <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-slate-800">
                    Validated Rows: <span className="text-emerald-700">{parseResult.clients.length} valid client records</span>
                  </h4>
                  {parseResult.warnings.length > 0 &&
                <p className="text-xs text-amber-600">{parseResult.warnings.length} warnings detected</p>
                }
                </div>
                <ActionButton
                disabled={parseResult.clients.length === 0}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition inline-flex items-center space-x-1.5">
                
                  <Check size={14} />
                  <span>Confirm &amp; Import {parseResult.clients.length} Clients</span>
                </ActionButton>
              </div>

              {parseResult.clients.length > 0 &&
            <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Start Date</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Contact</th>
                        <th className="p-2.5">City</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.clients.map((c, i) =>
                  <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-mono font-bold text-slate-600">{c.client_code}</td>
                          <td className="p-2.5 font-bold text-slate-800">{c.name}</td>
                          <td className="p-2.5 text-slate-600">{c.client_type}</td>
                          <td className="p-2.5 text-slate-600">{c.start_date || c.created_at}</td>
                          <td className="p-2.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`
                      }>
                              {c.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600">{c.contact_person}</td>
                          <td className="p-2.5 text-slate-600">{c.city}</td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
            }
            </div>
          }
        </div>
      </div>);

  }

  /* =========================================================================
   * PAGE 0: MAIN CLIENTS DIRECTORY LIST (Default View)
   * ========================================================================= */
  return (
    <div className="clients-page space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#004077] tracking-tight">Clients Directory</h2>
          
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* CSV Import Action: opens page without popup */}
          <ActionButton
            onClick={() => {
              setParseResult(null);
              setCsvText('');
              setImportFileName('');
              setPageMode('import');
            }}
            className="px-3.5 py-2 border border-slate-300 hover:border-[#004077] hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs"
            title="Import Clients from CSV">
            
            <Upload size={14} className="text-slate-500" />
            <span>Import CSV</span>
          </ActionButton>

          {/* Export Dropdown */}
          <div className="relative">
            <ActionButton
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-3.5 py-2 border border-slate-300 hover:border-[#004077] hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-xs">
              
              <Download size={14} className="text-slate-500" />
              <span>Export</span>
              <ChevronDown size={13} className="text-slate-400" />
            </ActionButton>
            {showExportMenu &&
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20 text-xs">
                <button
                onClick={() => {
                  exportClientsToCSV(clients, { mode: 'standard' });
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center space-x-2">
                
                  <FileSpreadsheet size={14} className="text-[#004077]" />
                  <span>Standard Directory (.csv)</span>
                </button>
                <button
                onClick={() => {
                  exportClientsToCSV(clients, { mode: 'reporting', invoices, subscriptions });
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 text-slate-700 font-medium flex items-center space-x-2 border-t border-slate-100">
                
                  <Receipt size={14} className="text-[#EF7C00]" />
                  <span>Full Financial Ledger (.csv)</span>
                </button>
              </div>
            }
          </div>

          {/* Register New Client: opens full page without popup */}
          <ActionButton
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs transition flex items-center space-x-1.5 shadow-sm">
            
            <Plus size={15} />
            <span>Register Client</span>
          </ActionButton>
        </div>
      </div>

      {/* KPI Cards (Active vs Inactive Clients) */}
      <div className="clients-summary grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('All')}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
          filterStatus === 'All' ? 'border-[#004077] ring-2 ring-[#004077]/10' : 'border-[#E5E7EB] hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Clients</span>
            <Users size={16} className="text-[#004077]" />
          </div>
          <div className="text-2xl font-black text-[#004077] mt-1">{clients.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">All registered enterprise accounts</div>
        </div>

        <div
          onClick={() => setFilterStatus('Active')}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
          filterStatus === 'Active' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-[#E5E7EB] hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Clients</span>
            </span>
            <UserCheck size={16} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{activeClientsCount}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Live services &amp; operational billing</div>
        </div>

        <div
          onClick={() => setFilterStatus('Inactive')}
          className={`bg-white p-4 rounded-2xl border transition cursor-pointer ${
          filterStatus === 'Inactive' ? 'border-slate-600 ring-2 ring-slate-600/10' : 'border-[#E5E7EB] hover:border-slate-300'}`
          }>
          
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Inactive Clients</span>
            <UserX size={16} className="text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">{inactiveClientsCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Paused or completed engagements</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Total Receivables</span>
            <Receipt size={16} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            ₹ {clients.reduce((acc, c) => acc + getClientFinancials(c.id).balance, 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Total unpaid ledger across all clients</div>
        </div>
      </div>

      {/* Filters Bar: Status Tabs + Type Filter + Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Status Tabs (All, Active, Inactive) */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFilterStatus('All')}
              className={`px-3 py-1.5 rounded-lg transition ${
              filterStatus === 'All' ? 'bg-white text-[#004077] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`
              }>
              
              All Clients ({clients.length})
            </button>
            <button
              onClick={() => setFilterStatus('Active')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              filterStatus === 'Active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-700'}`
              }>
              
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Active ({activeClientsCount})</span>
            </button>
            <button
              onClick={() => setFilterStatus('Inactive')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5 ${
              filterStatus === 'Inactive' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`
              }>
              
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>Inactive ({inactiveClientsCount})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search by name, code, contact, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition" />
            
          </div>
        </div>

        {/* Client Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-400 text-[11px] font-bold mr-1">Client Type:</span>
          {['All', 'Corporate', 'Government', 'Retail', 'Startup', 'NGO'].map((type) =>
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition ${
            filterType === type ?
            'bg-[#004077] text-white font-bold shadow-xs' :
            'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
            }>
            
              {type}
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="clients-directory bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="clients-table w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Start Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Contact Point</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Subscriptions</th>
                <th className="py-3 px-4">Due Balance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ?
              <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <Users size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold">No clients found matching the current filters.</p>
                    <p className="text-[11px] mt-1">Try clearing search or switching status tabs.</p>
                  </td>
                </tr> :

              filteredClients.map((client) => {
                const fin = getClientFinancials(client.id);
                const clientSubs = subscriptions.filter((s) => s.client_id === client.id && s.status !== 'Cancelled');
                const startDate = client.start_date || client.created_at || '2024-01-01';

                return (
                  <tr key={client.id} className="hover:bg-slate-50/80 transition group">
                      
                      {/* Company Name & Code */}
                      <td data-label="Client" className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-sm group-hover:text-[#004077] transition">
                          {client.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {client.client_code}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td data-label="Type" className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      client.client_type === 'Government' ?
                      'bg-amber-100 text-amber-800' :
                      client.client_type === 'Corporate' ?
                      'bg-blue-100 text-blue-800' :
                      client.client_type === 'Retail' ?
                      'bg-purple-100 text-purple-800' :
                      'bg-emerald-100 text-emerald-800'}`
                      }>
                          {client.client_type}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td data-label="Start date" className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-700 font-semibold text-xs">
                          <Calendar size={13} className="text-[#EF7C00]" />
                          <span>{startDate}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Contract start</div>
                      </td>

                      {/* Status Active / Inactive with quick toggle */}
                      <td data-label="Status" className="py-3.5 px-4">
                        <button
                        onClick={(e) => handleToggleClientStatus(client, e)}
                        title={`Click to switch to ${client.status === 'Active' ? 'Inactive' : 'Active'}`}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                        client.status === 'Active' ?
                        'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' :
                        'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'}`
                        }>
                        
                          <span className={`w-2 h-2 rounded-full mr-1.5 ${
                        client.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`
                        }></span>
                          <span>{client.status}</span>
                        </button>
                      </td>

                      {/* Contact Point */}
                      <td data-label="Contact" className="py-3.5 px-4">
                        <div className="font-medium text-slate-700">{client.contact_person}</div>
                        <div className="text-[10px] text-slate-400">{client.mobile}</div>
                      </td>

                      {/* Location */}
                      <td data-label="Location" className="py-3.5 px-4 text-slate-600">
                        {client.city}
                      </td>

                      {/* Subscriptions */}
                      <td data-label="Services" className="py-3.5 px-4">
                        <span className="font-bold text-slate-800">{clientSubs.length}</span>
                        <span className="text-slate-400 text-[10px]"> assigned</span>
                        <div className="text-[10px] text-slate-500">{clientSubs.map(sub => services.find(s => s.id === sub.service_id)?.service_name || sub.service_name).filter(Boolean).join(', ')}</div>
                      </td>

                      {/* Due Balance */}
                      <td data-label="Due balance" className="py-3.5 px-4">
                        {fin.balance > 0 ?
                      <div>
                            <span className="font-bold text-amber-700">₹ {fin.balance.toLocaleString('en-IN')}</span>
                            <span className="block text-[9px] text-slate-400">Due Outstanding</span>
                          </div> :

                      <span className="inline-flex items-center text-emerald-600 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded">
                            <Check size={10} className="mr-0.5" /> Settled
                          </span>
                      }
                      </td>

                      {/* Actions */}
                      <td data-label="Actions" className="py-3.5 px-4 text-right">
                        <div className="client-row-actions flex items-center justify-end gap-1.5">
                          {onPrepareQuotation &&
                        <button
                          onClick={() => onPrepareQuotation(client.id)}
                          className="p-1.5 bg-orange-50 hover:bg-orange-100 text-[#EF7C00] rounded-lg transition border border-orange-200"
                          title="Prepare Quotation for this client">
                          
                              <FileSpreadsheet size={13} />
                            </button>
                        }
                          {onOpenClientFolder &&
                        <button
                          onClick={() => onOpenClientFolder(client.id)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#004077] rounded-lg transition border border-blue-200"
                          title="Open Organization Files & Drive">
                          
                              <FolderClosed size={13} />
                            </button>
                        }
                          {/* Opens full page view */}
                          <ActionButton
                          onClick={() => handleOpenDetails(client)}
                          className="client-view-profile bg-[#004077] hover:bg-[#00355F] text-white font-bold rounded-xl transition shadow-xs">
                          
                            View Profile
                          </ActionButton>
                          {/* Opens full edit page */}
                          <button
                          onClick={() => handleOpenEdit(client)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#004077] rounded-lg transition"
                          title="Edit Client Information">
                          
                            <Edit3 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>);

              })
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>);

};
