import { CATEGORIES, label, SEVERITIES, STATUSES } from '../ui';

export interface Filt { status: string; category: string; severity: string }
export const emptyFilt: Filt = { status: '', category: '', severity: '' };
export const filtQuery = (f: Filt) => { const q = new URLSearchParams(); (Object.keys(f) as (keyof Filt)[]).forEach((k) => f[k] && q.set(k, f[k])); const s = q.toString(); return s ? `?${s}` : ''; };

export function Filters({ value, onChange }: { value: Filt; onChange: (f: Filt) => void }) {
  const sel = (k: keyof Filt, name: string, opts: string[]) => (
    <label className="filter"><span>{name}</span>
      <select value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value })}>
        <option value="">All</option>{opts.map((o) => <option key={o} value={o}>{label(o)}</option>)}
      </select>
    </label>
  );
  return (
    <div className="filters">
      {sel('status', 'Status', STATUSES)}{sel('category', 'Category', CATEGORIES)}{sel('severity', 'Severity', SEVERITIES)}
      {(value.status || value.category || value.severity) && <button className="btn sm" onClick={() => onChange(emptyFilt)}>Clear filters</button>}
    </div>
  );
}
