let csrf = '';
export async function request(action: string, payload?: any, signal?: AbortSignal): Promise<any> {
  const multipart = payload instanceof FormData;
  const response = await fetch(`./api/index.php?action=${encodeURIComponent(action)}`, {
    method: payload === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal,
    headers: payload === undefined ? {} : multipart ? { 'X-CSRF-Token': csrf } : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
    body: payload === undefined ? undefined : multipart ? payload : JSON.stringify(payload),
  });
  
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error('The backend is unavailable. Check that XAMPP Apache and MySQL are running.'); }
  if (data.csrf) csrf = data.csrf;
  if (!response.ok) { const error: any = new Error(data.error || `Request failed (${response.status})`); error.status = response.status; throw error; }
  return data;
}
export async function uploadFile(file: File, clientId: number, tag: string, projectId?: number, metadata?: { file_name: string; notes: string; file_type: string }) {
  const form = new FormData(); form.append('file', file); form.append('client_id', String(clientId));
  form.append('tag', tag); form.append('project_id', projectId ? String(projectId) : '');
  if (metadata) for (const [key,value] of Object.entries(metadata)) form.append(key,value);
  const result = await request('upload', form); window.dispatchEvent(new Event('portal:refresh')); return result.result;
}
