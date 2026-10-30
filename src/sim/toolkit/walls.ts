// Walls (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3.6): timed tiles a skill raises. Six kinds:
//   stone   blocks everyone's walking, and shots and sight (as a ruined wall: `Tile.wall`)
//   ice     blocks walking; a foe beside it is chilled each second; a fighter slammed into it shatters that tile (`Tile.bar`)
//   thorns  blocks walking; a foe that ends a second beside it is pricked and bleeds (`Tile.bar`)
//   light   blocks the other side only (the caster's side walks through, `Tile.barSide`), and stops the other side's shots; a foe
//           beside it is seared each second
//   fire    blocks nothing; a foe in it burns, and is set alight again each half second it stands there
//   wind    blocks nothing; a shot of the other side flying through it turns back on the shooter for half
// Every wall goes back to what the tile was when its time runs out (or it is broken). A wall is laid only on a free standable tile,
// and never where it would leave some fighter unable to walk to any foe (a flood fill, as `boardOk` checks a board). The AI's three
// ways to choose a line (a choke, a lane, a shield) are here too. No randomness.

import { DIRS, standable, tileAt, type At, type Tile } from '../board';
import { atkOf, defOf, defenceOf, hurt, unitAt, type Battle, type BattleEvent, type Unit } from '../battle';
import { walkFrom } from '../path';
import { bleedFor, burnFor, chillFor } from '../ailments';

export type WallKind = 'stone' | 'ice' | 'thorns' | 'light' | 'fire' | 'wind';

export interface Wall {
  /** The tile's index, its kind, the side that raised it, who raised it, and until when. */
  i: number;
  kind: WallKind;
  side: Unit['side'];
  by: number;
  until: number;
  /** What the tile was (a stone wall sets `wall`; the others `bar`). */
  was?: { wall?: Tile['wall'] };
}

export const WALL = {
  /** Thorns: a foe beside them at the end of a second takes this share of the caster's attack, and bleeds (this share, this long). */
  THORN_DMG: 0.3,
  THORN_BLEED: 0.06,
  THORN_BLEED_MS: 3000,
  /** Light: a foe beside it takes this share each second. */
  LIGHT_DMG: 0.2,
  /** Ice: a foe beside it is chilled this long each second. */
  ICE_CHILL_MS: 1200,
  /** Fire: a foe in it burns this long, at this share of the caster's attack a tick (0.15 a half second: 0.3 a second). */
  FIRE_MS: 2000,
  FIRE_SHARE: 0.15,
  /** Wind: a shot turned back hits its shooter for this share. */
  WIND_BACK: 0.5,
} as const;

const blocksWalk = (k: WallKind) => k === 'stone' || k === 'ice' || k === 'thorns' || k === 'light';
const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const wallsOf = (b: Battle) => b.walls ?? [];

/** The wall on a tile, if any (and still standing). */
export const wallAt = (b: Battle, u: number, v: number): Wall | undefined => wallsOf(b).find((w) => w.i === v * b.board.w + u && w.until > b.t);

/** Whether every fighter on the field (all but those that never move) can still walk to some foe. */
function noneSealed(b: Battle): boolean {
  const alive = b.units.filter((x) => x.alive && !x.under);
  for (const x of alive) {
    if (defOf(x).still) continue;
    const foes = alive.filter((f) => f.side !== x.side);
    if (!foes.length) continue;
    const walk = walkFrom(b.board, x, defOf(x).jump, new Set(), x.side);
    // (a foe's own tile counts as reached when a tile beside it is: the walk does not go onto fighters' tiles here, so check beside)
    const reach = foes.some((f) => DIRS.some(([du, dv]) => {
      const t = tileAt(b.board, f.u + du, f.v + dv);
      return !!t && walk.cost[(f.v + dv) * b.board.w + f.u + du] < Infinity;
    }) || walk.cost[f.v * b.board.w + f.u] < Infinity);
    if (!reach) return false;
  }
  return true;
}

function setTile(b: Battle, w: Wall, on: boolean): void {
  const t = b.board.tiles[w.i];
  if (w.kind === 'stone') {
    if (on) {
      w.was = { wall: t.wall };
      t.wall = true;
    } else if (w.was?.wall) t.wall = w.was.wall;
    else delete t.wall;
  } else if (w.kind === 'ice' || w.kind === 'thorns' || w.kind === 'light') {
    if (on) {
      t.bar = w.kind;
      if (w.kind === 'light') t.barSide = w.side;
    } else {
      delete t.bar;
      delete t.barSide;
    }
  }
}

/** Raise walls of `kind` on `tiles` for `ms`: only on free standable tiles with no wall, barrel or fighter, and never one that would
 *  seal anyone in. The tiles raised (none: nothing to do). */
