// The Last Stand's minds. A hero guards the tile it was posted on: it strikes what is in reach, goes only to a tile within its
// leash from which it can strike, and walks back to its post when the zone is clear, so it never runs off into the horde.
// A tank prefers the foe nearest the king, and has the longest leash; a shooter has the shortest. A foe goes for the king along
// a flow field (one table look-up a step, however many foes there are), striking the king if he is in reach, else whoever of the
// heroes is in reach (the ones that block its way), and shooters stop and shoot what is in range.
//
// Only a battle with `Battle.stand` set comes here (`decide` in battle.ts); every other fight never calls it. Pure rules: no Pixi, no DOM.

import { canStep, DIRS, tileAt, type At, type Board } from './board';
import { apart, canStrike, stepTo, strikeDef, swing, tileOf, WAIT_MS, type Battle, type BattleEvent, type Unit } from './battle';
import { tryCast } from './abilities';
import { hidden } from './equipFx';
import type { Rng } from './rng';
import type { UnitDef } from './units';
import { CLASS_OF } from './starter';

/** The id of the king's kind in `UNITS`. */
export const KING_DEF = 'standKing';

/** How far (in tiles) a hero may stray from its post: a shooter stays close, a fighter a little further, a tank furthest. */
export const LEASH_SHOOTER = 1;
export const LEASH_MELEE = 4;
export const LEASH_TANK = 5;
/** A fighter this hard to hurt (and close-ranged) is a tank. */
export const TANK_DEF = 8;
/** How long a hero or foe with nothing to do waits before looking again. */
const IDLE_MS = 200;

/** Whether a kind is a tank: it strikes in melee and is hard to hurt. */
export const isTank = (def: UnitDef): boolean => !def.shot && def.range <= 1 && def.def >= TANK_DEF;
/** A kind's leash. */
export const leashOf = (def: UnitDef): number => (def.shot || def.range >= 3 || CLASS_OF[def.id] === 'support' ? LEASH_SHOOTER : isTank(def) ? LEASH_TANK : LEASH_MELEE);

/** The post a hero guards: where it stands when it is first asked what to do, unless the Last Stand set it. */
export function postOf(me: Unit, def: UnitDef): NonNullable<Unit['post']> {
  return (me.post ??= { u: me.u, v: me.v, leash: leashOf(def), tank: isTank(def) });
}

/** The cost to reach the king from every tile for a fighter that jumps `jump` (Infinity where it cannot): Dijkstra outwards from the king, over the steps taken the other way. */
export function flowField(board: Board, king: At, jump: number): number[] {
  const n = board.w * board.d;
  const cost = new Array<number>(n).fill(Infinity);
  const start = king.v * board.w + king.u;
  cost[start] = 0;
  const open = [start];
  while (open.length) {
    let k = 0;
    for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[k]] || (cost[open[i]] === cost[open[k]] && open[i] < open[k])) k = i;
    const i = open.splice(k, 1)[0];
    const u = i % board.w;
    const v = Math.floor(i / board.w);
    for (const [du, dv] of DIRS) {
      const t = tileAt(board, u + du, v + dv);
      if (!t) continue;
      const j = (v + dv) * board.w + u + du;
      // (the step from j to i: what a walker pays to go that way)
      const step = canStep(t, board.tiles[i], jump);
      if (step === null) continue;
      const c = cost[i] + step;
      if (c >= cost[j]) continue;
      if (cost[j] === Infinity) open.push(j);
      cost[j] = c;
    }
  }
  return cost;
}

const fieldFor = (b: Battle, jump: number): number[] => (b.stand!.fields[jump] ??= flowField(b.board, b.stand!.at, jump));

/** The unit standing on a tile, if any (alive). */
const standingOn = (b: Battle, u: number, v: number): Unit | undefined => {
  for (const x of b.units) if (x.alive && x.u === u && x.v === v) return x;
  return undefined;
};

