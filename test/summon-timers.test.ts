// SUMMON-TIMERS (docs/notes/summon-timers.md): a hero's summons and shapes last a timer of fighting time and carry from wave to wave with
// their health and time left; a benched or fallen caller's are dismissed; the Illusionist's decoys stay short and end with the wave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, canPlace, fight, hurt, place, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { deployTiles } from '../src/sim/autoplay';
import { callSummon } from '../src/sim/abilities';
import { boostOf, keepCharges, newRun, startStage, type Owned, type Run } from '../src/sim/run';
import { merge } from '../src/sim/merge';
import { CARRY, keptBoost, RENEW_AT, timeSummon, timerOf, TIMER } from '../src/sim/carry';
import { treeform } from '../src/sim/kits/casters';
import { shift, boundSoul } from '../src/sim/kits/blades';
import { plantStandard } from '../src/sim/kits/callers';
import { UNITS } from '../src/sim/units';

/** A run whose roster is exactly `kinds` (grade 1), ids 1, 2, ... in order, all in the squad. */
function rosterOf(...kinds: string[]): Run {
  const r = newRun(1);
  r.roster = kinds.map((kind, i): Owned => ({ id: i + 1, kind, grade: 1 }));
  r.nextId = kinds.length + 1;
  r.squad = r.roster.map((h) => h.id);
  return r;
}

/** The run's next wave, with `heroes` (roster ids) placed on the first free deploy tiles, and the fight begun. */
function wave(r: Run, heroes: number[]): Battle {
  const b = startStage(r);
  b.units = b.units.filter((u) => u.side !== 'hero');
  for (const id of heroes) {
    const h = r.roster.find((x) => x.id === id)!;
    const [u, v] = deployTiles(b.board).find(([u, v]) => canPlace(b, h.kind, u, v, id))!;
    assert.ok(place(b, h.kind, u, v, id, boostOf(h)));
  }
  assert.ok(fight(b));
  return b;
}
const heroOf = (b: Battle, id: number): Unit => b.units.find((u) => u.tag === id)!;
const mine = (b: Battle, me: Unit, kind: string) => b.units.filter((u) => u.alive && u.owner === me.id && u.def === kind);
const steps = (b: Battle, n: number) => {
  for (let i = 0; i < n && b.phase === 'fight'; i++) stepBattle(b);
};
/** A foe set down right beside a hero (so a shape that wants a foe near has one). */
function foeBeside(b: Battle, me: Unit): Unit {
  for (const [du, dv] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) {
    const u = me.u + du;
    const v = me.v + dv;
    if (u >= 0 && v >= 0 && u < b.board.w && v < b.board.d && !b.units.some((x) => x.alive && x.u === u && x.v === v)) return addUnit(b, 'orcGrunt', u, v, { hp: 50 });
  }
  throw new Error('no free tile beside the hero');
}

test('a wolf is carried into wave 2 with its health and the time left on its timer, and its timer runs on from there', () => {
  const r = rosterOf('beastmaster');
  const b = wave(r, [1]);
  const bm = heroOf(b, 1);
  assert.ok(callSummon(b, bm, 'wolf', 1));
  const wolf = mine(b, bm, 'wolf')[0];
  assert.equal(wolf.life, TIMER.beast);
  assert.equal(wolf.expires! - b.t, TIMER.beast);
  // (he and the wolf stand through the five seconds whatever the foes do)
  bm.hp = bm.maxHp = wolf.hp = wolf.maxHp = 1e6;
  // (the call above stands for his cast, so his Summon Beast's cooldown runs from it: since the skills overhaul's batch 2 the call costs 28
  // stamina, which he can pay within the five seconds, and he would otherwise call a second wolf)
  bm.ks = { ...bm.ks, at1: b.t };
  steps(b, 50);
  wolf.maxHp = 200;
  wolf.hp = 80;
  const left = wolf.expires! - b.t;
  assert.ok(left > 0 && left < TIMER.beast);
  keepCharges(r, b);
  assert.deepEqual(r.roster[0].summons, [{ kind: 'wolf', hp: wolf.hp / wolf.maxHp, left, full: TIMER.beast }]);
  // (wave 2: the wolf stands beside him from the first tick, with its share of health and its time)
  const next = wave(r, [1]);
  const bm2 = heroOf(next, 1);
  const [w2] = mine(next, bm2, 'wolf');
  assert.ok(w2, 'the wolf stands again');
  assert.equal(Math.abs(w2.u - bm2.u) + Math.abs(w2.v - bm2.v) <= 4, true);
  assert.equal(Math.round((w2.hp / w2.maxHp) * 100), 40);
  assert.ok(w2.maxHp < 1e6, 'its health is a share of a wolf of this wave');
  assert.equal(w2.expires! - next.t, left);
  assert.deepEqual(timerOf(w2, next.t), { left, full: TIMER.beast, shape: false });
});

