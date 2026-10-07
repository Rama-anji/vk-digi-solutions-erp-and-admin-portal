import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Database, 
  Server, 
  Shield, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import JSZip from 'jszip';
import { PHP_PROJECT_FILES, SourceFile } from '../data/sourceCodeFiles';

interface CodeExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeExplorerModal: React.FC<CodeExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<SourceFile>(PHP_PROJECT_FILES[0]);
  const [copied, setCopied] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const blob = new Blob([selectedFile.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = selectedFile.name;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      PHP_PROJECT_FILES.forEach(file => {
        zip.file(file.path, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'vkd_backend_sources.zip';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP packaging failed:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 z-50 animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-label="Backend source explorer" className="portal-code-dialog bg-white w-full max-w-5xl h-[88vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Top Modal Header */}
        <div className="p-4 sm:px-6 py-3.5 bg-[#004077] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#EF7C00] flex items-center justify-center font-black text-white text-sm">
              PHP
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Current Backend Sources &amp; Database</h2>
              <p className="text-[11px] text-blue-200">Native PHP 8.1/8.2 &bull; MySQL 8 / MariaDB &bull; Zero Node/Composer dependencies</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="px-3 py-1.5 bg-[#EF7C00] hover:bg-[#D96F00] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Download size={13} />
              <span>{downloadingZip ? 'Packaging...' : 'Export Source ZIP'}</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close source explorer"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: Sidebar Files + Code View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* File Tree Left Navigation */}
          <div className="w-full md:w-64 bg-slate-50 border-r border-slate-200 p-3 space-y-2 overflow-y-auto shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Backend files
            </div>
            {PHP_PROJECT_FILES.map(file => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center space-x-2.5 ${
                    isSelected 
                      ? 'bg-[#004077] text-white font-bold shadow-xs' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {file.category === 'Database' ? (
                    <Database size={15} className={isSelected ? 'text-[#EF7C00]' : 'text-blue-600'} />
                  ) : file.category === 'Security' ? (
                    <Shield size={15} className={isSelected ? 'text-[#EF7C00]' : 'text-emerald-600'} />
                  ) : (
                    <FileCode size={15} className={isSelected ? 'text-[#EF7C00]' : 'text-amber-600'} />
                  )}
                  <div className="truncate">
                    <p className="truncate leading-none">{file.name}</p>
                    <span className={`text-[10px] font-normal ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                      {file.category}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Quick 3-Minute Backend Source Bundle Guide */}
            <div className="mt-4 p-3 bg-blue-50/80 rounded-xl border border-blue-200/70 text-[11px] text-slate-700 space-y-1.5">
              <div className="flex items-center space-x-1 font-bold text-[#004077]">
                <BookOpen size={13} />
                <span>Source bundle:</span>
              </div>
              <p className="mt-2">This ZIP contains the current database and backend sources. It excludes local credentials and the frontend build. Follow README.md in the project for setup and deployment.</p>
            </div>
          </div>

          {/* Right Area: Code Display */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* Code Bar */}
            <div className="p-3 px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-white">{selectedFile.path}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                  {selectedFile.language.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  onClick={handleDownloadSingle}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <Download size={12} />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Code Content Container */}
            <div className="flex-1 p-4 overflow-auto font-mono text-xs text-emerald-400 leading-relaxed select-text bg-slate-900">
              <pre className="whitespace-pre">{selectedFile.content}</pre>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3 px-6 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Runtime: <strong>React, PHP 8.1+, MariaDB / MySQL</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
