// HALL-OF-HEROES (docs/notes/hall-of-heroes.md): every hero worth collecting and ranking, not only the five a player fields.
//
// - THE HALL: each hero owned lends the whole roster a little of its class's strength for each rank it has (taken ranks 1 to 4, and the two
//   awakened steps): the Guardians, Bulwarks, Wardens and Supports health; the Blades, Vanguards, Beasts and Gunners attack; the Assassins,
//   Marksmen and Tricksters crit; the Casters and Arcanists skill charge. Each stat is capped (`HALL_CAP`), so a full collection gives about
//   +9% health, +8% attack, +3% crit and +6% charge (the measure took them down a quarter from the first draft). It is added to every hero's lasting stats (`heroStats`), so it counts wherever those do:
//   the army runs, the daily, the Last Stand, the quests and duels (a run whose heroes start bare, the Calamity's, reads none of it).
// - TRAIT SETS: every hero of a trait owned completes its set, once: stones, crowns and a title (`claimSets`).
// - RESTED HEROES: a hero who sat out the last three army runs earns half again the XP in its next one (`restedXp`), a nudge to rotate.
//
// Deterministic: no stream is drawn from. The switch `HALL.on` (the recorded fights turn it off). Pure rules: no Pixi, no DOM.

import type { EquipStats } from './equipment';
import { heroRank, type Meta } from './meta';
import { traitsOf, TRAITS, membersOf, type Trait } from './traits';
import { ALL_HEROES } from './units';
import { PULL_HEROES } from './unlockRules';

/** The switch (the tools and the recorded fights turn it off); `force` is a measure's own Hall, in place of the save's (`--hall-table`). */
export const HALL: { on: boolean; force?: Record<'hp' | 'atk' | 'crit' | 'charge', number> } = { on: true };

export type HallStat = 'hp' | 'atk' | 'crit' | 'charge';
export const HALL_STATS: readonly HallStat[] = ['hp', 'atk', 'crit', 'charge'];
export const HALL_STAT_NAME: Readonly<Record<HallStat, string>> = { hp: 'HP', atk: 'ATK', crit: 'Crit', charge: 'Skill charge' };

/** The stat each class lends the roster. */
export const HALL_STAT: Readonly<Record<string, HallStat>> = {
  guardian: 'hp', bulwark: 'hp', warden: 'hp', support: 'hp',
  blade: 'atk', vanguard: 'atk', beast: 'atk', gunner: 'atk',
  assassin: 'crit', marksman: 'crit', trickster: 'crit',
  caster: 'charge', arcanist: 'charge',
};
/** What each rank of a hero lends (shares: 0.002 is +0.2%), and the most each stat can reach. */
export const HALL_RATE: Readonly<Record<HallStat, number>> = { hp: 0.0015, atk: 0.0015, crit: 0.0008, charge: 0.0015 };
export const HALL_CAP: Readonly<Record<HallStat, number>> = { hp: 0.09, atk: 0.08, crit: 0.03, charge: 0.06 };
/** The most rank a hero lends: its four taken ranks and the two awakened steps. */
export const HALL_RANK_MAX = 6;

export type HallBonus = Record<HallStat, number>;

/** What a hero lends the Hall: its stat and its share (none if not owned or at rank 0). */
export function lentBy(m: Meta, kind: string): { stat: HallStat; share: number } | undefined {
  const stat = HALL_STAT[traitsOf(kind)[1] ?? ''];
  if (!stat || !m.unlocked.includes(kind)) return undefined;
  const r = Math.min(HALL_RANK_MAX, heroRank(m, kind));
  return r > 0 ? { stat, share: r * HALL_RATE[stat] } : undefined;
}

/** The Hall's bonus to every hero: each stat's sum over the heroes owned, capped. All nought while the switch is off. */
export function hallBonus(m: Meta): HallBonus {
  const out: HallBonus = { hp: 0, atk: 0, crit: 0, charge: 0 };
  if (!HALL.on) return out;
  if (HALL.force) return { ...HALL.force };
  for (const k of new Set(m.unlocked)) {
    const l = lentBy(m, k);
    if (l) out[l.stat] += l.share;
  }
  for (const s of HALL_STATS) out[s] = Math.min(HALL_CAP[s], round4(out[s]));
  return out;
}
const round4 = (x: number): number => Math.round(x * 10000) / 10000;

/** Add the Hall to a hero's lasting stats (`heroStats`): the four shares on top of what gear and talents give (`stats` may be none). */
export function withHall(m: Meta, stats: EquipStats | undefined, empty: () => EquipStats): EquipStats | undefined {
  const h = hallBonus(m);
  if (!h.hp && !h.atk && !h.crit && !h.charge) return stats;
  const t = stats ?? empty();
  t.hp += h.hp;
  t.atk += h.atk;
  t.crit += h.crit;
  t.charge += h.charge;
  return t;
}

/** The Hall in words: "Your Hall: +6% HP, +4% ATK, +1% Crit" (the stats it lends; "nothing yet" with none). */
export function hallLine(b: HallBonus): string {
  const parts = HALL_STATS.filter((s) => b[s] > 0).map((s) => `+${pct(b[s])} ${HALL_STAT_NAME[s]}`);
  return parts.length ? `Your Hall: ${parts.join(', ')}` : 'Your Hall: nothing yet';
}
export const pct = (x: number): string => `${Math.round(x * 1000) / 10}%`.replace('.0%', '%');

