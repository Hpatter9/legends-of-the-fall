// The guest hero (GUEST-HERO, `docs/notes/guest-hero.md`). The owner's ask: "Sometimes you can hire a new hero from the store you randomly
// come by. That hero should be allowed as a guest hero and be allowed as the 6th on the field, making them quite valuable." The passing cart
// between an army's or the daily's waves (MID-EVENTS, `market.ts`) now and then has a guest for hire: a hero from outside the party (one the
// player may not own), dear, who fights as a sixth hero beside the usual five for THAT RUN ONLY. The owner's rules:
//
//   - one guest at a time, an extra place on the field beyond the five (`canJoin` in `run.ts` counts the five without the guest);
//   - one of each hero still holds: a guest is never a twin of a fielded hero (it is drawn from kinds the run does not have, and `canJoin`
//     and `placeBlock` refuse a twin as for any hero);
//   - it earns XP in the run (kept on the guest itself, `Owned.xp`) but nothing lasting: no XP to the kind's level, no shards, no rank;
//   - it never merges and is never recycled, and it leaves when the run ends, with a short farewell line on the last card (`farewellOf`).
//
// Its grade is the fielded heroes' when it joined. A guest the player owns brings its own lasting level, rank, talents, equipment and
// awakening (the owner's call); one the player does not own fights at the party's mean level and rank (live), with none of those. Either way
// its XP never reaches the kind's lasting level: it is a visitor this run. The offer is drawn on its own side stream (`GUEST_SALT`), so the cart's other
// wares, and every other draw of the run, are as they were. Pure rules: no Pixi, no DOM.

import { mixSeed, Rng } from './rng';
import { ALL_HEROES, UNITS } from './units';
import { heroName } from './heroNames';
import { heroRank, type Meta } from './meta';
import { heroStats } from './talents';
import { awakenedOf } from './awaken';
import { levelOfKind } from './levels';
import { gearBoost } from './gear';
import type { Boost } from './battle';
import { canJoin, gradeBoost, heroOf, MAX_GRADE, summonCost, type Owned, type Run } from './run';

const GUEST_SALT = 0x6e5e7;
/** The share of the cart's visits that bring a guest (while the run has none). The cart comes at most once a run, so a guest is a find. */
export const GUEST_CHANCE = 0.6;
/** A guest costs this many sellswords (the next Hire's price and `HIRE_EXTRA`, which rises with the run's hires), and never less than
 *  `GUEST_FLOOR`: the owner's "higher end", a buy saved up for (`docs/notes/guest-hero.md` has the numbers). */
export const GUEST_HIRES = 2.5;
export const GUEST_FLOOR = 120;
/** The sellsword's extra over the next Hire (as `market.ts`'s `HIRE_EXTRA`; kept here so this file stands alone). */
const HIRE_EXTRA = 10;

/** Whether a hero is the run's guest. */
export const isGuest = (h: Owned | undefined): boolean => !!h?.guest;
/** The run's guest, if it has one (at most one). */
export const guestOf = (run: Run): Owned | undefined => run.roster.find((h) => h.guest);
/** Whether a run may meet a guest: an army run or the daily, the runs the passing cart comes to (the Calamity hires from all heroes and
 *  fields ten already; a quest battle's cast is its story's). */
export const guestsHere = (run: Run): boolean => !run.tower && (run.mode?.kind === 'army' || run.mode?.kind === 'daily');

/** The kinds a guest may be: heroes outside the run's party (its pool) and not on its roster, so it is never a twin of one of the party's
 *  own. Most are heroes the player may not own: the guest is a chance to field one. */
export function guestKinds(run: Run): string[] {
  // (SECRET-HEROES: never a hero still secret to the save)
  const party = new Set([...(run.pool ?? []), ...run.roster.map((h) => h.kind), ...(run.hide ?? [])]);
  return ALL_HEROES.filter((k) => !!UNITS[k] && !UNITS[k].summon && !party.has(k));
}

/** A guest's price at the cart: `GUEST_HIRES` sellswords to the nearest 5, at least `GUEST_FLOOR` (`_stage` kept for the cart's other
 *  prices' shape). */
export const guestPrice = (run: Run, _stage: number): number => Math.max(GUEST_FLOOR, Math.round((GUEST_HIRES * (summonCost(run) + HIRE_EXTRA)) / 5) * 5);

/** The guest the cart offers after wave `stage`, or null: none when the run has one already, cannot meet one, or the roll says no. Its own
 *  side stream of the run's seed and the stage, so the cart's wares are the same with or without it. */
export function drawGuest(run: Run, stage: number): string | null {
  if (!guestsHere(run) || guestOf(run)) return null;
  const kinds = guestKinds(run);
  const rng = new Rng(mixSeed(run.seed, GUEST_SALT, stage));
  if (!kinds.length || !rng.chance(GUEST_CHANCE)) return null;
  return rng.pick(kinds);
}

/** The grade a guest joins at: the fielded heroes' mean, rounded down (the roster's when none is fielded), at least 1. It keeps it: a
 *  guest never merges. */
