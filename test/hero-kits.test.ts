// The hero kits' core rules (COMBAT-002, docs/notes/hero-kits.md): pools, refill, costs and gaps, the levels the skills and ultimate open at,
// the ultimate's meter, the player's tap (orders applied at the tick, refused when they should be, lapsing), replays, and Auto against manual.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, fight, place, startBattle, stepBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX, KITS, ULT_LEVEL, keyOf, onStrike, tickStatus, ultimateOf } from '../src/sim/abilities';
import { HERO_KITS, RES, SKILL2_LEVEL, ULT_FILL, canPay, castHero, costOf, heroKitOf, poolOf, regenOf, resMax, resOf } from '../src/sim/heroKits';
import { ORDER_WAIT_MS, canOrderUltimate, orderUltimate, replayLog, type LogEntry } from '../src/sim/orders';
import { gradeBoost } from '../src/sim/run';
import { REST } from '../src/sim/statRest';
import { mixSeed, Rng } from '../src/sim/rng';
import { ALL_HEROES } from '../src/sim/units';
import { deploySpots } from '../tools/heroSweep';

// (these stage the pools' written numbers and the ultimate's written fill: the pools, cooldowns and fill by score, STATS batch 6, are held off
// here and staged in `test/stats-rest.test.ts`)
REST.pools = false;
REST.cooldown = false;
REST.ultFill = false;

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, level = 1): Unit => addUnit(b, def, u, v, level > 1 ? { level } : {});
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end && b.phase === 'fight'; ) out.push(...stepBattle(b));
  return out;
};

test('every hero has one pool: 17 mana and 28 stamina, and summons and foes have none', () => {
  const kits = HERO_KITS();
  assert.equal(Object.keys(kits).length, ALL_HEROES.length);
  for (const h of ALL_HEROES) assert.ok(kits[h], h);
  const mana = ALL_HEROES.filter((h) => kits[h].pool === 'mana');
  assert.equal(mana.length, 17, mana.join());
  assert.equal(ALL_HEROES.length - mana.length, 28);
  const b = arena();
  assert.equal(poolOf(spawn(b, 'wolf', 1, 1)), undefined);
  assert.equal(poolOf(spawn(b, 'skeleton', 2, 2)), undefined);
  assert.equal(poolOf(spawn(b, 'wizard', 3, 3)), 'mana');
  assert.equal(poolOf(spawn(b, 'knight', 4, 4)), 'stamina');
});

test('a hero starts with part of its pool, or what it carried from the last wave', () => {
  const b = arena();
  const k = spawn(b, 'knight', 1, 1);
  const w = spawn(b, 'wizard', 2, 2);
  assert.ok(Math.abs(resOf(k) - RES.STAM_START) < 1e-9);
  assert.ok(Math.abs(resOf(w) - RES.MANA_START) < 1e-9);
  const carried = addUnit(b, 'wizard', 3, 3, { charge: 80 });
  assert.equal(carried.charge, 80, 'the carried share of the pool');
});

test('the pools refill: stamina steadily (none while winded), mana faster while its hero is left alone', () => {
  const b = arena();
  const k = spawn(b, 'knight', 1, 1);
  const w = spawn(b, 'wizard', 5, 5);
  const skel = spawn(b, 'skeleton', 5, 4);
  k.charge = w.charge = 0;
  assert.ok(Math.abs(regenOf(b, k) - RES.STAM_REGEN * RES.PACE) < 1e-9);
  assert.ok(Math.abs(regenOf(b, w) - RES.MANA_REGEN * RES.FOCUS_MULT * RES.PACE) < 1e-9, 'focus while untouched');
  onStrike(b, skel, w, 10, 'blow', false, []);
  assert.ok(Math.abs(regenOf(b, w) - RES.MANA_REGEN * RES.PACE) < 1e-9, 'no focus just after a blow');
  b.t += RES.FOCUS_MS;
  assert.ok(regenOf(b, w) > RES.MANA_REGEN * RES.PACE, 'focus again after 3s');
  for (let i = 0; i < 10; i++) tickStatus(b, []);
  assert.ok(Math.abs(resOf(k) - RES.STAM_REGEN * RES.PACE) < 1e-6, 'a second of refill');
  k.ks = { winded: b.t + 500 };
  assert.equal(regenOf(b, k), 0, 'winded');
  k.charge = CHARGE_MAX;
  for (let i = 0; i < 10; i++) tickStatus(b, []);
  assert.equal(k.charge, CHARGE_MAX, 'full stays full');
});

