// EMIT-POINTS (docs/notes/emit-points.md): what a fighter looses leaves from the right spot on its own picture.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CAST, EMIT, FOE_EMIT, ULT_EMIT, ultEmitOffset, strokeLands, STROKE_AT, emitOffset, emitWorld, reachOffset, strokeLay } from '../src/render/emitRules';
import { REACH } from '../src/render/reachData';
import { FOES } from '../src/sim/foes';
import { MOUTH_RUN, TAIL_MIN, lineLight, mouthRun, streamSpot, tailShare } from '../src/render/blenderFxRules';
import { SHOW } from '../src/ultShowRules';
import { UNITS } from '../src/sim/units';
import layout from '../src/art/units/sheets.json';

const SHEETS = layout as unknown as Record<string, { w: number; h: number; rear?: string; facesRight?: boolean; counts: Record<string, number> }>;
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
  assert.deepEqual(tool, JSON.parse(JSON.stringify({ shot: EMIT, cast: CAST, foe: FOE_EMIT })));
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const \[x0, y0\] = this\.emitOf\(by, 0\.55\);/);
  assert.match(fx, /return s\.emitPoint\(\) \?\? \[s\.x, s\.y - s\.tall \* lift\];/);
  // (looks only: the rules import nothing of the fight, only their own generated table)
  assert.deepEqual(readFileSync('src/render/emitRules.ts', 'utf8').match(/^import .*$/gm), ["import { REACH } from './reachData';"]);
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

test('every foe that shoots has a measured point on its sheet, read on the frame on show as its shot leaves', () => {
  const shooters = Object.values(FOES).filter((f) => f.shot);
  assert.ok(shooters.length >= 15);
  for (const f of shooters) {
    const e = FOE_EMIT[f.sheet];
    assert.ok(e, `${f.id} (${f.sheet}) has no point`);
    const L = SHEETS[f.sheet];
    assert.ok(Math.abs(e.at[0]) <= L.w / 2 && e.at[1] >= 10 && e.at[1] < L.h, `${f.id}: ${e.at}`);
    // (the release frame: the wind-up, 0.4 of the attack and 500 ms at most, over the swing, which is 250 ms longer)
    const windup = Math.min(500, Math.round(f.atkMs * 0.4));
    assert.equal(e.frame, Math.floor((windup / (windup + 250)) * L.counts.attack), f.id);
    // (the sheet has no look from behind and faces right as drawn, so the one point serves)
    assert.ok(!L.rear && L.facesRight !== false, f.id);
    assert.deepEqual(emitOffset(f.sheet, f.sheet, f.sheet), e.at);
  }
  const used = new Set(shooters.map((f) => f.sheet));
  for (const sheet of Object.keys(FOE_EMIT)) assert.ok(used.has(sheet) && !EMIT[sheet] && !CAST[sheet], sheet);
});

test("MELEE: every fighter's weapon reach is read off its sheet, and a stroke lies half way from it to the struck fighter", () => {
  // (every hero and foe drawn from a sheet with an attack row has a reach, ahead of its body's middle, inside its frame)
  let n = 0;
  for (const u of [...Object.values(UNITS), ...Object.values(FOES)]) {
    const L = SHEETS[u.sheet];
    if (!L || !L.counts.attack) continue;
    const e = REACH[u.sheet];
    assert.ok(e, `${u.id} (${u.sheet})`);
    assert.ok(e.front[0] > 0 && e.front[0] <= L.w / 2 && e.front[1] >= 0 && e.front[1] < L.h, `${u.id}: ${e.front}`);
    if (L.rear) assert.ok(e.back && e.back[0] > 0, `${u.id}: no reach from behind`);
    n++;
  }
  assert.ok(n >= 100);
  // (the look from the front, the look from behind, and nothing for another look)
  const k = REACH.hero_res_knight ? 'hero_res_knight' : Object.keys(REACH).find((s) => REACH[s].back)!;
  assert.deepEqual(reachOffset(k, k, k + '_back'), REACH[k].front);
  assert.deepEqual(reachOffset(k, k + '_back', k + '_back'), REACH[k].back);
  assert.equal(reachOffset(k, 'hero_res_werewolf', k + '_back'), undefined);
  assert.equal(reachOffset('no_such_sheet', 'no_such_sheet', undefined), undefined);
  // (half way from the weapon's end to the struck fighter's middle; its turn is the old one, body to body)
  assert.equal(STROKE_AT, 0.5);
  assert.deepEqual(strokeLay(10, 20, 30, 20), { x: 20, y: 20 });
  assert.deepEqual(strokeLay(10, 20, 10, 40), { x: 10, y: 30 });
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /const dx = to\.x - by\.x;\n    const dy = sy - \(by\.y - by\.tall \* 0\.5\);/);
  // (the generated table says how it was made, and the thrust starts at the weapon's height)
  assert.match(readFileSync('src/render/reachData.ts', 'utf8'), /generated by tools\/emit-points\/reach\.py/);
  assert.match(readFileSync('src/render/fx.ts', 'utf8'), /const \[x0, y0, x1, y1\] = \[by\.x, reach \? reach\[1\] : by\.y - by\.tall \* 0\.5, to\.x, to\.y - to\.tall \* 0\.5\];/);
});

