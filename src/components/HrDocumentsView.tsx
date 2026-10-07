import { ActionButton } from './ActionButton';
import { downloadTextPdf } from '../utils/pdfUtils';
import React, { useState } from 'react';
import { 
  UserCheck, 
  FileText, 
  Printer, 
  Download, 
  Check, 
  Building, 
  Calendar,
  Briefcase
} from 'lucide-react';
import { Employee } from '../types';

interface HrDocumentsViewProps {
  employees: Employee[];
  onSaveDocument: (data: any) => Promise<any>;
  documents: any[];
  company: any;
}

export const HrDocumentsView: React.FC<HrDocumentsViewProps> = ({ employees, onSaveDocument, documents, company }) => {
  const [selectedEmpId, setSelectedEmpId] = useState<number>(employees[0]?.id || 1);
  const [docType, setDocType] = useState<'Offer Letter' | 'Appointment Letter' | 'Payslip' | 'Relieving Letter' | 'Experience Letter' | 'NOC' | 'F&F Statement'>('Offer Letter');

  const [savedDocument, setSavedDocument] = useState<any>(null);
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0,7));
  const [probation, setProbation] = useState(3);
  const [workLocation, setWorkLocation] = useState('');
  const [relievingDate, setRelievingDate] = useState(new Date().toISOString().slice(0,10));
  const [deductions, setDeductions] = useState({ pf: 0, pt: 0, tds: 0 });
  const selectedEmployee = savedDocument?.document_data?.employee || employees.find(e => e.id === selectedEmpId) || employees[0];
  const companyName = company.legal_name || 'VK Digi Solutions';
  const download = () => downloadTextPdf(docType, document.getElementById('printable-hr-doc')?.innerText || '', docType.replaceAll(' ','_') + '_' + selectedEmployee.emp_code + '.pdf');
  const saveDocument = async () => { try { const result = await onSaveDocument({ employee_id: selectedEmployee.id, doc_type: docType, generated_date: new Date().toISOString().slice(0,10), document_data: { employee: selectedEmployee, company, salaryMonth, probation, workLocation, relievingDate, deductions, rendered_text: document.getElementById('printable-hr-doc')?.innerText || '' } }); setSavedDocument(result.result || result); } catch(error:any) { window.dispatchEvent(new CustomEvent('portal:error',{detail:error.message})); } };
  if (!selectedEmployee) return <div className="space-y-6"><header className="portal-section-header"><div className="flex items-center gap-3.5"><span className="portal-module-icon"><FileText size={23}/></span><div><h2 className="text-xl font-black text-[#004077]">HR &amp; Documents</h2></div></div></header><div className="portal-settings-card portal-empty"><span className="portal-module-icon"><UserCheck size={26}/></span><h3>No employees yet</h3><p>Add your first employee in the Employees page to create offer letters, payslips and personalized documents.</p><div className="flex flex-wrap justify-center gap-2 pt-2">{['Offer Letters','Payslips','Experience Letters','NOCs'].map(label=><span key={label} className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-[#004077]">{label}</span>)}</div></div></div>;

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#004077] tracking-tight">HR &amp; Documents</h2>
          
        </div>
        <ActionButton
          onClick={download}
          className="px-4 py-2.5 bg-[#004077] hover:bg-[#00355F] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-900/20 transition flex items-center space-x-2"
        >
          <Printer size={15} />
          <span>Download PDF</span>
        </ActionButton>
      </div>

      <div className="portal-document-controls">
        <label>Salary month<input className="block border p-2 rounded" type="month" value={salaryMonth} onChange={e=>{setSavedDocument(null);setSalaryMonth(e.target.value);}} /></label>
        <label>Probation months<input className="block border p-2 rounded" type="number" min="0" value={probation} onChange={e=>{setSavedDocument(null);setProbation(Number(e.target.value));}} /></label>
        <label>Work location<input className="block border p-2 rounded" value={workLocation} onChange={e=>{setSavedDocument(null);setWorkLocation(e.target.value);}} /></label>
        <label>Relieving date<input className="block border p-2 rounded" type="date" value={relievingDate} onChange={e=>{setSavedDocument(null);setRelievingDate(e.target.value);}} /></label>
        {(['pf','pt','tds'] as const).map(key=><label key={key}>{key.toUpperCase()} deduction<input className="block border p-2 rounded" type="number" min="0" step="0.01" value={deductions[key]} onChange={e=>{setSavedDocument(null);setDeductions({...deductions,[key]:Number(e.target.value)});}} /></label>)}
        <ActionButton className="portal-primary" onClick={saveDocument}>Save document</ActionButton>
      </div>
      <details className="portal-record-tools"><summary>Saved documents ({documents.length})</summary>{documents.map(d=><div className="p-2 flex justify-between" key={d.id}><span>{d.employee_name} — {d.doc_type} — {d.generated_date}</span><ActionButton className="underline" onClick={()=>downloadTextPdf(d.doc_type,d.document_data.rendered_text || JSON.stringify(d.document_data,null,2),d.doc_type+'_'+d.id+'.pdf')}>Download saved PDF</ActionButton></div>)}</details>
      {/* Control Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-4 print:hidden">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Employee</label>
          <select
            value={selectedEmpId}
            onChange={(e) => { setSavedDocument(null); setSelectedEmpId(Number(e.target.value)); }}
            className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
          >
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.name} &bull; {emp.designation} ({emp.emp_code})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Select Document Template</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(['Offer Letter', 'Appointment Letter', 'Payslip', 'Relieving Letter', 'Experience Letter', 'NOC', 'F&F Statement'] as const).map(type => (
              <button
                key={type}
                onClick={() => { setSavedDocument(null); setDocType(type); }}
                className={`py-2 px-2 text-xs font-bold rounded-xl transition ${
                  docType === type
                    ? 'bg-[#EF7C00] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Official Printable Letterhead Card */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl p-8 sm:p-12 max-w-3xl mx-auto" id="printable-hr-doc">
        
        {/* Letterhead Header */}
        <div className="flex items-center justify-between border-b-2 border-[#004077] pb-6 mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-[#004077] text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-900/20">
              VK
            </div>
            <div>
              <h1 className="font-black text-xl text-[#004077] tracking-tight">{companyName}</h1>
              <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">VKD Digital Services</p>
              <p className="text-[10px] text-slate-400">CIN: {company.cin} &bull; GSTIN: {company.gstin}</p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>{company.address}</p>
            <p>{[company.city,company.state,company.postal_code].filter(Boolean).join(", ")}</p>
            <p>{company.email}</p>
          </div>
        </div>

        {/* Date & Reference */}
        <div className="flex items-center justify-between text-xs text-slate-600 mb-6">
          <p><strong>Ref:</strong> VKD/HR/{docType.replace(/\s+/g, '').toUpperCase()}/{new Date().getFullYear()}/{selectedEmployee.emp_code}</p>
          <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Document Content Templates */}
        {docType === 'Offer Letter' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <p>To,</p>
            <div className="font-bold text-slate-900">
              <p>{selectedEmployee.name}</p>
              <p>{selectedEmployee.email} &bull; {selectedEmployee.phone}</p>
            </div>

            <h3 className="text-sm font-black text-[#004077] uppercase text-center py-2 underline decoration-[#EF7C00] decoration-2">
              Employment Offer Letter &bull; {selectedEmployee.designation}
            </h3>

            <p>Dear {selectedEmployee.name},</p>
            <p>
              We are pleased to offer you the position of <strong>{selectedEmployee.designation}</strong> in our 
              <strong> {selectedEmployee.department}</strong> department at {companyName}
            </p>
            <p>
              Your gross annual Cost to Company (CTC) will be <strong>₹ {(selectedEmployee.salary * 12).toLocaleString('en-IN')}</strong> per annum 
              (₹ {selectedEmployee.salary.toLocaleString('en-IN')} per month), subject to standard statutory deductions.
            </p>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1 my-4">
              <p><strong>Designation:</strong> {selectedEmployee.designation}</p>
              <p><strong>Department:</strong> {selectedEmployee.department}</p>
              <p><strong>Joining Date:</strong> {selectedEmployee.joining_date}</p>
              <p><strong>Probation Period:</strong> {probation} Months</p>
              <p><strong>Work Location:</strong> {workLocation || '—'}</p>
            </div>
            <p>
              We look forward to welcoming you aboard our engineering and creative team. Please sign and return the duplicate copy of this letter as acceptance of this offer.
            </p>
          </div>
        )}

        {docType === 'Payslip' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="text-sm font-black text-[#004077] uppercase text-center py-1">
              Monthly Salary Statement &bull; {salaryMonth}
            </h3>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p><strong>Employee Name:</strong> {selectedEmployee.name}</p>
                <p><strong>Employee Code:</strong> {selectedEmployee.emp_code}</p>
                <p><strong>Designation:</strong> {selectedEmployee.designation}</p>
              </div>
              <div>
                <p><strong>Department:</strong> {selectedEmployee.department}</p>
                <p><strong>Bank Details:</strong> {selectedEmployee.bank_details}</p>
                <p><strong>Pay Period:</strong> 28 Days Paid</p>
              </div>
            </div>

            <table className="w-full text-left text-xs border border-slate-200">
              <thead className="bg-[#004077] text-white">
                <tr>
                  <th className="p-2.5">Earnings Description</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                  <th className="p-2.5">Deductions</th>
                  <th className="p-2.5 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5">Basic Salary (50%)</td>
                  <td className="p-2.5 text-right font-semibold">₹ {(selectedEmployee.salary * 0.5).toLocaleString('en-IN')}</td>
                  <td className="p-2.5">Provident Fund (PF)</td>
                  <td className="p-2.5 text-right">₹ {deductions.pf.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">House Rent Allowance (HRA)</td>
                  <td className="p-2.5 text-right font-semibold">₹ {(selectedEmployee.salary * 0.25).toLocaleString('en-IN')}</td>
                  <td className="p-2.5">Professional Tax (PT)</td>
                  <td className="p-2.5 text-right">₹ {deductions.pt.toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-2.5">Special Performance Allowance</td>
                  <td className="p-2.5 text-right font-semibold">₹ {(selectedEmployee.salary * 0.25).toLocaleString('en-IN')}</td>
                  <td className="p-2.5">Income Tax (TDS)</td>
                  <td className="p-2.5 text-right">₹ {deductions.tds.toFixed(2)}</td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td className="p-2.5">Gross Earnings</td>
                  <td className="p-2.5 text-right">₹ {selectedEmployee.salary.toLocaleString('en-IN')}</td>
                  <td className="p-2.5">Total Deductions</td>
                  <td className="p-2.5 text-right">₹ {(deductions.pf+deductions.pt+deductions.tds).toFixed(2)}</td>
                </tr>
                <tr className="bg-blue-50 font-black text-[#004077]">
                  <td colSpan={2} className="p-3 text-sm">NET PAYABLE (Transferred to Bank)</td>
                  <td colSpan={2} className="p-3 text-right text-sm text-[#EF7C00]">
                    ₹ {(selectedEmployee.salary - deductions.pf - deductions.pt - deductions.tds).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {docType === 'Relieving Letter' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="text-sm font-black text-[#004077] uppercase text-center py-2 underline decoration-[#EF7C00]">
              Relieving &amp; Service Clearance Certificate
            </h3>
            <p>To Whomsoever It May Concern,</p>
            <p>
              This is to certify that <strong>{selectedEmployee.name}</strong> was employed with {companyName} 
              as <strong>{selectedEmployee.designation}</strong> in the <strong>{selectedEmployee.department}</strong> department 
              from {selectedEmployee.joining_date} to {relievingDate}.
            </p>
            <p>
              During their tenure with us, {selectedEmployee.name} demonstrated exemplary technical and professional conduct. 
              They have successfully handed over all agency assets, client credentials, and codebase repositories. 
              All company dues and full-and-final settlements stand cleared.
            </p>
            <p>We wish them all the best in their future career endeavors.</p>
          </div>
        )}

        {docType === 'NOC' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <h3 className="text-sm font-black text-[#004077] uppercase text-center py-2 underline decoration-[#EF7C00]">
              No Objection Certificate (NOC)
            </h3>
            <p>To Whomsoever It May Concern,</p>
            <p>
              This is to confirm that <strong>{companyName}</strong> has no objection towards 
              <strong> {selectedEmployee.name}</strong> (Employee Code: {selectedEmployee.emp_code}) 
              pursuing higher education credentials or technical certifications while retaining their professional role.
            </p>
            <p>
              This certificate is issued at the specific request of the employee for administrative and academic verification purposes only.
            </p>
          </div>
        )}

        {docType === 'Appointment Letter' && <div className="space-y-4 text-sm"><h3 className="font-bold">Appointment Letter</h3><p>Dear {selectedEmployee.name},</p><p>You are appointed as {selectedEmployee.designation} in {selectedEmployee.department} effective {selectedEmployee.joining_date}, based at {workLocation || company.city}. Your monthly salary is INR {selectedEmployee.salary.toLocaleString('en-IN')}, with a probation period of {probation} months.</p><p>{company.default_terms}</p></div>}
        {docType === 'Experience Letter' && <div className="space-y-4 text-sm"><h3 className="font-bold">Experience Letter</h3><p>This certifies that {selectedEmployee.name} ({selectedEmployee.emp_code}) worked with {companyName} as {selectedEmployee.designation} in {selectedEmployee.department} from {selectedEmployee.joining_date} through {relievingDate}.</p></div>}
        {docType === 'F&F Statement' && <div className="space-y-4 text-sm"><h3 className="font-bold">Full &amp; Final Settlement</h3><p>{selectedEmployee.name} — {selectedEmployee.emp_code} — Last working day: {relievingDate}</p><p>Settlement month: {salaryMonth}</p><p>Gross salary: INR {selectedEmployee.salary.toFixed(2)}</p><p>PF: INR {deductions.pf.toFixed(2)}; PT: INR {deductions.pt.toFixed(2)}; TDS: INR {deductions.tds.toFixed(2)}</p><p>Net settlement: INR {(selectedEmployee.salary-deductions.pf-deductions.pt-deductions.tds).toFixed(2)}</p></div>}
        {/* Signature Block */}
        <div className="mt-16 pt-8 border-t border-slate-200 flex items-end justify-between text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800">{companyName}</p>
            <p className="text-slate-400 text-[10px]">Official Stamp &amp; Digital Seal</p>
          </div>
          <div className="text-right">
            <div className="w-32 h-10 border-b border-slate-400 mb-1 ml-auto"></div>
            <p className="font-bold text-slate-800">{company.authorized_signatory}</p>
            <p className="text-slate-500 text-[10px]">Managing Director &bull; HR Desk</p>
          </div>
        </div>

      </div>

    </div>
  );
};
