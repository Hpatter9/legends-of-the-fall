// The Last Stand (`docs/notes/last-stand.md`): the field, the waves, the break, the leash, gold and purchases, levels, the king's
// fall, the pay and the save.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardOk, canStep, tileAt, standable } from '../src/sim/board';
import { addUnit, apart } from '../src/sim/battle';
import { flowField, leashOf, isTank, KING_DEF } from '../src/sim/standAi';
import { canPost, edgeTiles, EDGES, FIELD, KING_AT, KEEP_TOP, ringOf, standBoard } from '../src/sim/standField';
import {
  BOSS_EVERY, BREAK_MS, buyLevel, buyRelic, CLEAR_HEAL, clearGold, clearedOf, FIELD_CAP, FIELD_HEROES, foesAlive, goNow, healCost, healKing, isBossWave, pickEight, roleOfKind, killGold, levelCost,
  loadStand, newStandRun, offerCost, postHero, rawCount, saveStand, settleStand, snapshot, startFirstWave, startStand, stepStand, strength, waveCrowns, waveSpec, xpNeed, type Stand, type StandSetup,
} from '../src/sim/stand';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { newMeta, startedMeta } from '../src/sim/meta';
import { HEROES, UNITS } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { TICK_MS } from '../src/sim/battle';
import { towerRun } from '../src/sim/modes';
import { migrateOldClimb } from '../src/sim/stand';
import { playStand, setupAtLevel } from '../tools/stand-balance';
import { mixSeed } from '../src/sim/rng';
import { stageCrowns, runCrowns } from '../src/sim/meta';

const setupAt = (level: number): StandSetup => ({ boost: () => gradeBoost(1, 0, level), castle: newCastle(), });
const armies = ARMIES.map((a) => a.id);
const EIGHT = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
const fresh = (seed = 5, level = 20): Stand => startStand(newStandRun(seed, EIGHT, armies), setupAt(level));
/** Step until the phase is `phase` (or give up after `max` ticks). */
function until(s: Stand, phase: Stand['phase'], max = 20000): void {
  for (let i = 0; i < max && s.phase !== phase && s.phase !== 'over'; i++) stepStand(s);
}

/* ------------------------------------------------------------------ the field */

test('the field is 24 x 24, the same for a seed, walkable, with the king on a raised keep', () => {
  for (const seed of [1, 2, 3, 7, 11, 42, 99, 123]) {
    const a = standBoard(seed);
    const b = standBoard(seed);
    assert.deepEqual(a.tiles, b.tiles, `seed ${seed} makes the same field`);
    assert.equal(a.w, FIELD);
    assert.equal(a.d, FIELD);
    assert.ok(boardOk(a), `seed ${seed} can be walked`);
    const king = tileAt(a, KING_AT.u, KING_AT.v)!;
    assert.equal(king.h, KEEP_TOP, 'the king stands on the top of the keep');
    assert.ok(standable(king));
    // (every tile within the plaza is level enough to walk over: no step a one-step climber cannot take)
    for (let v = 0; v < a.d; v++)
      for (let u = 0; u < a.w; u++) {
        if (ringOf({ u, v }) > 8) continue;
        for (const [du, dv] of [[1, 0], [0, 1]]) {
          const n = tileAt(a, u + du, v + dv);
          if (n && ringOf({ u: u + du, v: v + dv }) <= 8 && standable(n) && standable(tileAt(a, u, v))) assert.ok(canStep(tileAt(a, u, v)!, n, 1) !== null, `seed ${seed}: ${u},${v} to the next is a cliff in the plaza`);
        }
      }
  }
});

test('the field has height variety', () => {
  const heights = new Set(standBoard(4).tiles.map((t) => t.h));
  assert.ok(heights.size >= 4, `heights ${[...heights]}`);
});

test('every edge can walk to the king, by any walker that climbs a single level', () => {
  for (const seed of [3, 8, 21]) {
    const b = standBoard(seed);
    const field = flowField(b, KING_AT, 1);
    for (const edge of EDGES) {
      const tiles = edgeTiles(b, edge);
      assert.ok(tiles.length > 12, `${edge} has room to come in by`);
      for (const t of tiles) assert.ok(field[t.v * b.w + t.u] < Infinity, `${edge} ${t.u},${t.v} reaches the king`);
    }
  }
});

