import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, fight, playOut, startBattle } from '../src/sim/battle';
import { CALAMITY_XP, CLIMB_XP, fightXpByHero } from '../src/sim/climb';
import { fightXp, KILL_KEEP, killShares, killXp, XP_TAKE_PART } from '../src/sim/levels';
import { readyBattle } from './helpers';

// The kill-XP split (docs/notes/xp-split.md): the killer keeps `KILL_KEEP` of a kill's XP, and the rest is shared evenly by every hero
// that fought, the killer too.

/** A fight of three heroes where only the knight has made a kill (worth 300 XP), read as a loss so no win XP is added. */
function threeHeroes() {
  const b = startBattle(3);
  const killer = addUnit(b, 'knight', 0, 8, {}, 1);
  const other = addUnit(b, 'archer', 2, 8, {}, 2);
  const fallen = addUnit(b, 'cleric', 4, 8, {}, 3);
  fallen.alive = false;
  killer.slain = 300;
  b.phase = 'lost';
  return { b, killer, other, fallen };
}

test('the killer keeps the biggest part of a kill, and the rest is shared by every hero that fought', () => {
  const { b } = threeHeroes();
  const gains = fightXp(b);
  const pool = 300 * (1 - KILL_KEEP);
  assert.equal(gains.knight, Math.round(XP_TAKE_PART + 300 * KILL_KEEP + pool / 3));
  assert.equal(gains.archer, Math.round(XP_TAKE_PART + pool / 3));
  // (a fallen hero fought too, and keeps its share)
  assert.equal(gains.cleric, gains.archer);
  assert.ok(gains.knight > gains.archer && gains.knight > gains.cleric, 'the killer gets more than any other fighter');
  // (the old rule, every kill to the killer, is `keep` 1)
  assert.deepEqual(fightXp(b, 1, 1), { knight: XP_TAKE_PART + 300, archer: XP_TAKE_PART, cleric: XP_TAKE_PART });
});

test('a lone hero gets all its kills', () => {
  const b = startBattle(3);
  const h = addUnit(b, 'knight', 0, 8, {}, 1);
  h.slain = killXp({ def: 'skeleton', maxHp: 320 });
  b.phase = 'lost';
  assert.equal(fightXp(b).knight, XP_TAKE_PART + 32);
  assert.equal(killShares(b).get(h.id), h.slain);
});

test('a hero\'s called-up fighters count as its own kills, and a summon takes no share of the pool', () => {
  const { b, killer, other } = threeHeroes();
  const wolf = addUnit(b, 'knight', 6, 8, {});
  wolf.owner = other.id;
  wolf.slain = 100;
  const shares = killShares(b);
  // (three fighters share the pool: the called-up one is not one of them)
  assert.equal(shares.size, 3);
  assert.equal(shares.has(wolf.id), false);
  const pool = 400 * (1 - KILL_KEEP);
  assert.ok(Math.abs(shares.get(other.id)! - (100 * KILL_KEEP + pool / 3)) < 1e-9);
  assert.ok(Math.abs(shares.get(killer.id)! - (300 * KILL_KEEP + pool / 3)) < 1e-9);
});

test('the split moves XP between the heroes but the fight pays about the same in all', () => {
  for (const seed of [4, 7, 11]) {
    const b = readyBattle(seed);
    fight(b);
    playOut(b);
    const sum = (g: Record<string, number>) => Object.values(g).reduce((n, x) => n + x, 0);
    const split = fightXp(b);
    const old = fightXp(b, 1, 1);
    // (only the rounding, at most half an XP a hero, can differ)
    assert.ok(Math.abs(sum(split) - sum(old)) <= Object.keys(old).length / 2, `seed ${seed}: ${sum(split)} against ${sum(old)}`);
    // (every hero that fought gets a share of the kills, and the one that killed the most still earns the most kill XP)
    const fighters = b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
    const shares = killShares(b);
    const top = fighters.reduce((a, u) => ((u.slain ?? 0) > (a.slain ?? 0) ? u : a));
    for (const u of fighters) {
      assert.ok(shares.get(u.id)! > 0, `seed ${seed}: ${u.def} gets a share`);
      if (u !== top) assert.ok(shares.get(top.id)! >= shares.get(u.id)!, `seed ${seed}: the top killer gets the most`);
    }
    // (and the same fight pays the same every time)
    const again = readyBattle(seed);
    fight(again);
    playOut(again);
    assert.deepEqual(fightXp(again), split);
  }
});

test('the spire and the Calamity split their heroes\' kill XP the same way, hero by hero', () => {
  const { b, killer, other, fallen } = threeHeroes();
  const pool = 300 * (1 - KILL_KEEP);
  for (const climb of [CLIMB_XP, CALAMITY_XP]) {
    const got = fightXpByHero(b, 1, climb);
    assert.equal(got[Number(killer.tag)], Math.round((XP_TAKE_PART + 300 * KILL_KEEP + pool / 3) * climb));
    assert.equal(got[Number(other.tag)], Math.round((XP_TAKE_PART + pool / 3) * climb));
    assert.equal(got[Number(fallen.tag)], got[Number(other.tag)], 'a fallen hero keeps its share');
    assert.ok(got[Number(killer.tag)] > got[Number(other.tag)]);
    // (keep 1 is the old rule: every kill to the killer)
    assert.equal(fightXpByHero(b, 1, climb, 1)[Number(killer.tag)], Math.round((XP_TAKE_PART + 300) * climb));
  }
  // (the pay in all is the old pay, within each hero's rounding)
  const sum = (g: Record<number, number>) => Object.values(g).reduce((n, x) => n + x, 0);
  assert.ok(Math.abs(sum(fightXpByHero(b)) - sum(fightXpByHero(b, 1, CLIMB_XP, 1))) <= 3);
});
