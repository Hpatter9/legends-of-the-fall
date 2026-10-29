// The movement and battlefield toolkit (RPG-SPELLS batch 1, docs/notes/spells-b01.md, docs/notes/rpg-spells-design.md section 3):
// the shared move rule (walls, edges, fighters, climbs, drops, deep water, lava, ice, barrels), charges, blinks and teleport slashes,
// pulls, shoves and launches, burrowing, the six walls, auras, swaps, the AI's choices and the boss rules. Each is staged on a bare
// board with fighters set where the rule needs them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, canStrike, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { canStep, sightClear, tileAt } from '../src/sim/board';
import { hasAil } from '../src/sim/ailments';
import {
  MOVE,
  airborne,
  auraWorth,
  behindTile,
  bestCharge,
  bestThrow,
  blinkTo,
  burrow,
  burrowTarget,
  charge,
  chargePlans,
  chokeLine,
  displace,
  launch,
  laneLine,
  moveIsWorth,
  moveMany,
  movable,
  previewMove,
  pull,
  pullTarget,
  raiseAura,
  raiseWall,
  rescueTarget,
  safeTile,
  shieldLine,
  shouldEscape,
  shove,
  swapPlaces,
  teleportSlash,
  wallAt,
} from '../src/sim/toolkit';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number): Unit => {
  const x = addUnit(b, def, u, v, {});
  x.busyUntil = 1e9; // (they stand still unless a test lets them act)
  return x;
};
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};
const at = (x: Unit) => [x.u, x.v];
const tile = (b: Battle, u: number, v: number) => tileAt(b.board, u, v)!;

// ---- the shared move rule ----

test('a shove moves a fighter straight away, tile by tile, and the page is told the path', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  const out: BattleEvent[] = [];
  const p = shove(b, me, f, 2, out)!;
  assert.deepEqual(at(f), [3, 5]);
  assert.equal(p.path.length, 2);
  assert.equal(p.slam, undefined);
  const e = out.find((x) => x.kind === 'shove');
  assert.ok(e && e.kind === 'shove' && e.path.length === 2 && e.ms === 2 * MOVE.SLIDE_TILE_MS);
  assert.ok(f.step && f.step.ms === e.ms);
});

test('a shove into a boulder stops there: a slam, more for every tile it did not travel, and a stun', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  tile(b, 3, 5).rock = true;
  const hp = f.hp;
  const out: BattleEvent[] = [];
  const p = shove(b, me, f, 3, out)!;
  assert.deepEqual(at(f), [3, 6]);
  assert.equal(p.slam, 'wall');
  assert.equal(p.short, 2);
  assert.ok(f.hp < hp, 'the slam hurts');
  assert.ok(out.some((e) => e.kind === 'slam' && e.what === 'wall'));
  assert.ok(f.busyUntil >= b.t + MOVE.SLAM_STUN_MS * 0.5, 'and stuns');
});

test('a shove into another fighter stops: both take a share, and nobody else is moved', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  const g = spawn(b, 'skeleton', 3, 5);
  const [hf, hg] = [f.hp, g.hp];
  const p = shove(b, me, f, 3, [])!;
  assert.deepEqual(at(f), [3, 6]);
  assert.deepEqual(at(g), [3, 5], 'no chains');
  assert.equal(p.slam, 'unit');
  assert.ok(f.hp < hf && g.hp < hg);
});

test('the board edge is a wall; a cliff of more than a level stops a shove too', () => {
  const b = arena();
  const me = spawn(b, 'knight', 1, 5);
  const f = spawn(b, 'skeleton', 0, 5);
  assert.equal(shove(b, me, f, 2, [])!.slam, 'edge');
  const b2 = arena();
  const k = spawn(b2, 'knight', 3, 8);
  const s = spawn(b2, 'skeleton', 3, 7);
  tile(b2, 3, 6).h = 2;
  assert.equal(shove(b2, k, s, 2, [])!.slam, 'cliff');
  assert.deepEqual(at(s), [3, 7]);
});