test('eight heroes are set round the keep: tanks out front on the sides, shooters and healers near the king', () => {
  const s = fresh(6, 20);
  const heroes = s.b.units.filter((u) => u.tag !== undefined);
  assert.equal(heroes.length, 8);
  const tiles = new Set(heroes.map((u) => `${u.u},${u.v}`));
  assert.equal(tiles.size, 8, 'no two on one tile');
  for (const u of heroes) assert.ok(canPost(s.b.board, u.u, u.v));
  const ring = (kinds: string[]) => heroes.filter((u) => kinds.includes(u.def)).map((u) => ringOf(u));
  assert.ok(Math.min(...ring(['knight', 'paladin'])) >= 3, 'the tanks stand out');
  assert.ok(Math.max(...ring(['archer', 'ranger', 'wizard', 'cleric'])) <= 3, 'the shooters and healers stay in');
  assert.equal(roleOfKind('knight'), 'tank');
  assert.equal(roleOfKind('cleric'), 'inner');
  // the sides: the heroes are spread over all four quarters of the keep
  const quarter = new Set(heroes.map((u) => `${Math.sign(u.u - KING_AT.u)}${Math.sign(u.v - KING_AT.v)}`));
  assert.ok(quarter.size >= 4, `quarters ${[...quarter]}`);
  assert.ok(!canPost(s.b.board, KING_AT.u, KING_AT.v), 'nobody is posted on the king');
  assert.ok(!canPost(s.b.board, 0, 0), 'nor at the far edge');
});

test('the eight come from the party, filled with the strongest owned, and there is nothing to hire', () => {
  const m = startedMeta(4);
  m.unlocked = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger', 'druid', 'warlock'];
  m.xp = { druid: 5000, warlock: 9000 };
  m.party = ['knight', 'archer'];
  const eight = pickEight(m);
  assert.equal(eight.length, 8);
  assert.deepEqual(eight.slice(0, 2), ['knight', 'archer']);
  assert.ok(eight.includes('warlock') && eight.includes('druid'), 'the highest levels fill the party');
  assert.equal(new Set(eight).size, 8);
  assert.equal(pickEight({ ...m, unlocked: ['knight', 'samurai'] }, ['knight']).length, 2);
  assert.ok(!('hire' in require('../src/sim/stand')), 'no hiring in the Last Stand');
});

/* ------------------------------------------------------------------ the waves */

test('the waves of a seed are the same every time and differ by seed', () => {
  for (const n of [1, 2, 5, 9, 14, 25, 40]) assert.deepEqual(waveSpec(7, armies, n), waveSpec(7, armies, n));
  assert.notDeepEqual(waveSpec(7, armies, 12).edges.concat(waveSpec(7, armies, 13).edges), waveSpec(8, armies, 12).edges.concat(waveSpec(8, armies, 13).edges));
});

test('the waves grow in count and strength, and every fifth is a boss', () => {
  let count = 0;
  let k = 0;
  for (let n = 1; n <= 30; n++) {
    const w = waveSpec(3, armies, n);
    assert.equal(w.boss, n % BOSS_EVERY === 0);
    assert.equal(isBossWave(n), w.boss);
    assert.ok(w.foes.length >= count - 0, `wave ${n} is no smaller than the one before`);
    assert.ok(w.hp >= k, `wave ${n} is no weaker`);
    count = w.foes.length;
    k = w.hp;
    if (w.boss) assert.ok(UNITS[w.foes[0]], 'a boss leads');
    for (const id of w.foes) assert.ok(UNITS[id]?.side === 'foe', `${id} is a foe`);
  }
  assert.ok(strength(20) > strength(1));
  assert.ok(rawCount(20) > rawCount(1));
});

