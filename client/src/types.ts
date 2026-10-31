export type Role = 'admin' | 'supervisor' | 'collector' | 'citizen';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'reported' | 'assigned' | 'in_progress' | 'pending_verification' | 'resolved';
export type TaskStatus = 'assigned' | 'in_progress' | 'pending_verification' | 'completed';

export interface User { id: string; name: string; email: string; role: Role; isSample?: boolean }
export interface AiResult {
  status: 'ok' | 'demo' | 'unconfigured' | 'error';
  provider: string | null; demo: boolean;
  labels: { description: string; score: number }[];
  wasteRelated: boolean | null; wasteScore: number | null; suggestedCategory: string | null;
  message: string; checkedAt: string;
}
export interface Report {
  id: string; category: string; severity: Severity; description: string; status: ReportStatus;
  location: { lat: number; lng: number }; photoUrl: string; ai?: AiResult | null; isSample: boolean;
  reporter?: { id?: string; name?: string }; createdAt: string; resolvedAt?: string | null;
}
export interface Task {
  id: string; report: Report; assignee: { id?: string; name?: string }; deadline: string; status: TaskStatus; overdue: boolean;
  notes: string; beforePhotoUrl: string; afterPhotoUrl: string; cleanupNotes: string; submittedAt?: string | null;
  verification: { decision: 'approve' | 'reject'; comment?: string; at?: string } | null; completedAt?: string | null; isSample: boolean;
}
export interface ReportDetailData extends Report { task: Task | null }
export interface Notice { id: string; type: string; message: string; link: string; read: boolean; createdAt: string }
export interface Capabilities {
  ai: { configured: boolean; demoMode: boolean; provider: string | null };
  routing: { configured: boolean; provider: string | null };
  imagery: { configured: boolean; provider: string | null; attribution: string | null };
}
export interface Analytics {
  days: number; generatedAt: string;
  totals: { reports: number; unresolved: number; resolved: number };
  byStatus: Record<string, number>; byCategory: Record<string, number>; bySeverity: Record<string, number>;
  taskProgress: { total: number; assigned: number; in_progress: number; pending_verification: number; completed: number; overdue: number };
  trend: { date: string; reported: number; resolved: number }[];
  hotspots: { center: { lat: number; lng: number }; count: number; maxSeverity: Severity; reportIds: string[] }[];
}
export interface RoutePlanResult {
  provider: 'osrm' | 'simulated'; simulated: boolean; note: string; order: string[]; geometry: [number, number][];
  distanceMeters: number | null; durationSeconds: number | null; start: { lat: number; lng: number } | null;
  stops: { taskId: string; position: number; lat: number; lng: number; category: string; severity: Severity; deadline: string }[];
}
