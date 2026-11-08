// The heavy siege works (phase 2, `docs/notes/assault-2.md`; the design's 5.2): the trebuchet's volley, the sappers' kegs, and the stone wall
// that breaches.
//
// - THE TREBUCHET. One a battle, set up at the Landing's park, free. The king calls a VOLLEY with a tap, like a spell: a 3 x 3 strike on any
//   tile within sixty of the park, told three seconds before (its ground marks), every forty-five seconds. It deals 3,000 (at the garrison's
//   toughness) to each structure under it, a fifth of their health to the foes under it, and a hit on the stone wall's walk; THREE hits on
//   one stretch of the wall break it.
// - SAPPERS' KEGS. A platoon ordered to Plant a keg at the wall goes for the nearest powder barrel still standing (the bridge fort's, the
//   forge's), picks it up and carries it at half its pace, sets it at the foot of the wall it was sent to, and runs: five seconds later it
//   goes off, breaking that stretch of the stone wall, or the structure beside it, and burning whoever stands by it. One keg at a time.
// - THE STONE WALL BREACHED. A stretch three tiles along the wall, through its thickness, falls to a ramp of rubble a step above the
//   baileys on either side, so any walker crosses it; the sector graph is rebuilt and the page told (a breach).
//
// Deterministic: the volley's tiles, the kegs and the fuses are by tick, no random numbers. Pure rules: no Pixi, no DOM.

import { hurt, type Battle, type BattleEvent, type Unit } from '../battle';
import { standable, type At } from '../board';
import { LAND, ringOf, WALL_TOP } from './fieldMap';
import { breakFort, hitFort } from './forts';
import { holdBoosts } from './garrison';
import { rebuildSectors } from './sectors';
import type { HoldState, PlatoonState } from './holdTypes';

/** The trebuchet: its reach from the park (in tiles, either way), its warning, its reload, what it deals to a structure (before the garrison's
 *  toughness) and to a foe (a share of its health); the hits that break a stretch of the stone wall. */
export const VOLLEY_REACH = 60;
export const VOLLEY_TELL_MS = 3000;
export const VOLLEY_EVERY_MS = 45_000;
export const VOLLEY_FORT = 3000;
export const VOLLEY_FOE = 0.2;
export const WALL_HITS = 3;
/** A keg: its fuse, how much slower its carrier walks, and its blast on those beside it (a share of their health). */
export const KEG_FUSE_MS = 5000;
export const KEG_SLOW = 2;
export const KEG_BLAST = 0.25;

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);
const atOf = (i: number, w: number): At => ({ u: i % w, v: Math.floor(i / w) });
const Z_WALL = 'S'.charCodeAt(0);

// ---- the stone wall --------------------------------------------------------------------------------------------------------------

/** Whether a tile is the stone wall's walk, standing (not a corner tower's perch, not yet broken). */
export function isWallWalk(b: Battle, i: number): boolean {
  const t = b.board.tiles[i];
  return b.field!.zone[i] === Z_WALL && t.h === WALL_TOP && !t.perch && standable(t);
}

/** The stretch of the stone wall a tile belongs to: its key (the side, and its place along the wall in threes) and its tiles, three along
 *  and the wall's whole thickness through. */
export function wallStretch(b: Battle, i: number): { key: string; tiles: number[] } | null {
  if (!isWallWalk(b, i)) return null;
  const w = b.board.w;
  const { u, v } = atOf(i, w);
  // (the wall runs along u where it is further from the middle in v, along v otherwise)
  const alongU = Math.abs(v - 49.5) >= Math.abs(u - 49.5);
  const along = alongU ? u : v;
  const start = Math.floor(along / 3) * 3;
  const side = alongU ? (v < 50 ? 'n' : 's') : u < 50 ? 'w' : 'e';
  const tiles: number[] = [];
  for (let a = start; a < start + 3; a++)
    for (let th = -2; th <= 2; th++) {
      const j = alongU ? (v + th) * w + a : a * w + u + th;
      if (j >= 0 && j < b.board.tiles.length && isWallWalk(b, j)) tiles.push(j);
    }
  return { key: `${side}${start}`, tiles };
}

/** Break a stretch of the stone wall into a ramp of rubble, a step above the baileys either side. */
export function breachWall(b: Battle, h: HoldState, tiles: readonly number[]): void {
  if (!tiles.length) return;
  for (const i of tiles) {
    const t = b.board.tiles[i];
    t.h = LAND + 1;
    delete t.paved;
  }
  rebuildSectors(b.field!.sectors, b.board, [...tiles]);
  b.field!.stats.rebuilds++;
  h.events.push({ kind: 'breach', fort: 'wall', tiles: [...tiles] });
}