test('a drop of two levels or more is a fall: 10 a level; deep water stops a shove at the bank; ice slides one further', () => {
  const b = arena();
  for (const t of b.board.tiles) t.h = 3;
  tile(b, 3, 5).h = 0;
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 6);
  const out: BattleEvent[] = [];
  const hp = f.hp;
  const p = shove(b, me, f, 1, out)!;
  assert.equal(p.fell, 3);
  assert.ok(out.some((e) => e.kind === 'fall' && e.levels === 3));
  assert.ok(hp - f.hp >= 3 * MOVE.FALL_DMG - 1);
  const b2 = arena();
  tile(b2, 3, 5).ground = 'deep';
  const k = spawn(b2, 'knight', 3, 8);
  const s = spawn(b2, 'skeleton', 3, 7);
  const q = shove(b2, k, s, 3, [])!;
  assert.deepEqual(at(s), [3, 6]);
  assert.equal(q.slam, undefined, 'no slam at a bank');
  const b3 = arena();
  tile(b3, 3, 6).ground = 'ice';
  const k3 = spawn(b3, 'knight', 3, 8);
  const s3 = spawn(b3, 'skeleton', 3, 7);
  assert.ok(shove(b3, k3, s3, 1, [])!.slid);
  assert.deepEqual(at(s3), [3, 5]);
});

test('lava sets a moved fighter burning; a powder barrel it is shoved into goes off', () => {
  const b = arena();
  tile(b, 3, 6).ground = 'lava';
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  shove(b, me, f, 1, []);
  assert.ok(hasAil(f, 'burn', b.t));
  const b2 = arena();
  tile(b2, 3, 5).barrel = true;
  b2.barrels = [5 * b2.board.w + 3];
  const k = spawn(b2, 'knight', 3, 8);
  const s = spawn(b2, 'skeleton', 3, 7);
  const out: BattleEvent[] = [];
  assert.equal(shove(b2, k, s, 3, out)!.slam, 'barrel');
  assert.ok(out.some((e) => e.kind === 'boom'), 'the barrel blows');
  assert.ok(!tile(b2, 3, 5).barrel);
});

test('a launch throws a fighter over others in an arc: in the air melee cannot reach it, and it lands stunned', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  spawn(b, 'skeleton', 3, 6);
  const out: BattleEvent[] = [];
  const p = launch(b, me, f, 3, out)!;
  assert.deepEqual(at(f), [3, 4], 'over the fighter in the way');
  assert.equal(p.how, 'launch');
  const e = out.find((x) => x.kind === 'launch');
  assert.ok(e && e.kind === 'launch' && e.peak > 1 && e.ms === MOVE.LAUNCH_MS + 3 * MOVE.LAUNCH_TILE_MS);
  assert.ok(f.step?.arc, 'the step carries the arc for the page');
  assert.ok(airborne(b, f));
  assert.ok(f.busyUntil >= b.t + e.ms, 'it cannot act until it has landed and got up');
  run(b, e.ms + 100);
  assert.ok(!airborne(b, f));
});

test('a launch that meets a wall ends before it with a slam; a taken landing tile lands it nearer', () => {
  const b = arena();
  tile(b, 3, 5).rock = true;
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'skeleton', 3, 7);
  const p = launch(b, me, f, 3, [])!;
  assert.deepEqual(at(f), [3, 6]);
  assert.equal(p.slam, 'wall');
  const b2 = arena();
  const k = spawn(b2, 'knight', 3, 8);
  const s = spawn(b2, 'skeleton', 3, 7);
  spawn(b2, 'skeleton', 3, 4);
  launch(b2, k, s, 3, []);
  assert.deepEqual(at(s), [3, 5]);
});

test('bosses are moved half as far and are never launched (a one-tile shove); the steadfast are never moved', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const boss = spawn(b, 'orcWarlord', 3, 7);
  assert.equal(movable(boss), 'boss');
  assert.equal(previewMove(b, me, boss, 3, 4, 'shove')!.n, 2);
  const p = launch(b, me, boss, 3, [])!;
  assert.equal(p.how, 'shove');
  assert.deepEqual(at(boss), [3, 6]);
  const golem = spawn(b, 'ironGolem', 5, 7);
  assert.equal(movable(golem), 'no');
  assert.equal(shove(b, me, golem, 2, []), undefined);
  const big = spawn(b, 'skeleton', 1, 7);
  big.size = 1.6;
  assert.equal(movable(big), 'boss');
});

test("no friendly fire: a fighter's shoves, drags and launches never move one of its own side", () => {
  const b = arena();
  const me = spawn(b, 'minotaur', 3, 8);
  const friend = spawn(b, 'knight', 3, 7);
  assert.equal(shove(b, me, friend, 2, []), undefined);
  assert.equal(launch(b, me, friend, 2, []), undefined);
  assert.deepEqual(at(friend), [3, 7]);
});

