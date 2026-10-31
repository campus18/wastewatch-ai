import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { cluster } from '../geo';
import type { Report } from '../types';
import { Banner, ErrorBanner, label, MapView, SampleTag, SEV_COLOR, SEVERITIES, Spinner, useAsync } from '../ui';
import type { MapMarker } from '../ui';
import { Filt, Filters, emptyFilt, filtQuery } from './Filters';
import { ReportDetail } from './ReportDetail';

export default function MapPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [filt, setFilt] = useState<Filt>(emptyFilt);
  const [showHot, setShowHot] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('open'));
  const data = useAsync(() => api<Report[]>(`/reports/map${filtQuery(filt)}`), [filt.status, filt.category, filt.severity]);
  const staff = user?.role === 'admin' || user?.role === 'supervisor';
  const f = params.get('focus')?.split(',').map(Number);
  const focus = f && f.length === 2 && f.every(Number.isFinite) ? { lat: f[0], lng: f[1] } : null;

  const markers = useMemo<MapMarker[]>(() => (data.data ?? []).map((r) => ({
    id: r.id, ...r.location, severity: r.severity, muted: r.status === 'resolved', tip: `${label(r.category)} · ${label(r.severity)} · ${label(r.status)}`,
  })), [data.data]);
  const hotspots = useMemo(() => {
    const open = (data.data ?? []).filter((r) => r.status !== 'resolved').map((r) => ({ ...r.location, id: r.id }));
    return cluster(open, 200).filter((c) => c.items.length >= 2).map((c) => ({ ...c.center, radius: 250, tip: `Hotspot: ${c.items.length} unresolved reports within ~200 m` }));
  }, [data.data]);
  const selected = data.data?.find((r) => r.id === selectedId) ?? null;

  return (
    <>
      <h2 className="page-title">Hotspot map</h2>
      <Filters value={filt} onChange={setFilt} />
      <div className="row wrap legend">
        {SEVERITIES.map((s) => <span key={s}><i className="dot" style={{ background: SEV_COLOR[s] }} /> {label(s)}</span>)}
        <span><i className="dot hollow" /> Resolved</span>
        <label className="check"><input type="checkbox" checked={showHot} onChange={(e) => setShowHot(e.target.checked)} /> Outline hotspots</label>
      </div>
      {data.error && <ErrorBanner message={data.error} onRetry={data.reload} />}
      {data.loading && <Spinner />}
      {data.data && !data.data.length && <Banner kind="info">No reports match these filters. The map will fill in as reports are submitted.</Banner>}
      <div className={`split ${selected ? 'has-panel' : ''}`}>
        <MapView className="mapbox full" markers={markers} selectedId={selectedId} onSelect={setSelectedId} circles={showHot ? hotspots : []} focus={focus} fitKey={JSON.stringify(filt)} />
        {selected && <ReportDetail key={selected.id} summary={selected} full={staff} onChanged={data.reload} onClose={() => setSelectedId(null)} />}
      </div>
      {data.data?.some((r) => r.isSample) && <p className="muted small">Includes <SampleTag /> demo reports.</p>}
    </>
  );
}
