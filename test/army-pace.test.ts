// The armies' pace (ARMY-PACE, `docs/notes/army-pace.md`): the owner's ask, "getting to harder armies is harder; the final armies
// probably won't be clearable before the player clears all the stars on the first army". The late armies' Normal is steep, their
// harder tiers are lifted (`tierLift`) to stay above it, and the first four armies' Normal is as it was.
// (SPELLS-RETUNE, an owner-approved change of requirement, `docs/notes/spells-retune.md`: every army, the first four included, is now tuned for a
// player whose Auto casts the king's spells, and the cells below are measured with the greedy player casting them, `botSpells`.)
import { test } from 'node:test';
import { TIERS } from '../src/sim/tiers';
import assert from 'node:assert/strict';
import { ARMIES, armyById, armyXpShare, waveBoost, type Army } from '../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId, type Castle } from '../src/sim/castle';
import { levelOfKind } from '../src/sim/levels';
import { heroRank } from '../src/sim/meta';
import { mixSeed } from '../src/sim/rng';
import { boostOf, type Owned } from '../src/sim/run';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { playArmy, savedAt } from '../tools/autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
/** A castle of `n` levels spread over its buildings, the lowest first (the castle a climb has: 17 levels at about hero level 45, every one at 80, `tools/army-pace`). */
function castleOf(n: number): Castle {
  const c = newCastle();
  const ids = Object.keys(BUILDINGS) as BuildingId[];
  for (let i = 0; i < n; i++) {
    const open = ids.filter((id) => c[id] < maxLevel(id)).sort((a, b) => c[a] - c[b]);
    if (open.length) c[open[0]]++;
  }
  return c;
}

/** Whether a party at `level` (every talent its level opens, a castle of `built` levels, gear dressed) clears an army's Normal within `cap` tries. */
function clears(army: string, level: number, save: number, cap: number, built: number): boolean {
  const castle = castleOf(built);
  const meta = savedAt(level, party, save);
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
  for (let n = 0; n < cap; n++) if (playArmy(meta, army, mixSeed(save, 0xa9ace, ARMIES.findIndex((a) => a.id === army) * 100 + n), party, castle, true, 0, boostFor).cleared) return true;
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
  // (the first four armies have no lift at all. Until ULT-CHARGE Mythic was 1 on every army and the Labyrinth unlifted; with the ultimates at full
  // strength the tiers' own Legendary and Mythic rose for the first army's stars, and the later armies' lifts take some of that back:
  // `docs/notes/ult-charge.md`)
  for (const a of ARMIES.slice(0, 4)) assert.equal(a.tierLift, undefined, a.id);
});

// (SPELLS-RETUNE, an owner-approved change of requirement, docs/notes/spells-retune.md: the armies are tuned for a player whose Auto casts the
// king's spells, so the first four's Normal strength rose (it was 0.39, 1.48, 1.66 and 2.01) and each keeps its old XP through `xpStart`; their
// levels and curves are as they were)
test('the early armies keep their levels and curves, at the strength SPELLS-RETUNE measured for a player who casts', () => {
  assert.deepEqual(ARMIES.slice(0, 4).map((a) => [a.id, a.level, a.start, a.growth, a.xpStart]), [
    ['orcs', 1, 0.58, 0.176, 0.39],
    ['undead', 8, 1.7, 0.05, 1.48],
    ['beasts', 15, 2.17, 0.05, 1.66],
    ['wildwood', 22, 2.52, 0.05, 2.01],
  ]);
});

test('the late armies climb steeply: each recommended level at least five above the one before from the Labyrinth on, the last in the sixties', () => {
  for (let i = 5; i < ARMIES.length; i++) assert.ok(ARMIES[i].level >= ARMIES[i - 1].level + 5, ARMIES[i].id);
  assert.ok(ARMIES[ARMIES.length - 1].level >= 60);
});

test('the final armies are out of reach of a party at level 45, where the first army’s Mythic is still a wall', () => {
  // (level 45 with every talent and the castle a climb has there: the first army's Mythic takes about 17 tries, `tools/army-pace`)
  for (const army of ['infernal', 'yokai', 'golems']) for (const save of [1, 2]) assert.equal(clears(army, 45, save, 3, 17), false, `${army} save ${save}`);
});

test('and a strong party does clear them in the end: the Golem Forge at level 80', () => {
  assert.ok([1, 2].some((save) => clears('golems', 80, save, 3, 99)));
});

test('a steeper army pays the XP it did before: its added toughness is taken back out of a fight’s XP, on every army and tier', () => {
  // (and a tier's answer to the ultimates, ULT-CHARGE, is taken back out on every army: Legendary and Mythic)
  const answer = (t: number) => TIERS[t].answer ?? 1;
  // (SPELLS-RETUNE made every army steeper on Normal, the first four included, so every army now pays its old XP through `xpStart`; the first
  // four still have no tier lift, so their harder tiers pay in full but for the tiers' answer)
  for (const a of ARMIES.slice(0, 4)) for (const t of [1, 2, 3, 4]) assert.ok(Math.abs(armyXpShare(a, t) * answer(t) - 1) < 1e-9, `${a.id} tier ${t}`);
  for (const a of ARMIES) {
    assert.ok(a.xpStart !== undefined && a.xpStart < a.start, a.id);
    assert.ok(Math.abs(armyXpShare(a, 0) * a.start - a.xpStart!) < 1e-9, a.id);
    for (const t of [1, 2, 3, 4]) assert.ok(Math.abs(armyXpShare(a, t) * (a.tierLift?.[t] ?? 1) * answer(t) - 1) < 1e-9, `${a.id} tier ${t}`);
  }
});
