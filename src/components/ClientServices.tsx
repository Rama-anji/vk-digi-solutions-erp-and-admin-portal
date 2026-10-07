import { RenewalPaymentStatus, UpdateRenewalPayment } from './RenewalPaymentStatus';
import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { ClientSubscription, ServiceCatalog } from '../types';

export function ClientServices({subscriptions,services,onUpdate,onUpdateRenewalPayment}:{onUpdateRenewalPayment:UpdateRenewalPayment;subscriptions:ClientSubscription[];services:ServiceCatalog[];onUpdate:(id:number,status:ClientSubscription['status'])=>Promise<unknown>}) {
  const [drafts,setDrafts]=useState<Record<number,ClientSubscription['status']>>({});
  const [busy,setBusy]=useState<number|null>(null),[error,setError]=useState(''),[message,setMessage]=useState('');
  return <section aria-label="Client services" className="space-y-3">
    {!subscriptions.length&&<p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No services assigned to this client yet. In Services &amp; Pricing, choose Add New Service Entry and select this client.</p>}
    {subscriptions.map(sub=>{const service=services.find(s=>s.id===sub.service_id);return <article key={sub.id} data-subscription-id={sub.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h4 className="font-bold text-[#004077]">{service?.service_name||sub.service_name}</h4><p className="text-xs text-slate-600">{service?.category||sub.category}</p></div><span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold">{sub.status}</span></div>
      {service?.description&&<p className="text-sm text-slate-600 whitespace-pre-line">{service.description}</p>}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">Client rate</dt><dd className="font-semibold">{sub.amount.toLocaleString('en-IN',{style:'currency',currency:'INR'})} / {sub.billing_cycle==='Custom'?sub.custom_duration:sub.billing_cycle}</dd></div><div><dt className="text-slate-500">Service period</dt><dd>{sub.start_date} to {sub.expiry_date}</dd></div><div><dt className="text-slate-500">Auto-renew</dt><dd>{sub.auto_renew?'Enabled':'Disabled'}</dd></div><div><dt className="text-slate-500">Catalogue availability</dt><dd>{service?.status||'Active'}</dd></div></dl>
      <RenewalPaymentStatus subscription={sub} onUpdate={onUpdateRenewalPayment} />
      <form className="flex flex-wrap items-end gap-3 portal-admin" onSubmit={async e=>{e.preventDefault();setBusy(sub.id);setError('');setMessage('');try{await onUpdate(sub.id,drafts[sub.id]??(sub.status==='Cancelled'?'Cancelled':'Active'));setDrafts(previous=>{const next={...previous};delete next[sub.id];return next;});setMessage('Service status updated for this client.');}catch(e:any){setError(e.message||'Could not update service status.');}finally{setBusy(null);}}}>
        <label className="portal-field flex-1">Client service status<select aria-label={`Status for ${service?.service_name||sub.service_name} subscription ${sub.id}`} value={drafts[sub.id]??(sub.status==='Cancelled'?'Cancelled':'Active')} onChange={e=>setDrafts({...drafts,[sub.id]:e.target.value as ClientSubscription['status']})} disabled={busy!==null}>{['Active','Cancelled'].map(status=><option key={status}>{status}</option>)}</select></label>
        <ActionButton className="portal-primary" disabled={busy!==null||(drafts[sub.id]??(sub.status==='Cancelled'?'Cancelled':'Active'))===(sub.status==='Cancelled'?'Cancelled':'Active')}>{busy===sub.id?'Saving…':'Save status'}</ActionButton>
      </form>
    </article>;})}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{message&&<p role="status" className="text-sm text-emerald-700">{message}</p>}
  </section>;
}
