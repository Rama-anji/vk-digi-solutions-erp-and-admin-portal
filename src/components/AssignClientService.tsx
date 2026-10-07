import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { BillingCycle, ClientSubscription, ServiceCatalog } from '../types';

export type NewClientService = Pick<ClientSubscription, 'client_id' | 'service_id' | 'billing_cycle' | 'custom_duration' | 'start_date' | 'expiry_date' | 'amount' | 'status' | 'auto_renew'>;

export function AssignClientService({ clientId, services, onSave }: {
  clientId: number;
  services: ServiceCatalog[];
  onSave: (record: NewClientService) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const empty = (): NewClientService => ({ client_id: clientId, service_id: 0, billing_cycle: 'Monthly', custom_duration: '', start_date: new Date().toLocaleDateString('en-CA'), expiry_date: '', amount: 0, status: 'Active', auto_renew: false });
  const [draft, setDraft] = useState<NewClientService>(empty);
  const available = services.filter(s => s.status !== 'Inactive');

  return <div className="portal-admin space-y-3">
    {!open && <ActionButton type="button" className="portal-primary" onClick={() => { setDraft(empty()); setError(''); setMessage(''); setOpen(true); }}>Add service to client</ActionButton>}
    {open && <form className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4" onSubmit={async e => {
      e.preventDefault();
      setError('');
      if (!available.some(s => s.id === draft.service_id)) { setError('Select an available service.'); return; }
      if (draft.expiry_date < draft.start_date) { setError('End date must be on or after the start date.'); return; }
      if (!Number.isFinite(draft.amount) || draft.amount < 0) { setError('Enter a valid client rate.'); return; }
      setBusy(true);
      try {
        await onSave({ ...draft, client_id: clientId, custom_duration: draft.billing_cycle === 'Custom' ? draft.custom_duration?.trim() : undefined, auto_renew: draft.billing_cycle !== 'One-Time' && draft.auto_renew });
        setOpen(false); setMessage('Service added to this client.');
      } catch (e: any) { setError(e.message || 'Could not add service. Please retry.'); }
      finally { setBusy(false); }
    }}>
      <h4 className="font-bold text-[#004077]">Assign a service</h4>
      {!available.length && <p className="text-sm text-slate-600">Add an active service in the Services Catalogue first.</p>}
      <fieldset disabled={busy} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="portal-field sm:col-span-2">Service<select aria-label="Service" required value={draft.service_id || ''} onChange={e => {
          const service = available.find(s => s.id === Number(e.target.value));
          if (service) setDraft({ ...draft, service_id: service.id, amount: service.default_rate, billing_cycle: service.billing_frequency, custom_duration: service.custom_duration || '', auto_renew: false });
        }}><option value="" disabled>Select a service</option>{available.map(s => <option key={s.id} value={s.id}>{s.service_name} - {s.category}</option>)}</select></label>
        <label className="portal-field">Client rate (INR)<input required type="number" min="0" step="0.01" value={draft.amount} onChange={e => setDraft({ ...draft, amount: Number(e.target.value) })} /></label>
        <label className="portal-field">Billing cycle<select aria-label="Billing cycle" value={draft.billing_cycle} onChange={e => setDraft({ ...draft, billing_cycle: e.target.value as BillingCycle, auto_renew: false })}>{['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom', 'One-Time'].map(c => <option key={c}>{c}</option>)}</select></label>
        {draft.billing_cycle === 'Custom' && <label className="portal-field sm:col-span-2">Custom duration<input required pattern="[1-9][0-9]* (day|week|month|year)s?" placeholder="45 days" title="Use a duration such as 45 days or 2 months" value={draft.custom_duration || ''} onChange={e => setDraft({ ...draft, custom_duration: e.target.value })} /></label>}
        <label className="portal-field">Service start date<input required type="date" value={draft.start_date} onChange={e => setDraft({ ...draft, start_date: e.target.value })} /></label>
        <label className="portal-field">Service end date<input required type="date" min={draft.start_date} value={draft.expiry_date} onChange={e => setDraft({ ...draft, expiry_date: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" disabled={draft.billing_cycle === 'One-Time'} checked={draft.auto_renew} onChange={e => setDraft({ ...draft, auto_renew: e.target.checked })} />Auto-renew this service</label>
      </fieldset>
      <div className="flex flex-wrap gap-2"><ActionButton disabled={busy || !available.length} className="portal-primary">{busy ? 'Saving...' : 'Save client service'}</ActionButton><ActionButton type="button" disabled={busy} className="portal-secondary" onClick={() => { setOpen(false); setError(''); }}>Cancel</ActionButton></div>
    </form>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
  </div>;
}
