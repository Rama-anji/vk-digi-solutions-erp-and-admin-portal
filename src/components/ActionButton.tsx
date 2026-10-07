import React from 'react';
import { ArrowLeft, Check, Copy, Download, Eye, FileText, FolderOpen, LogOut, Mail, Pencil, Plus, Printer, RefreshCw, Save, Send, Settings, Trash2, Upload, X, CreditCard } from 'lucide-react';

function buttonText(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return buttonText(child.props.children);
    return '';
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function existingIcon(children: React.ReactNode): React.ReactNode {
  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement<{ children?: React.ReactNode; size?: number }>(child)) continue;
    if (child.type === 'svg' || (typeof child.type !== 'string' && child.props.size != null)) return child;
    const nested = existingIcon(child.props.children);
    if (nested) return nested;
  }
  return null;
}

function iconFor(label: string) {
  if (/^(cancel|close|dismiss|discard)/i.test(label)) return X;
  if (/^(back|return)/i.test(label)) return ArrowLeft;
  if (/^(delete|remove|void)/i.test(label)) return Trash2;
  if (/^(download|export)/i.test(label)) return Download;
  if (/^(upload|import)/i.test(label)) return Upload;
  if (/^print/i.test(label)) return Printer;
  if (/^copy/i.test(label)) return Copy;
  if (/^(save|post|issue)/i.test(label)) return Save;
  if (/^(edit|update|change)/i.test(label)) return Pencil;
  if (/^(send|dispatch|resend)/i.test(label)) return Send;
  if (/^(renew|reset|retry|synchroniz|run|process)/i.test(label)) return RefreshCw;
  if (/^(approve|confirm|apply|match)/i.test(label)) return Check;
  if (/^(pay|disburse|record payment)/i.test(label)) return CreditCard;
  if (/^(configure|settings)/i.test(label)) return Settings;
  if (/^sign out/i.test(label)) return LogOut;
  if (/^(view|preview|reveal|test)/i.test(label)) return Eye;
  if (/^open/i.test(label)) return FolderOpen;
  if (/^email/i.test(label)) return Mail;
  if (/^(prepare|quote|generate)/i.test(label)) return FileText;
  return Plus;
}

/** Actions show an icon followed by their name. */
export function ActionButton({ children, className = '', title, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const label = props['aria-label'] || buttonText(children) || title || 'Action';
  const Icon = iconFor(label.replace(/^\+\s*/, ''));
  return <button {...props} aria-label={label} title={title || label} className={`${className} portal-icon-action`}>
    <span aria-hidden="true" className="portal-action-glyph">{existingIcon(children) || <Icon size={18} />}</span>
    <span className="portal-action-label">{label.replace(/^\+\s*/, '')}</span>
  </button>;
}
