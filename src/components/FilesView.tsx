import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import { uploadFile } from '../api';
import { downloadClientFile } from '../utils/pdfUtils';
import React, { useState, useRef } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Table as TableIcon,
  ArrowLeft,
  Check,
  CheckCircle2,
  Printer,
  Search,
  Building2,
  Sparkles,
  Columns,
  Rows,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Layers,
  FileCheck,
  Receipt,
  FileUp,
  X,
  File,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  Palette,
  LayoutGrid,
  ListPlus,
  GripVertical,
  FolderInput,
  FolderOutput,
  Move,
  Tag,
  ArrowRightLeft,
  FolderKanban,
  Megaphone,
  Send,
  Smartphone,
  Phone,
  ExternalLink,
  MessageSquare,
  Share2,
  UserPlus,
  FileDown,
  Clock } from
'lucide-react';
import {
  Client,
  Quotation,
  Invoice,
  StoredClientFile,
  FileCategory,
  CustomTableData,
  TableCellData,
  CustomTableRow,
  Project,
  FacebookLead,
  FacebookPageMapping } from
'../types';

interface FilesViewProps {
  clients: Client[];
  quotations: Quotation[];
  invoices: Invoice[];
  clientFiles: StoredClientFile[];
  projects?: Project[];
  facebookLeads?: FacebookLead[];
  agencyFbPages?: FacebookPageMapping[];
  onSyncFacebook?: (clientId: number) => Promise<any>;
  onAddFile: (file: StoredClientFile) => void;
  onDeleteFile: (fileId: string) => void;
  onUpdateFile: (file: StoredClientFile) => void;
  onNavigateToQuotation?: (quotationNumber: string) => void;
  onNavigateToInvoice?: (invoiceNumber: string) => void;
  onPrepareQuotationForClient?: (clientId: number) => void;
  onUpdateClientFbPage?: (clientId: number, pageId: string, pageName: string, formId?: string, formName?: string) => void;
  onAddFbLead?: (lead: FacebookLead) => void;
  onUpdateFbLeadStatus?: (leadId: string, status: FacebookLead['status']) => void;
  onOpenWhatsAppModal?: (recipient: {name: string;phone: string;clientName?: string;clientId?: number;leadId?: string;serviceRequested?: string;}) => void;
  initialSelectedClientId?: number | null;
}

type FilesViewMode = 'folders' | 'folder_detail' | 'upload' | 'table_builder' | 'preview_file' | 'create_table_setup';

export const DOCUMENT_SUB_CATEGORIES = [
{ tag: 'Client Agreement', defaultCategory: 'Uploaded Document' as FileCategory, label: 'Client Agreement / NDA', desc: 'Contracts, NDAs & Master Service Agreements', color: 'border-blue-200 bg-blue-50/70 text-blue-900', iconColor: 'text-[#004077]' },
{ tag: 'Technical Proposal', defaultCategory: 'Quotation' as FileCategory, label: 'Technical Proposal / SOW', desc: 'Commercial quotations, scope of work & estimates', color: 'border-indigo-200 bg-indigo-50/70 text-indigo-900', iconColor: 'text-indigo-600' },
{ tag: 'KYC Documentation', defaultCategory: 'Uploaded Document' as FileCategory, label: 'KYC & Registration Docs', desc: 'PAN, GSTIN, Incorporation certificate', color: 'border-emerald-200 bg-emerald-50/70 text-emerald-900', iconColor: 'text-emerald-700' },
{ tag: 'Tax & GST Filing', defaultCategory: 'Invoice' as FileCategory, label: 'Tax & GST Invoices', desc: 'Tax invoices, e-way bills & GST proofs', color: 'border-teal-200 bg-teal-50/70 text-teal-900', iconColor: 'text-teal-700' },
{ tag: 'Brand Assets', defaultCategory: 'Uploaded Document' as FileCategory, label: 'Brand Assets & Specs', desc: 'Logos, guidelines, brand kits & design files', color: 'border-purple-200 bg-purple-50/70 text-purple-900', iconColor: 'text-purple-700' },
{ tag: 'Meeting Minutes', defaultCategory: 'Uploaded Document' as FileCategory, label: 'Meeting Minutes & Briefs', desc: 'Client kickoff briefs, status notes & meeting logs', color: 'border-amber-200 bg-amber-50/70 text-amber-900', iconColor: 'text-amber-700' },
{ tag: 'Interactive Matrix', defaultCategory: 'Custom Table' as FileCategory, label: 'Interactive Matrices', desc: 'Custom data grids, deliverable tables & audits', color: 'border-orange-200 bg-orange-50/70 text-orange-900', iconColor: 'text-[#EF7C00]' }];