test('blows feed the pools: a blow dealt for both, a blow taken (or slipped) for stamina only; a splash or a burn feeds nothing', () => {
  const b = arena();
  const k = spawn(b, 'knight', 3, 5);
  const w = spawn(b, 'wizard', 1, 1);
  const skel = spawn(b, 'skeleton', 3, 4);
  k.charge = w.charge = 0;
  onStrike(b, k, skel, 10, 'blow', false, []);
  assert.ok(Math.abs(resOf(k) - RES.STAM_ON_BLOW * RES.PACE) < 1e-9);
  onStrike(b, k, skel, 10, 'blow', true, []);
  assert.ok(Math.abs(resOf(k) - RES.STAM_ON_BLOW * RES.PACE) < 1e-9, 'a splash blow feeds nothing');
  onStrike(b, skel, k, 10, 'blow', false, []);
  assert.ok(Math.abs(resOf(k) - (RES.STAM_ON_BLOW + RES.STAM_ON_HIT) * RES.PACE) < 1e-9);
  onStrike(b, skel, k, 10, 'dot', false, []);
  assert.ok(Math.abs(resOf(k) - (RES.STAM_ON_BLOW + RES.STAM_ON_HIT) * RES.PACE) < 1e-9, 'burning feeds nothing');
  onStrike(b, w, skel, 10, 'blow', false, []);
  assert.ok(Math.abs(resOf(w) - RES.MANA_ON_BLOW * RES.PACE) < 1e-9);
  onStrike(b, skel, w, 10, 'blow', false, []);
  assert.ok(Math.abs(resOf(w) - RES.MANA_ON_BLOW * RES.PACE) < 1e-9, 'mana is not fed by being hit');
});