test('a summon fades when its timer runs out', () => {
  const r = rosterOf('beastmaster');
  const b = wave(r, [1]);
  const bm = heroOf(b, 1);
  callSummon(b, bm, 'wolf', 1);
  const wolf = mine(b, bm, 'wolf')[0];
  timeSummon(b, wolf, 500);
  steps(b, 8);
  assert.equal(wolf.alive, false);
});

test('a benched caller’s summons are dismissed; a fallen caller’s are not kept', () => {
  const r = rosterOf('beastmaster', 'knight');
  const b = wave(r, [1, 2]);
  callSummon(b, heroOf(b, 1), 'wolf', 1);
  keepCharges(r, b);
  assert.equal(r.roster[0].summons?.length, 1);
  // (wave 2 without him: no wolf comes, and once that wave is won nothing of his is kept)
  const next = wave(r, [2]);
  assert.equal(next.units.some((u) => u.def === 'wolf'), false);
  keepCharges(r, next);
  assert.equal(r.roster[0].summons, undefined);
  // (a caller that fell: its wolf fights on to the wave's end, but is not kept)
  const third = wave(r, [1, 2]);
  const bm = heroOf(third, 1);
  callSummon(third, bm, 'wolf', 1);
  bm.alive = false;
  keepCharges(r, third);
  assert.equal(r.roster[0].summons, undefined);
});

test('a merge: the hero that stays keeps its own summons, and the one merged into it brings none', () => {
  const r = rosterOf('beastmaster', 'beastmaster');
  r.roster[0].summons = [{ kind: 'wolf', hp: 1, left: 9000, full: TIMER.beast }];
  r.roster[1].summons = [{ kind: 'wolf', hp: 0.5, left: 3000, full: TIMER.beast }];
  merge(r, 1, 2);
  assert.deepEqual(r.roster.map((h) => h.summons), [[{ kind: 'wolf', hp: 0.5, left: 3000, full: TIMER.beast }]]);
});

test('the Illusionist’s decoys stay short and end with the wave', () => {
  const r = rosterOf('illusionist');
  const b = wave(r, [1]);
  const me = heroOf(b, 1);
  const d = addUnit(b, 'decoy', me.u, me.v - 1);
  d.owner = me.id;
  d.expires = b.t + 3000;
  assert.equal(timerOf(d, b.t), null);
  keepCharges(r, b);
  assert.equal(r.roster[0].summons, undefined);
});

test('the shapes carry: the Werewolf’s form, the Druid’s Wild Shape and the Demon Swordsman’s form come back with their time left', () => {
  const r = rosterOf('werewolf', 'druid', 'demonSwordsman');
  const b = wave(r, [1, 2, 3]);
  const out: BattleEvent[] = [];
  const wolf = heroOf(b, 1);
  foeBeside(b, wolf);
  assert.ok(shift(b, wolf, out));
  assert.equal(wolf.kx!.wolfUntil! - b.t, TIMER.wolfForm);
  const druid = heroOf(b, 2);
  foeBeside(b, druid);
  const plain = druid.maxHp;
  assert.ok(treeform(b, druid, out));
  assert.equal(druid.kx!.tree!.until - b.t, TIMER.wildShape);
  const demon = heroOf(b, 3);
  demon.power = (demon.power ?? 1) * 1.5;
  demon.form = { until: b.t + 8000, ms: TIMER.demon };
  steps(b, 20);
  const wolfLeft = wolf.kx!.wolfUntil! - b.t;
  const treeLeft = druid.kx!.tree!.until - b.t;
  keepCharges(r, b);
  assert.deepEqual(r.roster[0].form?.map((f) => [f.key, f.wolf, f.left]), [['wolf', wolf.kx!.wolf, wolfLeft]]);
  assert.deepEqual(r.roster[1].form?.map((f) => [f.key, f.left]), [['tree', treeLeft]]);
  assert.deepEqual(r.roster[2].form?.map((f) => f.key), ['demon']);
  const next = wave(r, [1, 2, 3]);
  const w2 = heroOf(next, 1);
  assert.equal(w2.kx!.wolf, r.roster[0].form![0].wolf);
  assert.equal(w2.kx!.wolfUntil! - next.t, wolfLeft);
  assert.equal(w2.look, w2.kx!.wolf === 'brute' ? 'werewolf_black' : 'werewolf_white');
  const d2 = heroOf(next, 2);
  assert.equal(d2.kx!.tree!.until - next.t, treeLeft);
  assert.ok(d2.maxHp > plain, 'she is a treant again, with its health');
  const s2 = heroOf(next, 3);
  assert.ok(s2.form && s2.form.until - next.t > 0);
  assert.ok((s2.power ?? 1) >= 1.5);
});

