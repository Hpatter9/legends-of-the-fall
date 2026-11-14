// EMIT-POINTS (docs/notes/emit-points.md): what a fighter looses leaves from the right spot on its own picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAST, EMIT, emitOffset, emitWorld } from '../src/render/emitRules';
import { TAIL_MIN, tailShare } from '../src/render/blenderFxRules';
import { UNITS } from '../src/sim/units';
import layout from '../src/art/units/sheets.json';

const SHEETS = layout as unknown as Record<string, { w: number; h: number; rear?: string; counts: Record<string, number> }>;
/** Heroes that shoot and keep the old place on purpose (none today): each with its reason. */
const FALLBACK: Record<string, string> = {};

test('every hero that shoots has a measured point on its sheet, front and back, or names its fallback on purpose', () => {
  const shooters = Object.values(UNITS).filter((u) => u.side === 'hero' && u.shot);
  assert.ok(shooters.length >= 27);
  for (const u of shooters) {
    if (FALLBACK[u.id]) continue;
    const e = EMIT[u.sheet];
    assert.ok(e, `${u.id} (${u.sheet}) has no point`);
    const L = SHEETS[u.sheet];
    // (its look from behind exists and is the same size, and the release frame is there)
    assert.ok(L.rear && SHEETS[L.rear] && SHEETS[L.rear].w === L.w && L.counts.attack >= 3, u.id);
    for (const at of [e.front, e.back]) {
      // (inside the frame, ahead of the body's middle and above the knees: a muzzle, a hand or a staff's head, never the feet)
      assert.ok(at[0] > 0 && at[0] <= L.w / 2 && at[1] >= 20 && at[1] < L.h, `${u.id}: ${at}`);
    }
  }
  // (no point is kept for a sheet no shooter uses)
  const used = new Set(shooters.map((u) => u.sheet));
  for (const sheet of Object.keys(EMIT)) assert.ok(used.has(sheet), sheet);
});

test('a gun fires from its muzzle, a bow from the hand on it: each kind of shot has the kind of point it should', () => {
  for (const u of Object.values(UNITS)) {
    const e = u.side === 'hero' && u.shot ? EMIT[u.sheet] : undefined;
    if (!e) continue;
    if (u.shot === 'bullet') assert.equal(e.kind, 'muzzle', u.id);
    if (e.kind === 'bowHand') assert.equal(u.shot, 'arrow', u.id);
  }
  assert.equal(EMIT.hero_res_gunslinger.kind, 'muzzle');
  assert.equal(EMIT.hero_samurai_archer.kind, 'bowHand');
  assert.equal(EMIT.mythic_astrax.kind, 'mouth');
});

test('the point is the front view\'s or the rear view\'s, mirrored and scaled with the body, and another look keeps the old place', () => {
  const g = EMIT.hero_res_gunslinger;
  assert.deepEqual(emitOffset('hero_res_gunslinger', 'hero_res_gunslinger', 'hero_res_gunslinger_back'), g.front);
  assert.deepEqual(emitOffset('hero_res_gunslinger', 'hero_res_gunslinger_back', 'hero_res_gunslinger_back'), g.back);
  // (a form, a guise or an awakened sheet was not measured; a sheet with no point)
  assert.equal(emitOffset('hero_res_gunslinger', 'hero_res_werewolf', 'hero_res_gunslinger_back'), undefined);
  assert.equal(emitOffset('hero_res_knight', 'hero_res_knight', undefined), undefined);
  // (facing right at half size, then mirrored to face left, then a fighter twice as large)
  assert.deepEqual(emitWorld(100, 200, [50, 60], 0.5, 0.5), [125, 170]);
  assert.deepEqual(emitWorld(100, 200, [50, 60], -0.5, 0.5), [75, 170]);
  assert.deepEqual(emitWorld(100, 200, [50, 60], -1, 1), [50, 140]);
});

test('the table the tool checks against the sheets is the table the game uses, and the renderer starts from it', () => {
  const tool = JSON.parse(readFileSync('tools/emit-points/anchors.json', 'utf8'));
  assert.deepEqual(tool, JSON.parse(JSON.stringify({ shot: EMIT, cast: CAST })));
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const \[x0, y0\] = this\.emitOf\(by, 0\.55\);/);
  assert.match(fx, /return s\.emitPoint\(\) \?\? \[s\.x, s\.y - s\.tall \* lift\];/);
  // (looks only: the rules import nothing of the fight)
  assert.doesNotMatch(readFileSync('src/render/emitRules.ts', 'utf8'), /^import /m);
});

test("a shot's tail is no longer than the way it has come, so it never trails back through the shooter", () => {
  assert.equal(tailShare(0, 40), TAIL_MIN);
  assert.equal(tailShare(20, 40), 0.5);
  assert.equal(tailShare(40, 40), 1);
  assert.equal(tailShare(400, 40), 1);
  assert.equal(tailShare(10, 0), 1);
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /sp\.scale\.x = sp\.scale\.y \* tailShare\(Math\.hypot\(x - x0, y - y0\), made\.ax \* sp\.scale\.y\);/);
});

/** The heroes that do not shoot and from whom a skill's effect leaves (found by `WHO=1` over fights of every hero, and the healers). */
const CASTERS = ['cleric', 'paladin', 'satyr', 'kitsune', 'karasu', 'kunoichi', 'shambler', 'illusionist', 'buccaneer', 'mercenary', 'mummy', 'reaper', 'dreadPirate', 'arcBlade', 'dragoon', 'tyrant', 'nightstalker'];

test('every hero that casts without shooting has a measured point on its sheet, front and back', () => {
  for (const id of CASTERS) {
    const u = UNITS[id];
    assert.ok(u && !u.shot, id);
    const e = CAST[u.sheet];
    assert.ok(e, `${id} (${u.sheet}) has no point`);
    const L = SHEETS[u.sheet];
    assert.ok(L.rear && SHEETS[L.rear], id);
    // (inside the frame; a mace or a fan raised overhead may be behind the body's middle, so x may be negative)
    for (const at of [e.front, e.back]) assert.ok(Math.abs(at[0]) <= L.w / 2 && at[1] >= 10 && at[1] < L.h, `${id}: ${at}`);
    assert.deepEqual(emitOffset(u.sheet, u.sheet, L.rear), e.front);
    assert.deepEqual(emitOffset(u.sheet, L.rear!, L.rear), e.back);
  }
  // (no sheet is in both tables, and none is kept for a sheet no hero uses)
  const sheets = new Set(Object.values(UNITS).map((u) => u.sheet));
  for (const sheet of Object.keys(CAST)) assert.ok(!EMIT[sheet] && sheets.has(sheet), sheet);
  assert.equal(Object.keys(CAST).length, CASTERS.length);
  // (a healer's thread leaves its point too)
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /if \(healer\) this\.thread\(\.\.\.this\.emitOf\(healer, 0\.5\), to\.x, to\.y - to\.tall \* 0\.5, 'light-sparkle'\);/);
});