test('a skill costs its pool, keeps a gap before it goes again, and waits until it can be paid', () => {
  const b = arena();
  const k = spawn(b, 'knight', 3, 5);
  spawn(b, 'skeleton', 3, 3).busyUntil = 1e9;
  const hk = heroKitOf(k)!;
  k.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(castHero(b, k, hk, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Shield Wall'));
  assert.ok(Math.abs(resOf(k) - (RES.STAM_MAX - costOf(k, hk.s1))) < 1e-9, 'paid');
  assert.ok(!canPay(b, k, hk, 1), 'the gap holds it back');
  const gap = hk.s1.cd;
  b.t += gap - 100;
  assert.ok(!canPay(b, k, hk, 1), 'still within the gap');
  b.t += 100;
  assert.ok(canPay(b, k, hk, 1));
  k.charge = 0;
  assert.ok(!canPay(b, k, hk, 1), 'not enough stamina');
  // (emptying a stamina pool winds the hero)
  k.charge = (costOf(k, hk.s1) / RES.STAM_MAX) * CHARGE_MAX;
  b.t += gap;
  assert.ok(castHero(b, k, hk, []));
  assert.ok(k.ks!.winded! > b.t);
});

test('skill 2 opens at level 10, and goes before skill 1 when both can be paid', () => {
  const low = arena();
  const a = spawn(low, 'knight', 3, 5, SKILL2_LEVEL - 1);
  spawn(low, 'skeleton', 3, 4).busyUntil = 1e9;
  a.charge = CHARGE_MAX;
  const out: BattleEvent[] = [];
  castHero(low, a, heroKitOf(a)!, out);
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Shield Wall'), 'below 10, only skill 1');
  const high = arena();
  const c = spawn(high, 'knight', 3, 5, SKILL2_LEVEL);
  spawn(high, 'skeleton', 3, 4).busyUntil = 1e9;
  c.charge = CHARGE_MAX;
  const out2: BattleEvent[] = [];
  castHero(high, c, heroKitOf(c)!, out2);
  assert.ok(out2.some((e) => e.kind === 'skill' && e.name === 'Shield Rush'), 'from 10, skill 2 first');
  // (with skill 2 just cast and the pool too low for it, skill 1 still goes)
  high.t += 2000; // (past Shield Rush's cast and the breath after it)
  c.charge = (costOf(c, heroKitOf(c)!.s1) / RES.STAM_MAX) * CHARGE_MAX + 1;
  const out3: BattleEvent[] = [];
  castHero(high, c, heroKitOf(c)!, out3);
  assert.ok(out3.some((e) => e.kind === 'skill' && e.name === 'Shield Wall'));
});

test('skill 1 is held back when skill 2 is about to be affordable', () => {
  const b = arena();
  const k = spawn(b, 'knight', 3, 5, SKILL2_LEVEL);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  const hk = heroKitOf(k)!;
  // (a whisker short of skill 2: holding it back sees skill 2 cast within the hold)
  k.charge = ((costOf(k, hk.s2) - 0.2) / RES.STAM_MAX) * CHARGE_MAX;
  const out: BattleEvent[] = [];
  assert.ok(!castHero(b, k, hk, out));
  assert.ok(!out.some((e) => e.kind === 'skill'));
  // (but if skill 2 just had nothing to do, skill 1 goes)
  k.ks = { ...k.ks, idle2: b.t };
  assert.ok(castHero(b, k, hk, []));
});

test('a healer with mana keeps its heal in reserve while a friend is badly hurt', () => {
  const b = arena();
  const c = spawn(b, 'cleric', 3, 6, SKILL2_LEVEL);
  const friend = spawn(b, 'knight', 3, 5);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  const hk = heroKitOf(c)!;
  // (enough for Smite, not for Benediction, and Smite would leave too little for it: with the knight badly hurt the Cleric waits)
  c.charge = ((costOf(c, hk.s1) + 5) / RES.MANA_MAX) * CHARGE_MAX;
  friend.hp = Math.round(friend.maxHp * 0.5);
  const out: BattleEvent[] = [];
  assert.ok(!castHero(b, c, hk, out));
  assert.ok(!out.some((e) => e.kind === 'skill'), 'Smite waits');
  // (with nobody badly hurt, Smite goes)
  friend.hp = friend.maxHp;
  assert.ok(castHero(b, c, hk, out));
  assert.ok(out.some((e) => e.kind === 'skill' && e.name === 'Smite'));
});

test('the ultimate opens at level 30, and its meter fills from damage dealt, damage taken and time', () => {
  const low = arena();
  const a = spawn(low, 'knight', 3, 5, ULT_LEVEL - 1);
  const s1 = spawn(low, 'skeleton', 3, 4);
  onStrike(low, s1, a, 50, 'blow', false, []);
  run(low, 200);
  assert.ok(!a.charge2, 'below 30 the meter does not fill');
  const b = arena();
  const k = spawn(b, 'knight', 3, 5, ULT_LEVEL);
  spawn(b, 'skeleton', 3, 4).busyUntil = 1e9;
  k.busyUntil = 1e9;
  const rate = ultimateOf(k)!.tuned!.rate;
  for (let i = 0; i < 10; i++) tickStatus(b, []);
  assert.ok(Math.abs((k.charge2 ?? 0) - ULT_FILL.PER_SEC * rate) < 1e-6, 'a second of time');
  const share = 0.1;
  const b2 = arena();
  const k2 = spawn(b2, 'knight', 3, 5, ULT_LEVEL);
  const f2 = spawn(b2, 'skeleton', 3, 4);
  f2.busyUntil = k2.busyUntil = 1e9;
  const taken = Math.round(k2.maxHp * share);
  // dealt: the knight strikes the skeleton for a tenth of its own health
  const dealtBefore = k2.charge2 ?? 0;
  f2.hp = 10000;
  f2.maxHp = 10000;
  stepHurt(b2, k2, f2, taken);
  assert.ok(Math.abs((k2.charge2 ?? 0) - dealtBefore - ULT_FILL.DEALT * share * rate) < 0.2, `dealt fills ${k2.charge2}`);
  const takenBefore = k2.charge2 ?? 0;
  stepHurt(b2, f2, k2, taken);
  assert.ok(Math.abs((k2.charge2 ?? 0) - takenBefore - ULT_FILL.TAKEN * share * rate) < 0.2, `taken fills ${k2.charge2}`);
  k2.charge2 = 99.99;
  stepHurt(b2, f2, k2, 1);
  assert.equal(k2.charge2, CHARGE_MAX, 'full stays full');
});

import { hurt } from '../src/sim/battle';
/** A raw strike through `hurt` (guards and blocks still apply in `onStrike`, so these use a skill from the side). */
function stepHurt(b: Battle, by: Unit, to: Unit, dmg: number): void {
  const out: BattleEvent[] = [];
  const guard = to.guardUntil;
  to.guardUntil = undefined;
  hurt(b, by, to, dmg, false, false, out, 'dot');
  to.guardUntil = guard;
}

test('Auto off: a full ultimate waits for the tap; the tap is applied at the next tick and fires it', () => {
  const b = arena();
  b.autoUlt = false;
  const k = spawn(b, 'knight', 3, 5, ULT_LEVEL);
  const skel = spawn(b, 'skeleton', 3, 3);
  skel.busyUntil = 1e9;
  k.charge = 0;
  k.charge2 = CHARGE_MAX;
  const quiet = run(b, 500);
  assert.ok(!quiet.some((e) => e.kind === 'skill' && e.name === keyOf(ultimateOf(k)!)), 'manual: it waits');
  assert.equal(k.charge2, CHARGE_MAX);
  assert.ok(orderUltimate(b, k.id));
  assert.ok(!orderUltimate(b, k.id), 'one order at a time');
  assert.equal(k.ultOrder, undefined, 'not applied until the tick');
  const ev = stepBattle(b);
  assert.ok(ev.some((e) => e.kind === 'ultQueued' && e.by === k.id));
  // (the knight may be mid-swing: give it a moment)
  const more = [...ev, ...run(b, 2500)];
  assert.ok(more.some((e) => e.kind === 'skill' && e.name === keyOf(ultimateOf(k)!)));
  assert.ok((k.charge2 ?? 0) < CHARGE_MAX);
  assert.ok(b.log?.some((e) => e.kind === 'ult' && e.unit === k.id));
});

test('Auto on (or unset): a full ultimate fires on its own', () => {
  for (const auto of [true, undefined]) {
    const b = arena();
    if (auto !== undefined) b.autoUlt = auto;
    const k = spawn(b, 'knight', 3, 5, ULT_LEVEL);
    spawn(b, 'skeleton', 3, 3).busyUntil = 1e9;
    k.charge2 = CHARGE_MAX;
    const ev = run(b, 300);
    assert.ok(ev.some((e) => e.kind === 'skill' && e.name === keyOf(ultimateOf(k)!)), String(auto));
  }
});

test('the tap is refused for a summon, a foe, a fallen hero, a locked or unfilled ultimate, or outside a fight', () => {
  const b = arena();
  const k = spawn(b, 'knight', 3, 5, ULT_LEVEL);
  const low = spawn(b, 'samurai', 4, 5, ULT_LEVEL - 1);
  const wolf = spawn(b, 'wolf', 5, 5, ULT_LEVEL);
  const skel = spawn(b, 'skeleton', 3, 3);
  for (const u of [k, low, wolf, skel]) u.charge2 = CHARGE_MAX;
  assert.ok(canOrderUltimate(b, k.id));
  assert.ok(!canOrderUltimate(b, low.id), 'locked');
  assert.ok(!canOrderUltimate(b, wolf.id), 'a summon');
  assert.ok(!canOrderUltimate(b, skel.id), 'a foe');
  assert.ok(!canOrderUltimate(b, 999), 'nobody');
  k.charge2 = 50;
  assert.ok(!orderUltimate(b, k.id), 'not full');
  k.charge2 = CHARGE_MAX;
  k.alive = false;
  assert.ok(!orderUltimate(b, k.id), 'fallen');
  k.alive = true;
  b.phase = 'won';
  assert.ok(!orderUltimate(b, k.id), 'the fight is over');
  assert.equal(b.orders, undefined, 'nothing queued');
});

test('an order whose hero cannot act lapses after the wait, and the meter stays full', () => {
  const b = arena();
  b.autoUlt = false;
  const k = spawn(b, 'knight', 3, 5, ULT_LEVEL);
  spawn(b, 'skeleton', 3, 3).busyUntil = 1e9;
  k.charge2 = CHARGE_MAX;
  k.busyUntil = 1e9;
  k.stunUntil = 1e9;
  assert.ok(orderUltimate(b, k.id));
  const ev = run(b, ORDER_WAIT_MS + 300);
  assert.ok(ev.some((e) => e.kind === 'ultLapse' && e.by === k.id));
  assert.equal(k.ultOrder, undefined);
  assert.equal(k.charge2, CHARGE_MAX);
});

/** A whole fight of five level-30 heroes, Auto off, the player tapping every full ultimate at the first tick it can (and the king casting a heal once). */
function playTapped(seed: number, log?: readonly LogEntry[]): { b: Battle; trace: string } {
  const b = startBattle(seed, 'orcs', { foes: { hp: 6, atk: 2.5 } });
  b.autoUlt = false;
  const spots = deploySpots(b, new Rng(mixSeed(seed, 0xba1a)));
  ['knight', 'reaper', 'werewolf', 'timeWitch', 'dreadPirate'].forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, { ...gradeBoost(1, 0, ULT_LEVEL), charge2: 90 }));
  fight(b);
  let trace = '';
  while (b.phase === 'fight') {
    if (log) replayLog(b, log);
    else {
      for (const u of b.units) if (canOrderUltimate(b, u.id) && (b.t / 100) % 7 === 3) orderUltimate(b, u.id);
    }
    for (const e of stepBattle(b)) if (e.kind === 'hit' || e.kind === 'skill') trace += `${b.t}:${e.kind}:${'by' in e ? e.by : ''};`;
  }
  return { b, trace };
}

