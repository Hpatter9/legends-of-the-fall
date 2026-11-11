// CAM-SAFE (docs/notes/cam-safe.md): the room the camera frames the fight in is the canvas less every part of the page over it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAM_COVERS, easeRect, SAFE, safeRect, type Rect } from '../src/render/safeRectRules';
import { camCovers, registerCamCover, onCamCover } from '../src/camSafe';
import { FIGHT_HUD, HORN_CORNER } from '../src/hudClear';

// (a 393 x 852 phone, upright; the boxes as the page draws them, near enough)
const VIEW: Rect = { x0: 0, y0: 0, x1: 393, y1: 852 };
const TOP: Rect = { x0: 0, y0: 0, x1: 393, y1: 88 };
const SPELLS_1: Rect = { x0: 8, y0: 94, x1: 385, y1: 142 };
const SPELLS_2: Rect = { x0: 8, y0: 94, x1: 385, y1: 196 };
const BOSS: Rect = { x0: 60, y0: 148, x1: 381, y1: 174 };
const COMBO: Rect = { x0: 6, y0: 148, x1: 150, y1: 172 };
const TACTIC: Rect = { x0: 328, y0: 528, x1: 386, y1: 596 };
const BENCH: Rect = { x0: 0, y0: 606, x1: 393, y1: 852 };
const ROWS: Rect = { x0: 0, y0: 600, x1: 393, y1: 852 };
const M = SAFE.MARGIN;

const clear = (r: Rect, c: Rect) => r.x1 <= c.x0 || c.x1 <= r.x0 || r.y1 <= c.y0 || c.y1 <= r.y0;
const inside = (r: Rect, v: Rect) => r.x0 >= v.x0 && r.y0 >= v.y0 && r.x1 <= v.x1 && r.y1 <= v.y1;
const check = (covers: Rect[]) => {
  const r = safeRect(VIEW, covers);
  for (const c of covers) assert.ok(clear(r, c), `the safe rect ${JSON.stringify(r)} lies clear of ${JSON.stringify(c)}`);
  assert.ok(inside(r, VIEW));
  return r;
};

test('deploy: the room between the top bar and the bench, with the margin', () => {
  const r = check([TOP, BENCH]);
  assert.deepEqual(r, { x0: M, y0: 88 + M, x1: 393 - M, y1: 606 - M });
});

test('a fight with spells: the spell row is kept clear of, one row or the two of a full row', () => {
  const one = check([TOP, SPELLS_1, ROWS]);
  assert.equal(one.y0, 142 + M);
  const two = check([TOP, SPELLS_2, ROWS]);
  assert.equal(two.y0, 196 + M);
  assert.ok(two.y0 > one.y0, 'two rows push the room further down');
  // (and with no spells equipped the row is not there: the room starts under the top bar)
  assert.equal(check([TOP, ROWS]).y0, 88 + M);
});

test('a boss wave: the boss bar under the spells is kept clear of too, and so are the combo bar and the tactic button', () => {
  const r = check([TOP, SPELLS_1, BOSS, COMBO, TACTIC, ROWS]);
  assert.equal(r.y0, 174 + M);
  // (the tactic button in the corner over the hero rows trims the room's foot, not a strip down its side: it stays centred across)
  assert.equal(r.y1, TACTIC.y0 - M);
  assert.equal(r.x0, M);
  assert.equal(r.x1, 393 - M);
});

test('a corner cover cuts from a side when that costs clearly less than the top or the bottom', () => {
  const tall: Rect = { x0: 340, y0: 300, x1: 393, y1: 606 };
  const r = check([TOP, ROWS, tall]);
  assert.equal(r.x1, 340 - M);
});

test('a column down the side (the synergies) cuts the room from that side', () => {
  const syn: Rect = { x0: 6, y0: 180, x1: 96, y1: 520 };
  const r = check([TOP, SPELLS_1, ROWS, syn]);
  assert.equal(r.x0, 96 + M);
  assert.equal(r.y0, 142 + M);
});

