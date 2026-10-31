import { config } from '../config';

export const imageryCapability = () => ({
  configured: !!config.imagery.mapboxToken,
  provider: config.imagery.mapboxToken ? 'Mapbox Satellite' : null,
  attribution: config.imagery.mapboxToken ? '© Mapbox © OpenStreetMap, Maxar' : null,
});

export async function fetchSatellite(lat: number, lng: number, zoom: number) {
  const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/${lng},${lat},${zoom},0/640x420?access_token=${encodeURIComponent(config.imagery.mapboxToken)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Imagery provider returned HTTP ${res.status}`);
  return { contentType: res.headers.get('content-type') || 'image/jpeg', data: Buffer.from(await res.arrayBuffer()) };
}
