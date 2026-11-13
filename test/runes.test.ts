// SEVEN-SLOT GEAR batch 4: runes, the run's only gear (`runes.ts`, and their place in `runGear.ts` and `run.ts`). The sources draw as
// before, runes merge two into one (a Keystone as a twin), a hero wears three, the bag holds eight, Auto hands them out, a run from before
// finishes on its finds, and at the run's end only a boss's trophy may come home.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/sim/rng';
import { armyRun, catalogueRun, newRun, finish, type Run } from '../src/sim/run';
import type { Gear } from '../src/sim/gear';
import { startedMeta } from '../src/sim/meta';
import { FIND_KEEP, findGear, findsAsGear, keepsFind, runKitStats, bareKitStats, settleFinds, stow, SOURCE, upgradeFound } from '../src/sim/runGear';
import { equipStats } from '../src/sim/equipment';
import {
  BAG_MAX, FLOURISH_S, RUNE_KINDS, RUNE_LEVEL, RUNE_SCALE, RUNE_SIGNATURE, RUNE_STATS, SIGNATURE_S, SOCKETS, addRune, allRunes as allRunesOfState, areTwins, autoRunes, canMerge, mergeAll, mergeRunes, mergesReady, newRunes, readRunes, rollRune, runeStats, setRune, takeOffRune, twinIds, waveGivesRune, type Rune,
} from '../src/sim/runes';
import { ABILITIES } from '../src/sim/equipBases';

const rune = (id: number, kind: Rune['kind'], lv: Rune['lv']): Rune => ({ id, kind, lv });

test('a new run finds runes; a find draws from its source\'s stream exactly what a piece did', () => {
  const run = newRun(5);
  assert.ok(run.runes, 'a run started now is a rune run');
  const old: Run = { ...newRun(5), runes: undefined };
  const a = new Rng(77);
  const b = new Rng(77);
  const g = findGear(run, a, 1, 4, 0, SOURCE.merchant);
  const p = findGear(old, b, 1, 4, 0, SOURCE.merchant);
  assert.ok(g.rune && !g.piece, 'a rune');
  assert.ok(p.piece && !p.rune, 'a run from before still finds a piece');
  assert.equal(g.slot, p.slot, 'the same slot drawn');
  assert.equal(a.next(), b.next(), 'and the stream is where it was');
  // (a better source gives a level II; the same seed the same rune)
  assert.equal(findGear(run, new Rng(1), 2, 4, 1, SOURCE.boss).rune!.lv, 2);
  const s1 = newRunes();
  const s2 = newRunes();
  assert.deepEqual(rollRune(s1, 9, 3, 1, 4, 1), rollRune(s2, 9, 3, 1, 4, 1));
  // (about one in ten is a Keystone: FEWER-RUNES, it was one in fifteen)
  const st = newRunes();
  const keys = Array.from({ length: 1500 }, (_, i) => rollRune(st, 3, i, 1, i, 1)).filter((r) => r.kind === 'keystone').length;
  assert.ok(keys > 105 && keys < 200, `${keys}`);
});

test('a won wave adds a rune on the first, every fourth wave and the last (FEWER-RUNES, RUNE-WAVE-ONE); a boss its own of level II and a trophy for the run\'s end', () => {
  const run = newRun(6);
  finish(run, true);
  assert.equal(run.runes!.bag.length, 1, 'wave 1 gives one (RUNE-WAVE-ONE): the heroes have a rune from wave 2');
  assert.equal(run.runes!.bag[0].lv, 1);
  assert.ok(run.found!.some((l) => /rune I/.test(l)), 'and the wave card lists it');
  finish(run, true);
  assert.equal(run.runes!.bag.length, 1, 'wave 2 gives none');
  run.stage = 4;
  finish(run, true);
  assert.equal(run.runes!.bag.length, 2, 'the fourth wave gives one');
  run.stage = 10;
  finish(run, true);
  assert.equal(run.runes!.bag.length, 3, 'a boss wave: its own rune');
  assert.ok(run.runes!.bag.some((r) => r.lv === 2));
  assert.equal(run.trophies?.length, 1);
  assert.equal(run.pack, undefined, 'no pieces found');
  // (an army's last wave gives one, besides its boss's)
  assert.ok(waveGivesRune(15, 15) && waveGivesRune(10, 10) && !waveGivesRune(14, 15) && waveGivesRune(12, 15) && !waveGivesRune(5, 0));
  assert.ok(waveGivesRune(1, 15) && waveGivesRune(1, 0) && waveGivesRune(1, 1) && !waveGivesRune(2, 15) && !waveGivesRune(3, 15));
  const army = armyRun(8, 'orcs');
  const shares = Array.from({ length: 15 }, (_, i) => waveGivesRune(i + 1, 15)).filter(Boolean).length;
  assert.equal(shares, 5, 'an army of fifteen: waves 1, 4, 8, 12 and 15');
  army.stage = 15;
  finish(army, true);
  assert.equal(army.runes!.bag.length, 2, 'the last wave: its rune and the boss\'s');
});

