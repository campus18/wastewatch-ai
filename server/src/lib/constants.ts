export const ROLES = ['admin', 'supervisor', 'collector', 'citizen'] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = ['plastic', 'organic', 'construction', 'hazardous', 'electronic', 'mixed', 'other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type Severity = (typeof SEVERITIES)[number];
export const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

export const REPORT_STATUSES = ['reported', 'assigned', 'in_progress', 'pending_verification', 'resolved'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const TASK_STATUSES = ['assigned', 'in_progress', 'pending_verification', 'completed'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
