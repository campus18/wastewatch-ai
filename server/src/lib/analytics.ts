import { SEVERITY_RANK } from './constants';
import type { Severity } from './constants';
import { clusterPoints } from './geo';

interface R { id: string; status: string; category: string; severity: Severity; createdAt: Date | string; resolvedAt?: Date | string | null; location: { lat: number; lng: number } }
interface T { status: string; deadline: Date | string }

const day = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const count = <X>(items: X[], key: (x: X) => string) => items.reduce<Record<string, number>>((m, x) => { const k = key(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});

/** Every figure is derived from the supplied records; empty input yields zeros/empty lists. */
export function computeAnalytics(input: { reports: R[]; tasks: T[]; now?: Date; days?: number; hotspotRadiusMeters?: number; hotspotMinReports?: number }) {
  const { reports, tasks } = input;
  const now = input.now ?? new Date();
  const days = input.days ?? 14;
  const unresolved = reports.filter((r) => r.status !== 'resolved');

  const trend = Array.from({ length: days }, (_, i) => {
    const date = day(new Date(now.getTime() - (days - 1 - i) * 86400000));
    return {
      date,
      reported: reports.filter((r) => day(r.createdAt) === date).length,
      resolved: reports.filter((r) => r.resolvedAt && day(r.resolvedAt) === date).length,
    };
  });

  const hotspots = clusterPoints(unresolved.map((r) => ({ ...r.location, id: r.id, severity: r.severity })), input.hotspotRadiusMeters ?? 200)
    .filter((c) => c.items.length >= (input.hotspotMinReports ?? 2))
    .map((c) => ({
      center: c.center,
      count: c.items.length,
      maxSeverity: c.items.reduce<Severity>((m, x) => (SEVERITY_RANK[x.severity] > SEVERITY_RANK[m] ? x.severity : m), 'low'),
      reportIds: c.items.map((x) => x.id),
    }))
    .sort((a, b) => b.count - a.count);

  const taskCounts = count(tasks, (t) => t.status);
  return {
    totals: { reports: reports.length, unresolved: unresolved.length, resolved: reports.length - unresolved.length },
    byStatus: count(reports, (r) => r.status),
    byCategory: count(reports, (r) => r.category),
    bySeverity: count(reports, (r) => r.severity),
    taskProgress: {
      total: tasks.length,
      assigned: taskCounts.assigned ?? 0,
      in_progress: taskCounts.in_progress ?? 0,
      pending_verification: taskCounts.pending_verification ?? 0,
      completed: taskCounts.completed ?? 0,
      overdue: tasks.filter((t) => t.status !== 'completed' && new Date(t.deadline).getTime() < now.getTime()).length,
    },
    trend,
    hotspots,
  };
}
