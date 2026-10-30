// The healers' revive and their reworked kits (RPG-SPELLS batch 2, docs/notes/spells-b2.md, docs/notes/rpg-spells-design.md section 2):
// the revive face on skill 2 (from level 10, 30% health, 30 s, once per ally per wave, two a wave, none in the Last Stand, never a summon,
// the nearest fallen first, no ultimate meter from it), Mass Resurrection and its Wall of Light, Spirit Guardians, Healing Mist and the
// Wall of Thorns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, ULT_LEVEL, powered, ultimateOf } from '../src/sim/abilities';
import { castHero, heroKitOf, resOf, reviveCost, reviveReady, RES } from '../src/sim/heroKits';
import { REVIVE, fallenFor } from '../src/sim/kits/revive';
import { setDot } from '../src/sim/ailments';
import { tileAt } from '../src/sim/board';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, level = 1): Unit => addUnit(b, def, u, v, level > 1 ? { level } : {});
/** Fell a fighter where it stands (as `hurt` does). */
const fell = (b: Battle, x: Unit) => {
  x.hp = 0;
  x.alive = false;
  x.diedAt = b.t;
};
const full = (x: Unit) => (x.charge = CHARGE_MAX);
const cast = (b: Battle, me: Unit): BattleEvent[] => {
  const out: BattleEvent[] = [];
  castHero(b, me, heroKitOf(me)!, out);
  return out;
};
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};

test('the four healers have a revive face on skill 2; the others have none', () => {
  const b = arena();
  for (const h of ['cleric', 'priestess', 'wanderer', 'druid']) assert.ok(heroKitOf(spawn(b, h, 0, 0))!.s2.revive, h);
  for (const h of ['paladin', 'knight', 'timeWitch', 'wolfBard']) assert.equal(heroKitOf(spawn(b, h, 1, 1))!.s2.revive, undefined, h);
});

test('a healer at level 10 raises the nearest fallen friend at 30%: cleansed, its pool at its start, its meter empty, up after a moment', () => {
  const b = arena();
  const me = spawn(b, 'cleric', 3, 9, 10);
  const near = spawn(b, 'knight', 3, 8, 30);
  const far = spawn(b, 'archer', 7, 9, 30);
  spawn(b, 'skeleton', 3, 1);
  near.charge2 = 80;
  setDot(b, near, { kind: 'burn', dmg: 3, every: 500, ms: 3000, by: near.id, next: b.t + 500, until: b.t + 3000 });
  fell(b, near);
  fell(b, far);
  full(me);
  assert.ok(reviveReady(b, me));
  const before = resOf(me);
  const out = cast(b, me);
  const rev = out.find((e) => e.kind === 'revive');
  assert.ok(rev && rev.kind === 'revive' && rev.to === near.id && rev.by === me.id, 'the nearest one first');
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Revive: Revivify'));
  assert.ok(near.alive && !far.alive);
  assert.equal(near.hp, Math.round(near.maxHp * REVIVE.SHARE));
  assert.equal(near.ail?.length ?? 0, 0, 'cleansed');
  assert.equal(near.charge2, 0, 'its ultimate meter is empty');
  assert.ok(Math.abs(resOf(near) - RES.STAM_START) < 1e-6, 'its pool is back to its start');
  assert.ok((near.hideUntil ?? 0) >= b.t + REVIVE.RISE_MS && near.busyUntil >= b.t + REVIVE.RISE_MS, 'it cannot be targeted while it gets up');
  assert.ok(Math.abs(before - resOf(me) - reviveCost(heroKitOf(me)!)) < 1e-6, 'it costs skill 2 and 20 more');
  assert.equal(reviveCost(heroKitOf(me)!), 80);
});

test('below level 10 there is no revive; nor when it cannot pay', () => {
  const b = arena();
  const low = spawn(b, 'priestess', 3, 9, 9);
  const x = spawn(b, 'knight', 3, 8);
  spawn(b, 'skeleton', 3, 1);
  fell(b, x);
  full(low);
  assert.ok(!reviveReady(b, low));
  const poor = spawn(b, 'priestess', 4, 9, 10);
  poor.charge = 50;
  assert.ok(!reviveReady(b, poor), 'only 50 mana');
  full(poor);
  assert.ok(reviveReady(b, poor));
});

