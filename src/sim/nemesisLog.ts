// The Nemesis War's reading of a fight (`docs/design/legends-expansion.md`, section 2.2; `docs/notes/nemesis-1.md`): what each foe did and
// suffered, tallied from the events `stepBattle` returns, as `fightStats.ts` tallies the heroes' numbers, and from what the fighters show
// after each tick (an ailment newly on a foe). It adds no hook inside the fight: the page (and the tools) call `tallyNemesis` with each
// tick's events, and `noteNemesis` (`nemesis.ts`) reads the tally when the fight is settled. Pure: no Pixi, no DOM.

import type { AilmentKey } from './ailmentKeys';
import type { Battle, BattleEvent, Unit } from './battle';
import { stepBattle } from './battle';
import { fieldedHero } from './fightStats';
import { UNITS } from './units';

/** One foe's fight, as the War reads it. */
export interface FoeLog {
  /** Its kind (`UNITS`). */
  def: string;
  /** Damage it (and anything it called up) dealt to each fielded hero, by the hero's unit id. */
  dealt: Record<number, number>;
  /** The hero kinds it slew (a killing blow on a fielded hero), and their unit ids. */
  slew: string[];
  slewIds: number[];
  /** The heroes it put under 15% health (whether they lived is read at settle). */
  low: number[];
  /** When it first struck a hero (ms into the fight), if it did. */
  first?: number;
  /** Damage it dealt from higher ground. */
  high: number;
  /** What it took: in all, from shots, from blows within reach 1, from each ailment's ticks, and how often. */
  taken: number;
  shots: number;
  melee: number;
  ailDmg: Partial<Record<AilmentKey, number>>;
  ailHits: Partial<Record<AilmentKey, number>>;
  /** The ailments laid on it (each time one newly took hold), and the arcs that ran through it. */
  laid: Partial<Record<AilmentKey, number>>;
  arcs: number;
  /** The king's spells that touched it, an Eidolon's strike on it, and being shoved, launched or fallen. */
  spells: number;
  eidolon: number;
  moved: number;
  /** The damage each hero dealt it, by hero kind (its Dread is the most). */
  by: Record<string, number>;
  /** The hero kind whose blow felled it, if a hero's did. */
  fell?: string;
}

/** A fight's tally for the War. */
export interface NemesisTally {
  foes: Record<number, FoeLog>;
  /** The healing each fielded hero did, by kind (a Healer-hunter's "the hero who healed most"). */
  healed: Record<string, number>;
  /** The ailments each foe stood under after the last tick (to see one newly laid). */
  had: Record<number, string>;
}

export const blankLog = (def: string): FoeLog => ({ def, dealt: {}, slew: [], slewIds: [], low: [], high: 0, taken: 0, shots: 0, melee: 0, ailDmg: {}, ailHits: {}, laid: {}, arcs: 0, spells: 0, eidolon: 0, moved: 0, by: {} });

/** A fresh tally for a fight about to begin. */
export const startNemesisTally = (): NemesisTally => ({ foes: {}, healed: {}, had: {} });

/** A foe of its own, not one a skill or a fight called up. */
const ownFoe = (u: Unit | undefined): u is Unit => !!u && u.side === 'foe' && u.owner === undefined && !UNITS[u.def]?.summon && u.raised === undefined;

/** Add one tick's events to the tally. `units` are the fight's (to find who called up whom and who stands where); `t` is the fight's time. */
export function tallyNemesis(tally: NemesisTally, events: readonly BattleEvent[], units: readonly Unit[], t: number): void {
  const byId = new Map(units.map((u) => [u.id, u]));
  // (what a fighter called up counts for its caller)
  const credit = (id: number): Unit | undefined => {
    const u = byId.get(id);
    return u?.owner !== undefined ? byId.get(u.owner) ?? u : u;
  };
  const log = (u: Unit): FoeLog => (tally.foes[u.id] ??= blankLog(u.def));
  for (const e of events) {
    if (e.kind === 'hit') {
      const by = credit(e.by);
      const to = byId.get(e.to);
      if (!to || e.by === e.to) continue;
      // (a foe striking a fielded hero)
      if (by && ownFoe(by) && to.side === 'hero' && fieldedHero(to)) {
        const f = log(by);
        f.dealt[to.id] = (f.dealt[to.id] ?? 0) + e.dmg;
        if (f.first === undefined) f.first = t;
        if (e.high) f.high += e.dmg;
        if (e.killed) {
          f.slew.push(to.def);
          f.slewIds.push(to.id);
        } else if (to.alive && to.hp < to.maxHp * 0.15 && !f.low.includes(to.id)) f.low.push(to.id);
      }
      // (a foe struck)
      if (ownFoe(to)) {
        const f = log(to);
        f.taken += e.dmg;
        if (e.eidolon) f.eidolon++;
        if (e.ail && e.ail !== 'shatter') {
          f.ailDmg[e.ail] = (f.ailDmg[e.ail] ?? 0) + e.dmg;
          f.ailHits[e.ail] = (f.ailHits[e.ail] ?? 0) + 1;
        } else if (e.src === 'blow' && !e.splash && by) {
          if (UNITS[by.def]?.shot) f.shots += e.dmg;
          else if (Math.abs(by.u - to.u) + Math.abs(by.v - to.v) <= 1) f.melee += e.dmg;
        }
        const hero = by && by.side === 'hero' && fieldedHero(by) ? by.def : undefined;
        if (hero) f.by[hero] = (f.by[hero] ?? 0) + e.dmg;
        if (hero && e.killed) f.fell = hero;
      }
    } else if (e.kind === 'heal' && e.by !== undefined) {
      const by = credit(e.by);
      if (by && fieldedHero(by)) tally.healed[by.def] = (tally.healed[by.def] ?? 0) + e.amount;
    } else if (e.kind === 'arc') {
      const to = byId.get(e.to);
      if (ownFoe(to)) log(to).arcs++;
    } else if (e.kind === 'spellfx') {
      const to = byId.get(e.to);
      if (ownFoe(to)) log(to).spells++;
    } else if (e.kind === 'shove' || e.kind === 'launch' || e.kind === 'fall') {
      const to = byId.get(e.to);
      if (ownFoe(to)) log(to).moved++;
    }
  }
  // (an ailment newly on a foe, read from what it shows after the tick: the laying itself has no event)
  for (const u of units) {
    if (!ownFoe(u) || !u.alive) continue;
    const now = (u.ail ?? []).filter((a) => a.until > t).map((a) => a.kind);
    const before = tally.had[u.id] ?? '';
    for (const k of now) if (!before.split(',').includes(k)) log(u).laid[k] = (log(u).laid[k] ?? 0) + 1;
    const key = now.join(',');
    if (key || before) tally.had[u.id] = key;
  }
}

/** Play a fight to its end as `playOut` does, tallying it for the War as it goes (the tools and the tests; the page tallies its own ticks). */
export function playOutTallied(b: Battle, tally: NemesisTally = startNemesisTally()): NemesisTally {
  while (b.phase === 'fight') tallyNemesis(tally, stepBattle(b), b.units, b.t);
  return tally;
}
