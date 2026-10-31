import { config } from '../config';
import { nearestNeighborOrder, pathLengthMeters } from '../lib/geo';
import type { LatLng } from '../lib/geo';

export interface Stop extends LatLng { id: string }
export interface RoutePlan {
  provider: 'osrm' | 'simulated';
  simulated: boolean;
  note: string;
  order: string[];
  geometry: [number, number][]; // [lat, lng]
  distanceMeters: number | null;
  durationSeconds: number | null;
}

export const routingCapability = () => ({
  configured: !!config.routing.osrmBaseUrl,
  provider: config.routing.osrmBaseUrl ? 'OSRM' : null,
});

function simulated(start: LatLng | null, stops: Stop[], why: string): RoutePlan {
  const order = nearestNeighborOrder(start, stops);
  const byId = new Map(stops.map((s) => [s.id, s]));
  const pts: LatLng[] = [...(start ? [start] : []), ...order.map((id) => byId.get(id)!)];
  return {
    provider: 'simulated', simulated: true,
    note: `SIMULATED route: nearest-neighbour order with straight lines. Not a road route; distance is a straight-line estimate. ${why}`,
    order, geometry: pts.map((p) => [p.lat, p.lng]),
    distanceMeters: Math.round(pathLengthMeters(pts)), durationSeconds: null,
  };
}

export async function planRoute(start: LatLng | null, stops: Stop[]): Promise<RoutePlan> {
  if (!config.routing.osrmBaseUrl) return simulated(start, stops, 'Routing service not configured.');
  if (stops.length === 1 && !start) return simulated(start, stops, 'Only one stop.');
  const pts: (LatLng & { id?: string })[] = [...(start ? [start] : []), ...stops];
  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${config.routing.osrmBaseUrl}/trip/v1/driving/${coords}?roundtrip=false&source=${start ? 'first' : 'any'}&destination=any&geometries=geojson&overview=full`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok || body.code !== 'Ok' || !body.trips?.[0]) throw new Error(body?.message || body?.code || `HTTP ${res.status}`);
    // waypoints[i].waypoint_index = position of input coordinate i within the optimised trip
    const ranked = pts.map((p, i) => ({ p, pos: body.waypoints[i].waypoint_index as number })).sort((a, b) => a.pos - b.pos);
    const order = ranked.map((r) => r.p).filter((p): p is Stop => 'id' in p && !!p.id).map((p) => p.id);
    const trip = body.trips[0];
    return {
      provider: 'osrm', simulated: false,
      note: 'Route computed by the configured OSRM routing service (driving profile).',
      order,
      geometry: (trip.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
      distanceMeters: Math.round(trip.distance), durationSeconds: Math.round(trip.duration),
    };
  } catch (e: any) {
    return simulated(start, stops, `Routing service failed (${e?.message ?? 'error'}), so a simulated route is shown instead.`);
  }
}

