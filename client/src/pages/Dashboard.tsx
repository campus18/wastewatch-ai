import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Analytics, Report, Task } from '../types';
import { Empty, ErrorBanner, fmtDate, label, SampleTag, Sev, Spinner, StatusBadge, useAsync } from '../ui';

const Stat = ({ k, v, to, warn }: { k: string; v: number | string; to?: string; warn?: boolean }) => {
  const body = <><span className="stat-k">{k}</span><span className={`stat-v ${warn && Number(v) > 0 ? 'warn' : ''}`}>{v}</span></>;
  return to ? <Link to={to} className="stat">{body}</Link> : <div className="stat">{body}</div>;
};

function StaffDashboard() {
  const a = useAsync(() => api<Analytics>('/analytics?days=14'));
  const todo = useAsync(() => api<Report[]>('/reports?status=reported'));
  if (a.loading || todo.loading) return <Spinner />;
  if (a.error || !a.data) return <ErrorBanner message={a.error ?? 'Could not load'} onRetry={a.reload} />;
  const d = a.data;
  return (
    <>
      <div className="stats">
        <Stat k="Unresolved reports" v={d.totals.unresolved} to="/reports" />
        <Stat k="Awaiting assignment" v={d.byStatus.reported ?? 0} to="/reports?status=reported" />
        <Stat k="Awaiting verification" v={d.taskProgress.pending_verification} to="/tasks?status=pending_verification" />
        <Stat k="Overdue tasks" v={d.taskProgress.overdue} to="/tasks" warn />
        <Stat k="Hotspots (2+ unresolved nearby)" v={d.hotspots.length} to="/analytics" />
        <Stat k="Resolved" v={d.totals.resolved} />
      </div>
      <section className="card">
        <h3>Reports needing assignment</h3>
        {todo.error && <ErrorBanner message={todo.error} onRetry={todo.reload} />}
        {todo.data && !todo.data.length && <Empty title="Nothing waiting" hint="New citizen reports will appear here." />}
        <ul className="list">{todo.data?.slice(0, 6).map((r) => (
          <li key={r.id}><Link to={`/reports?open=${r.id}`} className="li-main"><strong>{label(r.category)}</strong> {r.isSample && <SampleTag />}<span className="muted small">{fmtDate(r.createdAt)}</span></Link><Sev level={r.severity} /></li>
        ))}</ul>
      </section>
    </>
  );
}

function CollectorDashboard() {
  const t = useAsync(() => api<Task[]>('/tasks'));
  if (t.loading) return <Spinner />;
  if (t.error || !t.data) return <ErrorBanner message={t.error ?? 'Could not load'} onRetry={t.reload} />;
  const open = t.data.filter((x) => x.status !== 'completed');
  const c = (s: string) => t.data!.filter((x) => x.status === s).length;
  return (
    <>
      <div className="stats">
        <Stat k="Assigned" v={c('assigned')} to="/tasks?status=assigned" />
        <Stat k="In progress" v={c('in_progress')} to="/tasks?status=in_progress" />
        <Stat k="Awaiting verification" v={c('pending_verification')} to="/tasks?status=pending_verification" />
        <Stat k="Overdue" v={open.filter((x) => x.overdue).length} to="/tasks" warn />
      </div>
      <section className="card">
        <h3>Up next</h3>
        {!open.length && <Empty title="No open tasks" hint="Tasks assigned to you will show up here." />}
        <ul className="list">{open.slice(0, 6).map((x) => (
          <li key={x.id}><Link to={`/tasks?open=${x.id}`} className="li-main"><strong>{label(x.report.category)}</strong> <StatusBadge status={x.status} /><span className="muted small">Due {fmtDate(x.deadline)} {x.overdue && '· overdue'}</span></Link><Sev level={x.report.severity} /></li>
        ))}</ul>
        {open.length > 0 && <Link className="btn" to="/routes">Plan a route</Link>}
      </section>
    </>
  );
}

function CitizenDashboard() {
  const r = useAsync(() => api<Report[]>('/reports'));
  if (r.loading) return <Spinner />;
  if (r.error || !r.data) return <ErrorBanner message={r.error ?? 'Could not load'} onRetry={r.reload} />;
  const c = (f: (x: Report) => boolean) => r.data!.filter(f).length;
  return (
    <>
      <div className="stats">
        <Stat k="Your reports" v={r.data.length} to="/reports" />
        <Stat k="In progress" v={c((x) => ['assigned', 'in_progress', 'pending_verification'].includes(x.status))} />
        <Stat k="Resolved" v={c((x) => x.status === 'resolved')} />
      </div>
      <section className="card">
        <h3>Recent reports</h3>
        {!r.data.length && <Empty title="You haven't reported anything yet" hint="Spot illegal dumping or overflowing bins? Add a photo and a pin."><Link className="btn primary" to="/report/new">Report waste</Link></Empty>}
        <ul className="list">{r.data.slice(0, 6).map((x) => (
          <li key={x.id}><Link to={`/reports?open=${x.id}`} className="li-main"><strong>{label(x.category)}</strong> <StatusBadge status={x.status} /><span className="muted small">{fmtDate(x.createdAt)}</span></Link><Sev level={x.severity} /></li>
        ))}</ul>
      </section>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <h2 className="page-title">Welcome, {user.name.split(' ')[0]}</h2>
      {(user.role === 'admin' || user.role === 'supervisor') ? <StaffDashboard /> : user.role === 'collector' ? <CollectorDashboard /> : <CitizenDashboard />}
    </>
  );
}
