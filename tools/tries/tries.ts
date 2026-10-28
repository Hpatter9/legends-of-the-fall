// Mean tries to clear a few armies, as `test/difficulty.test.ts` measures them (the greedy player of `tools/autoplay.ts`).
//   node tools/tries/run.mjs                  Normal at level 1 (no talents) on the orcs and the Labyrinth, 8 saves each
//   node tools/tries/run.mjs labyrinth:0:1:0 golems:1:30:1   army:tier:level:talents (talents 1 = every row the level opens)
import { ARMIES } from '../../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank } from '../../src/sim/meta';
import { mixSeed } from '../../src/sim/rng';
import { boostOf, type Owned } from '../../src/sim/run';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';
import { playArmy, savedAt } from '../autoplay';
import { TIERS } from '../../src/sim/tiers';
import { ULT_FILL } from '../../src/sim/heroKits';

// (`TIERK=3:1.2:1.1,4:1.3:1.2` scales a tier's foes' hp and attack; `ULTK=0.5` the heroes' ultimate strength: tuning runs, nothing is written)
for (const kv of (process.env.TIERK ?? '').split(',').filter(Boolean)) {
  const [i, hp, atk] = kv.split(':').map(Number);
  const t = TIERS[i] as { hp: number; atk: number };
  t.hp *= hp;
  t.atk *= atk ?? hp;
}
if (process.env.ULTK) ULT_FILL.POWER = Number(process.env.ULTK);

const party = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
const maxed = newCastle();
for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);

function tries(army: string, tier: number, level: number, talents: boolean, save: number, cap = 25): number {
  const meta = savedAt(level, party, save);
  if (talents)
    for (const k of party) {
      if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
      for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
    }
  const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
  let n = 0;
  while (n < cap) {
    n++;
    if (playArmy(meta, army, mixSeed(save, 0xd33b, ARMIES.findIndex((a) => a.id === army) * 100 + tier * 10 + n), party, maxed, true, tier, talents ? boostFor : undefined).cleared) return n;
  }
  return cap + 1;
}

const SAVES = Number(process.env.SAVES ?? 8);
const cells = process.argv.slice(2).length ? process.argv.slice(2) : ['orcs:0:1:0', 'labyrinth:0:1:0'];
for (const c of cells) {
  const [army, tier, level, talents] = c.split(':');
  const xs = Array.from({ length: SAVES }, (_, i) => tries(army, +tier, +level, talents === '1', i + 1));
  console.log(`${army} tier ${tier} level ${level}${talents === '1' ? ' +talents' : ''}: ${(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1)} tries  [${xs.join(' ')}]`);
}
