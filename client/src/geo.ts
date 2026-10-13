// Client-side mirror of the server's clustering, used only to outline hotspots among the reports currently on the map.
export interface LL { lat: number; lng: number }
export function haversineMeters(a: LL, b: LL): number {
  const r = (d: number) => (d * Math.PI) / 180, R = 6371008.8;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function cluster<T extends LL>(items: T[], radius: number) {
  const out: { center: LL; items: T[] }[] = [];
  for (const it of items) {
    const hit = out.find((c) => haversineMeters(c.center, it) <= radius);
    if (hit) { hit.items.push(it); hit.center = { lat: hit.items.reduce((s, x) => s + x.lat, 0) / hit.items.length, lng: hit.items.reduce((s, x) => s + x.lng, 0) / hit.items.length }; }
    else out.push({ center: { lat: it.lat, lng: it.lng }, items: [it] });
  }
  return out;
}
