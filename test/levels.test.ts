import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, place, playOut, fight, startBattle } from '../src/sim/battle';
import { fightXp, gainXp, levelBoost, levelGain, levelOf, levelOfKind, MAX_LEVEL, progressOf, XP_TAKE_PART, xpFor, xpOf } from '../src/sim/levels';
import { loadMeta, newMeta } from '../src/sim/meta';
import { gradeBoost } from '../src/sim/run';
import { HEROES, UNITS } from '../src/sim/units';
import { readyBattle } from './helpers';

test('a fight gives every hero that fought XP, and a win pays more', () => {
  const b = readyBattle(4);
  fight(b);
  playOut(b);
  const gains = fightXp(b);
  assert.deepEqual(Object.keys(gains).sort(), [...HEROES].sort());
  for (const k of HEROES) assert.ok(gains[k] >= XP_TAKE_PART, `${k} earned ${gains[k]}`);
  const dealt = b.units.filter((u) => u.side === 'hero').reduce((n, u) => n + (u.dealt ?? 0), 0);
  const kills = b.units.filter((u) => u.side === 'hero').reduce((n, u) => n + (u.kills ?? 0), 0);
  assert.ok(dealt > 0, 'the heroes dealt damage');
  assert.ok(kills > 0, 'the heroes made kills');
  // the same fight read as a win and as a loss: the win pays more for every kind
  const won = fightXp({ ...b, phase: 'won' });
  const lost = fightXp({ ...b, phase: 'lost' });
  for (const k of HEROES) assert.ok(won[k] > lost[k], `${k}: a win pays more`);
  // and the counters are the same every time the seed plays out
  const again = readyBattle(4);
  fight(again);
  playOut(again);
  assert.deepEqual(fightXp(again), gains);
});

test('a fallen hero earns less than one left standing', () => {
  const b = readyBattle(7);
  fight(b);
  playOut(b);
  const u = b.units.find((x) => x.side === 'hero')!;
  const standing = fightXp(b)[u.def];
  const was = u.alive;
  u.alive = false;
  const fallen = fightXp(b)[u.def];
  u.alive = was;
  assert.ok(fallen > 0 && fallen < standing);
});

test('damage, healing and kills each add to a hero\'s XP', () => {
  const b = startBattle(3);
  const h = addUnit(b, 'knight', 0, 8, {}, 1);
  const base = fightXp(b)[h.def] ?? 0;
  h.dealt = 200;
  assert.equal(fightXp(b)[h.def] - base, 10);
  h.healed = 100;
  h.kills = 2;
  assert.equal(fightXp(b)[h.def], base + 10 + 5 + 10);
});

test('the XP curve rises, and a level is read from the XP it takes', () => {
  assert.equal(xpFor(1), 0);
  assert.equal(xpFor(2), 24);
  let step = 0;
  for (let lv = 1; lv < MAX_LEVEL; lv++) {
    const s = xpFor(lv + 1) - xpFor(lv);
    assert.ok(s > step, `level ${lv} to ${lv + 1} costs more`);
    step = s;
  }
  for (let n = 1; n <= MAX_LEVEL; n++) assert.equal(levelOf(xpFor(n)), n);
  assert.equal(levelOf(xpFor(4) - 1), 3);
  assert.equal(levelOf(1e9), MAX_LEVEL);
  assert.deepEqual(progressOf(0), { level: 1, into: 0, need: 24 });
  assert.deepEqual(progressOf(xpFor(MAX_LEVEL)), { level: MAX_LEVEL, into: 0, need: 0 });
});

test('level ups add to the kind\'s stats, and the gains are reported', () => {
  const m = newMeta(1);
  assert.deepEqual(gainXp(m, { knight: 10 }), []);
  assert.equal(levelOfKind(m, 'knight'), 1);
  const ups = gainXp(m, { knight: xpFor(4) });
  assert.deepEqual(ups, [{ kind: 'knight', from: 1, to: 4 }]);
  assert.equal(levelOfKind(m, 'knight'), 4);
  assert.deepEqual(levelGain(1, 4), { hp: 12, atk: 9 });
  assert.deepEqual(levelBoost(1), { hp: 1, atk: 1 });
  assert.ok(Math.abs(levelBoost(MAX_LEVEL).hp - 1.76) < 1e-9);
  assert.ok(Math.abs(levelBoost(MAX_LEVEL).atk - 1.57) < 1e-9);
});

test('a level stacks with the grade and rank in the hero boost, and reaches the fight', () => {
  const plain = gradeBoost(1);
  const lv = gradeBoost(1, 0, 5);
  assert.ok(Math.abs(lv.hp! - levelBoost(5).hp) < 1e-9);
  assert.ok(Math.abs(lv.atk! - levelBoost(5).atk) < 1e-9);
  assert.equal(plain.hp, 1);
  const both = gradeBoost(2, 1, 4);
  assert.ok(Math.abs(both.hp! - 1.6 * 1.05 * levelBoost(4).hp) < 1e-9);
  const b = startBattle(2);
  place(b, 'knight', 0, 8, 1, gradeBoost(1, 0, 5));
  const u = b.units.find((x) => x.side === 'hero')!;
  assert.equal(u.maxHp, Math.round(UNITS.knight.hp * levelBoost(5).hp));
  assert.ok(Math.abs(u.power! - levelBoost(5).atk) < 1e-9);
});

test('old saves load with no XP, and bad XP is dropped', () => {
  const old = { seed: 3, crowns: 40, unlocked: [...HEROES], pulls: 2, dry: 1, shards: {}, stars: {}, castle: {} };
  const store = (raw: string) => ({ getItem: () => raw });
  const fresh = loadMeta(3, store(JSON.stringify(old)));
  assert.deepEqual(fresh.xp, {});
  assert.equal(levelOfKind(fresh, 'knight'), 1);
  const junk = loadMeta(3, store(JSON.stringify({ ...old, xp: { knight: 50.7, nope: 9, archer: -3, mage: 'a' } })));
  assert.deepEqual(junk.xp, { knight: 50 });
  assert.equal(xpOf(junk, 'archer'), 0);
});
