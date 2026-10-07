import { ActionButton } from './components/ActionButton';
import React, { useState, useEffect } from 'react';
import { needsRenewalAttention } from './utils/renewalStatus';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ExpiryNotice } from './components/ExpiryNotice';
import { DashboardView } from './components/DashboardView';
import { ClientsView } from './components/ClientsView';
import { RenewalsView } from './components/RenewalsView';
import { InvoicesView } from './components/InvoicesView';
import { QuotationsView } from './components/QuotationsView';
import { ServicesView } from './components/ServicesView';
import { VendorsView } from './components/VendorsView';
import { HrDocumentsView } from './components/HrDocumentsView';
import { FilesView } from './components/FilesView';
import { ProjectsKanbanView } from './components/ProjectsKanbanView';
import { CodeExplorerModal } from './components/CodeExplorerModal';
import { LoginView } from './components/LoginView';
import { WhatsAppModal } from './components/WhatsAppModal';

import { usePortal } from './usePortal';
import { request } from './api';
import { EntityManager, SettingsView } from './components/AdminTools';
import { CheckCircle } from 'lucide-react';
import { exportClientsToCSV } from './utils/csvUtils';
import { getProjectDeadlineStatus } from './utils/projectAlertUtils';
import { Client, ClientSubscription, Invoice, Quotation, VendorBill, RecurringVendorExpense, ServiceCatalog, StoredClientFile, Project, Task, ProjectStatus, ProjectDeadlineNotification, FacebookLead, WhatsAppConfig } from './types';

