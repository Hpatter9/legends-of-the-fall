// One fight, King God Castle style: the heroes are placed on the near rows while the foes wait on the far ones, then
// both sides fight on their own in real time. Time moves in fixed ticks (`TICK_MS`), so the same board and the same
// placing always play out the same. Each fighter, when free, strikes the weakest foe it can reach from where it
// stands, or else walks one tile toward the nearest it can get at. High ground and blows from the side or behind hit
// harder, and shooters reach further from high ground (Chronos's `blowMult` and `shotReach`).
//
// Pure rules: no Pixi, no DOM. The renderer reads the battle and the events each tick returns.

import { boardOk, D, DEPLOY_ROWS, makeBoard, sightClear, standable, tileAt, type At, type Board } from './board';
import { firstStep, walkFrom } from './path';
import { mixSeed, Rng } from './rng';
import { FOE_BAND, SPLASH_SHARE, UNITS, type Shot, type Side, type UnitDef } from './units';

export const TICK_MS = 100;
/** A fight still going after this long is lost (the foes held). */
export const TIME_LIMIT_MS = 120_000;
/** How long a fighter with nothing it can do waits before looking again. */
const WAIT_MS = 300;

export type Phase = 'deploy' | 'fight' | 'won' | 'lost';

export interface Unit {
  id: number;
  def: string;
  side: Side;
  u: number;
  v: number;
  hp: number;
  maxHp: number;
  /** 0 = +u, 1 = +v, 2 = -u, 3 = -v. */
  facing: number;
  alive: boolean;
  /** Free to act again from this time. */
  busyUntil: number;
  /** The step being walked: the tile it left, and when and for how long. */
  step?: { u: number; v: number; h: number; at: number; ms: number };
  /** The blow being swung, from when and for how long. */
  swing?: { at: number; ms: number; to: number };
  hurtAt?: number;
  diedAt?: number;
}

interface Pending {
  at: number;
  kind: 'release' | 'land';
  by: number;
  to: number;
  dmg: number;
  heavy: boolean;
}

export type BattleEvent =
  | { kind: 'swing'; by: number; to: number }
  | { kind: 'shot'; by: number; to: number; shot: Shot; ms: number }
  | { kind: 'hit'; by: number; to: number; dmg: number; heavy: boolean; splash: boolean; killed: boolean }
  | { kind: 'end'; won: boolean };

export interface Battle {
  seed: number;
  board: Board;
  units: Unit[];
  phase: Phase;
  /** Time into the fight (ms). */
  t: number;
  /** The fight's own random stream (its state). */
  rng: number;
  pending: Pending[];
  nextId: number;
}

export const defOf = (u: Unit): UnitDef => UNITS[u.def];
const apart = (a: At, b: At) => Math.abs(a.u - b.u) + Math.abs(a.v - b.v);
const tileOf = (b: Battle, a: At) => tileAt(b.board, a.u, a.v)!;
export const unitAt = (b: Battle, u: number, v: number): Unit | undefined => b.units.find((x) => x.alive && x.u === u && x.v === v);
/** Whether a tile is on the heroes' rows. */
export const isDeployTile = (v: number) => v >= D - DEPLOY_ROWS;

/** The way from one tile toward another, as a facing (the longer axis; along v when even). */
export function wayTo(a: At, b: At): number {
  const du = b.u - a.u;
  const dv = b.v - a.v;
  if (Math.abs(du) > Math.abs(dv)) return du > 0 ? 0 : 2;
  return dv > 0 ? 1 : 3;
}

/** A blow's multiplier from height and angle: +10% a step above (to three), and from behind x1.5, the side x1.25. */
export function blowMult(hFrom: number, hTo: number, way: number, toFacing: number): number {
  const angle = way === toFacing ? 1.5 : (way + 2) % 4 === toFacing ? 1 : 1.25;
  return angle * (1 + 0.1 * Math.max(-3, Math.min(3, hFrom - hTo)));
}

/** How far a shooter reaches: its range, and more from high ground. */
export const shotReach = (range: number, hFrom: number, hTo: number) => range + Math.floor(Math.max(0, hFrom - hTo) * 0.7);

/** Whether a fighter of kind `def` standing at `from` can strike a foe at `to`. */
export function canStrike(board: Board, def: UnitDef, from: At, to: At): boolean {
  const d = apart(from, to);
  if (d < 1) return false;
  const hf = tileAt(board, from.u, from.v)!.h;
  const ht = tileAt(board, to.u, to.v)!.h;
  if (def.shot) return d <= shotReach(def.range, hf, ht) && sightClear(board, from, to);
  return d <= def.range && Math.abs(hf - ht) <= def.jump;
}

