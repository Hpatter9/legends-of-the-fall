import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, hurt, place, playOut, fight, startBattle } from '../src/sim/battle';
import { AURA_COLOURS, auraHalo, auraRings } from '../src/render/levelLook';
import { BADGE_LEVELS, BADGE_NAMES, badgeOf, DEEP_SHARE, DIM_SHARE, fightXp, gainXp, killXp, lastingBoost, LATE_SHARE, LATE_XP, levelBoost, levelGain, levelOf, levelOfKind, LATE_LEVEL, MAX_LEVEL, MILESTONES, milestonePoints, OLD_MAX_LEVEL, progressOf, RUN_MAX_LEVEL, XP_TAKE_PART, xpFor, xpOf } from '../src/sim/levels';
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
  // (the old curve, up to 30: each level costs more than the one before. Past 30 the first few are eased in, and the pace tests below cover them)
  for (let lv = 1; lv < OLD_MAX_LEVEL; lv++) {
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
  assert.equal(MAX_LEVEL, 100);
  assert.equal(OLD_MAX_LEVEL, 30);
  // (a run's own levels still stop at 30, however much XP; only a hero kind's lasting level goes on to 100)
  assert.equal(RUN_MAX_LEVEL, 30);
  assert.equal(levelOf(1e9, RUN_MAX_LEVEL), 30);
  assert.equal(levelOf(1e9), MAX_LEVEL);
  // (below 20 the XP curve is the old one; past it each level costs LATE_XP times as much)
  assert.equal(xpFor(20), 30 * 19 * 20);
  assert.equal(xpFor(21) - xpFor(20), LATE_XP * 60 * 20);
  for (let lv = 21; lv < OLD_MAX_LEVEL; lv++) assert.ok(xpFor(lv + 1) - xpFor(lv) > xpFor(lv) - xpFor(lv - 1), `level ${lv + 1} costs more than ${lv}`);
  // (each level past 20 adds LATE_SHARE of a full step, and the milestones add a lump)
  assert.ok(Math.abs(lastingBoost(21).hp - lastingBoost(20).hp - 0.22 * LATE_SHARE) < 1e-9);
  assert.ok(LATE_SHARE > DIM_SHARE, 'the late levels pay more than the ones before them');
  for (const m of MILESTONES) {
    assert.ok(m.level > LATE_LEVEL && m.level <= MAX_LEVEL);
    const step = lastingBoost(m.level).hp - lastingBoost(m.level - 1).hp;
    const share = m.level <= OLD_MAX_LEVEL ? LATE_SHARE : DEEP_SHARE;
    assert.ok(Math.abs(step - (0.22 * share + m.hp)) < 1e-9, `level ${m.level} adds its milestone`);
    const atk = lastingBoost(m.level).atk - lastingBoost(m.level - 1).atk;
    assert.ok(Math.abs(atk - (0.18 * share + m.atk)) < 1e-9, `level ${m.level} adds its attack milestone`);
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

// ---- level 100 (docs/notes/level-100.md) ----

test('levels 1 to 30 keep their XP totals, past 30 the curve is steeper and every level costs something', () => {
  // (the totals every save was made with: a level read from the XP stays the same)
  assert.deepEqual([2, 5, 10, 20, 25, 30].map(xpFor), [60, 600, 2700, 11400, 37800, 70200]);
  for (const xp of [0, 59, 60, 2699, 11399, 11400, 37799, 37800, 70199, 70200]) assert.equal(levelOf(xp), levelOf(xp, 30));
  assert.equal(levelOf(70200), 30);
  assert.equal(levelOf(xpFor(31) - 1), 30);
  assert.equal(levelOf(xpFor(31)), 31);
  // (past 30 the levels are eased in, then each costs more than the one before)
  for (let lv = 31; lv < MAX_LEVEL; lv++) assert.ok(xpFor(lv + 1) > xpFor(lv), `level ${lv + 1} costs XP`);
  for (let lv = 37; lv < MAX_LEVEL; lv++) assert.ok(xpFor(lv + 1) - xpFor(lv) > xpFor(lv) - xpFor(lv - 1), `level ${lv + 1} costs more than ${lv}`);
  assert.ok(xpFor(31) - xpFor(30) > 2 * (xpFor(30) - xpFor(29)), 'the first deep level is a step up');
  assert.ok(xpFor(31) - xpFor(30) < 20 * (xpFor(30) - xpFor(29)), 'but not a wall');
  // (the pace model, `npm run level-pace`, fits these: about two months to 50 and six to 100)
  assert.ok(xpFor(50) > 30 * xpFor(30) / 2 && xpFor(100) > 5 * xpFor(50));
  assert.deepEqual(progressOf(xpFor(MAX_LEVEL)), { level: 100, into: 0, need: 0 });
  assert.equal(progressOf(xpFor(47) + 5).level, 47);
  assert.equal(progressOf(xpFor(47) + 5).into, 5);
  assert.equal(levelOf(1e12), 100);
});

test('the deep milestones: a lump of hp and attack, a talent point and a badge each, at 40 to 100', () => {
  assert.deepEqual(BADGE_LEVELS, [40, 50, 60, 70, 80, 90, 100]);
  assert.deepEqual([1, 30, 39, 40, 49, 50, 99, 100].map(badgeOf), [0, 0, 0, 1, 1, 2, 6, 7]);
  assert.deepEqual([39, 40, 60, 100].map(milestonePoints), [0, 1, 3, 7]);
  // (every deep milestone is bigger than the one before, and each level in between adds only DEEP_SHARE of a step)
  const deep = MILESTONES.filter((m) => m.level > OLD_MAX_LEVEL);
  assert.equal(deep.length, 7);
  for (let i = 1; i < deep.length; i++) assert.ok(deep[i].hp > deep[i - 1].hp && deep[i].atk > deep[i - 1].atk);
  assert.ok(Math.abs(lastingBoost(41).hp - lastingBoost(40).hp - 0.22 * DEEP_SHARE) < 1e-9);
  assert.ok(Math.abs(lastingBoost(41).atk - lastingBoost(40).atk - 0.18 * DEEP_SHARE) < 1e-9);
  // (levels up to 30 are exactly as before)
  assert.ok(Math.abs(lastingBoost(30).hp - (1 + 0.22 * (13 + 0.3 * 10) + 0.15 + 0.25)) < 1e-9);
  assert.ok(Math.abs(lastingBoost(30).atk - (1 + 0.18 * (13 + 0.3 * 10) + 0.12 + 0.2)) < 1e-9);
});

test('a level-100 hero has about 50 to 70 percent more hp and attack than a level-30 one', () => {
  for (const k of ['hp', 'atk'] as const) {
    const more = lastingBoost(100)[k] / lastingBoost(30)[k] - 1;
    assert.ok(more >= 0.5 && more <= 0.7, `${k} ${more}`);
    // (a level-47 hero is part of the way)
    const part = lastingBoost(47)[k] / lastingBoost(30)[k] - 1;
    assert.ok(part > 0.02 && part < more / 2, `${k} at 47: ${part}`);
  }
  assert.deepEqual(levelGain(99, 100), { hp: Math.round((lastingBoost(100).hp - lastingBoost(99).hp) * 100), atk: Math.round((lastingBoost(100).atk - lastingBoost(99).atk) * 100) });
});

test('a run\'s own levels stay at 30: the spire and the Calamity do not see level 100', () => {
  assert.equal(RUN_MAX_LEVEL, 30);
  assert.equal(levelOf(xpFor(80), RUN_MAX_LEVEL), 30);
  assert.equal(levelOfKind(Object.assign(startedMeta(1), { xp: { knight: xpFor(80) } }), 'knight'), 80);
  // (and the in-run boost has not changed: level 30 of it is the old figure)
  assert.ok(Math.abs(levelBoost(30).hp - (1 + 0.22 * (11 + 0.25 * 18))) < 1e-9);
});

test('every badge tier has a name and a steady aura of its own colour: none below level 40, more rings and a halo higher up', () => {
  assert.equal(BADGE_NAMES.length, BADGE_LEVELS.length + 1);
  assert.equal(AURA_COLOURS.length, BADGE_LEVELS.length + 1);
  assert.equal(new Set(AURA_COLOURS.slice(1)).size, BADGE_LEVELS.length, 'a colour for each tier');
  assert.equal(auraRings(badgeOf(39)), 0);
  assert.equal(auraHalo(badgeOf(39)), false);
  let rings = 0;
  for (let tier = 1; tier <= BADGE_LEVELS.length; tier++) {
    assert.ok(auraRings(tier) >= rings && auraRings(tier) >= 1, `tier ${tier}`);
    rings = auraRings(tier);
  }
  assert.equal(auraRings(7), 3);
  assert.equal(auraHalo(4), false);
  assert.equal(auraHalo(5), true);
});
