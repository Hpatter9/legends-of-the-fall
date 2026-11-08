// Teleport and blink, and swap places (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md sections 3.2 and 3.8). A blink moves
// the caster to a free tile at once, over heights, fighters and walls; a teleport slash strikes several foes in turn, appearing
// behind each; a swap trades two fighters' tiles. No randomness: the tiles and targets are chosen in a fixed order.

import { DIRS, solidFor, standable, tileAt, type At } from '../board';
import { atkOf, blowMult, defOf, defenceOf, hurt, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { movable } from './move';

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side && !x.under && !(x.hideUntil !== undefined && x.hideUntil > b.t));

/** Whether `me` could stand on `at`: on the board, no fighter there, nothing solid for its side, and ground it can stand on (a flier
 *  any but a wall). */
export function canLand(b: Battle, me: Unit, at: At): boolean {
  const t = tileAt(b.board, at.u, at.v);
  if (!t || unitAt(b, at.u, at.v)) return false;
  if (solidFor(t, me.side)) return false;
  if (defOf(me).flies) return true;
  const open = t.bar !== undefined && t.barSide === me.side;
  return (open || standable(t)) && t.ground !== 'deep';
}

/** Blink `me` to `at` (it must be a tile it can land on): at once, with the `blink` event. */
export function blinkTo(b: Battle, me: Unit, at: At, out: BattleEvent[]): boolean {
  if (!canLand(b, me, at)) return false;
  const from = { u: me.u, v: me.v };
  me.u = at.u;
  me.v = at.v;
  me.step = undefined;
  out.push({ kind: 'blink', by: me.id, from, to: { u: at.u, v: at.v } });
  return true;
}

/** The safest free tile within `n` of `me` (the escapes): farthest from the foes (the sum of the distances to the three nearest),
 *  then higher ground, then nearer, then the lower index. Undefined when there is none, or no foe to get away from. */
export function safeTile(b: Battle, me: Unit, n: number): At | undefined {
  const foes = foesOf(b, me);
  if (!foes.length) return undefined;
  const away = (at: At) => foes.map((f) => apart(at, f)).sort((x, y) => x - y).slice(0, 3).reduce((s, d) => s + d, 0);
  let best: { at: At; away: number; h: number; d: number; i: number } | undefined;
  for (let v = me.v - n; v <= me.v + n; v++)
    for (let u = me.u - n; u <= me.u + n; u++) {
      const at = { u, v };
      const d = apart(me, at);
      if (d === 0 || d > n || !canLand(b, me, at)) continue;
      // (a hero guarding a post in the Last Stand blinks only as far as its leash lets it, as its charges do)
      if (me.post && Math.abs(u - me.post.u) + Math.abs(v - me.post.v) > me.post.leash) continue;
      const c = { at, away: away(at), h: tileAt(b.board, u, v)!.h, d, i: v * b.board.w + u };
      if (!best || c.away > best.away || (c.away === best.away && (c.h > best.h || (c.h === best.h && (c.d < best.d || (c.d === best.d && c.i < best.i)))))) best = c;
    }
  return best && best.away > away(me) ? best.at : undefined;
}

/** The tile behind `target` for `me`: the one its back is turned to (opposite its facing); if that is taken, the free tile beside it
 *  farthest from the target's friends (then the lower index). */
export function behindTile(b: Battle, me: Unit, target: Unit): At | undefined {
  const back = DIRS[(target.facing + 2) % 4];
  const first = { u: target.u + back[0], v: target.v + back[1] };
  if (canLand(b, me, first)) return first;
  const friends = b.units.filter((x) => x.alive && x !== target && x.side === target.side);
  let best: { at: At; far: number; i: number } | undefined;
  for (const [du, dv] of DIRS) {
    const at = { u: target.u + du, v: target.v + dv };
    if (!canLand(b, me, at)) continue;
    const far = friends.reduce((s, x) => s + apart(at, x), 0);
    const i = at.v * b.board.w + at.u;
    if (!best || far > best.far || (far === best.far && i < best.i)) best = { at, far, i };
  }
  return best?.at;
}

const strike = (b: Battle, me: Unit, f: Unit, mult: number, out: BattleEvent[]): void => {
  const power = atkOf(me) * mult * blowMult(tileOf(b, me).h, tileOf(b, f).h, wayTo(me, f), f.facing);
  hurt(b, me, f, Math.max(1, Math.round(power - defenceOf(f))), true, false, out, 'skill');
};

/** Blink behind `target` and strike it (`mult` of attack). False when there is no tile behind it. */
export function blinkStrike(b: Battle, me: Unit, target: Unit, mult: number, out: BattleEvent[]): boolean {
  const at = behindTile(b, me, target);
  if (!at || !blinkTo(b, me, at, out)) return false;
  me.facing = wayTo(me, target);
  strike(b, me, target, mult, out);
  return true;
}

export interface SlashOpts {
  /** How many foes at most, and how far each hop may reach from the last tile. */
  k: number;
  reach: number;
  mult: number;
  /** The order the foes are taken in (the weakest, the hardest-hitting...). */
  order: (x: Unit, y: Unit) => number;
  /** Blink back where it started at the end. */
  home?: boolean;
}

/** The ms between two hops of a teleport slash (the page's streaks); the caster cannot be targeted for the whole slash. */
export const SLASH_HOP_MS = 120;

/** A teleport slash: up to `k` foes in turn, each within `reach` of the last tile, each struck once from behind. The foes struck, in
 *  order (none: nothing to do). */
export function teleportSlash(b: Battle, me: Unit, o: SlashOpts, out: BattleEvent[]): Unit[] {
  const start = { u: me.u, v: me.v };
  const hit: Unit[] = [];
  for (let n = 0; n < o.k; n++) {
    const next = foesOf(b, me)
      .filter((f) => !hit.includes(f) && apart(me, f) <= o.reach)
      .sort((x, y) => o.order(x, y) || x.id - y.id)
      .find((f) => behindTile(b, me, f));
    if (!next) break;
    blinkStrike(b, me, next, o.mult, out);
    hit.push(next);
  }
  if (!hit.length) return hit;
  me.hideUntil = Math.max(me.hideUntil ?? 0, b.t + SLASH_HOP_MS * hit.length);
  if (o.home && (me.u !== start.u || me.v !== start.v) && canLand(b, me, start)) blinkTo(b, me, start, out);
  return hit;
}

/** Whether two fighters may change places: both movable and not bosses (nor drawn bigger), each able to stand on the other's tile. */
export function canSwap(b: Battle, x: Unit, y: Unit): boolean {
  if (x === y || movable(x) !== 'yes' || movable(y) !== 'yes') return false;
  const tx = tileAt(b.board, x.u, x.v)!;
  const ty = tileAt(b.board, y.u, y.v)!;
  const can = (u: Unit, t: typeof tx) => defOf(u).flies || (t.ground !== 'deep' && !t.scene);
  return can(x, ty) && can(y, tx);
}

/** Swap two fighters' tiles at once (the `swap` event). */
export function swapPlaces(b: Battle, x: Unit, y: Unit, out: BattleEvent[]): boolean {
  if (!canSwap(b, x, y)) return false;
  const at = { u: x.u, v: x.v };
  x.u = y.u;
  x.v = y.v;
  y.u = at.u;
  y.v = at.v;
  x.step = y.step = undefined;
  out.push({ kind: 'swap', a: x.id, b: y.id });
  return true;
}
