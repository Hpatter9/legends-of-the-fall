// The Last Stand's idle heroes go to help (STAND-004, the owner's ask: "When all the units are on the map and heroes aren't engaged with
// them, they need to go help in the last stand"). Once every foe of a wave has come in, a hero with no foe near its own post (none in its
// zone: what its leash and reach cover, and a little more) leaves the post and goes where the fighting is: the foe that matters most, scored
// by how near the king it is, how many foes stand round it (the breach under the most pressure), and whether a hurt hero is fighting it; a
// helper also weighs how far it has to walk. It goes back (its post is its home again) when a foe comes into its own zone, when the fight it
// went to is won (no foe it could reach), or when the next wave begins.
//
// The king is never left bare: a hero posted on the dais's inner ring (within `INNER_RING` of the king: the shooters and healers by default)
// never leaves, and at least `GUARD_MIN` standing heroes always stay (the inner ring first, then tanks, then whoever is posted nearest).
// Tanks are the last to go: they wait longer with nothing to do (`TANK_IDLE_MS`) than the rest (`HELP_IDLE_MS`). The heroes set off one at a
// time, `HELP_GAP_MS` apart, so a post is not emptied all at once.
//
// The choice is made each tick of a wave by `planHelp` (from `stepStand`), into `Battle.stand.help` (helper id to the foe it goes for);
// `standAi.ts` walks a helper there (`helpDecide`). No randomness at all. Pure rules: no Pixi, no DOM.

import { apart, type Battle, type Unit } from './battle';
import { hidden } from './equipFx';
import { ringOf } from './standField';
import { UNITS } from './units';

/** A hero posted this near the king (the dais's edge) never leaves him. */
export const INNER_RING = 2;
/** The fewest standing heroes that stay at their posts, whoever they are. */
export const GUARD_MIN = 2;
/** How long (ms) a hero must have had nothing in its zone before it goes to help; a tank waits longer. */
export const HELP_IDLE_MS = 1000;
export const TANK_IDLE_MS = 3000;
/** The least time (ms) between two heroes setting off. */
export const HELP_GAP_MS = 600;
/** A hero called home (a foe came into its zone) stays home at least this long (ms) before it may go again. */
export const HELP_REST_MS = 3000;
/** How far past its leash and reach (tiles) a hero still counts a foe as its own. */
export const ZONE_PAD = 2;
/** A hurt hero (below this share of its health) draws the helpers to the foes beside it. */
export const HURT_SHARE = 0.5;

/** What the helping keeps between ticks (on the Last Stand, not saved: a wave's helping starts afresh). */
export interface HelpBook {
  /** Since when (battle ms) each hero has had nothing in its zone. */
  idle: Map<number, number>;
  /** Until when (battle ms) a hero called home must stay. */
  rest: Map<number, number>;
  /** When the last hero set off. */
  sent: number;
}

export const newHelpBook = (): HelpBook => ({ idle: new Map(), rest: new Map(), sent: -Infinity });

/** The tiles round a hero's post it counts as its own: its leash, its reach, and `ZONE_PAD`. */
export const zoneOf = (h: Unit): number => h.post!.leash + Math.max(1, UNITS[h.def].range) + ZONE_PAD;

/** The foes threatening a hero's own zone (round its post, not round where it stands now). */
export const threatsTo = (h: Unit, foes: readonly Unit[]): Unit[] => foes.filter((f) => apart(f, h.post!) <= zoneOf(h));

/** How much a foe needs dealing with, for a helper `me` (lower is sooner): near the king, in a crowd, beside a hurt hero, and not too far to walk. */
export function needOf(b: Battle, me: Unit, f: Unit, foes: readonly Unit[], heroes: readonly Unit[]): number {
  const king = b.stand!.at;
  let crowd = 0;
  for (const x of foes) if (x !== f && apart(x, f) <= 2) crowd++;
  const hurt = heroes.some((h) => h !== me && h.hp < h.maxHp * HURT_SHARE && apart(h, f) <= 2);
  return apart(f, king) - 1.5 * Math.min(crowd, 6) - (hurt ? 4 : 0) + 0.5 * apart(me, f);
}

