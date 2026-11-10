// A hold's field built from its blueprint (phase 1, `docs/notes/assault-1.md`; the design's 2.1): the stencil's zones give each tile its
// height band and ground, the land's own relief rolls inside the soft zones, the stamps lay the set pieces, and the flesh (boulders,
// bushes, tall grass, the tents and ruins) is scattered from a fixed seed an army: `mixSeed(ASSAULT_SALT, army index)`, never the save's
// seed, so every player storms the same hold. The whole map is about 10,000 tiles, built in a few tens of milliseconds as the assault
// starts, and never saved.
//
// `fieldOk` is the big brother of `boardOk`: every standable tile outside the walls is reachable from the Landing for a jump-1 walker,
// the inner bailey only through the gates, every post stands on ground. A failed check means the blueprint is wrong: it is a test, never
// a re-roll at run time.

import { canStep, DIRS, relief, standable, type Board, type Hazard, type Piece, type Tile } from '../board';
import { mixSeed, Rng } from '../rng';
import { armyIndex } from '../armies';
import { ASSAULT_SALT, FIELD } from './stencil';
import { landformWeight, type Blueprint, type FortKind, type Rect, type Spot, type Stamp } from './blueprint';

/** The fields' base height, how much the relief adds, and the bands of the rings above and below it. */
export const LAND = 2;
const RELIEF = 4;
export const BANK = LAND + 2;
export const WALL_TOP = LAND + 6;

/** A structure as the map lays it (5.1): its kind, name, tiles (by board index), and the height its tiles break to. */
export interface FortSpec {
  id: string;
  kind: FortKind;
  name: string;
  tiles: number[];
  /** What its tiles become when it breaks: floor at this height (a palisade segment's rubble ramp is laid by `rubble`). */
  floor: number;
  /** The tiles before it on our side (where a platoon stands to strike it), and behind it. */
  front: Spot;
  /** For a palisade segment: the ditch tiles before it that its rubble ramp fills, outer then inner (by board index). */
  rubble?: number[][];
  /** Contoured runs carry their actual rubble heights instead of assuming square-ring coordinates. */
  ramp?: [number, number][];
  /** Found by approaching the outside of this run; scouting does not mark it automatically. */
  weakness?: { name: string; hint: string };
}

export interface HoldMap {
  board: Board;
  /** Each tile's zone (its stencil character's code). */
  zone: Uint8Array;
  forts: FortSpec[];
  /** The tiles any stamp laid (the flesh keeps off them). */
  stamped: Uint8Array;
}

function* tilesOf(r: Rect): Generator<[number, number]> {
  for (let v = r.v0; v <= r.v1; v++) for (let u = r.u0; u <= r.u1; u++) yield [u, v];
}
/** The ring of the hold a tile stands on, counted in tiles from the middle (0.5 for the four middle tiles). */
export const ringOf = (u: number, v: number): number => Math.max(Math.abs(u - 49.5), Math.abs(v - 49.5));

/** The zones whose land rolls (and is eased to a walker's step). */
const SOFT = new Set(['L', 'C', 'K', 'T', 'V', 'N', 'B', 'I'].map((c) => c.charCodeAt(0)));

