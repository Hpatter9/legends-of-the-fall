import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, hurt, place, playOut, fight, startBattle } from '../src/sim/battle';
import { DIM_SHARE, fightXp, gainXp, killXp, lastingBoost, LATE_SHARE, LATE_XP, levelBoost, levelGain, levelOf, levelOfKind, LATE_LEVEL, MAX_LEVEL, MILESTONES, progressOf, RUN_MAX_LEVEL, XP_TAKE_PART, xpFor, xpOf } from '../src/sim/levels';
import { loadMeta, startedMeta } from '../src/sim/meta';
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

test('a fallen hero keeps all the XP it earned', () => {
  const b = readyBattle(7);
  fight(b);
  playOut(b);
  const u = b.units.find((x) => x.side === 'hero')!;
  // (the hero stands for the first reading, whether or not it fell in this fight)
  const was = u.alive;
  u.alive = true;
  const standing = fightXp(b)[u.def];
  u.alive = false;
  const fallen = fightXp(b)[u.def];
  u.alive = was;
  assert.ok(standing > 0);
  assert.equal(fallen, standing);
});

test('damage, healing and kills each add to a hero\'s XP', () => {
  const b = startBattle(3);
  const h = addUnit(b, 'knight', 0, 8, {}, 1);
  const base = fightXp(b)[h.def] ?? 0;
  h.dealt = 200;
  assert.equal(fightXp(b)[h.def] - base, 5);
  h.healed = 120;
  h.slain = killXp({ def: 'skeleton', maxHp: 320 }) + killXp({ def: 'demonLord', maxHp: 350 });
  assert.equal(fightXp(b)[h.def], base + 5 + 3 + 32 + 105);
});

test('a kill is worth a tenth of the foe\'s max hp, and a boss kill three times that', () => {
  assert.equal(Math.round(killXp({ def: 'skeleton', maxHp: 320 })), 32);
  assert.equal(Math.round(killXp({ def: 'demonLord', maxHp: 350 })), 105);
  assert.equal(Math.round(killXp({ def: 'orcWarlord', maxHp: 2280 })), 684);
});

test('a killing blow adds the foe\'s worth to the killer\'s XP', () => {
  const b = startBattle(3);
  const h = addUnit(b, 'knight', 0, 8, {}, 1);
  const foe = addUnit(b, 'skeleton', 0, 7, {});
  hurt(b, h, foe, foe.hp, false, false, []);
  assert.equal(foe.alive, false);
  assert.equal(h.kills, 1);
  assert.ok(Math.abs((h.slain ?? 0) - killXp(foe)) < 1e-9);
});

test('the XP curve rises, and a level is read from the XP it takes', () => {
  assert.equal(xpFor(1), 0);
  assert.equal(xpFor(2), 60);
  let step = 0;
  for (let lv = 1; lv < MAX_LEVEL; lv++) {
    const s = xpFor(lv + 1) - xpFor(lv);
    assert.ok(s > step, `level ${lv} to ${lv + 1} costs more`);
    step = s;
  }
  for (let n = 1; n <= MAX_LEVEL; n++) assert.equal(levelOf(xpFor(n)), n);
  assert.equal(levelOf(xpFor(4) - 1), 3);
  assert.equal(levelOf(1e9), MAX_LEVEL);
  assert.deepEqual(progressOf(0), { level: 1, into: 0, need: 60 });
  assert.deepEqual(progressOf(xpFor(MAX_LEVEL)), { level: MAX_LEVEL, into: 0, need: 0 });
});

test('level ups add to the kind\'s stats, and the gains are reported', () => {
  const m = startedMeta(1);
  assert.deepEqual(gainXp(m, { knight: 10 }), []);
  assert.equal(levelOfKind(m, 'knight'), 1);
  const ups = gainXp(m, { knight: xpFor(4) });
  assert.deepEqual(ups, [{ kind: 'knight', from: 1, to: 4 }]);
  assert.equal(levelOfKind(m, 'knight'), 4);
  assert.deepEqual(levelGain(1, 4), { hp: 66, atk: 54 });
  assert.deepEqual(levelBoost(1), { hp: 1, atk: 1 });
  // (levels past 12 count a quarter: level 20 is 11 full steps and 8 quarter steps, 13 in all)
  assert.ok(Math.abs(levelBoost(LATE_LEVEL).hp - (1 + 0.22 * 13)) < 1e-9);
  assert.ok(Math.abs(levelBoost(LATE_LEVEL).atk - (1 + 0.18 * 13)) < 1e-9);
  assert.ok(Math.abs(levelBoost(12).hp - (1 + 0.22 * 11)) < 1e-9, 'level 12 is still a full step');
  assert.ok(Math.abs(levelBoost(13).hp - levelBoost(12).hp - 0.22 * DIM_SHARE) < 1e-9, 'level 13 adds a quarter');
});

test('lasting levels are the in-run levels up to 20, then pay more and cost more XP', () => {
  for (let lv = 1; lv <= LATE_LEVEL; lv++) assert.deepEqual(lastingBoost(lv), levelBoost(lv), `level ${lv}`);
  assert.equal(MAX_LEVEL, 30);
  // (a run's own levels stop at the same 30, however much XP)
  assert.equal(RUN_MAX_LEVEL, MAX_LEVEL);
  assert.equal(levelOf(1e9, RUN_MAX_LEVEL), 30);
  assert.equal(levelOf(1e9), MAX_LEVEL);
  // (below 20 the XP curve is the old one; past it each level costs LATE_XP times as much)
  assert.equal(xpFor(20), 30 * 19 * 20);
  assert.equal(xpFor(21) - xpFor(20), LATE_XP * 60 * 20);
  for (let lv = 21; lv < MAX_LEVEL; lv++) assert.ok(xpFor(lv + 1) - xpFor(lv) > xpFor(lv) - xpFor(lv - 1), `level ${lv + 1} costs more than ${lv}`);
  // (each level past 20 adds LATE_SHARE of a full step, and the milestones add a lump)
  assert.ok(Math.abs(lastingBoost(21).hp - lastingBoost(20).hp - 0.22 * LATE_SHARE) < 1e-9);
  assert.ok(LATE_SHARE > DIM_SHARE, 'the late levels pay more than the ones before them');
  for (const m of MILESTONES) {
    assert.ok(m.level > LATE_LEVEL && m.level <= MAX_LEVEL);
    const step = lastingBoost(m.level).hp - lastingBoost(m.level - 1).hp;
    assert.ok(Math.abs(step - (0.22 * LATE_SHARE + m.hp)) < 1e-9, `level ${m.level} adds its milestone`);
  }
  for (let lv = 2; lv <= MAX_LEVEL; lv++) assert.ok(lastingBoost(lv).hp > lastingBoost(lv - 1).hp && lastingBoost(lv).atk > lastingBoost(lv - 1).atk);
  // (the level-up chips: a lasting level reads the lasting gains, a run's own level the in-run ones)
  assert.deepEqual(levelGain(1, 4), { hp: 66, atk: 54 });
  assert.deepEqual(levelGain(24, 25), { hp: Math.round((lastingBoost(25).hp - lastingBoost(24).hp) * 100), atk: Math.round((lastingBoost(25).atk - lastingBoost(24).atk) * 100) });
  assert.deepEqual(levelGain(19, 20, false), levelGain(19, 20));
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