test('merging: two of a level make the next level where the one dropped onto was, of its kind; a Keystone lifts any rune; V is the top', () => {
  const st = newRunes();
  st.bag.push(rune(1, 'ember', 1), rune(2, 'ember', 1), rune(3, 'hawk', 1), rune(4, 'keystone', 1), rune(5, 'gale', 2), rune(6, 'ember', 5), rune(7, 'ember', 5));
  setRune(st, 'knight', 1);
  assert.deepEqual([...twinIds(st)].sort(), [1, 2, 3, 4, 5], 'twins: the two Embers, and every rune below V with the Keystone');
  // (FEWER-RUNES: two kinds of one level merge, by the player's own drag; they are not twins)
  assert.ok(canMerge(rune(1, 'ember', 1), rune(2, 'hawk', 1)), 'different kinds of one level');
  assert.ok(!areTwins(rune(1, 'ember', 1), rune(2, 'hawk', 1)), 'but no twins');
  assert.ok(!canMerge(rune(1, 'ember', 1), rune(2, 'ember', 2)), 'not two levels');
  assert.ok(!canMerge(rune(6, 'ember', 5), rune(7, 'ember', 5)), 'V does not merge');
  assert.ok(!canMerge(rune(4, 'keystone', 1), rune(6, 'ember', 5)), 'nor with a Keystone');
  assert.ok(!canMerge(rune(4, 'keystone', 1), rune(8, 'keystone', 1)), 'two Keystones do not');
  const made = mergeRunes(st, 2, 1)!;
  assert.deepEqual(made, rune(1, 'ember', 2));
  assert.deepEqual(st.worn.knight, [made], 'on the knight, where the one dropped onto was');
  const wild = mergeRunes(st, 4, 5)!;
  assert.deepEqual(wild, rune(5, 'gale', 3), 'a Keystone of level I lifts a Gale II to III');
  assert.equal(mergeRunes(st, 3, 5), null, 'a Hawk I and a Gale III do not');
  const mixed = mergeRunes(st, 5, 6);
  assert.equal(mixed, null, 'III onto V: no');
  st.bag.push(rune(9, 'arcana', 1));
  assert.deepEqual(mergeRunes(st, 9, 3), rune(3, 'hawk', 2), 'an Arcana I dragged onto a Hawk I makes a Hawk II');
  assert.equal(mergesReady(st), 0);
  // (Merge all: the highest first, Keystones last)
  const all = newRunes();
  all.bag.push(rune(1, 'arcana', 1), rune(2, 'arcana', 1), rune(3, 'arcana', 2), rune(4, 'keystone', 1), rune(5, 'bulwark', 1));
  // (FEWER-RUNES: the Keystone lifts the highest rune, the Arcana II; the two Arcana I make a II; the Bulwark has no twin)
  assert.equal(mergesReady(all), 2);
  mergeAll(all);
  assert.deepEqual(all.bag.map((r) => `${r.kind}${r.lv}`).sort(), ['arcana2', 'arcana3', 'bulwark1']);
});

test('three sockets a hero, any mix; a Keystone is never worn; taking one off is free', () => {
  const st = newRunes();
  for (let i = 1; i <= 5; i++) st.bag.push(rune(i, 'ember', 1));
  st.bag.push(rune(9, 'keystone', 1));
  for (let i = 1; i <= 4; i++) setRune(st, 'knight', i);
  assert.equal(st.worn.knight.length, SOCKETS, 'three at most: the fourth swaps one out');
  assert.equal(setRune(st, 'knight', 9), false);
  assert.ok(takeOffRune(st, 'knight', st.worn.knight[0].id));
  assert.equal(st.worn.knight.length, 2);
  assert.equal(st.bag.length, 4);
});