/** Build a hold's field from its blueprint. The same blueprint always builds the same field. */
export function buildHold(bp: Blueprint): HoldMap {
  const seed = mixSeed(ASSAULT_SALT, Math.max(0, armyIndex(bp.army)));
  const rng = new Rng(mixSeed(seed, 2));
  const w = FIELD;
  const d = FIELD;
  const tiles: Tile[] = new Array(w * d);
  const zone = new Uint8Array(w * d);
  const stamped = new Uint8Array(w * d);
  const terrainFixed = new Uint8Array(w * d);
  const noise = mixSeed(seed, 1);
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const z = bp.stencil[v >> 1][u >> 1];
      zone[v * w + u] = z.charCodeAt(0);
      const n = relief(noise, (u * 3) / 8, (v * 3) / 8);
      const t: Tile = { h: LAND, deco: (mixSeed(noise, u, v) >>> 0) % 1000 };
      switch (z) {
        case 'L': case 'C': t.h = 1 + Math.floor(n * 1.6); break;
        case 'K': case 'T': case 'V': case 'N': t.h = LAND + Math.floor(n * (bp.relief?.fields ?? RELIEF)); break;
        case 'R': t.h = 0; t.ground = 'deep'; t.stream = true; break;
        case 'F': t.h = 0; t.ground = 'water'; t.stream = true; break;
        case 'Y': t.h = 0; t.bridge = true; break;
        case 'D': t.h = 0; break;
        case 'E': t.h = BANK; break;
        case 'P': t.h = BANK; t.wall = true; break;
        case 'B': t.h = LAND + Math.floor(n * (bp.relief?.camp ?? 1.6)); break;
        case 'S': t.h = WALL_TOP; t.paved = true; break;
        case 'I': t.h = LAND; break;
        case 'M': {
          const r = ringOf(u, v);
          t.h = bp.summitHeight ?? (r >= 4.5 ? LAND + 3 : r >= 3.5 ? LAND + 5 : LAND + 7);
          t.paved = bp.wallStyle !== 'ridge' && r < 3.5;
          // Shallow scallops break the summit's rim. Paths, foundations and perches are stamped afterwards.
          const rim = DIRS.some(([du, dv]) => bp.stencil[(v + dv) >> 1]?.[(u + du) >> 1] !== 'M');
          if (bp.weathered && rim && (mixSeed(noise, u, v, 91) >>> 0) % 3 === 0) t.h--;

          break;
        }
      }
      if (z === 'T') t.ground = 'tall';
      tiles[v * w + u] = t;
    }
  const board: Board = { seed, area: bp.lands.outer as Board['area'], w, d, tiles, pieces: [], hazards: [] };
  // Broad landforms dominate the small noise. Water, deployment ground and the defensive structures retain their own heights.
  for (const form of bp.landforms ?? []) for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
    const i = v * w + u;
    if (!'KTVNB'.includes(String.fromCharCode(zone[i]))) continue;
    const weight = landformWeight(form, u, v);
    if (weight <= 0) continue;
    let height = LAND + Math.round((form.height - LAND) * weight);
    if (form.terrace && form.kind === 'hill') {
      const along = form.ramp === 'u' ? u - form.at.u : v - form.at.v;
      const across = form.ramp === 'u' ? v - form.at.v : u - form.at.u;
      const ramp = along >= -2 && Math.abs(across) <= 2;
      if (!ramp) height = Math.min(form.height, LAND + Math.ceil((height - LAND) / form.terrace) * form.terrace);
      terrainFixed[i] = 1;
    }
    tiles[i].h = form.kind === 'hill' ? Math.max(tiles[i].h, height) : Math.min(tiles[i].h, height);
  }
  ease(board, zone, stamped, !!bp.contour, terrainFixed);
  // (the land round the ditch meets it at the land's height, so the ditch is two steps down and the bank two up)
  for (let v = 0; v < d; v++)
    for (let u = 0; u < w; u++) {
      const r = ringOf(u, v);
      const i = v * w + u;
      if (!bp.contour && r > 25 && r < 28 && SOFT.has(zone[i])) tiles[i].h = LAND;
    }
  if (bp.contour) {
    // The camp rolls between its yards, but the ditch approaches and stone wall's foot remain accessible siege lanes.
    for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
      const i = v * w + u;
      if (!SOFT.has(zone[i])) continue;
      for (let dv = -2; dv <= 2; dv++) for (let du = -2; du <= 2; du++) {
        const x = u + du, y = v + dv;
        if (x < 0 || y < 0 || x >= w || y >= d) continue;
        const z = zone[y * w + x];
        if (z === 68 || z === 83) tiles[i].h = LAND;
      }
    }
  }
  ease(board, zone, stamped, !!bp.contour, terrainFixed);
  // the stamps, in order
  const forts: FortSpec[] = [];
  for (const s of bp.stamps) stamp(board, zone, stamped, s, forts);
  // the palisade's segments: every palisade tile not a gate's, three along a face, both rows deep
  forts.push(...(bp.contour ? contourSegments(board, zone) : palisadeSegments(board, zone)));
  for (const weak of bp.weaknesses ?? []) {
    const fort = forts.find((f) => f.tiles.includes(weak.at.v * w + weak.at.u));
    if (!fort) throw new Error(`Weak point ${weak.name} has no structure`);
    fort.weakness = { name: weak.name, hint: weak.hint };
  }
  // (the ditch's stakes: slower than the stake field's)
  const ditch: number[] = [];
  for (let i = 0; i < w * d; i++) if (zone[i] === 68 && !stamped[i]) ditch.push(i);
  board.hazards!.push({ kind: 'spikes', tiles: ditch, period: 8000, offset: 4000, tell: 1000 });
  ease(board, zone, stamped, !!bp.contour, terrainFixed);
  if (bp.contour) for (const f of forts) if (f.kind === 'palisade') {
    const i = f.front.v * w + f.front.u;
    stamped[i] = 1;
  }
  if (bp.contour) for (let v = 1; v < d - 1; v++) for (let u = 1; u < w - 1; u++) {
    const i = v * w + u;
    if (zone[i] === 66 && !stamped[i] && DIRS.some(([du, dv]) => zone[(v + dv) * w + u + du] === 69)) tiles[i].h = BANK - 1;
  }
  flesh(board, zone, stamped, bp, rng);
  return { board, zone, forts, stamped };
}

