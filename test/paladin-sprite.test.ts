// The Paladin's plain sheets are his awakened sheets in plainer gear (docs/notes/fixes3.md, as the Knight's are): the same
// man before and after awakening, on the same grid and at the same size on the board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import layout from '../src/art/units/sheets.json';
import art from '../src/art/awakened/manifest.json';
import heritage from '../tools/heritage/sheets.json';
import { UNITS } from '../src/sim/units';

type Layout = { w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number>; figure: number; facesRight?: boolean; lies?: boolean };
const BASE = layout as Record<string, Layout>;
const AWAKENED = art.layouts as Record<string, Layout>;
const size = (file: string): [number, number] => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('the Paladin awakens from his plain sheet into the awakened Paladin', () => {
  assert.equal(UNITS.paladin.sheet, 'hero_res_paladin');
  assert.equal((art.forms as Record<string, string>).hero_res_paladin, 'awakened_paladin');
});

test('the Paladin\'s plain sheets use the awakened grid, front and back, and the bundled olive copies are the plain sheets', () => {
  for (const [base, awake] of [['hero_res_paladin', 'awakened_paladin'], ['hero_res_paladin_back', 'awakened_paladin_back']]) {
    const b = BASE[base];
    const a = AWAKENED[awake];
    assert.deepEqual([b.w, b.h, b.perRow], [a.w, a.h, a.perRow], `${base}: the cell`);
    assert.deepEqual(b.rows, a.rows, `${base}: the rows`);
    for (const r of b.rows) assert.equal(b.counts[r] ?? 0, a.counts[r] ?? 0, `${base}: ${r} frames`);
    assert.equal(b.figure, a.figure, `${base}: he stands the same height`);
    assert.deepEqual(size(`src/art/units/${base}.png`), size(`src/art/awakened/${awake}.png`), `${base}: frame for frame`);
    // (the awakened sheets carry his olive tone already: the re-toned copy the game bundles is the plain sheet itself)
    const toned = (heritage as Record<string, string>)[base];
    assert.equal(toned, `${base}_olive`);
    assert.ok(readFileSync(`src/art/units/${toned}.png`).equals(readFileSync(`src/art/units/${base}.png`)), `${toned} is the plain sheet`);
  }
});