test('the Werewolf’s form runs out after its time, and a hero that falls loses its shape at once', () => {
  const r = rosterOf('werewolf', 'druid');
  const b = wave(r, [1, 2]);
  const out: BattleEvent[] = [];
  const wolf = heroOf(b, 1);
  foeBeside(b, wolf);
  shift(b, wolf, out);
  wolf.kx!.wolfUntil = b.t + 300;
  steps(b, 5);
  assert.equal(wolf.kx!.wolf, undefined);
  const druid = heroOf(b, 2);
  const plain = druid.maxHp;
  foeBeside(b, druid);
  treeform(b, druid, out);
  const foe = foeBeside(b, druid);
  druid.hp = 1;
  druid.guardUntil = undefined;
  // (a killing blow: the treeform's health goes with it)
  hurt(b, foe, druid, 999999, true, false, out);
  assert.equal(druid.alive, false);
  assert.equal(druid.kx!.tree, undefined);
  assert.equal(druid.maxHp, plain);
  keepCharges(r, b);
  assert.equal(r.roster[1].form, undefined);
});

test('a call at the summons’ cap renews the one nearest its end only once it has a quarter of its time left', () => {
  const r = rosterOf('druid');
  const b = wave(r, [1]);
  const me = heroOf(b, 1);
  assert.ok(callSummon(b, me, 'treant', 0));
  const t = mine(b, me, 'treant')[0];
  assert.equal(callSummon(b, me, 'treant', 0), false, 'at its cap with most of its time left: no call');
  t.expires = b.t + Math.floor(TIMER.beast * RENEW_AT) - 100;
  assert.ok(callSummon(b, me, 'treant', 0));
  assert.equal(mine(b, me, 'treant').length, 1);
  assert.equal(t.expires - b.t, TIMER.beast);
});

test('the Reaper’s wraith and the Commander’s standard last 20s and 30s, and carry', () => {
  const r = rosterOf('reaper', 'samuraiCommander', 'knight');
  const b = wave(r, [1, 2, 3]);
  const out: BattleEvent[] = [];
  const reaper = heroOf(b, 1);
  const body = foeBeside(b, reaper);
  body.alive = false;
  body.diedAt = b.t;
  assert.ok(boundSoul(b, reaper, out));
  const wraith = mine(b, reaper, 'wraith')[0];
  assert.equal(wraith.expires! - b.t, TIMER.wraith);
  const cmd = heroOf(b, 2);
  const knight = heroOf(b, 3);
  // (the standard wants a friend within 3 and a foe within 6)
  knight.u = cmd.u;
  knight.v = cmd.v + (cmd.v + 1 < b.board.d ? 1 : -1);
  foeBeside(b, cmd);
  assert.ok(plantStandard(b, cmd, out));
  const std = mine(b, cmd, 'standard')[0];
  assert.equal(std.expires! - b.t, TIMER.standard);
  keepCharges(r, b);
  assert.equal(r.roster[0].summons?.[0].kind, 'wraith');
  assert.equal(r.roster[0].summons?.[0].look, wraith.look);
  assert.equal(r.roster[1].summons?.[0].kind, 'standard');
  const next = wave(r, [1, 2, 3]);
  const w2 = mine(next, heroOf(next, 1), 'wraith')[0];
  assert.ok(w2);
  assert.equal(w2.maxHp, wraith.maxHp);
  assert.equal(w2.look, wraith.look);
  assert.ok(mine(next, heroOf(next, 2), 'standard')[0]);
  assert.ok(next.kits?.standards);
});

test('with the carry off nothing is kept, and an old save’s nonsense is dropped', () => {
  const r = rosterOf('beastmaster');
  const b = wave(r, [1]);
  callSummon(b, heroOf(b, 1), 'wolf', 1);
  CARRY.on = false;
  try {
    keepCharges(r, b);
  } finally {
    CARRY.on = true;
  }
  assert.equal(r.roster[0].summons, undefined);
  const h: Owned = { id: 9, kind: 'beastmaster', grade: 1, summons: [{ kind: 'dragon', hp: 1, left: 5000, full: 9000 }, { kind: 'wolf', hp: 1, left: -5, full: 9000 }], form: [{ key: 'guise', left: 4000, full: 15000, def: 'nobody' }] };
  assert.deepEqual(keptBoost(h), {});
  assert.ok(UNITS.wolf.summon);
});
