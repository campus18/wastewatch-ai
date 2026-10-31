import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clusterPoints, haversineMeters, isValidLatLng, nearestNeighborOrder, pathLengthMeters } from '../src/lib/geo';

test('haversine: one degree of longitude at the equator ≈ 111.2 km', () => {
  const d = haversineMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
  assert.ok(Math.abs(d - 111195) < 300, `got ${d}`);
});
test('haversine: identical points are 0 m apart', () => {
  assert.equal(haversineMeters({ lat: 10, lng: 10 }, { lat: 10, lng: 10 }), 0);
});
test('pathLength sums segments', () => {
  const p = [{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 2 }];
  assert.ok(Math.abs(pathLengthMeters(p) - 2 * 111195) < 600);
  assert.equal(pathLengthMeters([]), 0);
});
test('isValidLatLng rejects out-of-range and non-finite values', () => {
  assert.equal(isValidLatLng({ lat: 91, lng: 0 }), false);
  assert.equal(isValidLatLng({ lat: 0, lng: -181 }), false);
  assert.equal(isValidLatLng({ lat: NaN, lng: 0 }), false);
  assert.equal(isValidLatLng({ lat: 12.3, lng: 45.6 }), true);
});
test('nearestNeighborOrder visits stops outward from the start', () => {
  const stops = [{ id: 'c', lat: 0, lng: 3 }, { id: 'a', lat: 0, lng: 1 }, { id: 'b', lat: 0, lng: 2 }];
  assert.deepEqual(nearestNeighborOrder({ lat: 0, lng: 0 }, stops), ['a', 'b', 'c']);
});
test('nearestNeighborOrder without a start begins at the first stop; empty input is empty', () => {
  const stops = [{ id: 'x', lat: 0, lng: 5 }, { id: 'y', lat: 0, lng: 6 }];
  assert.deepEqual(nearestNeighborOrder(null, stops), ['x', 'y']);
  assert.deepEqual(nearestNeighborOrder(null, []), []);
});
test('clusterPoints groups points within the radius only', () => {
  const pts = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.0004 }, { lat: 1, lng: 1 }]; // ~44 m apart, then far away
  const c = clusterPoints(pts, 100);
  assert.equal(c.length, 2);
  assert.equal(c[0].items.length, 2);
  assert.equal(c[1].items.length, 1);
});
