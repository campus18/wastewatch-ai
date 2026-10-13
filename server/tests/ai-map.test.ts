import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretLabels } from '../src/lib/ai-map';

test('waste labels yield a suggestion and the best matching score', () => {
  const r = interpretLabels([{ description: 'Plastic bottle', score: 0.91 }, { description: 'Litter', score: 0.8 }, { description: 'Sky', score: 0.99 }]);
  assert.equal(r.wasteRelated, true);
  assert.equal(r.wasteScore, 0.91);
  assert.equal(r.suggestedCategory, 'plastic');
  assert.deepEqual(r.matched, ['Plastic bottle', 'Litter']);
});
test('non-waste labels produce no score or category (nothing is invented)', () => {
  const r = interpretLabels([{ description: 'Sky', score: 0.99 }, { description: 'Tree', score: 0.9 }]);
  assert.deepEqual(r, { wasteRelated: false, wasteScore: null, matched: [], suggestedCategory: null });
});
test('empty labels are handled', () => assert.equal(interpretLabels([]).wasteRelated, false));
test('generic waste with no specific material falls back to mixed', () => {
  assert.equal(interpretLabels([{ description: 'Garbage', score: 0.7 }]).suggestedCategory, 'mixed');
});