// ---------------------------------------------------------------------------------------------------------------- trait sets

/** What completing a trait's set pays, once: stones and crowns, and its title. */
export const SET_REWARD = { stones: 6, crowns: 600 } as const;

/** The heroes of a trait that can be owned (the roster's), in the roster's order. */
export const setOf = (trait: string): string[] => membersOf(trait).filter((k) => ALL_HEROES.includes(k));

/** A set's progress: the heroes owned of it, how many it has, and the ones missing. */
export function setProgress(m: Meta, trait: string): { have: number; of: number; missing: string[]; done: boolean } {
  const all = setOf(trait);
  const missing = all.filter((k) => !m.unlocked.includes(k));
  return { have: all.length - missing.length, of: all.length, missing, done: all.length > 0 && !missing.length };
}

/** A set's title, for the Hall and the player's badges ("Keeper of the Undead", "Master of Blades"). */
export function setTitle(t: Trait): string {
  return t.kind === 'origin' ? `Keeper of the ${t.name}` : `Master of the ${t.name}s`;
}

/** Every trait with a set (both kinds; a trait with no heroes on the roster has none). */
export const SET_TRAITS = (): Trait[] => Object.values(TRAITS).filter((t) => setOf(t.id).length > 1);

/** Pay one completed set, once (`Meta.hallSets` keeps it). Returns whether it was paid. */
export function claimSet(m: Meta, trait: string): boolean {
  if (!HALL.on || m.hallSets?.includes(trait) || !TRAITS[trait] || !setProgress(m, trait).done) return false;
  (m.hallSets ??= []).push(trait);
  m.stones = (m.stones ?? 0) + SET_REWARD.stones;
  m.crowns += SET_REWARD.crowns;
  return true;
}

/** Pay every set newly completed, once each (`Meta.hallSets` keeps them). Returns the traits newly paid. */
export function claimSets(m: Meta): string[] {
  if (!HALL.on) return [];
  return SET_TRAITS().map((t) => t.id).filter((id) => claimSet(m, id));
}

/** The nearest sets: those begun and not complete, fewest missing first (ties by trait order); for the Recruit page's summon targets. */
export function nearSets(m: Meta, most = 3): { trait: string; missing: string[] }[] {
  return SET_TRAITS()
    .map((t) => ({ trait: t.id, ...setProgress(m, t.id) }))
    .filter((p) => !p.done && p.have > 0)
    .sort((a, b) => a.missing.length - b.missing.length)
    .slice(0, most)
    .map((p) => ({ trait: p.trait, missing: p.missing }));
}

/** The set a hero would bring closest to done, if it is missing from a begun set: for its "Completes the Undead" flag on Recruit. Only a
 *  hero a summon can bring (`PULL_HEROES`): one earned in play is never a summon target. */
export function setTarget(m: Meta, kind: string): { trait: string; left: number } | undefined {
  if (m.unlocked.includes(kind) || !PULL_HEROES.includes(kind)) return undefined;
  let best: { trait: string; left: number } | undefined;
  for (const t of traitsOf(kind)) {
    const p = setProgress(m, t);
    if (p.have > 0 && p.missing.includes(kind) && (!best || p.missing.length < best.left)) best = { trait: t, left: p.missing.length };
  }
  return best;
}

export const readHallSets = (x: unknown): string[] | undefined => {
  const out = Array.isArray(x) ? [...new Set(x.filter((v): v is string => typeof v === 'string' && v in TRAITS))] : [];
  return out.length ? out : undefined;
};

// ---------------------------------------------------------------------------------------------------------------- rested heroes

/** A hero rested this many army runs in a row earns `RESTED_XP` more in its next. */
export const RESTED_RUNS = 3;
export const RESTED_XP = 0.5;

/** Whether a hero is rested: owned, and sat out the last `RESTED_RUNS` army runs. */
export const isRested = (m: Meta, kind: string): boolean => HALL.on && m.unlocked.includes(kind) && (m.rest?.[kind] ?? 0) >= RESTED_RUNS;

/** An army run has ended: its heroes' rest starts again, and every other hero owned has sat out one more (counted to `RESTED_RUNS`). */
export function noteRest(m: Meta, inRun: readonly string[]): void {
  if (!HALL.on) return;
  const rest = (m.rest ??= {});
  for (const k of m.unlocked) {
    if (inRun.includes(k)) delete rest[k];
    else rest[k] = Math.min(RESTED_RUNS, (rest[k] ?? 0) + 1);
  }
  if (!Object.keys(rest).length) delete m.rest;
}

/** A fight's XP with the rested heroes' share added (half again). */
export function restedXp(m: Meta, gains: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(gains)) out[k] = isRested(m, k) ? Math.round(n * (1 + RESTED_XP)) : n;
  return out;
}

export const readRest = (x: unknown): Record<string, number> | undefined => {
  if (!x || typeof x !== 'object') return undefined;
  const out = Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([k, n]) => ALL_HEROES.includes(k) && typeof n === 'number' && Number.isFinite(n) && n > 0).map(([k, n]) => [k, Math.min(RESTED_RUNS, Math.round(n as number))]));
  return Object.keys(out).length ? out : undefined;
};