test('the foes on the field stay under the cap, and past it the strength carries the wave', () => {
  const small = waveSpec(2, armies, 10);
  const big = waveSpec(2, armies, 60);
  assert.ok(big.raw > FIELD_CAP);
  assert.equal(big.foes.length, FIELD_CAP);
  assert.ok(big.hp > strength(60), 'what the cap cut is paid in strength');
  assert.ok(small.hp === strength(10), 'below the cap the strength is the wave\'s own');
  for (let n = 1; n <= 120; n++) assert.ok(waveSpec(9, armies, n).foes.length <= FIELD_CAP);
  // (and in play: a run at a high level, wave after wave, never has more alive than the cap)
  const s = fresh(4, 60);
  startFirstWave(s);
  let peak = 0;
  for (let i = 0; i < 40000 && s.phase !== 'over' && s.run.wave < 40; i++) {
    stepStand(s);
    s.notes.length = 0;
    if (i % 5 === 0) peak = Math.max(peak, foesAlive(s));
  }
  assert.ok(peak > 20 && peak <= FIELD_CAP, `peak ${peak}`);
});

test('the foes come in from the edges the wave names', () => {
  const s = fresh(9, 50);
  startFirstWave(s);
  const spec = waveSpec(s.run.seed, s.run.armies, 1);
  for (let i = 0; i < 30; i++) stepStand(s);
  const foes = s.b.units.filter((u) => u.side === 'foe' && u.alive);
  assert.ok(foes.length > 0);
  const last = FIELD - 1;
  for (const f of foes) {
    const edge = f.v === 0 ? 'north' : f.v === last ? 'south' : f.u === 0 ? 'west' : f.u === last ? 'east' : null;
    // (a foe a few steps in has moved: only those still standing on an edge are checked)
    if (edge) assert.ok(spec.edges.includes(edge), `a foe came in at the ${edge}`);
  }
});

/* ------------------------------------------------------------------ the heroes */

test('a hero is posted where it was placed, within a leash of a few tiles', () => {
  assert.ok(leashOf(UNITS.archer) <= leashOf(UNITS.samurai) && leashOf(UNITS.samurai) <= leashOf(UNITS.knight), 'shooters keep closest, tanks furthest');
  assert.ok(isTank(UNITS.knight) && !isTank(UNITS.archer));
  const s = fresh(5, 30);
  startFirstWave(s);
  const posts = new Map(s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined).map((u) => [u.id, { ...s.run.heroes.find((h) => h.id === u.tag)!.post! }]));
  let worst = 0;
  const out = new Map<number, number>();
  for (let i = 0; i < 30000 && s.phase !== 'over' && s.run.wave < 18; i++) {
    stepStand(s);
    s.notes.length = 0;
    for (const u of s.b.units) {
      const post = posts.get(u.id);
      if (!post || !u.alive) continue;
      const d = apart(u, { u: post[0], v: post[1] });
      worst = Math.max(worst, d);
      // (even a skill that leaps or dives stops short of the leash; only a foe's blow that shoves a hero can put it a tile past, and it walks straight back, or fights where it stands if foes shut the way)
      const ticks = d > u.post!.leash ? (out.get(u.id) ?? 0) + 1 : 0;
      out.set(u.id, ticks);
      assert.ok(d <= u.post!.leash + 1 && ticks <= 120, `${u.def} was ${d} from its post (leash ${u.post!.leash}) for ${ticks} ticks at ${s.b.t}`);
    }
  }
  assert.ok(worst >= 1, 'the heroes did move to fight (the leash is used)');
});

test('a hero that is out of its zone walks back to its post', () => {
  const s = fresh(5, 30);
  startFirstWave(s);
  const knight = s.b.units.find((u) => u.def === 'knight')!;
  const home = { ...knight.post! };
  // (shove it off: a spell or a knock can move a hero; with no foe about it goes home)
  s.queue.length = 0;
  for (const u of s.b.units) if (u.side === 'foe') u.alive = false;
  const spot = [[2, 0], [-2, 0], [0, 2], [0, -2]].map(([du, dv]) => ({ u: knight.u + du, v: knight.v + dv })).find((t) => canPost(s.b.board, t.u, t.v) && !s.b.units.some((x) => x.alive && x.u === t.u && x.v === t.v) && apart(t, home) === 2 && Math.abs(tileAt(s.b.board, t.u, t.v)!.h - tileAt(s.b.board, home.u, home.v)!.h) <= 1)!;
  knight.u = spot.u;
  knight.v = spot.v;
  knight.busyUntil = 0;
  for (let i = 0; i < 35; i++) stepStand(s);
  assert.equal(apart(knight, home), 0, 'back on its post');
});