test('a melee stroke plays as the blow lands, with its spark, and not as the swing begins', () => {
  // (a blow by a fighter that does not shoot, landing on the one it was aimed at)
  assert.ok(strokeLands({ kind: 'hit', src: 'blow' }, false));
  // (not a shooter's, a skill's, an ailment's tick, a wide blow's splash, the swing's start or a dodge)
  assert.ok(!strokeLands({ kind: 'hit', src: 'blow' }, true));
  assert.ok(!strokeLands({ kind: 'hit', src: 'skill' }, false));
  assert.ok(!strokeLands({ kind: 'hit', src: 'dot' }, false));
  assert.ok(!strokeLands({ kind: 'hit', src: 'blow', splash: true }, false));
  assert.ok(!strokeLands({ kind: 'swing' }, false));
  assert.ok(!strokeLands({ kind: 'dodge' }, false));
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(strokeLands\(e, !!defOf\(by\)\.shot\)\) this\.slash\(b, e\.by, e\.to\);/);
  assert.doesNotMatch(fx, /e\.kind === 'swing'\) this\.slash/);
  // (the swing's own sound is still the swing's: the heavy wind-up's swoosh as it begins)
  assert.match(readFileSync('src/render/soundRules.ts', 'utf8'), /case 'swing': \{/);
});

test("ULTIMATES: the Dragoon's breath leaves her mouth: small flames run from it to her line's first spot, growing, and the line follows", () => {
  const e = ULT_EMIT[UNITS.dragoon.sheet];
  assert.equal(e.kind, 'mouth');
  // (her head, not her middle: above two thirds of her figure, front and back)
  for (const at of [e.front, e.back]) assert.ok(at[1] > 70 && at[1] < 90 && at[0] >= 0 && at[0] < 20, String(at));
  const rear = SHEETS[UNITS.dragoon.sheet].rear!;
  assert.deepEqual(ultEmitOffset(UNITS.dragoon.sheet, rear, rear), e.back);
  assert.equal(ultEmitOffset(UNITS.knight.sheet, UNITS.knight.sheet, undefined), undefined);
  // (the run: from the mouth, never reaching the far point itself, each later and larger than the last; the line waits for it)
  const run = mouthRun(0, 0, 80, 0);
  assert.equal(run.at.length, 5);
  assert.deepEqual([run.at[0].x, run.at[0].y, run.at[0].delay, run.at[0].size], [0, 0, 0, MOUTH_RUN.FROM]);
  for (let i = 1; i < run.at.length; i++) assert.ok(run.at[i].x > run.at[i - 1].x && run.at[i].delay > run.at[i - 1].delay && run.at[i].size > run.at[i - 1].size);
  assert.ok(run.at[4].x < 80 && run.at[4].size < MOUTH_RUN.TO);
  assert.equal(run.wait, 5 * MOUTH_RUN.LAG);
  // (level all the way when the far point is at the mouth's height; an upright flame turned a quarter to point along it)
  assert.ok(run.at.every((p) => p.y === 0));
  assert.equal(run.turn, Math.PI / 2);
  // (a line that begins beside her: two flames; a long one: nine at most)
  assert.equal(mouthRun(0, 0, 3, 0).at.length, MOUTH_RUN.MIN);
  assert.equal(mouthRun(0, 0, 900, 0).at.length, MOUTH_RUN.MAX);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /const mouth = caster\.ultPoint\(\);/);
  // (blown at the mouth's own height: the far point is that high over the line's first spot)
  assert.match(fx, /mouthRun\(mouth\[0\], mouth\[1\], far\[0\], far\[1\] - \(caster\.y - mouth\[1\]\)\);/);
  assert.match(fx, /rotation: breath\.turn,/);
  // (the director's order for a real stream: it reaches over the line's third spot, or the last of a shorter line)
  assert.deepEqual([1, 2, 3, 4, 8].map(streamSpot), [0, 1, 2, 2, 2]);
  assert.match(fx, /const reach = streamSpot\(run\.length\);/);
  // (each spot lights as the stream passes over it, the last of them as it arrives; those beyond one after another)
  assert.deepEqual([0, 1, 2, 3, 4].map((i) => lineLight(i, 2, 300, 70)), [100, 200, 300, 370, 440]);
  assert.equal(lineLight(0, 0, 80, 70), 80);
  assert.match(fx, /r\.size, lineLight\(n, reach, breath\.wait, ULT_LINE\.LAG\)\)\);/);
  // (whoever the stream crosses is shown through it)
  assert.match(fx, /this\.showThrough\(\[Math\.min\(mouth\[0\], end\.x\) - half,/);
  // (its clip is asked for at a fight's start only when such a hero is in the fight)
  assert.match(fx, /warmBfx\(b\.units\.filter\(\(x\) => x\.side === 'hero' && ULT_EMIT\[defOf\(x\)\.sheet\]\)\.map\(\(\) => beatBfx\(MOUTH_RUN\.clip, 'fire'\)\)\);/);
});

test("the Dragoon's showcase is the same breath: its stream leaves her mouth, and its tiles light behind it", () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  // (the showcase's shot of flame is blown from the caster's mouth to the foe, and its ball bursts as the stream arrives)
  assert.match(fx, /const mouth = this\.bodyAt\(x, y - 10, 8\)\?\.ultPoint\(\);/);
  assert.match(fx, /const breath = mouthRun\(mouth\[0\], mouth\[1\], to\.x, to\.y - to\.tall \* 0\.5\);/);
  assert.match(fx, /B\('nova', to\.x, to\.y, \{ delay: breath\.wait, mult: 0\.7 \}, 'fire'\);/);
  // (a caster without a mouth point keeps the row of flames along the ground)
  assert.match(fx, /if \(!line\('flame', x, y, to\.x, to\.y, 35\)\) return false;/);
  // (the tiles light a step behind the breath and a step apart: none is alight as the stream sets off)
  assert.ok(SHOW.BURN > 0);
  assert.match(readFileSync('src/ultShowRules.ts', 'utf8'), /at: s \+ \(i \+ 1\) \* SHOW\.BURN, kind: 'burn'/);
});