/** A fresh fight on the seed's board: the foes in their rows, no heroes placed yet. */
export function startBattle(seed: number): Battle {
  const board = makeBoard(seed);
  const b: Battle = { seed, board, units: [], phase: 'deploy', t: 0, rng: mixSeed(seed, 0xf167), pending: [], nextId: 1 };
  // the foes: fighters in the front row (v = DEPLOY_ROWS - 1), shooters at the back, by a side stream of the seed
  const rng = new Rng(mixSeed(seed, 0xf0e5));
  for (const id of FOE_BAND) {
    const def = UNITS[id];
    const rows = def.shot ? [0, 1, 2] : [DEPLOY_ROWS - 1, DEPLOY_ROWS - 2, 0];
    for (const v of rows) {
      const free: number[] = [];
      for (let u = 0; u < board.w; u++) if (standable(tileAt(board, u, v)) && !unitAt(b, u, v)) free.push(u);
      if (!free.length) continue;
      addUnit(b, id, rng.pick(free), v);
      break;
    }
  }
  return b;
}

function addUnit(b: Battle, defId: string, u: number, v: number): Unit {
  const def = UNITS[defId];
  const unit: Unit = { id: b.nextId++, def: defId, side: def.side, u, v, hp: def.hp, maxHp: def.hp, facing: def.side === 'hero' ? 3 : 1, alive: true, busyUntil: 0 };
  b.units.push(unit);
  return unit;
}

/** Whether a hero may be put on a tile: the fight hasn't begun, it's on the heroes' rows, and it's free ground. */
export function canPlace(b: Battle, defId: string, u: number, v: number): boolean {
  if (b.phase !== 'deploy' || UNITS[defId]?.side !== 'hero') return false;
  if (!isDeployTile(v) || !standable(tileAt(b.board, u, v))) return false;
  const there = unitAt(b, u, v);
  return !there || there.def === defId;
}

/** Put a hero on a tile (or move it there, if it's already placed). */
export function place(b: Battle, defId: string, u: number, v: number): boolean {
  if (!canPlace(b, defId, u, v)) return false;
  const placed = b.units.find((x) => x.def === defId);
  if (placed) {
    placed.u = u;
    placed.v = v;
  } else addUnit(b, defId, u, v);
  return true;
}

/** Take a placed hero back to the bench. */
export function unplace(b: Battle, defId: string): boolean {
  if (b.phase !== 'deploy') return false;
  const i = b.units.findIndex((x) => x.def === defId && x.side === 'hero');
  if (i < 0) return false;
  b.units.splice(i, 1);
  return true;
}

export const heroesPlaced = (b: Battle) => b.units.filter((x) => x.side === 'hero').length;

/** Start the fight, if at least one hero is placed. */
export function fight(b: Battle): boolean {
  if (b.phase !== 'deploy' || !heroesPlaced(b) || !boardOk(b.board)) return false;
  b.phase = 'fight';
  return true;
}

/** One tick of the fight. Returns what happened, for the renderer to show. */
export function stepBattle(b: Battle): BattleEvent[] {
  const out: BattleEvent[] = [];
  if (b.phase !== 'fight') return out;
  b.t += TICK_MS;
  const rng = new Rng(b.rng);
  // blows and shots that land now
  b.pending.sort((x, y) => x.at - y.at);
  while (b.pending.length && b.pending[0].at <= b.t) settle(b, b.pending.shift()!, out);
  for (const me of b.units) if (me.alive && me.busyUntil <= b.t) decide(b, me, rng, out);
  b.rng = rng.state;
  const heroes = b.units.some((x) => x.alive && x.side === 'hero');
  const foes = b.units.some((x) => x.alive && x.side === 'foe');
  if (!heroes || !foes || b.t >= TIME_LIMIT_MS) {
    b.phase = heroes && !foes ? 'won' : 'lost';
    b.pending = [];
    out.push({ kind: 'end', won: b.phase === 'won' });
  }
  return out;
}

function settle(b: Battle, p: Pending, out: BattleEvent[]): void {
  const by = b.units.find((x) => x.id === p.by)!;
  const to = b.units.find((x) => x.id === p.to)!;
  const def = defOf(by);
  if (p.kind === 'release') {
    // the shot leaves the bow (or the hand); it lands a moment later wherever the target is
    if (!by.alive) return;
    const ms = 120 + apart(by, to) * 110;
    out.push({ kind: 'shot', by: by.id, to: to.id, shot: def.shot!, ms });
    b.pending.push({ ...p, kind: 'land', at: b.t + ms });
    return;
  }
  // (a sword falls with its wielder; a shot already flying still lands)
  if (!def.shot && !by.alive) return;
  hurt(b, by, to, p.dmg, p.heavy, false, out);
  if (def.splash)
    for (const n of b.units)
      if (n.alive && n.side === to.side && n !== to && apart(n, to) === 1) hurt(b, by, n, Math.max(1, Math.round(p.dmg * SPLASH_SHARE)), false, true, out);
}