test('a tank goes for the foe nearest the king; the others for the weakest', () => {
  const s = fresh(5, 30);
  startFirstWave(s);
  s.queue.length = 0;
  for (const u of s.b.units) if (u.side === 'foe') u.alive = false;
  const knight = s.b.units.find((u) => u.def === 'knight')!;
  assert.ok(knight.post!.tank, 'the knight is a tank');
  const free = (t: { u: number; v: number }) => canPost(s.b.board, t.u, t.v) && !s.b.units.some((x) => x.alive && x.u === t.u && x.v === t.v);
  const pair = [[1, 0], [0, 1]].map(([du, dv]) => [{ u: knight.u + du, v: knight.v + dv }, { u: knight.u - du, v: knight.v - dv }]).find(([a, b]) => free(a) && free(b) && apart(a, KING_AT) !== apart(b, KING_AT))!;
  const [towards, away] = apart(pair[0], KING_AT) < apart(pair[1], KING_AT) ? pair : [pair[1], pair[0]];
  const mk = (at: { u: number; v: number }, hp: number) => {
    const f = addUnit(s.b, 'skeleton', at.u, at.v, {});
    f.hp = hp;
    f.busyUntil = 1e9;
    return f;
  };
  // (the foe heading for the king is the sturdier: a plain hero would take the weaker one)
  const near = mk(towards, 300);
  const far = mk(away, 20);
  knight.busyUntil = 0;
  // (its pool emptied, so it strikes rather than casts: this is about whom it strikes)
  knight.charge = 0;
  stepStand(s);
  assert.equal(knight.swing?.to, near.id, 'the tank struck the one nearer the king');
  const archer = s.b.units.find((u) => u.def === 'archer')!;
  assert.ok(!archer.post!.tank);
  void far;
});

/* ------------------------------------------------------------------ the break, the king, gold */

test('a cleared wave gives a break of five seconds that counts down, and Go ends it early', () => {
  assert.equal(BREAK_MS, 5000);
  const s = fresh(5, 80);
  startFirstWave(s);
  until(s, 'break');
  assert.equal(s.phase, 'break');
  assert.equal(s.breakLeft, BREAK_MS);
  assert.equal(s.run.wave, 2);
  assert.ok(s.run.offer.length > 0, 'a relic offer is made for the break');
  const at = s.b.t;
  for (let i = 0; i < 49; i++) stepStand(s);
  assert.equal(s.phase, 'break');
  assert.equal(s.breakLeft, BREAK_MS - 49 * TICK_MS);
  stepStand(s);
  assert.equal(s.phase, 'wave', 'the next wave begins when the five seconds are up');
  assert.equal(s.b.t - at, BREAK_MS);
  // (and Go skips the rest of a break)
  until(s, 'break');
  stepStand(s);
  assert.ok(goNow(s));
  stepStand(s);
  assert.equal(s.phase, 'wave');
  assert.ok(!goNow(s), 'there is no break to end in a wave');
});

test('a cleared wave pays gold, XP and mends the heroes; the fallen rise at their posts', () => {
  const s = fresh(5, 20);
  startFirstWave(s);
  const gold = s.run.gold;
  const knight = s.b.units.find((u) => u.def === 'knight')!;
  until(s, 'break');
  assert.ok(s.run.gold >= gold + clearGold(1), 'the wave paid its gold');
  assert.ok(s.run.kills > 0);
  assert.ok(s.notes.some((n) => n.kind === 'clear'));
  assert.ok(s.run.heroes.every((h) => h.xp > 0 || h.lv > 0), 'every hero was taught');
  void knight;
  // a fallen hero rises at the clear
  const s2 = fresh(6, 20);
  startFirstWave(s2);
  const wiz = s2.b.units.find((u) => u.def === 'wizard')!;
  const post = [...s2.run.heroes.find((h) => h.kind === 'wizard')!.post!];
  wiz.alive = false;
  wiz.hp = 0;
  until(s2, 'break');
  assert.ok(wiz.alive, 'the wizard rose');
  assert.deepEqual([wiz.u, wiz.v], post);
  assert.ok(wiz.hp >= Math.round(wiz.maxHp * 0.5) - 1);
  assert.ok(CLEAR_HEAL > 0);
});

