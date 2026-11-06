// The Nemesis War for the tools (`docs/notes/nemesis-1.md`): a Council grown by real fights, as a player's evenings would grow it. Each army is
// fought `runs` times by the greedy player at its own Normal level (and Hard ten levels on), every wave settled for the War as the page
// settles it (`WAR_BOT.settle`), so its nemeses are born, promoted and slain by what actually happened. `harsh` then pushes each member's Might
// up by five and fills its traits, the death spiral's worst case.

import { ARMIES } from '../../src/sim/armies';
import { newWar, type War } from '../../src/sim/nemesis';
import { addTrait, TRAITS } from '../../src/sim/nemesisTraits';
import { mixSeed } from '../../src/sim/rng';
import { playArmy, savedAt, WAR_BOT } from '../autoplay';
import { newCastle, type Castle } from '../../src/sim/castle';
import { levelOfKind } from '../../src/sim/levels';
import { heroRank } from '../../src/sim/meta';
import { boostOf, type Owned } from '../../src/sim/run';
import { heroStats, learn, tierNodes } from '../../src/sim/talents';

const PARTY = ['knight', 'paladin', 'archer', 'warlock', 'cleric'];

/** A War grown by `runs` runs of each army (Normal at its level, every third on Hard ten levels on), from one seed. */
export function growWar(runs: number, seed = 1, party: readonly string[] = PARTY, talents = false, castleAt: (level: number) => Castle = () => newCastle()): War {
  const war = newWar();
  WAR_BOT.settle = true;
  try {
    ARMIES.forEach((a, i) => {
      for (let r = 0; r < runs; r++) {
        const hard = r % 3 === 2;
        const meta = savedAt(a.level + (hard ? 10 : 0), party, mixSeed(seed, i, r));
        if (talents) for (const k of party) for (const t of [1, 2, 3, 4, 5, 6, 7] as const) for (const node of tierNodes(k, t)) learn(meta, k, node.id);
        meta.war = war;
        const boostFor = (h: Owned) => boostOf(h, heroRank(meta, h.kind), levelOfKind(meta, h.kind), heroStats(meta, h.kind));
        playArmy(meta, a.id, mixSeed(seed, 0x4e3, i * 100 + r), party, castleAt(a.level + (hard ? 10 : 0)), true, hard ? 1 : 0, talents ? boostFor : undefined);
      }
    });
  } finally {
    WAR_BOT.settle = false;
  }
  return war;
}

/** The worst case: every member five Might up (to 10 at most) with three traits. */
export function harshen(war: War): War {
  const order = Object.keys(TRAITS).filter((t) => t !== 'legendSlayer');
  for (const n of war.members) {
    n.might = Math.min(10, n.might + 5);
    for (const t of order) {
      if (n.traits.length >= 3) break;
      addTrait(n.traits, t, n.mark);
    }
  }
  return war;
}

/**
 * The most the War can put into one army's run, as a stress test: its last boss a boss nemesis, a captain beside its first mid-boss, and two
 * lieutenants (its first two troop kinds), each at `might` with traits from the table (a Bane, then what each would plausibly earn) and the
 * Dread of the Wizard. More than the Council's 13 seats would ever give one army; `--nemesis full` measures each army against it.
 */
export function fullCouncil(might: number): War {
  const war = newWar();
  const plan: [string, string[]][] = [['bane:martial', ['scarred', 'survivor']], ['bane:arcane', ['arrowCatcher', 'ambusher']], ['healerHunter', ['hillKing', 'loneWolf']], ['executioner', ['fireproof', 'elusive']]];
  for (const a of ARMIES) {
    const last = a.waves[a.waves.length - 1].foes[0];
    const troops = [...new Set(a.waves.filter((w) => !w.boss).flatMap((w) => w.foes))];
    const kinds: [string, 'captain' | 'lieutenant', boolean][] = [[last, 'captain', true], [troops[0], 'captain', false], [troops[1] ?? troops[0], 'lieutenant', false], [troops[2] ?? troops[0], 'lieutenant', false]];
    kinds.forEach(([base, rank, boss], i) => {
      const [first, more] = plan[i % plan.length];
      const traits = [first];
      for (const t of more.slice(0, might >= 5 ? 2 : 1)) addTrait(traits, t, first);
      war.members.push({ id: war.nextId++, base, army: a.id, name: `${a.id}-${i}`, epithet: '', rank, ...(boss ? { boss: true as const } : {}), loyalty: 60, might, scars: 0, traits, weak: ['dread:wizard'], known: [], memory: [], met: 1, lost: 0, born: 0 });
    });
  }
  return war;
}