export const FilesView: React.FC<FilesViewProps> = ({
  clients,
  quotations,
  invoices,
  clientFiles,
  projects,
  facebookLeads = [],
  agencyFbPages = [],
  onSyncFacebook,
  onAddFile,
  onDeleteFile,
  onUpdateFile,
  onNavigateToQuotation,
  onNavigateToInvoice,
  onPrepareQuotationForClient,
  onUpdateClientFbPage,
  onAddFbLead,
  onUpdateFbLeadStatus,
  onOpenWhatsAppModal,
  initialSelectedClientId
}) => {
  // Page mode state (Strictly in-page, NO popups)
  const [viewMode, setViewMode] = useState<FilesViewMode>(
    initialSelectedClientId ? 'folder_detail' : 'folders'
  );
  const [selectedClientId, setSelectedClientId] = useState<number | null>(
    initialSelectedClientId || null
  );

  React.useEffect(() => {
    if (initialSelectedClientId) {
      setSelectedClientId(initialSelectedClientId);
      setViewMode('folder_detail');
    }
  }, [initialSelectedClientId]);

  // Folder search & category filter inside folder
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [folderFileFilter, setFolderFileFilter] = useState<'All' | FileCategory>('All');

  // Active file for in-page preview
  const [previewFile, setPreviewFile] = useState<StoredClientFile | null>(null);

  // Facebook Page picker & Lead Ads state
  const [showPagePickerModal, setShowPagePickerModal] = useState<boolean>(false);
  const [selectedLeadForDetail, setSelectedLeadForDetail] = useState<FacebookLead | null>(null);
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('All');
  const [customPageName, setCustomPageName] = useState<string>('');
  const [customPageId, setCustomPageId] = useState<string>('');
  const [customFormName, setCustomFormName] = useState<string>('');

  // Drag & drop state for re-categorization & project folder transfer
  const [draggedDoc, setDraggedDoc] = useState<StoredClientFile | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null); // e.g. 'cat-Quotation', 'tag-Brand Assets', 'folder-2'
  const [dndToast, setDndToast] = useState<{message: string;sub?: string;} | null>(null);
  const [showFolderDropDrawer, setShowFolderDropDrawer] = useState<boolean>(true);

  // Accessible in-page re-classification / folder transfer form
  const [reclassifyingDoc, setReclassifyingDoc] = useState<StoredClientFile | null>(null);
  const [reclassTargetClientId, setReclassTargetClientId] = useState<number>(clients[0]?.id || 1);
  const [reclassTargetCategory, setReclassTargetCategory] = useState<FileCategory>('Uploaded Document');
  const [reclassTargetTag, setReclassTargetTag] = useState<string>('Client Agreement');
  const [reclassTargetProjectId, setReclassTargetProjectId] = useState<number | ''>('');

  const triggerDndToast = (message: string, sub?: string) => {
    setDndToast({ message, sub });
    setTimeout(() => {
      setDndToast((prev) => prev?.message === message ? null : prev);
    }, 4500);
  };

  const handleDocDragStart = (e: React.DragEvent, doc: StoredClientFile) => {
    setDraggedDoc(doc);
    e.dataTransfer.setData('text/plain', doc.id);
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: doc.id,
      fileName: doc.file_name,
      clientId: doc.client_id,
      category: doc.category,
      tag: doc.tag
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDocDragEnd = () => {
    setDraggedDoc(null);
    setActiveDropZone(null);
  };

  const handleDropOnCategory = async (targetCategory: FileCategory, targetTag?: string) => {try {
      if (!draggedDoc) return;
      const docName = draggedDoc.file_name;
      const oldCat = draggedDoc.category;
      const resolvedTag = targetTag || (
      targetCategory === 'Quotation' ? 'Technical Proposal' :
      targetCategory === 'Invoice' ? 'Tax & GST Filing' :
      targetCategory === 'Custom Table' ? 'Interactive Matrix' :
      draggedDoc.tag || 'Client Agreement');


      const updated: StoredClientFile = {
        ...draggedDoc,
        category: targetCategory,
        tag: resolvedTag
      };

      await onUpdateFile(updated);
      setDraggedDoc(null);
      setActiveDropZone(null);
      triggerDndToast(
        `Re-categorized: "${docName}"`,
        `Moved from ${oldCat} to ${targetCategory}${targetTag ? ` (${targetTag})` : ''}`
      );
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleDropOnFolder = async (targetClientId: number, targetProjectId?: number) => {try {
      if (!draggedDoc) return;
      const targetClient = clients.find((c) => c.id === targetClientId);
      if (!targetClient) return;

      const docName = draggedDoc.file_name;
      const oldClient = draggedDoc.client_name;
      const targetProject = projects?.find((p) => p.id === targetProjectId);

      const updated: StoredClientFile = {
        ...draggedDoc,
        client_id: targetClientId,
        client_name: targetClient.name,
        project_id: targetProjectId || undefined,
        project_name: targetProject?.project_title || undefined
      };

      await onUpdateFile(updated);
      setDraggedDoc(null);
      setActiveDropZone(null);
      triggerDndToast(
        `Transferred to ${targetClient.name}`,
        `Moved "${docName}" from ${oldClient}${targetProject ? ` (Assigned to project: ${targetProject.project_title})` : ''}`
      );
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleExecuteReclass = async () => {try {
      if (!reclassifyingDoc) return;
      const targetClient = clients.find((c) => c.id === reclassTargetClientId) || clients[0];
      const targetProject = typeof reclassTargetProjectId === 'number' ? projects?.find((p) => p.id === reclassTargetProjectId) : undefined;

      const updated: StoredClientFile = {
        ...reclassifyingDoc,
        client_id: targetClient.id,
        client_name: targetClient.name,
        category: reclassTargetCategory,
        tag: reclassTargetTag,
        project_id: targetProject?.id || undefined,
        project_name: targetProject?.project_title || undefined
      };

      await onUpdateFile(updated);
      triggerDndToast(
        `Updated: "${reclassifyingDoc.file_name}"`,
        `Saved to ${targetClient.name} • ${reclassTargetCategory} (${reclassTargetTag})`
      );
      setReclassifyingDoc(null);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Upload Form State
  const [selectedUpload, setSelectedUpload] = useState<File | null>(null);
  const [uploadFormData, setUploadFormData] = useState({
    fileName: '',
    tag: 'Client Agreement',
    notes: '',
    displaySize: '0 KB',
    fileType: 'pdf' as StoredClientFile['file_type']
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Table Builder State & Headlines Customization
  const [tableTitle, setTableTitle] = useState('Project Deliverables & Milestones Matrix');
  const [tableKicker, setTableKicker] = useState('TECHNICAL SPECIFICATION & SOW');
  const [tableDesc, setTableDesc] = useState('Scope of work specification, deliverables timeline, and SLA terms.');
  const [tableTheme, setTableTheme] = useState<'navy' | 'slate' | 'emerald' | 'amber' | 'indigo'>('navy');
  const [tableHeadlineAlign, setTableHeadlineAlign] = useState<'left' | 'center' | 'right'>('left');
  const [editingTableFileId, setEditingTableFileId] = useState<string | null>(null);

  // New Table Creation Wizard State
  const [setupTargetClientId, setSetupTargetClientId] = useState<number>(clients[0]?.id || 1);
  const [setupMode, setSetupMode] = useState<'templates' | 'custom'>('templates');
  const [setupSelectedTemplate, setSetupSelectedTemplate] = useState<string>('deliverables');
  const [setupTitle, setSetupTitle] = useState('Project Deliverables & Milestones Matrix');
  const [setupKicker, setSetupKicker] = useState('TECHNICAL SPECIFICATION & SOW');
  const [setupDesc, setSetupDesc] = useState('Scope of work specification, deliverables timeline, and SLA terms.');
  const [setupTheme, setSetupTheme] = useState<'navy' | 'slate' | 'emerald' | 'amber' | 'indigo'>('navy');
  const [setupHeadlineAlign, setSetupHeadlineAlign] = useState<'left' | 'center' | 'right'>('left');
  const [setupColCount, setSetupColCount] = useState<number>(4);
  const [setupRowCount, setSetupRowCount] = useState<number>(3);
  const [setupColHeaders, setSetupColHeaders] = useState<string[]>([
  'Module / Deliverable',
  'Scope Specification',
  'Duration & Timeline',
  'Status']
  );
  const [setupIncludeSectionHeadline, setSetupIncludeSectionHeadline] = useState<boolean>(true);
  const [setupSectionHeadlineText, setSetupSectionHeadlineText] = useState<string>('PHASE 1: DISCOVERY & ARCHITECTURE');

  // Default table columns and rows (Supports section headlines + cells)
  const [tableCols, setTableCols] = useState<{id: string;header: string;align?: 'left' | 'center' | 'right';}[]>([
  { id: 'c1', header: 'Module / Item', align: 'left' },
  { id: 'c2', header: 'Description & Scope', align: 'left' },
  { id: 'c3', header: 'Duration & Timeline', align: 'center' },
  { id: 'c4', header: 'SLA / Benchmark', align: 'center' },
  { id: 'c5', header: 'Status', align: 'center' }]
  );

  const [tableRows, setTableRows] = useState<CustomTableRow[]>([
  {
    id: 'sec-1',
    isSectionHeadline: true,
    headlineText: 'PHASE 1: CORE PORTAL DEVELOPMENT & INFRASTRUCTURE',
    headlineSubtitle: 'High-availability frontend and cloud server deployment',
    headlineTheme: 'navy',
    cells: {}
  },
  {
    id: 'r1',
    cells: {
      c1: { id: 'r1-c1', content: 'Enterprise Portal Development', bold: true },
      c2: { id: 'r1-c2', content: 'Custom React & Vite frontend with responsive Tailwind theme' },
      c3: { id: 'r1-c3', content: '4 Weeks' },
      c4: { id: 'r1-c4', content: '99.9% Uptime guarantee' },
      c5: { id: 'r1-c5', content: 'Delivered', bold: true }
    }
  },
  {
    id: 'r2',
    cells: {
      c1: { id: 'r2-c1', content: 'Cloud VPS & MySQL Hosting', bold: true },
      c2: { id: 'r2-c2', content: 'Hostinger Linux 8.2 with daily encrypted backups' },
      c3: { id: 'r2-c3', content: '12 Months' },
      c4: { id: 'r2-c4', content: '24/7 Monitoring' },
      c5: { id: 'r2-c5', content: 'Active', bold: true }
    }
  },
  {
    id: 'sec-2',
    isSectionHeadline: true,
    headlineText: 'PHASE 2: OPERATIONS, SLA & MAINTENANCE',
    headlineSubtitle: 'Round-the-clock emergency support and monthly updates',
    headlineTheme: 'amber',
    cells: {}
  },
  {
    id: 'r3',
    cells: {
      c1: { id: 'r3-c1', content: 'Comprehensive Support & AMC', bold: true },
      c2: { id: 'r3-c2', content: 'Dedicated account manager and emergency hotfix SLA', colSpan: 2 },
      c3: { id: 'r3-c3', content: '', isMergedHidden: true },
      c4: { id: 'r3-c4', content: '2-Hour Response' },
      c5: { id: 'r3-c5', content: 'Ongoing', bold: true }
    }
  }]
  );

  const [selectedCellPos, setSelectedCellPos] = useState<{rowId: string;colId: string;} | null>(null);

  // Selected client object
  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0] || null;

  // The API indexes commercial documents and stores all file metadata.
  const getClientAllFiles = (clientId: number): StoredClientFile[] => clientFiles.filter(f=>f.client_id===clientId).sort((a,b)=>b.uploaded_at.localeCompare(a.uploaded_at));

  // Open folder for a specific client
  const handleOpenFolder = (clientId: number) => {
    setSelectedClientId(clientId);
    setFolderFileFilter('All');
    setSearchQuery('');
    setViewMode('folder_detail');
  };

  // Open in-page file uploader
  const handleStartUpload = () => {
    setUploadFormData({
      fileName: '',
      tag: 'Client Agreement',
      notes: '',
      displaySize: '0 KB',
      fileType: 'pdf'
    });
    setViewMode('upload');
  };

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = (file: File) => {
    setSelectedUpload(file);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    let fType: StoredClientFile['file_type'] = 'pdf';
    if (ext === 'doc' || ext === 'docx') fType = 'docx';else
    if (ext === 'xls' || ext === 'xlsx') fType = 'xlsx';else
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) fType = 'image';else
    if (ext === 'pdf') fType = 'pdf';else
    fType = 'other';

    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb || 12} KB`;

    setUploadFormData((prev) => ({
      ...prev,
      fileName: file.name,
      fileType: fType,
      displaySize: sizeStr
    }));
  };

  const handleSaveUploadedFile = async (e: React.FormEvent) => {
    e.preventDefault();if (!selectedClient || !selectedUpload) {showPopup('Choose an actual file first.');return;}
    try {await uploadFile(selectedUpload, selectedClient.id, uploadFormData.tag, undefined, { file_name: uploadFormData.fileName, notes: uploadFormData.notes, file_type: uploadFormData.fileType });setSelectedUpload(null);setViewMode('folder_detail');}
    catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error.message }));}
  };

  // Table Presets with comprehensive headlines, section categories, and schemas
  interface TablePreset {
    id: string;
    name: string;
    kicker: string;
    badge: string;
    desc: string;
    theme: 'navy' | 'slate' | 'emerald' | 'amber' | 'indigo';
    headlineAlign: 'left' | 'center' | 'right';
    columns: {id: string;header: string;align?: 'left' | 'center' | 'right';}[];
    rows: CustomTableRow[];
  }

  const TABLE_PRESETS: TablePreset[] = [
  {
    id: 'deliverables',
    name: 'Project Deliverables & Scope Matrix',
    kicker: 'TECHNICAL SPECIFICATION & SOW',
    badge: '5 Columns • 2 Section Headlines • SLA Benchmarks',
    desc: 'Structured breakdown of system modules, deliverables specifications, delivery timelines, and SLA uptime commitments.',
    theme: 'navy' as const,
    headlineAlign: 'left' as const,
    columns: [
    { id: 'c1', header: 'Module / Item', align: 'left' as const },
    { id: 'c2', header: 'Description & Scope', align: 'left' as const },
    { id: 'c3', header: 'Duration & Timeline', align: 'center' as const },
    { id: 'c4', header: 'SLA / Benchmark', align: 'center' as const },
    { id: 'c5', header: 'Status', align: 'center' as const }],

    rows: [
    {
      id: 'sec-1',
      isSectionHeadline: true,
      headlineText: 'PHASE 1: CORE PORTAL DEVELOPMENT & INFRASTRUCTURE',
      headlineSubtitle: 'High-availability frontend and cloud server deployment',
      headlineTheme: 'navy' as const,
      cells: {}
    },
    {
      id: 'r1',
      cells: {
        c1: { id: 'r1-c1', content: 'Enterprise Portal Development', bold: true },
        c2: { id: 'r1-c2', content: 'Custom React & Vite frontend with responsive Tailwind theme' },
        c3: { id: 'r1-c3', content: '4 Weeks' },
        c4: { id: 'r1-c4', content: '99.9% Uptime guarantee' },
        c5: { id: 'r1-c5', content: 'Delivered', bold: true }
      }
    },
    {
      id: 'r2',
      cells: {
        c1: { id: 'r2-c1', content: 'Cloud VPS & MySQL Hosting', bold: true },
        c2: { id: 'r2-c2', content: 'Hostinger Linux 8.2 with daily encrypted backups' },
        c3: { id: 'r2-c3', content: '12 Months' },
        c4: { id: 'r2-c4', content: '24/7 Monitoring' },
        c5: { id: 'r2-c5', content: 'Active', bold: true }
      }
    },
    {
      id: 'sec-2',
      isSectionHeadline: true,
      headlineText: 'PHASE 2: OPERATIONS, SLA & MAINTENANCE',
      headlineSubtitle: 'Round-the-clock emergency support and monthly updates',
      headlineTheme: 'amber' as const,
      cells: {}
    },
    {
      id: 'r3',
      cells: {
        c1: { id: 'r3-c1', content: 'Comprehensive Support & AMC', bold: true },
        c2: { id: 'r3-c2', content: 'Dedicated account manager and emergency hotfix SLA', colSpan: 2 },
        c3: { id: 'r3-c3', content: '', isMergedHidden: true },
        c4: { id: 'r3-c4', content: '2-Hour Response' },
        c5: { id: 'r3-c5', content: 'Ongoing', bold: true }
      }
    }]

  },
  {
    id: 'rate_card',
    name: 'Commercial Rate Card & Billing Matrix',
    kicker: 'COMMERCIAL PRICING SCHEDULE',
    badge: '6 Columns • 2 Section Headlines • Frequencies & Rates',
    desc: 'Commercial rate card detailing hourly/recurring services, billing cycles, unit rates, quantities, and totals.',
    theme: 'emerald' as const,
    headlineAlign: 'left' as const,
    columns: [
    { id: 'c1', header: 'Service Deliverable', align: 'left' as const },
    { id: 'c2', header: 'Billing Cycle', align: 'center' as const },
    { id: 'c3', header: 'Scope & Inclusions', align: 'left' as const },
    { id: 'c4', header: 'Unit Rate (₹)', align: 'right' as const },
    { id: 'c5', header: 'Qty', align: 'center' as const },
    { id: 'c6', header: 'Total (₹)', align: 'right' as const }],

    rows: [
    {
      id: 'sec-1',
      isSectionHeadline: true,
      headlineText: 'RECURRING SUBSCRIPTION & CLOUD INFRASTRUCTURE',
      headlineSubtitle: 'Monthly and annual recurring billing services',
      headlineTheme: 'emerald' as const,
      cells: {}
    },
    {
      id: 'r1',
      cells: {
        c1: { id: 'r1-c1', content: 'Dedicated Cloud VPS Node', bold: true },
        c2: { id: 'r1-c2', content: 'Yearly' },
        c3: { id: 'r1-c3', content: 'Hostinger Cloud Enterprise 8 vCPU / 32GB RAM / NVMe' },
        c4: { id: 'r1-c4', content: '₹ 24,000' },
        c5: { id: 'r1-c5', content: '1' },
        c6: { id: 'r1-c6', content: '₹ 24,000', bold: true }
      }
    },
    {
      id: 'r2',
      cells: {
        c1: { id: 'r2-c1', content: 'Comprehensive Support & AMC', bold: true },
        c2: { id: 'r2-c2', content: 'Monthly' },
        c3: { id: 'r2-c3', content: '24/7 SLA monitoring, emergency bug fixes, and patch management' },
        c4: { id: 'r2-c4', content: '₹ 7,500' },
        c5: { id: 'r2-c5', content: '12' },
        c6: { id: 'r2-c6', content: '₹ 90,000', bold: true }
      }
    },
    {
      id: 'sec-2',
      isSectionHeadline: true,
      headlineText: 'ONE-TIME DESIGN & ARCHITECTURE DELIVERABLES',
      headlineSubtitle: 'Fixed fee one-time deliverables upon client sign-off',
      headlineTheme: 'slate' as const,
      cells: {}
    },
    {
      id: 'r3',
      cells: {
        c1: { id: 'r3-c1', content: 'Custom Portal UI/UX Design', bold: true },
        c2: { id: 'r3-c2', content: 'One-Time' },
        c3: { id: 'r3-c3', content: 'High-fidelity wireframes, client feedback iterations, design system' },
        c4: { id: 'r3-c4', content: '₹ 35,000' },
        c5: { id: 'r3-c5', content: '1' },
        c6: { id: 'r3-c6', content: '₹ 35,000', bold: true }
      }
    }]

  },
  {
    id: 'sla',
    name: 'Service Level Agreement (SLA) Matrix',
    kicker: 'SLA COMMITMENT & PERFORMANCE STANDARDS',
    badge: '5 Columns • 2 Section Headlines • Response Windows',
    desc: 'Guaranteed system uptime, incident severity classifications, response SLA windows, and resolution targets.',
    theme: 'navy' as const,
    headlineAlign: 'left' as const,
    columns: [
    { id: 'c1', header: 'System Component', align: 'left' as const },
    { id: 'c2', header: 'Target Uptime', align: 'center' as const },
    { id: 'c3', header: 'Severity 1 Response', align: 'center' as const },
    { id: 'c4', header: 'Resolution SLA', align: 'center' as const },
    { id: 'c5', header: 'Scheduled Maintenance', align: 'left' as const }],

    rows: [
    {
      id: 'sec-1',
      isSectionHeadline: true,
      headlineText: 'PRODUCTION CLOUD APPLICATION NODES',
      headlineSubtitle: 'Primary frontend, backend APIs, and reverse proxies',
      headlineTheme: 'navy' as const,
      cells: {}
    },
    {
      id: 'r1',
      cells: {
        c1: { id: 'r1-c1', content: 'Production Web Application', bold: true },
        c2: { id: 'r1-c2', content: '99.95%' },
        c3: { id: 'r1-c3', content: '< 15 Minutes' },
        c4: { id: 'r1-c4', content: '4 Hours' },
        c5: { id: 'r1-c5', content: 'Sundays 02:00 - 04:00 AM IST' }
      }
    },
    {
      id: 'r2',
      cells: {
        c1: { id: 'r2-c1', content: 'Database Cluster (MySQL)', bold: true },
        c2: { id: 'r2-c2', content: '99.99%' },
        c3: { id: 'r2-c3', content: '< 10 Minutes' },
        c4: { id: 'r2-c4', content: '2 Hours' },
        c5: { id: 'r2-c5', content: 'Zero-downtime hot failover' }
      }
    },
    {
      id: 'sec-2',
      isSectionHeadline: true,
      headlineText: 'SECONDARY & SUPPORT SERVICES',
      headlineSubtitle: 'Client portals, ticketing systems, and analytics',
      headlineTheme: 'blue' as const,
      cells: {}
    },
    {
      id: 'r3',
      cells: {
        c1: { id: 'r3-c1', content: 'Support Desk & Ticketing API', bold: true },
        c2: { id: 'r3-c2', content: '99.90%' },
        c3: { id: 'r3-c3', content: '< 30 Minutes' },
        c4: { id: 'r3-c4', content: '8 Hours' },
        c5: { id: 'r3-c5', content: 'Monthly scheduled release' }
      }
    }]

  },
  {
    id: 'milestones',
    name: 'Milestone Deliverables & Payment Schedule',
    kicker: 'COMMERCIAL CONTRACT ANNEXURE B',
    badge: '6 Columns • 2 Section Headlines • Tranches & Sign-Offs',
    desc: 'Chronological roadmap of project phases, deliverable outputs, tranche percentages, release amounts, and sign-offs.',
    theme: 'amber' as const,
    headlineAlign: 'left' as const,
    columns: [
    { id: 'c1', header: 'Milestone Phase', align: 'left' as const },
    { id: 'c2', header: 'Key Deliverable Output', align: 'left' as const },
    { id: 'c3', header: 'Target Date', align: 'center' as const },
    { id: 'c4', header: 'Tranche %', align: 'center' as const },
    { id: 'c5', header: 'Amount (₹)', align: 'right' as const },
    { id: 'c6', header: 'Sign-Off Status', align: 'center' as const }],

    rows: [
    {
      id: 'sec-1',
      isSectionHeadline: true,
      headlineText: 'STAGE I: INITIATION & PROTOTYPING GATES',
      headlineSubtitle: 'Mobilization advance and approved system architecture',
      headlineTheme: 'amber' as const,
      cells: {}
    },
    {
      id: 'r1',
      cells: {
        c1: { id: 'r1-c1', content: 'Advance Mobilization', bold: true },
        c2: { id: 'r1-c2', content: 'Agreement execution & kickoff meeting signoff' },
        c3: { id: 'r1-c3', content: 'Day 1' },
        c4: { id: 'r1-c4', content: '25%' },
        c5: { id: 'r1-c5', content: '₹ 50,000' },
        c6: { id: 'r1-c6', content: 'Approved', bold: true }
      }
    },
    {
      id: 'r2',
      cells: {
        c1: { id: 'r2-c1', content: 'Interactive Prototype & Schema', bold: true },
        c2: { id: 'r2-c2', content: 'Figma click-through screens and database documentation' },
        c3: { id: 'r2-c3', content: 'Day 14' },
        c4: { id: 'r2-c4', content: '25%' },
        c5: { id: 'r2-c5', content: '₹ 50,000' },
        c6: { id: 'r2-c6', content: 'In Progress' }
      }
    },
    {
      id: 'sec-2',
      isSectionHeadline: true,
      headlineText: 'STAGE II: DEPLOYMENT & GO-LIVE GATES',
      headlineSubtitle: 'UAT testing, security sign-off, and handover training',
      headlineTheme: 'slate' as const,
      cells: {}
    },
    {
      id: 'r3',
      cells: {
        c1: { id: 'r3-c1', content: 'UAT Staging & Client Testing', bold: true },
        c2: { id: 'r3-c2', content: 'Full functional sandbox with demo client records' },
        c3: { id: 'r3-c3', content: 'Day 30' },
        c4: { id: 'r3-c4', content: '30%' },
        c5: { id: 'r3-c5', content: '₹ 60,000' },
        c6: { id: 'r3-c6', content: 'Scheduled' }
      }
    },
    {
      id: 'r4',
      cells: {
        c1: { id: 'r4-c1', content: 'Production Go-Live & Handover', bold: true },
        c2: { id: 'r4-c2', content: 'Live domain release, source archive, and staff training' },
        c3: { id: 'r4-c3', content: 'Day 45' },
        c4: { id: 'r4-c4', content: '20%' },
        c5: { id: 'r4-c5', content: '₹ 40,000' },
        c6: { id: 'r4-c6', content: 'Scheduled' }
      }
    }]

  },
  {
    id: 'compliance',
    name: 'Infrastructure & Compliance Audit Matrix',
    kicker: 'REGULATORY & SECURITY AUDIT SCHEDULE',
    badge: '5 Columns • 1 Section Headline • Inspection Standards',
    desc: 'Audit matrix recording compliance standards, data protection benchmarks, audit frequencies, and inspection status.',
    theme: 'slate' as const,
    headlineAlign: 'left' as const,
    columns: [
    { id: 'c1', header: 'Asset / Infrastructure Item', align: 'left' as const },
    { id: 'c2', header: 'Owner Department', align: 'left' as const },
    { id: 'c3', header: 'Compliance Standard', align: 'center' as const },
    { id: 'c4', header: 'Audit Frequency', align: 'center' as const },
    { id: 'c5', header: 'Status', align: 'center' as const }],

    rows: [
    {
      id: 'sec-1',
      isSectionHeadline: true,
      headlineText: 'DATA PRIVACY, SSL & DISASTER RECOVERY',
      headlineSubtitle: 'Security controls mandated by enterprise governance',
      headlineTheme: 'slate' as const,
      cells: {}
    },
    {
      id: 'r1',
      cells: {
        c1: { id: 'r1-c1', content: 'TLS 1.3 / SSL Wildcard Certificate', bold: true },
        c2: { id: 'r1-c2', content: 'DevOps & Security' },
        c3: { id: 'r1-c3', content: 'SHA-256 with Automated Renewal' },
        c4: { id: 'r1-c4', content: 'Quarterly' },
        c5: { id: 'r1-c5', content: 'Compliant', bold: true }
      }
    },
    {
      id: 'r2',
      cells: {
        c1: { id: 'r2-c1', content: 'Automated Database Backup Encryption', bold: true },
        c2: { id: 'r2-c2', content: 'Database Operations' },
        c3: { id: 'r2-c3', content: 'AES-256 Off-Site Sync' },
        c4: { id: 'r2-c4', content: 'Daily Automated' },
        c5: { id: 'r2-c5', content: 'Verified', bold: true }
      }
    }]

  }];


  // Theme styling resolver
  const getThemeStyles = (theme: 'navy' | 'slate' | 'emerald' | 'amber' | 'indigo') => {
    switch (theme) {
      case 'slate':
        return {
          headerBg: 'bg-slate-800',
          headerBorder: 'border-slate-700',
          badgeBg: 'bg-slate-100 text-slate-800 border-slate-300',
          kickerText: 'text-slate-500',
          titleText: 'text-slate-900',
          cardBg: 'from-slate-50 to-slate-100/50',
          borderAccent: 'border-slate-700'
        };
      case 'emerald':
        return {
          headerBg: 'bg-emerald-800',
          headerBorder: 'border-emerald-700',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          kickerText: 'text-emerald-700',
          titleText: 'text-emerald-950',
          cardBg: 'from-emerald-50/50 to-emerald-100/30',
          borderAccent: 'border-emerald-600'
        };
      case 'amber':
        return {
          headerBg: 'bg-[#92400E]',
          headerBorder: 'border-[#78350F]',
          badgeBg: 'bg-amber-50 text-[#EF7C00] border-amber-300',
          kickerText: 'text-[#EF7C00]',
          titleText: 'text-slate-900',
          cardBg: 'from-amber-50/40 to-orange-50/30',
          borderAccent: 'border-[#EF7C00]'
        };
      case 'indigo':
        return {
          headerBg: 'bg-indigo-900',
          headerBorder: 'border-indigo-800',
          badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-300',
          kickerText: 'text-indigo-600',
          titleText: 'text-indigo-950',
          cardBg: 'from-indigo-50/40 to-blue-50/30',
          borderAccent: 'border-indigo-600'
        };
      case 'navy':
      default:
        return {
          headerBg: 'bg-[#004077]',
          headerBorder: 'border-blue-900',
          badgeBg: 'bg-blue-50 text-[#004077] border-blue-200',
          kickerText: 'text-[#004077]',
          titleText: 'text-[#004077]',
          cardBg: 'from-blue-50/40 to-slate-50',
          borderAccent: 'border-[#004077]'
        };
    }
  };

  // Open Table Creation Setup / Wizard
  const handleOpenCreateTableSetup = (targetClientId?: number) => {
    const targetId = targetClientId || selectedClientId || (clients[0]?.id ?? 1);
    setSetupTargetClientId(targetId);
    setSetupMode('templates');
    setSetupSelectedTemplate('deliverables');
    const defaultPreset = TABLE_PRESETS[0];
    setSetupTitle(defaultPreset.name);
    setSetupKicker(defaultPreset.kicker);
    setSetupDesc(defaultPreset.desc);
    setSetupTheme(defaultPreset.theme);
    setSetupHeadlineAlign(defaultPreset.headlineAlign);
    setSetupColCount(4);
    setSetupRowCount(3);
    setSetupColHeaders(['Module / Item', 'Description & Scope', 'Timeline & SLA', 'Status']);
    setSetupIncludeSectionHeadline(true);
    setSetupSectionHeadlineText('PHASE 1: DISCOVERY & ARCHITECTURE');
    setViewMode('create_table_setup');
  };

  // Select a preset template inside the wizard
  const handleSelectPreset = (presetId: string) => {
    setSetupSelectedTemplate(presetId);
    const preset = TABLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSetupTitle(preset.name);
      setSetupKicker(preset.kicker);
      setSetupDesc(preset.desc);
      setSetupTheme(preset.theme);
      setSetupHeadlineAlign(preset.headlineAlign);
    }
  };

  // Handle column count change in custom setup mode
  const handleSetupColCountChange = (newCount: number) => {
    const count = Math.max(2, Math.min(8, newCount));
    setSetupColCount(count);
    const updated = [...setupColHeaders];
    if (count > updated.length) {
      for (let i = updated.length + 1; i <= count; i++) {
        updated.push(`Column ${i} Headline`);
      }
    } else {
      updated.length = count;
    }
    setSetupColHeaders(updated);
  };

  // Generate and launch into the Table Builder from Setup Wizard
  const handleGenerateNewTable = () => {
    const targetClient = clients.find((c) => c.id === setupTargetClientId) || clients[0];
    if (!targetClient) return;

    setSelectedClientId(targetClient.id);

    if (setupMode === 'templates') {
      const preset = TABLE_PRESETS.find((p) => p.id === setupSelectedTemplate) || TABLE_PRESETS[0];
      setTableTitle(setupTitle.trim() || preset.name);
      setTableKicker(setupKicker.trim() || preset.kicker);
      setTableDesc(setupDesc.trim() || preset.desc);
      setTableTheme(setupTheme || preset.theme);
      setTableHeadlineAlign(setupHeadlineAlign || preset.headlineAlign);
      setTableCols(preset.columns);
      setTableRows(preset.rows);
      setEditingTableFileId(null);
      setSelectedCellPos(null);
      setViewMode('table_builder');
    } else {
      // Custom blank mode with configured column headlines & optional section headline
      const generatedCols = setupColHeaders.map((headerText, idx) => ({
        id: `c${idx + 1}`,
        header: headerText.trim() || `Column ${idx + 1}`,
        align: idx === 0 ? 'left' as const : 'center' as const
      }));

      const generatedRows: CustomTableRow[] = [];

      if (setupIncludeSectionHeadline && setupSectionHeadlineText.trim()) {
        generatedRows.push({
          id: 'sec-1',
          isSectionHeadline: true,
          headlineText: setupSectionHeadlineText.trim(),
          headlineSubtitle: 'Section deliverables notes and specifications',
          headlineTheme: setupTheme === 'navy' ? 'navy' : setupTheme === 'emerald' ? 'emerald' : setupTheme === 'amber' ? 'amber' : 'slate',
          cells: {}
        });
      }

      for (let r = 1; r <= setupRowCount; r++) {
        const rowId = `r${r}`;
        const rowCells: Record<string, TableCellData> = {};
        generatedCols.forEach((col) => {
          rowCells[col.id] = {
            id: `${rowId}-${col.id}`,
            content: r === 1 ? col.id === 'c1' ? 'Deliverable Item 1' : 'Sample Specification' : ''
          };
        });
        generatedRows.push({
          id: rowId,
          cells: rowCells
        });
      }

      setTableTitle(setupTitle.trim() || 'Custom Document Table');
      setTableKicker(setupKicker.trim() || 'TECHNICAL SPECIFICATION');
      setTableDesc(setupDesc.trim());
      setTableTheme(setupTheme);
      setTableHeadlineAlign(setupHeadlineAlign);
      setTableCols(generatedCols);
      setTableRows(generatedRows);
      setEditingTableFileId(null);
      setSelectedCellPos(null);
      setViewMode('table_builder');
    }
  };

  // Open Table Builder (New or Edit Existing)
  const handleOpenTableBuilder = (existingFile?: StoredClientFile) => {
    if (existingFile && existingFile.table_data) {
      setEditingTableFileId(existingFile.id);
      setTableTitle(existingFile.table_data.title);
      setTableKicker(existingFile.table_data.headlineKicker || 'COMMERCIAL SPECIFICATION');
      setTableDesc(existingFile.table_data.description || '');
      setTableTheme(existingFile.table_data.theme || 'navy');
      setTableHeadlineAlign(existingFile.table_data.headlineAlign || 'left');
      setTableCols(existingFile.table_data.columns);
      setTableRows(existingFile.table_data.rows);
      setSelectedClientId(existingFile.client_id);
    } else {
      setEditingTableFileId(null);
      setTableTitle('Project Deliverables & Milestones Matrix');
      setTableKicker('TECHNICAL SPECIFICATION & SOW');
      setTableDesc('Scope of work specification, deliverables timeline, and SLA terms.');
      setTableTheme('navy');
      setTableHeadlineAlign('left');
    }
    setSelectedCellPos(null);
    setViewMode('table_builder');
  };

  // Add Section Headline Row across entire table width
  const handleAddSectionHeadline = (text?: string, subtitle?: string) => {
    const secCount = tableRows.filter((r) => r.isSectionHeadline).length + 1;
    const newRowId = `sec-${secCount}-${Date.now().toString().slice(-4)}`;
    const newSecRow: CustomTableRow = {
      id: newRowId,
      isSectionHeadline: true,
      headlineText: text || `PHASE ${secCount}: DELIVERABLES & SERVICE SPECIFICATION`,
      headlineSubtitle: subtitle || 'Key deliverables, SLA benchmarks, and acceptance criteria',
      headlineTheme: tableTheme === 'navy' ? 'navy' : tableTheme === 'emerald' ? 'emerald' : tableTheme === 'amber' ? 'amber' : 'slate',
      cells: {}
    };
    setTableRows([...tableRows, newSecRow]);
  };

  // Edit Section Headline content
  const handleSectionHeadlineChange = (rowId: string, text: string, subtitle?: string) => {
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        headlineText: text,
        headlineSubtitle: subtitle !== undefined ? subtitle : row.headlineSubtitle
      };
    }));
  };

  // Edit Section Headline theme
  const handleSectionHeadlineTheme = (rowId: string, theme: 'navy' | 'slate' | 'emerald' | 'amber' | 'blue') => {
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        headlineTheme: theme
      };
    }));
  };

  // Table Builder Operations: Add Row, Delete Row, Add Col, Delete Col, Merge
  const handleAddRow = () => {
    const newRowId = `r${tableRows.length + 1}-${Date.now().toString().slice(-4)}`;
    const newCells: Record<string, TableCellData> = {};
    tableCols.forEach((col) => {
      newCells[col.id] = {
        id: `${newRowId}-${col.id}`,
        content: ''
      };
    });
    setTableRows([...tableRows, { id: newRowId, cells: newCells }]);
  };

  const handleDeleteRow = (rowId: string) => {
    if (tableRows.length <= 1) {
      showPopup('Table must have at least one row or section headline.');
      return;
    }
    setTableRows(tableRows.filter((r) => r.id !== rowId));
  };

  const handleAddColumn = () => {
    const newColId = `c${tableCols.length + 1}-${Date.now().toString().slice(-4)}`;
    const newHeaderName = `Column ${tableCols.length + 1}`;
    setTableCols([...tableCols, { id: newColId, header: newHeaderName, align: 'left' }]);

    setTableRows(tableRows.map((row) => {
      if (row.isSectionHeadline) return row;
      return {
        ...row,
        cells: {
          ...row.cells,
          [newColId]: {
            id: `${row.id}-${newColId}`,
            content: ''
          }
        }
      };
    }));
  };

  const handleDeleteColumn = (colId: string) => {
    if (tableCols.length <= 1) {
      showPopup('Table must have at least one column.');
      return;
    }
    setTableCols(tableCols.filter((c) => c.id !== colId));
    setTableRows(tableRows.map((row) => {
      if (row.isSectionHeadline) return row;
      const copy = { ...row.cells };
      delete copy[colId];
      return { ...row, cells: copy };
    }));
  };

  const handleCellContentChange = (rowId: string, colId: string, text: string) => {
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      return {
        ...row,
        cells: {
          ...row.cells,
          [colId]: {
            ...row.cells[colId],
            content: text
          }
        }
      };
    }));
  };

  const handleHeaderChange = (colId: string, text: string) => {
    setTableCols(tableCols.map((col) => col.id === colId ? { ...col, header: text } : col));
  };

  // Merge Cells (Merge current selected cell with adjacent right cell)
  const handleMergeRight = () => {
    if (!selectedCellPos) {
      showPopup('Click a cell in the table to select it before merging.');
      return;
    }
    const { rowId, colId } = selectedCellPos;
    const colIdx = tableCols.findIndex((c) => c.id === colId);
    if (colIdx >= tableCols.length - 1) {
      showPopup('Cannot merge right: This is the last column.');
      return;
    }

    const nextCol = tableCols[colIdx + 1];
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      const currentCell = row.cells[colId];
      const targetCell = row.cells[nextCol.id];
      const currentSpan = currentCell.colSpan || 1;

      return {
        ...row,
        cells: {
          ...row.cells,
          [colId]: {
            ...currentCell,
            colSpan: currentSpan + 1,
            content: currentCell.content + (targetCell?.content ? ` / ${targetCell.content}` : '')
          },
          [nextCol.id]: {
            ...targetCell,
            isMergedHidden: true
          }
        }
      };
    }));
  };

  // Unmerge Cell
  const handleUnmergeCell = () => {
    if (!selectedCellPos) return;
    const { rowId, colId } = selectedCellPos;
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      const currentCell = row.cells[colId];
      const span = currentCell.colSpan || 1;

      const colIdx = tableCols.findIndex((c) => c.id === colId);
      const updatedCells = { ...row.cells };

      updatedCells[colId] = {
        ...currentCell,
        colSpan: 1
      };

      for (let i = 1; i < span; i++) {
        const nextCol = tableCols[colIdx + i];
        if (nextCol && updatedCells[nextCol.id]) {
          updatedCells[nextCol.id] = {
            ...updatedCells[nextCol.id],
            isMergedHidden: false
          };
        }
      }

      return {
        ...row,
        cells: updatedCells
      };
    }));
  };

  // Toggle Bold on Selected Cell
  const handleToggleBold = () => {
    if (!selectedCellPos) return;
    const { rowId, colId } = selectedCellPos;
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      const cell = row.cells[colId];
      return {
        ...row,
        cells: {
          ...row.cells,
          [colId]: {
            ...cell,
            bold: !cell.bold
          }
        }
      };
    }));
  };

  // Change Alignment of Selected Column / Cell
  const handleChangeAlign = (align: 'left' | 'center' | 'right') => {
    if (!selectedCellPos) return;
    const { rowId, colId } = selectedCellPos;
    setTableRows(tableRows.map((row) => {
      if (row.id !== rowId) return row;
      const cell = row.cells[colId];
      return {
        ...row,
        cells: {
          ...row.cells,
          [colId]: {
            ...cell,
            align
          }
        }
      };
    }));
  };

  // Save Table to Client Organization Folder
  const handleSaveTableToFolder = async () => {try {
      if (!selectedClient) return;

      const tableData: CustomTableData = {
        id: editingTableFileId ? `tbl-${editingTableFileId}` : `tbl-${Date.now()}`,
        title: tableTitle.trim() || 'Custom Document Table',
        headlineKicker: tableKicker.trim(),
        description: tableDesc.trim(),
        theme: tableTheme,
        headlineAlign: tableHeadlineAlign,
        columns: tableCols,
        rows: tableRows,
        created_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString().split('T')[0]
      };

      if (editingTableFileId) {
        const existing = clientFiles.find((f) => f.id === editingTableFileId);
        if (existing) {
          await onUpdateFile({
            ...existing,
            file_name: `${tableTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.table`,
            table_data: tableData,
            uploaded_at: new Date().toISOString().split('T')[0]
          });
        }
      } else {
        const newFile: StoredClientFile = {
          id: `file-tbl-${Date.now()}`,
          client_id: selectedClient.id,
          client_name: selectedClient.name,
          file_name: `${tableTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.table`,
          category: 'Custom Table',
          file_type: 'table',
          file_size: '32 KB',
          uploaded_at: new Date().toISOString().split('T')[0],
          uploaded_by: 'Varun Admin',
          reference_type: 'custom_table',
          tag: 'Interactive Table',
          table_data: tableData
        };
        await onAddFile(newFile);
      }

      setViewMode('folder_detail');
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Export Table as CSV
  const handleExportTableCSV = () => {
    const headerRow = tableCols.map((c) => `"${c.header.replace(/"/g, '""')}"`).join(',');
    const bodyRows = tableRows.map((r) => {
      if (r.isSectionHeadline) {
        const headline = `--- SECTION: ${r.headlineText || 'SECTION'} ${r.headlineSubtitle ? `(${r.headlineSubtitle})` : ''} ---`;
        return `"${headline.replace(/"/g, '""')}"` + ','.repeat(Math.max(0, tableCols.length - 1));
      }
      return tableCols.map((c) => {
        const cell = r.cells[c.id];
        const val = cell?.content || '';
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csvContent = `"${tableTitle.replace(/"/g, '""')}"\n"${tableKicker.replace(/"/g, '""')} - ${tableDesc.replace(/"/g, '""')}"\n\n${headerRow}\n${bodyRows}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tableTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper to render icon according to file type
  const renderFileIcon = (file: StoredClientFile) => {
    switch (file.file_type) {
      case 'pdf':
        return <FileText size={18} className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText size={18} className="text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet size={18} className="text-emerald-600" />;
      case 'table':
        return <TableIcon size={18} className="text-[#EF7C00]" />;
      default:
        return <File size={18} className="text-slate-500" />;
    }
  };

  // Filtered files inside folder
  const currentClientFiles = selectedClient ? getClientAllFiles(selectedClient.id) : [];
  const filteredClientFiles = currentClientFiles.filter((f) => {
    const matchesCategory = folderFileFilter === 'All' || f.category === folderFileFilter;
    const matchesSearch = searchQuery.trim() === '' ||
    f.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.tag && f.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.reference_id && String(f.reference_id).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Client Facebook Leads & Page logic
  const clientFbLeads = selectedClient ? (facebookLeads || []).filter((l) => l.client_id === selectedClient.id) : [];
  const filteredClientFbLeads = clientFbLeads.filter((l) => {
    const matchesStatus = leadStatusFilter === 'All' || l.status === leadStatusFilter;
    const matchesSearch = searchQuery.trim() === '' ||
    l.lead_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.lead_phone.includes(searchQuery) ||
    l.lead_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.service_requested && l.service_requested.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.city && l.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const clientFbPage = agencyFbPages.find((p) => p.page_id === selectedClient?.fb_page_id) || (selectedClient?.fb_page_name ? {
    page_id: selectedClient.fb_page_id || 'custom',
    page_name: selectedClient.fb_page_name,
    category: 'Business Page',
    lead_forms: selectedClient.fb_form_id ? [{ form_id: selectedClient.fb_form_id, form_name: selectedClient.fb_form_name || 'Lead Ads Form', leads_count: clientFbLeads.length }] : []
  } : null);

  const handleSimulateInboundLead = async () => {if (selectedClient) await onSyncFacebook?.(selectedClient.id);};

  const handleExportLeadsToDrive = async () => {try {
      if (!selectedClient || clientFbLeads.length === 0) return;
      const leadsReportFile: StoredClientFile = {
        id: `lead-doc-${Date.now()}`,
        client_id: selectedClient.id,
        client_name: selectedClient.name,
        file_name: `${selectedClient.name.replace(/[^a-zA-Z0-9]/g, '_')}_Facebook_Leads_Report.table`,
        category: 'Custom Table',
        file_type: 'table',
        file_size: `${Math.max(12, clientFbLeads.length * 4)} KB`,
        uploaded_at: new Date().toISOString().split('T')[0],
        uploaded_by: 'Meta Lead Gen Webhook',
        tag: 'Interactive Matrix',
        reference_type: 'custom_table',
        table_data: {
          id: `tbl-lead-${Date.now()}`,
          title: `${selectedClient.name} - Facebook Leads Report`,
          headlineKicker: 'Meta Lead Gen Inbound Data',
          description: `Captured Meta Inbound Leads from Facebook Page: ${selectedClient.fb_page_name || 'Official Page'}. Total: ${clientFbLeads.length} leads.`,
          theme: 'navy',
          columns: [
          { id: 'c1', header: 'Lead Name & Contact', align: 'left' },
          { id: 'c2', header: 'WhatsApp Mobile', align: 'left' },
          { id: 'c3', header: 'Email Address', align: 'left' },
          { id: 'c4', header: 'Inquired Service', align: 'left' },
          { id: 'c5', header: 'Budget Estimate', align: 'center' },
          { id: 'c6', header: 'Status', align: 'center' }],

          rows: clientFbLeads.map((lead, idx) => ({
            id: `r-${idx + 1}`,
            cells: {
              c1: { id: `r${idx + 1}-c1`, content: `${lead.lead_name} (${lead.city || 'India'})`, bold: true },
              c2: { id: `r${idx + 1}-c2`, content: lead.lead_phone },
              c3: { id: `r${idx + 1}-c3`, content: lead.lead_email },
              c4: { id: `r${idx + 1}-c4`, content: lead.service_requested || 'General Inquiry' },
              c5: { id: `r${idx + 1}-c5`, content: lead.budget || 'N/A' },
              c6: { id: `r${idx + 1}-c6`, content: lead.status, bold: true }
            }
          })),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };

      await onAddFile(leadsReportFile);
      triggerDndToast(
        'Exported Lead Sheet Document!',
        `Created table file "${leadsReportFile.file_name}" inside ${selectedClient.name}'s repository.`
      );
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Filtered Client Folders in Root View
  const filteredClientFolders = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
    c.client_code.toLowerCase().includes(q) ||
    c.city.toLowerCase().includes(q);
  });

  // Aggregate stats across all organizations
  const totalFilesAcrossClients = clients.reduce((acc, c) => acc + getClientAllFiles(c.id).length, 0);
  const totalQuotesAcrossClients = quotations.length;
  const totalInvoicesAcrossClients = invoices.length;
  const allFilesAcrossClients: StoredClientFile[] = clients.flatMap((c) => getClientAllFiles(c.id));

  /* =========================================================================
   * VIEW 0: FULL TABLE NEW CREATION OPTION WITH TABLE HEADLINES (Wizard & Setup)
   * ========================================================================= */
  if (viewMode === 'create_table_setup') {
    const targetClient = clients.find((c) => c.id === setupTargetClientId) || selectedClient || clients[0];
    const themeStyle = getThemeStyles(setupTheme);

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setViewMode(selectedClient ? 'folder_detail' : 'folders')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              {selectedClient ? `Back to ${selectedClient.name} Folder` : 'Back to All Folders'}
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
              <TableIcon size={20} className="text-[#EF7C00]" />
              <span>Full Table New Creation Option</span>
            </h2>
            <p className="text-xs text-slate-500">
              Configure complete document matrices, custom table headlines, kicker banners, column headers, and section groupings before editing.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Target Client Organization Folder Selector */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Building2 size={15} className="text-[#004077] shrink-0" />
              <div className="text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Client Folder:</span>
                <select
                  value={setupTargetClientId}
                  onChange={(e) => setSetupTargetClientId(Number(e.target.value))}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer">
                  
                  {clients.map((c) =>
                  <option key={c.id} value={c.id}>
                      {c.name} ({c.client_code})
                    </option>
                  )}
                </select>
              </div>
            </div>

            <ActionButton
              onClick={handleGenerateNewTable}
              className="px-5 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-2 shrink-0">
              
              <Sparkles size={14} />
              <span>Generate &amp; Open Table</span>
            </ActionButton>
          </div>
        </div>

        {/* Setup Mode Switcher Tabs */}
        <div className="flex items-center space-x-3 border-b border-slate-200 pb-1">
          <button
            type="button"
            onClick={() => setSetupMode('templates')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            setupMode === 'templates' ?
            'border-[#004077] text-[#004077]' :
            'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
            <LayoutGrid size={15} />
            <span>1. Production Schemas &amp; Presets ({TABLE_PRESETS.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSetupMode('custom')}
            className={`pb-2.5 px-4 text-xs font-bold transition flex items-center space-x-2 border-b-2 ${
            setupMode === 'custom' ?
            'border-[#004077] text-[#004077]' :
            'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
            <SlidersHorizontal size={15} />
            <span>2. Custom Grid &amp; Headline Designer</span>
          </button>
        </div>

        {/* TAB 1: PRESET SCHEMAS */}
        {setupMode === 'templates' &&
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TABLE_PRESETS.map((preset) => {
              const isSelected = setupSelectedTemplate === preset.id;
              const pTheme = getThemeStyles(preset.theme);

              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`p-5 rounded-2xl border transition cursor-pointer relative flex flex-col justify-between ${
                  isSelected ?
                  'border-[#004077] ring-2 ring-[#004077]/20 bg-blue-50/20 shadow-sm' :
                  'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'}`
                  }>
                  
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${pTheme.badgeBg}`}>
                          {preset.kicker}
                        </span>
                        {isSelected &&
                      <span className="w-5 h-5 rounded-full bg-[#004077] text-white flex items-center justify-center text-xs shadow-xs">
                            <Check size={12} />
                          </span>
                      }
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug">
                        {preset.name}
                      </h4>

                      <p className="text-xs text-slate-500 line-clamp-2">
                        {preset.desc}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-medium text-[#004077]">{preset.columns.length} Columns</span>
                        <span className="text-slate-400">&bull;</span>
                        <span>{preset.rows.filter((r) => r.isSectionHeadline).length} Section Headlines</span>
                        <span className="text-slate-400">&bull;</span>
                        <span>{preset.rows.filter((r) => !r.isSectionHeadline).length} Data Rows</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-medium text-slate-400 capitalize">Theme: {preset.theme}</span>
                      <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPreset(preset.id);
                      }}
                      className={`text-xs font-bold px-3 py-1 rounded-lg transition ${
                      isSelected ?
                      'bg-[#004077] text-white' :
                      'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                      }>
                      
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </div>);

            })}
            </div>
          </div>
        }

        {/* TAB 2: CUSTOM GRID DESIGNER */}
        {setupMode === 'custom' &&
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                  <Columns size={16} className="text-[#004077]" />
                  <span>Configure Column Headlines &amp; Grid Matrix</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Define how many columns to generate and name each column headline precisely.
                </p>
              </div>

              {/* Stepper controls for Columns & Rows */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-600">Columns:</span>
                  <div className="flex items-center space-x-1">
                    <button
                    type="button"
                    onClick={() => handleSetupColCountChange(setupColCount - 1)}
                    disabled={setupColCount <= 2}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40">
                    
                      -
                    </button>
                    <span className="font-bold text-xs text-[#004077] w-6 text-center">{setupColCount}</span>
                    <button
                    type="button"
                    onClick={() => handleSetupColCountChange(setupColCount + 1)}
                    disabled={setupColCount >= 8}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40">
                    
                      +
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-600">Initial Rows:</span>
                  <div className="flex items-center space-x-1">
                    <button
                    type="button"
                    onClick={() => setSetupRowCount(Math.max(1, setupRowCount - 1))}
                    disabled={setupRowCount <= 1}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40">
                    
                      -
                    </button>
                    <span className="font-bold text-xs text-[#004077] w-6 text-center">{setupRowCount}</span>
                    <button
                    type="button"
                    onClick={() => setSetupRowCount(Math.min(15, setupRowCount + 1))}
                    disabled={setupRowCount >= 15}
                    className="w-6 h-6 rounded-md bg-white border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40">
                    
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Column Headlines */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Column Headlines (&quot;Headlies&quot;) Labels:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {setupColHeaders.map((headerText, idx) =>
              <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Column #{idx + 1}</span>
                      <span className="text-[#004077] font-mono">col_{idx + 1}</span>
                    </div>
                    <input
                  type="text"
                  value={headerText}
                  onChange={(e) => {
                    const updated = [...setupColHeaders];
                    updated[idx] = e.target.value;
                    setSetupColHeaders(updated);
                  }}
                  placeholder={`Column ${idx + 1} Header`}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#004077]" />
                
                  </div>
              )}
              </div>
            </div>

            {/* Optional Section Headline Banner Checkbox */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200/60">
              <div className="flex items-start space-x-3">
                <input
                type="checkbox"
                id="includeSection"
                checked={setupIncludeSectionHeadline}
                onChange={(e) => setSetupIncludeSectionHeadline(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#004077] rounded focus:ring-[#004077]" />
              
                <div>
                  <label htmlFor="includeSection" className="font-bold text-xs text-slate-800 cursor-pointer">
                    Include Initial Section Headline Banner
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Inserts a high-contrast full-width section header row to categorize deliverables, phases, or milestone groupings.
                  </p>
                </div>
              </div>

              {setupIncludeSectionHeadline &&
            <input
              type="text"
              value={setupSectionHeadlineText}
              onChange={(e) => setSetupSectionHeadlineText(e.target.value)}
              placeholder="e.g. PHASE 1: DISCOVERY & ARCHITECTURE"
              className="w-full sm:w-80 p-2 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#EF7C00]" />

            }
            </div>
          </div>
        }

        {/* SHARED: TABLE HEADLINE & THEME CUSTOMIZATION CARD */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
              <Type size={16} className="text-[#004077]" />
              <span>Document Table Headlines &amp; Styling Theme</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">
              Changes reflect live in preview and exported documents
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Table Main Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Main Table Headline / Title *
              </label>
              <input
                type="text"
                value={setupTitle}
                onChange={(e) => {
                  setTableTitle(e.target.value);
                  setSetupTitle(e.target.value);
                }}
                placeholder="e.g. Project Deliverables & Scope Matrix"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            {/* Headline Kicker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Headline Kicker / Category Eyebrow
              </label>
              <input
                type="text"
                value={setupKicker}
                onChange={(e) => {
                  setTableKicker(e.target.value);
                  setSetupKicker(e.target.value);
                }}
                placeholder="e.g. TECHNICAL SPECIFICATION & SOW"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 uppercase tracking-wider focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            {/* Headline Alignment */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Headline Alignment
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSetupHeadlineAlign('left')}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
                  setupHeadlineAlign === 'left' ?
                  'bg-[#004077] text-white border-[#004077]' :
                  'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <AlignLeft size={13} />
                  <span>Left</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupHeadlineAlign('center')}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
                  setupHeadlineAlign === 'center' ?
                  'bg-[#004077] text-white border-[#004077]' :
                  'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <AlignCenter size={13} />
                  <span>Center</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupHeadlineAlign('right')}
                  className={`flex-1 p-2 rounded-xl text-xs font-bold border transition flex items-center justify-center space-x-1 ${
                  setupHeadlineAlign === 'right' ?
                  'bg-[#004077] text-white border-[#004077]' :
                  'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <AlignRight size={13} />
                  <span>Right</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scope / Description Subtitle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Scope Subtitle / Headline Description
              </label>
              <input
                type="text"
                value={setupDesc}
                onChange={(e) => {
                  setTableDesc(e.target.value);
                  setSetupDesc(e.target.value);
                }}
                placeholder="Scope of work specification, deliverables timeline, and SLA terms..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            {/* Color Theme Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Table Header Theme &amp; Color Scheme
              </label>
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setSetupTheme('navy')}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  setupTheme === 'navy' ?
                  'bg-[#004077] text-white border-[#004077] shadow-xs' :
                  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-[#004077] border border-white"></span>
                  <span>Navy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTheme('slate')}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  setupTheme === 'slate' ?
                  'bg-slate-800 text-white border-slate-800 shadow-xs' :
                  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800 border border-white"></span>
                  <span>Slate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTheme('emerald')}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  setupTheme === 'emerald' ?
                  'bg-emerald-800 text-white border-emerald-800 shadow-xs' :
                  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700 border border-white"></span>
                  <span>Emerald</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTheme('amber')}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  setupTheme === 'amber' ?
                  'bg-[#92400E] text-white border-[#92400E] shadow-xs' :
                  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF7C00] border border-white"></span>
                  <span>Amber</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSetupTheme('indigo')}
                  className={`p-2 rounded-xl border text-[11px] font-bold transition flex items-center justify-center space-x-1 ${
                  setupTheme === 'indigo' ?
                  'bg-indigo-900 text-white border-indigo-900 shadow-xs' :
                  'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`
                  }>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-700 border border-white"></span>
                  <span>Indigo</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE REAL-TIME TABLE PREVIEW CARD */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Live Table &amp; Headlines Preview
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Target Folder: <strong className="text-[#004077]">{targetClient.name}</strong>
            </span>
          </div>

          <div className="p-6 space-y-4">
            {/* Table Headline Banner in chosen Alignment */}
            <div className={`space-y-1 text-${setupHeadlineAlign}`}>
              {setupKicker &&
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${themeStyle.badgeBg}`}>
                  {setupKicker}
                </span>
              }
              <h3 className={`text-lg font-black tracking-tight ${themeStyle.titleText}`}>
                {setupTitle || 'Untitled Custom Table'}
              </h3>
              {setupDesc &&
              <p className="text-xs text-slate-500 max-w-2xl inline-block">
                  {setupDesc}
                </p>
              }
            </div>

            {/* Table Grid Mockup */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className={`${themeStyle.headerBg} text-white`}>
                    <th className={`p-2.5 ${themeStyle.headerBorder} border text-center w-10 text-[10px] font-mono text-white/70`}>#</th>
                    {(setupMode === 'templates' ?
                    TABLE_PRESETS.find((p) => p.id === setupSelectedTemplate)?.columns || TABLE_PRESETS[0].columns :
                    setupColHeaders.map((h, i) => ({ id: `c${i + 1}`, header: h, align: i === 0 ? 'left' as const : 'center' as const }))).
                    map((col, cIdx) =>
                    <th
                      key={cIdx}
                      className={`p-2.5 ${themeStyle.headerBorder} border font-bold text-${col.align} text-xs tracking-tight`}>
                      
                        {col.header}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {setupMode === 'templates' ?
                  (TABLE_PRESETS.find((p) => p.id === setupSelectedTemplate)?.rows.slice(0, 3) || []).map((row, rIdx) => {
                    if (row.isSectionHeadline) {
                      return (
                        <tr key={row.id} className="bg-slate-100/90 font-bold">
                            <td colSpan={10} className="p-2.5 text-xs text-slate-800 border-l-4 border-l-[#004077]">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#004077] text-white mr-2 uppercase">
                                Section Headline
                              </span>
                              {row.headlineText} &bull; <span className="text-[11px] font-normal text-slate-500">{row.headlineSubtitle}</span>
                            </td>
                          </tr>);

                    }
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px] bg-slate-50/50">{rIdx + 1}</td>
                          {TABLE_PRESETS.find((p) => p.id === setupSelectedTemplate)?.columns.map((col) =>
                        <td key={col.id} className="p-2 text-slate-700">
                              {row.cells[col.id]?.content || 'Sample Data'}
                            </td>
                        )}
                        </tr>);

                  }) :

                  <>
                      {setupIncludeSectionHeadline && setupSectionHeadlineText &&
                    <tr className="bg-slate-100/90 font-bold">
                          <td colSpan={setupColCount + 1} className="p-2.5 text-xs text-slate-800 border-l-4 border-l-[#004077]">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#004077] text-white mr-2 uppercase">
                              Section Headline
                            </span>
                            {setupSectionHeadlineText}
                          </td>
                        </tr>
                    }
                      {[1, 2].map((rNum) =>
                    <tr key={rNum} className="hover:bg-slate-50">
                          <td className="p-2 text-center text-slate-400 font-mono text-[11px] bg-slate-50/50">{rNum}</td>
                          {setupColHeaders.map((_, colIdx) =>
                      <td key={colIdx} className="p-2 text-slate-700">
                              {colIdx === 0 ? `Deliverable Item ${rNum}` : `Value ${rNum}-${colIdx + 1}`}
                            </td>
                      )}
                        </tr>
                    )}
                    </>
                  }
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <ActionButton
              type="button"
              onClick={() => setViewMode(selectedClient ? 'folder_detail' : 'folders')}
              className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition">
              
              Cancel
            </ActionButton>

            <ActionButton
              type="button"
              onClick={handleGenerateNewTable}
              className="px-6 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-2">
              
              <Sparkles size={14} />
              <span>Generate &amp; Open Table Builder &rarr;</span>
            </ActionButton>
          </div>
        </div>
      </div>);

  }

  /* =========================================================================
   * VIEW 1: INTERACTIVE TABLE BUILDER (Add Rows, Cols, Merge, Section Headlines)
   * ========================================================================= */
  if (viewMode === 'table_builder' && selectedClient) {
    const activeTheme = getThemeStyles(tableTheme);

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setViewMode('folder_detail')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to {selectedClient.name} Folder
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
              <TableIcon size={20} className="text-[#EF7C00]" />
              <span>Document &amp; Table Editor</span>
            </h2>
            <p className="text-xs text-slate-500">
              Manage table headlines, add rows, columns, and section headers, merge cells, and save directly into {selectedClient.name}&apos;s organization folder.
            </p>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <ActionButton
              onClick={handleExportTableCSV}
              className="px-3 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition flex items-center space-x-1.5"
              title="Download table data as CSV">
              
              <Download size={13} />
              <span>Export CSV</span>
            </ActionButton>
            <ActionButton
              onClick={() => window.print()}
              className="px-3 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition flex items-center space-x-1.5">
              
              <Printer size={13} />
              <span>Print</span>
            </ActionButton>
            <ActionButton
              onClick={handleSaveTableToFolder}
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5">
              
              <Check size={14} />
              <span>Save Table to Folder</span>
            </ActionButton>
          </div>
        </div>

        {/* Table Headline & Metadata Header Card */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Document / Table Main Headline *</label>
              <input
                type="text"
                value={tableTitle}
                onChange={(e) => setTableTitle(e.target.value)}
                placeholder="e.g. Scope Matrix, Milestone Schedule..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Headline Kicker / Category Eyebrow</label>
              <input
                type="text"
                value={tableKicker}
                onChange={(e) => setTableKicker(e.target.value)}
                placeholder="e.g. TECHNICAL SPECIFICATION & SOW"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 uppercase tracking-wider focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scope / Subtitle Notes</label>
              <input
                type="text"
                value={tableDesc}
                onChange={(e) => setTableDesc(e.target.value)}
                placeholder="Brief description or purpose of this table..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>
          </div>

          {/* Quick Styling Bar: Theme & Alignment */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Theme Scheme:</span>
              <button
                type="button"
                onClick={() => setTableTheme('navy')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                tableTheme === 'navy' ? 'bg-[#004077] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                }>
                
                <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                <span>Navy</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTheme('slate')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                tableTheme === 'slate' ? 'bg-slate-800 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                }>
                
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                <span>Slate</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTheme('emerald')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                tableTheme === 'emerald' ? 'bg-emerald-800 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                }>
                
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Emerald</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTheme('amber')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                tableTheme === 'amber' ? 'bg-[#92400E] text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                }>
                
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Amber</span>
              </button>
              <button
                type="button"
                onClick={() => setTableTheme('indigo')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                tableTheme === 'indigo' ? 'bg-indigo-900 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`
                }>
                
                <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                <span>Indigo</span>
              </button>
            </div>

            <div className="flex items-center space-x-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Headline Align:</span>
              <button
                type="button"
                onClick={() => setTableHeadlineAlign('left')}
                className={`px-2 py-1 rounded text-xs font-bold ${tableHeadlineAlign === 'left' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                
                Left
              </button>
              <button
                type="button"
                onClick={() => setTableHeadlineAlign('center')}
                className={`px-2 py-1 rounded text-xs font-bold ${tableHeadlineAlign === 'center' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                
                Center
              </button>
              <button
                type="button"
                onClick={() => setTableHeadlineAlign('right')}
                className={`px-2 py-1 rounded text-xs font-bold ${tableHeadlineAlign === 'right' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                
                Right
              </button>
            </div>
          </div>

          {/* Table Operations Toolbar */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Structure:</span>
              <ActionButton
                type="button"
                onClick={handleAddRow}
                className="px-3 py-1.5 bg-[#004077] hover:bg-[#00305a] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1 shadow-xs">
                
                <Rows size={13} />
                <span>+ Add Row</span>
              </ActionButton>
              <ActionButton
                type="button"
                onClick={handleAddColumn}
                className="px-3 py-1.5 bg-[#004077] hover:bg-[#00305a] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1 shadow-xs">
                
                <Columns size={13} />
                <span>+ Add Column</span>
              </ActionButton>
              <ActionButton
                type="button"
                onClick={() => handleAddSectionHeadline()}
                className="px-3 py-1.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-lg transition flex items-center space-x-1 shadow-xs"
                title="Add a full-width section headline bar">
                
                <ListPlus size={13} />
                <span>+ Add Section Headline</span>
              </ActionButton>

              <div className="h-5 w-px bg-slate-300 mx-1 hidden sm:block"></div>

              {/* Cell Formatting Tools */}
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Cell Tools:</span>
              <button
                type="button"
                onClick={handleMergeRight}
                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                selectedCellPos ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`
                }
                title="Merge selected cell with the cell to its right">
                
                <Layers size={13} />
                <span>Merge Right &rarr;</span>
              </button>
              <button
                type="button"
                onClick={handleUnmergeCell}
                className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition ${
                selectedCellPos ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`
                }
                title="Unmerge selected cell">
                
                <span>Split / Unmerge</span>
              </button>
              <button
                type="button"
                onClick={handleToggleBold}
                className={`px-2.5 py-1.5 border rounded-lg text-xs font-black transition ${
                selectedCellPos ? 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-300' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'}`
                }
                title="Toggle Bold">
                
                B
              </button>
              <button
                type="button"
                onClick={() => handleChangeAlign('left')}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
                title="Align Left">
                
                Left
              </button>
              <button
                type="button"
                onClick={() => handleChangeAlign('center')}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
                title="Align Center">
                
                Center
              </button>
              <button
                type="button"
                onClick={() => handleChangeAlign('right')}
                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs hover:bg-slate-100"
                title="Align Right">
                
                Right
              </button>
            </div>

            <div className="text-[11px] text-slate-400 italic">
              Click any cell to edit directly or use merge tools.
            </div>
          </div>
        </div>

        {/* Live Interactive Table Grid */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
          {/* Visual Table Headline Banner */}
          <div className={`p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-${tableHeadlineAlign}`}>
            <div className="space-y-0.5">
              {tableKicker &&
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border ${activeTheme.badgeBg}`}>
                  {tableKicker}
                </span>
              }
              <h3 className={`text-base font-black tracking-tight ${activeTheme.titleText}`}>
                {tableTitle}
              </h3>
              {tableDesc &&
              <p className="text-xs text-slate-500">
                  {tableDesc}
                </p>
              }
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                {tableRows.length} Rows &bull; {tableCols.length} Columns
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-slate-500 font-medium">
                Client: <strong className="text-[#004077]">{selectedClient.name}</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className={`${activeTheme.headerBg} text-white`}>
                  <th className={`p-2.5 ${activeTheme.headerBorder} border text-center w-12 text-[10px] font-mono text-white/70`}>
                    #
                  </th>
                  {tableCols.map((col) =>
                  <th
                    key={col.id}
                    className={`p-2.5 ${activeTheme.headerBorder} border font-bold text-left relative group min-w-[150px]`}>
                    
                      <div className="flex items-center justify-between space-x-1">
                        <input
                        type="text"
                        value={col.header}
                        onChange={(e) => handleHeaderChange(col.id, e.target.value)}
                        className="bg-transparent text-white font-bold text-xs focus:bg-white/20 focus:outline-none px-1 rounded w-full"
                        title="Click to edit column headline" />
                      
                        <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="text-white/60 hover:text-rose-300 p-1 opacity-60 group-hover:opacity-100 transition shrink-0"
                        title="Delete Column">
                        
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </th>
                  )}
                  <th className={`p-2.5 ${activeTheme.headerBorder} border text-center w-12 text-[10px] font-mono text-white/70`}>
                    Act
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, rIdx) => {
                  // If row is a Section Headline Banner
                  if (row.isSectionHeadline) {
                    const secBg = row.headlineTheme === 'emerald' ? 'bg-emerald-50/90 border-l-4 border-l-emerald-600' :
                    row.headlineTheme === 'amber' ? 'bg-amber-50/90 border-l-4 border-l-[#EF7C00]' :
                    row.headlineTheme === 'slate' ? 'bg-slate-100 border-l-4 border-l-slate-700' :
                    row.headlineTheme === 'blue' ? 'bg-blue-50/90 border-l-4 border-l-blue-600' :
                    'bg-[#004077]/10 border-l-4 border-l-[#004077]';
                    const tagBg = row.headlineTheme === 'emerald' ? 'bg-emerald-700 text-white' :
                    row.headlineTheme === 'amber' ? 'bg-[#EF7C00] text-white' :
                    row.headlineTheme === 'slate' ? 'bg-slate-800 text-white' :
                    row.headlineTheme === 'blue' ? 'bg-blue-700 text-white' :
                    'bg-[#004077] text-white';

                    return (
                      <tr key={row.id} className="border border-slate-300">
                        <td colSpan={tableCols.length + 2} className={`p-2 sm:p-2.5 ${secBg}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase inline-block shrink-0 ${tagBg}`}>
                                Section Headline
                              </span>
                              <input
                                type="text"
                                value={row.headlineText || ''}
                                onChange={(e) => handleSectionHeadlineChange(row.id, e.target.value)}
                                placeholder="Section Headline Title (e.g. PHASE 1: DISCOVERY & ARCHITECTURE)..."
                                className="font-black text-xs text-slate-900 bg-white/70 border border-slate-300/80 rounded px-2 py-1 w-full sm:w-72 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#004077]" />
                              
                              <input
                                type="text"
                                value={row.headlineSubtitle || ''}
                                onChange={(e) => handleSectionHeadlineChange(row.id, row.headlineText || '', e.target.value)}
                                placeholder="Optional subtitle / scope notes..."
                                className="text-[11px] text-slate-600 bg-white/60 border border-slate-200 rounded px-2 py-1 flex-1 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#004077]" />
                              
                            </div>
                            <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Theme:</span>
                              <button
                                type="button"
                                onClick={() => handleSectionHeadlineTheme(row.id, 'navy')}
                                className={`w-4 h-4 rounded-full bg-[#004077] border transition ${row.headlineTheme === 'navy' ? 'ring-2 ring-offset-1 ring-[#004077]' : 'opacity-70 hover:opacity-100'}`}
                                title="Corporate Navy" />
                              
                              <button
                                type="button"
                                onClick={() => handleSectionHeadlineTheme(row.id, 'emerald')}
                                className={`w-4 h-4 rounded-full bg-emerald-700 border transition ${row.headlineTheme === 'emerald' ? 'ring-2 ring-offset-1 ring-emerald-700' : 'opacity-70 hover:opacity-100'}`}
                                title="Emerald Theme" />
                              
                              <button
                                type="button"
                                onClick={() => handleSectionHeadlineTheme(row.id, 'amber')}
                                className={`w-4 h-4 rounded-full bg-[#EF7C00] border transition ${row.headlineTheme === 'amber' ? 'ring-2 ring-offset-1 ring-[#EF7C00]' : 'opacity-70 hover:opacity-100'}`}
                                title="Warm Amber" />
                              
                              <button
                                type="button"
                                onClick={() => handleSectionHeadlineTheme(row.id, 'slate')}
                                className={`w-4 h-4 rounded-full bg-slate-800 border transition ${row.headlineTheme === 'slate' ? 'ring-2 ring-offset-1 ring-slate-800' : 'opacity-70 hover:opacity-100'}`}
                                title="Charcoal Slate" />
                              
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row.id)}
                                className="text-slate-400 hover:text-red-600 p-1 transition ml-1"
                                title="Delete Section Headline">
                                
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>);

                  }

                  // Regular Data Row
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-2 border border-slate-200 text-center font-mono text-slate-400 text-[11px] bg-slate-50">
                        {rIdx + 1}
                      </td>

                      {tableCols.map((col) => {
                        const cell = row.cells[col.id];
                        if (cell?.isMergedHidden) return null; // absorbed by colSpan

                        const isSelected = selectedCellPos?.rowId === row.id && selectedCellPos?.colId === col.id;

                        return (
                          <td
                            key={col.id}
                            colSpan={cell?.colSpan || 1}
                            rowSpan={cell?.rowSpan || 1}
                            onClick={() => setSelectedCellPos({ rowId: row.id, colId: col.id })}
                            className={`p-2 border border-slate-200 transition cursor-text relative ${
                            isSelected ?
                            'ring-2 ring-[#004077] bg-blue-50/50' :
                            'hover:bg-blue-50/30'} ${
                            cell?.bold ? 'font-bold' : 'font-normal'} text-${cell?.align || col.align || 'left'}`}>
                            
                            <input
                              type="text"
                              value={cell?.content || ''}
                              onChange={(e) => handleCellContentChange(row.id, col.id, e.target.value)}
                              className={`w-full bg-transparent focus:outline-none text-xs text-${cell?.align || col.align || 'left'} ${
                              cell?.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`
                              }
                              placeholder="Type here..." />
                            
                            {(cell?.colSpan || 1) > 1 &&
                            <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-amber-600 bg-amber-100 px-1 rounded pointer-events-none">
                                Span {cell.colSpan}
                              </span>
                            }
                          </td>);

                      })}

                      <td className="p-2 border border-slate-200 text-center bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition"
                          title="Delete Row">
                          
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>);

                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-slate-500">
              <Info size={14} className="text-[#004077]" />
              <span>Use <strong>&quot;+ Add Row&quot;</strong>, <strong>&quot;+ Add Column&quot;</strong> or <strong>&quot;+ Add Section Headline&quot;</strong> to structure your matrix. Click cell then <strong>&quot;Merge Right&quot;</strong> to span.</span>
            </div>
            <ActionButton
              onClick={handleSaveTableToFolder}
              className="px-4 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs transition shadow-xs">
              
              Save to {selectedClient.name}
            </ActionButton>
          </div>
        </div>
      </div>);

  }

  /* =========================================================================
   * VIEW 2: DEDICATED FILE UPLOAD SCREEN (PDF, DOC, XLS, Agreement, Brief)
   * ========================================================================= */
  if (viewMode === 'upload' && selectedClient) {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setViewMode('folder_detail')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to {selectedClient.name} Folder
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
              <FileUp size={20} className="text-[#EF7C00]" />
              <span>Upload Document to {selectedClient.name} Folder</span>
            </h2>
            
          </div>
        </div>

        {/* Upload Container */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8 max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSaveUploadedFile} className="space-y-5 text-xs">
            
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
              dragActive ?
              'border-[#EF7C00] bg-orange-50/50 scale-[1.01]' :
              'border-slate-300 hover:border-[#004077] hover:bg-slate-50'}`
              }>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg" />
              

              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004077] shadow-inner">
                <Upload size={24} />
              </div>

              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {uploadFormData.fileName ?
                  <span className="text-emerald-700 flex items-center justify-center space-x-1">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span>{uploadFormData.fileName}</span>
                    </span> :

                  'Click to select file or drag & drop here'
                  }
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Supports PDF, Word (.docx), Excel (.xlsx), Text, and Images (up to 25 MB)
                </p>
              </div>

              {uploadFormData.fileName &&
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  Size: {uploadFormData.displaySize} &bull; Type: {uploadFormData.fileType.toUpperCase()}
                </span>
              }
            </div>

            {/* Form Fields */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Document Display Title *</label>
              <input
                type="text"
                required
                value={uploadFormData.fileName}
                onChange={(e) => setUploadFormData({ ...uploadFormData, fileName: e.target.value })}
                placeholder="e.g. Master_Service_Agreement_2026.pdf"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Classification Tag</label>
                <select
                  value={uploadFormData.tag}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, tag: e.target.value })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#004077]">
                  
                  <option value="Client Agreement">Client Agreement / NDA</option>
                  <option value="Technical Proposal">Technical Proposal / SOW</option>
                  <option value="KYC Documentation">KYC &amp; Registration Docs</option>
                  <option value="Tax & GST Filing">Tax &amp; GST Documents</option>
                  <option value="Brand Assets">Brand Assets &amp; Guidelines</option>
                  <option value="Meeting Minutes">Meeting Minutes &amp; Brief</option>
                  <option value="General Document">General Document</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Format Category</label>
                <select
                  value={uploadFormData.fileType}
                  onChange={(e) => setUploadFormData({ ...uploadFormData, fileType: e.target.value as any })}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#004077]">
                  
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="docx">Microsoft Word (.docx)</option>
                  <option value="xlsx">Excel Spreadsheet (.xlsx)</option>
                  <option value="image">Image Asset (.png, .jpg)</option>
                  <option value="other">Other File</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Internal Reference Notes (Optional)</label>
              <textarea
                rows={3}
                value={uploadFormData.notes}
                onChange={(e) => setUploadFormData({ ...uploadFormData, notes: e.target.value })}
                placeholder="Signed by authorized director on 15-March, countersigned by agency..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
              <ActionButton
                type="button"
                onClick={() => setViewMode('folder_detail')}
                className="px-5 py-2.5 border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition">
                
                Cancel
              </ActionButton>
              <ActionButton
                type="submit"
                className="px-6 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white rounded-xl font-bold transition shadow-sm flex items-center space-x-1.5">
                
                <Check size={14} />
                <span>Upload &amp; Save File</span>
              </ActionButton>
            </div>
          </form>
        </div>
      </div>);

  }

  /* =========================================================================
   * VIEW 3: IN-PAGE FILE PREVIEW (No Modals)
   * ========================================================================= */
  if (viewMode === 'preview_file' && previewFile && selectedClient) {
    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Navigation Header */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setViewMode('folder_detail')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to {selectedClient.name} Folder
            </ActionButton>
            <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
              {renderFileIcon(previewFile)}
              <span>{previewFile.file_name}</span>
            </h2>
            <p className="text-xs text-slate-500">
              {previewFile.category} &bull; Stored in {selectedClient.name} Drive &bull; Uploaded {previewFile.uploaded_at}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <ActionButton
              onClick={() => downloadClientFile(previewFile, quotations, invoices)}
              className="px-4 py-2 bg-[#004077] hover:bg-[#00305a] text-white font-bold rounded-xl text-xs shadow-sm transition flex items-center space-x-1.5">
              
              <Download size={13} />
              <span>Download File</span>
            </ActionButton>
            <ActionButton
              onClick={() => window.print()}
              className="px-3 py-2 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition flex items-center space-x-1.5">
              
              <Printer size={13} />
              <span>Print</span>
            </ActionButton>
          </div>
        </div>

        {/* Preview Container */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs p-6 sm:p-8 space-y-6">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                {renderFileIcon(previewFile)}
              </div>
              <div>
                <h4 className="font-bold text-slate-800">{previewFile.file_name}</h4>
                <p className="text-slate-500 text-[11px]">
                  File Size: {previewFile.file_size} &bull; Classification: {previewFile.tag || previewFile.category}
                </p>
              </div>
            </div>
            {previewFile.reference_id &&
            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#004077] rounded-lg font-mono font-bold text-xs">
                Ref: {previewFile.reference_id}
              </span>
            }
          </div>

          {previewFile.notes && <p className="text-sm whitespace-pre-wrap"><strong>Notes: </strong>{previewFile.notes}</p>}
          {previewFile.file_url && previewFile.file_type === 'pdf' && <iframe title="PDF file preview" src={previewFile.file_url+'&inline=1'} className="w-full h-[650px] border rounded-xl" />}
          {previewFile.file_url && previewFile.file_type === 'image' && <img alt={previewFile.file_name} src={previewFile.file_url+'&inline=1'} className="max-w-full max-h-[650px] mx-auto" />}
          {/* Document Content View */}
          {previewFile.table_data ?
          <div className="space-y-4">
              <h3 className="font-bold text-base text-[#004077]">{previewFile.table_data.title}</h3>
              {previewFile.table_data.description &&
            <p className="text-xs text-slate-500">{previewFile.table_data.description}</p>
            }
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-[#004077] text-white">
                    <tr>
                      {previewFile.table_data.columns.map((c) =>
                    <th key={c.id} className="py-2.5 px-3 text-left font-bold">{c.header}</th>
                    )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewFile.table_data.rows.map((r) =>
                  <tr key={r.id} className="hover:bg-slate-50">
                        {r.isSectionHeadline ? <td colSpan={previewFile.table_data!.columns.length} className="bg-slate-100 p-3"><strong>{r.headlineText}</strong><p>{r.headlineSubtitle}</p></td> : previewFile.table_data!.columns.map((c) => {
                      const cell = r.cells[c.id];
                      if (cell?.isMergedHidden) return null;
                      return (
                        <td
                          key={c.id}
                          colSpan={cell?.colSpan || 1}
                          rowSpan={cell?.rowSpan || 1}
                          className={`py-2.5 px-3 ${cell?.bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                          
                              {cell?.content || ''}
                            </td>);

                    })}
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
              <ActionButton
              onClick={() => handleOpenTableBuilder(previewFile)}
              className="px-4 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold rounded-xl text-xs transition">
              
                Open &amp; Edit This Table
              </ActionButton>
            </div> :

          <div className="p-12 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#004077] flex items-center justify-center mx-auto shadow-inner">
                {renderFileIcon(previewFile)}
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-slate-800 text-sm">Document File Preview</h4>
                <p className="text-xs text-slate-500 mt-1">
                  This document ({previewFile.file_name}) is securely stored in {selectedClient.name}&apos;s organization repository.
                </p>
                {previewFile.category === 'Quotation' && onNavigateToQuotation && previewFile.reference_id &&
              <ActionButton
                onClick={() => onNavigateToQuotation(String(previewFile.reference_id))}
                className="mt-3 px-4 py-2 bg-[#004077] text-white rounded-xl font-bold text-xs hover:bg-[#00305a] transition inline-flex items-center space-x-1.5">
                
                    <FileSpreadsheet size={14} />
                    <span>View Interactive Quotation Proposal</span>
                  </ActionButton>
              }
                {previewFile.category === 'Invoice' && onNavigateToInvoice && previewFile.reference_id &&
              <ActionButton
                onClick={() => onNavigateToInvoice(String(previewFile.reference_id))}
                className="mt-3 px-4 py-2 bg-[#004077] text-white rounded-xl font-bold text-xs hover:bg-[#00305a] transition inline-flex items-center space-x-1.5">
                
                    <Receipt size={14} />
                    <span>View GST Tax Invoice</span>
                  </ActionButton>
              }
              </div>
            </div>
          }
        </div>
      </div>);

  }

  /* =========================================================================
   * VIEW 4: INSIDE CLIENT ORGANIZATION FOLDER
   * ========================================================================= */
  if (viewMode === 'folder_detail' && selectedClient) {
    const clientQuotesCount = currentClientFiles.filter((f) => f.category === 'Quotation').length;
    const clientInvoicesCount = currentClientFiles.filter((f) => f.category === 'Invoice').length;
    const clientDocsCount = currentClientFiles.filter((f) => f.category === 'Uploaded Document').length;
    const clientTablesCount = currentClientFiles.filter((f) => f.category === 'Custom Table').length;

    return (
      <div className="space-y-6 animate-in fade-in">
        {/* Toast Alert */}
        {dndToast &&
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-sm">{dndToast.message}</span>
                {dndToast.sub && <p className="text-slate-600 mt-0.5 font-normal">{dndToast.sub}</p>}
              </div>
            </div>
            <button onClick={() => setDndToast(null)} className="p-1 text-emerald-700 hover:text-emerald-950">
              <X size={15} />
            </button>
          </div>
        }

        {/* Drag Active Guide Banner */}
        {draggedDoc &&
        <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-[#EF7C00] rounded-2xl text-xs flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-[#EF7C00] shrink-0">
                <Move size={18} />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  Moving: <span className="text-[#004077] underline">{draggedDoc.file_name}</span>
                </span>
                <p className="text-slate-600 text-xs mt-0.5">
                  Drop onto any Sub-Category Tag pill, Category Tab, or Project Folder below to complete re-categorization.
                </p>
              </div>
            </div>
            <ActionButton
            onClick={handleDocDragEnd}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs">
            
              Cancel
            </ActionButton>
          </div>
        }

        {/* In-page Accessible Move / Re-categorize Form */}
        {reclassifyingDoc &&
        <div className="bg-white p-5 rounded-2xl border-2 border-[#004077] shadow-md space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#004077] flex items-center justify-center">
                  <ArrowRightLeft size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#004077]">Re-categorize / Move Document</h3>
                  <p className="text-xs text-slate-500">File: <strong className="text-slate-800">{reclassifyingDoc.file_name}</strong></p>
                </div>
              </div>
              <button onClick={() => setReclassifyingDoc(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Target Client Organization</label>
                <select
                value={reclassTargetClientId}
                onChange={(e) => setReclassTargetClientId(Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  {clients.map((c) =>
                <option key={c.id} value={c.id}>
                      {c.name} ({c.client_code})
                    </option>
                )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Primary Category</label>
                <select
                value={reclassTargetCategory}
                onChange={(e) => setReclassTargetCategory(e.target.value as FileCategory)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Quotation">Quotation (Commercial Proposal)</option>
                  <option value="Invoice">Invoice (GST Tax Invoice)</option>
                  <option value="Uploaded Document">Uploaded Document (File / Asset)</option>
                  <option value="Custom Table">Custom Table (Data Grid)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Sub-Category Tag</label>
                <select
                value={reclassTargetTag}
                onChange={(e) => setReclassTargetTag(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  {DOCUMENT_SUB_CATEGORIES.map((sc) =>
                <option key={sc.tag} value={sc.tag}>
                      {sc.label}
                    </option>
                )}
                </select>
              </div>
            </div>

            {projects && projects.length > 0 &&
          <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Associate with Project Sub-Folder (Optional)
                </label>
                <select
              value={reclassTargetProjectId}
              onChange={(e) => setReclassTargetProjectId(e.target.value ? Number(e.target.value) : '')}
              className="w-full sm:w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800">
              
                  <option value="">-- No specific project (General client folder) --</option>
                  {projects.filter((p) => p.client_id === reclassTargetClientId).map((p) =>
              <option key={p.id} value={p.id}>
                      {p.project_title}
                    </option>
              )}
                </select>
              </div>
          }

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <ActionButton
              onClick={() => setReclassifyingDoc(null)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50">
              
                Cancel
              </ActionButton>
              <ActionButton
              onClick={handleExecuteReclass}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00305a] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-xs">
              
                <Check size={14} />
                <span>Save &amp; Transfer File</span>
              </ActionButton>
            </div>
          </div>
        }

        {/* Breadcrumb & Navigation */}
        <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <ActionButton
              onClick={() => setViewMode('folders')}
              className="inline-flex items-center text-xs font-bold text-[#004077] hover:text-[#EF7C00] transition group mb-1">
              
              <ArrowLeft size={14} className="mr-1.5 group-hover:-translate-x-1 transition-transform" />
              Back to All Organization Folders
            </ActionButton>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004077] shadow-xs">
                <FolderOpen size={22} className="text-[#EF7C00]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
                  <span>{selectedClient.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {selectedClient.client_code}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Contact: {selectedClient.contact_person} &bull; {selectedClient.email} &bull; {selectedClient.city}
                </p>
              </div>
            </div>
          </div>

          {/* Action CTAs: Upload File, Create Table, Prepare Quotation */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <ActionButton
              onClick={handleStartUpload}
              className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs">
              
              <Upload size={14} className="text-[#004077]" />
              <span>+ Upload File (Doc/PDF)</span>
            </ActionButton>

            <ActionButton
              onClick={() => handleOpenCreateTableSetup(selectedClient.id)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-[#004077] border border-blue-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs">
              
              <TableIcon size={14} className="text-[#EF7C00]" />
              <span>+ Create Table</span>
            </ActionButton>

            {onPrepareQuotationForClient &&
            <ActionButton
              onClick={() => onPrepareQuotationForClient(selectedClient.id)}
              className="px-4 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5">
              
                <FileSpreadsheet size={14} />
                <span>+ Prepare Quote</span>
              </ActionButton>
            }
          </div>
        </div>

        {/* Facebook Page Mapping & WhatsApp Business Hub Banner */}
        <div className="bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-emerald-50/40 p-4 rounded-2xl border border-blue-200 shadow-2xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-[#1877F2] text-white flex items-center justify-center shadow-sm shrink-0">
                <Megaphone size={22} />
              </div>
              <div>
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Connected Facebook Page:</span>
                  <span className="text-xs font-black text-[#004077] bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
                    {selectedClient.fb_page_name || 'No Facebook Page Connected'}
                  </span>
                  {selectedClient.fb_page_id &&
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ID: {selectedClient.fb_page_id}
                    </span>
                  }
                  {selectedClient.fb_form_name &&
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Form: {selectedClient.fb_form_name}
                    </span>
                  }
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Meta Lead Ads route directly into this individual folder. Total captured: <strong className="text-[#004077]">{clientFbLeads.length} leads</strong> &bull; WhatsApp Integration: <span className="font-semibold text-emerald-700">Active</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              <ActionButton
                onClick={() => setShowPagePickerModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                title="Choose which Facebook Page routes leads to this client">
                
                <Share2 size={13} className="text-[#1877F2]" />
                <span>{selectedClient.fb_page_id ? 'Change Page' : 'Choose Page'}</span>
              </ActionButton>

              <ActionButton
                onClick={handleSimulateInboundLead}
                className="px-3 py-1.5 bg-blue-100/90 hover:bg-blue-200 text-[#004077] text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                title="Fetch leads from the connected Meta account">
                
                <Plus size={13} className="text-[#EF7C00]" />
                <span>Synchronize FB Leads</span>
              </ActionButton>

              {onOpenWhatsAppModal &&
              <button
                onClick={() => onOpenWhatsAppModal({
                  name: selectedClient.contact_person,
                  phone: selectedClient.mobile,
                  clientName: selectedClient.name,
                  clientId: selectedClient.id
                })}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs">
                
                  <MessageSquare size={13} />
                  <span>WhatsApp Account</span>
                </button>
              }

              <ActionButton
                onClick={() => setFolderFileFilter(folderFileFilter === 'Facebook Leads' ? 'All' : 'Facebook Leads')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                folderFileFilter === 'Facebook Leads' ?
                'bg-[#1877F2] text-white shadow-xs' :
                'bg-white text-[#1877F2] border border-blue-300 hover:bg-blue-50 shadow-2xs'}`
                }>
                
                <Megaphone size={13} />
                <span>{folderFileFilter === 'Facebook Leads' ? 'View All Files' : `FB Leads (${clientFbLeads.length})`}</span>
              </ActionButton>
            </div>
          </div>
        </div>

        {/* Folder Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commercial Quotes</span>
            <span className="text-lg font-black text-[#004077] mt-0.5 block">{clientQuotesCount}</span>
            <span className="text-[10px] text-slate-500">Auto-indexed</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Generated Invoices</span>
            <span className="text-lg font-black text-emerald-700 mt-0.5 block">{clientInvoicesCount}</span>
            <span className="text-[10px] text-slate-500">Auto-generated</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Uploaded Documents</span>
            <span className="text-lg font-black text-blue-700 mt-0.5 block">{clientDocsCount}</span>
            <span className="text-[10px] text-slate-500">PDFs, Word, KYC</span>
          </div>
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custom Tables</span>
            <span className="text-lg font-black text-[#EF7C00] mt-0.5 block">{clientTablesCount}</span>
            <span className="text-[10px] text-slate-500">Interactive grids</span>
          </div>
          <div
            onClick={() => setFolderFileFilter('Facebook Leads')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
            folderFileFilter === 'Facebook Leads' ?
            'bg-blue-50 border-[#1877F2] ring-2 ring-blue-300 shadow-xs' :
            'bg-white border-slate-200 hover:border-[#1877F2] shadow-2xs'}`
            }>
            
            <span className="text-[10px] font-bold text-[#1877F2] uppercase tracking-wider block flex items-center justify-between">
              <span>Facebook Leads</span>
              <Megaphone size={12} />
            </span>
            <span className="text-lg font-black text-[#1877F2] mt-0.5 block">{clientFbLeads.length}</span>
            <span className="text-[10px] text-slate-500">Direct Inbound</span>
          </div>
        </div>

        {/* Drag & Drop Sub-Categories Drop Shelf */}
        <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag size={14} className="text-[#004077]" />
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Re-categorize Sub-Category Drop Targets
              </span>
              <span className="text-[10px] bg-blue-100 text-[#004077] px-2 py-0.5 rounded-full font-bold">
                Drag Document Here
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              Drag any document row onto a badge to instantly re-classify
            </span>
          </div>

          <div className="flex items-center space-x-2.5 overflow-x-auto pb-1 pt-0.5">
            {DOCUMENT_SUB_CATEGORIES.map((subCat) => {
              const isDropHovered = activeDropZone === `tag-${subCat.tag}`;
              return (
                <div
                  key={subCat.tag}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setActiveDropZone(`tag-${subCat.tag}`);
                  }}
                  onDragLeave={() => setActiveDropZone(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnCategory(subCat.defaultCategory, subCat.tag);
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition cursor-pointer shrink-0 flex items-center space-x-2 select-none ${
                  isDropHovered ?
                  'ring-2 ring-[#EF7C00] bg-orange-100 border-[#EF7C00] scale-105 shadow-md' :
                  subCat.color}`
                  }
                  title={`${subCat.desc} (Drop here)`}>
                  
                  <span className={`w-2 h-2 rounded-full ${subCat.iconColor.replace('text-', 'bg-')}`}></span>
                  <span>{subCat.label}</span>
                  {isDropHovered &&
                  <span className="text-[10px] font-black text-white bg-[#EF7C00] px-1.5 py-0.5 rounded shadow-2xs animate-bounce">
                      Drop!
                    </span>
                  }
                </div>);

            })}
          </div>
        </div>

        {/* Transfer Document Across Project Folders Drawer */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FolderKanban size={15} className="text-[#EF7C00]" />
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Transfer Document Across Project &amp; Client Folders
              </span>
              <span className="text-[10px] bg-orange-50 text-[#EF7C00] border border-orange-200 font-bold px-2 py-0.5 rounded-full">
                Drop Zone
              </span>
            </div>
            <button
              onClick={() => setShowFolderDropDrawer(!showFolderDropDrawer)}
              className="text-xs font-bold text-[#004077] hover:underline">
              
              {showFolderDropDrawer ? 'Hide Project Folders' : 'Show Project Folders'}
            </button>
          </div>

          {showFolderDropDrawer &&
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
              {clients.map((c) => {
              const isCurrent = c.id === selectedClient.id;
              const isDropHovered = activeDropZone === `folder-${c.id}`;
              const clientFileCount = getClientAllFiles(c.id).length;
              const clientProjects = projects?.filter((p) => p.client_id === c.id) || [];

              return (
                <div
                  key={c.id}
                  onDragOver={(e) => {
                    if (isCurrent) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setActiveDropZone(`folder-${c.id}`);
                  }}
                  onDragLeave={() => setActiveDropZone(null)}
                  onDrop={(e) => {
                    if (isCurrent) return;
                    e.preventDefault();
                    handleDropOnFolder(c.id);
                  }}
                  onClick={() => {
                    if (!isCurrent) handleOpenFolder(c.id);
                  }}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                  isCurrent ?
                  'border-[#004077] bg-blue-50/50' :
                  isDropHovered ?
                  'border-2 border-[#EF7C00] bg-orange-50 ring-2 ring-orange-300 scale-102 shadow-md cursor-copy' :
                  'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 cursor-pointer'}`
                  }>
                  
                    <div className="flex items-start justify-between space-x-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <Folder size={17} className={isCurrent ? 'text-[#004077]' : isDropHovered ? 'text-[#EF7C00]' : 'text-slate-400'} />
                        <div className="min-w-0">
                          <span className="block text-xs font-bold text-slate-800 truncate">{c.name}</span>
                          <span className="block text-[10px] text-slate-400 font-medium">{c.client_code} &bull; {clientFileCount} files</span>
                        </div>
                      </div>
                      {isCurrent ?
                    <span className="text-[9px] font-bold bg-[#004077] text-white px-1.5 py-0.5 rounded shrink-0">
                          Current
                        </span> :

                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0 group-hover:text-slate-600">
                          Folder
                        </span>
                    }
                    </div>

                    {isDropHovered && !isCurrent &&
                  <div className="mt-2 text-[10px] font-bold text-[#EF7C00] bg-white px-2 py-1 rounded border border-orange-200 text-center animate-pulse">
                        Drop to move document here &rarr;
                      </div>
                  }

                    {clientProjects.length > 0 && !isDropHovered &&
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center space-x-1 text-[10px] text-slate-500 truncate">
                        <span className="font-semibold text-slate-600">Projects:</span>
                        <span className="truncate">{clientProjects.map((p) => p.project_title).join(', ')}</span>
                      </div>
                  }
                  </div>);

            })}
            </div>
          }
        </div>

        {/* Folder Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <button
              onClick={() => setFolderFileFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              folderFileFilter === 'All' ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
              }>
              
              All Files ({currentClientFiles.length})
            </button>
            <button
              onClick={() => setFolderFileFilter('Quotation')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setActiveDropZone('cat-Quotation');
              }}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnCategory('Quotation');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeDropZone === 'cat-Quotation' ?
              'ring-2 ring-[#EF7C00] bg-orange-100 text-[#004077] border-[#EF7C00]' :
              folderFileFilter === 'Quotation' ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
              }>
              
              Quotations ({clientQuotesCount})
            </button>
            <button
              onClick={() => setFolderFileFilter('Invoice')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setActiveDropZone('cat-Invoice');
              }}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnCategory('Invoice');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeDropZone === 'cat-Invoice' ?
              'ring-2 ring-[#EF7C00] bg-orange-100 text-[#004077] border-[#EF7C00]' :
              folderFileFilter === 'Invoice' ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
              }>
              
              Invoices ({clientInvoicesCount})
            </button>
            <button
              onClick={() => setFolderFileFilter('Uploaded Document')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setActiveDropZone('cat-Uploaded Document');
              }}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnCategory('Uploaded Document');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeDropZone === 'cat-Uploaded Document' ?
              'ring-2 ring-[#EF7C00] bg-orange-100 text-[#004077] border-[#EF7C00]' :
              folderFileFilter === 'Uploaded Document' ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
              }>
              
              Documents ({clientDocsCount})
            </button>
            <button
              onClick={() => setFolderFileFilter('Custom Table')}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setActiveDropZone('cat-Custom Table');
              }}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnCategory('Custom Table');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              activeDropZone === 'cat-Custom Table' ?
              'ring-2 ring-[#EF7C00] bg-orange-100 text-[#004077] border-[#EF7C00]' :
              folderFileFilter === 'Custom Table' ?
              'bg-[#004077] text-white shadow-xs' :
              'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`
              }>
              
              Tables ({clientTablesCount})
            </button>

            <button
              onClick={() => setFolderFileFilter('Facebook Leads')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              folderFileFilter === 'Facebook Leads' ?
              'bg-[#1877F2] text-white shadow-xs' :
              'bg-blue-50 text-[#1877F2] hover:bg-blue-100 border border-blue-200'}`
              }>
              
              <Megaphone size={13} />
              <span>Facebook Leads ({clientFbLeads.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files or leads in folder..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#004077]" />
            
          </div>
        </div>

        {/* Facebook Leads View vs Standard Files Directory Table */}
        {folderFileFilter === 'Facebook Leads' ?
        <div className="space-y-4">
            {/* Leads Manager Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase mr-1">Status:</span>
                {(['All', 'New', 'Contacted', 'Qualified', 'Proposal Sent', 'Converted'] as const).map((status) => {
                const count = status === 'All' ?
                clientFbLeads.length :
                clientFbLeads.filter((l) => l.status === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setLeadStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    leadStatusFilter === status ?
                    'bg-[#1877F2] text-white shadow-2xs' :
                    'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                    }>
                    
                      {status} ({count})
                    </button>);

              })}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <ActionButton
                onClick={handleExportLeadsToDrive}
                disabled={clientFbLeads.length === 0}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
                title="Export leads list as a permanent Table document in this client folder">
                
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Export to Folder Table</span>
                </ActionButton>

                <ActionButton
                onClick={handleSimulateInboundLead}
                className="px-3 py-1.5 bg-[#1877F2] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs">
                
                  <Plus size={13} />
                  <span>+ Add / Synchronize Leads</span>
                </ActionButton>
              </div>
            </div>

            {/* Inbound Facebook Leads Table */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#1877F2] text-white uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-3">Lead Contact</th>
                      <th className="py-3 px-3">WhatsApp / Mobile</th>
                      <th className="py-3 px-3">Connected Page &amp; Form</th>
                      <th className="py-3 px-3">Inquired Service &amp; Budget</th>
                      <th className="py-3 px-3">Captured Time</th>
                      <th className="py-3 px-3">Lead Status</th>
                      <th className="py-3 px-3">WhatsApp Outreach</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClientFbLeads.map((lead) =>
                  <tr key={lead.id} className="hover:bg-blue-50/40 transition group">
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{lead.lead_name}</span>
                            {lead.city &&
                        <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {lead.city}
                              </span>
                        }
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{lead.lead_email}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-800 font-semibold">{lead.lead_phone}</span>
                            {onOpenWhatsAppModal &&
                        <button
                          onClick={() => onOpenWhatsAppModal({
                            name: lead.lead_name,
                            phone: lead.lead_phone,
                            clientName: selectedClient.name,
                            clientId: selectedClient.id,
                            leadId: lead.id,
                            serviceRequested: lead.service_requested
                          })}
                          className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-md transition shadow-2xs"
                          title="Open WhatsApp Message Composer">
                          
                                <MessageSquare size={13} />
                              </button>
                        }
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-blue-900">{lead.fb_page_name}</div>
                          <div className="text-[10px] text-slate-500">
                            {lead.form_name} {lead.ad_name ? `&bull; ${lead.ad_name}` : ''}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800">{lead.service_requested || 'General Inquiry'}</div>
                          {lead.budget &&
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                              Budget: {lead.budget}
                            </span>
                      }
                        </td>

                        <td className="py-3.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                          <div className="flex items-center space-x-1 text-slate-600">
                            <Clock size={12} className="text-slate-400" />
                            <span>{new Date(lead.created_time).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <select
                        value={lead.status}
                        onChange={async (e) => {try {return await onUpdateFbLeadStatus?.(lead.id, e.target.value as FacebookLead['status']);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                        className={`text-[11px] font-bold py-1 px-2 rounded-lg border focus:ring-1 focus:ring-[#1877F2] ${
                        lead.status === 'New' ?
                        'bg-blue-100 text-blue-800 border-blue-200' :
                        lead.status === 'Contacted' ?
                        'bg-amber-100 text-amber-800 border-amber-200' :
                        lead.status === 'Qualified' ?
                        'bg-purple-100 text-purple-800 border-purple-200' :
                        lead.status === 'Proposal Sent' ?
                        'bg-indigo-100 text-indigo-800 border-indigo-200' :
                        lead.status === 'Converted' ?
                        'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'}`
                        }>
                        
                            <option value="New">New</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Qualified">Qualified</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Converted">Converted</option>
                            <option value="Lost">Lost</option>
                          </select>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                      lead.whatsapp_status === 'Not Sent' ?
                      'bg-slate-100 text-slate-600' :
                      lead.whatsapp_status === 'Message Sent' || lead.whatsapp_status === 'Delivered' ?
                      'bg-emerald-100 text-emerald-800' :
                      'bg-blue-100 text-blue-800'}`
                      }>
                            <MessageSquare size={10} />
                            <span>{lead.whatsapp_status || 'Not Sent'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {lead.custom_answers && lead.custom_answers.length > 0 &&
                        <button
                          onClick={() => setSelectedLeadForDetail(lead)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg transition"
                          title="View Meta Form Questions & Answers">
                          
                                Q&amp;A
                              </button>
                        }

                            {onOpenWhatsAppModal &&
                        <button
                          onClick={() => onOpenWhatsAppModal({
                            name: lead.lead_name,
                            phone: lead.lead_phone,
                            clientName: selectedClient.name,
                            clientId: selectedClient.id,
                            leadId: lead.id,
                            serviceRequested: lead.service_requested
                          })}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition flex items-center space-x-1 shadow-2xs">
                          
                                <MessageSquare size={11} />
                                <span>WhatsApp</span>
                              </button>
                        }

                            {onPrepareQuotationForClient &&
                        <button
                          onClick={() => onPrepareQuotationForClient(selectedClient.id)}
                          className="p-1.5 text-slate-500 hover:text-[#EF7C00] hover:bg-orange-50 rounded-lg transition"
                          title="Create Commercial Proposal / Quotation">
                          
                                <FileSpreadsheet size={14} />
                              </button>
                        }
                          </div>
                        </td>
                      </tr>
                  )}

                    {filteredClientFbLeads.length === 0 &&
                  <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <Megaphone size={32} className="mx-auto mb-2 text-blue-300" />
                          <p className="font-semibold text-slate-700">No Facebook Leads in this filter for {selectedClient.name}.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Connect your Facebook Lead Ads form or click &quot;Synchronize FB Leads&quot; to import leads.
                          </p>
                          <div className="mt-4 flex items-center justify-center space-x-2">
                            <ActionButton
                          onClick={handleSimulateInboundLead}
                          className="px-3.5 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-xl shadow-xs">
                          
                              + Synchronize Facebook Leads
                            </ActionButton>
                            <button
                          onClick={() => setShowPagePickerModal(true)}
                          className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl">
                          
                              Choose Facebook Page
                            </button>
                          </div>
                        </td>
                      </tr>
                  }
                  </tbody>
                </table>
              </div>
            </div>
          </div> : (

        /* Files Directory Table */
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#004077] text-white uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-3 w-8" title="Drag Grip"></th>
                    <th className="py-3 px-3">File Name</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Classification / Tag</th>
                    <th className="py-3 px-3">Size</th>
                    <th className="py-3 px-3">Date Added</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClientFiles.map((file) =>
                <tr
                  key={file.id}
                  draggable={true}
                  onDragStart={(e) => handleDocDragStart(e, file)}
                  onDragEnd={handleDocDragEnd}
                  className={`hover:bg-slate-50 transition cursor-grab active:cursor-grabbing group ${
                  draggedDoc?.id === file.id ? 'opacity-40 bg-amber-50/70 border-dashed border-2 border-[#EF7C00]' : ''}`
                  }>
                  
                      <td className="py-3.5 pl-3 pr-1 text-slate-400 group-hover:text-slate-600 shrink-0" title="Drag to re-categorize or move to folder">
                        <GripVertical size={15} className="cursor-grab active:cursor-grabbing" />
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-800">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                            {renderFileIcon(file)}
                          </div>
                          <div className="min-w-0">
                            <span className="truncate max-w-xs block">{file.file_name}</span>
                            {file.project_name &&
                        <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100 font-semibold inline-block mt-0.5">
                                Project: {file.project_name}
                              </span>
                        }
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    file.category === 'Quotation' ?
                    'bg-blue-100 text-[#004077]' :
                    file.category === 'Invoice' ?
                    'bg-emerald-100 text-emerald-800' :
                    file.category === 'Custom Table' ?
                    'bg-amber-100 text-amber-900' :
                    'bg-slate-100 text-slate-700'}`
                    }>
                          {file.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {file.tag || 'General File'}
                      </td>

                      <td className="py-3.5 px-3 font-mono text-slate-500 text-[11px]">
                        {file.file_size}
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 font-medium">
                        {file.uploaded_at}
                      </td>

                      <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                        {file.uploaded_by || 'System'}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Move / Re-categorize Button */}
                          <button
                        onClick={() => {
                          setReclassifyingDoc(file);
                          setReclassTargetClientId(file.client_id);
                          setReclassTargetCategory(file.category);
                          setReclassTargetTag(file.tag || 'Client Agreement');
                          setReclassTargetProjectId(file.project_id || '');
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#004077] hover:bg-blue-50 rounded-lg transition"
                        title="Re-categorize / Move Document">
                        
                            <FolderInput size={14} />
                          </button>

                          {file.table_data ?
                      <ActionButton
                        onClick={() => handleOpenTableBuilder(file)}
                        className="px-2.5 py-1 bg-[#004077] text-white text-[11px] font-bold rounded-lg hover:bg-[#00305a] transition flex items-center space-x-1"
                        title="Edit Table Grid">
                        
                              <Edit3 size={11} />
                              <span>Edit Table</span>
                            </ActionButton> :

                      <button
                        onClick={() => {
                          setPreviewFile(file);
                          setViewMode('preview_file');
                        }}
                        className="p-1.5 text-slate-500 hover:text-[#004077] hover:bg-slate-100 rounded-lg transition"
                        title="Preview File">
                        
                              <Eye size={14} />
                            </button>
                      }

                          <button
                        onClick={() => downloadClientFile(file, quotations, invoices)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                        title="Download">
                        
                            <Download size={14} />
                          </button>

                          {file.category === 'Uploaded Document' &&
                      <button
                        onClick={async () => {try {return await onDeleteFile(file.id);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition"
                        title="Delete File">
                        
                              <Trash2 size={14} />
                            </button>
                      }
                        </div>
                      </td>
                    </tr>
                )}

                  {filteredClientFiles.length === 0 &&
                <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <FolderOpen size={28} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-slate-600">No documents found matching the filter.</p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Upload a file, drag a file from another folder, or create a custom table.
                        </p>
                      </td>
                    </tr>
                }
                </tbody>
              </table>
            </div>
          </div>)
        }
      </div>);

  }

  /* =========================================================================
   * VIEW 5: ROOT DRIVE - ALL CLIENT ORGANISATION FOLDERS
   * ========================================================================= */
  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Toast Alert */}
      {dndToast &&
      <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">{dndToast.message}</span>
              {dndToast.sub && <p className="text-slate-600 mt-0.5 font-normal">{dndToast.sub}</p>}
            </div>
          </div>
          <button onClick={() => setDndToast(null)} className="p-1 text-emerald-700 hover:text-emerald-950">
            <X size={15} />
          </button>
        </div>
      }

      {/* Top Banner Alert & Overview */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-black text-[#004077] tracking-tight">Files &amp; Drive</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#004077] border border-blue-200">
              Client Folders
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Select a client to manage their documents.
          </p>
        </div>

        {/* Actions & Global Search Bar */}
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <ActionButton
            onClick={() => handleOpenCreateTableSetup()}
            className="px-3.5 py-2 bg-[#004077] hover:bg-[#00305a] text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow-xs shrink-0">
            
            <TableIcon size={14} className="text-[#EF7C00]" />
            <span>+ Create New Table</span>
          </ActionButton>

          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folder or code..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition" />
            
          </div>
        </div>
      </div>

      {/* Global Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Organization Folders</span>
          <span className="text-xl font-black text-[#004077] mt-0.5 block">{clients.length}</span>
          <span className="text-[10px] text-slate-500">1 per active client</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Stored Files</span>
          <span className="text-xl font-black text-emerald-700 mt-0.5 block">{totalFilesAcrossClients}</span>
          <span className="text-[10px] text-slate-500">Indexed &amp; uploaded</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Commercial Quotes</span>
          <span className="text-xl font-black text-blue-700 mt-0.5 block">{totalQuotesAcrossClients}</span>
          <span className="text-[10px] text-slate-500">Given to clients</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Invoices Generated</span>
          <span className="text-xl font-black text-[#EF7C00] mt-0.5 block">{totalInvoicesAcrossClients}</span>
          <span className="text-[10px] text-slate-500">GST tax invoices</span>
        </div>
      </div>

      {/* Drag & Drop Quick Dispatcher */}
      {allFilesAcrossClients.length > 0 &&
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <GripVertical size={16} className="text-[#EF7C00]" />
              <div>
                <h4 className="text-xs font-bold text-[#004077] uppercase tracking-wider">Drag &amp; Drop Document Dispatcher</h4>
                <p className="text-[11px] text-slate-500">
                  Drag any document below and drop directly onto an Organization Folder to transfer or re-categorize it.
                </p>
              </div>
            </div>
            {draggedDoc &&
          <span className="text-xs font-bold text-[#EF7C00] bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-lg animate-pulse shrink-0">
                Dragging: "{draggedDoc.file_name}"
              </span>
          }
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto pb-1.5 pt-0.5">
            {allFilesAcrossClients.slice(0, 10).map((file) =>
          <div
            key={file.id}
            draggable={true}
            onDragStart={(e) => handleDocDragStart(e, file)}
            onDragEnd={handleDocDragEnd}
            className={`p-3 rounded-xl border bg-slate-50 hover:bg-white hover:border-[#004077] transition cursor-grab active:cursor-grabbing shrink-0 w-60 flex flex-col justify-between shadow-2xs select-none ${
            draggedDoc?.id === file.id ? 'opacity-40 border-dashed border-2 border-[#EF7C00]' : 'border-slate-200'}`
            }>
            
                <div className="flex items-start space-x-2">
                  <GripVertical size={13} className="text-slate-400 mt-0.5 shrink-0 cursor-grab" />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate block">{file.file_name}</span>
                    <span className="text-[10px] text-slate-500 truncate block">Folder: {file.client_name}</span>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] pt-1.5 border-t border-slate-100">
                  <span className="font-semibold text-[#004077] bg-blue-50 px-1.5 py-0.5 rounded">{file.category}</span>
                  <span className="text-slate-400 font-mono">{file.file_size}</span>
                </div>
              </div>
          )}
          </div>
        </div>
      }

      {/* Organization Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClientFolders.map((client) => {
          const files = getClientAllFiles(client.id);
          const quotesCount = files.filter((f) => f.category === 'Quotation').length;
          const invoicesCount = files.filter((f) => f.category === 'Invoice').length;
          const docsCount = files.filter((f) => f.category === 'Uploaded Document').length;
          const tablesCount = files.filter((f) => f.category === 'Custom Table').length;
          const isDropHovered = activeDropZone === `root-folder-${client.id}`;

          return (
            <div
              key={client.id}
              onClick={() => handleOpenFolder(client.id)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setActiveDropZone(`root-folder-${client.id}`);
              }}
              onDragLeave={() => setActiveDropZone(null)}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnFolder(client.id);
              }}
              className={`bg-white rounded-2xl border p-5 transition cursor-pointer group space-y-4 ${
              isDropHovered ?
              'border-2 border-[#EF7C00] bg-orange-50/90 ring-2 ring-orange-300 scale-102 shadow-lg cursor-copy' :
              'border-slate-200 hover:border-[#004077] hover:shadow-md'}`
              }>
              
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform shadow-xs ${
                  isDropHovered ?
                  'bg-orange-100 border border-orange-300 scale-110' :
                  'bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/80 text-[#004077] group-hover:scale-105'}`
                  }>
                    <Folder size={26} className={isDropHovered ? 'text-[#EF7C00]' : 'text-[#EF7C00] group-hover:text-[#D96F00]'} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#004077] group-hover:text-[#EF7C00] transition line-clamp-1">
                      {client.name}
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {client.client_code} &bull; {client.city}
                    </span>
                  </div>
                </div>

                <ChevronRight size={16} className="text-slate-400 group-hover:text-[#004077] group-hover:translate-x-1 transition-transform shrink-0 mt-1" />
              </div>

              {isDropHovered &&
              <div className="bg-[#EF7C00] text-white py-1.5 px-2.5 rounded-xl text-xs font-bold text-center animate-pulse shadow-xs">
                  Drop to transfer document into {client.name}!
                </div>
              }

              {/* Folder Breakdown Chips */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <FileSpreadsheet size={12} className="text-[#004077]" />
                    <span>Quotes:</span>
                  </span>
                  <span className="font-bold text-slate-800">{quotesCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <Receipt size={12} className="text-emerald-600" />
                    <span>Invoices:</span>
                  </span>
                  <span className="font-bold text-slate-800">{invoicesCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <FileText size={12} className="text-blue-600" />
                    <span>Docs:</span>
                  </span>
                  <span className="font-bold text-slate-800">{docsCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500 flex items-center space-x-1">
                    <TableIcon size={12} className="text-[#EF7C00]" />
                    <span>Tables:</span>
                  </span>
                  <span className="font-bold text-slate-800">{tablesCount}</span>
                </div>
                <div className="flex items-center justify-between p-1.5 bg-blue-50/70 rounded-lg col-span-2">
                  <span className="text-blue-700 flex items-center space-x-1 font-semibold">
                    <Megaphone size={12} className="text-[#1877F2]" />
                    <span>Facebook Leads:</span>
                  </span>
                  <span className="font-bold text-[#1877F2]">
                    {(facebookLeads || []).filter((l) => l.client_id === client.id).length} Leads
                  </span>
                </div>
              </div>

              {/* Folder Footer */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                <span>{files.length} total files stored</span>
                <span className="font-bold text-[#004077] group-hover:underline">Open Folder &rarr;</span>
              </div>
            </div>);

        })}

        {filteredClientFolders.length === 0 &&
        <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <Folder size={36} className="mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-600">No client organization folders matched your search.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing search filters.</p>
          </div>
        }
      </div>

      {/* MODAL 1: Choose Facebook Page for Client Folder */}
      {showPagePickerModal && selectedClient &&
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-[#1877F2] to-blue-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="font-black text-base">Choose Facebook Page for Folder</h3>
                  <p className="text-xs text-blue-100 mt-0.5">
                    Map Facebook Lead Ads directly into <strong className="underline">{selectedClient.name}</strong>&apos;s folder.
                  </p>
                </div>
              </div>
              <button
              onClick={() => setShowPagePickerModal(false)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
              
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  Connected Facebook Pages &amp; Forms
                </h4>
                <div className="space-y-3">
                  {agencyFbPages.map((page) => {
                  const isSelected = selectedClient.fb_page_id === page.page_id;
                  return (
                    <div
                      key={page.page_id}
                      className={`p-4 rounded-2xl border transition ${
                      isSelected ?
                      'bg-blue-50/70 border-[#1877F2] ring-2 ring-blue-300' :
                      'bg-white border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`
                      }>
                      
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <h5 className="font-bold text-sm text-slate-800">{page.page_name}</h5>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                                ID: {page.page_id}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500 block mt-0.5">{page.category}</span>
                          </div>

                          <button
                          onClick={async () => {try {
                              const form = page.lead_forms[0];
                              await onUpdateClientFbPage?.(
                                selectedClient.id,
                                page.page_id,
                                page.page_name,
                                form?.form_id,
                                form?.form_name
                              );
                              setShowPagePickerModal(false);
                              triggerDndToast(
                                'Facebook Page Connected!',
                                `Inbound leads from "${page.page_name}" now route directly to ${selectedClient.name}'s folder.`
                              );
                            } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                          isSelected ?
                          'bg-emerald-600 text-white shadow-xs' :
                          'bg-[#1877F2] hover:bg-blue-700 text-white shadow-xs'}`
                          }>
                          
                            <Check size={13} />
                            <span>{isSelected ? 'Active Connected Page' : 'Select This Page'}</span>
                          </button>
                        </div>

                        {/* Lead Forms inside page */}
                        {page.lead_forms && page.lead_forms.length > 0 &&
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center space-x-2 flex-wrap gap-y-1 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Available Forms:</span>
                            {page.lead_forms.map((form) =>
                        <span key={form.form_id} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700 font-medium">
                                {form.form_name} ({form.leads_count} leads)
                              </span>
                        )}
                          </div>
                      }
                      </div>);

                })}
                </div>
              </div>

              {/* Custom Page Entry */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Or Connect Custom Facebook Page
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Page Name</label>
                    <input
                    type="text"
                    placeholder="e.g. Apex Global Official"
                    value={customPageName}
                    onChange={(e) => setCustomPageName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Page ID</label>
                    <input
                    type="text"
                    placeholder="e.g. 10492819283"
                    value={customPageId}
                    onChange={(e) => setCustomPageId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Lead Ads Form Name (Optional)</label>
                    <input
                    type="text"
                    placeholder="e.g. Enterprise Solution Inquiry Form"
                    value={customFormName}
                    onChange={(e) => setCustomFormName(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                  
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <ActionButton
                  disabled={!customPageName.trim()}
                  onClick={async () => {try {
                      if (!customPageName.trim()) return;
                      await onUpdateClientFbPage?.(
                        selectedClient.id,
                        customPageId || `page-${Date.now()}`,
                        customPageName,
                        `form-${Date.now()}`,
                        customFormName || 'Instant Lead Form'
                      );
                      setShowPagePickerModal(false);
                      setCustomPageName('');
                      setCustomPageId('');
                      setCustomFormName('');
                      triggerDndToast(
                        'Custom Facebook Page Linked!',
                        `Connected "${customPageName}" to ${selectedClient.name}'s folder.`
                      );
                    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                  className="px-4 py-2 bg-[#004077] hover:bg-[#00305a] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs">
                  
                    Save Custom Page Connection
                  </ActionButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      }

      {/* MODAL 2: Lead Details & Form Q&A Answers */}
      {selectedLeadForDetail &&
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-[#004077] to-blue-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">{selectedLeadForDetail.lead_name}</h3>
                <p className="text-xs text-blue-200">
                  {selectedLeadForDetail.lead_phone} &bull; {selectedLeadForDetail.lead_email}
                </p>
              </div>
              <button
              onClick={() => setSelectedLeadForDetail(null)}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl">
              
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Connected Page</span>
                  <span className="font-bold text-slate-800">{selectedLeadForDetail.fb_page_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Form Name</span>
                  <span className="font-bold text-slate-800">{selectedLeadForDetail.form_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Inquired Service</span>
                  <span className="font-bold text-slate-800">{selectedLeadForDetail.service_requested || 'General Inquiry'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Budget</span>
                  <span className="font-bold text-emerald-700">{selectedLeadForDetail.budget || 'Not specified'}</span>
                </div>
              </div>

              {selectedLeadForDetail.custom_answers && selectedLeadForDetail.custom_answers.length > 0 &&
            <div>
                  <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                    Meta Form Custom Answers
                  </h4>
                  <div className="space-y-2">
                    {selectedLeadForDetail.custom_answers.map((ans, idx) =>
                <div key={idx} className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                        <span className="font-semibold text-slate-700 block">{ans.question}</span>
                        <span className="font-bold text-[#004077] block mt-0.5">{ans.answer}</span>
                      </div>
                )}
                  </div>
                </div>
            }

              {selectedLeadForDetail.notes &&
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                  <span className="font-bold block text-[10px] uppercase">Notes:</span>
                  <p className="mt-0.5">{selectedLeadForDetail.notes}</p>
                </div>
            }

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <ActionButton
                onClick={() => setSelectedLeadForDetail(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50">
                
                  Close
                </ActionButton>
                {onOpenWhatsAppModal &&
              <ActionButton
                onClick={() => {
                  const lead = selectedLeadForDetail;
                  setSelectedLeadForDetail(null);
                  onOpenWhatsAppModal({
                    name: lead.lead_name,
                    phone: lead.lead_phone,
                    clientName: lead.client_name,
                    clientId: lead.client_id,
                    leadId: lead.id,
                    serviceRequested: lead.service_requested
                  });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-xs">
                
                    <MessageSquare size={13} />
                    <span>Send WhatsApp Message</span>
                  </ActionButton>
              }
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

};
