import { ActionButton } from './ActionButton';
import React, { useEffect, useRef } from 'react';
import { ClientSubscription } from '../types';
import { useTimedMessage } from '../useTimedMessage';

export function ExpiryNotice({ subscriptions, onViewRenewals }: { subscriptions: ClientSubscription[]; onViewRenewals: () => void }) {
  const seen = useRef(new Set<string>());
  const [message, setMessage] = useTimedMessage();
  const expired = subscriptions.filter(s => s.status === 'Expired');
  const signature = JSON.stringify(expired.map(s => `${s.id}:${s.expiry_date}`).sort());
  useEffect(() => {
    const keys: string[] = JSON.parse(signature);
    const fresh = keys.filter(key => !seen.current.has(key));
    if (!keys.length) setMessage('');
    if (!fresh.length) return;
    fresh.forEach(key => seen.current.add(key));
    setMessage(`${fresh.length} client service${fresh.length === 1 ? ' has' : 's have'} expired. Review the service dates and renewals.`);
  }, [signature, setMessage]);

  return message ? <div role="alert" aria-label="Expired services" className="fixed bottom-24 right-5 left-5 sm:left-auto sm:max-w-md z-50 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 shadow-xl">
    <p className="font-bold">Service expiry alert</p><p className="mt-1">{message}</p>
    <div className="mt-3 flex gap-4"><ActionButton className="font-bold underline" onClick={() => { setMessage(''); onViewRenewals(); }}>View renewals</ActionButton><ActionButton className="underline" onClick={() => setMessage('')}>Dismiss</ActionButton></div>
  </div> : null;
}
