// ARMY-WEAKNESS's measure (`npm run balance -- --no-tables --weakness`, docs/notes/army-weakness.md): every army at every tier, the hero level
// the tier is meant for (Normal at the army's own), three parties a cell: today's auto team (the balance tool's recruits: Knight, Paladin,
// Archer, Warlock, Cleric), a team built for the army (its weak classes in) and one built against it (its resisted classes in); each with the
// rule off (as before) and on. A fresh save a try, a maxed castle, gear dressed, every talent row the level opens and the skills a player of
// that level has mastered (`giveMastery`); one try each: the clear rate and the mean stars of a clear.
//
//   --weakness-seeds N   tries a cell (default 32)       --tiers-at 0,1   the tiers (default all five)
//   --only a,b           the armies                      --weak-parties auto,matched,mismatched

import { ARMIES } from '../src/sim/armies';
import { ARMY_MATCH, ARMY_WEAKNESS, classOf, matchOf } from '../src/sim/armyWeakness';
import { BUILDINGS, maxLevel, newCastle, type BuildingId } from '../src/sim/castle';
import { levelOfKind } from '../src/sim/levels';
import { heroRank, type Meta } from '../src/sim/meta';
import { mixSeed } from '../src/sim/rng';
import { boostOf, type Owned } from '../src/sim/run';
import { heroStats, learn, tierNodes } from '../src/sim/talents';
import { TIERS } from '../src/sim/tiers';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import { playArmy, savedAt } from './autoplay';
import { giveMastery } from './skills/mastery';

const flag = (name: string): string | undefined => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

/** Today's auto team: the balance tool's recruits. */
export const AUTO_PARTY: readonly string[] = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];
/** The level each tier is meant for (the entry of its band, `docs/notes/difficulty.md`, where a try is a real risk); Normal is the army's own. */
export const TIER_LEVEL: readonly number[] = [0, 25, 45, 65, 85];

/** A team built for (`for`) or against (`against`) an army: up to three heroes of its weak (resisted) classes, one of each class first,
 *  then the auto team's heroes that are neither, then the rest of the auto team. */
export function partyFor(army: string, way: 'for' | 'against'): string[] {
  const avoid = way === 'for' ? 'resist' : 'weak';
  const classes = way === 'for' ? ARMY_MATCH[army].weak : ARMY_MATCH[army].resist;
  const out: string[] = [];
  // (one of each class in turn, in the roster's order, so the team is not all one class)
  for (let round = 0; out.length < 3 && round < 3; round++)
    for (const c of classes) {
      const k = ALL_HEROES.find((x) => UNITS[x] && !out.includes(x) && classOf(x) === c);
      if (k && out.length < 3) out.push(k);
    }
  for (const k of AUTO_PARTY) if (out.length < 5 && !out.includes(k) && matchOf(army, k) === undefined) out.push(k);
  for (const k of AUTO_PARTY) if (out.length < 5 && !out.includes(k) && matchOf(army, k) !== avoid) out.push(k);
  for (const k of AUTO_PARTY) if (out.length < 5 && !out.includes(k)) out.push(k);
  return out;
}

export function weaknessTable(): void {
  const t0 = Date.now();
  const seeds = Number(flag('--weakness-seeds') ?? 32);
  const only = flag('--only')?.split(',');
  const tiersAt = flag('--tiers-at')?.split(',').map(Number) ?? [0, 1, 2, 3, 4];
  const ways = (flag('--weak-parties')?.split(',') ?? ['auto', 'matched', 'mismatched']) as ('auto' | 'matched' | 'mismatched')[];
  const maxed = newCastle();
  for (const id of Object.keys(BUILDINGS) as BuildingId[]) maxed[id] = maxLevel(id);
  console.log(`\n5i. ARMY WEAKNESSES  (one try a cell, ${seeds} fresh saves; a maxed castle, gear, talents and mastered skills at the tier's level; clear % / mean stars of a clear / mean waves won, rule off -> on)\n`);
  for (const army of ARMIES.filter((a) => !only || only.includes(a.id))) {
    const parties = { auto: [...AUTO_PARTY], matched: partyFor(army.id, 'for'), mismatched: partyFor(army.id, 'against') };
    console.log(`${army.name}  (weak to ${ARMY_MATCH[army.id].weak.join(', ')}; resists ${ARMY_MATCH[army.id].resist.join(', ')})`);
    for (const w of ways) console.log(`  ${w.padEnd(11)} ${parties[w].map((k) => `${k}${mark(army.id, k)}`).join(', ')}`);
    for (const t of tiersAt) {
      const L = Math.max(army.level, TIER_LEVEL[t]);
      const cells = ways.map((w) => {
        const [off, on] = [false, true].map((rule) => {
          ARMY_WEAKNESS.on = rule;
          let clears = 0;
          let stars = 0;
          let won = 0;
          for (let s = 1; s <= seeds; s++) {
            const meta = dress(savedAt(L, parties[w], s), parties[w], L);
            const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
            const r = playArmy(meta, army.id, mixSeed(s, 0xa7e4, ARMIES.indexOf(army) * 10 + t), parties[w], maxed, true, t, boostFor);
            won += r.won;
            if (r.cleared) {
              clears++;
              stars += r.stars;
            }
          }
          ARMY_WEAKNESS.on = true;
          return `${((clears / seeds) * 100).toFixed(0)}%/${clears ? (stars / clears).toFixed(1) : '-'}/${(won / seeds).toFixed(1)}w`;
        });
        return `${w} ${off} -> ${on}`.padEnd(44);
      });
      console.log(`  ${TIERS[t].name.padEnd(10)} Lv ${String(L).padEnd(4)} ${cells.join('')}`);
    }
  }
  console.log(`  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}

const mark = (army: string, k: string): string => (matchOf(army, k) === 'weak' ? '+' : matchOf(army, k) === 'resist' ? '-' : '');

/** The save at its level: every talent row it opens (the first of each pair), and the skills mastered as a player of that level has them. */
function dress(meta: Meta, party: readonly string[], level: number): Meta {
  for (const k of party) {
    if (!meta.unlocked.includes(k)) meta.unlocked.push(k);
    for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const n of tierNodes(k, t)) learn(meta, k, n.id);
  }
  giveMastery(meta, party, level);
  return meta;
}

