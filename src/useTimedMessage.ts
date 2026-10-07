import { useCallback, useEffect, useState } from 'react';

export const POPUP_DURATION_MS = 10_000;

export function useTimedMessage() {
  const [notice, setNotice] = useState({ text: '' });
  const setMessage = useCallback((text: string) => setNotice({ text }), []);
  useEffect(() => {
    if (!notice.text) return;
    const timer = window.setTimeout(() => setNotice({ text: '' }), POPUP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return [notice.text, setMessage] as const;
}

export function showPopup(message: string) {
  window.dispatchEvent(new CustomEvent('portal:error', { detail: message }));
}
