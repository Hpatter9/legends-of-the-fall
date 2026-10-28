// The Last Stand overhaul (STAND-003, docs/notes/stand-overhaul.md): the hunt of a wave's last foes, the fallen who stay down, and the
// pause sheet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, apart, type Unit } from '../src/sim/battle';
import { tileAt, standable } from '../src/sim/board';
import { KING_AT, ringOf } from '../src/sim/standField';
import {
  buyLevel, HUNT_AT, levelBlock, loadStand, newStandRun, postHero, saveStand, snapshot, startFirstWave, startStand, stepStand, weakestHero, type Stand, type StandSetup,
} from '../src/sim/stand';
import { standSheet } from '../src/sim/standSheet';
import { castSpell, fallenIn, SPELLS } from '../src/sim/spells';
import { gradeBoost } from '../src/sim/run';
import { newCastle } from '../src/sim/castle';
import { ARMIES } from '../src/sim/armies';
import { ULT_LEVEL } from '../src/sim/abilities';
import { SKILL2_LEVEL } from '../src/sim/heroKits';

const setupAt = (level: number): StandSetup => ({ boost: () => gradeBoost(1, 0, level), castle: newCastle() });
const armies = ARMIES.map((a) => a.id);
const EIGHT = ['knight', 'paladin', 'samurai', 'kunoichi', 'archer', 'ranger', 'wizard', 'cleric'];
const fresh = (seed = 5, level = 20, party = EIGHT): Stand => startStand(newStandRun(seed, party, armies), setupAt(level));
const heroes = (s: Stand): Unit[] => s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined);
function until(s: Stand, phase: Stand['phase'], max = 20000): void {
  for (let i = 0; i < max && s.phase !== phase && s.phase !== 'over'; i++) stepStand(s);
}

/** A free, standable tile far from every post (in the field's corner quarter, at least `ring` from the king). */
function farTile(s: Stand, ring: number): { u: number; v: number } {
  for (let v = 1; v < 23; v++)
    for (let u = 1; u < 23; u++) {
      const at = { u, v };
      if (ringOf(at) < ring || !standable(tileAt(s.b.board, u, v)) || s.b.units.some((x) => x.alive && x.u === u && x.v === v)) continue;
      if (heroes(s).every((h) => apart(h, at) > h.post!.leash + 3)) return at;
    }
  throw new Error('no far tile');
}

/* ------------------------------------------------------------------ the hunt */

test('a wave down to its last foes is hunted: the heroes leave their posts, finish it, and walk home after', () => {
  assert.equal(HUNT_AT, 2);
  const s = fresh(5, 60);
  startFirstWave(s);
  // (the wave's foes are all gone but one, held still far from every post: no hero's zone reaches it)
  s.queue.length = 0;
  for (const u of s.b.units) if (u.side === 'foe') u.alive = false;
  const at = farTile(s, 9);
  const foe = addUnit(s.b, 'skeleton', at.u, at.v, {});
  foe.busyUntil = 1e12;
  const posts = new Map(heroes(s).map((h) => [h.id, { u: h.post!.u, v: h.post!.v }]));
  stepStand(s);
  assert.ok(s.b.stand!.hunt, 'the hunt is on');
  assert.ok(s.notes.some((n) => n.kind === 'hunt'), 'and the page is told');
  let strayed = 0;
  for (let i = 0; i < 1200 && s.phase === 'wave'; i++) {
    stepStand(s);
    for (const h of heroes(s)) strayed = Math.max(strayed, apart(h, posts.get(h.id)!) - h.post!.leash);
  }
  assert.equal(s.phase, 'break', 'the last foe was hunted down and the wave cleared');
  assert.ok(!foe.alive);
  assert.ok(strayed >= 2, `a hero went well past its leash to do it (${strayed})`);
  assert.ok(!s.b.stand!.hunt, 'the hunt ends with the wave');
  // (in the break, and on into the next wave, they walk home)
  for (let i = 0; i < 400; i++) {
    stepStand(s);
    if (heroes(s).every((h) => !h.alive || apart(h, posts.get(h.id)!) <= h.post!.leash)) break;
  }
  for (const h of heroes(s)) if (h.alive) assert.ok(apart(h, posts.get(h.id)!) <= h.post!.leash, `${h.def} is back within its leash`);
});

