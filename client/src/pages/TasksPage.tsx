import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Task, TaskStatus, User } from '../types';
import { Banner, Empty, ErrorBanner, errMsg, Field, fieldErrors, fmtDate, label, SampleTag, Sev, Spinner, StatusBadge, useAsync } from '../ui';

const STATES: TaskStatus[] = ['assigned', 'in_progress', 'pending_verification', 'completed'];
const toLocal = (iso: string) => { const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };

function useAction(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const run = async (fn: () => Promise<unknown>) => { setBusy(true); setError(null); try { await fn(); onDone(); } catch (e) { setError(e); } finally { setBusy(false); } };
  return { busy, error, run, fe: fieldErrors(error) };
}

function CleanupForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const { busy, error, run, fe } = useAction(onDone);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    if (before) form.set('before', before);
    if (after) form.set('after', after);
    form.set('notes', notes);
    run(() => api(`/tasks/${task.id}/cleanup`, { method: 'POST', form }));
  };
  return (
    <form className="form sub" onSubmit={submit}>
      <h4>Submit cleanup for verification</h4>
      <Field label="Before photo" error={fe.before}><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setBefore(e.target.files?.[0] ?? null)} /></Field>
      <Field label="After photo" error={fe.after}><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(e) => setAfter(e.target.files?.[0] ?? null)} /></Field>
      <Field label="Notes (optional)" error={fe.notes}><textarea rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      {error != null && !Object.keys(fe).length && <ErrorBanner message={errMsg(error)} />}
      <button className="btn primary" disabled={busy}>{busy ? 'Uploading…' : 'Submit for verification'}</button>
    </form>
  );
}

function VerifyForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const [comment, setComment] = useState('');
  const { busy, error, run, fe } = useAction(onDone);
  const decide = (decision: 'approve' | 'reject') => run(() => api(`/tasks/${task.id}/verify`, { method: 'POST', body: { decision, comment } }));
  return (
    <div className="form sub">
      <h4>Verify cleanup</h4>
      <div className="ba">
        <figure><img src={task.beforePhotoUrl} alt="Before cleanup" loading="lazy" /><figcaption>Before</figcaption></figure>
        <figure><img src={task.afterPhotoUrl} alt="After cleanup" loading="lazy" /><figcaption>After</figcaption></figure>
      </div>
      {task.cleanupNotes && <p className="muted">Collector notes: {task.cleanupNotes}</p>}
      <Field label="Comment (required to reject)" error={fe.comment}><textarea rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      {error != null && !Object.keys(fe).length && <ErrorBanner message={errMsg(error)} />}
      <div className="row wrap">
        <button className="btn primary" disabled={busy} onClick={() => decide('approve')}>Approve cleanup</button>
        <button className="btn danger" disabled={busy} onClick={() => decide('reject')}>Reject cleanup</button>
      </div>
    </div>
  );
}

function EditForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const collectors = useAsync(() => api<User[]>('/users?role=collector'));
  const [assigneeId, setAssigneeId] = useState(task.assignee.id ?? '');
  const [deadline, setDeadline] = useState(toLocal(task.deadline));
  const { busy, error, run, fe } = useAction(onDone);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body: Record<string, string> = {};
    if (assigneeId && assigneeId !== task.assignee.id) body.assigneeId = assigneeId;
    if (deadline !== toLocal(task.deadline)) body.deadline = new Date(deadline).toISOString();
    run(() => api(`/tasks/${task.id}`, { method: 'PATCH', body }));
  };
  return (
    <form className="form sub" onSubmit={submit}>
      <h4>Edit deadline or reassign</h4>
      <Field label="Collector" error={fe.assigneeId}><select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>{collectors.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Field label="Deadline" error={fe.deadline}><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
      {(error != null && !Object.keys(fe).length || fe.form) && <ErrorBanner message={fe.form ?? errMsg(error)} />}
      <button className="btn" disabled={busy || collectors.loading}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  );
}

