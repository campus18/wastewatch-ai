import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isObjectId, validateFilters, validateLogin, validateRegister, validateReport, validateRoutePlan, validateTaskCreate, validateTaskUpdate, validateVerification } from '../src/lib/validators';

const oid = 'a'.repeat(24);
const now = new Date('2026-01-01T00:00:00Z');
const future = '2026-01-02T00:00:00Z';

test('register: accepts valid input and normalises email', () => {
  const r = validateRegister({ name: ' Asha ', email: 'ASHA@Example.com ', password: 'longenough1' });
  assert.ok(r.ok && r.value.email === 'asha@example.com' && r.value.name === 'Asha');
});
test('register: reports each bad field', () => {
  const r = validateRegister({ name: 'A', email: 'nope', password: 'short' });
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys((r as any).errors).sort(), ['email', 'name', 'password']);
});
test('login: requires both fields', () => {
  assert.ok(!validateLogin({}).ok);
  assert.ok(validateLogin({ email: 'a@b.co', password: 'x' }).ok);
});
test('report: coerces multipart string coordinates', () => {
  const r = validateReport({ lat: '12.5', lng: '77.5', category: 'plastic', severity: 'high', description: ' pile ' });
  assert.ok(r.ok && r.value.lat === 12.5 && r.value.description === 'pile');
});
test('report: rejects empty/out-of-range location, bad enums, long description', () => {
  assert.ok(!validateReport({ lat: '', lng: '10', category: 'plastic', severity: 'low' }).ok);
  assert.ok(!validateReport({ lat: 91, lng: 10, category: 'plastic', severity: 'low' }).ok);
  const r = validateReport({ lat: 1, lng: 1, category: 'gold', severity: 'extreme', description: 'x'.repeat(1001) });
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys((r as any).errors).sort(), ['category', 'description', 'severity']);
});
test('task create: deadline must be in the future; ids must be ObjectIds', () => {
  assert.ok(validateTaskCreate({ reportId: oid, assigneeId: oid, deadline: future }, now).ok);
  assert.ok(!validateTaskCreate({ reportId: oid, assigneeId: oid, deadline: '2025-12-31T00:00:00Z' }, now).ok);
  assert.ok(!validateTaskCreate({ reportId: 'x', assigneeId: oid, deadline: future }, now).ok);
  assert.ok(!validateTaskCreate({ reportId: oid, assigneeId: oid, deadline: 'garbage' }, now).ok);
});
test('task update: needs at least one valid field', () => {
  assert.ok(!validateTaskUpdate({}, now).ok);
  assert.ok(validateTaskUpdate({ deadline: future }, now).ok);
  assert.ok(!validateTaskUpdate({ assigneeId: 'bad' }, now).ok);
});
test('verification: reject requires a comment, approve does not', () => {
  assert.ok(validateVerification({ decision: 'approve' }).ok);
  assert.ok(!validateVerification({ decision: 'reject' }).ok);
  assert.ok(validateVerification({ decision: 'reject', comment: 'Still litter on the left' }).ok);
  assert.ok(!validateVerification({ decision: 'maybe' }).ok);
});
test('route plan: bounds and duplicates', () => {
  assert.ok(validateRoutePlan({ taskIds: [oid] }).ok);
  assert.ok(!validateRoutePlan({ taskIds: [] }).ok);
  assert.ok(!validateRoutePlan({ taskIds: [oid, oid] }).ok);
  assert.ok(!validateRoutePlan({ taskIds: [oid], start: { lat: 200, lng: 0 } }).ok);
});
test('filters: valid values pass, invalid values are reported', () => {
  assert.ok(validateFilters({ status: 'resolved', severity: 'high' }).ok);
  assert.ok(!validateFilters({ status: 'bogus' }).ok);
  assert.ok(validateFilters({}).ok);
});
test('isObjectId', () => {
  assert.ok(isObjectId(oid));
  assert.ok(!isObjectId('123'));
  assert.ok(!isObjectId({ $ne: null }));
});
