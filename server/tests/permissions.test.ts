import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can } from '../src/lib/permissions';

test('citizens can report but nothing else', () => {
  assert.ok(can('citizen', 'report:create'));
  for (const a of ['task:assign', 'verification:decide', 'analytics:view', 'route:plan', 'report:viewAll', 'users:manage'] as const) assert.equal(can('citizen', a), false, a);
});
test('collectors work tasks and plan routes but cannot assign or verify', () => {
  assert.ok(can('collector', 'task:work') && can('collector', 'route:plan'));
  assert.equal(can('collector', 'task:assign'), false);
  assert.equal(can('collector', 'verification:decide'), false);
});
test('supervisors assign, verify and see analytics but cannot manage users', () => {
  assert.ok(can('supervisor', 'task:assign') && can('supervisor', 'verification:decide') && can('supervisor', 'analytics:view'));
  assert.equal(can('supervisor', 'users:manage'), false);
});
test('admins can manage users', () => assert.ok(can('admin', 'users:manage')));
test('unknown or missing roles are denied', () => {
  assert.equal(can(undefined, 'report:create'), false);
  assert.equal(can('root', 'users:manage'), false);
});