export function raiseWall(b: Battle, me: Unit, tiles: At[], kind: WallKind, ms: number, out: BattleEvent[]): At[] {
  const laid: At[] = [];
  for (const at of tiles) {
    const t = tileAt(b.board, at.u, at.v);
    if (!t || !standable(t) || unitAt(b, at.u, at.v) || wallAt(b, at.u, at.v)) continue;
    if (b.stand && apart(at, b.stand.at) <= 1) continue;
    const w: Wall = { i: at.v * b.board.w + at.u, kind, side: me.side, by: me.id, until: b.t + ms };
    if (blocksWalk(kind)) {
      setTile(b, w, true);
      if (!noneSealed(b)) {
        setTile(b, w, false);
        continue;
      }
    }
    (b.walls ??= []).push(w);
    laid.push(at);
    out.push({ kind: 'terrain', u: at.u, v: at.v, what: kind, ms, side: me.side });
  }
  return laid;
}

/** Every tick: walls run out (and go back); each second the thorns, light and ice touch the foes beside them; each half second the
 *  fire burns the foes in it. */
export function tickWalls(b: Battle, out: BattleEvent[]): void {
  const walls = b.walls;
  if (!walls?.length) return;
  for (const w of walls) if (w.until <= b.t) {
    setTile(b, w, false);
    out.push({ kind: 'terrain', u: w.i % b.board.w, v: Math.floor(w.i / b.board.w), what: w.kind, ms: 0 });
  }
  b.walls = walls.filter((w) => w.until > b.t);
  const second = b.t % 1000 === 0;
  const half = b.t % 500 === 0;
  if (!half) return;
  for (const x of b.units) {
    if (!x.alive || x.under) continue;
    const touched = new Set<WallKind>();
    for (const w of b.walls) {
      if (w.side === x.side) continue;
      const at = { u: w.i % b.board.w, v: Math.floor(w.i / b.board.w) };
      const by = b.units.find((y) => y.id === w.by) ?? x;
      const d = apart(at, x);
      if (w.kind === 'fire' && d === 0 && !defOf(x).flies) burnFor(b, by, x, WALL.FIRE_MS, WALL.FIRE_SHARE);
      if (!second || d !== 1 || touched.has(w.kind)) continue;
      touched.add(w.kind);
      if (w.kind === 'thorns') {
        hurt(b, by, x, Math.max(1, Math.round(atkOf(by) * WALL.THORN_DMG - defenceOf(x) * 0.5)), false, false, out, 'skill');
        if (x.alive) bleedFor(b, by, x, WALL.THORN_BLEED, WALL.THORN_BLEED_MS);
      } else if (w.kind === 'light') hurt(b, by, x, Math.max(1, Math.round(atkOf(by) * WALL.LIGHT_DMG - defenceOf(x) * 0.5)), false, false, out, 'skill');
      else if (w.kind === 'ice') chillFor(b, x, WALL.ICE_CHILL_MS, false, false, by);
      if (!x.alive) break;
    }
  }
}

/** The tiles a shot from `a` to `z` passes over (as `sightClear` walks the line). */
function lineTiles(a: At, z: At): At[] {
  const n = Math.max(Math.abs(z.u - a.u), Math.abs(z.v - a.v));
  const out: At[] = [];
  for (let i = 1; i < n; i++) out.push({ u: Math.round(a.u + ((z.u - a.u) * i) / n), v: Math.round(a.v + ((z.v - a.v) * i) / n) });
  return out;
}

/** What a wall does to a shot of `by`'s side flying from `by` to `to`: a Wall of Light of the other side stops it (`block`), a Wind
 *  Wall of the other side turns it back (`back`); nothing (`undefined`) when no wall is in the way. */
export function shotWall(b: Battle, by: Unit, to: Unit): 'block' | 'back' | undefined {
  if (!b.walls?.length) return undefined;
  for (const at of lineTiles(by, to)) {
    const w = wallAt(b, at.u, at.v);
    if (!w || w.side === by.side) continue;
    if (w.kind === 'light') return 'block';
    if (w.kind === 'wind') return 'back';
  }
  return undefined;
}

// ---- the AI's lines ----

/** `len` tiles centred on `mid`, at right angles to way `way`. */
const across = (mid: At, way: number, len: number): At[] => {
  const [su, sv] = DIRS[(way + 1) % 4];
  const out: At[] = [];
  for (let k = 0; k < len; k++) {
    const off = k % 2 ? (k + 1) / 2 : -k / 2;
    out.push({ u: mid.u + su * off, v: mid.v + sv * off });
  }
  return out;
};
const wayOf = (a: At, z: At): number => (Math.abs(z.u - a.u) >= Math.abs(z.v - a.v) ? (z.u >= a.u ? 0 : 2) : z.v >= a.v ? 1 : 3);