test('any registered cover counts: a duel bar is kept clear of as the rest are', () => {
  const before = camCovers().length;
  let told = '';
  onCamCover((sel) => (told = sel));
  registerCamCover('#duelBar');
  registerCamCover('#duelBar');
  assert.equal(camCovers().length, before + 1, 'once');
  assert.equal(told, '#duelBar');
  for (const sel of CAM_COVERS) assert.ok(camCovers().includes(sel));
  const duel: Rect = { x0: 20, y0: 148, x1: 373, y1: 190 };
  assert.equal(check([TOP, SPELLS_1, duel, ROWS]).y0, 190 + M);
});

// HORN-CORNER (docs/notes/horn-corner.md): the War Horn in the board's bottom-right corner, on the panel's top edge beside the tactic button
test('the War Horn beside the tactic button trims the room\'s foot no further than the button did, and the room stays centred across', () => {
  const HORN: Rect = { x0: 265, y0: 533, x1: 321, y1: 589 };
  const r = check([TOP, SPELLS_1, ROWS, TACTIC, HORN]);
  assert.equal(r.x0, M);
  assert.equal(r.x1, 393 - M);
  // (no lower than the tactic button already cut it: the horn costs the fight no room)
  assert.equal(r.y1, 528 - M);
  assert.deepEqual(r, check([TOP, SPELLS_1, ROWS, TACTIC]));
  // (alone in the corner, with no tactic button, it still cuts from the foot, not a strip down the side)
  const alone = check([TOP, SPELLS_1, ROWS, { x0: 329, y0: 538, x1: 385, y1: 594 }]);
  assert.equal(alone.y1, 538 - M);
  assert.equal(alone.x1, 393 - M);
  // (a toast and a quip keep clear of it too)
  assert.ok(FIGHT_HUD.includes(HORN_CORNER));
  registerCamCover(HORN_CORNER);
  assert.ok(camCovers().includes(HORN_CORNER));
});

test('covers with no size are skipped; a cover over the whole screen (a sheet) leaves the room as it was', () => {
  assert.deepEqual(safeRect(VIEW, [TOP, { x0: 0, y0: 300, x1: 0, y1: 300 }, ROWS]), safeRect(VIEW, [TOP, ROWS]));
  const sheet: Rect = { x0: 0, y0: 0, x1: 393, y1: 852 };
  const r = safeRect(VIEW, [TOP, ROWS, sheet]);
  assert.deepEqual(r, safeRect(VIEW, [TOP, ROWS]));
  // (the room never goes under its least size, whatever is over it)
  const r2 = safeRect(VIEW, [TOP, { x0: 0, y0: 90, x1: 393, y1: 700 }, ROWS]);
  assert.ok(r2.y1 - r2.y0 >= SAFE.MIN_H - 2 * M);
});

test('the order the covers come in does not matter, and the room eases to a new one without jumping', () => {
  const a = safeRect(VIEW, [TOP, SPELLS_1, BOSS, ROWS, TACTIC]);
  const b = safeRect(VIEW, [TACTIC, ROWS, BOSS, SPELLS_1, TOP]);
  assert.deepEqual(a, b);
  const from = safeRect(VIEW, [TOP, ROWS]);
  const mid = easeRect(from, a, 100, 420);
  assert.ok(mid.y0 > from.y0 && mid.y0 < a.y0);
  assert.deepEqual(easeRect(from, a, 0, 420), from);
});

test('at 360 x 780 with four spells and the War Horn (two rows) and a boss bar, the room is still a good part of the board', () => {
  const view: Rect = { x0: 0, y0: 0, x1: 360, y1: 780 };
  const r = safeRect(view, [{ x0: 0, y0: 0, x1: 360, y1: 82 }, { x0: 8, y0: 88, x1: 352, y1: 190 }, { x0: 60, y0: 194, x1: 348, y1: 220 }, { x0: 0, y0: 540, x1: 360, y1: 780 }]);
  assert.equal(r.y0, 220 + M);
  assert.equal(r.y1, 540 - M);
  assert.ok(r.y1 - r.y0 > 250);
});
