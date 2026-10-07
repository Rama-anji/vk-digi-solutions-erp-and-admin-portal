import { Project, Task, ProjectDeadlineNotification } from '../types';

/**
 * Computes calendar days remaining until target completion date
 */
export function getProjectDaysRemaining(dueDate: string): number {
  const targetDate = new Date(dueDate);
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface ProjectDeadlineStatus {
  daysRemaining: number;
  isAlertActive: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  threshold: number;
  badgeText: string;
  badgeClass: string;
  urgency: 'critical' | 'urgent' | 'warning' | 'normal' | 'completed';
}

/**
 * Evaluates whether a project is within its deadline alert threshold (default 3 days)
 */
export function getProjectDeadlineStatus(project: Project): ProjectDeadlineStatus {
  const threshold = project.alert_threshold_days ?? 3;
  const isCompleted = project.status === 'Completed';

  if (isCompleted) {
    return {
      daysRemaining: 0,
      isAlertActive: false,
      isOverdue: false,
      isDueToday: false,
      threshold,
      badgeText: 'Delivered',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      urgency: 'completed'
    };
  }

  const daysRemaining = getProjectDaysRemaining(project.due_date);
  const alertsEnabled = project.deadline_alerts_enabled !== false;
  const isOverdue = daysRemaining < 0;
  const isDueToday = daysRemaining === 0;
  const isAlertActive = alertsEnabled && daysRemaining <= threshold;

  let badgeText = '';
  let badgeClass = '';
  let urgency: 'critical' | 'urgent' | 'warning' | 'normal' = 'normal';

  if (isOverdue) {
    const overdueDays = Math.abs(daysRemaining);
    badgeText = `Overdue by ${overdueDays} day${overdueDays > 1 ? 's' : ''}!`;
    badgeClass = 'bg-red-100 text-red-800 border-red-300 font-black animate-pulse';
    urgency = 'critical';
  } else if (isDueToday) {
    badgeText = 'Deadline Today!';
    badgeClass = 'bg-red-100 text-red-800 border-red-300 font-black animate-pulse';
    urgency = 'critical';
  } else if (daysRemaining === 1) {
    badgeText = 'Due Tomorrow (1 day)!';
    badgeClass = 'bg-orange-100 text-orange-800 border-orange-300 font-bold animate-pulse';
    urgency = 'urgent';
  } else if (daysRemaining <= threshold) {
    badgeText = `Due in ${daysRemaining} days (3d cutoff)`;
    badgeClass = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
    urgency = 'warning';
  } else {
    badgeText = `${daysRemaining} days remaining`;
    badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    urgency = 'normal';
  }

  return {
    daysRemaining,
    isAlertActive,
    isOverdue,
    isDueToday,
    threshold,
    badgeText,
    badgeClass,
    urgency
  };
}

/**
 * Filters all projects that currently trigger the active deadline alert (within 3 days and not completed)
 */
export function getActiveProjectDeadlineAlerts(projects: Project[]): { project: Project; status: ProjectDeadlineStatus }[] {
  return projects
    .filter(p => p.status !== 'Completed')
    .map(p => ({
      project: p,
      status: getProjectDeadlineStatus(p)
    }))
    .filter(item => item.status.isAlertActive)
    .sort((a, b) => a.status.daysRemaining - b.status.daysRemaining);
}

/**
 * Generates an automated project deadline email notification for the team lead & admin
 */
export function generateProjectDeadlineEmail(
  project: Project,
  projectTasks: Task[]
): ProjectDeadlineNotification {
  const status = getProjectDeadlineStatus(project);
  const pendingTasks = projectTasks.filter(t => t.status !== 'Completed');
  const completedTasks = projectTasks.filter(t => t.status === 'Completed');
  const completionPct = projectTasks.length > 0 
    ? Math.round((completedTasks.length / projectTasks.length) * 100) 
    : 0;

  const subject = status.isOverdue
    ? `[OVERDUE ESCALATION] ${project.project_title} exceeded completion cutoff (${Math.abs(status.daysRemaining)} days past due) - VK Digi Solutions`
    : status.daysRemaining <= 1
    ? `[FINAL 24HR DEADLINE ALERT] ${project.project_title} scheduled for delivery tomorrow - VK Digi Solutions`
    : `[PROJECT DEADLINE ALERT: ${status.daysRemaining} DAYS] Milestone Delivery Cutoff for ${project.project_title} - VK Digi Solutions`;

  const leadEmail = project.lead_email || '';

  const body = `Dear ${project.assigned_to} & Delivery Team,

PROJECT DEADLINE NOTIFICATION - VK DIGI SOLUTIONS
======================================================================
This is an automated delivery checkpoint alert triggered by the ERP engine.
Target project completion is scheduled within the ${status.threshold}-day notification window.

PROJECT DETAILS:
----------------------------------------------------------------------
• Project Title: ${project.project_title}
• Client: ${project.client_name || 'Assigned Agency Client'}
• Lead Architect / Assignee: ${project.assigned_to} (${leadEmail})
• Priority: ${project.priority}
• Current Status: ${project.status}
• Scheduled Due Date: ${project.due_date}
• Days Remaining: ${status.daysRemaining < 0 ? `OVERDUE BY ${Math.abs(status.daysRemaining)} DAYS` : `${status.daysRemaining} DAYS`}
• Milestone Progress: ${completedTasks.length}/${projectTasks.length} tasks completed (${completionPct}%)

OUTSTANDING SPRINT TASKS (${pendingTasks.length} pending):
----------------------------------------------------------------------
${pendingTasks.length === 0 ? '• All tasks marked completed. Please finalize sign-off and move project to "Completed".' : pendingTasks.map((t, idx) => `${idx + 1}. [${t.status}] ${t.task_title} (Assigned: ${t.assigned_to}, Priority: ${t.priority})`).join('\n')}

ACTION REQUIRED:
----------------------------------------------------------------------
1. Verify pending pull requests, code reviews, and staging deployments.
2. If delivery timeline requires extension, update the project due date in the ERP or submit an amendment to the Super Admin.
3. Schedule client acceptance walkthrough before end of sprint.

Generated automatically by VK Digi Solutions ERP & Admin Portal.
Hostinger Cloud Server Infrastructure`;

  return {
    id: `pnotif-${project.id}-${Date.now()}`,
    project_id: project.id,
    project_title: project.project_title,
    client_name: project.client_name || 'Agency Client',
    assigned_to: project.assigned_to,
    lead_email: leadEmail,
    due_date: project.due_date,
    days_remaining: status.daysRemaining,
    subject,
    body,
    status: 'Queued',
    urgency: status.urgency === 'critical' ? 'critical' : status.urgency === 'urgent' ? 'urgent' : 'warning'
  };
}
