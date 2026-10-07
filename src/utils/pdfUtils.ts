import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { request } from '../api';
const text = (value: any) => String(value ?? '').replace(/₹/g,'INR ').replace(/[–—]/g,'-');
export function downloadTextPdf(title: string, body: string, filename = title + '.pdf') {
  const pdf = new jsPDF(); pdf.setFontSize(16); pdf.text(text(title),14,18);
  autoTable(pdf,{startY:25,body:[[text(body)]],theme:'plain',styles:{fontSize:10,cellPadding:2,overflow:'linebreak'},columnStyles:{0:{cellWidth:180}}});
  pdf.save(filename);
}
export async function downloadCommercial(kind: 'invoice'|'quotation', record: any) {
  const response=await request('bootstrap'); const company=response.data.settings.company || {};
  const saved=response.data[kind==='invoice'?'invoices':'quotations'].find((r:any)=>r.id===record.id) || record;
  const client=response.data.clients.find((c:any)=>c.id===saved.client_id) || {};
  const fresh={...saved,client_address:[client.address,client.city].filter(Boolean).join(', '),client_email:client.email,client_mobile:client.mobile};
  const pdf=new jsPDF(); pdf.setFontSize(18); pdf.setTextColor(0,64,119); pdf.text(text(company.legal_name || 'VK Digi Solutions'),14,18); pdf.setTextColor(30); pdf.setFontSize(10);
  const title=(kind==='invoice'?'TAX INVOICE ':'QUOTATION ')+(fresh.invoice_number || fresh.quotation_number);
  autoTable(pdf,{startY:23,body:[[text([company.address,company.city,company.state,company.postal_code,company.country].filter(Boolean).join(', '))],[text([company.email,company.phone,company.gstin&&'GSTIN: '+company.gstin,company.pan&&'PAN: '+company.pan,company.cin&&'CIN: '+company.cin].filter(Boolean).join(' | '))],[title],[text(fresh.title)],[`Client: ${text(fresh.client_name)}`],[text(fresh.client_address)],[text([fresh.client_email,fresh.client_mobile].filter(Boolean).join(' | '))],[`Date: ${text(fresh.date || fresh.created_at)}   ${kind==='invoice'?'Due':'Valid until'}: ${text(fresh.due_date || fresh.valid_until)}`]],theme:'plain',styles:{fontSize:10,cellPadding:1.5}});
  autoTable(pdf,{startY:(pdf as any).lastAutoTable.finalY+5,head:[['Description','HSN/SAC','Qty','Rate (INR)','Amount (INR)']],body:(fresh.items || []).map((i:any)=>[text([i.desc || i.description || i.service_name,[i.unit,i.billing_cycle,i.custom_duration || i.service_duration,i.start_date].filter(Boolean).join(' | ')].filter(Boolean).join('\n')),text(i.hsn_sac),text(i.qty ?? i.quantity),Number(i.rate ?? i.unit_price).toFixed(2),(Number(i.qty ?? i.quantity)*Number(i.rate ?? i.unit_price)).toFixed(2)]),headStyles:{fillColor:[0,64,119]},styles:{fontSize:9}});
  const totals=[['Subtotal',Number(fresh.subtotal ?? (fresh.total_amount+(fresh.discount_amount||0))).toFixed(2)],['Discount',Number(fresh.discount_amount||0).toFixed(2)],[`GST (${fresh.gst_rate ?? 18}%)`,Number(fresh.gst_tax ?? fresh.gst_amount).toFixed(2)],['Grand total (INR)',Number(fresh.grand_total).toFixed(2)],['Status',fresh.payment_status || fresh.status]];
  autoTable(pdf,{startY:(pdf as any).lastAutoTable.finalY+5,body:totals,theme:'plain',styles:{fontSize:10},columnStyles:{1:{halign:'right'}}});
  const extra=[...(fresh.custom_fields || []).map((f:any)=>`${f.field_name}: ${f.field_value}`),fresh.notes,fresh.terms_conditions || company.default_terms,[company.bank_name,company.account_name,company.account_number,company.ifsc,company.upi_id].filter(Boolean).join(' | '),company.authorized_signatory].filter(Boolean).map(text);
  if(extra.length)autoTable(pdf,{startY:(pdf as any).lastAutoTable.finalY+5,body:extra.map(x=>[x]),theme:'plain',styles:{fontSize:9,overflow:'linebreak'}});
  pdf.save((fresh.invoice_number || fresh.quotation_number)+'.pdf');
}
export function downloadTable(data: any, filename: string) {
  const pdf=new jsPDF({orientation:'landscape'});
  const colors:Record<string, [number,number,number]>={navy:[0,64,119],slate:[51,65,85],emerald:[4,120,87],amber:[180,83,9],indigo:[67,56,202],blue:[29,78,216]};
  const theme=colors[data.theme] || colors.navy;
  autoTable(pdf,{startY:12,body:[data.headlineKicker,data.title,data.description].filter(Boolean).map(v=>[text(v)]),theme:'plain',styles:{fontSize:12,halign:data.headlineAlign || 'left',textColor:theme}});
  const columns=data.columns || [];
  autoTable(pdf,{startY:(pdf as any).lastAutoTable.finalY+4,head:[columns.map((c:any)=>text(c.header))],body:(data.rows || []).map((r:any)=>r.isSectionHeadline?[{content:text([r.headlineText,r.headlineSubtitle].filter(Boolean).join(' — ')),colSpan:columns.length,styles:{fillColor:colors[r.headlineTheme] || theme,textColor:255}}]:columns.flatMap((c:any)=>{const cell=r.cells?.[c.id];return cell?.isMergedHidden?[]:[{content:text(cell?.content),colSpan:cell?.colSpan || 1,rowSpan:cell?.rowSpan || 1,styles:{halign:cell?.align || c.align || 'left',fontStyle:cell?.bold || cell?.isHeader?'bold':'normal',...(cell?.isHeader?{fillColor:[241,245,249]}:{})}}];})),columnStyles:Object.fromEntries(columns.map((c:any,i:number)=>[i,{halign:c.align || 'left',...(String(c.width || '').endsWith('%')?{cellWidth:269*parseFloat(c.width)/100}:{})}])),styles:{fontSize:9},headStyles:{fillColor:theme}});
  pdf.save(filename.replace(/\.[^.]+$/,'')+'.pdf');
}
export async function downloadClientFile(file:any,quotations:any[],invoices:any[]) {
  if(file.reference_type==='quotation'){const q=quotations.find(q=>q.quotation_number===file.reference_id);if(q)return downloadCommercial('quotation',q);}
  if(file.reference_type==='invoice'){const i=invoices.find(i=>i.invoice_number===file.reference_id);if(i)return downloadCommercial('invoice',i);}
  if(file.table_data)return downloadTable(file.table_data,file.file_name);
  if(!file.file_url)throw new Error('This file has no stored content. Upload the file first.');
  const response=await fetch(file.file_url,{credentials:'same-origin'});if(!response.ok)throw new Error('Download failed. Please sign in again.');
  const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.file_name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
