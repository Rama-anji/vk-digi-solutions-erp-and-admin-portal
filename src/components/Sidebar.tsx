import React, { useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  RefreshCw, 
  FileText, 
  FileSpreadsheet, 
  Building2, 
  Server, 
  KeyRound, 
  FolderKanban, 
  UserCheck, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Boxes,
  FolderClosed,
  LogOut,
  MessageSquare
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  compact: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  expiringCount: number;
  projectAlertsCount?: number;
  onLogout?: () => void;
  onOpenWhatsApp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen, compact, onClose,
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  expiringCount,
  projectAlertsCount = 0,
  onLogout,
  onOpenWhatsApp
}) => {
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!compact || !mobileOpen) return;
    const previous = document.activeElement as HTMLElement;
    const nav = navRef.current!;
    nav.querySelector<HTMLButtonElement>('button')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(nav.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    nav.addEventListener('keydown', keydown);
    return () => { nav.removeEventListener('keydown', keydown); previous?.focus(); };
  }, [compact, mobileOpen]);
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'clients', label: 'Clients Directory', icon: Users, badge: null },
    { id: 'services', label: 'Services & Pricing', icon: Boxes, badge: null },
    { id: 'renewals', label: 'Renewals & Expiry', icon: RefreshCw, badge: expiringCount > 0 ? expiringCount : null, badgeColor: 'bg-[#EF7C00]' },
    { id: 'invoices', label: 'Invoices & Billing', icon: FileText, badge: null },
    { id: 'quotations', label: 'Quotations', icon: FileSpreadsheet, badge: null },
    { id: 'files', label: 'Files & Drive', icon: FolderClosed, badge: null },
    { id: 'vendors', label: 'Vendor Bills & Ledger', icon: Building2, badge: null },
    { id: 'infrastructure', label: 'Web Infrastructure', icon: Server, badge: null },
    { id: 'vault', label: 'Credential Vault', icon: KeyRound, badge: null },
    { id: 'projects', label: 'Projects & Tasks', icon: FolderKanban, badge: projectAlertsCount > 0 ? projectAlertsCount : null, badgeColor: 'bg-red-500' },
    { id: 'employees', label: 'Employees', icon: Users, badge: null },
    { id: 'vendor-directory', label: 'Vendor Directory', icon: Building2, badge: null },
    { id: 'facebook-leads', label: 'Facebook Leads', icon: MessageSquare, badge: null },
    { id: 'settings', label: 'Integrations & Settings', icon: Settings, badge: null },
    { id: 'hr', label: 'HR & Documents', icon: UserCheck, badge: null },
  ];

  return (
    <aside 
      ref={navRef} id="portal-navigation" aria-label="Main navigation" inert={compact && !mobileOpen}
      data-open={mobileOpen} className={`portal-sidebar bg-[#004077] text-white flex flex-col transition-all duration-300 relative z-30 shrink-0 select-none ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#00355F]/80">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-black text-lg text-white shrink-0 border border-white/10 shadow-inner">
            <span className="text-[#EF7C00]">V</span>K
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="font-bold text-sm tracking-tight text-white leading-none">VK Digi Solutions</h1>
              <span className="text-[10px] text-blue-200/70 font-medium uppercase tracking-wider">VKD Business Portal</span>
            </div>
          )}
        </div>
        <button 
          onClick={() => compact ? onClose() : setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg bg-[#00355F] hover:bg-[#002847] flex items-center justify-center text-blue-200 transition"
          title={compact ? 'Close navigation' : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        <div className={`px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300/60 ${collapsed ? 'text-center' : ''}`}>
          {collapsed ? 'ERP' : 'Workspace'}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              aria-label={item.label}
              aria-description={item.badge !== null ? `${item.badge} alerts` : undefined}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'px-3.5'} py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 relative group ${
                isActive 
                  ? 'bg-[#00355F] text-white shadow-sm ring-1 ring-white/10' 
                  : 'text-blue-100/80 hover:bg-[#00355F]/60 hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? 'text-[#EF7C00]' : 'text-blue-200/80 group-hover:text-white'}`} />
              
              {!collapsed && (
                <span className="ml-3 truncate">{item.label}</span>
              )}

              {item.badge !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${item.badgeColor || 'bg-[#EF7C00]'} ${
                  collapsed ? 'absolute top-1 right-1 px-1 py-0.2 text-[9px]' : 'ml-auto'
                }`}>
                  {item.badge}
                </span>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition z-50 shadow-lg">
                  {item.label}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Account Actions */}
      <div className="p-3 border-t border-[#00355F]/80 space-y-2">
        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            className={`w-full flex items-center ${collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'} rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 transition`}
            title="WhatsApp Business API & Template Messenger"
          >
            <MessageSquare size={16} className="shrink-0" />
            {!collapsed && (
              <span className="ml-2.5 text-left truncate">
                WhatsApp Business
              </span>
            )}
          </button>
        )}



        {onLogout && (
          <button
            onClick={onLogout}
            className={`w-full flex items-center ${collapsed ? 'justify-center p-2' : 'px-3 py-2'} rounded-xl bg-[#00355F] hover:bg-rose-900/40 text-blue-200 hover:text-rose-200 border border-blue-400/20 text-xs font-semibold transition`}
            title="Sign Out to Login Screen"
          >
            <LogOut size={15} className="shrink-0" />
            {!collapsed && (
              <span className="ml-2.5 text-left truncate">
                Sign Out / Sign In
              </span>
            )}
          </button>
        )}

        {!collapsed && (
          <div className="mt-1 text-[10px] text-blue-200/60 text-center flex items-center justify-center space-x-1">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span>VK Digi Solutions</span>
          </div>
        )}
      </div>
    </aside>
  );
};