function TaskCard({ task, highlight, onChanged }: { task: Task; highlight: boolean; onChanged: () => void }) {
  const { user } = useAuth();
  const ref = useRef<HTMLElement>(null);
  const [panel, setPanel] = useState<'cleanup' | 'edit' | null>(null);
  const done = () => { setPanel(null); onChanged(); };
  const start = useAction(done);
  const staff = user?.role === 'admin' || user?.role === 'supervisor';
  const mine = user?.role === 'collector';
  useEffect(() => { if (highlight) ref.current?.scrollIntoView({ block: 'center' }); }, [highlight]);
  const r = task.report;
  return (
    <article ref={ref} className={`card task ${highlight ? 'hl' : ''}`}>
      <div className="row between wrap">
        <h3>{label(r.category)} {task.isSample && <SampleTag />}</h3>
        <Sev level={r.severity} />
      </div>
      <div className="row wrap"><StatusBadge status={task.status} />{task.overdue && <span className="badge st-overdue">Overdue</span>}</div>
      <dl className="kv">
        <dt>Deadline</dt><dd>{fmtDate(task.deadline)}</dd>
        <dt>Collector</dt><dd>{task.assignee.name ?? '—'}</dd>
        <dt>Location</dt><dd>{r.location ? <Link to={`/map?focus=${r.location.lat},${r.location.lng}&open=${r.id}`}>{r.location.lat.toFixed(4)}, {r.location.lng.toFixed(4)} (view on map)</Link> : '—'}</dd>
        {task.notes && <><dt>Instructions</dt><dd>{task.notes}</dd></>}
        {task.completedAt && <><dt>Completed</dt><dd>{fmtDate(task.completedAt)}</dd></>}
      </dl>
      {task.verification?.decision === 'reject' && <Banner kind="err"><strong>Cleanup rejected.</strong> {task.verification.comment}</Banner>}
      {task.status === 'completed' && task.beforePhotoUrl && (
        <div className="ba"><figure><img src={task.beforePhotoUrl} alt="Before cleanup" loading="lazy" /><figcaption>Before</figcaption></figure><figure><img src={task.afterPhotoUrl} alt="After cleanup" loading="lazy" /><figcaption>After</figcaption></figure></div>
      )}
      {start.error != null && <ErrorBanner message={errMsg(start.error)} />}
      <div className="row wrap">
        {mine && task.status === 'assigned' && <button className="btn" disabled={start.busy} onClick={() => start.run(() => api(`/tasks/${task.id}/start`, { method: 'POST' }))}>{start.busy ? 'Starting…' : 'Start work'}</button>}
        {mine && ['assigned', 'in_progress'].includes(task.status) && <button className="btn primary" onClick={() => setPanel(panel === 'cleanup' ? null : 'cleanup')}>Submit cleanup</button>}
        {staff && task.status !== 'completed' && <button className="btn" onClick={() => setPanel(panel === 'edit' ? null : 'edit')}>Edit deadline / reassign</button>}
      </div>
      {panel === 'cleanup' && <CleanupForm task={task} onDone={done} />}
      {panel === 'edit' && <EditForm task={task} onDone={done} />}
      {staff && task.status === 'pending_verification' && <VerifyForm task={task} onDone={done} />}
      {mine && task.status === 'pending_verification' && <Banner kind="info">Waiting for a supervisor to verify your cleanup.</Banner>}
    </article>
  );
}

export default function TasksPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const tasks = useAsync(() => api<Task[]>(`/tasks${status ? `?status=${status}` : ''}`), [status]);
  const openId = params.get('open');
  const rows = (tasks.data ?? []).filter((t) => !overdueOnly || t.overdue);
  return (
    <>
      <h2 className="page-title">{user?.role === 'collector' ? 'My tasks' : 'Cleanup tasks'}</h2>
      <div className="filters">
        <label className="filter"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{STATES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select></label>
        <label className="check"><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
      </div>
      {tasks.loading && <Spinner />}
      {tasks.error && <ErrorBanner message={tasks.error} onRetry={tasks.reload} />}
      {tasks.data && !rows.length && <Empty title="No tasks here" hint={user?.role === 'collector' ? 'Tasks a supervisor assigns to you will appear here.' : 'Assign a report from the Reports page to create a task.'} />}
      <div className="cards">{rows.map((t) => <TaskCard key={t.id} task={t} highlight={t.id === openId} onChanged={tasks.reload} />)}</div>
    </>
  );
}