/** The cheapest walks from `start`, never through a tile in `blocked` and never more than `radius` tiles (either way) from `centre`. */
function walkNear(board: Board, start: At, jump: number, blocked: ReadonlySet<number>, centre: At, radius: number): { cost: number[]; from: number[] } {
  const n = board.w * board.d;
  const cost = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  const s = start.v * board.w + start.u;
  cost[s] = 0;
  const open = [s];
  while (open.length) {
    let k = 0;
    for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[k]] || (cost[open[i]] === cost[open[k]] && open[i] < open[k])) k = i;
    const i = open.splice(k, 1)[0];
    const u = i % board.w;
    const v = Math.floor(i / board.w);
    for (const [du, dv] of DIRS) {
      const t = tileAt(board, u + du, v + dv);
      if (!t || Math.abs(u + du - centre.u) + Math.abs(v + dv - centre.v) > radius) continue;
      const j = (v + dv) * board.w + u + du;
      if (blocked.has(j)) continue;
      const step = canStep(board.tiles[i], t, jump);
      if (step === null) continue;
      const c = cost[i] + step;
      if (c >= cost[j]) continue;
      if (cost[j] === Infinity) open.push(j);
      cost[j] = c;
      from[j] = i;
    }
  }
  return { cost, from };
}

/** The first tile on the walk to `goal`. */
function firstOf(w: { cost: number[]; from: number[] }, goal: number): number | null {
  if (w.cost[goal] === Infinity || w.from[goal] < 0) return null;
  let j = goal;
  while (w.from[j] >= 0 && w.cost[w.from[j]] > 0) j = w.from[j];
  return j;
}

/** What a hero or foe does when it is free to act, in the Last Stand. True when it has done something (or waited); false hands the unit back to the usual mind. */
export function standDecide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): boolean {
  if (me.def === KING_DEF) {
    // (the king stands)
    me.busyUntil = b.t + 1000;
    return true;
  }
  me.step = undefined;
  me.cast = undefined;
  if (me.side === 'hero' ? castInZone(b, me, out) : tryCast(b, me, out)) return true;
  if (me.charmUntil !== undefined && me.charmUntil > b.t) return false;
  return me.side === 'hero' ? heroDecide(b, me, rng, out) : foeDecide(b, me, rng, out);
}

/** A hero's skill, cast as if no foe outside its zone were there, so a leap or a dive never takes it past its leash into the horde. */
function castInZone(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const post = postOf(me, def);
  const home = { u: post.u, v: post.v };
  const zone = post.leash + Math.max(1, def.range) + 1;
  const veiled: [Unit, number | undefined][] = [];
  for (const x of b.units) {
    if (x.alive && x.side === 'foe' && apart(x, home) > zone) {
      veiled.push([x, x.hideUntil]);
      x.hideUntil = b.t + 1;
    }
  }
  const from = { u: me.u, v: me.v };
  const first = out.length;
  const cast = apart(me, home) <= post.leash && tryCast(b, me, out);
  for (const [x, was] of veiled) x.hideUntil = was;
  // a dash or blink that would end beyond the leash stops short of it: the hero lands on the last free tile of its way that is still inside
  if (cast && apart(me, home) > post.leash) {
    const to = { u: me.u, v: me.v };
    const n = Math.max(Math.abs(to.u - from.u), Math.abs(to.v - from.v));
    let land = from;
    for (let i = 1; i <= n; i++) {
      const at = { u: Math.round(from.u + ((to.u - from.u) * i) / n), v: Math.round(from.v + ((to.v - from.v) * i) / n) };
      if (apart(at, home) <= post.leash && tileAt(b.board, at.u, at.v) && !b.units.some((x) => x.alive && x !== me && x.u === at.u && x.v === at.v)) land = at;
    }
    me.u = land.u;
    me.v = land.v;
    for (let i = first; i < out.length; i++) {
      const e = out[i];
      if ((e.kind === 'dash' || e.kind === 'blink') && e.by === me.id) out[i] = { ...e, to: land };
    }
  }
  return cast;
}