export function guestGrade(run: Run): number {
  const own = run.squad.map((id) => heroOf(run, id)).filter((h): h is Owned => !!h && !h.guest && h.cloneFloors === undefined);
  const from = own.length ? own : run.roster.filter((h) => !h.guest && h.cloneFloors === undefined);
  if (!from.length) return 1;
  return Math.max(1, Math.min(MAX_GRADE, Math.floor(from.reduce((n, h) => n + h.grade, 0) / from.length)));
}

/** Why a guest cannot be taken now, if it cannot: the run is over, or it has one already. */
export const guestBlock = (run: Run): 'over' | 'held' | null => (run.over ? 'over' : guestOf(run) ? 'held' : null);

/** Take a guest of `kind` for `paid` gold (the cart's price, paid by the caller): it joins the roster and, by its own place, the squad.
 *  Returns it, or null (nothing changes) when `guestBlock` says no or the kind is unknown. */
export function takeGuest(run: Run, kind: string, paid: number): Owned | null {
  if (guestBlock(run) || !UNITS[kind]) return null;
  const h: Owned = { id: run.nextId++, kind, grade: guestGrade(run), paid, guest: true, xp: 0 };
  run.roster.push(h);
  if (canJoin(run, h.id)) run.squad.push(h.id);
  return h;
}

/** The party's standing a guest fights at, from the meta: the mean level and rank of the fielded heroes' kinds (the roster's when none is
 *  fielded), rounded down. Live, so a guest keeps pace as the party levels in the run. */
export function guestStanding(run: Run, meta: Meta): { level: number; rank: number } {
  const own = run.squad.map((id) => heroOf(run, id)).filter((h): h is Owned => !!h && !h.guest && h.cloneFloors === undefined);
  const kinds = [...new Set((own.length ? own : run.roster.filter((h) => !h.guest && h.cloneFloors === undefined)).map((h) => h.kind))];
  if (!kinds.length) return { level: 1, rank: 0 };
  const mean = (f: (k: string) => number) => Math.floor(kinds.reduce((n, k) => n + f(k), 0) / kinds.length);
  return { level: Math.max(1, mean((k) => levelOfKind(meta, k))), rank: mean((k) => heroRank(meta, k)) };
}

/** Whether the player owns the guest's kind: then it brings its own lasting level, rank, talents, equipment and awakening (`guestBoost`). */
export const guestOwned = (meta: Meta, h: Owned): boolean => meta.unlocked.includes(h.kind);

/** A guest's whole boost in a fight: its grade, the run's gear it wears and its training bumps, and the skill charge it keeps; with its own
 *  lasting level, rank, talents, equipment and awakening when the player owns its kind (as an own hero's), else the party's level and rank
 *  (`guestStanding`) and none of those. */
export function guestBoost(run: Run, meta: Meta, h: Owned): Boost {
  const own = guestOwned(meta, h);
  const { level, rank } = own ? { level: levelOfKind(meta, h.kind), rank: heroRank(meta, h.kind) } : guestStanding(run, meta);
  const base = gradeBoost(h.grade, rank, level);
  const g = gearBoost(h.gear);
  const equip = own ? heroStats(meta, h.kind) : undefined;
  const awaken = own ? awakenedOf(meta, h.kind) : 0;
  return { ...base, hp: base.hp! * g.hp! + (h.bump?.hp ?? 0), atk: base.atk! * g.atk! + (h.bump?.atk ?? 0), ...(equip ? { equip } : {}), ...(awaken ? { awaken } : {}), ...(h.charge ? { charge: h.charge } : {}), ...(h.charge2 ? { charge2: h.charge2 } : {}) };
}

/** The level a guest shows: its own lasting level when the player owns it, else the party's (`guestStanding`). */
export const guestLevel = (run: Run, meta: Meta, h?: Owned): number => (h && guestOwned(meta, h) ? levelOfKind(meta, h.kind) : guestStanding(run, meta).level);

/** A fight's XP by kind (`fightXp`), with the guest's share taken out and kept on the guest itself (its run XP): what is left goes to the
 *  lasting levels. The guest's kind earns nothing lasting. Returns the gains to keep, and the guest's share. */
export function splitGuestXp(run: Run, gains: Readonly<Record<string, number>>): { lasting: Record<string, number>; guest: number } {
  const g = guestOf(run);
  const lasting = { ...gains };
  if (!g || !(g.kind in lasting)) return { lasting, guest: 0 };
  const n = lasting[g.kind];
  delete lasting[g.kind];
  g.xp = (g.xp ?? 0) + n;
  return { lasting, guest: n };
}

/** The line a guest leaves with when the run ends (won or lost), one of a few, by its kind (no randomness). */
export function guestFarewell(h: Owned): string {
  const name = heroName(h.kind);
  const lines = [
    `${name} the guest takes the road home: "Look me up if your road comes my way."`,
    `${name} the guest bows and leaves the party: "A good fight. Send word when you need a sixth."`,
    `${name} the guest shoulders their pack and goes: "My thanks, and my blade, for another day."`,
  ];
  return lines[[...h.kind].reduce((n, c) => n + c.charCodeAt(0), 0) % lines.length];
}

/** The guest's farewell, if the run has ended with one (the page puts it on the run's last card, `waveNotes`' 'guest' line). */
export const farewellOf = (run: Run): string | null => {
  const g = guestOf(run);
  return run.over && g ? guestFarewell(g) : null;
};