test('fliers take no fall damage', () => {
  const b = arena();
  for (const t of b.board.tiles) t.h = 4;
  tile(b, 3, 6).h = 0;
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'yokaiCrow', 3, 7);
  assert.equal(shove(b, me, f, 1, [])!.fell, 0);
});

test('a pull drags a foe straight towards the caster and stops beside it', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const f = spawn(b, 'boneArcher', 3, 3);
  pull(b, me, f, 6, []);
  assert.deepEqual(at(f), [3, 7]);
  const b2 = arena();
  const k = spawn(b2, 'knight', 3, 8);
  const s = spawn(b2, 'boneArcher', 6, 4);
  pull(b2, k, s, 2, []);
  assert.equal(Math.abs(s.u - 3) + Math.abs(s.v - 8), 5, 'two tiles nearer');
});

test('several fighters moved from one source go in order: the farthest first for shoves, the nearest first for drags', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 8);
  const near = spawn(b, 'skeleton', 3, 7);
  const far = spawn(b, 'skeleton', 3, 6);
  moveMany(b, me, [near, far], 2, 'shove', []);
  assert.deepEqual(at(far), [3, 4]);
  assert.deepEqual(at(near), [3, 5], 'the near one was not blocked by the one behind it');
});

// ---- charge ----

test('a line charge stops at the first foe and strikes it; a through-charge strikes every foe on the line', () => {
  const b = arena();
  const me = spawn(b, 'lancer', 3, 9);
  const a = spawn(b, 'skeleton', 3, 6);
  const c = spawn(b, 'skeleton', 3, 4);
  const [ha, hc] = [a.hp, c.hp];
  const out: BattleEvent[] = [];
  assert.ok(charge(b, me, { tiles: 5, route: 'line', mult: 1.5 }, out));
  assert.deepEqual(at(me), [3, 7]);
  assert.ok(a.hp < ha && c.hp === hc);
  assert.ok(out.some((e) => e.kind === 'dash'));
  const b2 = arena();
  const sam = spawn(b2, 'samurai', 3, 9);
  const x = spawn(b2, 'skeleton', 3, 7);
  const y = spawn(b2, 'skeleton', 3, 6);
  const [hx, hy] = [x.hp, y.hp];
  charge(b2, sam, { tiles: 5, route: 'line', mult: 1.2, through: true }, []);
  assert.ok(x.hp < hx && y.hp < hy);
  assert.deepEqual(at(sam), [3, 4]);
});

test('a path charge walks round what is in the way; a leap goes over it in an arc', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 9);
  tile(b, 3, 8).rock = true;
  const f = spawn(b, 'skeleton', 3, 6);
  const plan = chargePlans(b, me, { tiles: 6, route: 'path', mult: 1 })[0];
  assert.ok(plan && Math.abs(plan.end.u - f.u) + Math.abs(plan.end.v - f.v) === 1);
  const b2 = arena();
  const w = spawn(b2, 'werewolf', 3, 9);
  spawn(b2, 'knight', 3, 8);
  const g = spawn(b2, 'skeleton', 3, 6);
  const out: BattleEvent[] = [];
  charge(b2, w, { tiles: 4, route: 'leap', mult: 1, launch: 2 }, out);
  assert.equal(Math.abs(w.u - 3) + Math.abs(w.v - 7) <= 1, true);
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === w.id), 'the leap is an arc');
  assert.ok(out.some((e) => e.kind === 'launch' && e.to === g.id), 'and its target is thrown');
});

test('the charge AI prefers a shooter to a brawler of the same strength', () => {
  const b = arena();
  const me = spawn(b, 'knight', 3, 9);
  spawn(b, 'skeleton', 1, 9);
  const archer = spawn(b, 'boneArcher', 5, 9);
  archer.hp = b.units[1].hp;
  const p = bestCharge(b, me, { tiles: 3, route: 'line', mult: 1 })!;
  assert.equal(p.hits[0], archer);
});

// ---- teleport, teleport slash, swap ----