/** Ease the soft land to a walker's single step against its neighbours (the water, the bridges, the causeways, the stairs' feet), so the
 *  rolling fields never wall a walker in. The walls, the ditch, the mound and the stamped set pieces keep their faces. */
function ease(b: Board, zone: Uint8Array, stamped: Uint8Array, contour = false, terrainFixed?: Uint8Array): void {
  for (let pass = 0; pass < 16; pass++) {
    let moved = false;
    for (let v = 0; v < b.d; v++)
      for (let u = 0; u < b.w; u++) {
        const i = v * b.w + u;
        if (!SOFT.has(zone[i]) || stamped[i] || terrainFixed?.[i]) continue;
        const a = b.tiles[i];
        for (const [du, dv] of DIRS) {
          const nu = u + du;
          const nv = v + dv;
          if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
          const j = nv * b.w + nu;
          const n = b.tiles[j];
          // (eased against the soft land, the water and anything stamped that a walker stands on; never against a wall's face)
          const zj = String.fromCharCode(zone[j]);
          const against = (SOFT.has(zone[j]) && (!contour || !(stamped[j] && !standable(n)))) || 'RFY'.includes(zj) || (stamped[j] && standable(n));
          if (!against) continue;
          if (a.h - n.h > 1) {
            a.h = n.h + 1;
            moved = true;
          } else if (stamped[j] && n.h - a.h > 1 && !n.perch && !n.ramp) {
            a.h = n.h - 1;
            moved = true;
          }
        }
      }
    if (!moved) break;
  }
}

