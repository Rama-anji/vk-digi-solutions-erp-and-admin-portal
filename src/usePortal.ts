import { useCallback, useEffect, useRef, useState } from 'react';
import { request } from './api';
import { useTimedMessage } from './useTimedMessage';
export function usePortal() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useTimedMessage();
  const [message, setMessage] = useTimedMessage();
  const writing = useRef(0); const epoch = useRef(0); const reading = useRef(false);
  const pending = useRef(new Map<string, Promise<any>>());
  const queue = useRef<Promise<any>>(Promise.resolve());
  const refresh = useCallback(async () => {
    if (writing.current || reading.current) return;
    const version = epoch.current; reading.current = true;
    try { const response = await request('bootstrap'); if (version === epoch.current && !writing.current) { setData(response.data); setUser(response.user); } }
    catch (e: any) { if (e.status === 401) { setUser(null); setData(null); } else setError(e.message); }
    finally { reading.current = false; }
  }, []);
  useEffect(() => { let alive = true; (async () => {
    try { const session = await request('session'); if (!alive) return; setUser(session.user); if (session.user) await refresh(); }
    catch (e: any) { if (alive) setError(e.message); } finally { if (alive) setLoading(false); }
  })(); return () => { alive = false; }; }, [refresh]);
  useEffect(() => { if (!user) return;
    const update = () => { if (!document.hidden) void refresh(); }; const timer = setInterval(update, 3000);
    window.addEventListener('focus', update); window.addEventListener('portal:refresh', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); window.removeEventListener('portal:refresh', update); };
  }, [user?.id, refresh]);
  const run = useCallback((action: string, payload: any, success = 'Saved successfully.') => {
    const key = JSON.stringify([action,payload]);
    const existing = pending.current.get(key); if (existing) return existing;
    writing.current++; epoch.current++; setBusy(true); setError('');
    const execute = async () => {
    try { const response = await request(action, payload); if (response.data) setData(response.data); if (response.user) setUser(response.user); if (success) setMessage(success); return response.result ?? response; }
    catch (e: any) { setError(e.message); if (e.status === 401) setUser(null); throw e; }
    finally { writing.current--; setBusy(writing.current > 0); epoch.current++; pending.current.delete(key); }
    };
    const result = queue.current.then(execute,execute);
    queue.current = result.catch(() => {}); pending.current.set(key,result); return result;
  }, []);
  const login = async (email: string, password: string, remember = false) => { await run('login', { email, password, remember }, 'Signed in.'); };
  const logout = async () => { await run('logout', {}, ''); setUser(null); setData(null); await request('session'); };
  const save = (resource: string, record: any, id?: any) => run('save', { resource, data: record, ...(id != null ? { id } : {}) });
  const remove = (resource: string, id: any) => run('delete', { resource, id }, 'Deleted successfully.');
  useEffect(() => { const handler = (event: PromiseRejectionEvent) => { setError(event.reason?.message || 'Action failed. Please retry.'); event.preventDefault(); }; window.addEventListener('unhandledrejection', handler); return () => window.removeEventListener('unhandledrejection', handler); }, []);
  useEffect(() => { const handler = (event: Event) => setError((event as CustomEvent).detail); window.addEventListener('portal:error', handler); return () => window.removeEventListener('portal:error', handler); }, []);
  return { user, data, loading, busy, error, message, setError, setMessage, refresh, run, login, logout, save, remove };
}
