import { useEffect, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { Report, Severity } from '../types';
import { AiPanel, Banner, CATEGORIES, ErrorBanner, errMsg, Field, fieldErrors, label, MapView, SEVERITIES, useCapabilities } from '../ui';

const MAX_MB = 8;

export default function ReportNew() {
  const caps = useCapabilities();
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState('mixed');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [description, setDescription] = useState('');
  const [pick, setPick] = useState<{ lat: number; lng: number } | null>(null);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [clientErr, setClientErr] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Report | null>(null);
  const fe = { ...clientErr, ...fieldErrors(error) };

  useEffect(() => { if (!photo) { setPreview(null); return; } const u = URL.createObjectURL(photo); setPreview(u); return () => URL.revokeObjectURL(u); }, [photo]);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && !/^image\/(jpeg|png|webp)$/.test(f.type)) { setClientErr((c) => ({ ...c, photo: 'Use a JPEG, PNG or WebP image' })); setPhoto(null); return; }
    if (f && f.size > MAX_MB * 1024 * 1024) { setClientErr((c) => ({ ...c, photo: `Image must be under ${MAX_MB} MB` })); setPhoto(null); return; }
    setClientErr((c) => { const { photo: _p, ...rest } = c; return rest; }); setPhoto(f);
  };
  const locate = () => {
    setGeoMsg(null);
    if (!navigator.geolocation) return setGeoMsg('This browser does not support location. Tap the map instead.');
    navigator.geolocation.getCurrentPosition(
      (p) => { const pt = { lat: p.coords.latitude, lng: p.coords.longitude }; setPick(pt); setFocus(pt); },
      (e) => setGeoMsg(e.code === 1 ? 'Location permission was denied. Tap the map to place the pin.' : 'Could not get your location. Tap the map to place the pin.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ce: Record<string, string> = {};
    if (!photo) ce.photo = 'Add a photo of the waste';
    if (!pick) ce.location = 'Tap the map to place a pin';
    setClientErr(ce); setError(null);
    if (Object.keys(ce).length) return;
    const form = new FormData();
    form.set('photo', photo!); form.set('lat', String(pick!.lat)); form.set('lng', String(pick!.lng));
    form.set('category', category); form.set('severity', severity); form.set('description', description);
    setBusy(true);
    try { setDone(await api<Report>('/reports', { method: 'POST', form })); } catch (err) { setError(err); } finally { setBusy(false); }
  };

  if (done) {
    return (
      <section className="card narrow">
        <h2>Report submitted</h2>
        <p>Thanks. Supervisors have been notified and will assign a collector.</p>
        <h4>AI detection result</h4>
        <AiPanel ai={done.ai} />
        <div className="row wrap">
          <Link className="btn primary" to={`/reports?open=${done.id}`}>View report</Link>
          <button className="btn" onClick={() => { setDone(null); setPhoto(null); setPick(null); setDescription(''); }}>Report another</button>
        </div>
      </section>
    );
  }

  return (
    <>
      <h2 className="page-title">Report waste</h2>
      {caps && !caps.ai.configured && (caps.ai.demoMode
        ? <Banner kind="warn"><strong>AI demo mode.</strong> Photos are not analysed; no AI prediction will be made.</Banner>
        : <Banner kind="info">AI detection isn’t configured on this server. Your report will still be saved and reviewed by a supervisor.</Banner>)}
      <form className="form two" onSubmit={submit} noValidate>
        <div>
          <Field label="Photo of the waste" error={fe.photo}>
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onFile} />
          </Field>
          {preview && <img className="photo" src={preview} alt="Selected waste preview" />}
          <Field label="Category" error={fe.category}><select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select></Field>
          <Field label="Severity" error={fe.severity}>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>{SEVERITIES.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          </Field>
          <Field label="Description (optional)" error={fe.description}><textarea rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is it, how much, any hazards?" /></Field>
        </div>
        <div>
          <div className="field"><span>Location</span>
            <div className="row wrap"><button type="button" className="btn sm" onClick={locate}>Use my location</button><span className="muted small">{pick ? `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}` : 'or tap the map'}</span></div>
            {geoMsg && <em className="ferr">{geoMsg}</em>}
            {fe.location && <em className="ferr">{fe.location}</em>}
          </div>
          <MapView className="mapbox tall" pick={pick} onPick={setPick} focus={focus} />
          {error != null && !Object.keys(fieldErrors(error)).length && <ErrorBanner message={errMsg(error)} />}
          <button className="btn primary block" disabled={busy}>{busy ? 'Submitting and analysing photo…' : 'Submit report'}</button>
        </div>
      </form>
    </>
  );
}