function stamp(b: Board, _zone: Uint8Array, stamped: Uint8Array, s: Stamp, forts: FortSpec[]): void {
  const w = b.w;
  const at = (u: number, v: number) => b.tiles[v * w + u];
  const mark = (u: number, v: number) => (stamped[v * w + u] = 1);
  switch (s.kind) {
    case 'gate': {
      const tiles: number[] = [];
      for (const [u, v] of tilesOf(s.rect)) {
        const t = at(u, v);
        t.h = s.floor;
        t.wall = true;
        t.paved = true;
        tiles.push(v * w + u);
        mark(u, v);
      }
      if (s.causeway)
        for (const [u, v] of tilesOf(s.causeway)) {
          const t = at(u, v);
          t.h = s.causewayH ?? s.floor;
          t.paved = true;
          delete t.wall;
          mark(u, v);
        }
      // (the gate's front: the middle of the tiles before it on our side, beyond its causeway: further from the middle of the hold)
      const r = s.causeway ?? s.rect;
      const cu = (r.u0 + r.u1) / 2;
      const cv = (r.v0 + r.v1) / 2;
      const du = Math.sign(Math.round(cu - 49.5)) * (Math.abs(cu - 49.5) >= Math.abs(cv - 49.5) ? 1 : 0);
      const dv = Math.sign(Math.round(cv - 49.5)) * (Math.abs(cv - 49.5) > Math.abs(cu - 49.5) ? 1 : 0);
      const front = { u: Math.round(du > 0 ? r.u1 + 1 : du < 0 ? r.u0 - 1 : r.u0), v: Math.round(dv > 0 ? r.v1 + 1 : dv < 0 ? r.v0 - 1 : r.v0) };
      forts.push({ id: fortId(s.fort, s.name), kind: s.fort, name: s.name, tiles, floor: s.floor, front });
      break;
    }
    case 'perch':
      for (const [u, v] of tilesOf(s.rect)) {
        const t = at(u, v);
        t.h = s.h;
        t.perch = true;
        delete t.rock;
        delete t.wall;
        mark(u, v);
      }
      if (s.ramp && s.dir) {
        let h = s.h - 1;
        let u = s.ramp.u;
        let v = s.ramp.v;
        while (h > LAND && u >= 0 && v >= 0 && u < b.w && v < b.d) {
          const t = at(u, v);
          t.h = h;
          t.ramp = true;
          delete t.rock;
          delete t.ground;
          mark(u, v);
          u += s.dir[0];
          v += s.dir[1];
          h--;
        }
      }
      break;
    case 'stair':
      for (let k = 0; k < s.n; k++)
        for (let x = 0; x < (s.wide ?? 1); x++) {
          // (the stair's width runs across its way)
          const u = s.from.u + s.dir[0] * k + Math.abs(s.dir[1]) * x;
          const v = s.from.v + s.dir[1] * k + Math.abs(s.dir[0]) * x;
          const t = at(u, v);
          t.h = s.h0 + s.dh * k;
          t.ramp = true;
          t.paved = true;
          delete t.wall;
          delete t.rock;
          mark(u, v);
        }
      break;
    case 'solid': {
      const floor = s.level ? Math.min(...[...tilesOf(s.rect)].map(([u, v]) => at(u, v).h)) : undefined;
      for (const [u, v] of tilesOf(s.rect)) {
        const t = at(u, v);
        if (floor !== undefined) t.h = floor;
        if (s.wall) t.wall = true;
        else t.rock = true;
        mark(u, v);
      }
      break;
    }
    case 'dressing':
      mark(s.at.u, s.at.v);
      break;
    case 'ground':
      for (const [u, v] of tilesOf(s.rect)) {
        at(u, v).ground = s.ground;
        if (s.ground !== 'tall') mark(u, v);
      }
      break;
    case 'height':
      for (const [u, v] of tilesOf(s.rect)) {
        at(u, v).h = s.h;
        mark(u, v);
      }
      break;
    case 'trail':
      for (let n = 1; n < s.way.length; n++) {
        const a = s.way[n - 1], z = s.way[n];
        const steps = Math.max(Math.abs(z.u - a.u), Math.abs(z.v - a.v));
        for (let k = 0; k <= steps; k++) {
          const u = Math.round(a.u + (z.u - a.u) * k / Math.max(1, steps));
          const v = Math.round(a.v + (z.v - a.v) * k / Math.max(1, steps));
          for (const [du, dv] of [[0, 0], [1, 0], [0, 1]]) {
            at(u + du, v + dv).paved = true;
            at(u + du, v + dv).trail = true;
          }
        }
      }
      break;
    case 'paved':
      for (const [u, v] of tilesOf(s.rect)) {
        const t = at(u, v);
        t.paved = true;
        delete t.ground;
      }
      break;
    case 'fence':
      for (const [u, v] of tilesOf(s.rect)) if (u === s.rect.u0 || u === s.rect.u1 || v === s.rect.v0 || v === s.rect.v1) at(u, v).ring = true;
      break;
    case 'barricade':
      for (const p of s.tiles) {
        const t = at(p.u, p.v);
        t.wall = true;
        mark(p.u, p.v);
      }
      break;
    case 'barrel':
      at(s.at.u, s.at.v).barrel = true;
      mark(s.at.u, s.at.v);
      break;
    case 'drum': {
      const t = at(s.at.u, s.at.v);
      t.rock = true;
      mark(s.at.u, s.at.v);
      forts.push({ id: fortId('drum', s.name), kind: 'drum', name: s.name, tiles: [s.at.v * w + s.at.u], floor: t.h, front: { u: s.at.u + 1, v: s.at.v + 1 } });
      b.pieces!.push({ u: s.at.u, v: s.at.v, kind: 'drum' });
      break;
    }
    case 'stakes': {
      const list: number[] = [];
      for (const [u, v] of tilesOf(s.rect)) list.push(v * w + u);
      b.hazards!.push({ kind: 'spikes', tiles: list, period: s.period, offset: s.offset, tell: 1000 } satisfies Hazard);
      break;
    }
    case 'piece':
      b.pieces!.push({ u: s.at.u, v: s.at.v, kind: s.piece } satisfies Piece);
      mark(s.at.u, s.at.v);
      break;
  }
}

