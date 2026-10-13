import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { Report } from '../types';
import { Empty, ErrorBanner, fmtDate, label, SampleTag, Sev, Spinner, StatusBadge, useAsync } from '../ui';
import { Filt, Filters, filtQuery } from './Filters';
import { ReportDetail } from './ReportDetail';

export default function ReportsPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [filt, setFilt] = useState<Filt>({ status: params.get('status') ?? '', category: '', severity: '' });
  const list = useAsync(() => api<Report[]>(`/reports${filtQuery(filt)}`), [filt.status, filt.category, filt.severity]);
  const openId = params.get('open');
  const selected = list.data?.find((r) => r.id === openId) ?? null;
  const staff = user?.role === 'admin' || user?.role === 'supervisor';
  const setOpen = (id: string | null) => { const p = new URLSearchParams(params); if (id) p.set('open', id); else p.delete('open'); setParams(p, { replace: true }); };
  return (
    <>
      <h2 className="page-title">{staff ? 'All reports' : 'My reports'}</h2>
      <Filters value={filt} onChange={setFilt} />
      <div className={`split ${selected ? 'has-panel' : ''}`}>
        <div>
          {list.loading && <Spinner />}
          {list.error && <ErrorBanner message={list.error} onRetry={list.reload} />}
          {list.data && !list.data.length && <Empty title="No reports match" hint={filt.status || filt.category || filt.severity ? 'Try clearing the filters.' : 'Nothing has been reported yet.'}><Link className="btn primary" to="/report/new">Report waste</Link></Empty>}
          <ul className="list card">{list.data?.map((r) => (
            <li key={r.id} className={r.id === openId ? 'sel' : ''}>
              <button className="li-main" onClick={() => setOpen(r.id)}>
                <strong>{label(r.category)}</strong> {r.isSample && <SampleTag />} <StatusBadge status={r.status} />
                <span className="muted small">{fmtDate(r.createdAt)}{staff && r.reporter?.name ? ` · ${r.reporter.name}` : ''}</span>
              </button>
              <Sev level={r.severity} />
            </li>
          ))}</ul>
        </div>
        {selected && <ReportDetail key={selected.id} summary={selected} full onChanged={list.reload} onClose={() => setOpen(null)} />}
      </div>
    </>
  );
}
