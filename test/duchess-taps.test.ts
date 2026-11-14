// DUCHESS-TAPS (docs/notes/release-fixes-2.md, `src/sim/duchessTaps.ts`): a tap on Duchess, and her haystack treat, count on the game's own
// meta, so the game's next save keeps them rather than writing its old count back over a copy written behind it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { countDuchessTap, treatFoundToday } from '../src/sim/duchessTaps';
import { loadMeta, newMeta, saveMeta } from '../src/sim/meta';
import { ACHIEVEMENTS } from '../src/sim/achievements';

function store() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

test('a tap survives the next save, and five of them earn her achievement on the game meta', () => {
  const s = store();
  const m = newMeta(7);
  saveMeta(m, s);
  countDuchessTap(m);
  saveMeta(m, s);
  // (the game's next save: a fight's end, a build finishing; it writes the game's meta, which holds the tap)
  m.crowns += 10;
  saveMeta(m, s);
  assert.equal(loadMeta(7, s).duchessTaps, 1);
  for (let i = 0; i < 4; i++) countDuchessTap(m);
  assert.equal(m.duchessTaps, 5);
  const crown = ACHIEVEMENTS.find((a) => a.id === 'duchessCrown')!;
  assert.deepEqual(crown.meter!(m), { now: 5, need: 5 }, 'her achievement reads the game meta and sees all five');
});

test('what the old way lost: a count written behind the game meta is written over by its next save', () => {
  const s = store();
  const m = newMeta(7);
  saveMeta(m, s);
  // (the old tap: the save read from storage, one added, written back; the game's meta never told)
  const copy = JSON.parse(s.getItem('legends.meta')!);
  copy.duchessTaps = (copy.duchessTaps ?? 0) + 1;
  s.setItem('legends.meta', JSON.stringify(copy));
  saveMeta(m, s);
  assert.equal(loadMeta(7, s).duchessTaps ?? 0, 0, 'the tap was lost');
});

test("today's treat is told by the game meta", () => {
  const m = newMeta(7);
  assert.equal(treatFoundToday(m, 20261114), false);
  m.duchessTreat = 20261114;
  assert.equal(treatFoundToday(m, 20261114), true);
  assert.equal(treatFoundToday(m, 20261115), false);
});

test('nothing in the page writes the save behind the game meta, and each place she is tapped counts on it', () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith('.ts') ? [join(dir, f)] : []));
  for (const f of files('src')) assert.doesNotMatch(readFileSync(f, 'utf8'), /localStorage\.setItem\(\s*'legends\.meta'/, `${f} writes the save behind the game meta`);
  for (const f of ['src/duchess.ts', 'src/camp.ts', 'src/castle.ts', 'src/tavern.ts']) assert.match(readFileSync(f, 'utf8'), /countDuchessTap\(tapped\);\s*saveMeta\(tapped\)/, f);
});