test('the hunt waits for the last foes: none while more than HUNT_AT are on the field, or any are still to come', () => {
  const s = fresh(5, 60);
  startFirstWave(s);
  for (let i = 0; i < 5; i++) stepStand(s);
  assert.ok(s.queue.length > 0);
  assert.ok(!s.b.stand!.hunt, 'not while foes are still coming in');
  s.queue.length = 0;
  for (const u of s.b.units) if (u.side === 'foe') u.alive = false;
  const spots = [farTile(s, 9)];
  const a = addUnit(s.b, 'skeleton', spots[0].u, spots[0].v, {});
  const free = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1]].map(([du, dv]) => ({ u: a.u + du, v: a.v + dv })).filter((t) => standable(tileAt(s.b.board, t.u, t.v)) && !s.b.units.some((x) => x.alive && x.u === t.u && x.v === t.v));
  for (const t of free.slice(0, HUNT_AT)) addUnit(s.b, 'skeleton', t.u, t.v, {});
  for (const u of s.b.units) if (u.side === 'foe') u.busyUntil = 1e12;
  stepStand(s);
  assert.equal(s.b.units.filter((u) => u.alive && u.side === 'foe').length, HUNT_AT + 1);
  assert.ok(!s.b.stand!.hunt, `not with ${HUNT_AT + 1} on the field`);
  free.slice(0, 1).forEach(() => (s.b.units.find((u) => u.alive && u.side === 'foe')!.alive = false));
  stepStand(s);
  assert.ok(s.b.stand!.hunt, `on at ${HUNT_AT}`);
});

test('two plays of one seed with the hunt still come out the same', () => {
  const play = () => {
    const s = fresh(23, 30);
    startFirstWave(s);
    let hunts = 0;
    for (let i = 0; i < 12000 && s.phase !== 'over'; i++) {
      stepStand(s);
      hunts += s.notes.filter((n) => n.kind === 'hunt').length;
      s.notes.length = 0;
    }
    return [s.phase, s.run.wave, s.run.kills, s.run.gold, s.b.t, s.b.rng, s.king.hp, hunts];
  };
  const a = play();
  assert.deepEqual(a, play());
  assert.ok((a[7] as number) > 0, 'the hunt happened');
});

/* ------------------------------------------------------------------ the fallen stay down */

test('a hero who falls stays down for the rest of the run: no rising, no XP, no levels, no new post', () => {
  const s = fresh(6, 20);
  startFirstWave(s);
  const wiz = heroes(s).find((u) => u.def === 'wizard')!;
  const h = s.run.heroes.find((x) => x.kind === 'wizard')!;
  wiz.hp = 0;
  wiz.alive = false;
  stepStand(s);
  assert.ok(h.fallen, 'marked fallen at once');
  assert.ok(s.notes.some((n) => n.kind === 'fallen' && n.hero === h.id));
  const xp = h.xp;
  const lv = h.lv;
  for (let w = 0; w < 3 && s.phase !== 'over'; w++) {
    until(s, 'break');
    assert.ok(!wiz.alive, 'still down after the clear');
    until(s, 'wave');
  }
  assert.equal(h.xp, xp, 'the fallen take no XP');
  assert.equal(h.lv, lv);
  s.run.gold = 99999;
  assert.equal(levelBlock(s, h.id), 'none', 'the fallen cannot be levelled');
  assert.equal(buyLevel(s, h.id), null);
  assert.notEqual(weakestHero(s)?.id, h.id, 'and are never the hero a level goes to');
  const free = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([du, dv]) => ({ u: KING_AT.u + 2 * du, v: KING_AT.v + 2 * dv }));
  assert.ok(free.every((t) => !postHero(s, h.id, t.u, t.v)), 'nor moved to a post');
});