/** A hero: strike what is in reach from the post's zone, step to a tile within the leash to do so, or go back to the post. */
function heroDecide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const post = postOf(me, def);
  const kingAt = b.stand!.at;
  const home = { u: post.u, v: post.v };
  const strayed = apart(me, home) > post.leash;
  // the foes whose zone this is: near enough to the post that a tile within the leash could strike them
  const reach = post.leash + def.range;
  let foes: Unit[] = [];
  for (const x of b.units) if (x.alive && x.side === 'foe' && !hidden(b, x) && apart(x, home) <= reach + 1) foes.push(x);
  if (me.taunt) {
    const drawn = me.taunt.until > b.t ? foes.find((x) => x.id === me.taunt!.to) : undefined;
    if (drawn) foes = [drawn];
    else me.taunt = undefined;
  }
  const rank = post.tank
    ? (x: Unit, y: Unit) => apart(x, kingAt) - apart(y, kingAt) || x.hp - y.hp || x.id - y.id
    : (x: Unit, y: Unit) => x.hp - y.hp || apart(me, x) - apart(me, y) || x.id - y.id;
  const inReach = foes.filter((f) => canStrike(b.board, def, me, f)).sort(rank);
  // (a hero carried off its post by a leap or a knock goes straight back; if the way is shut it fights where it stands)
  if (!strayed && inReach.length) {
    swing(b, me, inReach[0], rng, out);
    return true;
  }
  if (foes.length && !strayed) {
    // a tile within the leash, no further than a few steps, from which a foe can be struck: the first foe in rank that has one
    const blocked = new Set<number>();
    for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
    const walk = walkNear(b.board, me, def.jump, blocked, home, post.leash);
    for (const f of [...foes].sort(post.tank ? rank : (x, y) => apart(me, x) - apart(me, y) || x.id - y.id)) {
      let goal = -1;
      let best = Infinity;
      for (let i = 0; i < walk.cost.length; i++) {
        if (walk.cost[i] === Infinity || walk.cost[i] === 0 || walk.cost[i] >= best) continue;
        const at = { u: i % b.board.w, v: Math.floor(i / b.board.w) };
        if (apart(at, home) > post.leash || !canStrike(b.board, def, at, f)) continue;
        best = walk.cost[i];
        goal = i;
      }
      const next = goal >= 0 ? firstOf(walk, goal) : null;
      if (next !== null) {
        stepTo(b, me, next, out);
        return true;
      }
    }
  }
  // the zone is clear (or cannot be reached): back to the post
  if (me.u !== post.u || me.v !== post.v) {
    const blocked = new Set<number>();
    for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
    // (a hero pushed far from its post may need a long way round: the walk is not held to the leash)
    const walk = walkNear(b.board, me, def.jump, blocked, home, Math.max(post.leash, apart(me, home)) + 6);
    const next = firstOf(walk, post.v * b.board.w + post.u);
    if (next !== null) {
      stepTo(b, me, next, out);
      return true;
    }
    if (strayed && inReach.length) {
      swing(b, me, inReach[0], rng, out);
      return true;
    }
  }
  me.busyUntil = b.t + IDLE_MS;
  return true;
}

/** A foe: strike the king if he is in reach, else the weakest hero in reach; else step down the flow field towards the king, round whoever is in the way. */
function foeDecide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const st = b.stand!;
  const king = b.units.find((x) => x.id === st.king);
  if (!king?.alive) {
    me.busyUntil = b.t + 1000;
    return true;
  }
  if (me.taunt) {
    const drawn = me.taunt.until > b.t ? b.units.find((x) => x.id === me.taunt!.to && x.alive) : undefined;
    if (drawn && canStrike(b.board, def, me, drawn)) {
      swing(b, me, drawn, rng, out);
      return true;
    }
    if (!drawn) me.taunt = undefined;
  }
  if (canStrike(b.board, def, me, king)) {
    swing(b, me, king, rng, out);
    return true;
  }
  let target: Unit | null = null;
  for (const x of b.units) {
    if (!x.alive || x.side !== 'hero' || hidden(b, x) || !canStrike(b.board, def, me, x)) continue;
    if (!target || x.hp < target.hp || (x.hp === target.hp && x.id < target.id)) target = x;
  }
  if (target) {
    swing(b, me, target, rng, out);
    return true;
  }
  const field = fieldFor(b, def.jump);
  const here = me.v * b.board.w + me.u;
  const from = tileOf(b, me);
  // the neighbour that is nearest the king and free; a free one no further off than here will do when the way ahead is packed
  let best = -1;
  let bestCost = Infinity;
  let side = -1;
  let sideCost = Infinity;
  for (const [du, dv] of DIRS) {
    const t = tileAt(b.board, me.u + du, me.v + dv);
    if (!t) continue;
    const j = (me.v + dv) * b.board.w + me.u + du;
    if (field[j] === Infinity || canStep(from, t, def.jump) === null || standingOn(b, me.u + du, me.v + dv)) continue;
    if (field[j] < bestCost) {
      bestCost = field[j];
      best = j;
    }
    if (field[j] <= field[here] + 1 && field[j] < sideCost && rng.chance(0.5)) {
      sideCost = field[j];
      side = j;
    }
  }
  const go = best >= 0 && bestCost < field[here] ? best : side;
  if (go >= 0) {
    stepTo(b, me, go, out);
    return true;
  }
  me.busyUntil = b.t + WAIT_MS;
  return true;
}
