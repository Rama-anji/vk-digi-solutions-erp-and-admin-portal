import { ActionButton } from './ActionButton';
import React, { useState } from 'react';

const instructions:Record<string,string[]>={
 smtp:['Enter the SMTP host supplied by your email provider.','Use port 587 with TLS, or port 465 with SSL, as your provider specifies.','Enter the SMTP username and password/app password, plus an authorized sender email.','Save settings, check the connection, then send one test email to an address you control. Confirm it arrives before enabling automatic sending.'],
 whatsapp:['In your Meta app, find WhatsApp → API Setup. Copy the WhatsApp Business Account ID and Phone Number ID (these are not the phone number).','Enter the business phone number and an access token authorized for this WhatsApp account. Save settings.','For incoming messages, add the app secret and a verification token of your choice. Configure the displayed public HTTPS webhook URL in Meta using the same verification token. Localhost cannot receive Meta callbacks.','Check account access here. Send an approved template to an authorized test recipient from WhatsApp Hub; review the delivery status. Enable automatic greetings only after this succeeds.'],
 facebook:['Enter the Page access token with access to the Page and its lead forms. Add the Meta app secret and webhook verification token if using incoming callbacks.','Save settings, enter the numeric Page ID below and check account access.','In Files & Drive, open the client folder and map its Facebook Page and lead form. Then synchronize that client’s leads.','Confirm imported leads belong to the intended client before enabling automatic WhatsApp greetings.']
};
export function IntegrationDiagnostics({section,data,run}:{section:string;data:any;run:any}) {
 const [pageId,setPageId]=useState(''),[recipient,setRecipient]=useState(''),[key,setKey]=useState(()=>crypto.randomUUID()),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 if(!instructions[section])return null;
 const result=data.integrationChecks?.[section];
 const perform=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await fn();}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 return <div className="portal-settings-card space-y-4"><h3>Setup &amp; verification</h3><ol className="list-decimal pl-5 space-y-2 text-sm text-slate-600">{instructions[section].map(s=><li key={s}>{s}</li>)}</ol><p className="text-xs text-slate-500">Save the fields above before checking. Saved secrets stay on the server; a blank password/token field keeps its existing value.</p>
  {section==='facebook'&&<label className="portal-field">Page ID to check<input aria-label="Page ID to check" inputMode="numeric" value={pageId} onChange={e=>setPageId(e.target.value)}/></label>}
  <button className="portal-secondary" disabled={busy} onClick={()=>void perform(async()=>{const r=await run('integration_check',{provider:section,page_id:pageId},'');setMessage(r.message);})}>{busy?'Checking…':'Check saved connection'}</button>
  {result?.checked_at&&<p className="text-sm" role="status">Last check: {result.status.replaceAll('_',' ')} — {result.message} ({new Date(result.checked_at).toLocaleString()})</p>}
  {section==='smtp'&&<form className="space-y-3 border-t pt-4" onSubmit={e=>{e.preventDefault();void perform(async()=>{await run('integration_test_email',{recipient,request_key:key},'');setKey(crypto.randomUUID());setMessage('The SMTP server accepted the test email. Confirm it arrived in the recipient inbox before enabling automatic sending.');});}}><label className="portal-field">Authorized test email<input aria-label="Authorized test email" type="email" required value={recipient} onChange={e=>{setRecipient(e.target.value);setKey(crypto.randomUUID());}}/></label><ActionButton className="portal-primary" disabled={busy}>Send one test email</ActionButton></form>}
  {message&&<p className="portal-information" role="status">{message}</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
 </div>;
}
