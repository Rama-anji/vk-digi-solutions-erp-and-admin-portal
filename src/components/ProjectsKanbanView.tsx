import { ActionButton } from './ActionButton';
import { useTimedMessage } from '../useTimedMessage';
import React, { useEffect, useRef, useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Trash2,
  Edit3,
  Building2,
  Check,
  X,
  ArrowRight,
  Flame,
  Layers,
  ChevronDown,
  Bell,
  BellRing,
  BellOff,
  AlertTriangle,
  Send,
  Mail,
  Settings,
  ExternalLink,
  ShieldAlert } from
'lucide-react';
import { Project, Task, Client, ProjectStatus, Priority, ProjectDeadlineNotification } from '../types';
import {
  getProjectDeadlineStatus,
  getActiveProjectDeadlineAlerts,
  generateProjectDeadlineEmail,
  ProjectDeadlineStatus } from
'../utils/projectAlertUtils';

interface ProjectsKanbanViewProps {
  projects: Project[];
  tasks: Task[];
  clients: Client[];
  onAddTask: (taskData: Omit<Task, 'id' | 'created_at'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: number) => void;
  onUpdateTaskStatus: (taskId: number, newStatus: ProjectStatus) => void;
  onAddProject: (projectData: Omit<Project, 'id' | 'created_at'>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (projectId: number) => void;
  onSelectClient?: (clientId: number) => void;
  onToggleDeadlineAlerts?: (projectId: number, enabled: boolean) => void;
  onSetDeadlineAlertThreshold?: (projectId: number, thresholdDays: number) => void;
  onExtendProjectDueDate?: (projectId: number, daysToAdd: number) => void;
  onSendDeadlineAlert?: (notification: ProjectDeadlineNotification) => void;
}

const COLUMNS: {id: ProjectStatus;label: string;description: string;headerColor: string;bgTint: string;accentColor: string;pillColor: string;}[] = [
{
  id: 'Pending',
  label: 'Pending',
  description: 'Backlog items & queued sprint tasks',
  headerColor: 'bg-slate-700',
  bgTint: 'bg-slate-50/70 border-slate-200',
  accentColor: 'border-l-slate-400',
  pillColor: 'bg-slate-100 text-slate-700 border-slate-300'
},
{
  id: 'In Progress',
  label: 'In Progress',
  description: 'Active development & engineering focus',
  headerColor: 'bg-[#004077]',
  bgTint: 'bg-blue-50/40 border-blue-200',
  accentColor: 'border-l-[#004077]',
  pillColor: 'bg-blue-100 text-[#004077] border-blue-300'
},
{
  id: 'Review',
  label: 'Review',
  description: 'Code review, QA testing & client sign-off',
  headerColor: 'bg-[#EF7C00]',
  bgTint: 'bg-amber-50/40 border-amber-200',
  accentColor: 'border-l-[#EF7C00]',
  pillColor: 'bg-amber-100 text-amber-800 border-amber-300'
},
{
  id: 'Completed',
  label: 'Completed',
  description: 'Delivered, verified & deployed items',
  headerColor: 'bg-emerald-700',
  bgTint: 'bg-emerald-50/40 border-emerald-200',
  accentColor: 'border-l-emerald-600',
  pillColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
}];


export const ProjectsKanbanView: React.FC<ProjectsKanbanViewProps> = ({
  projects,
  tasks,
  clients,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onSelectClient,
  onToggleDeadlineAlerts,
  onSetDeadlineAlertThreshold,
  onExtendProjectDueDate,
  onSendDeadlineAlert
}) => {
  const pageRef = useRef<HTMLDivElement>(null);
  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<number | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileStatus, setMobileStatus] = useState<ProjectStatus>('Pending');
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('All');
  const [alertFilterOnly, setAlertFilterOnly] = useState<boolean>(false);