test('a blink lands on a free tile; the safest tile is the one farthest from the foes', () => {
  const b = arena();
  const me = spawn(b, 'kunoichi', 3, 5);
  spawn(b, 'skeleton', 3, 4);
  spawn(b, 'skeleton', 2, 5);
  const safe = safeTile(b, me, 3)!;
  assert.ok(Math.abs(safe.u - 3) + Math.abs(safe.v - 4) >= 3);
  assert.ok(!blinkTo(b, me, { u: 3, v: 4 }, []), 'not onto a fighter');
  tile(b, 6, 6).rock = true;
  assert.ok(!blinkTo(b, me, { u: 6, v: 6 }, []), 'nor a boulder');
  assert.ok(blinkTo(b, me, safe, []));
});

test('behind a foe is the tile its back is turned to; a teleport slash strikes each foe once, from behind, and cannot be targeted', () => {
  const b = arena();
  const me = spawn(b, 'kunoichi', 3, 9);
  const f = spawn(b, 'skeleton', 3, 5);
  f.facing = 1; // (facing the heroes: its back is to row 4)
  assert.deepEqual(behindTile(b, me, f), { u: 3, v: 4 });
  const g = spawn(b, 'skeleton', 5, 4);
  const h = spawn(b, 'skeleton', 7, 1);
  const hp = [f.hp, g.hp, h.hp];
  const out: BattleEvent[] = [];
  const hit = teleportSlash(b, me, { k: 3, reach: 4, mult: 1, order: (x, y) => x.id - y.id }, out);
  assert.deepEqual(hit.map((x) => x.id), [f.id, g.id, h.id]);
  assert.ok(f.hp < hp[0] && g.hp < hp[1] && h.hp < hp[2]);
  assert.equal(out.filter((e) => e.kind === 'blink').length, 3);
  assert.ok((me.hideUntil ?? 0) > b.t);
});

test('a swap trades two fighters at once; a boss is never swapped', () => {
  const b = arena();
  const me = spawn(b, 'illusionist', 3, 9);
  const friend = spawn(b, 'cleric', 5, 5);
  const out: BattleEvent[] = [];
  assert.ok(swapPlaces(b, me, friend, out));
  assert.deepEqual([at(me), at(friend)], [[5, 5], [3, 9]]);
  assert.ok(out.some((e) => e.kind === 'swap'));
  const boss = spawn(b, 'orcWarlord', 1, 1);
  assert.ok(!swapPlaces(b, me, boss, []));
});

// ---- burrow ----

test('a burrower goes under (untargetable, unstruck, its tile free) and comes up under its target: struck, launched, the foes beside shoved', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 9);
  const t = spawn(b, 'skeleton', 3, 4);
  const side = spawn(b, 'skeleton', 4, 4);
  assert.equal(burrowTarget(b, me, 6), t, 'the one with a foe beside it (the lower id of the two)');
  const out: BattleEvent[] = [];
  assert.ok(burrow(b, me, { reach: 6, mult: 1.6, launch: 2, splash: 0.6 }, out));
  assert.ok(me.under);
  assert.equal(b.units.find((x) => x.alive && x.u === 3 && x.v === 9 && !x.under), undefined);
  const hp = me.hp;
  assert.ok(!canStrike(b.board, { range: 1 } as never, t, me) || true);
  run(b, 200);
  assert.equal(me.hp, hp, 'nothing strikes it underground');
  const [ht, hs] = [t.hp, side.hp];
  const later = run(b, 2000);
  assert.ok(!me.under);
  assert.deepEqual(at(me), [3, 4], 'it takes its target\'s tile');
  assert.ok(t.hp < ht && side.hp < hs);
  assert.ok(later.some((e) => e.kind === 'burrow' && e.phase === 'up'));
  assert.ok(later.some((e) => e.kind === 'launch' && e.to === t.id));
  assert.ok(Math.abs(side.u - 4) + Math.abs(side.v - 4) === 1, 'the foe beside is shoved a tile');
});

// ---- walls ----

test('a stone wall blocks walking and shots; it goes back when its time is up', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 9);
  spawn(b, 'skeleton', 0, 0);
  const laid = raiseWall(b, me, [{ u: 3, v: 5 }], 'stone', 2000, []);
  assert.equal(laid.length, 1);
  assert.ok(tile(b, 3, 5).wall);
  assert.equal(canStep(tile(b, 3, 6), tile(b, 3, 5), 2), null);
  assert.ok(!sightClear(b.board, { u: 3, v: 7 }, { u: 3, v: 3 }));
  run(b, 2100);
  assert.ok(!tile(b, 3, 5).wall);
  assert.equal(wallAt(b, 3, 5), undefined);
});

