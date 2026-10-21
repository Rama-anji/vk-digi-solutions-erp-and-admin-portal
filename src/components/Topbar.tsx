import { ActionButton } from './ActionButton';
import React, { useState } from 'react';
import { 
  Search, Menu,
  Bell, 
  Plus, 
  User, 
  LogOut, 
  Download, 
  Code2, 
  ShieldAlert,
  ChevronDown,
  Clock,
  FolderKanban,
  RefreshCw,
  ArrowRight,
  Flame,
  CheckCircle2,
  MessageSquare
} from 'lucide-react';
import { Project } from '../types';
import { ProjectDeadlineStatus } from '../utils/projectAlertUtils';

interface TopbarProps {
  onOpenNavigation: () => void;
  navigationOpen: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  expiringCount: number;
  projectAlertsCount: number;
  projectAlerts?: { project: Project; status: ProjectDeadlineStatus }[];
  onNewClient: () => void;
  onViewRenewals: () => void;
  onViewProjects: () => void;
  onOpenCodeViewer: () => void;
  onOpenWhatsApp?: () => void;
  onLogout: () => void;
  userName: string;
  userEmail: string;
  userRole: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  onOpenNavigation, navigationOpen,
  searchQuery,
  setSearchQuery,
  expiringCount,
  projectAlertsCount,
  projectAlerts = [],
  onNewClient,
  onViewRenewals,
  onViewProjects,
  onOpenCodeViewer,
  onOpenWhatsApp,
  onLogout,
  userName, userEmail,
  userRole
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [activeAlertTab, setActiveAlertTab] = useState<'projects' | 'renewals'>('projects');

  const totalAlertsCount = expiringCount + projectAlertsCount;

