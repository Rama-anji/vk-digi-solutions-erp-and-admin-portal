import React, { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { ClientSubscription } from '../types';
import { ActionButton } from './ActionButton';
export type RenewSubscription = (id: number, expectedExpiry: string) => Promise<unknown>;
export function RenewSubscriptionButton({ subscription: sub, onRenew }: { subscription: ClientSubscription; onRenew: RenewSubscription }) {
  const [busy, setBusy] = useState(false);
  return <div><ActionButton type="button" className="portal-primary" disabled={busy || !sub.can_renew} title={sub.can_renew ? 'Extend one paid billing period' : 'Record the full renewal payment first. Cancelled and one-time services cannot renew.'} onClick={async () => {
    if (busy) return;
    setBusy(true);
    try { await onRenew(sub.id, sub.expiry_date); }
    catch (error: any) { window.dispatchEvent(new CustomEvent('portal:error', { detail: error.message || 'Unable to renew. Please retry.' })); }
    finally { setBusy(false); }
  }}><RotateCw size={14} />{busy ? 'Renewing...' : `Renew (${sub.billing_cycle})`}</ActionButton></div>;
}
