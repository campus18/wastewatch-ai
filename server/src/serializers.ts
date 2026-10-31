export const ref = (x: any) => (x && x._id ? String(x._id) : x ? String(x) : undefined);

export function serializeReport(r: any) {
  return {
    id: String(r._id),
    category: r.category,
    severity: r.severity,
    description: r.description,
    status: r.status,
    location: { lat: r.location.coordinates[1], lng: r.location.coordinates[0] },
    photoUrl: r.photoUrl,
    ai: r.ai,
    isSample: !!r.isSample,
    reporter: r.reporter?.name ? { id: ref(r.reporter), name: r.reporter.name } : { id: ref(r.reporter) },
    createdAt: r.createdAt,
    resolvedAt: r.resolvedAt,
  };
}

export function serializeTask(t: any, now = new Date()) {
  const report = t.report && t.report.location ? serializeReport(t.report) : { id: ref(t.report) };
  return {
    id: String(t._id),
    report,
    assignee: t.assignee?.name ? { id: ref(t.assignee), name: t.assignee.name } : { id: ref(t.assignee) },
    deadline: t.deadline,
    status: t.status,
    overdue: t.status !== 'completed' && new Date(t.deadline).getTime() < now.getTime(),
    notes: t.notes,
    beforePhotoUrl: t.beforePhotoUrl,
    afterPhotoUrl: t.afterPhotoUrl,
    cleanupNotes: t.cleanupNotes,
    submittedAt: t.submittedAt,
    verification: t.verification?.decision ? { decision: t.verification.decision, comment: t.verification.comment, at: t.verification.at } : null,
    completedAt: t.completedAt,
    isSample: !!t.isSample,
    createdAt: t.createdAt,
  };
}
