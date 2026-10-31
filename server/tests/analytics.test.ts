import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeAnalytics } from '../src/lib/analytics';

const now = new Date('2026-03-10T12:00:00Z');
const loc = (lng: number) => ({ lat: 0, lng });
const reports = [
  { id: '1', status: 'reported', category: 'plastic', severity: 'high' as const, createdAt: '2026-03-10T01:00:00Z', location: loc(0) },
  { id: '2', status: 'assigned', category: 'plastic', severity: 'critical' as const, createdAt: '2026-03-09T01:00:00Z', location: loc(0.0005) },
  { id: '3', status: 'resolved', category: 'mixed', severity: 'low' as const, createdAt: '2026-03-08T01:00:00Z', resolvedAt: '2026-03-10T02:00:00Z', location: loc(0.0006) },
  { id: '4', status: 'reported', category: 'organic', severity: 'low' as const, createdAt: '2026-03-01T01:00:00Z', location: loc(5) },
];
const tasks = [
  { status: 'assigned', deadline: '2026-03-09T00:00:00Z' },
  { status: 'completed', deadline: '2026-03-01T00:00:00Z' },
  { status: 'in_progress', deadline: '2026-03-20T00:00:00Z' },
];

test('empty input produces zeros, not fabricated numbers', () => {
  const a = computeAnalytics({ reports: [], tasks: [], now });
  assert.deepEqual(a.totals, { reports: 0, unresolved: 0, resolved: 0 });
  assert.equal(a.hotspots.length, 0);
  assert.equal(a.trend.length, 14);
  assert.ok(a.trend.every((t) => t.reported === 0 && t.resolved === 0));
});
test('totals, breakdowns and task progress match the records', () => {
  const a = computeAnalytics({ reports, tasks, now });
  assert.deepEqual(a.totals, { reports: 4, unresolved: 3, resolved: 1 });
  assert.equal(a.byCategory.plastic, 2);
  assert.equal(a.bySeverity.low, 2);
  assert.deepEqual(a.taskProgress, { total: 3, assigned: 1, in_progress: 1, pending_verification: 0, completed: 1, overdue: 1 });
});
test('trend buckets by UTC day and ends at "now"', () => {
  const a = computeAnalytics({ reports, tasks, now });
  const last = a.trend[a.trend.length - 1];
  assert.equal(last.date, '2026-03-10');
  assert.equal(last.reported, 1);
  assert.equal(last.resolved, 1);
});
test('hotspots are unresolved clusters of >= 2 reports with the max severity', () => {
  const a = computeAnalytics({ reports, tasks, now });
  assert.equal(a.hotspots.length, 1);
  assert.equal(a.hotspots[0].count, 2);
  assert.equal(a.hotspots[0].maxSeverity, 'critical');
  assert.deepEqual(a.hotspots[0].reportIds.sort(), ['1', '2']);
});