function hurt(b: Battle, by: Unit, to: Unit, dmg: number, heavy: boolean, splash: boolean, out: BattleEvent[]): void {
  if (!to.alive) return;
  to.hp = Math.max(0, to.hp - dmg);
  to.hurtAt = b.t;
  const killed = to.hp <= 0;
  if (killed) {
    to.alive = false;
    to.diedAt = b.t;
    to.step = undefined;
    to.swing = undefined;
  }
  out.push({ kind: 'hit', by: by.id, to: to.id, dmg, heavy, splash, killed });
}

function decide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): void {
  const def = defOf(me);
  me.step = undefined;
  const foes = b.units.filter((x) => x.alive && x.side !== me.side);
  if (!foes.length) return;
  // strike the weakest foe in reach
  const inReach = foes.filter((f) => canStrike(b.board, def, me, f)).sort((x, y) => x.hp - y.hp || apart(me, x) - apart(me, y) || x.id - y.id);
  if (inReach.length) return swing(b, me, inReach[0], rng, out);
  // else walk toward the nearest foe it can get a blow at
  const blocked = new Set<number>();
  for (const x of b.units) if (x.alive && x !== me) blocked.add(x.v * b.board.w + x.u);
  const walk = walkFrom(b.board, me, def.jump, blocked);
  const byDistance = [...foes].sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  for (const f of byDistance) {
    let goal = -1;
    let best = Infinity;
    for (let i = 0; i < walk.cost.length; i++) {
      if (walk.cost[i] === Infinity || walk.cost[i] === 0) continue;
      const at = { u: i % b.board.w, v: Math.floor(i / b.board.w) };
      if (!canStrike(b.board, def, at, f)) continue;
      // (cheapest first; high ground breaks ties)
      const score = walk.cost[i] - b.board.tiles[i].h * 0.1;
      if (score < best) {
        best = score;
        goal = i;
      }
    }
    if (goal >= 0) return stepTo(b, me, firstStep(walk, goal)!, out);
  }
  // nobody can be got at from here: close in on the nearest anyway, round the others if the way is free
  const open = walkFrom(b.board, me, def.jump, new Set());
  const near = byDistance[0];
  const next = firstStep(open, near.v * b.board.w + near.u);
  if (next !== null && !blocked.has(next)) return stepTo(b, me, next, out);
  me.busyUntil = b.t + WAIT_MS;
}

function swing(b: Battle, me: Unit, to: Unit, rng: Rng, out: BattleEvent[]): void {
  const def = defOf(me);
  const way = wayTo(me, to);
  me.facing = way;
  const mult = blowMult(tileOf(b, me).h, tileOf(b, to).h, way, to.facing);
  const dmg = Math.max(1, Math.round(Math.max(1, def.atk - defOf(to).def) * mult * rng.range(0.9, 1.1)));
  const windup = Math.min(def.shot ? 500 : 400, Math.round(def.atkMs * 0.4));
  me.swing = { at: b.t, ms: windup + 250, to: to.id };
  me.busyUntil = b.t + def.atkMs;
  b.pending.push({ at: b.t + windup, kind: def.shot ? 'release' : 'land', by: me.id, to: to.id, dmg, heavy: mult >= 1.4 });
  out.push({ kind: 'swing', by: me.id, to: to.id });
}

function stepTo(b: Battle, me: Unit, i: number, _out: BattleEvent[]): void {
  const def = defOf(me);
  const next = { u: i % b.board.w, v: Math.floor(i / b.board.w) };
  const from = tileOf(b, me);
  const to = tileOf(b, next);
  const cost = 1 + Math.max(0, to.h - from.h);
  const ms = def.moveMs * cost;
  me.step = { u: me.u, v: me.v, h: from.h, at: b.t, ms };
  me.facing = wayTo(me, next);
  me.u = next.u;
  me.v = next.v;
  me.busyUntil = b.t + ms;
}

/** Play a fight to its end (for tests and quick checks). */
export function playOut(b: Battle): Battle {
  while (b.phase === 'fight') stepBattle(b);
  return b;
}
