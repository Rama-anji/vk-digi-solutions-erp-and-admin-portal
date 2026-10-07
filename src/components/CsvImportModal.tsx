import { ActionButton } from './ActionButton';
import { showPopup } from '../useTimedMessage';
import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  FileText, 
  ArrowRight
} from 'lucide-react';
import { triggerCSVDownload } from '../utils/csvUtils';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type: 'clients' | 'invoices';
  sampleCsv: string;
  sampleFilename: string;
  onConfirmImport: (parsedData: any[]) => void;
  parseFunction: (csvText: string) => { data: any[]; errors: string[]; warnings: string[]; totalRows: number };
  renderAsPage?: boolean;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type,
  sampleCsv,
  sampleFilename,
  onConfirmImport,
  parseFunction,
  renderAsPage = false
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parseResult, setParseResult] = useState<{
    data: any[];
    errors: string[];
    warnings: string[];
    totalRows: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessText = (text: string, name?: string) => {
    setCsvContent(text);
    if (name) setFileName(name);
    const res = parseFunction(text);
    setParseResult({
      data: res.data,
      errors: res.errors,
      warnings: res.warnings,
      totalRows: res.totalRows
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFile(file);
  };

  const readFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      showPopup('Please select a valid .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleProcessText(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleDownloadSample = () => {
    triggerCSVDownload(sampleCsv, sampleFilename);
  };

  const handleReset = () => {
    setCsvContent('');
    setFileName('');
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommit = () => {
    if (!parseResult || parseResult.data.length === 0) return;
    onConfirmImport(parseResult.data);
    handleReset();
    onClose();
  };

  const contentJSX = (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm w-full ${renderAsPage ? '' : 'max-w-2xl max-h-[90vh] shadow-2xl'} overflow-hidden flex flex-col animate-in fade-in`}>
      
      {/* Header */}
      <div className="bg-[#004077] text-white p-5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#EF7C00]">
            <FileSpreadsheet size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold leading-tight">{title}</h3>
            <p className="text-xs text-blue-200 mt-0.5">{description}</p>
          </div>
        </div>
        <ActionButton
          onClick={() => {
            handleReset();
            onClose();
          }}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center space-x-1"
        >
          <X size={15} />
          <span>Close</span>
        </ActionButton>
      </div>

        {/* Action Tabs & Sample Template Link */}
        <div className="px-6 pt-4 pb-2 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'upload'
                  ? 'bg-blue-50 text-[#004077] border border-[#004077]/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload size={13} />
              <span>Upload CSV File</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                activeTab === 'paste'
                  ? 'bg-blue-50 text-[#004077] border border-[#004077]/20'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText size={13} />
              <span>Paste CSV Raw Text</span>
            </button>
          </div>

          <ActionButton
            onClick={handleDownloadSample}
            className="text-xs font-bold text-[#EF7C00] hover:text-[#D96F00] flex items-center space-x-1 transition"
          >
            <Download size={13} />
            <span>Download Sample Template</span>
          </ActionButton>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* UPLOAD TAB */}
          {activeTab === 'upload' && !parseResult && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                isDragging
                  ? 'border-[#EF7C00] bg-orange-50/50'
                  : 'border-slate-200 hover:border-[#004077] bg-slate-50/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#004077]">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Click to select or drag and drop a CSV file
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Standard comma-separated format (.csv) supported
                </p>
              </div>
            </div>
          )}

          {/* PASTE TAB */}
          {activeTab === 'paste' && !parseResult && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Paste CSV Rows (including header line):
              </label>
              <textarea
                rows={7}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder={sampleCsv}
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#004077]"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleProcessText(csvContent, 'Pasted Data')}
                  disabled={!csvContent.trim()}
                  className="px-4 py-2 bg-[#004077] hover:bg-[#00355F] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>Parse &amp; Preview</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* PARSE RESULTS PREVIEW */}
          {parseResult && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet size={16} className="text-[#004077]" />
                  <span className="text-xs font-bold text-slate-700">
                    {fileName || 'CSV Payload'}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-md font-bold bg-blue-100 text-[#004077]">
                    {parseResult.data.length} valid items ready
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline"
                >
                  Choose another file
                </button>
              </div>

              {/* Errors if any */}
              {parseResult.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-700 font-bold text-xs">
                    <AlertCircle size={14} />
                    <span>Parsing Errors</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-600 space-y-0.5 pl-1">
                    {parseResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings if any */}
              {parseResult.warnings.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
                    <AlertTriangle size={14} />
                    <span>Notices &amp; Coercions ({parseResult.warnings.length})</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 space-y-0.5 pl-1 max-h-24 overflow-y-auto">
                    {parseResult.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Table Preview */}
              {parseResult.data.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center">
                    <span>Data Preview (Showing first 5 rows)</span>
                    <span className="text-slate-500 font-normal">
                      Total {parseResult.data.length} records to import
                    </span>
                  </div>
                  <div className="max-h-48 overflow-x-auto overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                        {type === 'clients' ? (
                          <tr>
                            <th className="py-2 px-3 font-semibold">Code</th>
                            <th className="py-2 px-3 font-semibold">Company</th>
                            <th className="py-2 px-3 font-semibold">Type</th>
                            <th className="py-2 px-3 font-semibold">Contact</th>
                            <th className="py-2 px-3 font-semibold">City</th>
                            <th className="py-2 px-3 font-semibold">Status</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="py-2 px-3 font-semibold">Inv #</th>
                            <th className="py-2 px-3 font-semibold">Client</th>
                            <th className="py-2 px-3 font-semibold">Subtotal</th>
                            <th className="py-2 px-3 font-semibold">GST (18%)</th>
                            <th className="py-2 px-3 font-semibold">Grand Total</th>
                            <th className="py-2 px-3 font-semibold">Status</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parseResult.data.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {type === 'clients' ? (
                              <>
                                <td className="py-2 px-3 font-mono text-[#004077] font-semibold">{row.client_code}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{row.name}</td>
                                <td className="py-2 px-3 text-slate-600">{row.client_type}</td>
                                <td className="py-2 px-3 text-slate-600">{row.contact_person}</td>
                                <td className="py-2 px-3 text-slate-600">{row.city}</td>
                                <td className="py-2 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">
                                    {row.status}
                                  </span>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 font-mono text-[#004077] font-semibold">{row.invoice_number}</td>
                                <td className="py-2 px-3 font-medium text-slate-800">{row.client_name}</td>
                                <td className="py-2 px-3 text-slate-600">₹{row.total_amount?.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-slate-600">₹{row.gst_tax?.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 font-bold text-slate-900">₹{row.grand_total?.toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3">
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                    {row.payment_status}
                                  </span>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  No valid records found in the parsed CSV. Please check the header formatting or download the sample template.
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between">
          <ActionButton
            type="button"
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            Cancel
          </ActionButton>

          <ActionButton
            type="button"
            onClick={handleCommit}
            disabled={!parseResult || parseResult.data.length === 0}
            className="px-5 py-2.5 bg-[#EF7C00] hover:bg-[#D96F00] disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition flex items-center space-x-1.5"
          >
            <CheckCircle2 size={15} />
            <span>
              Confirm Import ({parseResult?.data.length || 0} {type === 'clients' ? 'Clients' : 'Invoices'})
            </span>
          </ActionButton>
        </div>

      </div>
    );

  if (renderAsPage) {
    return contentJSX;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      {contentJSX}
    </div>
  );
};