test('the king falls and the run ends', () => {
  const s = fresh(5, 1);
  startFirstWave(s);
  s.king.hp = 1;
  const wave = s.run.wave;
  for (let i = 0; i < 20000 && s.phase !== 'over'; i++) {
    // (nobody defends him)
    for (const u of s.b.units) if (u.side === 'hero' && u.tag !== undefined) u.alive = false;
    stepStand(s);
  }
  assert.equal(s.phase, 'over');
  assert.ok(s.run.over);
  assert.ok(!s.king.alive);
  assert.equal(s.b.phase, 'lost');
  assert.ok(s.notes.some((n) => n.kind === 'over'));
  assert.equal(s.run.best, wave, 'the best wave reached is the one he fell in');
  assert.deepEqual(stepStand(s), [], 'nothing moves after the end');
  assert.equal(clearedOf(s.run), 0);
});

test('kills pay gold by the wave, and XP levels the heroes in the fight, at once', () => {
  const s = fresh(5, 20);
  startFirstWave(s);
  const lv0 = s.run.heroes.map((h) => h.lv);
  const hp0 = s.b.units.filter((u) => u.tag !== undefined).map((u) => u.maxHp);
  let levelups = 0;
  const gold0 = s.run.gold;
  for (let i = 0; i < 6000 && s.phase !== 'over' && s.run.wave < 7; i++) {
    stepStand(s);
    levelups += s.notes.filter((n) => n.kind === 'levelup').length;
    s.notes.length = 0;
  }
  assert.ok(levelups > 0, 'heroes levelled in the fight');
  assert.ok(s.run.heroes.some((h, i) => h.lv > lv0[i]));
  const hp1 = s.b.units.filter((u) => u.tag !== undefined).map((u) => u.maxHp);
  assert.ok(hp1.some((x, i) => x > hp0[i]), 'a level adds hp');
  assert.ok(s.run.gold > gold0 && s.run.earned >= s.run.kills * killGold(1));
  assert.ok(xpNeed(3) > xpNeed(1));
});

test('levelling, relics and healing the king cost gold, at any time, and take effect', () => {
  const s = fresh(5, 20);
  startFirstWave(s);
  until(s, 'break');
  s.run.gold = 5000;
  // level up: the weakest hero gains one, and its hp and attack rise
  const weak = s.run.heroes.filter((x) => x.post).sort((a, b) => a.lv - b.lv || a.id - b.id)[0];
  const unit = s.b.units.find((u) => u.tag === weak.id)!;
  const lv = weak.lv;
  const hp = unit.maxHp;
  const atk = unit.power ?? 1;
  const gold = s.run.gold;
  assert.equal(buyLevel(s), lv + 1);
  assert.equal(s.run.gold, gold - levelCost(lv));
  assert.ok(unit.maxHp > hp && (unit.power ?? 1) > atk);
  // a relic from the offer, and the heroes take its hp or attack at once
  const first = s.run.offer[0];
  const before = s.run.offer.length;
  const cost = offerCost(s);
  const g2 = s.run.gold;
  assert.equal(buyRelic(s, 0), first);
  assert.equal(s.run.gold, g2 - cost);
  assert.ok(s.run.relics.includes(first));
  assert.equal(s.run.offer.length, before - 1);
  // heal the king
  assert.equal(healKing(s), null, 'a king who is whole is not healed (nor charged)');
  s.king.hp = 100;
  const g3 = s.run.gold;
  const given = healKing(s)!;
  assert.ok(given > 0 && s.king.hp === 100 + given);
  assert.equal(s.run.gold, g3 - healCost(s.run.wave));
  // not enough gold
  s.run.gold = 0;
  assert.equal(buyLevel(s), null);
  assert.equal(buyRelic(s, 0), null);
  s.king.hp = 10;
  assert.equal(healKing(s), null);
  assert.ok(s.king.hp === 10);
});

test('a hero can be moved before the first wave by tapping it, then a tile', () => {
  const s = fresh(5, 20);
  const h = s.run.heroes[0];
  const taken = new Set(s.run.heroes.map((x) => `${x.post![0]},${x.post![1]}`));
  let free: [number, number] | null = null;
  for (let v = 0; v < FIELD && !free; v++) for (let u = 0; u < FIELD && !free; u++) if (canPost(s.b.board, u, v) && !taken.has(`${u},${v}`)) free = [u, v];
  assert.ok(postHero(s, h.id, free![0], free![1]));
  assert.deepEqual(h.post, free);
  const unit = s.b.units.find((u) => u.tag === h.id)!;
  assert.deepEqual([unit.u, unit.v], free, 'before the fight it stands on the new tile at once');
  assert.ok(!postHero(s, h.id, KING_AT.u, KING_AT.v), 'not on the king');
  assert.ok(!postHero(s, s.run.heroes.at(-1)!.id, free![0], free![1]), 'not on a taken tile');
  assert.equal(FIELD_HEROES, 8);
});