export default function App() {
  const portal = usePortal();
  const { run, save, remove } = portal;
  const data = portal.data || {};
  const clients: Client[] = data.clients || [], subscriptions: ClientSubscription[] = data.subscriptions || [], invoices: Invoice[] = data.invoices || [];
  const services: ServiceCatalog[] = data.services || [], quotations: Quotation[] = data.quotations || [];
  const vendors = data.vendors || [], vendorBills = data.vendorBills || [], recurringExpenses = data.recurringExpenses || [];
  const clientFiles = data.files || [], projects: Project[] = data.projects || [], tasks: Task[] = data.tasks || [];
  const facebookLeads = data.facebookLeads || [], agencyFbPages = data.facebookPages || [], emailNotifications = data.emailNotifications || [];
  const whatsAppConfig = data.whatsAppConfig || { templates: [] }, whatsAppLogs = data.whatsAppLogs || [];
  const isAuthenticated = !!portal.user, adminUser = portal.user || {};
  const notification = portal.message, showToast = portal.setMessage;
  const [activeTab, setActiveTab] = useState(() => {
    const tab = new URLSearchParams(window.location.search).get('tab') || 'dashboard';
    return ['dashboard','clients','services','renewals','invoices','quotations','files','vendors','infrastructure','vault','projects','employees','vendor-directory','facebook-leads','settings','hr'].includes(tab) ? tab : 'dashboard';
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', activeTab);
    // Legacy create links are one-time actions, not the page to reopen on refresh.
    url.searchParams.delete('create');
    window.history.replaceState(window.history.state, '', url);
  }, [activeTab]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() => window.innerWidth < 1280);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    const resize = () => { setCompactLayout(media.matches); setMobileNavOpen(false); };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCodeExplorer, setShowCodeExplorer] = useState(false);
  const [preselectedServiceForQuotation, setPreselectedServiceForQuotation] = useState<number | null>(null);
  const [preselectedClientIdForQuotation, setPreselectedClientIdForQuotation] = useState<number | null>(null);
  const [targetClientIdForFiles, setTargetClientIdForFiles] = useState<number | null>(null);
  const [focusedInvoiceNumber, setFocusedInvoiceNumber] = useState<string | null>(null);
  const [focusedQuotationNumber, setFocusedQuotationNumber] = useState<string | null>(null);
  const [focusedClientId, setFocusedClientId] = useState<number | null>(null);
  const [createIntent, setCreateIntent] = useState(() => new URLSearchParams(window.location.search).get('create') === '1' && ['clients','invoices'].includes(activeTab) ? activeTab : '');
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppRecipient, setWhatsAppRecipient] = useState<any>(null);
  const handleAddClient = (r: any) => save('clients', r);
  const handleUpdateClient = (r: any) => save('clients', r, r.id);
  const handleAddService = (r: any) => save('services', r);
  const handleUpdateService = (r: any) => save('services', r, r.id);
  const handleDeleteService = (id: number) => remove('services', id);
  const handleAddQuotation = (r: any) => save('quotations', r);
  const handleUpdateQuotation = (r: any) => save('quotations', r, r.id);
  const handleDeleteQuotation = (id: number) => remove('quotations', id);
  const handleApproveAndGenerateInvoice = (q: Quotation) => run('convert', { id: q.id }, 'Quotation approved and invoice created.');
  const handleUploadClientFile = (r: any) => save('files', r);
  const handleUpdateClientFile = (r: any) => save('files', r, r.id);
  const handleDeleteClientFile = (id: string) => remove('files', id);
  const handleUpdateClientFbPage = (clientId: number, pageId: string, pageName: string, formId = '', formName = '') => run('page_mapping', { client_id: clientId, page_id: pageId, page_name: pageName, form_id: formId, form_name: formName });
  const handleAddFbLead = (r: any) => save('facebookLeads', r);
  const handleUpdateFbLeadStatus = (id: string, status: string) => save('facebookLeads', { status }, id);
  const handleSaveWhatsAppConfig = (config: WhatsAppConfig) => run('settings', { provider: 'whatsapp', data: config });
  const handleSendWhatsAppMessage = (payload: any) => run('whatsapp_send', payload, 'Message accepted by WhatsApp.');
  const handleAddTask = (r: any) => save('tasks', r);
  const handleUpdateTask = (r: any) => save('tasks', r, r.id);
  const handleDeleteTask = (id: number) => remove('tasks', id);
  const handleUpdateTaskStatus = (id: number, status: ProjectStatus) => save('tasks', { status }, id);
  const handleAddProject = (r: any) => save('projects', r);
  const handleUpdateProject = (r: any) => save('projects', r, r.id);
  const handleDeleteProject = (id: number) => remove('projects', id);
  const handleToggleDeadlineAlerts = (id: number, enabled: boolean) => save('projects', { deadline_alerts_enabled: enabled }, id);
  const handleSetDeadlineAlertThreshold = (id: number, days: number) => save('projects', { alert_threshold_days: days }, id);
  const handleExtendProjectDueDate = (id: number, days: number) => { const p = projects.find(p => p.id === id); if (!p) return; const d = new Date(p.due_date); d.setDate(d.getDate() + days); return save('projects', { due_date: d.toISOString().slice(0, 10), alert_acknowledged: false }, id); };
  const handleSendProjectDeadlineAlert = async (n: ProjectDeadlineNotification) => { await run('maintenance', {}, ''); const response = await request('bootstrap'); const messages = response.data.projectNotifications || []; const found = messages.find((m: any) => m.project_id === n.project_id); if (!found) throw new Error('Enter the project lead email and save its deadline before sending.'); return run('email_send', { id: found.id, body: n.body }, 'Deadline email sent.'); };
  const handleUpdateRenewalPayment = async (id: number, invoiceNumber?: string) => {
    if (!invoiceNumber) { const sub = subscriptions.find(s => s.id === id); if (!sub) throw new Error('Subscription not found.'); const result = await run('renewal_prepare', { id, expected_expiry: sub.expiry_date }, 'Renewal invoice ready. Record the actual receipt before renewing.'); invoiceNumber = result.invoice_number; }
    if (!invoiceNumber) throw new Error('Unable to open the renewal invoice. Refresh and retry.');
    setFocusedInvoiceNumber(invoiceNumber); setActiveTab('invoices');
  };
  const handleAddSubscription = (r: any) => save('subscriptions', r);
  const handleRenewSubscription = (id: number, expected_expiry: string) => run('renew', { id, expected_expiry }, 'Subscription renewed for one paid period.');
  const handleToggleAutoRenew = (id: number, enabled: boolean) => save('subscriptions', { auto_renew: enabled }, id);
  const handleSendRenewalEmail = (id: string) => run('email_send', { id }, 'Renewal email sent.');
  const handleSendAllRenewalEmails = async () => { const result = await run('email_batch', {}, ''); portal.setMessage(`${result.sent} emails sent; ${result.failed} failed; ${result.processing} awaiting delivery verification.`); };
  const handleMarkExpiringSoon = (id: number) => run('subscription_reminder_test', { id, request_key: crypto.randomUUID() }, 'Test reminder queued to your administrator email. Subscription dates and payments were not changed.');
  const handleAddInvoice = (r: any) => save('invoices', r);
  const handleUpdateInvoice = (r: any) => save('invoices', r, r.id);
  const handleDeleteInvoice = (id: number) => remove('invoices', id);
  const handleAddVendorBill = (r: any) => save('vendorBills', r);
  const handleUpdateVendorBill = (r: any) => save('vendorBills', r, r.id);
  const handleDeleteVendorBill = (id: number) => remove('vendorBills', id);
  const handleAddRecurringExpense = (r: any) => save('recurringExpenses', r);
  const handleUpdateRecurringExpense = (r: any) => save('recurringExpenses', r, r.id);
  const handleDeleteRecurringExpense = (id: number) => remove('recurringExpenses', id);
  const handleToggleRecurringAutoEntry = (id: number, enabled: boolean) => save('recurringExpenses', { auto_entry_enabled: enabled }, id);
  const handleTriggerRecurringExpenseBill = (id: number) => run('recurring', { id }, 'Due expense processed.');
  const handleTriggerAllDueRecurringExpenses = () => run('recurring', {}, 'Due recurring expenses processed.');
  const handleImportClients = (records: any[]) => run('import', { resource: 'clients', records }, 'Clients imported.');
  const handleImportInvoices = (records: any[]) => run('import', { resource: 'invoices', records }, 'Invoices imported.');
  const handleExportClientReport = () => exportClientsToCSV(clients, { mode: 'reporting', invoices, subscriptions });
  const expiringCount = subscriptions.filter(needsRenewalAttention).length;

  // Active Project Deadline Alerts (Completion date within 3 days or overdue)
  const activeProjectAlerts = projects
    .map(p => ({ project: p, status: getProjectDeadlineStatus(p) }))
    .filter(item => item.status.isAlertActive);
  const projectAlertsCount = activeProjectAlerts.length;

  if (portal.loading) return <div className="p-10 text-center">Connecting to the database…</div>;
  if (!isAuthenticated) {
    return (
      <>
        <LoginView
          onLogin={portal.login}
          backendError={portal.error}
          onOpenCodeViewer={() => setShowCodeExplorer(true)}
        />
        <CodeExplorerModal
          isOpen={showCodeExplorer}
          onClose={() => setShowCodeExplorer(false)}
        />
      </>
    );
  }

  return (
    <div className="portal-shell flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-800 font-sans">
      
      {portal.error && <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] bg-red-700 text-white p-4 rounded-xl shadow-lg max-w-xl">{portal.error}<ActionButton className="ml-4 underline" onClick={() => portal.setError('')}>Dismiss</ActionButton></div>}
      {portal.busy && <div role="status" className="fixed top-0 right-0 z-[100] bg-blue-800 text-white px-4 py-2">Saving…</div>}
      <ExpiryNotice subscriptions={subscriptions} onViewRenewals={() => setActiveTab('renewals')} />
      {/* Toast Notification Alert */}
      {notification && (
        <div role="status" className="fixed bottom-5 right-5 z-50 bg-[#004077] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-blue-400/30 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle size={16} className="text-[#EF7C00]" />
          <span>{notification}</span>
          <ActionButton className="underline" onClick={() => portal.setMessage('')}>Dismiss</ActionButton>
        </div>
      )}

      {/* Left Collapsible Navigation Sidebar (#004077 & #00355F) */}
      {compactLayout && mobileNavOpen && <button className="portal-nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}
      <Sidebar
        mobileOpen={mobileNavOpen}
        compact={compactLayout}
        onClose={() => setMobileNavOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => { setActiveTab(tab); setMobileNavOpen(false); }}
        collapsed={!compactLayout && sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        expiringCount={expiringCount}
        projectAlertsCount={projectAlertsCount}
        onOpenWhatsApp={() => {
          setMobileNavOpen(false);
          setWhatsAppRecipient(null);
          setIsWhatsAppModalOpen(true);
        }}
        onLogout={portal.logout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Navigation Bar with Search, Notification Counter & Profile */}
        <Topbar
          onOpenNavigation={() => setMobileNavOpen(true)}
          navigationOpen={mobileNavOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          expiringCount={expiringCount}
          projectAlertsCount={projectAlertsCount}
          projectAlerts={activeProjectAlerts}
          onNewClient={() => { setCreateIntent('clients'); setActiveTab('clients'); }}
          onViewRenewals={() => setActiveTab('renewals')}
          onViewProjects={() => setActiveTab('projects')}
          onOpenCodeViewer={() => setShowCodeExplorer(true)}
          onOpenWhatsApp={() => {
            setWhatsAppRecipient(null);
            setIsWhatsAppModalOpen(true);
          }}
          onLogout={portal.logout}
          userName={adminUser.name}
          userEmail={adminUser.email}
          userRole={adminUser.role}
        />

        {/* Dynamic Viewport Container */}
        <main className="portal-main flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {searchQuery.trim() && <section aria-label="Search results" className="bg-white border rounded-xl p-4 mb-5"><h2 className="font-bold mb-3">Search results</h2>{[
              ...clients.map(r=>({label:r.name,tab:'clients',id:r.id})), ...invoices.map(r=>({label:r.invoice_number+' '+r.client_name,tab:'invoices',ref:r.invoice_number})),
              ...quotations.map(r=>({label:r.quotation_number+' '+r.title,tab:'quotations',ref:r.quotation_number})),...projects.map(r=>({label:r.project_title,tab:'projects'})),
              ...(data.infrastructure||[]).map((r:any)=>({label:r.domain_name,tab:'infrastructure'})),...vendors.map((r:any)=>({label:r.vendor_name,tab:'vendor-directory'}))
            ].filter(r=>r.label.toLowerCase().includes(searchQuery.toLowerCase())).map((r:any,i)=><button key={i} className="block text-left p-2 w-full hover:bg-blue-50" onClick={()=>{setActiveTab(r.tab);if(r.tab==='clients')setFocusedClientId(r.id);if(r.tab==='invoices')setFocusedInvoiceNumber(r.ref);if(r.tab==='quotations')setFocusedQuotationNumber(r.ref);setSearchQuery('');}}>{r.label}</button>)}</section>}

            
            {activeTab === 'dashboard' && (
              <DashboardView onUpdateRenewalPayment={handleUpdateRenewalPayment}
                clients={clients}
                subscriptions={subscriptions}
                invoices={invoices}
                vendorBills={vendorBills}
                onNavigate={(tab) => setActiveTab(tab)}
                onRenew={handleRenewSubscription}
                onNewClient={() => { setCreateIntent('clients'); setActiveTab('clients'); }}
                onNewInvoice={() => { setCreateIntent('invoices'); setActiveTab('invoices'); }}
                onExportClientReport={handleExportClientReport}
                onToggleAutoRenew={handleToggleAutoRenew}
              />
            )}

            {activeTab === 'clients' && (
              <ClientsView onUpdateRenewalPayment={handleUpdateRenewalPayment}
                quotations={quotations}
                projects={projects}
                tasks={tasks}
                files={clientFiles}
                onOpenQuotation={(number, clientId) => { setFocusedClientId(clientId); setFocusedQuotationNumber(number); setActiveTab('quotations'); }}
                onOpenInvoice={(number, clientId) => { setFocusedClientId(clientId); setFocusedInvoiceNumber(number); setActiveTab('invoices'); }}
                initialClientId={focusedClientId}
                services={services}
                onUpdateServiceStatus={(id,status) => save('subscriptions', {status, ...(status === 'Cancelled' ? {auto_renew:false} : {})}, id)}
                openCreate={createIntent === 'clients'}
                onClearIntent={() => setCreateIntent('')}
                clients={clients}
                subscriptions={subscriptions}
                invoices={invoices}
                onAddClient={handleAddClient}
                onUpdateClient={handleUpdateClient}
                onImportClients={handleImportClients}
                onToggleAutoRenew={handleToggleAutoRenew}
                onPrepareQuotation={(clientId) => {
                  setPreselectedClientIdForQuotation(clientId);
                  setActiveTab('quotations');
                }}
                onOpenClientFolder={(clientId) => {
                  setTargetClientIdForFiles(clientId);
                  setActiveTab('files');
                }}
              />
            )}

            {activeTab === 'files' && (
              <FilesView
                clients={clients}
                quotations={quotations}
                invoices={invoices}
                clientFiles={clientFiles}
                projects={projects}
                facebookLeads={facebookLeads}
                agencyFbPages={agencyFbPages}
                onSyncFacebook={(id: number) => run('facebook_sync', { client_id: id }, 'Facebook leads synchronized.')}
                onAddFile={handleUploadClientFile}
                onDeleteFile={handleDeleteClientFile}
                onUpdateFile={handleUpdateClientFile}
                onNavigateToQuotation={(qNum: string) => { setFocusedQuotationNumber(qNum); setActiveTab('quotations'); }}
                onNavigateToInvoice={(invNum: string) => {
                  setFocusedInvoiceNumber(invNum);
                  setActiveTab('invoices');
                }}
                onPrepareQuotationForClient={(clientId: number) => {
                  setPreselectedClientIdForQuotation(clientId);
                  setActiveTab('quotations');
                }}
                onUpdateClientFbPage={handleUpdateClientFbPage}
                onAddFbLead={handleAddFbLead}
                onUpdateFbLeadStatus={handleUpdateFbLeadStatus}
                onOpenWhatsAppModal={(rec) => {
                  setWhatsAppRecipient(rec);
                  setIsWhatsAppModalOpen(true);
                }}
                initialSelectedClientId={targetClientIdForFiles}
              />
            )}

            {activeTab === 'services' && (
              <ServicesView
                clients={clients}
                onOpenClient={(clientId) => { setFocusedClientId(clientId); setActiveTab('clients'); }}
                services={services}
                onAddService={handleAddService}
                onUpdateService={handleUpdateService}
                onDeleteService={handleDeleteService}
                onNavigateToQuotations={(serviceId?: number) => {
                  setPreselectedServiceForQuotation(serviceId || null);
                  setActiveTab('quotations');
                }}
              />
            )}

            {activeTab === 'renewals' && (
              <RenewalsView summary={data.subscriptionSummary} onUpdateRenewalPayment={handleUpdateRenewalPayment} company={{...(data.settings?.company || {}),email:data.settings?.smtp?.from_email || data.settings?.company?.email || ''}}
                subscriptions={subscriptions}
                clients={clients}
                services={services}
                onRenew={handleRenewSubscription}
                onAddSubscription={handleAddSubscription}
                onToggleAutoRenew={handleToggleAutoRenew}
                emailNotifications={emailNotifications}
                onSendEmail={handleSendRenewalEmail}
                onSendAllEmails={handleSendAllRenewalEmails}
                onMarkExpiringSoon={handleMarkExpiringSoon}
              />
            )}

            {activeTab === 'invoices' && (
              <InvoicesView company={data.settings?.company || {}}
                payments={data.payments||[]} run={run} today={data.serverTime.slice(0,10)}
                openCreate={createIntent === 'invoices'}
                onClearIntent={() => setCreateIntent('')}
                invoices={invoices}
                clients={clients}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
                onImportInvoices={handleImportInvoices}
                selectedInvoiceNumber={focusedInvoiceNumber}
              />
            )}

            {activeTab === 'quotations' && (
              <QuotationsView company={data.settings?.company || {}}
                quotations={quotations}
                selectedQuotationNumber={focusedQuotationNumber}
                clients={clients}
                services={services}
                onAddQuotation={handleAddQuotation}
                onUpdateQuotation={handleUpdateQuotation}
                onDeleteQuotation={handleDeleteQuotation}
                onApproveAndGenerateInvoice={handleApproveAndGenerateInvoice}
                onViewInvoice={(invoiceNumber) => {
                  setFocusedInvoiceNumber(invoiceNumber);
                  setActiveTab('invoices');
                }}
                preselectedServiceId={preselectedServiceForQuotation}
                onClearPreselectedService={() => setPreselectedServiceForQuotation(null)}
                preselectedClientId={preselectedClientIdForQuotation}
                onClearPreselectedClient={() => setPreselectedClientIdForQuotation(null)}
              />
            )}

            {activeTab === 'vendors' && (
              <VendorsView
                vendors={vendors}
                vendorBills={vendorBills}
                recurringExpenses={recurringExpenses}
                onAddBill={handleAddVendorBill}
                onUpdateBill={handleUpdateVendorBill}
                onDeleteBill={handleDeleteVendorBill}
                onAddRecurringExpense={handleAddRecurringExpense}
                onUpdateRecurringExpense={handleUpdateRecurringExpense}
                onDeleteRecurringExpense={handleDeleteRecurringExpense}
                onToggleRecurringAutoEntry={handleToggleRecurringAutoEntry}
                onTriggerRecurringExpenseBill={handleTriggerRecurringExpenseBill}
                onTriggerAllDueRecurringExpenses={handleTriggerAllDueRecurringExpenses}
              />
            )}

            {activeTab === 'hr' && (
              <HrDocumentsView
                employees={data.employees || []}
                onSaveDocument={(r: any) => run('hr_generate', { data: r })}
                documents={data.hrDocuments || []}
                company={data.settings?.company || {}}
              />
            )}

            {activeTab === 'infrastructure' && <EntityManager resource="infrastructure" data={data} onSave={save} onDelete={remove} run={run} />}
            {activeTab === 'vault' && <EntityManager resource="vault" data={data} onSave={save} onDelete={remove} run={run} />}
            {activeTab === 'employees' && <EntityManager resource="employees" data={data} onSave={save} onDelete={remove} run={run} />}
            {activeTab === 'vendor-directory' && <EntityManager resource="vendors" data={data} onSave={save} onDelete={remove} run={run} />}
            {activeTab === 'facebook-leads' && <EntityManager resource="facebookLeads" data={data} onSave={save} onDelete={remove} run={run} />}
            {activeTab === 'settings' && <SettingsView data={data} run={run} />}
            {activeTab === 'projects' && <details className="portal-record-tools mb-5"><summary className="cursor-pointer font-bold">Manage project records & alert recipients</summary><div className="mt-4"><EntityManager resource="projects" data={data} onSave={save} onDelete={remove} run={run} /></div></details>}
            {activeTab === 'renewals' && <details className="portal-record-tools mb-5"><summary className="cursor-pointer font-bold">Edit subscription dates & details</summary><div className="mt-4"><EntityManager resource="subscriptions" data={data} onSave={save} onDelete={remove} run={run} /></div></details>}
            {activeTab === 'projects' && (
              <ProjectsKanbanView
                projects={projects}
                tasks={tasks}
                clients={clients}
                onAddTask={handleAddTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onUpdateTaskStatus={handleUpdateTaskStatus}
                onAddProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
                onSelectClient={(clientId) => { setFocusedClientId(clientId); setActiveTab('clients'); }}
                onToggleDeadlineAlerts={handleToggleDeadlineAlerts}
                onSetDeadlineAlertThreshold={handleSetDeadlineAlertThreshold}
                onExtendProjectDueDate={handleExtendProjectDueDate}
                onSendDeadlineAlert={handleSendProjectDeadlineAlert}
              />
            )}

          </div>
        </main>

      </div>

      {/* Hostinger Code & Deployment Package Viewer Modal */}
      {showCodeExplorer && (
        <CodeExplorerModal
          isOpen={showCodeExplorer}
          onClose={() => setShowCodeExplorer(false)}
        />
      )}

      {/* WhatsApp Business Cloud API & Messaging Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => {
            setIsWhatsAppModalOpen(false);
            setWhatsAppRecipient(null);
          }}
          config={whatsAppConfig}
          onSaveConfig={handleSaveWhatsAppConfig}
          logs={whatsAppLogs}
          onSendMessage={handleSendWhatsAppMessage}
          initialRecipient={whatsAppRecipient}
        />
      )}

    </div>
  );
}
