import { ActionButton } from './ActionButton';
import { POPUP_DURATION_MS } from '../useTimedMessage';
import React, { useState } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Settings,
  History,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Phone,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  Key,
  Globe,
  RefreshCw,
  Clock,
  ArrowRight } from
'lucide-react';
import { WhatsAppConfig, WhatsAppMessageLog, WhatsAppTemplate } from '../types';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WhatsAppConfig;
  onSaveConfig: (newConfig: WhatsAppConfig) => void;
  logs: WhatsAppMessageLog[];
  onSendMessage: (payload: {
    recipientName: string;
    recipientPhone: string;
    messageBody: string;
    templateId?: string;
    clientId?: number;
    clientName?: string;
    leadId?: string;
  }) => void;
  initialRecipient?: {
    name: string;
    phone: string;
    clientName?: string;
    clientId?: number;
    leadId?: string;
    serviceRequested?: string;
  } | null;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  logs,
  onSendMessage,
  initialRecipient
}) => {
  const [activeTab, setActiveTab] = useState<'send' | 'settings' | 'logs'>('send');

  // Send state
  const [recipientName, setRecipientName] = useState(initialRecipient?.name || '');
  const [recipientPhone, setRecipientPhone] = useState(initialRecipient?.phone || '');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialRecipient?.leadId ? 'tmpl-lead-greet' : 'tmpl-custom'
  );
  const [customMessage, setCustomMessage] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings form state
  const [formConfig, setFormConfig] = useState<WhatsAppConfig>(config);

  // Sync initial recipient changes
  React.useEffect(() => {
    if (initialRecipient) {
      setRecipientName(initialRecipient.name);
      setRecipientPhone(initialRecipient.phone);
      if (initialRecipient.leadId) {
        setSelectedTemplateId('tmpl-lead-greet');
      }
      setActiveTab('send');
    }
  }, [initialRecipient]);

  const currentTemplate = config.templates?.find((t) => t.id === selectedTemplateId) || config.templates?.[0];

  // Resolve message preview with dynamic variables - MUST be called before any early return to obey Rules of Hooks
  const resolvedMessage = React.useMemo(() => {
    if (selectedTemplateId === 'tmpl-custom' && customMessage) {
      return customMessage;
    }
    if (customMessage) return customMessage;
    let text = currentTemplate?.text || '';
    text = text.replace(/{{lead_name}}/g, recipientName || '[Lead Name]');
    text = text.replace(/{{client_name}}/g, initialRecipient?.clientName || 'VK Digi Solutions');
    text = text.replace(/{{service_requested}}/g, initialRecipient?.serviceRequested || 'Requested Service');
    return text;
  }, [currentTemplate, recipientName, initialRecipient, customMessage, selectedTemplateId]);

  React.useEffect(() => { if (!isOpen) return; const close = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, [isOpen, onClose]);
  if (!isOpen) return null;

  const handleSendViaApi = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!recipientPhone.trim()) return;

      await onSendMessage({
        recipientName: recipientName || 'Valued Contact',
        recipientPhone: recipientPhone,
        messageBody: resolvedMessage,
        templateId: selectedTemplateId,
        clientId: initialRecipient?.clientId,
        clientName: initialRecipient?.clientName,
        leadId: initialRecipient?.leadId
      });

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, POPUP_DURATION_MS);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const handleOpenWhatsAppWeb = () => {
    const cleanPhone = recipientPhone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(resolvedMessage);
    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    window.open(waUrl, '_blank');


  };

  const handleSaveSettings = async (e: React.FormEvent) => {try {
      e.preventDefault();
      await onSaveConfig(formConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), POPUP_DURATION_MS);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  const webhookEndpointUrl = new URL('./api/whatsapp_webhook.php', window.location.href).href;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div role="dialog" aria-modal="true" aria-label="WhatsApp Business" className="portal-whatsapp-dialog bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-[#004077] text-white p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-sm">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black tracking-tight text-white">WhatsApp Business Integration</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Meta WABA &bull; {config.webhook_status}
                </span>
              </div>
              <p className="text-xs text-blue-200/80">
                Connected Number: <strong className="text-white font-mono">{config.business_phone_number}</strong> &bull; Direct Cloud API &amp; Webhook
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close WhatsApp"
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition">
            
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/80 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('send')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'send' ?
            'border-[#EF7C00] text-[#004077]' :
            'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
            <Send size={14} className={activeTab === 'send' ? 'text-[#EF7C00]' : ''} />
            <span>Send Direct Message</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'settings' ?
            'border-[#EF7C00] text-[#004077]' :
            'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
            <Settings size={14} className={activeTab === 'settings' ? 'text-[#EF7C00]' : ''} />
            <span>WABA API &amp; Webhook Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'logs' ?
            'border-[#EF7C00] text-[#004077]' :
            'border-transparent text-slate-500 hover:text-slate-800'}`
            }>
            
            <History size={14} className={activeTab === 'logs' ? 'text-[#EF7C00]' : ''} />
            <span>Message Logs ({logs.length})</span>
          </button>
        </div>

        {/* Success Alert */}
        {savedSuccess &&
        <div className="m-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>WhatsApp message dispatched successfully to {recipientPhone}!</span>
          </div>
        }

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: SEND MESSAGE */}
          {activeTab === 'send' &&
          <form onSubmit={handleSendViaApi} className="space-y-5">
              
              {/* Recipient Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Recipient Contact Details</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Name / Lead Contact</label>
                    <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Rajiv Sengupta"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                  
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Mobile Number (with country code) *</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-3 text-slate-400" />
                      <input
                      type="text"
                      required
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder="+91 98310 99482"
                      className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                    
                    </div>
                  </div>
                </div>

                {initialRecipient?.clientName &&
              <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 pt-1">
                    <span>Associated Client:</span>
                    <strong className="text-[#004077]">{initialRecipient.clientName}</strong>
                    {initialRecipient.serviceRequested &&
                <span>&bull; Inquired: <span className="text-slate-700">{initialRecipient.serviceRequested}</span></span>
                }
                  </div>
              }
              </div>

              {/* Template Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Select Approved WhatsApp Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {config.templates.map((tmpl) =>
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tmpl.id)}
                  className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                  selectedTemplateId === tmpl.id ?
                  'border-[#EF7C00] bg-orange-50/70 ring-2 ring-[#EF7C00]/20' :
                  'border-slate-200 bg-white hover:bg-slate-50'}`
                  }>
                  
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold ${
                  selectedTemplateId === tmpl.id ? 'bg-[#EF7C00] text-white' : 'bg-slate-100 text-slate-500'}`
                  }>
                        {tmpl.category.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-slate-800 block truncate">{tmpl.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">{tmpl.name}</span>
                      </div>
                    </button>
                )}
                </div>
              </div>

              {/* Custom Message Field if selected */}
              {!currentTemplate?.meta_template &&
            <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message body override</label>
                  <textarea
                rows={3}
                value={customMessage || resolvedMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Type your bespoke message to this lead/client..."
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077]" />
              
                </div>
            }

              {/* WhatsApp Live Preview Bubble */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Live Message Preview</span>
                <div className="p-4 bg-[#E5DDD5] rounded-2xl border border-slate-300 relative overflow-hidden shadow-inner">
                  {/* WhatsApp chat bubble */}
                  <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-md ml-0 border border-slate-200/80 space-y-2">
                    <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#075E54]">
                      <Sparkles size={12} className="text-[#25D366]" />
                      <span>{config.business_phone_number} (VK Digi Solutions)</span>
                    </div>
                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {resolvedMessage}
                    </p>
                    <div className="flex items-center justify-end space-x-1 text-[10px] text-slate-400 pt-1">
                      <span>Just now</span>
                      <Check size={12} className="text-[#34B7F1]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                type="button"
                onClick={handleOpenWhatsAppWeb}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm"
                title="Open in WhatsApp Web / Desktop App">
                
                  <ExternalLink size={14} />
                  <span>Open in WhatsApp Web (wa.me)</span>
                </button>

                <ActionButton
                type="submit"
                className="px-5 py-2.5 bg-[#004077] hover:bg-[#00305a] text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md shadow-blue-900/20">
                
                  <Send size={14} className="text-[#EF7C00]" />
                  <span>Send via Meta Cloud API</span>
                </ActionButton>
              </div>
            </form>
          }

          {/* TAB 2: SETTINGS & WEBHOOK */}
          {activeTab === 'settings' &&
          <form onSubmit={handleSaveSettings} className="space-y-5">
              
              <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1">
                <div className="flex items-center space-x-2 font-bold text-sm text-[#004077]">
                  <ShieldCheck size={18} className="text-[#EF7C00]" />
                  <span>Meta for Developers &bull; WhatsApp Cloud API Integration</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Connect your WhatsApp Business account to VKD.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">WhatsApp Business Account ID (WABA ID) *</label>
                  <input
                  type="text"
                  required
                  value={formConfig.waba_id}
                  onChange={(e) => setFormConfig({ ...formConfig, waba_id: e.target.value })}
                  placeholder="WABA-920184729104829"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number ID *</label>
                  <input
                  type="text"
                  required
                  value={formConfig.phone_number_id}
                  onChange={(e) => setFormConfig({ ...formConfig, phone_number_id: e.target.value })}
                  placeholder="109384729104820"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Display Business Phone Number *</label>
                  <input
                  type="text"
                  required
                  value={formConfig.business_phone_number}
                  onChange={(e) => setFormConfig({ ...formConfig, business_phone_number: e.target.value })}
                  placeholder="+91 98200 12345"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Default Country Calling Code</label>
                  <input
                  type="text"
                  value={formConfig.default_country_code}
                  onChange={(e) => setFormConfig({ ...formConfig, default_country_code: e.target.value })}
                  placeholder="+91"
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Meta System User / Cloud API Access Token *</label>
                <div className="relative">
                  <Key size={14} className="absolute left-3 top-3 text-slate-400" />
                  <input
                  type="password"
                  required
                  value={formConfig.api_token}
                  onChange={(e) => setFormConfig({ ...formConfig, api_token: e.target.value })}
                  placeholder="EAAOx_..."
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#004077]" />
                
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Generated from Meta App Dashboard &gt; WhatsApp &gt; API Setup or System Users.</p>
              </div>

              {/* Webhook Configuration for Hostinger */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <Globe size={14} className="text-[#004077]" />
                    <span>Meta Webhook URL</span>
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    GET / POST Ready
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                  type="text"
                  readOnly
                  value={webhookEndpointUrl}
                  className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 select-all" />
                
                  <ActionButton
                  type="button"
                  onClick={() => copyToClipboard(webhookEndpointUrl)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-700 transition flex items-center space-x-1">
                  
                    {copiedWebhook ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                  </ActionButton>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Webhook Verify Token</label>
                    <input
                    type="text"
                    value={formConfig.webhook_verify_token}
                    onChange={(e) => setFormConfig({ ...formConfig, webhook_verify_token: e.target.value })}
                    placeholder="vkd_waba_secure_verify_token_2026"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-800" />
                  
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                    type="checkbox"
                    id="auto-greeting"
                    checked={formConfig.auto_greeting_enabled}
                    onChange={(e) => setFormConfig({ ...formConfig, auto_greeting_enabled: e.target.checked })}
                    className="w-4 h-4 text-[#004077] rounded focus:ring-[#004077]" />
                  
                    <label htmlFor="auto-greeting" className="text-xs font-bold text-slate-700">
                      Auto-send WhatsApp greeting to new Facebook Leads
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <ActionButton
                type="submit"
                className="px-5 py-2.5 bg-[#004077] hover:bg-[#00305a] text-white rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-md shadow-blue-900/20">
                
                  <Check size={14} className="text-emerald-400" />
                  <span>Save WhatsApp Configuration</span>
                </ActionButton>
              </div>
            </form>
          }

          {/* TAB 3: ACTIVITY LOGS */}
          {activeTab === 'logs' &&
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">WhatsApp Message Activity History</h4>
                  <p className="text-[11px] text-slate-500">Live delivery records from Meta Cloud API and direct chat dispatch.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#004077] border border-blue-200">
                  Total Dispatched: {logs.length}
                </span>
              </div>

              {logs.length === 0 ?
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-xs">
                  No WhatsApp messages logged yet. Use the &quot;Send Direct Message&quot; tab to dispatch your first message!
                </div> :

            <div className="space-y-2.5">
                  {logs.map((log) =>
              <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between space-x-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-800">{log.recipient_name}</span>
                          <span className="text-xs text-slate-500 font-mono">{log.recipient_phone}</span>
                          {log.client_name &&
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                              {log.client_name}
                            </span>
                    }
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white p-2 rounded-lg border border-slate-100">
                          {log.message_body}
                        </p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-400 pt-0.5">
                          <span className="flex items-center space-x-1">
                            <Clock size={11} />
                            <span>{log.sent_at}</span>
                          </span>
                          <span>Template: <strong className="text-slate-600">{log.template_used || 'Custom'}</strong></span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  log.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' :
                  log.status === 'Read' ? 'bg-blue-100 text-blue-800' :
                  log.status === 'Sent' ? 'bg-sky-100 text-sky-800' :
                  'bg-rose-100 text-rose-800'}`
                  }>
                          <CheckCircle2 size={11} className="mr-1" />
                          {log.status}
                        </span>
                      </div>
                    </div>
              )}
                </div>
            }
            </div>
          }

        </div>

      </div>
    </div>);

};
