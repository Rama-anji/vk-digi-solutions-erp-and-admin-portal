import React, { useState } from 'react';
import { ClientSubscription } from '../types';
import { ActionButton } from './ActionButton';
export type UpdateRenewalPayment = (id: number, invoiceNumber?: string) => Promise<unknown>;
export function RenewalPaymentStatus({ subscription: sub, onUpdate }: { subscription: ClientSubscription; onUpdate: UpdateRenewalPayment }) {
  const [busy, setBusy] = useState(false);
  const open = async (number?: string) => {
    if (busy) return;
    setBusy(true);
    try { await onUpdate(sub.id, number); }
    catch (error: any) { window.dispatchEvent(new CustomEvent('portal:error', { detail: error.message || 'Unable to open renewal payment.' })); }
    finally { setBusy(false); }
  };
  return <div className="space-y-2 text-left text-xs mb-2" data-renewal-payment={sub.id}>
    <p className="font-semibold">Next renewal payment: <span className={sub.payment_status === 'Paid' ? 'text-emerald-700' : 'text-amber-800'}>{sub.payment_status || 'Unpaid'}</span></p>
    <p className="text-slate-500">{sub.renewal_state}</p>
    {sub.legacy_payment_status === 'Paid' && !sub.renewal_history?.length && <p className="text-amber-800">Legacy Paid label has no linked receipt. Record the actual payment to renew.</p>}
    {sub.status !== 'Cancelled' && sub.billing_cycle !== 'One-Time' && <ActionButton type="button" disabled={busy} className="portal-secondary" onClick={() => void open(sub.renewal_invoice_number || undefined)}>{busy ? 'Opening...' : sub.renewal_invoice_number ? 'View renewal invoice / payment' : 'Record renewal payment'}</ActionButton>}
    {sub.renewal_error && <p className="text-amber-800">{sub.renewal_error}</p>}
    {!!sub.renewal_history?.length && <details><summary className="cursor-pointer font-bold text-[#004077]">Renewal history ({sub.renewal_history.length})</summary><ul className="mt-2 space-y-2">{sub.renewal_history.map(r => <li key={r.id} className="rounded border border-slate-200 p-2">
      <p>{r.period_start} to {r.period_end}</p><p>{r.status} / {r.payment_status} / {Number(r.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
      <button type="button" disabled={busy} className="text-[#004077] underline" onClick={() => void open(r.invoice_number)}>{r.invoice_number}</button>
    </li>)}</ul></details>}
  </div>;
}