/** A hit on the stone wall by `i` (a volley's): the third on one stretch breaks it. */
function hitWall(b: Battle, h: HoldState, i: number): void {
  const s = wallStretch(b, i);
  if (!s) return;
  const hits = (h.siege.wallHits[s.key] = (h.siege.wallHits[s.key] ?? 0) + 1);
  if (hits >= WALL_HITS) breachWall(b, h, s.tiles);
}

// ---- the trebuchet ---------------------------------------------------------------------------------------------------------------

/** Whether the trebuchet can loose at a tile now: loaded, the tile within its reach of the park. */
export function canVolley(b: Battle, u: number, v: number): boolean {
  const h = b.field?.hold;
  if (!h || b.phase !== 'fight') return false;
  const park = h.bp.park;
  return !h.siege.volley && b.t >= h.siege.trebReady && Math.max(Math.abs(u - park.u), Math.abs(v - park.v)) <= VOLLEY_REACH && u >= 0 && v >= 0 && u < b.board.w && v < b.board.d;
}

/** Call a volley on a tile (the king's tap): it is told now and lands in three seconds. False when it cannot. */
export function callVolley(b: Battle, u: number, v: number): boolean {
  if (!canVolley(b, u, v)) return false;
  const h = b.field!.hold!;
  h.siege.volley = { u, v, lands: b.t + VOLLEY_TELL_MS };
  h.siege.trebReady = b.t + VOLLEY_EVERY_MS;
  h.events.push({ kind: 'volleyTold', tiles: volleyTiles(b, u, v) });
  return true;
}

/** The 3 x 3 a volley falls on. */
export function volleyTiles(b: Battle, u: number, v: number): number[] {
  const out: number[] = [];
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) if (u + du >= 0 && v + dv >= 0 && u + du < b.board.w && v + dv < b.board.d) out.push((v + dv) * b.board.w + u + du);
  return out;
}

/** A volley lands: the structures under it struck, the foes under it hurt, the wall's walk under it hit. */
function landVolley(b: Battle, h: HoldState, out: BattleEvent[]): void {
  const vo = h.siege.volley!;
  h.siege.volley = undefined;
  const tiles = volleyTiles(b, vo.u, vo.v);
  const set = new Set(tiles);
  h.events.push({ kind: 'volley', tiles });
  out.push({ kind: 'boom', u: vo.u, v: vo.v });
  const k = holdBoosts(h).foes.hp ?? 1;
  h.forts.forEach((f, n) => {
    if (!f.broken && !f.open && f.spec.tiles.some((t) => set.has(t))) hitFort(b, h, n, Math.round(VOLLEY_FORT * k), 0, out);
  });
  for (const x of b.units) if (x.alive && x.side === 'foe' && set.has(x.v * b.board.w + x.u)) hurt(b, x, x, Math.max(1, Math.round(x.maxHp * VOLLEY_FOE)), false, true, out, 'dot');
  // (one hit on each stretch of the wall the volley's middle row or column touches: a stretch is struck once a volley)
  const struck = new Set<string>();
  for (const i of tiles) {
    const s = wallStretch(b, i);
    if (!s || struck.has(s.key)) continue;
    struck.add(s.key);
    hitWall(b, h, i);
  }
}

// ---- the kegs --------------------------------------------------------------------------------------------------------------------

