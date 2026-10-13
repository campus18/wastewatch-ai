import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { api, ApiError } from './api';
import type { AiResult, Capabilities, Severity } from './types';

// ---------- data hooks ----------
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => alive && setState({ data: null, error: e instanceof Error ? e.message : 'Something went wrong', loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: useCallback(() => setTick((t) => t + 1), []) };
}

let capsPromise: Promise<Capabilities> | null = null;
export function useCapabilities() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  useEffect(() => { capsPromise ??= api<Capabilities>('/capabilities'); capsPromise.then(setCaps).catch(() => { capsPromise = null; }); }, []);
  return caps;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');
export const fieldErrors = (e: unknown): Record<string, string> => (e instanceof ApiError && e.details ? e.details : {});

// ---------- formatting & vocab ----------
export const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
export const fmtDay = (d?: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—');
export const fmtDistance = (m: number | null) => (m == null ? '—' : m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
export const fmtDuration = (s: number | null) => (s == null ? '—' : s >= 3600 ? `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min` : `${Math.max(1, Math.round(s / 60))} min`);
export const label = (s?: string | null) => (s ? String(s).replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase()) : '');
export const CATEGORIES = ['plastic', 'organic', 'construction', 'hazardous', 'electronic', 'mixed', 'other'];
export const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
export const STATUSES = ['reported', 'assigned', 'in_progress', 'pending_verification', 'resolved'];
export const SEV_COLOR: Record<Severity, string> = { low: '#2f9e44', medium: '#d99a00', high: '#e8590c', critical: '#b0172b' };
const RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

// ---------- small components ----------
export function Spinner({ text = 'Loading…' }: { text?: string }) {
  return <div className="state" role="status"><span className="spin" aria-hidden />{text}</div>;
}
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="banner err" role="alert"><span>{message}</span>{onRetry && <button className="btn sm" onClick={onRetry}>Retry</button>}</div>;
}
export function Empty({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return <div className="state empty"><strong>{title}</strong>{hint && <span>{hint}</span>}{children}</div>;
}
export function Banner({ kind, children }: { kind: 'info' | 'warn' | 'err' | 'ok'; children: ReactNode }) {
  return <div className={`banner ${kind}`} role={kind === 'err' ? 'alert' : 'note'}>{children}</div>;
}
export function Sev({ level }: { level: Severity }) {
  return (
    <span className="sev" title={`Severity: ${level}`}>
      <span className="sevbars" aria-hidden>{[1, 2, 3, 4].map((i) => <i key={i} style={{ background: i <= RANK[level] ? SEV_COLOR[level] : undefined }} />)}</span>
      {label(level)}
    </span>
  );
}
export const StatusBadge = ({ status }: { status: string }) => <span className={`badge st-${status}`}>{label(status)}</span>;
export const SampleTag = () => <span className="badge sample" title="Seeded demo data, not a real observation">Sample</span>;
export const Field = ({ label: l, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="field"><span>{l}</span>{children}{error && <em className="ferr">{error}</em>}</label>
);

export function AiPanel({ ai }: { ai?: AiResult | null }) {
  if (!ai) return <Banner kind="info">No AI analysis is attached to this report (sample data or submitted before AI was set up).</Banner>;
  if (ai.status === 'demo') return <Banner kind="warn"><strong>Demo result.</strong> {ai.message}</Banner>;
  if (ai.status === 'unconfigured') return <Banner kind="info"><strong>AI detection unavailable.</strong> {ai.message}</Banner>;
  if (ai.status === 'error') return <Banner kind="err"><strong>AI analysis failed.</strong> {ai.message} The report was still saved.</Banner>;
  return (
    <div className="ai">
      <Banner kind={ai.wasteRelated ? 'ok' : 'info'}>{ai.message} <em>Provider: {ai.provider}.</em></Banner>
      {ai.suggestedCategory && <p className="muted">Suggested category (from labels): <strong>{label(ai.suggestedCategory)}</strong></p>}
      {ai.labels.length > 0 && <ul className="chips">{ai.labels.slice(0, 10).map((l) => <li key={l.description}>{l.description} <b>{Math.round(l.score * 100)}%</b></li>)}</ul>}
    </div>
  );
}

// ---------- Leaflet map ----------
export interface MapMarker { id: string; lat: number; lng: number; severity: Severity; muted?: boolean; tip?: string }
interface MapProps {
  markers?: MapMarker[]; selectedId?: string | null; onSelect?: (id: string) => void;
  pick?: { lat: number; lng: number } | null; onPick?: (p: { lat: number; lng: number }) => void;
  route?: [number, number][] | null; routeDashed?: boolean; routeStops?: { lat: number; lng: number; n: number }[]; routeStart?: { lat: number; lng: number } | null;
  circles?: { lat: number; lng: number; radius: number; tip: string }[];
  focus?: { lat: number; lng: number } | null; fitKey?: string | number; className?: string;
}
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629];

export function MapView({ markers = [], selectedId, onSelect, pick, onPick, route, routeDashed, routeStops = [], routeStart, circles = [], focus, fitKey, className = 'mapbox' }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<{ markers: L.LayerGroup; route: L.LayerGroup; circles: L.LayerGroup; pick: L.LayerGroup } | null>(null);
  const cb = useRef({ onSelect, onPick });
  cb.current = { onSelect, onPick };
  const fitted = useRef<string | number | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { center: DEFAULT_CENTER, zoom: 5 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(m);
    layers.current = { circles: L.layerGroup().addTo(m), route: L.layerGroup().addTo(m), markers: L.layerGroup().addTo(m), pick: L.layerGroup().addTo(m) };
    m.on('click', (e: L.LeafletMouseEvent) => cb.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; layers.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layers.current;
    if (!m || !g) return;
    g.markers.clearLayers();
    markers.forEach((mk) => {
      const sel = mk.id === selectedId;
      L.circleMarker([mk.lat, mk.lng], {
        radius: sel ? 12 : 8, color: sel ? '#10231c' : '#fff', weight: sel ? 3 : 2,
        fillColor: SEV_COLOR[mk.severity], fillOpacity: mk.muted ? 0.3 : 0.92, dashArray: mk.muted ? '3' : undefined, bubblingMouseEvents: false,
      }).on('click', () => cb.current.onSelect?.(mk.id)).bindTooltip(mk.tip ?? '').addTo(g.markers);
    });
    const key = fitKey ?? 'once';
    if (markers.length && fitted.current !== key && !focus) {
      m.fitBounds(L.latLngBounds(markers.map((x) => [x.lat, x.lng] as [number, number])).pad(0.25), { maxZoom: 16 });
      fitted.current = key;
    }
  }, [markers, selectedId, fitKey, focus]);

  useEffect(() => {
    const m = map.current, g = layers.current;
    if (!m || !g) return;
    g.circles.clearLayers();
    circles.forEach((c) => L.circle([c.lat, c.lng], { radius: c.radius, color: '#b0172b', weight: 1, fillOpacity: 0.1, dashArray: '4' }).bindTooltip(c.tip).addTo(g.circles));
  }, [circles]);

  useEffect(() => {
    const g = layers.current;
    if (!g) return;
    g.pick.clearLayers();
    if (pick) L.circleMarker([pick.lat, pick.lng], { radius: 10, color: '#0e5a49', weight: 4, fillColor: '#fff', fillOpacity: 1 }).addTo(g.pick);
  }, [pick]);

  useEffect(() => {
    const m = map.current, g = layers.current;
    if (!m || !g) return;
    g.route.clearLayers();
    if (!route || route.length < 2) return;
    const line = L.polyline(route, { color: '#0e5a49', weight: 4, opacity: 0.85, dashArray: routeDashed ? '8 8' : undefined }).addTo(g.route);
    routeStops.forEach((s) => L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: `<div class="stopnum">${s.n}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(g.route));
    if (routeStart) L.circleMarker([routeStart.lat, routeStart.lng], { radius: 7, color: '#10231c', fillColor: '#fff', fillOpacity: 1, weight: 3 }).bindTooltip('Start').addTo(g.route);
    m.fitBounds(line.getBounds().pad(0.2), { maxZoom: 17 });
  }, [route, routeDashed, routeStops, routeStart]);

  useEffect(() => { if (focus && map.current) map.current.setView([focus.lat, focus.lng], 16); }, [focus]);
  useEffect(() => {
    const sel = markers.find((x) => x.id === selectedId);
    if (sel && map.current) map.current.panTo([sel.lat, sel.lng]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return <div ref={el} className={className} role="application" aria-label="Interactive map" />;
}