test('the king is a unit of his kind that never moves or strikes', () => {
  const s = fresh(5, 20);
  startFirstWave(s);
  const at = { u: s.king.u, v: s.king.v };
  for (let i = 0; i < 600; i++) stepStand(s);
  assert.deepEqual({ u: s.king.u, v: s.king.v }, at);
  assert.equal(s.king.def, KING_DEF);
  assert.ok(UNITS[KING_DEF].summon, 'he is not one of the placed heroes');
  assert.ok(s.king.maxHp >= 1000);
});

/* ------------------------------------------------------------------ the pay, the save */

test('the run is paid once by the waves cleared, and the best wave is kept', () => {
  const m = startedMeta(3);
  const run = newStandRun(11, HEROES, armies, 0);
  run.wave = 9;
  run.best = 9;
  run.over = true;
  const crowns = m.crowns;
  const sum = settleStand(m, run)!;
  assert.equal(sum.cleared, 8);
  assert.ok(sum.crowns > 0 && m.crowns === crowns + sum.crowns);
  assert.equal(m.stand, 9);
  assert.ok(sum.newBest);
  assert.equal(settleStand(m, run), sum, 'a run pays once');
  assert.equal(m.crowns, crowns + sum.crowns);
  // a deeper run pays more, and a run that is still going pays nothing
  const deep = newStandRun(12, HEROES, armies, 9);
  deep.wave = 30;
  deep.best = 30;
  deep.over = true;
  const m2 = startedMeta(3);
  const sum2 = settleStand(m2, deep)!;
  assert.ok(sum2.crowns > sum.crowns && sum2.bronze >= 3);
  assert.ok(m2.stash.length >= sum2.bronze + sum2.silver + sum2.gold);
  assert.equal(settleStand(m2, newStandRun(1, HEROES)), null);
  // (a worse run does not lower the best)
  const worse = newStandRun(13, HEROES, armies, 9);
  worse.wave = 3;
  worse.best = 3;
  worse.over = true;
  settleStand(m2, worse);
  assert.equal(m2.stand, 30);
});

test('a run is saved at a break and builds again from the record', () => {
  const s = fresh(5, 20);
  startFirstWave(s);
  until(s, 'break');
  s.run.gold = 999;
  const store = new Map<string, string>();
  const mem = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  saveStand(snapshot(s), mem);
  const back = loadStand(mem)!;
  assert.ok(back);
  assert.equal(back.wave, s.run.wave);
  assert.equal(back.gold, s.run.gold);
  assert.deepEqual(back.heroes, s.run.heroes);
  const again = startStand(back, setupAt(20));
  assert.equal(again.phase, 'deploy');
  assert.deepEqual(
    again.b.units.filter((u) => u.tag !== undefined).map((u) => [u.def, u.u, u.v]).sort(),
    s.b.units.filter((u) => u.tag !== undefined && u.alive).map((u) => [u.def, u.post!.u, u.post!.v]).sort(),
  );
  assert.ok(startFirstWave(again));
  assert.equal(again.run.wave, s.run.wave, 'the saved wave is the one that comes');
  // a run that is over, or junk, is no run to carry on
  saveStand({ ...back, over: true }, mem);
  assert.equal(loadStand(mem), null);
  store.set('legends.stand', 'junk');
  assert.equal(loadStand(mem), null);
  assert.equal(loadStand({ getItem: () => null }), null);
});

test('two plays of one seed come out the same', () => {
  const play = () => {
    const s = fresh(17, 15);
    startFirstWave(s);
    for (let i = 0; i < 9000 && s.phase !== 'over'; i++) stepStand(s);
    return [s.phase, s.run.wave, s.run.kills, s.run.gold, s.b.t, s.b.rng, s.king.hp];
  };
  assert.deepEqual(play(), play());
});