test("a healer's revive comes round every 30s", () => {
  const b = arena();
  const me = spawn(b, 'wanderer', 3, 9, 10);
  const a = spawn(b, 'knight', 3, 8);
  const c = spawn(b, 'archer', 4, 9);
  spawn(b, 'skeleton', 3, 1).busyUntil = 1e9;
  fell(b, a);
  full(me);
  cast(b, me);
  assert.ok(a.alive);
  fell(b, c);
  full(me);
  assert.ok(!reviveReady(b, me), 'not again so soon');
  b.t += REVIVE.GAP_MS;
  assert.ok(reviveReady(b, me));
  cast(b, me);
  assert.ok(c.alive);
});

test('a friend is raised once a wave at most; and two skill revives a wave, all healers together', () => {
  const b = arena();
  const h1 = spawn(b, 'cleric', 3, 9, 10);
  const h2 = spawn(b, 'druid', 4, 9, 10);
  const h3 = spawn(b, 'priestess', 5, 9, 10);
  const a = spawn(b, 'knight', 3, 8);
  const c = spawn(b, 'archer', 4, 8);
  const d = spawn(b, 'samurai', 5, 8);
  spawn(b, 'skeleton', 3, 1).busyUntil = 1e9;
  fell(b, a);
  full(h1);
  cast(b, h1);
  assert.ok(a.alive);
  fell(b, a);
  full(h2);
  assert.ok(!reviveReady(b, h2), 'the knight was raised already this wave');
  assert.deepEqual(fallenFor(b, h2), []);
  fell(b, c);
  cast(b, h2);
  assert.ok(c.alive, 'the second revive of the wave');
  fell(b, d);
  full(h3);
  assert.ok(!reviveReady(b, h3), 'two skill revives are the wave\'s');
  assert.equal(b.revives, REVIVE.PER_WAVE);
});

test('no revive in the Last Stand, and never a summon, a decoy or the king', () => {
  const b = arena();
  const me = spawn(b, 'cleric', 3, 9, 10);
  const wolf = spawn(b, 'wolf', 3, 8);
  const decoy = spawn(b, 'decoy', 4, 8);
  spawn(b, 'skeleton', 3, 1);
  fell(b, wolf);
  fell(b, decoy);
  full(me);
  assert.ok(!reviveReady(b, me), 'summons stay down');
  const x = spawn(b, 'knight', 2, 8);
  fell(b, x);
  assert.ok(reviveReady(b, me));
  b.stand = { king: 999, at: { u: 0, v: 0 }, fields: {} };
  assert.ok(!reviveReady(b, me), 'the fallen stay down in the Last Stand');
});

test("a revive is the healer's first choice when a friend lies fallen, and fills none of its ultimate's meter", () => {
  const b = arena();
  const me = spawn(b, 'priestess', 3, 9, 30);
  const hurt = spawn(b, 'archer', 4, 9);
  hurt.hp = Math.round(hurt.maxHp * 0.2);
  const x = spawn(b, 'knight', 3, 8);
  spawn(b, 'skeleton', 3, 1).busyUntil = 1e9;
  fell(b, x);
  full(me);
  me.charge2 = 10;
  const out = cast(b, me);
  assert.ok(out.some((e) => e.kind === 'revive'), 'raises before it heals');
  assert.equal(me.charge2, 10, 'no meter from the revive');
});

test('Mass Resurrection raises up to three at 40% (each once a wave), heals the rest, and raises a Wall of Light', () => {
  const b = arena();
  const me = spawn(b, 'priestess', 3, 10, ULT_LEVEL);
  spawn(b, 'wizard', 3, 9);
  const down = [spawn(b, 'knight', 1, 8), spawn(b, 'archer', 2, 8), spawn(b, 'samurai', 4, 8), spawn(b, 'kunoichi', 5, 8)];
  spawn(b, 'skeleton', 3, 6).busyUntil = 1e9;
  spawn(b, 'skeleton', 4, 6).busyUntil = 1e9;
  down.forEach((x) => fell(b, x));
  b.risen = [down[3].id];
  const out: BattleEvent[] = [];
  const ult = ultimateOf(me)!;
  assert.equal(ult.name, 'Mass Resurrection');
  assert.ok(powered(b, me, ult, 0, out));
  const up = down.filter((x) => x.alive);
  assert.equal(up.length, 3);
  assert.ok(!down[3].alive, 'the one already raised this wave stays down');
  for (const x of up) assert.equal(x.hp >= Math.round(x.maxHp * 0.4), true);
  assert.ok(b.walls?.some((w) => w.kind === 'light'), 'a Wall of Light');
});

