// HALL-OF-HEROES's measure (`npm run balance -- --no-tables --hall-table`, docs/notes/hall-of-heroes.md): what the Hall does to clears for
// a daily player at day 30, 90 and 180 (`npm run unlock-pace -- --hall` gives each day's Hall, `npm run level-pace` its hero level), against
// every army on the tier meant for that level: the balance tool's recruits (Knight, Paladin, Archer, Warlock, Cleric), a maxed castle, gear,
// every talent row and the skills mastered at that level; one try a cell over `--hall-seeds` fresh saves (32), the Hall off and on.

import { ARMIES } from '../src/sim/armies';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { HALL, type HallBonus } from '../src/sim/hall';
import { levelOfKind } from '../src/sim/levels';
import { heroRank, type Meta } from '../src/sim/meta';
import { mixSeed } from '../src/sim/rng';
import { boostOf, type Owned } from '../src/sim/run';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { TIERS } from '../src/sim/tiers';
import { playArmy, savedAt } from './autoplay';
import { giveMastery } from './skills/mastery';

const flag = (name: string): string | undefined => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);
const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

/** A daily player's day: its hero level (`level-pace`), the tier meant for it, and its Hall (`unlock-pace -- --hall`, the median). */
export const HALL_DAYS: readonly { day: number; level: number; tier: number; hall: HallBonus }[] = [
  { day: 30, level: 42, tier: 1, hall: { hp: 0.009, atk: 0.008, crit: 0.004, charge: 0.003 } },
  { day: 90, level: 70, tier: 3, hall: { hp: 0.031, atk: 0.029, crit: 0.012, charge: 0.012 } },
  { day: 180, level: 100, tier: 4, hall: { hp: 0.065, atk: 0.06, crit: 0.025, charge: 0.021 } },
];

function dress(meta: Meta, level: number): Meta {
  for (const k of PARTY) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  giveMastery(meta, PARTY, level);
  return meta;
}

export function hallTable(): void {
  const t0 = Date.now();
  const seeds = Number(flag('--hall-seeds') ?? 32);
  const only = flag('--only')?.split(',');
  const days = flag('--hall-days')?.split(',').map(Number);
  const maxed = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
  console.log(`\n5j. THE HALL OF HEROES  (the recruits; one try a cell over ${seeds} fresh saves; a maxed castle, gear, talents and mastered skills; clear % / mean stars of a clear / mean waves won, the Hall off -> on)\n`);
  for (const d of HALL_DAYS.filter((x) => !days || days.includes(x.day))) {
    console.log(`day ${d.day}: level ${d.level}, ${TIERS[d.tier].name}, the Hall +${(d.hall.hp * 100).toFixed(1)}% HP, +${(d.hall.atk * 100).toFixed(1)}% ATK, +${(d.hall.crit * 100).toFixed(1)}% crit, +${(d.hall.charge * 100).toFixed(1)}% charge`);
    let sumOff = 0;
    let sumOn = 0;
    let n = 0;
    for (const army of ARMIES.filter((a) => !only || only.includes(a.id))) {
      const L = Math.max(d.level, army.level);
      const [off, on] = [false, true].map((rule) => {
        HALL.on = rule;
        HALL.force = rule ? d.hall : undefined;
        let clears = 0;
        let stars = 0;
        let won = 0;
        for (let s = 1; s <= seeds; s++) {
          const meta = dress(savedAt(L, PARTY, s), L);
          const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
          const r = playArmy(meta, army.id, mixSeed(s, 0x4a11, ARMIES.indexOf(army) * 10 + d.tier), PARTY, maxed, true, d.tier, boostFor);
          won += r.won;
          if (r.cleared) {
            clears++;
            stars += r.stars;
          }
        }
        HALL.on = true;
        HALL.force = undefined;
        return { pct: (clears / seeds) * 100, cell: `${((clears / seeds) * 100).toFixed(0)}%/${clears ? (stars / clears).toFixed(1) : '-'}/${(won / seeds).toFixed(1)}w` };
      });
      sumOff += off.pct;
      sumOn += on.pct;
      n++;
      console.log(`  ${army.name.padEnd(20)} Lv ${String(L).padEnd(4)} ${off.cell} -> ${on.cell}`);
    }
    console.log(`  mean clear: ${(sumOff / n).toFixed(1)}% -> ${(sumOn / n).toFixed(1)}%`);
  }
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