/** The hero (or friend) most at risk: a back-line friend whose nearest foe is within 3, else the friend with the lowest health share. */
export function mostAtRisk(b: Battle, me: Unit): Unit | undefined {
  const friends = b.units.filter((x) => x.alive && x.side === me.side && !x.under && !defOf(x).summon);
  const foes = b.units.filter((x) => x.alive && x.side !== me.side && !x.under);
  if (!friends.length || !foes.length) return undefined;
  const near = (x: Unit) => Math.min(...foes.map((f) => apart(f, x)));
  const back = friends.filter((x) => defOf(x).range >= 2 && near(x) <= 3).sort((x, y) => near(x) - near(y) || x.id - y.id);
  return back[0] ?? [...friends].sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
}

/** A choke line (Wall of Stone, Thorns, Light): across the way from the crowd's centre (the foes within 5 of the friend most at risk)
 *  to that friend, two tiles out from it. Undefined unless it would cross the walk of two or more of those foes. */
export function chokeLine(b: Battle, me: Unit, len: number): At[] | undefined {
  const hero = mostAtRisk(b, me);
  if (!hero) return undefined;
  const foes = b.units.filter((x) => x.alive && x.side !== me.side && !x.under && apart(x, hero) <= 5);
  if (foes.length < 2) return undefined;
  const mid = { u: Math.round(foes.reduce((s, f) => s + f.u, 0) / foes.length), v: Math.round(foes.reduce((s, f) => s + f.v, 0) / foes.length) };
  const way = wayOf(hero, mid);
  const at = { u: hero.u + DIRS[way][0] * 2, v: hero.v + DIRS[way][1] * 2 };
  const line = across(at, way, len).filter((x) => tileAt(b.board, x.u, x.v));
  // (it counts only if it lies across the walk of two or more of those foes)
  const set = new Set(line.map((x) => x.v * b.board.w + x.u));
  let crossed = 0;
  for (const f of foes) {
    const walk = walkFrom(b.board, f, defOf(f).jump, new Set(), f.side);
    let j = hero.v * b.board.w + hero.u;
    for (let guard = 0; guard < 200 && walk.from[j] >= 0; guard++) {
      if (set.has(j)) {
        crossed++;
        break;
      }
      j = walk.from[j];
    }
  }
  return crossed >= 2 ? line : undefined;
}

/** A lane line (Wall of Fire): along the way most foes are heading (their way towards the nearest friend), across the next tile of
 *  the foe with most foes behind it. */
export function laneLine(b: Battle, me: Unit, len: number): At[] | undefined {
  const foes = b.units.filter((x) => x.alive && x.side !== me.side && !x.under);
  const friends = b.units.filter((x) => x.alive && x.side === me.side && !x.under);
  if (!foes.length || !friends.length) return undefined;
  const ways = [0, 0, 0, 0];
  const head = (f: Unit) => wayOf(f, [...friends].sort((x, y) => apart(f, x) - apart(f, y) || x.id - y.id)[0]);
  for (const f of foes) ways[head(f)]++;
  const way = ways.indexOf(Math.max(...ways));
  const lead = foes.filter((f) => head(f) === way).sort((x, y) => foes.filter((z) => apart(z, y) <= 2).length - foes.filter((z) => apart(z, x) <= 2).length || x.id - y.id)[0];
  const at = { u: lead.u + DIRS[way][0], v: lead.v + DIRS[way][1] };
  return across(at, way, len).filter((x) => tileAt(b.board, x.u, x.v));
}

/** A shield line (Wind Wall): in front of the friend a foe shooter is nearest to, across the way to that shooter. */
export function shieldLine(b: Battle, me: Unit, len: number): At[] | undefined {
  const shooters = b.units.filter((x) => x.alive && x.side !== me.side && !x.under && defOf(x).shot);
  const friends = b.units.filter((x) => x.alive && x.side === me.side && !x.under);
  let best: { s: Unit; f: Unit; d: number } | undefined;
  for (const s of shooters)
    for (const f of friends) {
      const d = apart(s, f);
      if (d >= 2 && (!best || d < best.d || (d === best.d && s.id < best.s.id))) best = { s, f, d };
    }
  if (!best) return undefined;
  const way = wayOf(best.f, best.s);
  const at = { u: best.f.u + DIRS[way][0], v: best.f.v + DIRS[way][1] };
  return across(at, way, len).filter((x) => tileAt(b.board, x.u, x.v));
}