test('Spirit Guardians circle the Cleric: foes inside are hurt and slowed each second, friends inside heal and are cleansed', () => {
  const b = arena();
  const me = spawn(b, 'cleric', 3, 9, ULT_LEVEL);
  const friend = spawn(b, 'knight', 3, 8);
  const far = spawn(b, 'archer', 7, 1);
  const foe = spawn(b, 'skeleton', 4, 9);
  foe.busyUntil = 1e9;
  friend.hp = Math.round(friend.maxHp / 2);
  far.hp = Math.round(far.maxHp / 2);
  const out: BattleEvent[] = [];
  const ult = ultimateOf(me)!;
  assert.equal(ult.name, 'Spirit Guardians');
  assert.ok(powered(b, me, ult, 0, out));
  assert.ok(out.some((e) => e.kind === 'aura' && e.what === 'Spirit Guardians'));
  me.busyUntil = friend.busyUntil = far.busyUntil = 1e9;
  const [hf, hfar, he] = [friend.hp, far.hp, foe.hp];
  run(b, 1000);
  assert.ok(friend.hp > hf, 'the friend inside heals');
  assert.equal(far.hp, hfar, 'the friend outside does not');
  assert.ok(foe.hp < he, 'the foe inside is hurt');
});

test('Healing Mist guards and heals the friends within 2 of the Wanderer each second, and not the rest', () => {
  const b = arena();
  const me = spawn(b, 'wanderer', 3, 9);
  const near = spawn(b, 'knight', 3, 8);
  const far = spawn(b, 'archer', 7, 1);
  spawn(b, 'skeleton', 0, 0).busyUntil = 1e9;
  near.hp = Math.round(near.maxHp / 2);
  far.hp = Math.round(far.maxHp / 2);
  const out: BattleEvent[] = [];
  assert.equal(KITS.wanderer.skill.name, 'Healing Mist');
  assert.ok(KITS.wanderer.skill.cast(b, me, out));
  assert.ok((near.guardUntil ?? 0) > b.t && !((far.guardUntil ?? 0) > b.t));
  me.busyUntil = near.busyUntil = far.busyUntil = 1e9;
  const [hn, hf] = [near.hp, far.hp];
  run(b, 1000);
  assert.ok(near.hp > hn);
  assert.equal(far.hp, hf);
});

test("the Druid's Wall of Thorns raises treants, heals, and lays thorns across the foes' way", () => {
  const b = arena();
  const me = spawn(b, 'druid', 3, 10, ULT_LEVEL);
  spawn(b, 'wizard', 3, 9);
  spawn(b, 'skeleton', 3, 6).busyUntil = 1e9;
  spawn(b, 'skeleton', 4, 6).busyUntil = 1e9;
  const out: BattleEvent[] = [];
  const ult = ultimateOf(me)!;
  assert.equal(ult.name, 'Wall of Thorns');
  assert.ok(powered(b, me, ult, 0, out));
  assert.ok(b.units.filter((x) => x.alive && x.def === 'treant').length >= 2);
  const thorns = b.walls?.filter((w) => w.kind === 'thorns') ?? [];
  assert.ok(thorns.length >= 2);
  for (const w of thorns) assert.equal(tileAt(b.board, w.i % b.board.w, Math.floor(w.i / b.board.w))!.bar, 'thorns');
});

test('a revive plays the same every time', () => {
  const stage = () => {
    const b = arena();
    const me = spawn(b, 'cleric', 3, 9, 10);
    const a = spawn(b, 'knight', 3, 8, 10);
    spawn(b, 'skeleton', 3, 6);
    spawn(b, 'skeleton', 4, 6);
    full(me);
    fell(b, a);
    run(b, 8000);
    return b.units.map((x) => `${x.def}@${x.u},${x.v}:${x.alive ? x.hp : 'x'}`).join(';');
  };
  assert.equal(stage(), stage());
});