test('a fight replays the same from its seed, its placing and its log of orders', () => {
  const first = playTapped(11);
  assert.ok(first.b.log?.some((e) => e.kind === 'ult'), 'some ultimate was tapped');
  const again = playTapped(11, first.b.log);
  assert.equal(again.trace, first.trace);
  assert.equal(again.b.phase, first.b.phase);
  assert.deepEqual(again.b.units.map((u) => [u.hp, u.alive]), first.b.units.map((u) => [u.hp, u.alive]));
  // (and the same taps made twice play out the same)
  assert.equal(playTapped(11).trace, first.trace);
});

// (an ultimate's event carries its key: RPG-SPELLS renamed several, keeping the old names as keys)
test('a manual fight whose player never taps fires no hero ultimate; a headless one fires them', () => {
  const play = (auto?: boolean) => {
    const b = startBattle(5, 'orcs', { foes: { hp: 3, atk: 1.5 } });
    if (auto !== undefined) b.autoUlt = auto;
    const spots = deploySpots(b, new Rng(mixSeed(5, 0xba1a)));
    ['knight', 'samurai', 'archer', 'cleric', 'wizard'].forEach((id, i) => place(b, id, spots[i][0], spots[i][1], undefined, { ...gradeBoost(1, 0, ULT_LEVEL), charge2: 90 }));
    fight(b);
    let ults = 0;
    while (b.phase === 'fight') for (const e of stepBattle(b)) if (e.kind === 'skill' && b.units.some((u) => u.id === e.by && (ultimateOf(u) && keyOf(ultimateOf(u)!)) === e.name)) ults++;
    return ults;
  };
  assert.equal(play(false), 0);
  assert.ok(play() > 0);
});

test('foes keep the old charge meter and skills', () => {
  const b = arena();
  const boss = spawn(b, 'orcWarlord', 3, 3);
  const k = spawn(b, 'knight', 3, 5);
  onStrike(b, boss, k, 10, 'blow', false, []);
  assert.equal(boss.charge, KITS.orcWarlord.skill.dealt);
  assert.equal(heroKitOf(boss), undefined);
});

test('what an old charge gift (a tier rider, a combo beat, a bard\'s tune) gives a pool is a share of it', async () => {
  const { gain } = await import('../src/sim/abilities');
  const { CHARGE_TO_POOL } = await import('../src/sim/heroKits');
  const b = arena();
  const w = spawn(b, 'wizard', 1, 1);
  w.charge = 0;
  gain(w, 40);
  assert.ok(Math.abs(resOf(w) - 40 * CHARGE_TO_POOL * resMax('mana') / CHARGE_MAX) < 1e-9);
});
