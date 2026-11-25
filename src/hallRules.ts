// HALL-OF-HEROES's page in rows (docs/notes/hall-of-heroes.md): the Hall's four stats with what each holds and its cap, every hero with
// what it lends, and every trait set with its progress. Pure: no DOM, no Pixi; `hallView.ts` draws them.

import { HALL_CAP, HALL_STAT, HALL_STAT_NAME, HALL_STATS, hallBonus, lentBy, pct, SET_REWARD, SET_TRAITS, setProgress, setTitle, type HallStat } from './sim/hall';
import { heroRank, type Meta } from './sim/meta';
import { TRAITS, traitsOf } from './sim/traits';
import { ALL_HEROES, UNITS } from './sim/units';

/** A stat's row: its name, what the Hall gives now and its cap, and the classes that lend it. */
export function statRows(m: Meta): { stat: HallStat; name: string; now: string; cap: string; full: boolean; classes: string }[] {
  const b = hallBonus(m);
  return HALL_STATS.map((s) => ({
    stat: s,
    name: HALL_STAT_NAME[s],
    now: `+${pct(b[s])}`,
    cap: `+${pct(HALL_CAP[s])}`,
    full: b[s] >= HALL_CAP[s],
    classes: Object.keys(HALL_STAT).filter((c) => HALL_STAT[c] === s).map((c) => `${TRAITS[c]?.name ?? c}s`).join(', '),
  }));
}

/** A hero's row: its name, class, rank, and what it lends ("+0.6% HP") or why it lends nothing. Owned first, by what they lend. */
export function heroRows(m: Meta, name: (k: string) => string): { kind: string; name: string; cls: string; owned: boolean; rank: number; lends: string }[] {
  const rows = ALL_HEROES.filter((k) => UNITS[k]).map((k) => {
    const owned = m.unlocked.includes(k);
    const l = lentBy(m, k);
    const stat = HALL_STAT[traitsOf(k)[1] ?? ''];
    const lends = l ? `+${pct(l.share)} ${HALL_STAT_NAME[l.stat]}` : owned ? `Rank up to lend ${stat ? HALL_STAT_NAME[stat] : 'strength'}` : 'Not yet joined';
    return { kind: k, name: name(k), cls: TRAITS[traitsOf(k)[1] ?? '']?.name ?? '', owned, rank: owned ? heroRank(m, k) : 0, lends, share: l?.share ?? 0 };
  });
  return rows.sort((a, b) => Number(b.owned) - Number(a.owned) || b.share - a.share || ALL_HEROES.indexOf(a.kind) - ALL_HEROES.indexOf(b.kind)).map(({ share: _s, ...r }) => r);
}

/** A set's row: the trait, "3 of 4", the heroes missing, its title and reward, and whether it is done and paid. Nearest to done first. */
export function setRows(m: Meta, name: (k: string) => string): { trait: string; name: string; progress: string; have: number; of: number; missing: string; title: string; reward: string; done: boolean; paid: boolean }[] {
  return SET_TRAITS()
    .map((t) => {
      const p = setProgress(m, t.id);
      return {
        trait: t.id,
        name: t.name,
        progress: `${p.have} of ${p.of} ${t.name}`,
        have: p.have,
        of: p.of,
        missing: p.missing.map(name).join(', '),
        title: setTitle(t),
        reward: `${SET_REWARD.stones} stones · ${SET_REWARD.crowns} crowns`,
        done: p.done,
        paid: !!m.hallSets?.includes(t.id),
      };
    })
    .sort((a, b) => Number(b.done && !b.paid) - Number(a.done && !a.paid) || Number(a.paid) - Number(b.paid) || (a.of - a.have) - (b.of - b.have) || a.name.localeCompare(b.name));
}

/** The titles won, for the Hall's head. */
export const titlesOf = (m: Meta): string[] => (m.hallSets ?? []).map((id) => (TRAITS[id] ? setTitle(TRAITS[id]) : '')).filter(Boolean);
