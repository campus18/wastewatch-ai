export interface LatLng { lat: number; lng: number }

const R = 6371008.8; // mean Earth radius, metres
const rad = (d: number) => (d * Math.PI) / 180;

export function isValidLatLng(p: Partial<LatLng>): p is LatLng {
  return typeof p.lat === 'number' && typeof p.lng === 'number' &&
    Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
    p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function pathLengthMeters(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineMeters(points[i - 1], points[i]);
  return total;
}

/** Greedy nearest-neighbour ordering. A heuristic, NOT an optimal tour. */
export function nearestNeighborOrder(start: LatLng | null, stops: (LatLng & { id: string })[]): string[] {
  const remaining = [...stops];
  const order: string[] = [];
  let current: LatLng | null = start;
  if (!current && remaining.length) {
    const first = remaining.shift()!;
    order.push(first.id);
    current = first;
  }
  while (remaining.length && current) {
    let best = 0;
    let bestD = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineMeters(current as LatLng, s);
      if (d < bestD) { bestD = d; best = i; }
    });
    const [next] = remaining.splice(best, 1);
    order.push(next.id);
    current = next;
  }
  return order;
}

/** Greedy radius clustering; cluster centre is the mean of its members. */
export function clusterPoints<T extends LatLng>(items: T[], radiusMeters: number): { center: LatLng; items: T[] }[] {
  const clusters: { center: LatLng; items: T[] }[] = [];
  for (const it of items) {
    const hit = clusters.find((c) => haversineMeters(c.center, it) <= radiusMeters);
    if (hit) {
      hit.items.push(it);
      hit.center = {
        lat: hit.items.reduce((s, x) => s + x.lat, 0) / hit.items.length,
        lng: hit.items.reduce((s, x) => s + x.lng, 0) / hit.items.length,
      };
    } else {
      clusters.push({ center: { lat: it.lat, lng: it.lng }, items: [it] });
    }
  }
  return clusters;
}