  // Drag & Drop State
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  // In-Page Panels (strictly no popups)
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [defaultStatusForNewTask, setDefaultStatusForNewTask] = useState<ProjectStatus>('Pending');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!(showNewTaskForm || showNewProjectForm || editingTask) || !window.matchMedia('(max-width:767px)').matches) return;
    pageRef.current?.querySelector('[data-project-editor]')?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
  }, [showNewTaskForm, showNewProjectForm, editingTask]);

  // Deadline Alerts In-Page States
  const [configuringAlertProject, setConfiguringAlertProject] = useState<Project | null>(null);
  const [previewNotification, setPreviewNotification] = useState<ProjectDeadlineNotification | null>(null);
  const [thresholdInput, setThresholdInput] = useState<number>(3);
  const [leadEmailInput, setLeadEmailInput] = useState<string>('');
  const [alertSentFeedback, setAlertSentFeedback] = useTimedMessage();

  // Active Project Deadline Alerts (Completion date <= 3 days & not completed)
  const activeDeadlineAlerts = getActiveProjectDeadlineAlerts(projects);
  const deadlineAlertsCount = activeDeadlineAlerts.length;

  // New Task Form State
  const [taskFormData, setTaskFormData] = useState({
    project_id: projects[0]?.id || 1,
    task_title: '',
    description: '',
    assigned_to: 'Rahul Sharma',
    priority: 'Medium' as Priority,
    status: 'Pending' as ProjectStatus,
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    tags: 'Frontend, UI/UX',
    estimated_hours: 8
  });

  // New Project Form State
  const [projectFormData, setProjectFormData] = useState({
    project_title: '',
    client_id: clients[0]?.id || 1,
    assigned_to: 'Rahul Sharma',
    priority: 'High' as Priority,
    status: 'In Progress' as ProjectStatus,
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    description: '',
    budget: 150000,
    deadline_alerts_enabled: true,
    alert_threshold_days: 3
  });

  // Distinct assignees across tasks
  const assigneesList = Array.from(new Set(tasks.map((t) => t.assigned_to).filter(Boolean)));

  // Selected Project Details (if a single project is selected)
  const currentProject = selectedProjectId !== 'all' ?
  projects.find((p) => p.id === selectedProjectId) :
  null;

  // Filtered tasks
  const filteredTasks = tasks.filter((task) => {
    // Project filter
    if (selectedProjectId !== 'all' && task.project_id !== selectedProjectId) {
      return false;
    }
    // Alert Filter (only tasks from projects with deadline alerts <= 3 days)
    if (alertFilterOnly) {
      const parentProject = projects.find((p) => p.id === task.project_id);
      if (!parentProject) return false;
      const status = getProjectDeadlineStatus(parentProject);
      if (!status.isAlertActive) return false;
    }
    // Priority filter
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) {
      return false;
    }
    // Assignee filter
    if (assigneeFilter !== 'All' && task.assigned_to !== assigneeFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.task_title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q) || false;
      const matchAssignee = task.assigned_to.toLowerCase().includes(q);
      const matchTags = task.tags?.some((tag) => tag.toLowerCase().includes(q)) || false;
      const matchProject = task.project_title?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc && !matchAssignee && !matchTags && !matchProject) {
        return false;
      }
    }
    return true;
  });

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId.toString());
  };

  const handleDragOver = (e: React.DragEvent, columnId: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: ProjectStatus) => {
    // Only reset if leaving the column container itself
    if (e.currentTarget === e.target) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: ProjectStatus) => {try {
      e.preventDefault();
      setDragOverColumn(null);
      const taskIdStr = e.dataTransfer.getData('text/plain') || (draggedTaskId ? String(draggedTaskId) : null);
      if (!taskIdStr) return;

      const taskId = parseInt(taskIdStr, 10);
      if (!isNaN(taskId)) {
        await onUpdateTaskStatus(taskId, targetStatus);
      }
      setDraggedTaskId(null);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Submit New Task
  const handleCreateTask = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!taskFormData.task_title.trim()) return;

      const proj = projects.find((p) => p.id === Number(taskFormData.project_id));
      const client = proj ? clients.find((c) => c.id === proj.client_id) : null;

      const tagsArray = taskFormData.tags.
      split(',').
      map((t) => t.trim()).
      filter(Boolean);

      await onAddTask({
        project_id: Number(taskFormData.project_id),
        project_title: proj?.project_title || 'General Agency Project',
        client_id: proj?.client_id,
        client_name: client?.name || proj?.client_name,
        task_title: taskFormData.task_title.trim(),
        description: taskFormData.description.trim(),
        assigned_to: taskFormData.assigned_to.trim(),
        priority: taskFormData.priority,
        status: taskFormData.status,
        due_date: taskFormData.due_date,
        tags: tagsArray.length > 0 ? tagsArray : ['Sprint'],
        estimated_hours: Number(taskFormData.estimated_hours) || 4
      });

      // Reset Form
      setTaskFormData({
        project_id: selectedProjectId !== 'all' ? selectedProjectId : projects[0]?.id || 1,
        task_title: '',
        description: '',
        assigned_to: 'Rahul Sharma',
        priority: 'Medium',
        status: 'Pending',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        tags: 'Frontend, UI/UX',
        estimated_hours: 8
      });
      setShowNewTaskForm(false);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Submit New Project
  const handleCreateProject = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!projectFormData.project_title.trim()) return;

      const client = clients.find((c) => c.id === Number(projectFormData.client_id));

      await onAddProject({
        project_title: projectFormData.project_title.trim(),
        client_id: Number(projectFormData.client_id),
        client_name: client?.name || 'Assigned Client',
        assigned_to: projectFormData.assigned_to.trim(),
        priority: projectFormData.priority,
        status: projectFormData.status,
        due_date: projectFormData.due_date,
        description: projectFormData.description.trim(),
        budget: Number(projectFormData.budget),
        deadline_alerts_enabled: projectFormData.deadline_alerts_enabled,
        alert_threshold_days: Number(projectFormData.alert_threshold_days)
      });

      setProjectFormData({
        project_title: '',
        client_id: clients[0]?.id || 1,
        assigned_to: 'Rahul Sharma',
        priority: 'High',
        status: 'In Progress',
        due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        description: '',
        budget: 150000,
        deadline_alerts_enabled: true,
        alert_threshold_days: 3
      });
      setShowNewProjectForm(false);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Submit Edit Task
  const handleSaveEditTask = async (e: React.FormEvent) => {try {
      e.preventDefault();
      if (!editingTask || !editingTask.task_title.trim()) return;
      await onUpdateTask(editingTask);
      setEditingTask(null);
    } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}};

  // Compute stats
  const totalTasksCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === 'Pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'In Progress').length;
  const reviewCount = tasks.filter((t) => t.status === 'Review').length;
  const completedCount = tasks.filter((t) => t.status === 'Completed').length;
  const completionRate = totalTasksCount > 0 ?
  Math.round(completedCount / totalTasksCount * 100) :
  0;

  // Render Priority Badge
  const renderPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'Urgent':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            <Flame size={10} className="text-red-500" />
            <span>Urgent</span>
          </span>);

      case 'High':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
            <span>High</span>
          </span>);

      case 'Medium':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#004077] border border-blue-200">
            <span>Medium</span>
          </span>);

      case 'Low':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Low</span>
          </span>);

    }
  };

  return (
    <div ref={pageRef} className="projects-page space-y-6 animate-in fade-in">
      
      {/* Viewport Header */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E7EB] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#004077]">
              <FolderKanban size={20} className="text-[#EF7C00]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#004077] tracking-tight flex items-center space-x-2">
                <span>Projects &amp; Tasks</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-[#004077] border border-blue-200">
                  Task Board
                </span>
              </h2>
              <p className="text-xs text-slate-500">Track team progress, from first task to delivery.</p>
            </div>
          </div>
        </div>

        {/* Primary Header CTAs */}
        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          <ActionButton
            onClick={() => {
              setDefaultStatusForNewTask('Pending');
              setTaskFormData((prev) => ({ ...prev, status: 'Pending' }));
              setShowNewTaskForm(!showNewTaskForm);
              setShowNewProjectForm(false);
              setEditingTask(null);
            }}
            className="px-4 py-2 bg-[#EF7C00] hover:bg-[#d96f00] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5">
            
            <Plus size={14} />
            <span>+ Add Task</span>
          </ActionButton>

          <ActionButton
            onClick={() => {
              setShowNewProjectForm(!showNewProjectForm);
              setShowNewTaskForm(false);
              setEditingTask(null);
            }}
            className="px-4 py-2 bg-[#004077] hover:bg-[#00335e] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center space-x-1.5">
            
            <Layers size={14} />
            <span>+ New Project</span>
          </ActionButton>
        </div>
      </div>

      {/* Alert Sent Feedback Toast */}
      {alertSentFeedback &&
      <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{alertSentFeedback}</span>
        </div>
      }

      {/* =========================================================================
        * AUTOMATED PROJECT DEADLINE ALERTS (3-Day Notification Window)
        * ========================================================================= */}
      {deadlineAlertsCount > 0 ?
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/70">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 animate-pulse">
                <BellRing size={18} />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                    <span>Active Project Deadline Alerts</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white">
                      {deadlineAlertsCount} Due within 3 Days
                    </span>
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600">
                  Automated milestone monitoring alerts the admin when project delivery dates are &le; 3 days away (or overdue).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
              onClick={() => setAlertFilterOnly(!alertFilterOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs ${
              alertFilterOnly ?
              'bg-[#004077] text-white' :
              'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`
              }>
              
                <Filter size={13} />
                <span>{alertFilterOnly ? 'Show All Projects' : 'Filter Board to Due Projects'}</span>
              </button>
            </div>
          </div>

          {/* Alert Project Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeDeadlineAlerts.map(({ project: proj, status }) => {
            const projTasks = tasks.filter((t) => t.project_id === proj.id);
            const completedTasks = projTasks.filter((t) => t.status === 'Completed').length;
            const percent = projTasks.length > 0 ? Math.round(completedTasks / projTasks.length * 100) : 0;

            return (
              <div
                key={proj.id}
                className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-2 hover:border-amber-400 transition">
                
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-slate-900 block truncate" title={proj.project_title}>
                        {proj.project_title}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        Client: <strong>{proj.client_name}</strong> &bull; Lead: <strong>{proj.assigned_to}</strong>
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 border ${status.badgeClass}`}>
                      {status.badgeText}
                    </span>
                  </div>

                  {/* Progress & Milestone info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tasks: {completedTasks}/{projTasks.length} ({percent}%)</span>
                      <span className="font-bold text-slate-700">Target: {proj.due_date}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                      className={`h-full rounded-full transition-all duration-300 ${
                      status.daysRemaining < 0 ? 'bg-red-500' :
                      status.daysRemaining <= 1 ? 'bg-orange-500' : 'bg-amber-500'}`
                      }
                      style={{ width: `${percent}%` }} />
                    
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px]">
                    <ActionButton
                    onClick={() => {
                      const notif = generateProjectDeadlineEmail(proj, tasks);
                      setPreviewNotification(notif);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 flex items-center space-x-1 transition"
                    title="Preview and dispatch email alert to project lead">
                    
                      <Mail size={11} className="text-[#EF7C00]" />
                      <span>Send Alert</span>
                    </ActionButton>

                    <button
                    onClick={async () => {try {return await onExtendProjectDueDate?.(proj.id, 7);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                    className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 transition"
                    title="Extend deadline by 7 days">
                    
                      +7d Extension
                    </button>

                    <button
                    onClick={() => {
                      setConfiguringAlertProject(proj);
                      setThresholdInput(proj.alert_threshold_days || 3);
                      setLeadEmailInput(proj.lead_email || '');
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Configure alert settings">
                    
                      <Settings size={13} />
                    </button>

                    <ActionButton
                    onClick={() => setSelectedProjectId(proj.id)}
                    className="px-2 py-1 text-[#004077] hover:underline font-bold">
                    
                      View Board &rarr;
                    </ActionButton>
                  </div>
                </div>);

          })}
          </div>
        </div> :

      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-900">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>
              <strong>All Project Deadlines On Track:</strong> No active projects have completion dates within 3 days. Automated deadline monitoring is active.
            </span>
          </div>
          <ActionButton
          onClick={() => {
            if (projects[0]) {
              setConfiguringAlertProject(projects[0]);
              setThresholdInput(projects[0].alert_threshold_days || 3);
              setLeadEmailInput(projects[0].lead_email || '');
            }
          }}
          className="text-[11px] font-bold text-[#004077] hover:underline flex items-center space-x-1 shrink-0">
          
            <Settings size={12} />
            <span>Configure Alert Thresholds</span>
          </ActionButton>
        </div>
      }

      {/* In-Page Configure Deadline Alert Settings Panel */}
      {configuringAlertProject &&
      <div className="bg-white p-5 rounded-2xl border-2 border-[#004077] shadow-md animate-in slide-in-from-top-2 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#004077] flex items-center justify-center font-bold">
                <Bell size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#004077]">
                  Configure Deadline Alert: {configuringAlertProject.project_title}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Client: {configuringAlertProject.client_name} &bull; Target Delivery: {configuringAlertProject.due_date}
                </p>
              </div>
            </div>
            <button
            onClick={() => setConfiguringAlertProject(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="font-bold text-slate-700 block">Alert Automation Status</span>
              <label className="flex items-center space-x-2 cursor-pointer pt-1">
                <input
                type="checkbox"
                checked={configuringAlertProject.deadline_alerts_enabled !== false}
                onChange={async (e) => {try {
                    const enabled = e.target.checked;
                    setConfiguringAlertProject({ ...configuringAlertProject, deadline_alerts_enabled: enabled });
                    await onToggleDeadlineAlerts?.(configuringAlertProject.id, enabled);
                  } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                className="w-4 h-4 text-[#004077] rounded focus:ring-[#004077]" />
              
                <span className="font-bold text-slate-800">
                  {configuringAlertProject.deadline_alerts_enabled !== false ? 'Alerts Active (ON)' : 'Alerts Muted (OFF)'}
                </span>
              </label>
              <p className="text-[10px] text-slate-500">
                When enabled, the admin center warns if milestone cutoff is reached.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="font-bold text-slate-700 block">Notification Threshold</span>
              <select
              value={thresholdInput}
              onChange={async (e) => {try {
                  const val = Number(e.target.value);
                  setThresholdInput(val);
                  await onSetDeadlineAlertThreshold?.(configuringAlertProject.id, val);
                } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
              className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]">
              
                <option value={1}>1 Day before cutoff</option>
                <option value={2}>2 Days before cutoff</option>
                <option value={3}>3 Days before cutoff (Standard)</option>
                <option value={5}>5 Days before cutoff</option>
                <option value={7}>7 Days before cutoff</option>
              </select>
              <p className="text-[10px] text-slate-500">Triggers alert when days remaining &le; threshold.</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <span className="font-bold text-slate-700 block">Project Lead / Recipient</span>
              <input
              type="email"
              value={leadEmailInput}
              onChange={(e) => setLeadEmailInput(e.target.value)}
              placeholder="lead@agency.com"
              className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-[#004077]" />
            
              <p className="text-[10px] text-slate-500">Lead engineer notified during automated trigger.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
              type="button"
              onClick={async () => {try {
                  await onExtendProjectDueDate?.(configuringAlertProject.id, 7);
                  setConfiguringAlertProject((prev) => prev ? {
                    ...prev,
                    due_date: new Date(new Date(prev.due_date).getTime() + 7 * 86400000).toISOString().split('T')[0]
                  } : null);
                } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
              className="px-3 py-1.5 bg-blue-50 text-[#004077] hover:bg-blue-100 rounded-xl font-bold transition border border-blue-200">
              
                +7 Days Due Date Extension
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <ActionButton
              type="button"
              onClick={() => setConfiguringAlertProject(null)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
              
                Close Settings
              </ActionButton>
              <ActionButton
              type="button"
              onClick={async () => {try {
                  await onUpdateProject({
                    ...configuringAlertProject,
                    alert_threshold_days: thresholdInput,
                    lead_email: leadEmailInput
                  });
                  setConfiguringAlertProject(null);
                } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
              className="px-5 py-2 bg-[#004077] hover:bg-[#00335e] text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1">
              
                <Check size={14} />
                <span>Save Alert Configuration</span>
              </ActionButton>
            </div>
          </div>
        </div>
      }

      {/* In-Page Deadline Alert Email Dispatcher & Letterhead Preview */}
      {previewNotification &&
      <div className="bg-white p-5 rounded-2xl border-2 border-amber-400 shadow-lg animate-in slide-in-from-top-2 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-[#EF7C00] flex items-center justify-center font-bold">
                <Mail size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Milestone Deadline Alert Dispatch Center
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pre-configured alert email to project lead &amp; administrative log
                </p>
              </div>
            </div>
            <button
            onClick={() => setPreviewNotification(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recipient (Project Lead)</span>
              <span className="font-bold text-slate-800">{previewNotification.assigned_to} &lt;{previewNotification.lead_email}&gt;</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delivery channel</span>
              <span className="font-bold text-slate-800">Configured SMTP sender</span>
            </div>
            <div className="md:col-span-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject Line</span>
              <span className="font-bold text-[#004077]">{previewNotification.subject}</span>
            </div>
          </div>

          {/* Formatted Letterhead Container */}
          <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto border border-slate-800">
            {previewNotification.body}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center space-x-2 text-[11px] text-slate-500">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>SMTP delivery with audit logging in <code>activity_logs</code></span>
            </div>

            <div className="flex items-center space-x-2">
              <ActionButton
              type="button"
              onClick={() => setPreviewNotification(null)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
              
                Cancel
              </ActionButton>
              <ActionButton
              type="button"
              onClick={async () => {try {
                  await onSendDeadlineAlert?.(previewNotification);
                  setAlertSentFeedback(`Alert dispatched to ${previewNotification.lead_email}!`);

                  setPreviewNotification(null);
                } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#d96f00] text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1.5">
              
                <Send size={14} />
                <span>Dispatch Deadline Alert Now</span>
              </ActionButton>
            </div>
          </div>
        </div>
      }

      {/* KPI Overview Metrics */}
      <div className="projects-metrics grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Projects</span>
          <span className="text-xl font-black text-[#004077] mt-0.5 block">{projects.length}</span>
          <span className="text-[10px] text-slate-500">Across {clients.length} clients</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tasks</span>
            <span className="w-2 h-2 rounded-full bg-slate-400" />
          </div>
          <span className="text-xl font-black text-slate-800 mt-0.5 block">{totalTasksCount}</span>
          <span className="text-[10px] text-slate-500">{pendingCount} in Pending</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#004077] uppercase tracking-wider block">In Progress</span>
            <span className="w-2 h-2 rounded-full bg-[#004077] animate-ping" />
          </div>
          <span className="text-xl font-black text-[#004077] mt-0.5 block">{inProgressCount}</span>
          <span className="text-[10px] text-slate-500">Current sprint focus</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#EF7C00] uppercase tracking-wider block">In Review</span>
            <span className="w-2 h-2 rounded-full bg-[#EF7C00]" />
          </div>
          <span className="text-xl font-black text-[#EF7C00] mt-0.5 block">{reviewCount}</span>
          <span className="text-[10px] text-slate-500">QA &amp; Client verification</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Completed</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline space-x-1.5 mt-0.5">
            <span className="text-xl font-black text-emerald-700">{completedCount}</span>
            <span className="text-xs font-bold text-emerald-600">({completionRate}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
      </div>

      {/* Filter Bar & Project Selector */}
      <div className="bg-white p-4 rounded-2xl border border-[#E5E7EB] shadow-xs space-y-3">
        <label className="projects-mobile-selector">Project
          <select aria-label="Filter project" value={selectedProjectId} onChange={e=>setSelectedProjectId(e.target.value==='all'?'all':Number(e.target.value))}>
            <option value="all">All projects ({projects.length})</option>
            {projects.map(project=><option key={project.id} value={project.id}>{project.project_title}</option>)}
          </select>
        </label>
        {/* Project Selector Chips */}
        <div className="projects-project-chips flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
          <span className="font-bold text-slate-500 shrink-0 flex items-center space-x-1 mr-1">
            <Layers size={13} />
            <span>Filter Project:</span>
          </span>

          <button
            onClick={() => setSelectedProjectId('all')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
            selectedProjectId === 'all' ?
            'bg-[#004077] text-white shadow-xs' :
            'bg-slate-100 hover:bg-slate-200 text-slate-700'}`
            }>
            
            All Projects ({tasks.length} tasks)
          </button>

          {projects.map((proj) => {
            const projTasks = tasks.filter((t) => t.project_id === proj.id);
            const projCompleted = projTasks.filter((t) => t.status === 'Completed').length;
            const isSelected = selectedProjectId === proj.id;
            const status = getProjectDeadlineStatus(proj);

            return (
              <button
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                isSelected ?
                'bg-[#004077] text-white shadow-xs' :
                'bg-slate-100 hover:bg-slate-200 text-slate-700'}`
                }>
                
                <span>{proj.project_title}</span>
                {status.isAlertActive &&
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`Deadline Alert: ${status.badgeText}`} />
                }
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`
                }>
                  {projCompleted}/{projTasks.length}
                </span>
              </button>);

          })}
        </div>

        {/* Selected Project Highlight Card (When filtered) */}
        {currentProject && (() => {
          const currentStatus = getProjectDeadlineStatus(currentProject);
          return (
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2.5 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                  <span className="font-bold text-[#004077] text-sm">{currentProject.project_title}</span>
                  {renderPriorityBadge(currentProject.priority)}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                    {currentProject.status}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${currentStatus.badgeClass}`}>
                    {currentStatus.badgeText}
                  </span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <div className="text-right mr-2 hidden sm:block">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Allocated Budget</span>
                    <span className="font-mono font-bold text-slate-800">₹ {currentProject.budget?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <ActionButton
                    onClick={() => setSelectedProjectId('all')}
                    className="px-2.5 py-1 text-[11px] font-bold text-[#004077] hover:underline">
                    
                    View All
                  </ActionButton>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-blue-100 text-[11px] text-slate-600">
                <p>
                  {currentProject.description} &bull; Client: <strong>{currentProject.client_name}</strong> &bull; Lead: <strong>{currentProject.assigned_to}</strong> &bull; Due: <strong>{currentProject.due_date}</strong>
                </p>

                {/* Direct Deadline Alert Controls */}
                <div className="flex items-center space-x-2 shrink-0">
                  <ActionButton
                    onClick={() => {
                      const notif = generateProjectDeadlineEmail(currentProject, tasks);
                      setPreviewNotification(notif);
                    }}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 flex items-center space-x-1 transition">
                    
                    <Mail size={11} className="text-[#EF7C00]" />
                    <span>Send Lead Alert</span>
                  </ActionButton>

                  <button
                    onClick={async () => {try {return await onExtendProjectDueDate?.(currentProject.id, 7);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg border border-slate-200 transition">
                    
                    +7d Extension
                  </button>

                  <button
                    onClick={() => {
                      setConfiguringAlertProject(currentProject);
                      setThresholdInput(currentProject.alert_threshold_days || 3);
                      setLeadEmailInput(currentProject.lead_email || '');
                    }}
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200"
                    title="Configure deadline alert settings">
                    
                    <Settings size={14} />
                  </button>
                </div>
              </div>
            </div>);

        })()}

        {/* Search & Secondary Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tasks" placeholder="Search tasks..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#004077] focus:bg-white" />
            
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            {/* Priority Filter */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 font-medium">Priority:</span>
              <select
                aria-label="Filter priority" value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#004077]">
                
                <option value="All">All Priorities</option>
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Assignee Filter */}
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-slate-500 font-medium">Assignee:</span>
              <select
                aria-label="Filter assignee" value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-[#004077]">
                
                <option value="All">All Team Members</option>
                {assigneesList.map((a) =>
                <option key={a} value={a}>{a}</option>
                )}
              </select>
            </div>

            {(searchQuery || priorityFilter !== 'All' || assigneeFilter !== 'All') &&
            <ActionButton
              onClick={() => {
                setSearchQuery('');
                setPriorityFilter('All');
                setAssigneeFilter('All');
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold"
              title="Reset filters">
              
                Reset
              </ActionButton>
            }
          </div>
        </div>
      </div>

      {/* In-Page Add Task Form */}
      {showNewTaskForm &&
      <div data-project-editor className="bg-white p-6 rounded-2xl border-2 border-[#EF7C00] shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#EF7C00] flex items-center justify-center font-bold">
                <Plus size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#004077]">Create New Task</h3>
                <p className="text-[11px] text-slate-500">Add an assignment linked to a client project and Kanban column</p>
              </div>
            </div>
            <button
            onClick={() => setShowNewTaskForm(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                type="text"
                required
                value={taskFormData.task_title}
                onChange={(e) => setTaskFormData({ ...taskFormData, task_title: e.target.value })}
                placeholder="e.g. Implement GPS Telemetry Live Marker Clustering"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Parent Project *</label>
                <select
                value={taskFormData.project_id}
                onChange={(e) => setTaskFormData({ ...taskFormData, project_id: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  {projects.map((p) =>
                <option key={p.id} value={p.id}>
                      {p.project_title} ({p.client_name})
                    </option>
                )}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Description &amp; Acceptance Criteria</label>
              <textarea
              rows={2}
              value={taskFormData.description}
              onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              placeholder="Key deliverables, API endpoints, test cases, or SLA commitments..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
            
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignee</label>
                <input
                type="text"
                value={taskFormData.assigned_to}
                onChange={(e) => setTaskFormData({ ...taskFormData, assigned_to: e.target.value })}
                placeholder="Rahul Sharma"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                value={taskFormData.priority}
                onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as Priority })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kanban Column</label>
                <select
                value={taskFormData.status}
                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value as ProjectStatus })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                type="date"
                value={taskFormData.due_date}
                onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Est. Hours</label>
                <input
                type="number"
                min={1}
                max={200}
                value={taskFormData.estimated_hours}
                onChange={(e) => setTaskFormData({ ...taskFormData, estimated_hours: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Tags (Comma-separated)</label>
              <input
              type="text"
              value={taskFormData.tags}
              onChange={(e) => setTaskFormData({ ...taskFormData, tags: e.target.value })}
              placeholder="Frontend, Maps, Architecture"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
            
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <ActionButton
              type="button"
              onClick={() => setShowNewTaskForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
              
                Cancel
              </ActionButton>
              <ActionButton
              type="submit"
              className="px-5 py-2 bg-[#EF7C00] hover:bg-[#d96f00] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1">
              
                <Check size={14} />
                <span>Save Task</span>
              </ActionButton>
            </div>
          </form>
        </div>
      }

      {/* In-Page Add Project Form */}
      {showNewProjectForm &&
      <div data-project-editor className="bg-white p-6 rounded-2xl border-2 border-[#004077] shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#004077] flex items-center justify-center font-bold">
                <Layers size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#004077]">Create Project</h3>
                <p className="text-[11px] text-slate-500">Set the client, project owner and delivery date.</p>
              </div>
            </div>
            <button
            onClick={() => setShowNewProjectForm(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Title *</label>
                <input
                type="text"
                required
                value={projectFormData.project_title}
                onChange={(e) => setProjectFormData({ ...projectFormData, project_title: e.target.value })}
                placeholder="e.g. Apex Fleet Telemetry & Warehouse Portal"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Client Organization *</label>
                <select
                value={projectFormData.client_id}
                onChange={(e) => setProjectFormData({ ...projectFormData, client_id: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  {clients.map((c) =>
                <option key={c.id} value={c.id}>
                      {c.name} ({c.client_code})
                    </option>
                )}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 text-xs">Scope of Work &amp; Technical Description</label>
              <textarea
              rows={2}
              value={projectFormData.description}
              onChange={(e) => setProjectFormData({ ...projectFormData, description: e.target.value })}
              placeholder="High-level objectives, technical architecture, and milestones..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
            
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Lead / Assignee</label>
                <input
                type="text"
                value={projectFormData.assigned_to}
                onChange={(e) => setProjectFormData({ ...projectFormData, assigned_to: e.target.value })}
                placeholder="Priya Nair"
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                value={projectFormData.priority}
                onChange={(e) => setProjectFormData({ ...projectFormData, priority: e.target.value as Priority })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Delivery Date</label>
                <input
                type="date"
                value={projectFormData.due_date}
                onChange={(e) => setProjectFormData({ ...projectFormData, due_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Budget (₹)</label>
                <input
                type="number"
                step="0.01"
                value={projectFormData.budget}
                onChange={(e) => setProjectFormData({ ...projectFormData, budget: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              {/* Automated Deadline Alerts Configuration */}
              <div className="md:col-span-2 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-[#EF7C00] flex items-center justify-center shrink-0">
                    <BellRing size={15} />
                  </div>
                  <div>
                    <label className="font-bold text-slate-800 text-xs flex items-center space-x-2 cursor-pointer">
                      <input
                      type="checkbox"
                      checked={projectFormData.deadline_alerts_enabled}
                      onChange={(e) => setProjectFormData({ ...projectFormData, deadline_alerts_enabled: e.target.checked })}
                      className="w-4 h-4 text-[#004077] rounded focus:ring-[#004077]" />
                    
                      <span>Enable Automated Deadline Alerts</span>
                    </label>
                    <p className="text-[10px] text-slate-500">
                      Notifies admin in Topbar Alert Center & Kanban when delivery date reaches threshold (≤ 3 days).
                    </p>
                  </div>
                </div>

                {projectFormData.deadline_alerts_enabled &&
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 min-w-0 max-w-full">
                    <span className="text-[11px] font-bold text-slate-600">Threshold:</span>
                    <select
                  value={projectFormData.alert_threshold_days}
                  onChange={(e) => setProjectFormData({ ...projectFormData, alert_threshold_days: Number(e.target.value) })}
                  className="w-full sm:w-auto min-w-0 p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077]">
                  
                      <option value={1}>1 Day before cutoff</option>
                      <option value={2}>2 Days before cutoff</option>
                      <option value={3}>3 Days before cutoff (Standard)</option>
                      <option value={5}>5 Days before cutoff</option>
                      <option value={7}>7 Days before cutoff</option>
                    </select>
                  </div>
              }
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <ActionButton
              type="button"
              onClick={() => setShowNewProjectForm(false)}
              className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition">
              
                Cancel
              </ActionButton>
              <ActionButton
              type="submit"
              className="px-5 py-2 bg-[#004077] hover:bg-[#00335e] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1">
              
                <Check size={14} />
                <span>Create Project</span>
              </ActionButton>
            </div>
          </form>
        </div>
      }

      {/* In-Page Edit Task Modal/Drawer */}
      {editingTask &&
      <div data-project-editor className="bg-white p-6 rounded-2xl border-2 border-indigo-500 shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <Edit3 size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[#004077]">Edit Task Details</h3>
                <p className="text-[11px] text-slate-500">Update status, assignee, priority, or timeline</p>
              </div>
            </div>
            <button
            onClick={() => setEditingTask(null)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveEditTask} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Title *</label>
                <input
                type="text"
                required
                value={editingTask.task_title}
                onChange={(e) => setEditingTask({ ...editingTask, task_title: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kanban Column / Status</label>
                <select
                value={editingTask.status}
                onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value as ProjectStatus })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Description</label>
              <textarea
              rows={2}
              value={editingTask.description || ''}
              onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
            
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Assignee</label>
                <input
                type="text"
                value={editingTask.assigned_to}
                onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <select
                value={editingTask.priority}
                onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value as Priority })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white">
                
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                type="date"
                value={editingTask.due_date}
                onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Est. Hours</label>
                <input
                type="number"
                value={editingTask.estimated_hours || 4}
                onChange={(e) => setEditingTask({ ...editingTask, estimated_hours: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#004077] focus:bg-white" />
              
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <ActionButton
              type="button"
              onClick={async () => {try {
                  if (confirm(`Delete task "${editingTask.task_title}"?`)) {
                    await onDeleteTask(editingTask.id);
                    setEditingTask(null);
                  }
                } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
              className="px-3.5 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold flex items-center space-x-1 transition">
              
                <Trash2 size={14} />
                <span>Delete Task</span>
              </ActionButton>

              <div className="flex items-center space-x-2">
                <ActionButton
                type="button"
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition">
                
                  Cancel
                </ActionButton>
                <ActionButton
                type="submit"
                className="px-5 py-2 bg-[#004077] hover:bg-[#00335e] text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1">
                
                  <Check size={14} />
                  <span>Update Task</span>
                </ActionButton>
              </div>
            </div>
          </form>
        </div>
      }

      {/* =========================================================================
        * THE KANBAN BOARD (4 Columns: Pending, In Progress, Review, Completed)
        * ========================================================================= */}
      <div className="projects-status-picker" aria-label="Task status filters">
        {COLUMNS.map(column=><button key={column.id} type="button" aria-pressed={mobileStatus===column.id} onClick={()=>setMobileStatus(column.id)}>
          <span>{column.label}</span><span className="projects-status-count">{filteredTasks.filter(task=>task.status===column.id).length}</span>
        </button>)}
      </div>
      <div className="projects-board grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((column) => {
          const colTasks = filteredTasks.filter((t) => t.status === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={(e) => handleDragLeave(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
              data-mobile-active={mobileStatus === column.id}
              className={`projects-column rounded-2xl border transition-all duration-200 flex flex-col min-h-[550px] ${
              isOver ?
              'bg-blue-50/80 border-dashed border-2 border-[#004077] shadow-md scale-[1.01]' :
              'bg-slate-100/60 border-slate-200/80'}`
              }>
              
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200/70 bg-white rounded-t-2xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                  column.id === 'Pending' ? 'bg-slate-400' :
                  column.id === 'In Progress' ? 'bg-[#004077]' :
                  column.id === 'Review' ? 'bg-[#EF7C00]' : 'bg-emerald-600'}`
                  } />
                  <div>
                    <h3 className="font-black text-xs text-slate-800 tracking-tight flex items-center space-x-1.5">
                      <span>{column.label}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${column.pillColor}`}>
                        {colTasks.length}
                      </span>
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDefaultStatusForNewTask(column.id);
                    setTaskFormData((prev) => ({ ...prev, status: column.id }));
                    setShowNewTaskForm(true);
                    setShowNewProjectForm(false);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#004077] hover:bg-slate-100 transition"
                  title={`Add task to ${column.label}`}>
                  
                  <Plus size={15} />
                </button>
              </div>

              {/* Column Helper Text */}
              <div className="px-3.5 py-1.5 bg-slate-50/50 text-[10px] text-slate-400 border-b border-slate-100 flex items-center justify-between">
                <span>{column.description}</span>
                {isOver &&
                <span className="font-bold text-[#004077] animate-pulse">Release to Drop</span>
                }
              </div>

              {/* Task Cards Drop Container */}
              <div className="projects-task-list p-3 space-y-3 flex-1 overflow-y-auto max-h-[750px]">
                {colTasks.map((task) => {
                  const isBeingDragged = draggedTaskId === task.id;
                  const isOverdue = new Date(task.due_date).getTime() < new Date().setHours(0, 0, 0, 0) && task.status !== 'Completed';
                  const parentProj = projects.find((p) => p.id === task.project_id);
                  const parentAlert = parentProj ? getProjectDeadlineStatus(parentProj) : null;

                  return (
                    <div
                      key={task.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onDragEnd={() => setDraggedTaskId(null)}
                      className={`projects-task-card bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs hover:shadow-sm transition-all duration-150 cursor-grab active:cursor-grabbing group relative ${
                      isBeingDragged ? 'opacity-40 scale-95 border-dashed border-[#004077]' : ''} ${
                      column.accentColor} border-l-4`}>
                      
                      {/* Top Bar: Project & Priority */}
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <div className="truncate flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate" title={task.project_title}>
                            {task.project_title || 'General'}
                          </span>
                          {task.client_name &&
                          <span className="text-[10px] font-semibold text-slate-500 truncate block">
                              &bull; {task.client_name}
                            </span>
                          }
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {renderPriorityBadge(task.priority)}
                          <GripVertical size={14} className="text-slate-300 group-hover:text-slate-500 transition shrink-0" />
                        </div>
                      </div>

                      {/* Parent Project Deadline Alert Pill (if ≤ 3 days) */}
                      {parentAlert?.isAlertActive && task.status !== 'Completed' &&
                      <div className="mb-2 px-2 py-1 bg-amber-50/80 border border-amber-300/80 rounded-lg flex items-center justify-between text-[10px] text-amber-900 font-semibold">
                          <span className="flex items-center space-x-1">
                            <Clock size={10} className="text-red-500 shrink-0" />
                            <span>Project due in {parentAlert.daysRemaining}d</span>
                          </span>
                          <span className="font-mono text-[9px] font-black text-red-600 bg-white px-1.5 py-0.2 rounded border border-amber-200">
                            {parentAlert.badgeText}
                          </span>
                        </div>
                      }

                      {/* Task Title */}
                      <h4 className="text-xs font-bold text-slate-800 leading-snug group-hover:text-[#004077] transition mb-1.5">
                        {task.task_title}
                      </h4>

                      {/* Task Description (if any) */}
                      {task.description &&
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2.5">
                          {task.description}
                        </p>
                      }

                      {/* Tags */}
                      {task.tags && task.tags.length > 0 &&
                      <div className="flex flex-wrap gap-1 mb-2.5">
                          {task.tags.map((tag, tIdx) =>
                        <span
                          key={tIdx}
                          className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          
                              #{tag}
                            </span>
                        )}
                        </div>
                      }

                      {/* Footer: Assignee, Due Date & Quick Move */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        {/* Assignee Avatar & Name */}
                        <div className="flex items-center space-x-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#004077] text-white font-bold flex items-center justify-center text-[9px] shadow-2xs">
                            {task.assigned_to.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700 truncate max-w-[85px]" title={task.assigned_to}>
                            {task.assigned_to}
                          </span>
                        </div>

                        {/* Due Date Indicator */}
                        <div className="flex items-center space-x-1">
                          <Clock size={11} className={isOverdue ? 'text-red-500' : 'text-slate-400'} />
                          <span className={`font-mono font-medium ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                            {task.due_date.substring(5)}
                          </span>
                        </div>
                      </div>

                      {/* Hover Action Controls (Quick Move / Edit / Delete) */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                        {/* Mobile & Click Quick Column Mover */}
                        <div className="flex items-center space-x-1 text-[10px]">
                          <span className="text-slate-400 font-medium">Move:</span>
                          <select
                            aria-label={`Move ${task.task_title} to status`} value={task.status}
                            onChange={async (e) => {try {return await onUpdateTaskStatus(task.id, e.target.value as ProjectStatus);} catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                            className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-100 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}>
                            
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Review">Review</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setEditingTask(task)}
                            className="p-1 text-slate-400 hover:text-[#004077] hover:bg-slate-100 rounded transition"
                            title="Edit task details">
                            
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={async () => {try {
                                if (confirm(`Delete task "${task.task_title}"?`)) {
                                  await onDeleteTask(task.id);
                                }
                              } catch (error: any) {window.dispatchEvent(new CustomEvent('portal:error', { detail: error?.message || 'Action failed. Please retry.' }));}}}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded transition"
                            title="Delete task">
                            
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>);

                })}

                {/* Empty State for Column */}
                {colTasks.length === 0 &&
                <div className="py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-white/40">
                    <CheckCircle2 size={22} className="mx-auto mb-1.5 text-slate-300" />
                    <p className="font-semibold text-xs text-slate-500">No {column.label} Tasks</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Add a task to get started.</p>
                  </div>
                }
              </div>
            </div>);

        })}
      </div>

    </div>);

};
