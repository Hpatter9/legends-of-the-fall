import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readyBattle } from './helpers';
import { addUnit, defenceOf } from '../src/sim/battle';
import { equipItem } from '../src/sim/equipment';
import { heroRank, startedMeta } from '../src/sim/meta';
import { levelOfKind } from '../src/sim/levels';
import { boostOf } from '../src/sim/run';
import { heroFigures } from '../src/sim/power';
import { fightFigures } from '../src/sim/rankStep';
import { heroStats } from '../src/sim/talents';
import { UNITS } from '../src/sim/units';

// The hero sheet's Overview shows Health, Attack and Armour (TACTICS-OVERVIEW): they must be the fight's own, gear and runes included.
const geared = () => {
  const m = startedMeta(3);
  m.unlocked = [...new Set([...m.unlocked, 'knight'])];
  m.xp.knight = 40000;
  m.equipment = [
    { id: 901, base: 'ironSword', rarity: 2, level: 3 },
    { id: 902, base: 'thornplate', rarity: 3, level: 3 },
    { id: 903, base: 'luckyCharm', rarity: 2, level: 3 },
  ] as typeof m.equipment;
  for (const id of [901, 902, 903]) equipItem(m, 'knight', id);
  return m;
};

test('the Overview\'s health, attack and armour are what a placed hero fights with, its gear included', () => {
  const m = geared();
  const eq = heroStats(m, 'knight');
  assert.ok(eq && (eq.hp > 0 || eq.atk > 0 || eq.def > 0), 'the gear adds something');
  const fig = heroFigures(m, 'knight');
  // (placed as the page places a roster hero: `boostOf` at grade 1, its rank, level and kit)
  const b = readyBattle(5);
  const u = addUnit(b, 'knight', 0, b.board.d - 1, boostOf({ id: 1, kind: 'knight', grade: 1 } as never, heroRank(m, 'knight'), levelOfKind(m, 'knight'), eq));
  assert.equal(fig.hp, u.maxHp);
  assert.equal(fig.atk, Math.round(UNITS.knight.atk * (u.power ?? 1)));
  assert.equal(fig.def, defenceOf(u));
});

test('gear raises the Overview\'s figures above the bare hero\'s (the old sheet left it out)', () => {
  const m = geared();
  const eq = heroStats(m, 'knight')!;
  const bare = fightFigures('knight', levelOfKind(m, 'knight'), heroRank(m, 'knight'), eq.scores);
  const fig = heroFigures(m, 'knight');
  if (eq.hp > 0) assert.ok(fig.hp > bare.hp, `${fig.hp} > ${bare.hp}`);
  if (eq.atk > 0) assert.ok(fig.atk > bare.atk, `${fig.atk} > ${bare.atk}`);
  if (eq.def > 0) assert.ok(fig.def > UNITS.knight.def);
  // (with nothing worn the two agree)
  const plain = startedMeta(3);
  plain.xp.knight = 40000;
  assert.deepEqual(heroFigures(plain, 'knight'), { ...fightFigures('knight', levelOfKind(plain, 'knight'), heroRank(plain, 'knight'), heroStats(plain, 'knight')?.scores), def: UNITS.knight.def });
});
