// The movement toolkit's shared rule (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3.0, docs/notes/spells-b01.md):
// moving a fighter that does not move itself. A shove pushes it along the ground, a drag pulls it along the ground, a launch throws
// it through the air. Each tile is checked in turn (the edge, walls, other fighters, climbs, drops, deep water, lava, ice, barrels),
// and the move is resolved at once, in the tick it is cast: the fighter's tile changes now, and its `step` (with an `arc` for a
// launch) and an event tell the page how to draw it. No randomness: every choice is a fixed order.
//
// `previewMove` works out where a move would end and what it would cause without changing anything (the AI scores moves with it);
// `displace` makes it so.

import { DIRS, solidFor, standable, tileAt, type At } from '../board';
import { atkOf, blast, defOf, defenceOf, hurt, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { kitOf } from '../abilities';
import { ailBoss, burnFor, stunFor } from '../ailments';
import { shoveTiles } from '../saves';

export type MoveHow = 'shove' | 'drag' | 'launch';
/** What a moved fighter ended against. */
export type SlamWhat = 'wall' | 'unit' | 'edge' | 'barrel' | 'cliff';

/** The shared numbers (the design's section 3.0). Damage is a share of the caster's attack. */
export const MOVE = {
  /** Two fighters that meet in a shove or drag each take this share. */
  COLLIDE: 0.25,
  /** A slam into something solid: this share, and this much more for each tile it did not get to travel. */
  SLAM: 0.4,
  SLAM_TILE: 0.1,
  SLAM_STUN_MS: 800,
  /** Fall damage for each level dropped, from a drop of `FALL_LEVELS` or more (as Wind Gust's). */
  FALL_DMG: 10,
  FALL_LEVELS: 2,
  /** A shove's climb limit: a step of more than this is a cliff (a wall). */
  SHOVE_CLIMB: 1,
  /** A launch flies over anything up to this many levels above where it took off. */
  LAUNCH_CLIMB: 2,
  /** A launch is airborne this long, plus this much a tile; then stunned this long on landing. */
  LAUNCH_MS: 450,
  LAUNCH_TILE_MS: 60,
  LAND_STUN_MS: 600,
  /** A shove or drag takes this long a tile, for the page's slide. */
  SLIDE_TILE_MS: 120,
  /** Lava sets a moved fighter burning this long. */
  LAVA_BURN_MS: 3000,
} as const;

/** How a fighter takes being moved: not at all (`no`), as a boss (`boss`: half as far, a launch is a one-tile shove), or fully. */
export function movable(f: Unit): 'no' | 'boss' | 'yes' {
  if (!f.alive || f.under) return 'no';
  const def = defOf(f);
  if (def.still || f.def === 'decoy' || f.def === 'standKing' || kitOf(f)?.passive.steady) return 'no';
  if (ailBoss(f) || (f.size ?? 1) > 1) return 'boss';
  return 'yes';
}

/** Where a move ends and what happens on the way: the tiles crossed (`path`, the landing last), what it ended against, the barrel it
 *  set off, the levels it fell, whether it ended on lava, the fighter it met, the tile it slid onto, and the move as the boss rule
 *  leaves it (`how`, `n`). */
export interface MovePlan {
  how: MoveHow;
  n: number;
  from: At;
  path: At[];
  land: At;
  slam?: SlamWhat;
  /** The tile index of a powder barrel it ends against (it goes off). */
  barrel?: number;
  /** A raised ice wall it slammed into (that tile shatters). */
  ice?: number;
  /** The fighter a shove or drag met (both take `COLLIDE`). */
  met?: Unit;
  fell: number;
  lava: boolean;
  slid: boolean;
  /** Tiles it did not get to travel (a slam's extra). */
  short: number;
}

const free = (b: Battle, at: At, f: Unit): boolean => {
  const t = tileAt(b.board, at.u, at.v);
  if (!t) return false;
  const x = unitAt(b, at.u, at.v);
  const open = t.bar !== undefined && t.barSide === f.side;
  return (!x || x === f) && !solidFor(t, f.side) && (defOf(f).flies || open || standable(t)) && (defOf(f).flies || t.ground !== 'deep');
};

/** Work out a move of `f` up to `n` tiles along way `way` (0 to 3, `DIRS`), changing nothing. A drag re-aims at `by` each tile and
 *  stops beside it. */
export function previewMove(b: Battle, by: Unit, f: Unit, way: number, n: number, how: MoveHow): MovePlan | undefined {
  const m = movable(f);
  // (no friendly fire: a fighter never shoves, drags or throws one of its own side; a swap or a charge moves friends on purpose)
  if (m === 'no' || n <= 0 || (f !== by && f.side === by.side)) return undefined;
  if (m === 'boss') {
    if (how === 'launch') {
      how = 'shove';
      n = 1;
    } else n = Math.max(1, Math.floor(n / 2));
  } else if (how !== 'launch') {
    // (STATS batch 5: the contest of STR, a tile further or shorter, and the target's STR save, a tile shorter; a launch is a throw)
    n = shoveTiles(b, by, f, n).n;
    if (n <= 0) return undefined;
  }
  const def = defOf(f);
  const flier = !!def.flies;
  const from = { u: f.u, v: f.v };
  const h0 = tileOf(b, f).h;
  const plan: MovePlan = { how, n, from, path: [], land: from, fell: 0, lava: false, slid: false, short: 0 };
  if (how === 'launch') return previewLaunch(b, f, way, n, plan, h0, flier);
  let cur = from;
  let h = h0;
  let steps = n;
  for (let i = 0; i < steps; i++) {
    const w = how === 'drag' ? wayTo(cur, by) : way;
    const next = { u: cur.u + DIRS[w][0], v: cur.v + DIRS[w][1] };
    const t = tileAt(b.board, next.u, next.v);
    const left = steps - i;
    if (!t) {
      plan.slam = 'edge';
      plan.short = left;
      break;
    }
    if (t.barrel) {
      plan.slam = 'barrel';
      plan.barrel = next.v * b.board.w + next.u;
      plan.short = left;
      break;
    }
    if (solidFor(t, f.side)) {
      plan.slam = 'wall';
      if (t.bar === 'ice') plan.ice = next.v * b.board.w + next.u;
      plan.short = left;
      break;
    }
    if (!flier && (t.ground === 'deep' || t.scene)) break;
    const x = unitAt(b, next.u, next.v);
    if (x && x !== f) {
      if (x !== by) {
        plan.slam = 'unit';
        plan.met = x;
        plan.short = left;
      }
      break;
    }
    if (!flier && t.h - h > (how === 'drag' ? def.jump : MOVE.SHOVE_CLIMB)) {
      plan.slam = 'cliff';
      plan.short = left;
      break;
    }
    if (!flier && h - t.h >= MOVE.FALL_LEVELS) plan.fell += h - t.h;
    cur = next;
    h = t.h;
    plan.path.push(cur);
    // (a push always slides one tile further on ice, once)
    if (!flier && t.ground === 'ice' && !plan.slid && i === steps - 1) {
      plan.slid = true;
      steps++;
    }
  }
  plan.land = cur;
  plan.lava = !flier && tileAt(b.board, cur.u, cur.v)?.ground === 'lava';
  return plan;
}

function previewLaunch(b: Battle, f: Unit, way: number, n: number, plan: MovePlan, h0: number, flier: boolean): MovePlan {
  const [du, dv] = DIRS[way];
  // (the flight goes up to `n` tiles, over fighters and up to LAUNCH_CLIMB levels above the take-off; anything higher or solid, or the edge, ends it with a slam)
  let reach = 0;
  for (let i = 1; i <= n; i++) {
    const at = { u: plan.from.u + du * i, v: plan.from.v + dv * i };
    const t = tileAt(b.board, at.u, at.v);
    if (!t) {
      plan.slam = 'edge';
      break;
    }
    if (t.barrel) {
      plan.slam = 'barrel';
      plan.barrel = at.v * b.board.w + at.u;
      break;
    }
    if (solidFor(t, f.side) || (!flier && t.h - h0 > MOVE.LAUNCH_CLIMB)) {
      plan.slam = t.bar === undefined && !t.rock && !t.wall ? 'cliff' : 'wall';
      if (t.bar === 'ice') plan.ice = at.v * b.board.w + at.u;
      break;
    }
    reach = i;
  }
  plan.short = n - reach;
  // (it lands on the farthest free tile it reached, else nearer, else where it took off)
  let land = plan.from;
  for (let i = reach; i >= 1; i--) {
    const at = { u: plan.from.u + du * i, v: plan.from.v + dv * i };
    if (free(b, at, f) && (flier || tileAt(b.board, at.u, at.v)!.h - h0 <= MOVE.LAUNCH_CLIMB)) {
      land = at;
      break;
    }
  }
  for (let i = 1; i <= Math.abs(land.u - plan.from.u) + Math.abs(land.v - plan.from.v); i++) plan.path.push({ u: plan.from.u + du * i, v: plan.from.v + dv * i });
  // (a landing on ice slides one tile on, if that tile is free and no higher)
  const lt = tileAt(b.board, land.u, land.v)!;
  if (!flier && lt.ground === 'ice') {
    const on = { u: land.u + du, v: land.v + dv };
    const t2 = tileAt(b.board, on.u, on.v);
    if (t2 && free(b, on, f) && t2.h <= lt.h) {
      land = on;
      plan.slid = true;
      plan.path.push(on);
    }
  }
  plan.land = land;
  const hl = tileAt(b.board, land.u, land.v)!.h;
  if (!flier && h0 - hl >= MOVE.FALL_LEVELS) plan.fell = h0 - hl;
  plan.lava = !flier && tileAt(b.board, land.u, land.v)!.ground === 'lava';
  return plan;
}

/** The airborne time of a launch of `tiles`. */
export const launchMs = (tiles: number): number => MOVE.LAUNCH_MS + MOVE.LAUNCH_TILE_MS * tiles;

const share = (by: Unit, to: Unit, mult: number): number => Math.max(1, Math.round(atkOf(by) * mult - defenceOf(to) * 0.5));

/** Move `f` as `previewMove` plans it, with everything the move causes: the slam, the collision, the fall, the barrel, lava, the
 *  stun of a slam or a landing, and its event. Returns the plan, or undefined when it cannot be moved. */
export function displace(b: Battle, by: Unit, f: Unit, way: number, n: number, how: MoveHow, out: BattleEvent[]): MovePlan | undefined {
  // (a saved shove or drag shows "Saved", even when the save left it no tile to go)
  if (how !== 'launch' && movable(f) === 'yes' && f.side !== by.side && shoveTiles(b, by, f, n).saved) out.push({ kind: 'saved', to: f.id, what: 'shove' });
  const plan = previewMove(b, by, f, way, n, how);
  if (!plan) return undefined;
  const h0 = tileOf(b, f).h;
  const tiles = plan.path.length;
  if (plan.how === 'launch') {
    const ms = launchMs(Math.max(1, tiles));
    f.step = { u: f.u, v: f.v, h: h0, at: b.t, ms, arc: 1.2 + 0.4 * tiles };
    f.u = plan.land.u;
    f.v = plan.land.v;
    f.air = b.t + ms;
    f.swing = undefined;
    f.busyUntil = Math.max(f.busyUntil, b.t + ms);
    out.push({ kind: 'launch', to: f.id, from: plan.from, land: plan.land, ms, peak: f.step.arc! });
    stunFor(b, f, ms + MOVE.LAND_STUN_MS, false, 'stun', by);
  } else if (tiles) {
    const ms = MOVE.SLIDE_TILE_MS * tiles;
    f.step = { u: f.u, v: f.v, h: h0, at: b.t, ms };
    f.u = plan.land.u;
    f.v = plan.land.v;
    f.swing = undefined;
    f.busyUntil = Math.max(f.busyUntil, b.t + ms);
    out.push({ kind: 'shove', to: f.id, path: plan.path, ms, how: plan.how });
  }
  if (plan.met && plan.met.alive) {
    hurt(b, by, plan.met, share(by, plan.met, MOVE.COLLIDE), false, false, out, 'skill');
    hurt(b, by, f, share(by, f, MOVE.COLLIDE), false, false, out, 'skill');
    out.push({ kind: 'slam', to: f.id, at: plan.land, what: 'unit' });
  } else if (plan.slam) {
    out.push({ kind: 'slam', to: f.id, at: plan.land, what: plan.slam });
    if (plan.barrel !== undefined) blast(b, plan.barrel, out);
    if (plan.ice !== undefined) shatterIce(b, plan.ice, out);
    if (f.alive) hurt(b, by, f, share(by, f, MOVE.SLAM + MOVE.SLAM_TILE * plan.short), true, false, out, 'skill');
    if (f.alive) stunFor(b, f, MOVE.SLAM_STUN_MS, false, 'stun', by);
  }
  if (plan.fell && f.alive) {
    out.push({ kind: 'fall', to: f.id, levels: plan.fell });
    hurt(b, by, f, plan.fell * MOVE.FALL_DMG, true, false, out, 'dot');
  }
  if (plan.lava && f.alive) burnFor(b, by, f, MOVE.LAVA_BURN_MS);
  return plan;
}

/** Shove `f` up to `n` tiles straight away from `src` (a caster, or a blast's centre), along the ground. */
export const shove = (b: Battle, by: Unit, f: Unit, n: number, out: BattleEvent[], src: At = by): MovePlan | undefined => displace(b, by, f, wayTo(src, f), n, 'shove', out);
/** Throw `f` `n` tiles straight away from `src` in an arc. */
export const launch = (b: Battle, by: Unit, f: Unit, n: number, out: BattleEvent[], src: At = by): MovePlan | undefined => displace(b, by, f, wayTo(src, f), n, 'launch', out);
/** Drag `f` up to `n` tiles towards `by`, stopping on the tile beside it. */
export const pull = (b: Battle, by: Unit, f: Unit, n: number, out: BattleEvent[]): MovePlan | undefined => displace(b, by, f, wayTo(f, by), n, 'drag', out);

/** Move several fighters away from (or towards) one source in the shared order: the farthest from `src` first for shoves and
 *  launches, the nearest first for drags; ties by id. */
export function moveMany(b: Battle, by: Unit, fs: Unit[], n: number, how: MoveHow, out: BattleEvent[], src: At = by): MovePlan[] {
  const d = (x: Unit) => Math.abs(x.u - src.u) + Math.abs(x.v - src.v);
  const order = [...fs].sort((x, y) => (how === 'drag' ? d(x) - d(y) : d(y) - d(x)) || x.id - y.id);
  const done: MovePlan[] = [];
  for (const f of order) {
    if (!f.alive) continue;
    const p = how === 'drag' ? pull(b, by, f, n, out) : displace(b, by, f, wayTo(src, f), n, how, out);
    if (p) done.push(p);
  }
  return done;
}

/** A raised ice wall's tile shatters (a fighter was slammed into it). */
function shatterIce(b: Battle, i: number, out: BattleEvent[]): void {
  const w = b.walls?.find((x) => x.i === i && x.kind === 'ice');
  if (w) w.until = b.t;
  out.push({ kind: 'wallBreak', u: i % b.board.w, v: Math.floor(i / b.board.w) });
}

/** Whether a fighter is in the air (a launch): melee cannot reach it, and it cannot act. */
export const airborne = (b: Battle, u: Unit): boolean => u.air !== undefined && u.air > b.t;