/** Where a platoon ordered to Plant goes now: the nearest barrel to pick up, or (carrying) the foot of the wall it was sent to. */
export function plantGoal(b: Battle, h: HoldState, pl: PlatoonState, me: Unit, at: At): At | null {
  const w = b.board.w;
  const k = h.siege.keg;
  if (k && k.platoon !== h.platoons.indexOf(pl)) return null;
  if (!k) {
    // (the nearest barrel still standing)
    let best: At | null = null;
    let bd = Infinity;
    for (const i of b.barrels ?? []) {
      const p = atOf(i, w);
      const d = dist(p, me);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  if (k.lit !== undefined) return null;
  return footOf(b, at) ?? at;
}

/** The free tile at the foot of what a keg is set against (beside the target tile, standable, nearest it). */
function footOf(b: Battle, at: At): At | null {
  const w = b.board.w;
  let best: At | null = null;
  let bd = Infinity;
  for (let dv = -2; dv <= 2; dv++)
    for (let du = -2; du <= 2; du++) {
      const p = { u: at.u + du, v: at.v + dv };
      if (p.u < 0 || p.v < 0 || p.u >= w || p.v >= b.board.d) continue;
      const t = b.board.tiles[p.v * w + p.u];
      if (!standable(t) || t.h > LAND + 2 || t.ground === 'deep') continue;
      // (the outer side first: a keg is set from outside the wall, not inside it)
      const d = Math.abs(du) + Math.abs(dv) + (ringOf(p.u, p.v) < ringOf(at.u, at.v) ? 10 : 0);
      if (Math.abs(du) + Math.abs(dv) && d < bd) {
        bd = d;
        best = p;
      }
    }
  return best;
}

/** The kegs' tick: a platoon beside a barrel picks it up; beside its mark it sets it, lit; a lit keg goes off when its fuse is out. */
export function kegTick(b: Battle, h: HoldState, anchorOf: (pl: PlatoonState) => Unit | undefined, out: BattleEvent[]): void {
  const w = b.board.w;
  const k = h.siege.keg;
  if (k?.lit !== undefined) {
    if (b.t < k.lit) return;
    goOff(b, h, k.at!, k.target!, out);
    h.siege.keg = undefined;
    return;
  }
  h.platoons.forEach((pl, n) => {
    if (pl.order.kind !== 'plant') return;
    const a = anchorOf(pl);
    if (!a) return;
    const cur = h.siege.keg;
    if (!cur) {
      // (beside a barrel: it is the platoon's keg now)
      const j = (b.barrels ?? []).find((i) => dist(atOf(i, w), a) <= 1);
      if (j === undefined) return;
      b.barrels!.splice(b.barrels!.indexOf(j), 1);
      delete b.board.tiles[j].barrel;
      h.siege.keg = { platoon: n };
      h.events.push({ kind: 'keg', platoon: n, state: 'carried', tile: j });
      return;
    }
    if (cur.platoon !== n) return;
    const foot = footOf(b, pl.order.at);
    if (!foot || dist(a, foot) > 1) return;
    const at = foot.v * w + foot.u;
    cur.at = at;
    cur.target = pl.order.at.v * w + pl.order.at.u;
    cur.lit = b.t + KEG_FUSE_MS;
    h.events.push({ kind: 'keg', platoon: n, state: 'lit', tile: at });
    // (set and lit: the platoon runs back from it)
    pl.order = { kind: 'fallback', at: { u: Math.max(0, Math.min(w - 1, a.u + Math.sign(a.u - pl.order.at.u) * 5)), v: Math.max(0, Math.min(b.board.d - 1, a.v + Math.sign(a.v - pl.order.at.v) * 5)) } };
  });
}

/** A keg goes off: the stretch of wall it was set against breaks (or the structure beside it), and those beside it burn. */
function goOff(b: Battle, h: HoldState, at: number, target: number, out: BattleEvent[]): void {
  const w = b.board.w;
  const p = atOf(at, w);
  h.events.push({ kind: 'keg', platoon: -1, state: 'boom', tile: at });
  out.push({ kind: 'boom', u: p.u, v: p.v });
  const s = wallStretch(b, target);
  if (s) breachWall(b, h, s.tiles);
  else {
    const n = h.forts.findIndex((f) => !f.broken && !f.open && f.spec.kind !== 'drum' && f.spec.tiles.some((t) => Math.max(Math.abs((t % w) - p.u), Math.abs(Math.floor(t / w) - p.v)) <= 2));
    if (n >= 0) breakFort(b, h, n, out);
  }
  for (const x of b.units) if (x.alive && Math.max(Math.abs(x.u - p.u), Math.abs(x.v - p.v)) <= 1) hurt(b, x, x, Math.max(1, Math.round(x.maxHp * KEG_BLAST)), false, true, out, 'dot');
}

/** Whether a platoon is carrying the keg (it walks at half its pace). */
export const carrying = (h: HoldState, pl: PlatoonState): boolean => {
  const k = h.siege.keg;
  return !!k && k.lit === undefined && h.platoons[k.platoon] === pl;
};

/** The heavy works' tick: the volley that lands now, the kegs. */
export function worksTick(b: Battle, h: HoldState, anchorOf: (pl: PlatoonState) => Unit | undefined, out: BattleEvent[]): void {
  if (h.siege.volley && b.t >= h.siege.volley.lands) landVolley(b, h, out);
  kegTick(b, h, anchorOf, out);
}

