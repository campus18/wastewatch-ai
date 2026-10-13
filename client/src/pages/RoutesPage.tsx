import { useMemo, useState } from 'react';
import { api } from '../api';
import type { RoutePlanResult, Task } from '../types';
import { Banner, Empty, ErrorBanner, errMsg, fmtDate, fmtDistance, fmtDuration, label, MapView, Sev, Spinner, useAsync, useCapabilities } from '../ui';

export default function RoutesPage() {
  const caps = useCapabilities();
  const tasks = useAsync(() => api<Task[]>('/tasks'));
  const [selected, setSelected] = useState<string[]>([]);
  const [useStart, setUseStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<RoutePlanResult | null>(null);
  const open = useMemo(() => (tasks.data ?? []).filter((t) => t.status !== 'completed'), [tasks.data]);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < 25 ? [...s, id] : s));

  const getStart = () => new Promise<{ lat: number; lng: number } | undefined>((resolve, reject) => {
    if (!useStart) return resolve(undefined);
    if (!navigator.geolocation) return reject(new Error('This browser does not support location. Untick “Start from my location”.'));
    navigator.geolocation.getCurrentPosition((p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }), () => reject(new Error('Could not read your location. Allow location access or untick “Start from my location”.')), { timeout: 10000 });
  });
  const run = async () => {
    setBusy(true); setError(null); setPlan(null);
    try { const start = await getStart(); setPlan(await api<RoutePlanResult>('/routes/plan', { method: 'POST', body: { taskIds: selected, start } })); }
    catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <>
      <h2 className="page-title">Route planning</h2>
      {caps && (caps.routing.configured
        ? <Banner kind="info">Routes use the configured routing service ({caps.routing.provider}). If it fails, a clearly-labelled simulated route is shown instead.</Banner>
        : <Banner kind="warn"><strong>Simulated routing.</strong> No routing service is configured, so routes use a nearest-neighbour order with straight lines. They are not road routes.</Banner>)}
      <div className="split has-panel">
        <section className="card">
          <h3>Choose stops</h3>
          {tasks.loading && <Spinner />}
          {tasks.error && <ErrorBanner message={tasks.error} onRetry={tasks.reload} />}
          {tasks.data && !open.length && <Empty title="No open tasks to route" hint="Assigned tasks appear here." />}
          <ul className="list">{open.map((t) => (
            <li key={t.id}><label className="li-main check"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} /><span><strong>{label(t.report.category)}</strong> <span className="muted small">due {fmtDate(t.deadline)} · {t.assignee.name}</span></span></label><Sev level={t.report.severity} /></li>
          ))}</ul>
          <label className="check"><input type="checkbox" checked={useStart} onChange={(e) => setUseStart(e.target.checked)} /> Start from my current location</label>
          {error && <ErrorBanner message={error} />}
          <button className="btn primary block" disabled={busy || !selected.length} onClick={run}>{busy ? 'Planning…' : `Plan route (${selected.length} stop${selected.length === 1 ? '' : 's'})`}</button>
        </section>
        <section>
          {plan && (
            <Banner kind={plan.simulated ? 'warn' : 'ok'}>
              <strong>{plan.simulated ? 'Simulated route' : `Route from ${plan.provider.toUpperCase()}`}.</strong> {plan.note}
              <div className="row wrap small">Distance: {fmtDistance(plan.distanceMeters)}{plan.simulated ? ' (straight-line)' : ''} · Drive time: {fmtDuration(plan.durationSeconds)}</div>
            </Banner>
          )}
          <MapView className="mapbox full" route={plan?.geometry ?? null} routeDashed={plan?.simulated} routeStart={plan?.start} routeStops={plan?.stops.map((s) => ({ lat: s.lat, lng: s.lng, n: s.position })) ?? []} />
          {plan && <ol className="list card order">{plan.stops.map((s) => <li key={s.taskId}><span className="stopnum static">{s.position}</span><span className="li-main"><strong>{label(s.category)}</strong><span className="muted small">{s.lat.toFixed(4)}, {s.lng.toFixed(4)} · due {fmtDate(s.deadline)}</span></span><Sev level={s.severity} /></li>)}</ol>}
        </section>
      </div>
    </>
  );
}
