// The Knight's plain sheets are his awakened sheets in plainer gear (docs/notes/knight-sprite.md): the same frames, the same
// grid, the same size on the board, so awakening reads as the same man upgraded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import layout from '../src/art/units/sheets.json';
import art from '../src/art/awakened/manifest.json';
import { UNITS } from '../src/sim/units';

type Layout = { w: number; h: number; perRow: number; rows: string[]; counts: Record<string, number>; figure: number; facesRight?: boolean; lies?: boolean };
const BASE = layout as Record<string, Layout>;
const AWAKENED = art.layouts as Record<string, Layout>;
/** A PNG's width and height, from its header. */
const size = (file: string): [number, number] => {
  const b = readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

test('the Knight is drawn from the soldier sheets, and awakens into the awakened Knight', () => {
  assert.equal(UNITS.knight.sheet, 'hero_soldier');
  assert.equal(art.forms.hero_soldier, 'awakened_knight');
});

test('the plain sheets use the awakened grid: the same cells, frames and figure height, front and back', () => {
  for (const [base, awake] of [['hero_soldier', 'awakened_knight'], ['hero_soldier_back', 'awakened_knight_back']]) {
    const b = BASE[base];
    const a = AWAKENED[awake];
    assert.deepEqual([b.w, b.h, b.perRow], [a.w, a.h, a.perRow], `${base}: the cell`);
    // (the last row is the shield's defence on the front sheet and the ability on the back; the awakened sheet calls it
    //  attack2 and aliases defend to it)
    assert.deepEqual(b.rows.slice(0, -1), a.rows.slice(0, -1), `${base}: the rows`);
    for (const r of b.rows.slice(0, -1)) assert.equal(b.counts[r] ?? 0, a.counts[r] ?? 0, `${base}: ${r} frames`);
    assert.equal(b.counts[b.rows[b.rows.length - 1]], a.counts.attack2, `${base}: the last row's frames`);
    assert.equal(b.figure, a.figure, `${base}: he stands the same height`);
    assert.equal(b.facesRight !== false, a.facesRight !== false, `${base}: facing`);
    assert.equal(!!b.lies, !!a.lies, `${base}: lies down when defeated`);
    const file = size(`src/art/awakened/${awake}.png`);
    assert.deepEqual(size(`src/art/units/${base}.png`), file, `${base}: frame for frame`);
    // (the awakened sheets carry his tone already, so the bundled re-toned copy is the source itself)
    assert.ok(readFileSync(`src/art/units/${base}_deep.png`).equals(readFileSync(`src/art/units/${base}.png`)), `${base}_deep is the plain sheet`);
  }
});
