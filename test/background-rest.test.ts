// RELEASE-FIXES-2 (docs/notes/release-fixes-2.md): work that rests when nothing is seen. Duchess's loop by the fight's panel sleeps until
// she wanders in (and stops for a fight she is not visiting), and the portraits' warm-up reads no pixels while the page is hidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { untilVisit, visitAt, VISIT_WALK_MS, type Visit } from '../src/render/duchessRules';

test('how long until Duchess is next on the page', () => {
  const v: Visit = { arrive: 5000, stay: 30000 };
  assert.equal(untilVisit(null, 0), null, 'no visit this fight: her loop stops');
  assert.equal(untilVisit(v, 0), 5000, 'before she wanders in: the wait');
  assert.equal(untilVisit(v, 4999), 1);
  assert.equal(untilVisit(v, 5000), 0, 'walking in: drawn every frame');
  assert.equal(untilVisit(v, 5000 + VISIT_WALK_MS + 1000), 0, 'here');
  const gone = 5000 + VISIT_WALK_MS + 30000 + VISIT_WALK_MS;
  assert.equal(untilVisit(v, gone - 1), 0, 'walking out');
  assert.equal(untilVisit(v, gone), null, 'gone for the fight');
  // (it agrees with where she is)
  for (let t = 0; t < gone + 2000; t += 250) assert.equal(untilVisit(v, t) === 0, visitAt(v, t).phase !== 'away', `t ${t}`);
});

test('her loop sleeps while she is away, and wakes for a new fight', () => {
  const src = readFileSync('src/duchess.ts', 'utf8');
  assert.match(src, /const wait = untilVisit\(this\.plan, performance\.now\(\) - this\.planAt\);/);
  assert.match(src, /this\.sleep = wait === null \? 0 : window\.setTimeout\(\(\) => this\.wake\(\), wait\);/);
  assert.match(src, /newFight\(\): void \{[\s\S]*?this\.wake\(\);\n  \}/);
});

test('the portraits warm-up waits while the page is hidden', () => {
  const src = readFileSync('src/render/sheets.ts', 'utf8');
  const warm = src.slice(src.indexOf('export function warmPortraits'));
  assert.match(warm, /if \(document\.hidden\) \{\s*document\.addEventListener\('visibilitychange', \(\) => later\(step\), \{ once: true \}\);\s*return;/);
});