test('the fallen stay down when a run is built again from its save, and an older save (no mark) has everyone standing', () => {
  const s = fresh(7, 20);
  startFirstWave(s);
  const cleric = heroes(s).find((u) => u.def === 'cleric')!;
  cleric.hp = 0;
  cleric.alive = false;
  until(s, 'break');
  const store = new Map<string, string>();
  const mem = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
  saveStand(snapshot(s), mem);
  const back = loadStand(mem)!;
  const again = startStand(back, setupAt(20));
  assert.ok(!heroes(again).some((u) => u.def === 'cleric'), 'the cleric is not on the field');
  assert.equal(heroes(again).length, 7);
  // (an older save has no `fallen` on anyone: all eight stand)
  const old = JSON.parse(JSON.stringify(back));
  for (const h of old.heroes) delete h.fallen;
  assert.equal(heroes(startStand(old, setupAt(20))).length, 8);
});

test('neither the king\'s Resurrect nor a resurrection raises the fallen in the Last Stand', () => {
  const s = fresh(8, 40, ['knight', 'paladin', 'samurai', 'priestess', 'archer', 'ranger', 'wizard', 'cleric']);
  startFirstWave(s);
  const knight = heroes(s).find((u) => u.def === 'knight')!;
  knight.hp = 0;
  knight.alive = false;
  stepStand(s);
  s.b.spells.mana = 999;
  for (const k of Object.keys(s.b.spells.ready)) (s.b.spells.ready as Record<string, number>)[k] = 0;
  assert.ok(SPELLS.resurrect);
  // (outside the Last Stand the same tile would lift him)
  const st = s.b.stand;
  s.b.stand = undefined;
  assert.equal(fallenIn(s.b, knight.u, knight.v), knight);
  s.b.stand = st;
  assert.equal(castSpell(s.b, 'resurrect', knight.u, knight.v), false, 'Resurrect has nobody to lift');
  // (the High Priestess's ultimate, fired again and again, only heals)
  const pr = heroes(s).find((u) => u.def === 'priestess')!;
  for (let i = 0; i < 3000 && s.phase !== 'over'; i++) {
    pr.charge2 = 1000;
    stepStand(s);
    assert.ok(!knight.alive, 'the knight stays down');
  }
});

test('with every hero down the run goes on until the king falls', () => {
  const s = fresh(9, 10);
  startFirstWave(s);
  for (const u of heroes(s)) {
    u.hp = 0;
    u.alive = false;
  }
  stepStand(s);
  assert.notEqual(s.phase, 'over', 'the king still stands');
  assert.ok(s.run.heroes.every((h) => h.fallen));
  until(s, 'over', 40000);
  assert.equal(s.phase, 'over');
  assert.ok(!s.king.alive);
});

/* ------------------------------------------------------------------ the pause sheet */

test('the pause sheet lists each hero\'s level, health, pool, attack, defence, kills, skills and ultimate, and the king', () => {
  const s = fresh(5, 35);
  startFirstWave(s);
  for (let i = 0; i < 300; i++) stepStand(s);
  const sheet = standSheet(s);
  assert.equal(sheet.heroes.length, 8);
  assert.equal(sheet.king.maxHp, s.king.maxHp);
  assert.equal(sheet.king.hp, Math.ceil(s.king.hp));
  for (const row of sheet.heroes) {
    assert.ok(row.name && row.level >= 35, row.kind);
    assert.ok(row.maxHp > 0 && row.hp <= row.maxHp);
    assert.ok(row.pool && row.pool.max > 0 && row.pool.now >= 0 && row.pool.now <= row.pool.max);
    assert.ok(row.atk > 0 && row.def >= 0);
    assert.equal(row.skills.length, 2);
    assert.ok(row.skills.every((k) => k.open && k.name && k.cost > 0), 'both skills open at 35');
    assert.ok(row.ult && row.ult.open && row.ult.opens === ULT_LEVEL);
  }
  assert.equal(sheet.heroes.reduce((n, r) => n + r.kills, 0), s.run.kills, 'every kill is credited to a hero');
  // (a low party: skill 2 and the ultimate shut; a fallen hero is marked)
  const low = fresh(5, 5);
  startFirstWave(low);
  heroes(low)[0].alive = false;
  stepStand(low);
  const rows = standSheet(low).heroes;
  assert.ok(rows[0].fallen && rows[0].hp === 0);
  assert.ok(rows.every((r) => !r.skills[1].open && r.skills[1].opens === SKILL2_LEVEL && !r.ult?.open));
});