test('the bag holds eight: a ninth merges with a twin in it, or the lowest is broken for gold', () => {
  const st = newRunes();
  for (let i = 1; i <= BAG_MAX; i++) st.bag.push(rune(i, ['ember', 'bulwark', 'arcana', 'gale', 'hawk', 'wellspring', 'warding', 'ember'][i - 1] as Rune['kind'], i === 8 ? 2 : 1));
  assert.deepEqual(addRune(st, rune(20, 'gale', 1)).merged, rune(4, 'gale', 2));
  assert.equal(st.bag.length, BAG_MAX);
  const r = addRune(st, rune(21, 'hawk', 3));
  assert.equal(r.broke!.lv, 1);
  assert.ok(st.bag.some((x) => x.id === 21));
  // (through a run's stow, the gold is paid)
  const run = newRun(2);
  run.runes!.bag = [...st.bag];
  const gold = run.gold;
  stow(run, { id: 30, slot: 'charm', tier: 1, name: 'x', hp: 0, atk: 0, rune: rune(30, 'arcana', 2) });
  assert.equal(run.gold, gold + 5);
});

test('runes give their numbers in the fight, on top of the kit, by level', () => {
  assert.equal(runeStats(undefined), undefined);
  const s = runeStats([rune(1, 'ember', 3), rune(2, 'bulwark', 1), rune(3, 'arcana', 2)])!;
  const k = RUNE_SCALE.k;
  // (FEWER-RUNES: level I's numbers are about four times the old: Ember I +14% attack, Bulwark I +3 defence and +14% hp, Arcana I +15%)
  assert.ok(Math.abs(s.atk - RUNE_STATS.ember.atk! * RUNE_LEVEL[3] * k) < 1e-9);
  assert.ok(RUNE_STATS.ember.atk! * k >= 0.12 && RUNE_STATS.hawk.crit! * k >= 0.1, 'level I is felt at once');
  assert.ok(Math.abs(s.def - RUNE_STATS.bulwark.def! * k) < 1e-9);
  assert.ok(Math.abs(s.hp - RUNE_STATS.bulwark.hp! * k) < 1e-9);
  assert.ok(Math.abs(s.tal!.pow - RUNE_STATS.arcana.pow! * 2 * k) < 1e-9, 'Arcana is skill power');
  // (every rune carries its kind's signature, stronger by level; level V adds the flourish, stronger than before)
  assert.deepEqual(s.abilities.map((a) => a.id).sort(), ['emberBurst', 'inkWell', 'parryBlow']);
  assert.equal(s.abilities.find((a) => a.id === 'emberBurst')!.s, SIGNATURE_S[3]);
  const two = runeStats([rune(1, 'hawk', 1), rune(2, 'hawk', 3)])!;
  assert.deepEqual(two.abilities, [{ id: 'keenEye', name: RUNE_SIGNATURE.hawk!.name, s: SIGNATURE_S[3] }], 'two of a kind: the stronger signature, once');
  const five = runeStats([rune(1, 'ember', 5)])!;
  assert.ok(five.abilities.some((a) => a.id === 'dragonfire' && a.s === FLOURISH_S) && FLOURISH_S > 0.7, 'a level V flourish');
  for (const kind of RUNE_KINDS) assert.ok(ABILITIES[RUNE_SIGNATURE[kind]!.id], `${kind}'s signature is an ability the gear knows`);
  const m = startedMeta(3);
  const run = newRun(3);
  run.runes!.worn.knight = [rune(1, 'ember', 2)];
  const kit = runKitStats(m, run, 'knight', equipStats)!;
  assert.ok(Math.abs(kit.atk - RUNE_STATS.ember.atk! * 2 * k) < 1e-9);
  assert.equal(runKitStats(m, run, 'archer', equipStats), undefined, 'a hero with none is as it was');
  const bare: Run = { ...run, local: true };
  assert.ok(Math.abs(bareKitStats(bare, 'knight')!.atk - RUNE_STATS.ember.atk! * 2 * k) < 1e-9);
});

test('Auto runes merges, then hands the best out by role, three a hero; a rune stays put unless a place is a tenth better', () => {
  const st = newRunes();
  st.bag.push(rune(1, 'bulwark', 1), rune(2, 'bulwark', 1), rune(3, 'hawk', 2), rune(4, 'arcana', 1), rune(5, 'ember', 1), rune(6, 'gale', 1), rune(7, 'keystone', 1));
  autoRunes(st, ['knight', 'archer', 'wizard']);
  assert.ok(st.worn.knight?.some((r) => r.kind === 'bulwark' && r.lv === 2), 'the front-liner takes the merged Bulwark');
  assert.ok(st.worn.archer?.some((r) => r.kind === 'hawk'), 'the shooter the Hawk');
  assert.ok(st.worn.wizard?.some((r) => r.kind === 'arcana'), 'the caster the Arcana');
  assert.ok(Object.values(st.worn).every((l) => l.length <= SOCKETS));
  const again = JSON.stringify(st);
  assert.equal(autoRunes(st, ['knight', 'archer', 'wizard']), 0);
  assert.equal(JSON.stringify(st), again, 'settled');
});