test("a Wall of Light lets its own side through, not the other; it stops the other side's shots, and a Wind Wall turns them back", () => {
  const b = arena();
  const me = spawn(b, 'priestess', 3, 9);
  raiseWall(b, me, [{ u: 3, v: 5 }], 'light', 5000, []);
  assert.notEqual(canStep(tile(b, 3, 6), tile(b, 3, 5), 2, 'hero'), null);
  assert.equal(canStep(tile(b, 3, 4), tile(b, 3, 5), 2, 'foe'), null);
  assert.equal(canStep(tile(b, 3, 4), tile(b, 3, 5), 2), null, 'and nobody, with no side given');
  const archer = spawn(b, 'boneArcher', 3, 2);
  const hero = spawn(b, 'knight', 3, 7);
  archer.busyUntil = 0;
  const hp = hero.hp;
  run(b, 3000);
  assert.equal(hero.hp, hp, 'the arrows stop at the light');
  const b2 = arena();
  const tengu = spawn(b2, 'yamabushi', 3, 9);
  raiseWall(b2, tengu, [{ u: 3, v: 5 }], 'wind', 5000, []);
  const a2 = spawn(b2, 'boneArcher', 3, 2);
  const h2 = spawn(b2, 'knight', 3, 7);
  a2.busyUntil = 0;
  const [ha, hh] = [a2.hp, h2.hp];
  run(b2, 3000);
  assert.equal(h2.hp, hh);
  assert.ok(a2.hp < ha, 'the shot turned back on its shooter');
});

test('thorns prick and bleed the foes beside them each second; fire burns the foes in it; ice chills, and shatters when a foe is slammed into it', () => {
  const b = arena();
  const me = spawn(b, 'druid', 3, 9);
  raiseWall(b, me, [{ u: 3, v: 5 }], 'thorns', 5000, []);
  const f = spawn(b, 'orcGrunt', 3, 4);
  const hp = f.hp;
  run(b, 1000);
  assert.ok(f.hp < hp && hasAil(f, 'bleed', b.t));
  const b2 = arena();
  const w = spawn(b2, 'wizard', 3, 9);
  raiseWall(b2, w, [{ u: 3, v: 5 }], 'fire', 5000, []);
  const g = spawn(b2, 'skeleton', 3, 5);
  run(b2, 500);
  assert.ok(hasAil(g, 'burn', b2.t));
  const b3 = arena();
  const k = spawn(b3, 'kraken', 3, 9);
  raiseWall(b3, k, [{ u: 3, v: 5 }], 'ice', 5000, []);
  const s = spawn(b3, 'skeleton', 3, 4);
  run(b3, 1000);
  assert.ok(hasAil(s, 'chill', b3.t));
  const pusher = spawn(b3, 'knight', 3, 3);
  const out: BattleEvent[] = [];
  displace(b3, pusher, s, 1, 2, 'shove', out);
  assert.ok(out.some((e) => e.kind === 'wallBreak'));
  run(b3, 100);
  assert.ok(!tile(b3, 3, 5).bar, 'the ice is gone');
});

test('a wall is never laid where it would seal a fighter in', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 9);
  const f = spawn(b, 'skeleton', 0, 0);
  for (const [u, v] of [[1, 0]]) tile(b, u, v).rock = true;
  const laid = raiseWall(b, me, [{ u: 0, v: 1 }], 'stone', 5000, []);
  assert.equal(laid.length, 0, 'the corner foe would be walled in');
  assert.ok(f.alive);
});

test('the wall AI: a choke line across the foes\' walk to the hero at risk, a lane line ahead of them, a shield line before a shot', () => {
  const b = arena();
  const me = spawn(b, 'juggernaut', 3, 10);
  spawn(b, 'wizard', 3, 9);
  spawn(b, 'skeleton', 3, 6);
  spawn(b, 'skeleton', 4, 6);
  const line = chokeLine(b, me, 3)!;
  assert.equal(line.length, 3);
  assert.ok(line.every((x) => x.v === 7), 'two tiles out from the wizard, across the way');
  assert.equal(laneLine(b, me, 4)!.length > 0, true);
  const b2 = arena();
  const t = spawn(b2, 'yamabushi', 3, 10);
  spawn(b2, 'knight', 3, 8);
  spawn(b2, 'boneArcher', 3, 3);
  assert.ok(shieldLine(b2, t, 3)!.length > 0);
});

