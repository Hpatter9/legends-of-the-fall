import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// FIGHT-FIXES: "Trophy wall comes up and locks castle screen." The overlay is laid out with `display: flex`, which wins over the `hidden`
// attribute unless the sheet says otherwise; so it must have its own `[hidden]` rule, or it stands over the castle and the tavern for good.
test('the trophy wall overlay is really hidden while closed', () => {
  const css = readFileSync('src/trophyWall.css', 'utf8');
  assert.match(css, /\.twOverlay\[hidden\]\s*\{\s*display:\s*none;?\s*\}/);
  // (it starts closed, and only its own open shows it)
  const ts = readFileSync('src/trophyWall.ts', 'utf8');
  assert.match(ts, /constructor\(\)\s*\{\s*this\.root\.hidden = true;/);
});