test('the rune-carver raises a rune a level; a run\'s runes read back safely', () => {
  const run = newRun(4);
  run.runes!.bag.push(rune(1, 'ember', 1));
  assert.ok(upgradeFound(run, 1, 3));
  assert.equal(run.runes!.bag[0].lv, 2);
  assert.equal(findsAsGear(run).length, 1);
  assert.deepEqual(readRunes({ bag: [rune(1, 'ember', 2), rune(1, 'gale', 1), { id: 2, kind: 'nope', lv: 1 }], worn: { knight: [rune(3, 'keystone', 1), rune(4, 'hawk', 9 as 1)] }, next: 2 }), { bag: [rune(1, 'ember', 2)], worn: {}, next: 2 });
});

test('the run\'s end: runes are gone; a boss\'s trophy comes home a quarter of the time, always on a first clear', () => {
  const m = startedMeta(8);
  const before = m.equipment?.length ?? 0;
  let home = 0;
  for (let seed = 1; seed <= 80; seed++) {
    const run = newRun(seed);
    run.stage = 10;
    finish(run, true);
    run.over = true;
    home += settleFinds(m, run)!.pieces.length;
  }
  assert.ok(home > 8 && home < 35, `${home} of 80`);
  assert.equal((m.equipment?.length ?? 0) - before, home, 'nothing else came home');
  // (a first clear of an army's tier: always)
  const n = startedMeta(9);
  const run = newRun(1);
  run.mode = { kind: 'army', army: 'orcs', tier: 0 } as Run['mode'];
  stow(run, { id: 40, slot: 'charm', tier: 2, name: 'x', hp: 0, atk: 0, rune: rune(40, 'hawk', 2) }, SOURCE.boss);
  run.cleared = run.over = true;
  n.armies.orcs = { best: 10, won: 10, clears: 1, stars: {} };
  assert.equal(settleFinds(n, run)!.pieces.length, 1);
});

test('FEWER-RUNES: a Calamity fight\'s find is kept one time in three, from the rune side stream; a boss\'s always; nothing else moves', () => {
  const run = newRun(11);
  const g = (id: number): Gear => ({ id, slot: 'charm', tier: 1, name: 'x', hp: 0, atk: 0, rune: rune(id, 'ember', 1) });
  const kept = Array.from({ length: 900 }, (_, i) => keepsFind(run, g(i + 1), 3 + (i % 7), SOURCE.floor)).filter(Boolean).length;
  assert.ok(Math.abs(kept / 900 - FIND_KEEP.share) < 0.06, `${kept}`);
  assert.ok(Array.from({ length: 50 }, (_, i) => keepsFind(run, g(i + 1), 4, SOURCE.boss)).every(Boolean), 'a boss\'s find always');
  const before = JSON.stringify(run);
  keepsFind(run, g(5), 4, SOURCE.elite);
  assert.equal(JSON.stringify(run), before, 'the choice draws from nothing of the run\'s');
  assert.equal(keepsFind(run, g(5), 4, SOURCE.elite), keepsFind(run, g(5), 4, SOURCE.elite), 'the same find, the same answer');
  const piece: Run = { ...newRun(11), runes: undefined };
  assert.ok(keepsFind(piece, { id: 1, slot: 'charm', tier: 1, name: 'x', hp: 0, atk: 0 }, 4, SOURCE.floor), 'a run without runes keeps its finds');
});

test('FEWER-RUNES: a run saved with the old runes loads and carries on, its runes at the new strengths', () => {
  const saved = JSON.parse(JSON.stringify({ ...newRun(12), runes: { bag: [rune(3, 'keystone', 2), rune(4, 'hawk', 1)], worn: { knight: [rune(1, 'ember', 2), rune(2, 'bulwark', 1)] }, next: 5 } }));
  const r = catalogueRun(saved);
  assert.equal(allRunesOfState(r.runes!).length, 4, 'every rune kept');
  const s = runeStats(r.runes!.worn.knight)!;
  assert.ok(Math.abs(s.atk - RUNE_STATS.ember.atk! * 2) < 1e-9 && s.abilities.some((a) => a.id === 'emberBurst'), 'the new numbers and signatures');
  assert.ok(mergeRunes(r.runes!, 3, 4), 'the old Keystone II lifts the Hawk I under the new rule');
  finish(r, true);
  assert.ok(r.stage === 2 && !r.over, 'and the run carries on');
});