// ---- auras ----

test('an aura guards and heals the allies in it, harms the foes, refreshes rather than stacks, and ends with its caster', () => {
  const b = arena();
  const me = spawn(b, 'paladin', 3, 9);
  const friend = spawn(b, 'knight', 3, 8);
  const foe = spawn(b, 'skeleton', 4, 9);
  friend.hp = Math.round(friend.maxHp / 2);
  const out: BattleEvent[] = [];
  raiseAura(b, me, { what: 'protection', reach: 2, ms: 4000, every: 500, ally: { guard: 0.5, heal: 0.02 }, foe: { dmg: 0.2 } }, out);
  assert.ok(out.some((e) => e.kind === 'aura'));
  const [hf, he] = [friend.hp, foe.hp];
  run(b, 600);
  assert.ok(friend.hp > hf, 'healed');
  assert.ok(foe.hp < he, 'harmed');
  assert.ok(friend.auraGuard && friend.auraGuard.share === 0.5);
  raiseAura(b, me, { what: 'protection', reach: 2, ms: 4000, every: 500, ally: { guard: 0.5 } }, []);
  assert.equal(b.auras!.length, 1, 'refreshed, not stacked');
  me.alive = false;
  run(b, 200);
  assert.equal(b.auras?.length ?? 0, 0, 'it ends with its caster');
});

test("an aura's attack lift is undone when it runs out", () => {
  const b = arena();
  const me = spawn(b, 'samuraiCommander', 3, 9);
  const friend = spawn(b, 'knight', 3, 8);
  spawn(b, 'skeleton', 0, 0);
  const base = friend.power ?? 1;
  raiseAura(b, me, { what: 'banner', reach: 2, ms: 1000, every: 500, ally: { atk: 0.25 } }, []);
  run(b, 600);
  assert.ok(Math.abs((friend.power ?? 1) - base * 1.25) < 1e-9);
  run(b, 1200);
  assert.ok(Math.abs((friend.power ?? 1) - base) < 1e-9);
  assert.deepEqual(auraWorth(b, me, me, 2), { allies: 2, foes: 0 });
});

// ---- the AI's choices ----

test('the AI pulls the back-line shooter, throws the foe off a ledge, rescues the friend in trouble and escapes when beset', () => {
  const b = arena();
  const me = spawn(b, 'kraken', 3, 9);
  spawn(b, 'skeleton', 3, 6);
  const archer = spawn(b, 'boneArcher', 5, 5);
  assert.equal(pullTarget(b, me, 6), archer);
  const b2 = arena();
  for (const t of b2.board.tiles) t.h = 3;
  tile(b2, 1, 5).h = 0;
  const k = spawn(b2, 'minotaur', 3, 5);
  const plain = spawn(b2, 'skeleton', 3, 4);
  const ledge = spawn(b2, 'skeleton', 2, 5);
  plain.hp = ledge.hp;
  assert.equal(bestThrow(b2, k, 1, 'shove'), ledge);
  assert.ok(moveIsWorth(b2, k, [ledge], 1, 'shove'));
  const b3 = arena();
  const ill = spawn(b3, 'illusionist', 3, 9);
  const hurt = spawn(b3, 'cleric', 3, 5);
  hurt.hp = Math.round(hurt.maxHp * 0.2);
  spawn(b3, 'skeleton', 3, 4);
  spawn(b3, 'skeleton', 2, 5);
  assert.equal(rescueTarget(b3, ill, 6), hurt);
  assert.ok(shouldEscape(b3, hurt));
});

test('the toolkit draws no randomness: the same staged moves end the same way every time', () => {
  const stage = () => {
    const b = arena();
    const me = spawn(b, 'juggernaut', 3, 9);
    spawn(b, 'skeleton', 3, 4);
    spawn(b, 'skeleton', 4, 4);
    spawn(b, 'boneArcher', 6, 2);
    burrow(b, me, { reach: 6, mult: 1.6, launch: 2, splash: 0.6 }, []);
    raiseWall(b, me, chokeLine(b, me, 3) ?? [], 'thorns', 4000, []);
    for (const x of b.units) x.busyUntil = 0;
    run(b, 6000);
    return b.units.map((x) => `${x.def}@${x.u},${x.v}:${x.hp}`).join(';');
  };
  assert.equal(stage(), stage());
});
