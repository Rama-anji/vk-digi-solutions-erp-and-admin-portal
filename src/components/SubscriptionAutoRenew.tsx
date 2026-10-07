import React, { useState } from 'react';
import { ClientSubscription } from '../types';
export function SubscriptionAutoRenew({ subscription: sub, onToggle }: { subscription: ClientSubscription; onToggle?: (id: number, enabled: boolean) => unknown }) {
  const [busy, setBusy] = useState(false);
  return <button type="button" role="switch" aria-label={`Auto-renew ${sub.client_name} ${sub.service_name}`} aria-checked={sub.auto_renew} disabled={busy || !onToggle || sub.status === 'Cancelled' || sub.billing_cycle === 'One-Time'}
    title="Auto-renew processes fully paid renewal invoices. It does not charge a card."
    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent disabled:opacity-50 ${sub.auto_renew ? 'bg-emerald-600' : 'bg-slate-300'}`}
    onClick={async () => { if (busy) return; setBusy(true); try { await onToggle?.(sub.id, !sub.auto_renew); } catch (e: any) { window.dispatchEvent(new CustomEvent('portal:error', { detail: e.message || 'Unable to update auto-renew.' })); } finally { setBusy(false); } }}>
    <span aria-hidden="true" className={`h-5 w-5 rounded-full bg-white shadow transition-transform ${sub.auto_renew ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>;
}
