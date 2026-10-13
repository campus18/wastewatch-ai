import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, apiImageUrl, ApiError } from '../api';
import { useAuth } from '../auth';
import type { Report, ReportDetailData, User } from '../types';
import { AiPanel, Banner, ErrorBanner, errMsg, Field, fieldErrors, fmtDate, label, SampleTag, Sev, Spinner, StatusBadge, useAsync, useCapabilities } from '../ui';

function Satellite({ lat, lng }: { lat: number; lng: number }) {
  const caps = useCapabilities();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!caps) return null;
  if (!caps.imagery.configured) return <Banner kind="info"><strong>Satellite imagery unavailable.</strong> No imagery provider is configured on this server (set MAPBOX_ACCESS_TOKEN).</Banner>;
  const load = async () => {
    setBusy(true); setError(null);
    try { setUrl(await apiImageUrl(`/imagery?lat=${lat}&lng=${lng}&zoom=17`)); }
    catch (e) { setError(e instanceof ApiError && e.status === 503 ? 'Satellite imagery is unavailable on this server.' : errMsg(e)); }
    finally { setBusy(false); }
  };
  return (
    <div>
      {!url && <button className="btn" onClick={load} disabled={busy}>{busy ? 'Loading imagery…' : 'Load satellite view'}</button>}
      {error && <ErrorBanner message={error} onRetry={load} />}
      {url && <figure className="sat"><img src={url} alt={`Satellite view at ${lat.toFixed(5)}, ${lng.toFixed(5)}`} /><figcaption>{caps.imagery.provider} · {caps.imagery.attribution} · imagery may be months or years old</figcaption></figure>}
    </div>
  );
}

function AssignForm({ report, onDone }: { report: Report; onDone: () => void }) {
  const collectors = useAsync(() => api<User[]>('/users?role=collector'));
  const [assigneeId, setAssigneeId] = useState('');
  const [deadline, setDeadline] = useState(() => { const d = new Date(Date.now() + 86400000); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); });
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const fe = fieldErrors(error);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(null);
    try { await api('/tasks', { method: 'POST', body: { reportId: report.id, assigneeId, deadline: new Date(deadline).toISOString(), notes } }); onDone(); }
    catch (err) { setError(err); } finally { setBusy(false); }
  };
  if (collectors.loading) return <Spinner text="Loading collectors…" />;
  if (collectors.error) return <ErrorBanner message={collectors.error} onRetry={collectors.reload} />;
  if (!collectors.data?.length) return <Banner kind="warn">No collectors exist yet. An admin can give the collector role to a user on the Users page.</Banner>;
  return (
    <form className="form" onSubmit={submit}>
      <h4>Assign cleanup</h4>
      <Field label="Collector" error={fe.assigneeId}>
        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} required><option value="">Choose a collector</option>{collectors.data.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </Field>
      <Field label="Deadline" error={fe.deadline}><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></Field>
      <Field label="Instructions (optional)" error={fe.notes}><textarea rows={2} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} /></Field>
      {error != null && !Object.keys(fe).length && <ErrorBanner message={errMsg(error)} />}
      <button className="btn primary" disabled={busy}>{busy ? 'Assigning…' : 'Assign task'}</button>
    </form>
  );
}

/** `full` = fetch the complete record (staff or the reporter). Otherwise show the public map summary only. */
export function ReportDetail({ summary, full, onChanged, onClose }: { summary: Report; full: boolean; onChanged: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const detail = useAsync(() => (full ? api<ReportDetailData>(`/reports/${summary.id}`) : Promise.resolve(null)), [summary.id, full]);
  const r: Report = detail.data ?? summary;
  const task = detail.data?.task ?? null;
  const canAssign = !!user && ['supervisor', 'admin'].includes(user.role) && r.status === 'reported';
  return (
    <aside className="panel" aria-label="Report details">
      <div className="panel-head">
        <h3>{label(r.category)} waste {r.isSample && <SampleTag />}</h3>
        <button className="btn sm" onClick={onClose} aria-label="Close details">Close</button>
      </div>
      {r.photoUrl ? <img className="photo" src={r.photoUrl} alt="Reported waste" loading="lazy" /> : <div className="noimg">No photo attached{r.isSample ? ' (sample data)' : ''}</div>}
      <div className="row wrap"><Sev level={r.severity} /><StatusBadge status={r.status} /></div>
      {r.description && <p>{r.description}</p>}
      <dl className="kv">
        <dt>Reported</dt><dd>{fmtDate(r.createdAt)}</dd>
        {r.resolvedAt && <><dt>Resolved</dt><dd>{fmtDate(r.resolvedAt)}</dd></>}
        <dt>Location</dt><dd>{r.location.lat.toFixed(5)}, {r.location.lng.toFixed(5)}</dd>
        {detail.data?.reporter?.name && <><dt>Reporter</dt><dd>{detail.data.reporter.name}</dd></>}
      </dl>
      {full && detail.loading && <Spinner />}
      {full && detail.error && <ErrorBanner message={detail.error} onRetry={detail.reload} />}
      {full && detail.data && <><h4>AI detection</h4><AiPanel ai={detail.data.ai} /></>}
      {task && (
        <>
          <h4>Cleanup task</h4>
          <dl className="kv">
            <dt>Collector</dt><dd>{task.assignee.name ?? '—'}</dd>
            <dt>Deadline</dt><dd>{fmtDate(task.deadline)} {task.overdue && <span className="badge st-overdue">Overdue</span>}</dd>
            <dt>Task status</dt><dd><StatusBadge status={task.status} /></dd>
          </dl>
        </>
      )}
      {canAssign && <AssignForm report={r} onDone={() => { detail.reload(); onChanged(); }} />}
      <h4>Satellite view</h4>
      <Satellite lat={r.location.lat} lng={r.location.lng} />
    </aside>
  );
}