  return (
    <header className="portal-topbar h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 select-none">
      <button className="portal-menu-button" aria-label="Open navigation" aria-expanded={navigationOpen} aria-controls="portal-navigation" onClick={onOpenNavigation}><Menu size={22}/></button>
      {/* Search Bar */}
      <div className="portal-global-search flex-1 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-400 pointer-events-none" />
          <input
            type="text"
            aria-label="Search portal"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients, invoices, domains, or bills..."
            className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#004077] focus:bg-white transition"
          />
        </div>
      </div>

      {/* Top Right Actions */}
      <div className="portal-topbar-actions flex items-center space-x-3 sm:space-x-4 ml-4">
        
        {/* WhatsApp Business Hub CTA */}
        {onOpenWhatsApp && (
          <button
            onClick={onOpenWhatsApp}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold transition"
            title="Open WhatsApp Business Integration"
          >
            <MessageSquare size={14} className="text-emerald-600" />
            <span>WhatsApp Hub</span>
          </button>
        )}

        {/* Expiry & Project Deadline Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setAlertsOpen(!alertsOpen);
              setProfileOpen(false);
            }}
            aria-label="Notifications" aria-expanded={alertsOpen}
            className={`relative p-2 rounded-xl transition ${
              alertsOpen 
                ? 'bg-[#004077] text-white shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={`${projectAlertsCount} project deadline alerts & ${expiringCount} subscription renewals`}
          >
            <Bell size={18} />
            {totalAlertsCount > 0 && (
              <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse ${
                projectAlertsCount > 0 ? 'bg-red-600' : 'bg-[#EF7C00]'
              }`}>
                {totalAlertsCount}
              </span>
            )}
          </button>

          {/* Alert Notification Dropdown Panel */}
          {alertsOpen && (
            <div className="portal-topbar-popover absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-1 text-xs">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-sm text-[#004077] flex items-center space-x-1.5">
                    <span>Admin Alert Center</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      {totalAlertsCount} Active
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-500">Real-time deadline warnings &amp; renewal triggers</p>
                </div>
              </div>

              {/* Alert Category Tabs */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-50 border-b border-slate-100 gap-1 text-[11px] font-bold">
                <button
                  onClick={() => setActiveAlertTab('projects')}
                  className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                    activeAlertTab === 'projects'
                      ? 'bg-white text-[#004077] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock size={13} className="text-red-500" />
                  <span>Projects (≤ 3d)</span>
                  {projectAlertsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-red-100 text-red-700 font-bold">
                      {projectAlertsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveAlertTab('renewals')}
                  className={`py-1.5 px-2 rounded-lg transition flex items-center justify-center space-x-1.5 ${
                    activeAlertTab === 'renewals'
                      ? 'bg-white text-[#004077] shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw size={13} className="text-[#EF7C00]" />
                  <span>Renewals (≤ 15d)</span>
                  {expiringCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-orange-100 text-[#EF7C00] font-bold">
                      {expiringCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Content: Project Deadline Alerts */}
              {activeAlertTab === 'projects' && (
                <div className="max-h-64 overflow-y-auto p-2 divide-y divide-slate-100">
                  {projectAlerts.length > 0 ? (
                    projectAlerts.map(({ project, status }) => (
                      <div key={project.id} className="p-2.5 hover:bg-slate-50 rounded-xl transition space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-800 text-xs block truncate" title={project.project_title}>
                              {project.project_title}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              Client: {project.client_name} &bull; Lead: {project.assigned_to}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] shrink-0 border ${status.badgeClass}`}>
                            {status.badgeText}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                          <span>Target: {project.due_date}</span>
                          <ActionButton
                            onClick={() => {
                              setAlertsOpen(false);
                              onViewProjects();
                            }}
                            className="font-bold text-[#004077] hover:underline flex items-center space-x-0.5"
                          >
                            <span>Open in Kanban</span>
                            <ArrowRight size={10} />
                          </ActionButton>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-slate-400 space-y-1">
                      <CheckCircle2 size={20} className="mx-auto text-emerald-500" />
                      <p className="font-bold text-xs text-slate-700">All Project Deadlines On Track</p>
                      <p className="text-[11px]">No active projects due within 3 days.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Renewals */}
              {activeAlertTab === 'renewals' && (
                <div className="p-4 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-[#EF7C00] flex items-center justify-center mx-auto">
                    <RefreshCw size={18} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-800">{expiringCount} Subscriptions Need Renewal</h5>
                    <p className="text-[11px] text-slate-500">Expired subscriptions and services due within 15 days.</p>
                  </div>
                  <ActionButton
                    onClick={() => {
                      setAlertsOpen(false);
                      onViewRenewals();
                    }}
                    className="w-full py-2 bg-[#EF7C00] hover:bg-[#d96f00] text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center space-x-1"
                  >
                    <span>Open Renewals Center</span>
                    <ArrowRight size={12} />
                  </ActionButton>
                </div>
              )}

              {/* Bottom Quick Jump Action */}
              <div className="p-2 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex items-center justify-between text-[11px]">
                <button
                  onClick={() => {
                    setAlertsOpen(false);
                    onViewProjects();
                  }}
                  className="font-bold text-[#004077] hover:underline flex items-center space-x-1"
                >
                  <FolderKanban size={12} />
                  <span>Projects Board</span>
                </button>
                <button
                  onClick={() => {
                    setAlertsOpen(false);
                    onViewRenewals();
                  }}
                  className="font-bold text-[#EF7C00] hover:underline flex items-center space-x-1"
                >
                  <RefreshCw size={12} />
                  <span>Renewals Board</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* + New Client CTA Button (Accent Orange #EF7C00) */}
        <ActionButton
          onClick={onNewClient}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#EF7C00] hover:bg-[#D96F00] text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95"
        >
          <Plus size={15} />
          New Client
        </ActionButton>

          {/* Admin Profile Dropdown */}
          <div className="relative">
            <button
              aria-label="Account menu" aria-expanded={profileOpen}
              onClick={() => {
                setProfileOpen(!profileOpen);
                setAlertsOpen(false);
              }}
              className="flex items-center space-x-2.5 p-1 sm:pl-2.5 sm:pr-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
            >
              <div className="w-8 h-8 rounded-lg bg-[#004077] text-white flex items-center justify-center font-bold text-xs">
                VKD
              </div>
              <div className="hidden sm:block text-left text-xs leading-tight">
                <p className="font-bold text-slate-800">{userName}</p>
                <p className="text-[10px] text-slate-500">{userRole}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="portal-topbar-popover absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{userName}</p>
                  <p className="text-[11px] text-slate-500">{userEmail}</p>
                  <div className="mt-1.5 flex items-center space-x-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md inline-flex">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>VKD Administrator</span>
                  </div>
                </div>
                <ActionButton
                  onClick={() => {
                    setProfileOpen(false);
                    onOpenCodeViewer();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center space-x-2"
                >
                  <Code2 size={14} className="text-[#004077]" />
                  <span>View db.sql & config.php</span>
                </ActionButton>
                <ActionButton
                  onClick={() => {
                    setProfileOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 border-t border-slate-100 mt-1 font-semibold"
                >
                  <LogOut size={14} />
                  <span>Sign Out / Open Sign In</span>
                </ActionButton>
              </div>
            )}
          </div>

          {/* Direct 1-Click Sign Out / Open Sign In button */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition"
            title="Sign Out / Open Sign In Page"
          >
            <LogOut size={16} />
          </button>

      </div>
    </header>
  );
};
