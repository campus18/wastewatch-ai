import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Analytics } from '../types';
import { Banner, Empty, ErrorBanner, fmtDate, label, Sev, Spinner, useAsync } from '../ui';

function Bars({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <section className="card"><h3>{title}</h3>
      {!entries.length ? <p className="muted">No data yet.</p> : <ul className="bars">{entries.map(([k, v]) => <li key={k}><span>{label(k)}</span><span className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></span><b>{v}</b></li>)}</ul>}
    </section>
  );
}

function Trend({ data }: { data: Analytics['trend'] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.reported, d.resolved]));
  const W = 600, H = 170, P = 24, bw = (W - P * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${W} ${H + 24}`} className="trend" role="img" aria-label="Reports submitted and resolved per day">
      <line x1={P} x2={W - P} y1={H} y2={H} stroke="var(--line)" />
      {data.map((d, i) => {
        const x = P + i * bw, h1 = (d.reported / max) * (H - 16), h2 = (d.resolved / max) * (H - 16);
        return (
          <g key={d.date}>
            <title>{`${d.date}: ${d.reported} reported, ${d.resolved} resolved`}</title>
            <rect x={x + bw * 0.12} y={H - h1} width={bw * 0.36} height={h1} fill="var(--pine)" />
            <rect x={x + bw * 0.5} y={H - h2} width={bw * 0.36} height={h2} fill="var(--high)" />
            {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && <text x={x + bw / 2} y={H + 16} fontSize="10" textAnchor="middle" fill="var(--muted)">{d.date.slice(5)}</text>}
          </g>
        );
      })}
      <text x={P} y={10} fontSize="10" fill="var(--muted)">max {max}/day</text>
    </svg>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(14);
  const a = useAsync(() => api<Analytics>(`/analytics?days=${days}`), [days]);
  return (
    <>
      <div className="row between wrap"><h2 className="page-title">Analytics</h2>
        <label className="filter"><span>Trend window</span><select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 30, 90].map((d) => <option key={d} value={d}>Last {d} days</option>)}</select></label>
      </div>
      {a.loading && <Spinner />}
      {a.error && <ErrorBanner message={a.error} onRetry={a.reload} />}
      {a.data && (a.data.totals.reports === 0 ? <Empty title="No data yet" hint="Statistics appear once reports are submitted. Nothing here is estimated." /> : (
        <>
          <p className="muted small">Computed from stored records at {fmtDate(a.data.generatedAt)}. Hotspot = 2+ unresolved reports within 200 m.</p>
          <div className="stats">
            <div className="stat"><span className="stat-k">Total reports</span><span className="stat-v">{a.data.totals.reports}</span></div>
            <div className="stat"><span className="stat-k">Unresolved</span><span className="stat-v">{a.data.totals.unresolved}</span></div>
            <div className="stat"><span className="stat-k">Resolved</span><span className="stat-v">{a.data.totals.resolved}</span></div>
            <div className="stat"><span className="stat-k">Overdue tasks</span><span className={`stat-v ${a.data.taskProgress.overdue ? 'warn' : ''}`}>{a.data.taskProgress.overdue}</span></div>
          </div>
          <section className="card"><h3>Cleanup trend</h3>
            <div className="row wrap small"><span><i className="dot" style={{ background: 'var(--pine)' }} /> Reported</span><span><i className="dot" style={{ background: 'var(--high)' }} /> Resolved</span></div>
            <Trend data={a.data.trend} />
          </section>
          <div className="cards">
            <Bars title="Reports by status" data={a.data.byStatus} />
            <Bars title="Reports by category" data={a.data.byCategory} />
            <Bars title="Reports by severity" data={a.data.bySeverity} />
            <Bars title="Task progress" data={{ assigned: a.data.taskProgress.assigned, in_progress: a.data.taskProgress.in_progress, pending_verification: a.data.taskProgress.pending_verification, completed: a.data.taskProgress.completed }} />
          </div>
          <section className="card"><h3>Unresolved hotspots</h3>
            {!a.data.hotspots.length ? <Banner kind="info">No clusters of unresolved reports right now.</Banner> : (
              <ul className="list">{a.data.hotspots.map((h, i) => (
                <li key={i}><span className="li-main"><strong>{h.count} unresolved reports</strong><span className="muted small">{h.center.lat.toFixed(4)}, {h.center.lng.toFixed(4)}</span></span><Sev level={h.maxSeverity} /><Link className="btn sm" to={`/map?focus=${h.center.lat},${h.center.lng}`}>View on map</Link></li>
              ))}</ul>
            )}
          </section>
        </>
      ))}
    </>
  );
}