/** The foe a helper goes for: the one most in need of dealing with, the lowest id of equals. */
function targetFor(b: Battle, me: Unit, foes: readonly Unit[], heroes: readonly Unit[]): Unit | null {
  let best: Unit | null = null;
  let score = Infinity;
  for (const f of foes) {
    const n = needOf(b, me, f, foes, heroes);
    if (n < score || (n === score && best && f.id < best.id)) {
      score = n;
      best = f;
    }
  }
  return best;
}

/** The heroes who stay with the king whatever happens: the inner ring, and enough more (tanks first, then the nearest posted) to make `GUARD_MIN`. */
export function guardOf(heroes: readonly Unit[]): Set<number> {
  const keep = new Set<number>();
  for (const h of heroes) if (ringOf(h.post!) <= INNER_RING) keep.add(h.id);
  const rest = heroes.filter((h) => !keep.has(h.id)).sort((x, y) => +y.post!.tank - +x.post!.tank || ringOf(x.post!) - ringOf(y.post!) || x.id - y.id);
  while (keep.size < GUARD_MIN && rest.length) keep.add(rest.shift()!.id);
  return keep;
}

/**
 * One tick of the helping, in a wave: with every foe in (`allIn`), send idle heroes to help one at a time, keep the helpers' targets
 * fresh, and call home a helper whose own zone is threatened or whose fight is won. Out of a wave (or with foes still to come) nobody helps.
 */
export function planHelp(b: Battle, book: HelpBook, allIn: boolean): void {
  const st = b.stand!;
  const help = (st.help ??= {});
  const heroes = b.units.filter((u) => u.alive && u.side === 'hero' && u.tag !== undefined && u.post);
  const foes = b.units.filter((u) => u.alive && u.side === 'foe' && !hidden(b, u));
  // (the hunt has the wave's last foes run down by everyone: no helping beside it)
  if (!allIn || st.hunt || !foes.length) {
    for (const id of Object.keys(help)) delete help[+id];
    book.idle.clear();
    return;
  }
  const alive = new Set(heroes.map((h) => h.id));
  for (const id of Object.keys(help)) if (!alive.has(+id)) delete help[+id];
  for (const h of heroes) {
    const threatened = threatsTo(h, foes).length > 0;
    if (threatened) book.idle.delete(h.id);
    else if (!book.idle.has(h.id)) book.idle.set(h.id, b.t);
    if (help[h.id] === undefined) continue;
    // (a helper is called home when its own zone is threatened; else it keeps after the foe most in need, or the next one)
    if (threatened) {
      delete help[h.id];
      book.rest.set(h.id, b.t + HELP_REST_MS);
      book.idle.delete(h.id);
      continue;
    }
    const was = foes.find((f) => f.id === help[h.id]);
    if (!was) help[h.id] = targetFor(b, h, foes, heroes)!.id;
  }
  // (one more sets off, if one may: never from the guard, never so many that fewer than GUARD_MIN stay)
  if (b.t - book.sent < HELP_GAP_MS) return;
  const guard = guardOf(heroes);
  const away = Object.keys(help).length;
  if (heroes.length - away - 1 < GUARD_MIN) return;
  const ready = heroes.filter((h) => {
    if (help[h.id] !== undefined || guard.has(h.id) || (book.rest.get(h.id) ?? -Infinity) > b.t) return false;
    const since = book.idle.get(h.id);
    return since !== undefined && b.t - since >= (h.post!.tank ? TANK_IDLE_MS : HELP_IDLE_MS);
  });
  // (the non-tanks first, then whoever has waited longest)
  ready.sort((x, y) => +x.post!.tank - +y.post!.tank || book.idle.get(x.id)! - book.idle.get(y.id)! || x.id - y.id);
  const go = ready[0];
  if (!go) return;
  help[go.id] = targetFor(b, go, foes, heroes)!.id;
  book.sent = b.t;
}

/** Whether a hero is out helping (the page draws its pointer, the AI walks it). */
export const helping = (b: Battle, u: Unit): boolean => b.stand?.help?.[u.id] !== undefined;