/** A structure's id from its kind and name ("southGate", "drum:The West Drum" as "drumW"...): the posts' `guards` name them so. */
export function fortId(kind: FortKind, name: string): string {
  if (kind === 'drum') return name.includes('West') ? 'drumW' : name.includes('East') ? 'drumE' : 'drumS';
  if (kind === 'sallyPort') return name.includes('West') ? 'westPort' : 'eastPort';
  return kind;
}

/** The palisade's segments (5.1): each face's tiles not a gate's, three along and both rows deep, each with the ditch tiles before it that
 *  its rubble fills. */
function palisadeSegments(b: Board, zone: Uint8Array): FortSpec[] {
  const w = b.w;
  const out: FortSpec[] = [];
  const faces: { name: string; along: 'u' | 'v'; at: [number, number]; ditch: [number, number] }[] = [
    { name: 'south-east', along: 'v', at: [72, 73], ditch: [75, 74] },
    { name: 'south-west', along: 'u', at: [72, 73], ditch: [75, 74] },
    { name: 'north-east', along: 'u', at: [27, 26], ditch: [24, 25] },
    { name: 'north-west', along: 'v', at: [27, 26], ditch: [24, 25] },
  ];
  const seen = new Set<number>();
  for (const f of faces) {
    let run: number[] = [];
    let ditch: number[][] = [[], []];
    let n = 0;
    const flush = (k: number) => {
      if (!run.length) return;
      const mid = run[Math.floor(run.length / 2)];
      const mu = mid % w;
      const mv = Math.floor(mid / w);
      const front = f.along === 'v' ? { u: f.ditch[0] + Math.sign(f.ditch[0] - 49.5), v: mv } : { u: mu, v: f.ditch[0] + Math.sign(f.ditch[0] - 49.5) };
      out.push({ id: `palisade:${f.name}:${k}`, kind: 'palisade', name: `The palisade (${f.name})`, tiles: run, floor: BANK, front, rubble: ditch });
      run = [];
      ditch = [[], []];
    };
    for (let a = 26; a <= 73; a++) {
      const k = Math.floor((a - 26) / 3);
      if (k !== n) {
        flush(n);
        n = k;
      }
      for (const c of f.at) {
        const u = f.along === 'v' ? c : a;
        const v = f.along === 'v' ? a : c;
        const i = v * w + u;
        if (seen.has(i) || zone[i] !== 80 || !b.tiles[i].wall) continue;
        // (a gate's tiles are its own structure)
        if (b.tiles[i].paved) continue;
        seen.add(i);
        run.push(i);
      }
      f.ditch.forEach((c, x) => {
        const u = f.along === 'v' ? c : a;
        const v = f.along === 'v' ? a : c;
        ditch[x].push(v * w + u);
      });
    }
    flush(n);
  }
  return out.filter((x) => x.tiles.length);
}