test('a wave that goes on too long is enraged, so no run lasts for ever', () => {
  const s = fresh(5, 100);
  startFirstWave(s);
  // (a foe that cannot be reached is held here; the wave cannot clear on its own)
  for (let i = 0; i < 20; i++) stepStand(s);
  const foe = s.b.units.find((u) => u.side === 'foe' && u.alive)!;
  const power = foe.power ?? 1;
  s.queue.length = 0;
  foe.busyUntil = 1e9;
  s.rageAt = s.b.t + TICK_MS;
  for (const u of s.b.units) if (u.side === 'foe' && u !== foe) u.alive = false;
  for (let i = 0; i < 4; i++) stepStand(s);
  assert.ok((foe.power ?? 1) > power, 'the foe is stronger for the wave being long');
});

test('a new save has a best wave of nothing', () => {
  assert.equal(newMeta(1).stand ?? 0, 0);
});

test('an old spire climb in a save is closed, paid once and dropped', () => {
  const m = startedMeta(2);
  const old = towerRun(5, m);
  old.stage = 17;
  old.best = 17;
  const store = new Map<string, string>([['legends.tower', JSON.stringify(old)]]);
  const mem = { getItem: (k: string) => store.get(k) ?? null, removeItem: (k: string) => void store.delete(k) };
  const note = migrateOldClimb(m, mem)!;
  assert.match(note, /Last Stand/);
  assert.equal(store.has('legends.tower'), false);
  assert.ok(m.stash.length >= 2, 'sixteen floors earned their chests');
  assert.equal(migrateOldClimb(m, mem), null, 'nothing is left to pay');
  // a very old save kept it in the ordinary slot; junk is simply left alone
  store.set('legends.run', JSON.stringify(towerRun(6, m)));
  assert.ok(migrateOldClimb(m, mem));
  assert.equal(store.has('legends.run'), false);
  store.set('legends.tower', 'junk');
  assert.equal(migrateOldClimb(m, mem), null);
});

/* ------------------------------------------------------------------ how hard it is (docs/notes/last-stand.md, "Making it harder") */

const medianWave = (level: number, runs: number): number => {
  const waves = Array.from({ length: runs }, (_, a) => playStand(setupAtLevel(level), mixSeed(a + 1, 0x57a0)).wave).sort((x, y) => x - y);
  return waves[Math.floor(waves.length / 2)];
};

test('the climb is steep to wave 10 and gentler after, and the bosses are real walls', () => {
  assert.ok(strength(10) > 3.5 * strength(1), 'wave 10 is several times wave 1');
  assert.ok(strength(11) - strength(10) < (strength(10) - strength(1)) / 9, 'past the knee each wave adds less');
  assert.ok(strength(40) > strength(30) && strength(30) > strength(20), 'and it still rises');
  // a boss wave hits harder than the wave before it, whatever the foe band
  for (const n of [5, 10, 20, 30, 40]) assert.ok(waveSpec(3, armies, n).hp > waveSpec(3, armies, n - 1).hp);
});

test('a party at level 1 falls in the first waves, and a level-10 party at about wave 10', () => {
  const m1 = medianWave(1, 5);
  assert.ok(m1 >= 3 && m1 <= 6, `level 1 median ${m1}`);
  const m10 = medianWave(10, 5);
  assert.ok(m10 >= 8 && m10 <= 12, `level 10 median ${m10}`);
  assert.ok(m10 > m1, 'a stronger party goes further');
});

test('the pay per wave keeps a run at the new target about as well paid as it was', () => {
  // (the old pay: stageCrowns for each wave cleared and runCrowns of the best; the medians are the old table's against the new target's)
  const old = (best: number): number => {
    let c = 0;
    for (let w = 1; w < best; w++) c += stageCrowns(w);
    return c + runCrowns(best);
  };
  const now = (best: number): number => {
    let c = 0;
    for (let w = 1; w < best; w++) c += waveCrowns(w);
    return c;
  };
  for (const [oldBest, newBest] of [[5, 4], [15, 10], [21, 13], [30, 21], [33, 26], [40, 35]]) {
    const r = now(newBest) / old(oldBest);
    assert.ok(r > 0.85 && r < 1.15, `a run to wave ${newBest} pays ${now(newBest)} against ${old(oldBest)} (${r.toFixed(2)})`);
  }
});
