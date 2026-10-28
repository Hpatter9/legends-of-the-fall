// The armies' pace (ARMY-PACE, `docs/notes/army-pace.md`): the owner's ask, "getting to harder armies is harder; the final armies
// probably won't be clearable before the player clears all the stars on the first army". The late armies' Normal is steep, their
// harder tiers are lifted (`tierLift`) to stay above it, and Mythic and the first four armies are as they were.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, armyById, waveBoost, type Army } from '../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { levelOfKind } from '../src/sim/levels';
import { heroRank } from '../src/sim/meta';
import { mixSeed } from '../src/sim/rng';
import { boostOf, type Owned } from '../src/sim/run';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { playArmy, savedAt } from '../tools/autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);

/** Whether a party at `level` (every talent its level opens, a maxed castle, gear dressed) clears an army's Normal within `cap` tries. */
function clears(army: string, level: number, save: number, cap: number): boolean {
  const meta = savedAt(level, party, save);
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
  for (let n = 0; n < cap; n++) if (playArmy(meta, army, mixSeed(save, 0xa9ace, ARMIES.findIndex((a) => a.id === army) * 100 + n), party, maxed, true, 0, boostFor).cleared) return true;
  return false;
}

test('a tier lift multiplies that tier’s foes, hp and attack, and never Normal’s', () => {
  const golems = armyById('golems')!;
  const plain: Army = { ...golems, tierLift: undefined };
  for (const n of [1, 8, 15]) {
    assert.deepEqual(waveBoost(golems, n, 0), waveBoost(plain, n, 0));
    for (const t of [1, 2, 3, 4]) {
      const lift = golems.tierLift?.[t] ?? 1;
      assert.ok(Math.abs(waveBoost(golems, n, t).foes!.hp! - waveBoost(plain, n, t).foes!.hp! * lift) < 1e-9, `hp wave ${n} tier ${t}`);
      assert.ok(Math.abs(waveBoost(golems, n, t).foes!.atk! - waveBoost(plain, n, t).foes!.atk! * lift) < 1e-9, `atk wave ${n} tier ${t}`);
    }
  }
  // (Mythic is left as it was tuned on every army, and the first five armies have no lift at all)
  for (const a of ARMIES) assert.equal(a.tierLift?.[4] ?? 1, 1, a.id);
  for (const a of ARMIES.slice(0, 5)) assert.equal(a.tierLift, undefined, a.id);
});

test('the early armies are as they were: the first four keep their Normal strength and levels', () => {
  assert.deepEqual(ARMIES.slice(0, 4).map((a) => [a.id, a.level, a.start, a.growth]), [
    ['orcs', 1, 0.39, 0.176],
    ['undead', 8, 1.48, 0.05],
    ['beasts', 15, 1.66, 0.05],
    ['wildwood', 22, 2.01, 0.05],
  ]);
});

test('the late armies climb steeply: each recommended level at least five above the one before from the Labyrinth on, the last in the sixties', () => {
  for (let i = 5; i < ARMIES.length; i++) assert.ok(ARMIES[i].level >= ARMIES[i - 1].level + 5, ARMIES[i].id);
  assert.ok(ARMIES[ARMIES.length - 1].level >= 60);
});

test('the final armies are out of reach of a party at level 45, where the first army’s Mythic is still a wall', () => {
  // (level 45 with every talent and a maxed castle: the first army's Mythic takes about 15 tries there, `tools/army-pace`)
  for (const army of ['infernal', 'yokai', 'golems']) for (const save of [1, 2]) assert.equal(clears(army, 45, save, 3), false, `${army} save ${save}`);
});

test('and a strong party does clear them in the end: the Golem Forge at level 80', () => {
  assert.ok([1, 2].some((save) => clears('golems', 80, save, 3)));
});