/** Each two-by-two contour cell is a short palisade run. Find its outward rubble path through the ditch, using the stencil rather than
 *  the distance to the old square's centre. Other holds keep their original segments and ids. */
function contourSegments(b: Board, zone: Uint8Array): FortSpec[] {
  const out: FortSpec[] = [];
  const w = b.w;
  for (let v = 0; v < b.d; v += 2) for (let u = 0; u < w; u += 2) {
    const tiles = [v * w + u, v * w + u + 1, (v + 1) * w + u, (v + 1) * w + u + 1]
      .filter((i) => zone[i] === 80 && b.tiles[i].wall && !b.tiles[i].paved);
    if (!tiles.length) continue;
    const own = new Set(tiles);
    const queue = tiles.map((i) => [i]);
    const seen = new Set(tiles);
    let path: number[] | undefined;
    for (let k = 0; k < queue.length && !path; k++) {
      const route = queue[k];
      const i = route[route.length - 1];
      for (const [du, dv] of DIRS) {
        const x = i % w + du;
        const y = Math.floor(i / w) + dv;
        if (x < 0 || y < 0 || x >= w || y >= b.d) continue;
        const j = y * w + x;
        if (seen.has(j)) continue;
        if ((zone[j] === 75 || zone[j] === 78) && standable(b.tiles[j])) { path = [...route, j]; break; }
        if ((zone[j] !== 68 || !standable(b.tiles[j])) && !own.has(j)) continue;
        seen.add(j);
        queue.push([...route, j]);
      }
    }
    if (!path) throw new Error(`Palisade at ${u},${v} has no outward ditch`);
    const frontTile = path[path.length - 1];
    const ramp: [number, number][] = tiles.map((i) => [i, BANK - 1]);
    // (a one-step descent into the ditch, then rubble rises towards the camp)
    const ditch = path.filter((i) => zone[i] === 68).reverse();
    ditch.forEach((i, n) => ramp.push([i, Math.min(BANK - 1, LAND - 1 + n)]));
    const face = u >= 50 ? 'south-east' : v >= 50 ? 'south-west' : 'north-west';
    out.push({ id: `palisade:${face}:${u}:${v}`, kind: 'palisade', name: `The palisade (${face})`, tiles, floor: BANK,
      front: { u: frontTile % w, v: Math.floor(frontTile / w) }, ramp });
  }
  // A stepped corner sometimes has an extra cell of timber between its tip and the bank. Keep that tip with its neighbouring run,
  // so a single assault order breaches the full thickness instead of opening a useless pocket inside the palisade.
  const touchesBank = (f: FortSpec) => f.tiles.some((i) => DIRS.some(([du, dv]) => zone[i + dv * w + du] === 69));
  for (const f of [...out]) {
    if (touchesBank(f)) continue;
    const next = out.find((g) => g !== f && touchesBank(g) && g.tiles.some((j) => f.tiles.some((i) =>
      Math.abs(i % w - j % w) + Math.abs(Math.floor(i / w) - Math.floor(j / w)) === 1)));
    if (!next) throw new Error(`Palisade ${f.id} has no inward bank`);
    next.tiles.push(...f.tiles);
    next.ramp!.push(...f.tiles.map((i): [number, number] => [i, BANK - 1]));
    out.splice(out.indexOf(f), 1);
  }
  return out;
}

/** Break a structure's tiles on the board: a gate's open to floor at its height; a palisade segment's to a rubble ramp from the ditch up to
 *  the bank (the ditch before it raised a step at a time). */
