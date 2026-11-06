import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chipNumber } from '../src/topbarRules';

test('a top-bar count is shown whole below 100,000 and short above it (TOPBAR-FIT)', () => {
  assert.equal(chipNumber(0), '0');
  assert.equal(chipNumber(5246), '5246');
  assert.equal(chipNumber(99_999), '99999');
  assert.equal(chipNumber(100_000), '100k');
  assert.equal(chipNumber(999_999), '999k');
  assert.equal(chipNumber(1_234_567), '1.2M');
  assert.equal(chipNumber(12_345_678), '12M');
  // (never wider than five characters, so the row's room is known)
  for (const n of [0, 9, 99_999, 100_000, 543_210, 999_999, 1_000_000, 9_999_999, 99_999_999]) assert.ok(chipNumber(n).length <= 5, `${n}`);
});

test('the camp top row keeps the trophy and the gear as 44 px rounds side by side (TOPBAR-FIT)', () => {
  const html = readFileSync('src/index.html', 'utf8');
  assert.match(html, /#hmTop #hmTrophy, #hmTop #hmGear \{ width: 44px; height: 44px; flex: none; \}/);
  assert.match(html, /#hmTop > \.chip \{ min-width: 0;/);
});
