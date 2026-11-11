// HEROES-FILTER (docs/notes/heroes-filter.md): the roster's Sort and Filter (the Heroes tab's "All heroes" list). The owner: "Need a filter
// and sort button for the heroes screen." Pure: no DOM and no Pixi; `menuHeroes.ts` draws what this says, and the choice is kept with the
// settings (`Settings.roster`, an optional field).
//
// - Sort: the game's own order (the default, as before), or by level, rank (then shards), name, class, newest joined, power, or the heroes
//   with an upgrade ready first; each either way round.
// - Filter (several at once: every group chosen must hold, and within classes or traits any one of the chosen): owned or not yet owned, the
//   class on the hero's card, its traits, in the party or not, an upgrade ready, Mythic. The game has no elements and no favourites, so
//   there are no such filters.
// - A hero the save may not name yet (a secret hero, "???") is never sorted or filtered by what it is: it keeps its own place and order, a
//   name search never finds it, and a filter by class, trait, Mythic or upgrade leaves it out, so no filter can tell what it is.

import type { Meta } from './sim/meta';
import { takenRank } from './sim/meta';
import { ALL_HEROES, UNITS } from './sim/units';
import { CLASS_OF, type StarterClass } from './sim/starter';
import { TRAITS, traitsOf } from './sim/traits';
import { heroName } from './sim/heroNames';
import { progressOf, xpOf } from './sim/levels';
import { kindPower } from './sim/power';
import { markReady } from './sim/upgradesReady';
import { isMythic } from './sim/mythicRules';
import { lockInfo } from './sim/contentHeroes';
import { haveOf } from './sim/unlock';

export const ROSTER_SORTS = ['default', 'level', 'rank', 'name', 'class', 'newest', 'power', 'ready'] as const;
export type RosterSort = (typeof ROSTER_SORTS)[number];

/** Each sort's name on the sheet and in the list's head ("Sorted by level"), and its two ways round: the first is the one a tap gives. */
export const SORT_INFO: Readonly<Record<RosterSort, { name: string; word: string; first: string; second: string }>> = {
  default: { name: 'The keep’s order', word: '', first: '', second: '' },
  level: { name: 'Level', word: 'level', first: 'Highest first', second: 'Lowest first' },
  rank: { name: 'Rank', word: 'rank', first: 'Highest first', second: 'Lowest first' },
  name: { name: 'Name', word: 'name', first: 'A to Z', second: 'Z to A' },
  class: { name: 'Class', word: 'class', first: 'Guardians first', second: 'Supports first' },
  newest: { name: 'Newest joined', word: 'newest joined', first: 'Newest first', second: 'Oldest first' },
  power: { name: 'Power', word: 'power', first: 'Strongest first', second: 'Weakest first' },
  ready: { name: 'Ready to upgrade', word: 'upgrade ready', first: 'Ready first', second: 'Ready last' },
};

/** The classes in the order the class sort lists them, with the names the hero cards wear. */
export const CLASS_ORDER: readonly StarterClass[] = ['front', 'striker', 'shooter', 'caster', 'support'];
export const CARD_CLASS_NAMES: Readonly<Record<StarterClass, string>> = { front: 'Guardian', striker: 'Fighter', shooter: 'Shooter', caster: 'Mage', support: 'Support' };

/** The player's choice: every field optional, and none set is the list as it always was. */
export interface RosterView {
  sort?: RosterSort;
  /** The sort's other way round (lowest first, Z to A...). */
  flip?: boolean;
  /** Only the heroes owned, or only those not yet owned. */
  own?: 'owned' | 'missing';
  /** Any of these classes (`StarterClass`). */
  classes?: string[];
  /** Any of these traits (`TRAITS`). */
  traits?: string[];
  /** Only the heroes in the party, or only those out of it. */
  party?: 'in' | 'out';
  /** Only heroes with a rank, an awakening or talent points ready. */
  ready?: boolean;
  /** Only the Mythics. */
  mythic?: boolean;
}

/** One hero as the list sees it. */
export interface RosterRow {
  kind: string;
  /** Whether the save may name it (owned, or its shards begun); false is a "???" row. */
  named: boolean;
  owned: boolean;
  name: string;
  /** What a name search reads (lower case; empty for a hero not named). */
  text: string;
  cls: StarterClass;
  traits: readonly string[];
  level: number;
  rank: number;
  shards: number;
  power: number;
  /** Its place in the order the heroes joined (-1 when not owned). */
  joined: number;
  inParty: boolean;
  ready: boolean;
  mythic: boolean;
  /** Its place in the game's own order: the default sort, and what settles a tie. */
  base: number;
}

/** A saved choice made safe: unknown sorts, classes and traits are dropped, and so is anything of the wrong shape. */
export function cleanView(raw: unknown): RosterView {
  const v = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: RosterView = {};
  if (ROSTER_SORTS.includes(v.sort as RosterSort) && v.sort !== 'default') {
    out.sort = v.sort as RosterSort;
    if (v.flip === true) out.flip = true;
  }
  if (v.own === 'owned' || v.own === 'missing') out.own = v.own;
  if (v.party === 'in' || v.party === 'out') out.party = v.party;
  const list = (x: unknown, ok: (s: string) => boolean): string[] => (Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === 'string' && ok(s)))] : []);
  const classes = list(v.classes, (s) => CLASS_ORDER.includes(s as StarterClass));
  if (classes.length) out.classes = classes;
  const traits = list(v.traits, (s) => s in TRAITS);
  if (traits.length) out.traits = traits;
  if (v.ready === true) out.ready = true;
  if (v.mythic === true) out.mythic = true;
  return out;
}