export function openFort(b: Board, f: FortSpec): number[] {
  const changed: number[] = [];
  for (const i of f.tiles) {
    const t = b.tiles[i];
    delete t.wall;
    if (f.kind !== 'drum') delete t.rock;
    changed.push(i);
  }
  if (f.ramp) for (const [i, height] of f.ramp) {
    b.tiles[i].h = height;
    changed.push(i);
  }
  if (f.kind === 'palisade' && f.rubble) {
    // (the palisade's two rows: the outer one a step below the bank)
    const w = b.w;
    for (const i of f.tiles) {
      const u = i % w;
      const v = Math.floor(i / w);
      const outer = ringOf(u, v) > 23;
      b.tiles[i].h = outer ? BANK - 1 : BANK;
    }
    const [outer, inner] = f.rubble;
    for (const i of outer) {
      b.tiles[i].h = Math.max(b.tiles[i].h, LAND - 1);
      changed.push(i);
    }
    for (const i of inner) {
      b.tiles[i].h = Math.max(b.tiles[i].h, LAND);
      changed.push(i);
    }
  }
  return changed;
}

/** The flesh: boulders, bushes and tall grass in the fields and the rear; ruined walls and tall grass in the burnt village; the orcs'
 *  tents (the war camp's yurt boulders) in the outer bailey's lanes. It keeps off the stamps, the posts' homes and the approaches. */
function flesh(b: Board, zone: Uint8Array, stamped: Uint8Array, bp: Blueprint, rng: Rng): void {
  const w = b.w;
  const keep = new Uint8Array(w * b.d);
  const clear = (p: Spot, r: number) => {
    for (let dv = -r; dv <= r; dv++)
      for (let du = -r; du <= r; du++) {
        const u = p.u + du;
        const v = p.v + dv;
        if (u >= 0 && v >= 0 && u < w && v < b.d) keep[v * w + u] = 1;
      }
  };
  for (const p of bp.posts) clear(p.at, 2);
  for (const a of bp.approaches) {
    for (let k = 0; k < a.way.length; k++) {
      clear(a.way[k], 1);
      const z = a.way[k + 1];
      if (!z) continue;
      // (and the line between each pair of waypoints)
      const n = Math.max(Math.abs(z.u - a.way[k].u), Math.abs(z.v - a.way[k].v));
      for (let s = 0; s <= n; s++) clear({ u: Math.round(a.way[k].u + ((z.u - a.way[k].u) * s) / n), v: Math.round(a.way[k].v + ((z.v - a.way[k].v) * s) / n) }, 1);
    }
  }
  for (const m of bp.muster) clear(m, 2);
  clear(bp.rally, 2);
  clear(bp.reinforce.at, 2);
  // Reserve tents on rocky shelves need clear walkways around their entrances.
  if (bp.landforms?.length) clear(bp.warpath, 5);
  for (let i = 0; i < w * b.d; i++) {
    const u = i % w;
    const v = (i - u) / w;
    const t = b.tiles[i];
    const z = String.fromCharCode(zone[i]);
    const roll = rng.next();
    if (stamped[i] || keep[i] || t.paved || t.ring || u < 1 || v < 1 || u > w - 2 || v > b.d - 2) continue;
    if (z === 'K' || z === 'N') {
      if (roll < 0.03) t.rock = true;
      else if (roll < 0.055) t.bush = true;
      else if (roll < 0.085 && !t.ground) t.ground = 'tall';
    } else if (z === 'V') {
      if (roll < 0.09) t.wall = true;
      else if (roll < 0.3 && !t.ground) t.ground = 'tall';
    } else if (z === 'B') {
      // (the tents in rows: on every third lane, a gap now and then, never within two tiles of a gate's line)
      const r = ringOf(u, v);
      if (bp.districts?.length) continue;
      if (bp.contour) {
        const nearCamp = [[39, 65], [64, 37], [32, 50]].some(([x, y]) => Math.abs(u - x) + Math.abs(v - y) < 7);
        if (nearCamp && roll < 0.13) t.rock = true;
      } else if (r > 8.5 && r < 15.5 && ((u + v) % 6 === 0 || (u - v + 600) % 6 === 0) && roll < 0.45) t.rock = true;
    }
  }
  // (no tent shuts a lane: a tent with three solid neighbours comes down)
  for (let i = 0; i < w * b.d; i++) {
    if (zone[i] !== 66 || !b.tiles[i].rock || stamped[i]) continue;
    const u = i % w;
    const v = (i - u) / w;
    let solid = 0;
    for (const [du, dv] of DIRS) if (!standable(b.tiles[(v + dv) * w + u + du])) solid++;
    if (solid >= 2) delete b.tiles[i].rock;
  }
}

