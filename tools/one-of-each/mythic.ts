// ONE-OF-EACH: the difficulty test's Mythic check at level 100 with every talent (`test/difficulty.test.ts`), over more saves: mean tries
// (cap 12) to clear each late army's Mythic, with the party, castle and greedy player of that test. Run on two trees to compare.
//   node tools/one-of-each/run.mjs --mythic      (SAVES, default 8)
import { ARMIES } from '../../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { boostOf, type Owned } from '../../src/sim/run';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { playArmy, savedAt } from '../autoplay';

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
const SAVES = Number(process.env.SAVES ?? 8);
function tries(army: string, tier: number, level: number, save: number, cap = 12): number {
  const meta = savedAt(level, party, save);
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
  for (let n = 1; n <= cap; n++) if (playArmy(meta, army, mixSeed(save, 0xd33b, ARMIES.findIndex((a) => a.id === army) * 100 + tier * 10 + n), party, maxed, true, tier, boostFor).cleared) return n;
  return cap + 1;
}
for (const army of ['infernal', 'yokai', 'golems']) {
  const ts = Array.from({ length: SAVES }, (_, i) => tries(army, 4, 100, i + 1));
  console.log(`${army} Mythic L100: mean tries ${(ts.reduce((a, b) => a + b, 0) / ts.length).toFixed(2)} [${ts.join(' ')}]`);
}