/** How many filters are on (each class and each trait chosen counts as one). */
export const filterCount = (v: RosterView): number =>
  (v.own ? 1 : 0) + (v.classes?.length ?? 0) + (v.traits?.length ?? 0) + (v.party ? 1 : 0) + (v.ready ? 1 : 0) + (v.mythic ? 1 : 0);

/** Whether anything is chosen at all (the Clear button shows). */
export const viewActive = (v: RosterView, search = ''): boolean => (!!v.sort && v.sort !== 'default') || filterCount(v) > 0 || !!search.trim();

/** The list's head: "Sorted by level · 2 filters", or nothing while the list is as it always was. */
export function viewLine(v: RosterView): string {
  const sort = v.sort && v.sort !== 'default' ? `Sorted by ${SORT_INFO[v.sort].word}${v.flip ? ` (${SORT_INFO[v.sort].second.toLowerCase()})` : ''}` : '';
  const n = filterCount(v);
  return [sort, n ? `${n} ${n === 1 ? 'filter' : 'filters'}` : ''].filter(Boolean).join(' · ');
}

/** Whether a hero passes the filters and the name search. */
export function passes(r: RosterRow, v: RosterView, search = ''): boolean {
  const q = search.trim().toLowerCase();
  if (q && (!r.named || !r.text.includes(q))) return false;
  if (v.own === 'owned' && !r.owned) return false;
  if (v.own === 'missing' && r.owned) return false;
  if (v.party === 'in' && !r.inParty) return false;
  if (v.party === 'out' && r.inParty) return false;
  // (what a hero is stays unknown until it may be named)
  const about = !!v.classes?.length || !!v.traits?.length || !!v.mythic || !!v.ready;
  if (about && !r.named) return false;
  if (v.classes?.length && !v.classes.includes(r.cls)) return false;
  if (v.traits?.length && !v.traits.some((t) => r.traits.includes(t))) return false;
  if (v.ready && !r.ready) return false;
  if (v.mythic && !r.mythic) return false;
  return true;
}

/** The sort's measure of two heroes, its first way round (negative: `a` comes first). */
function measure(sort: RosterSort, a: RosterRow, b: RosterRow): number {
  switch (sort) {
    case 'level':
      return b.level - a.level;
    case 'rank':
      return b.rank - a.rank || b.shards - a.shards;
    case 'name':
      return a.name.localeCompare(b.name, 'en');
    case 'class':
      return CLASS_ORDER.indexOf(a.cls) - CLASS_ORDER.indexOf(b.cls);
    case 'newest':
      return b.joined - a.joined;
    case 'power':
      return b.power - a.power;
    case 'ready':
      return Number(b.ready) - Number(a.ready);
    default:
      return 0;
  }
}

/** The heroes in the chosen order (a new list). A hero not named keeps the game's order among its like and comes after the named ones;
 *  ties fall to the game's order, whichever way round the sort is. */
export function sortRows(rows: readonly RosterRow[], v: RosterView): RosterRow[] {
  const sort = v.sort ?? 'default';
  const way = v.flip ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (a.named !== b.named) return a.named ? -1 : 1;
    if (!a.named || sort === 'default') return a.base - b.base;
    return way * measure(sort, a, b) || a.base - b.base;
  });
}

/** The list to show: filtered, then sorted. */
export const viewRows = (rows: readonly RosterRow[], v: RosterView, search = ''): RosterRow[] => sortRows(rows.filter((r) => passes(r, v, search)), v);

/** Every hero of the game as the list sees it for this save, in the game's order. `extra` adds words a name search may also find (the card's
 *  class name). */
export function rosterRows(m: Meta, extra: (kind: string) => string = () => ''): RosterRow[] {
  return ALL_HEROES.map((kind, base) => {
    const owned = m.unlocked.includes(kind);
    const named = owned || !!lockInfo(m, kind)?.named;
    const cls = CLASS_OF[kind];
    return {
      kind,
      named,
      owned,
      name: heroName(kind),
      text: named ? `${heroName(kind)} ${UNITS[kind].name} ${CARD_CLASS_NAMES[cls]} ${extra(kind)}`.toLowerCase() : '',
      cls,
      traits: traitsOf(kind),
      level: owned ? progressOf(xpOf(m, kind)).level : 0,
      rank: owned ? takenRank(m, kind) : 0,
      shards: owned ? (m.shards[kind] ?? 0) : haveOf(m, kind),
      power: owned ? kindPower(m, kind) : 0,
      joined: m.unlocked.indexOf(kind),
      inParty: m.party.includes(kind),
      ready: owned && markReady(m, kind),
      mythic: isMythic(kind),
      base,
    };
  });
}

/** The traits the filter offers: those some hero the save may name has, in the game's order (so a secret hero's trait is not given away
 *  by being on the list alone). */
export const traitChoices = (rows: readonly RosterRow[]): string[] => Object.keys(TRAITS).filter((t) => rows.some((r) => r.named && r.traits.includes(t)));

/** Whether the Mythic filter is offered: only once the save may name one. */
export const mythicKnown = (rows: readonly RosterRow[]): boolean => rows.some((r) => r.named && r.mythic);