/** Every tile a walker who jumps `jump` reaches from `from`, by a flood over `canStep`. */
export function floodFrom(b: Board, from: number, jump: number): Uint8Array {
  const seen = new Uint8Array(b.w * b.d);
  const q = [from];
  seen[from] = 1;
  while (q.length) {
    const i = q.pop()!;
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const nu = u + du;
      const nv = v + dv;
      if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
      const j = nv * b.w + nu;
      if (seen[j] || canStep(b.tiles[i], b.tiles[j], jump) === null) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/** What `fieldOk` found wrong (empty when the hold is sound). */
export function fieldProblems(map: HoldMap, bp: Blueprint): string[] {
  const b = map.board;
  const w = b.w;
  const out: string[] = [];
  const rally = bp.rally.v * w + bp.rally.u;
  const walk1 = floodFrom(b, rally, 1);
  // every standable tile outside the walls (beyond the ditch) is reachable from the Landing at jump 1
  let lost = 0;
  let first = '';
  for (let i = 0; i < w * b.d; i++) {
    const u = i % w;
    const v = (i - u) / w;
    if ((bp.contour ? !'KLCTVN'.includes(String.fromCharCode(map.zone[i])) : ringOf(u, v) < 26.5) || !standable(b.tiles[i]) || b.tiles[i].ground === 'deep' || walk1[i]) continue;
    lost++;
    if (!first) first = `(${u}, ${v}) h${b.tiles[i].h}`;
  }
  if (lost) out.push(`${lost} tiles outside the walls cannot be reached from the Landing at jump 1, first ${first}`);
  // the inner bailey cannot be reached at jump 4 while the gates stand
  const walk4 = floodFrom(b, rally, 4);
  for (let i = 0; i < w * b.d; i++) if (zone(map, i) === 'I' && walk4[i]) {
    out.push(`the inner bailey is open at jump 4 at (${i % w}, ${Math.floor(i / w)}) before a gate breaks`);
    break;
  }
  for (let i = 0; i < w * b.d; i++) if (zone(map, i) === 'B' && walk4[i]) {
    out.push(`the outer bailey is open at jump 4 at (${i % w}, ${Math.floor(i / w)}) before a gate breaks`);
    break;
  }
  // every post stands on ground, and nothing is placed on a solid tile
  for (const p of bp.posts) {
    const t = b.tiles[p.at.v * w + p.at.u];
    if (!standable(t)) out.push(`the post ${p.id} stands on a solid tile`);
  }
  for (const m of [...bp.muster, bp.rally, bp.reinforce.at]) if (!standable(b.tiles[m.v * w + m.u])) out.push(`(${m.u}, ${m.v}) is solid`);
  for (const a of bp.approaches) for (const p of a.way) if (!walk1[p.v * w + p.u]) out.push(`${a.name}'s waypoint (${p.u}, ${p.v}) cannot be reached`);
  return out;
}

const zone = (map: HoldMap, i: number) => String.fromCharCode(map.zone[i]);

/** Whether the hold is sound (`fieldProblems` finds nothing). */
export const fieldOk = (map: HoldMap, bp: Blueprint): boolean => fieldProblems(map, bp).length === 0;
