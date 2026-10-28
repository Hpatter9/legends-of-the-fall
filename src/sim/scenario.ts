// The grand story-spanning battlefields for the nine armies (and their three prototype aliases).
// Plan all sections deterministically before wave 1; the renderer still only receives revealed sections.
import { boardOk, canStep, DEPLOY_ROWS, DIRS, RAMP, sightClear, standable, type Area, type Board, type Piece, type Tile } from './board';
import { placesAfter, worldOf, type Place, type Section, type SectionSize } from './chain';
import { arenaMask, ARENAS, besideAt, levelArena, roadMask, touching } from './armyRoad';
import { planHazards } from './hazards';
import { mixSeed, Rng } from './rng';
import { footDims, unturnTile } from './turn';

export const ARMY_SCENARIOS = [
  'orcs',
  'undead',
  'beasts',
  'wildwood',
  'labyrinth',
  'ogres',
  'infernal',
  'yokai',
  'golems',
] as const;
export type ArmyScenarioId = (typeof ARMY_SCENARIOS)[number];

export const SCENARIOS = [
  ...ARMY_SCENARIOS,
  'mountain',
  'temple',
  'necropolis',
] as const;
export type ScenarioId = (typeof SCENARIOS)[number];

export type LandmarkKind =
  | 'fortress'
  | 'temple'
  | 'mausoleum'
  | 'warcamp'
  | 'den'
  | 'grove'
  | 'citadel'
  | 'shrine'
  | 'foundry';

export const SCENARIO_SIZE = { w: 14, d: 18 } as const;
export const isScenario = (id: unknown): id is ScenarioId => SCENARIOS.includes(id as ScenarioId);

/** The default story-spanning scenario for an army id. */
export function scenarioForArmy(armyId: string): ScenarioId {
  return (ARMY_SCENARIOS as readonly string[]).includes(armyId) ? (armyId as ScenarioId) : 'mountain';
}

export interface ScenarioPlan {
  theme: ScenarioId;
  seed: number;
  sections: Section[];
  /** First wave whose dropped terrain may display the destination. */
  revealWave: number;
  destination: { wave: number; u: number; v: number; kind: LandmarkKind };
  waterLevel: number | null;
}

/** Smooth continuous world-space spine; derivative wrt V is bounded below 0.05 so steep lateral cliffs remain 1-step navigable. */
export function routeSpine(seed: number, V: number): number {
  const p1 = (((mixSeed(seed, 0x7017) >>> 0) % 1000) / 1000) * Math.PI * 2;
  const p2 = (((mixSeed(seed, 0x91e3) >>> 0) % 1000) / 1000) * Math.PI * 2;
  return Math.sin(V / 40 + p1) * 1.4 + Math.cos(V / 28 + p2) * 0.4;
}

/** A seeded shoreline/switchback spine; adjacent rows move at most one tile. */
export function routeU(seed: number, V: number): number {
  return Math.round(routeSpine(seed, V));
}

function isLakeTheme(theme: ScenarioId): boolean {
  return theme === 'temple' || theme === 'labyrinth';
}

export function landmarkOfTheme(theme: ScenarioId): LandmarkKind {
  switch (theme) {
    case 'orcs':
      return 'warcamp';
    case 'undead':
    case 'necropolis':
      return 'mausoleum';
    case 'beasts':
      return 'den';
    case 'wildwood':
      return 'grove';
    case 'labyrinth':
    case 'temple':
      return 'temple';
    case 'infernal':
      return 'citadel';
    case 'yokai':
      return 'shrine';
    case 'golems':
      return 'foundry';
    case 'ogres':
    case 'mountain':
    default:
      return 'fortress';
  }
}

export function areaOfWave(theme: ScenarioId, phase: number): Area {
  switch (theme) {
    case 'orcs':
      return phase < 0.45 ? 'highlands' : 'warcamp';
    case 'undead':
      return phase >= 0.35 && phase < 0.72 ? 'dungeon' : 'graveyard';
    case 'necropolis':
      return phase < 0.2 ? 'plains' : phase >= 0.45 && phase < 0.74 ? 'dungeon' : 'graveyard';
    case 'beasts':
      return phase < 0.45 ? 'plains' : 'autumn';
    case 'wildwood':
      return phase < 0.45 ? 'swamp' : 'forest';
    case 'labyrinth':
      return phase < 0.45 ? 'ruins' : 'temple';
    case 'temple':
      return phase < 0.3 ? 'ruins' : phase < 0.68 ? 'oasis' : 'temple';
    case 'infernal':
      return phase < 0.45 ? 'desert' : 'volcano';
    case 'yokai':
      return phase < 0.45 ? 'forest' : 'shrine';
    case 'golems':
      return phase < 0.45 ? 'crystal' : 'forge';
    case 'ogres':
      return phase < 0.52 ? 'highlands' : 'snow';
    case 'mountain':
    default:
      return phase < 0.3 ? 'forest' : phase > 0.72 ? 'snow' : 'highlands';
  }
}

function treeKindFor(theme: ScenarioId, area: Area, rng: Rng): 'oak' | 'pine' | 'birch' {
  if (area === 'snow' || theme === 'ogres' || theme === 'mountain' || theme === 'orcs' || theme === 'golems') {
    return rng.chance(0.75) ? 'pine' : 'oak';
  }
  if (area === 'shrine' || theme === 'yokai' || area === 'autumn') {
    return rng.chance(0.7) ? 'birch' : 'oak';
  }
  if (area === 'graveyard' || area === 'dungeon' || area === 'swamp') {
    return rng.chance(0.55) ? 'birch' : 'oak';
  }
  return rng.chance(0.6) ? 'oak' : rng.chance(0.5) ? 'birch' : 'pine';
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
const rectOf = (p: Place, size: SectionSize = SCENARIO_SIZE): Rect => {
  const [w, d] = footDims(p.rot, size.w, size.d);
  return { x0: p.ou, y0: p.ov, x1: p.ou + w, y1: p.ov + d };
};
const overlaps = (a: Rect, b: Rect): boolean => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

/**
 * Plans a continuous winding thematic road across all campaign waves:
 * - Mountain / Highlands / Summit themes: switchback trails alternating North and East/West traversals
 * - Lake / Sunken Temple themes: circumnavigating the shoreline perimeter before crossing into the sunken temple
 * - Forest / River Valley themes: meandering S-curves through river clearings
 * - Catacombs / Necropolis: labyrinthine 90-degree corridors through crypts
 * - Infernal: spiraling caldera rim ridge
 */
export function planThematicRoad(theme: ScenarioId, seed: number, n: number, size: SectionSize = SCENARIO_SIZE): Place[] {
  const road: Place[] = [{ rot: 0, ou: 0, ov: 0, join: null }];
  let budget = 30000;

  const isLake = theme === 'temple' || theme === 'labyrinth';
  const isMountain = theme === 'mountain' || theme === 'ogres' || theme === 'orcs' || theme === 'golems';
  const isCatacomb = theme === 'undead' || theme === 'necropolis';
  const isInfernal = theme === 'infernal';

  const scoreCandidate = (c: Place, step: number): number => {
    const prev = road[road.length - 1];
    let score = 0;

    if (isLake) {
      const cycle = ['se', 'ne', 'se', 'ne', 'nw', 'ne', 'nw', 'ne', 'se', 'ne'];
      const want = cycle[(step - 1) % cycle.length];
      if (c.join === want) score -= 45;
      else if (c.join === 'ne') score -= 20;
      else score += 30;
    } else if (isMountain) {
      const cycle = ['ne', 'se', 'ne', 'nw'];
      const want = cycle[(step - 1) % cycle.length];
      if (c.join === want) score -= 50;
      else if (c.join === 'ne') score -= 20;
      else score += 30;
    } else if (isInfernal) {
      const cycle = ['ne', 'se', 'ne', 'ne', 'nw', 'ne', 'se', 'ne', 'nw'];
      const want = cycle[(step - 1) % cycle.length];
      if (c.join === want) score -= 45;
      else if (c.join === 'ne') score -= 20;
      else score += 25;
    } else if (isCatacomb) {
      const cycle = ['ne', 'nw', 'ne', 'se', 'ne', 'nw', 'ne', 'se'];
      const want = cycle[(step - 1) % cycle.length];
      if (c.join === want) score -= 45;
      else if (c.join === 'ne') score -= 15;
      else score += 25;
    } else {
      const cycle = ['ne', 'se', 'ne', 'nw', 'ne', 'se', 'ne', 'nw', 'ne'];
      const want = cycle[(step - 1) % cycle.length];
      if (c.join === want) score -= 40;
      else if (c.join === 'ne') score -= 15;
      else score += 20;
    }

    if (road.length >= 2 && c.join === prev.join && road[road.length - 2].join === prev.join) {
      score += 45;
    }
    // (the road through a section runs from its heroes' edge up to the foes' rows: a section joined on a flank is joined near the foes' end, so the road
    // goes on from there rather than doubling back, and one joined straight on is joined about the middle of the foes' edge)
    const touch = touching(prev, c, size.w, size.d).a;
    if (touch.length) {
      const vs = touch.map((p) => p[1]);
      const us = touch.map((p) => p[0]);
      const v = vs.reduce((a, b) => a + b, 0) / vs.length;
      const u = us.reduce((a, b) => a + b, 0) / us.length;
      score += c.join && touch.every((p) => p[1] === 0) ? Math.abs(u - (size.w - 1) / 2) * 2 : v * 3;
    }

    return score;
  };

  const go = (): boolean => {
    if (road.length >= n) return true;
    if (budget-- <= 0) return false;
    const rng = new Rng(mixSeed(seed, 0xc4a1, road.length + 1));
    const prev = road[road.length - 1];
    const fits = placesAfter(prev, size).filter((c) => road.every((q) => !overlaps(rectOf(c, size), rectOf(q, size))));
    if (!fits.length) return false;

    const scored = fits.map((c) => ({
      c,
      s: scoreCandidate(c, road.length) + rng.next() * 5,
    })).sort((a, b) => a.s - b.s);

    for (const { c } of scored) {
      road.push(c);
      if (go()) return true;
      road.pop();
    }
    return false;
  };

  if (!go()) throw new Error(`no thematic road for ${theme} seed ${seed}`);
  return road;
}

function tri(x: number, period: number): number {
  const half = period / 2;
  const m = ((x % period) + period) % period;
  return m < half ? m : period - m;
}

/**
 * One height field in world coordinates, sampled by every section.
 * Gives 15–22+ tiles of verticality within each 14×18 wave board (with rolling hills, ridges, and river valleys)
 * and climbs up to 45–60 tiles across the campaign while guaranteeing |h(U+du, V+dv) - h(U, V)| <= 1 for all orthogonal neighbours.
 */
export function scenarioHeight(theme: ScenarioId, U: number, V: number, _waves?: number, _seed = 0): number {
  const isLake = theme === 'temple' || theme === 'labyrinth';
  const progress = 65 - V;
  const climb = progress * (isLake ? 0.24 : 0.22);
  const fU = tri(U, 18) * 0.98;
  const gV = tri(progress + 11, 22) * (isLake ? 0.74 : 0.76);
  const baseOffset = isLake ? -12 : -9;
  const field = fU + gV + climb + baseOffset;
  if (isLake) return Math.max(1, Math.min(60, Math.floor(field)));
  return Math.max(0, Math.min(60, Math.floor(field)));
}

/** Where an arena's set pieces stand: on the land round it, the great one at the back (or a back corner, when the road goes on out that way). */
function arenaPieces(theme: ScenarioId, b: Board, exit: [number, number][] | null, seed: number): Piece[] {
  const kinds = (ARENAS[theme] ?? ARENAS.mountain).pieces;
  const rng = new Rng(seed);
  const spots: [number, number][] = [[Math.floor(b.w / 2), 0], [1, 1], [b.w - 2, 1], [1, 5], [b.w - 2, 5], [Math.floor(b.w / 2) - 3, 0], [Math.floor(b.w / 2) + 3, 0], [0, 9], [b.w - 1, 9]];
  const near = (u: number, v: number) => exit?.some(([x, y]) => Math.abs(x - u) + Math.abs(y - v) <= 3);
  const free = spots.filter(([u, v]) => b.tiles[v * b.w + u].scene && !near(u, v));
  const out: Piece[] = [];
  kinds.forEach((kind, k) => {
    const at = free.splice(k === 0 ? 0 : rng.int(0, Math.max(0, free.length - 1)), 1)[0];
    if (at) out.push({ u: at[0], v: at[1], kind });
  });
  return out;
}

/** Whether every standable tile can walk (climbing a single level) to the heroes' rows: the reverse of `boardOk`. */
function walksBack(b: Board): boolean {
  const seen = new Set<number>();
  const queue: number[] = [];
  for (let u = 0; u < b.w; u++) {
    const i = (b.d - 1) * b.w + u;
    if (standable(b.tiles[i])) {
      seen.add(i);
      queue.push(i);
    }
  }
  for (let k = 0; k < queue.length; k++) {
    const i = queue[k];
    const u = i % b.w;
    const v = Math.floor(i / b.w);
    for (const [du, dv] of DIRS) {
      const nu = u + du;
      const nv = v + dv;
      if (nu < 0 || nv < 0 || nu >= b.w || nv >= b.d) continue;
      const j = nv * b.w + nu;
      if (seen.has(j) || canStep(b.tiles[j], b.tiles[i], RAMP) === null) continue;
      seen.add(j);
      queue.push(j);
    }
  }
  return b.tiles.every((t, i) => !standable(t) || seen.has(i));
}

function isBastionValid(board: Board, checkReach = true): boolean {
  const { w, d } = board;
  const tiles = board.tiles;
  let perches = 0;
  let ramps = 0;
  let firstPerch: { u: number; v: number } | null = null;

  for (let v = 0; v < d; v++) {
    for (let u = 0; u < w; u++) {
      const t = tiles[v * w + u];
      if (t.perch) {
        perches++;
        if (!firstPerch) firstPerch = { u, v };
      }
      if (t.ramp) ramps++;
    }
  }
  if (perches < 6 || ramps < 1) return false;
  // (a bastion stands on the road, never on the land beside it)
  if (tiles.some((t) => t.scene && (t.perch || t.ramp))) return false;

  for (let v = 0; v < d; v++) {
    for (let u = 0; u < w; u++) {
      const t = tiles[v * w + u];
      for (const [du, dv] of DIRS) {
        const nu = u + du, nv = v + dv;
        if (nu >= 0 && nu < w && nv >= 0 && nv < d) {
          const nt = tiles[nv * w + nu];
          const lim = (t.perch || nt.perch || t.ramp || nt.ramp) ? 2 : 1;
          if (Math.abs(t.h - nt.h) > lim) return false;
        }
      }
    }
  }

  for (let v = 0; v < d; v++) {
    for (let u = 0; u < w; u++) {
      const pt = tiles[v * w + u];
      if (!pt.perch) continue;
      if (v > 0) {
        const north = tiles[(v - 1) * w + u];
        if (!north.perch && !north.ramp && standable(north)) {
          if (canStep(north, pt, RAMP) !== null) return false;
        }
      }
    }
  }

  for (let v = 0; v < d; v++) {
    for (let u = 0; u < w; u++) {
      const rt = tiles[v * w + u];
      if (!rt.ramp) continue;
      if (v + 1 >= d || v - 1 < 0) return false;
      const south = tiles[(v + 1) * w + u];
      const north = tiles[(v - 1) * w + u];
      if (canStep(south, rt, RAMP) === null) return false;
      if (canStep(rt, north, RAMP) === null) return false;
    }
  }

  if (checkReach && firstPerch) {
    const { u: pu, v: pv } = firstPerch;
    if (pv - 4 < 0) return false;
    const pt = tiles[pv * w + pu];
    const lowTarget = tiles[(pv - 4) * w + pu];
    if (pt.h - lowTarget.h < 2) return false;
    if (!sightClear(board, { u: pu, v: pv }, { u: pu, v: pv - 4 })) return false;
  }

  // (on a road with land beside it a bastion's long ramp can leave a pocket beside it that a walker drops into and cannot climb out of: every
  // tile must also be able to walk back to the heroes' rows, so survivors can always walk on to the next section)
  const bare = (): Board => ({
    ...board,
    tiles: board.tiles.map((t) => (t.rock || t.wall || t.tree || t.barrel ? { ...t, rock: undefined, wall: undefined, tree: t.scene ? t.tree : undefined, barrel: undefined } : t)),
  });
  // (as with `boardOk` below: the road's own props may be cleared afterwards, so a board that walks back without them will do)
  if (!walksBack(board) && !walksBack(bare())) return false;

  if (!boardOk(board)) {
    const clone = {
      ...board,
      tiles: board.tiles.map((t) => (t.rock || t.wall || t.tree || t.barrel ? { ...t, rock: undefined, wall: undefined, tree: undefined, barrel: undefined } : t)),
    };
    if (!boardOk(clone)) return false;
  }

  return true;
}

function tryPlaceBastion(board: Board, u0: number, v0: number, checkReach: boolean): boolean {
  const { w, d } = board;
  const bw = 3;
  if (v0 - 1 < 0 || v0 + 2 >= d || u0 + bw > w) return false;

  if (checkReach) {
    if (v0 - 4 < 0) return false;
    const nH0 = board.tiles[(v0 - 1) * w + u0].h;
    const tH0 = board.tiles[(v0 - 4) * w + u0].h;
    if (nH0 + 2 <= tH0) return false;
  }

  // (the world's height stays within its 60 steps)
  for (let du = 0; du < bw; du++) if (board.tiles[(v0 - 1) * w + u0 + du].h + 2 > 60) return false;

  const backup: { idx: number; tile: Tile }[] = [];

  for (let du = 0; du < bw; du++) {
    const u = u0 + du;
    const nH = board.tiles[(v0 - 1) * w + u].h;
    const sH = v0 + 3 < d ? board.tiles[(v0 + 3) * w + u].h : nH;
    const topH = nH + 2;
    const midH = Math.min(topH, Math.max(topH - 1, sH));
    const rampH = Math.min(midH + 1, Math.max(midH - 1, sH));

    const i0 = v0 * w + u;
    backup.push({ idx: i0, tile: { ...board.tiles[i0] } });
    const t0 = board.tiles[i0];
    t0.perch = true; t0.h = topH;
    delete t0.rock; delete t0.wall; delete t0.tree; delete t0.barrel; delete t0.ground;

    const i1 = (v0 + 1) * w + u;
    backup.push({ idx: i1, tile: { ...board.tiles[i1] } });
    const t1 = board.tiles[i1];
    t1.perch = true; t1.h = midH;
    delete t1.rock; delete t1.wall; delete t1.tree; delete t1.barrel; delete t1.ground;

    const i2 = (v0 + 2) * w + u;
    backup.push({ idx: i2, tile: { ...board.tiles[i2] } });
    const t2 = board.tiles[i2];
    t2.ramp = true; t2.h = rampH;
    delete t2.rock; delete t2.wall; delete t2.tree; delete t2.barrel; delete t2.ground;

    let currH = rampH;
    for (let v = v0 + 3; v < d - 1; v++) {
      const iv = v * w + u;
      const gt = board.tiles[iv];
      if (currH - gt.h > 1) {
        currH--;
        backup.push({ idx: iv, tile: { ...gt } });
        gt.ramp = true; gt.h = currH;
        delete gt.rock; delete gt.wall; delete gt.tree; delete gt.barrel; delete gt.ground;
      } else {
        break;
      }
    }
  }

  // Clear firing lane
  for (let u = u0; u < u0 + bw; u++) {
    for (let v = Math.max(0, v0 - 4); v < v0; v++) {
      const iv = v * w + u;
      const front = board.tiles[iv];
      if (front.rock || front.wall || front.tree || front.barrel || front.ground === 'tall') {
        backup.push({ idx: iv, tile: { ...front } });
        delete front.rock; delete front.wall; delete front.tree; delete front.barrel;
        if (front.ground === 'tall') delete front.ground;
      }
    }
  }

  // Clear foot of ramp
  for (let u = u0; u < u0 + bw; u++) {
    let cleared = 0;
    for (let v = v0 + 3; v < d; v++) {
      const iv = v * w + u;
      const foot = board.tiles[iv];
      if (foot.ramp) continue;
      if (foot.rock || foot.wall || foot.tree || foot.barrel || foot.ground === 'deep') {
        backup.push({ idx: iv, tile: { ...foot } });
        delete foot.rock; delete foot.wall; delete foot.tree; delete foot.barrel;
        if (foot.ground === 'deep') foot.ground = 'water';
      }
      cleared++;
      if (cleared >= 2) break;
    }
  }

  // Keep flank passages open beside the hill and all the way past the ramp
  for (const flankCol of [u0 - 1, u0 + bw]) {
    if (flankCol < 0 || flankCol >= w) continue;
    for (let v = Math.max(0, v0 - 1); v < d; v++) {
      const iv = v * w + flankCol;
      const flank = board.tiles[iv];
      if (flank && (flank.rock || flank.wall || flank.tree || flank.barrel || flank.ground === 'deep')) {
        backup.push({ idx: iv, tile: { ...flank } });
        delete flank.rock; delete flank.wall; delete flank.tree; delete flank.barrel;
        if (flank.ground === 'deep') flank.ground = 'water';
      }
    }
  }

  if (isBastionValid(board, checkReach)) {
    return true;
  }

  for (let k = backup.length - 1; k >= 0; k--) {
    board.tiles[backup[k].idx] = backup[k].tile;
  }
  return false;
}

/**
 * Places a tactical steep hill (archer bastion):
 * Elevated by 2 levels (sheer cliff) on 3 sides facing the enemy and flanks,
 * with a stepped ramp on the south face facing the player's lines.
 */
function placeArcherBastion(board: Board, theme: ScenarioId): void {
  const leftRoad = theme === 'undead' || theme === 'necropolis' || theme === 'infernal';
  const uCols = leftRoad
    ? [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  // Pass 1: Try placing with high-ground reach advantage over front valley
  for (const v0 of [11, 12, 10, 13, 9, 14, 8, 7, 6, 5, 4]) {
    for (const u0 of uCols) {
      if (tryPlaceBastion(board, u0, v0, true)) return;
    }
  }

  // Pass 2: Fallback without strict reach constraint if terrain slopes continuously downhill
  for (const v0 of [11, 12, 10, 13, 9, 14, 8, 7, 6, 5, 4, 3, 2, 1]) {
    for (const u0 of uCols) {
      if (tryPlaceBastion(board, u0, v0, false)) return;
    }
  }
}

/** A complete seeded route through an army's landscape: 14×18 sections with hills, rivers, bridges, trees, rocks, and 45–60 tile world height.
 *  `land`, when given, holds every section on that one land (an army's attempt keeps the land its seed picked: the owner's rule, one
 *  land for the one long battle); without it the route walks through its theme's lands by phase (`areaOfWave`). */
export function planScenario(seed: number, theme: ScenarioId, waves: number, boss: (wave: number) => boolean, land?: Area): ScenarioPlan {
  if (!Number.isInteger(waves) || waves < 1) throw new Error('a scenario needs at least one wave');
  const { w, d } = SCENARIO_SIZE;
  const sections: Section[] = [];
  const revealWave = Math.max(1, waves - 1);
  const kind = landmarkOfTheme(theme);
  const lake = isLakeTheme(theme);

  const road = planThematicRoad(theme, seed, waves, SCENARIO_SIZE);

  // The destination boss landmark anchors to the final boss arena section in world coordinates.
  const lastPlace = road[waves - 1];
  const lastSection = { rot: lastPlace.rot, origin: { u: lastPlace.ou, v: lastPlace.ov }, board: { w, d } };
  // (the final arena is the destination itself (WORLD-ROAD): its middle, where the camera's reveal looks when the arena is reached)
  const [destinationU, destinationV] = worldOf(lastSection, Math.floor(w / 2), 6);

  for (let n = 1; n <= waves; n++) {
    const place = road[n - 1];
    const origin = { u: place.ou, v: place.ov };
    const rot = place.rot;
    const join = place.join;
    const isBoss = boss(n);

    const rng = new Rng(mixSeed(seed, 0x5ce1, n));
    const phase = n / waves;
    const area = land ?? areaOfWave(theme, phase);
    const tiles: Tile[] = [];

    // The road: where it comes in from the section before and leaves for the next (WORLD-ROAD), and the land beside it.
    const entry = n > 1 ? touching(road[n - 2], place, w, d).b : null;
    const exit = n < waves ? touching(place, road[n], w, d).a : null;
    const arena = isBoss ? arenaMask(theme, w, d, entry, exit, mixSeed(seed, 0xa7e0, n)) : null;
    const onRoad = arena ? arena.road : roadMask(w, d, entry, exit, mixSeed(seed, 0x20ad, n));
    // (the middle of the road on each row, for where a bridge goes)
    const roadMid = Array.from({ length: d }, (_, v) => {
      const us = [...Array(w).keys()].filter((u) => onRoad[v * w + u]);
      return us.length ? (us[0] + us[us.length - 1]) / 2 : w / 2;
    });
    const midCorridor = (u: number, v: number) => Math.abs(u - roadMid[v]) <= 1;

    // A winding river / stream / lava channel cuts across the middle valley of the section, spanned by bridges where the road crosses it.
    const rCenter = Math.floor(d / 2) + ((n % 2 === 0) ? -1 : 0);
    const riverRowAt = (u: number) =>
      Math.max(
        DEPLOY_ROWS + 2,
        Math.min(d - DEPLOY_ROWS - 3, Math.round(rCenter + Math.sin(u * 0.55 + (seed + n) * 0.8) * 1.2)),
      );
    const riverScene = theme === 'infernal' || (theme === 'golems' && phase >= 0.45) ? 'lava' : 'water';

    const secRef = { rot, origin, board: { w, d } };
    const river = new Set<number>();

    for (let v = 0; v < d; v++) {
      for (let u = 0; u < w; u++) {
        const [U, V] = worldOf(secRef, u, v);
        const h = scenarioHeight(theme, U, V, waves, seed);
        const t: Tile = { h, deco: rng.int(0, 255) };
        const inMiddleRows = v >= DEPLOY_ROWS && v < d - DEPLOY_ROWS;
        const rv = riverRowAt(u);
        const inRiver = !arena && inMiddleRows && (!lake || h > 1) && (v === rv || (v === rv + 1 && (u % 2 === 0 || u === 0 || u === w - 1)));
        if (inRiver) river.add(v * w + u);
        const nearRiver = inMiddleRows && Math.abs(v - rv) <= 2 && !inRiver;

        if (!onRoad[v * w + u]) {
          // (beside the road: the river runs on through it, the lake laps it, and otherwise the theme's land in patches)
          if (arena?.ring[v * w + u]) {
            t.scene = arena.ring[v * w + u]!;
            t.ring = true;
          }
          else if (inRiver || (lake && h === 1)) {
            t.scene = riverScene;
            // (the lake itself is deep water at its one level, as it always was)
            if (lake && h === 1) t.ground = 'deep';
          }
          else t.scene = besideAt(theme, seed, U, V);
          if (t.scene === 'wood') t.tree = treeKindFor(theme, area, rng);
        } else if (lake && h === 1 && !arena) {
          if (midCorridor(u, v) && (v === Math.floor(d / 2) || v === Math.floor(d / 3) || v === Math.floor((2 * d) / 3))) {
            t.bridge = true;
          } else {
            t.ground = 'water';
          }
        } else if (inRiver) {
          if (midCorridor(u, v)) {
            t.bridge = true;
          } else if (lake) {
            // On lake themes, upper canal crossings are bridged aqueducts while the lake shoreline stays at h = 1.
            t.bridge = true;
          } else if (theme === 'infernal' || (theme === 'golems' && phase >= 0.45)) {
            t.ground = 'lava';
          } else if (area === 'snow' || (theme === 'golems' && phase < 0.45)) {
            t.ground = 'ice';
          } else {
            t.ground = 'water';
          }
        } else if (inMiddleRows && !midCorridor(u, v) && !arena) {
          // (the road's own cover, thinner than the old open field's: the land beside it is the rest)
          if (nearRiver && rng.chance(0.18)) {
            if (rng.chance(0.45) && theme !== 'infernal') {
              t.rock = true;
              t.tree = treeKindFor(theme, area, rng);
            } else if (rng.chance(0.65)) {
              t.ground = 'tall';
            } else {
              t.rock = true;
            }
          } else if (theme === 'undead' || theme === 'necropolis') {
            if (rng.chance(0.05 + phase * 0.05)) t.wall = true;
            else if (rng.chance(0.05)) t.rock = true;
            else if (rng.chance(0.08)) t.ground = 'tall';
          } else if (theme === 'orcs') {
            if (rng.chance(0.05)) t.wall = true;
            else if (rng.chance(0.05)) t.rock = true;
            else if (v > DEPLOY_ROWS + 1 && v < d - DEPLOY_ROWS - 1 && rng.chance(0.025)) t.barrel = true;
          } else if (theme === 'beasts') {
            if (rng.chance(0.05)) t.rock = true;
            else if (rng.chance(0.1)) t.ground = 'tall';
          } else if (theme === 'wildwood') {
            if (rng.chance(0.07)) {
              t.rock = true;
              t.tree = treeKindFor(theme, area, rng);
            } else if (rng.chance(0.12)) t.ground = 'tall';
            else if (rng.chance(0.02)) t.ground = 'shrine';
          } else if (theme === 'infernal') {
            if (v > DEPLOY_ROWS + 1 && v < d - DEPLOY_ROWS - 1 && rng.chance(0.05)) t.ground = 'lava';
            else if (rng.chance(0.05)) t.wall = true;
            else if (rng.chance(0.06)) t.rock = true;
            else if (rng.chance(0.025)) t.barrel = true;
          } else if (theme === 'yokai') {
            if (rng.chance(0.06)) {
              t.rock = true;
              t.tree = treeKindFor(theme, area, rng);
            } else if (rng.chance(0.08)) t.ground = 'tall';
            else if (rng.chance(0.025)) t.ground = 'shrine';
          } else if (theme === 'golems') {
            if (phase < 0.45 && rng.chance(0.08)) t.ground = 'ice';
            else if (phase >= 0.45 && v > DEPLOY_ROWS + 1 && v < d - DEPLOY_ROWS - 1 && rng.chance(0.05)) t.ground = 'lava';
            else if (rng.chance(0.05)) t.wall = true;
            else if (rng.chance(0.05)) t.rock = true;
          } else {
            // ogres / mountain / temple / labyrinth upper hills
            if (area === 'snow' && rng.chance(0.08)) t.ground = 'ice';
            else if (lake && rng.chance(0.05)) t.wall = true;
            else if (rng.chance(0.05)) {
              t.rock = true;
              t.tree = treeKindFor(theme, area, rng);
            } else if (rng.chance(0.05)) t.rock = true;
            else if (rng.chance(0.07)) t.ground = 'tall';
          }
        }
        if (!t.scene && !t.rock && !t.wall && !t.barrel && !t.ground && !t.bridge && rng.chance(0.18)) t.bush = true;
        tiles.push(t);
      }
    }

    if (arena) {
      // The arena: its floor levelled towards its middle (kept within a step of each neighbour and of the sections either side), flagstones for a
      // paved one, a bridge where the road crosses a moat, and what stands inside.
      const spec = ARENAS[theme] ?? ARENAS.mountain;
      const fixed = [...(entry ?? []), ...(exit ?? [])].map(([u, v]) => v * w + u).filter((i) => onRoad[i]);
      const [cx, cy] = arena.centre;
      const level = tiles[Math.round(cy) * w + Math.round(cx)].h;
      const levelled = levelArena(tiles.map((t) => t.h), w, d, arena.floor, fixed, level);
      tiles.forEach((t, i) => {
        t.h = levelled[i];
        if (arena.floor[i] && spec.paved) t.paved = true;
        if (arena.floor[i]) delete t.bush;
        if (arena.gates.has(i) && spec.ring === 'lava') t.bridge = true;
      });
      for (const [i, x] of arena.inner) {
        const t = tiles[i];
        if (x.scene) t.scene = x.scene;
        if (x.ground) t.ground = x.ground;
        if (x.barrel) t.barrel = true;
      }
    }

    const [lu, lv] = unturnTile(rot, destinationU - origin.u, destinationV - origin.v, w, d);
    const board: Board = {
      ...(n >= revealWave
        ? {
            landmark: kind,
            landmarkAt: {
              u: lu,
              v: lv,
              h: scenarioHeight(theme, destinationU, destinationV, waves, seed),
            },
          }
        : {}),
      seed: mixSeed(seed, 0x57a6e, n),
      area,
      w,
      d,
      tiles,
    };
    if (arena) board.pieces = arenaPieces(theme, board, exit, mixSeed(seed, 0x91ece, n));

    // Raise steep hills / archer bastion redoubts
    if (!isBoss) {
      placeArcherBastion(board, theme);
    }

    // Keep props only when every walkable tile remains reachable by the least mobile ground unit, and can walk back to the heroes' rows.
    if (!boardOk(board) || !walksBack(board)) {
      tiles.forEach((t, i) => {
        delete t.rock;
        delete t.wall;
        delete t.barrel;
        if (!t.scene) delete t.tree;
        // (an arena's inner graves and walls go too; the land beside the road stays)
        if (onRoad[i]) delete t.scene;
      });
    }
    if (!boardOk(board)) {
      throw new Error(`disconnected ${theme} section ${n} for seed ${seed}`);
    }
    // The living land (WORLD-ROAD): the way the river runs (out over an open edge, where it pours off as a fall), and the section's hazards.
    const open = (u: number, v: number, du: number, dv: number) => {
      const [U, V] = worldOf(secRef, u + du, v + dv);
      return road.every((q) => {
        const r = rectOf(q);
        return U < r.x0 || U >= r.x1 || V < r.y0 || V >= r.y1;
      });
    };
    const edgeOpen = (u: number, du: number) => [...river].some((i) => i % w === u && open(u, Math.floor(i / w), du, 0));
    const flow: [number, number] = edgeOpen(w - 1, 1) ? [1, 0] : edgeOpen(0, -1) ? [-1, 0] : (seed + n) % 2 ? [1, 0] : [-1, 0];
    if (river.size) board.flow = flow;
    for (const i of river) tiles[i].stream = true;
    const out = flow[0] > 0 ? w - 1 : 0;
    const falls = [...river]
      .filter((i) => i % w === out && !tiles[i].bridge && open(out, Math.floor(i / w), flow[0], 0))
      .map((i) => ({ u: out, v: Math.floor(i / w), du: flow[0], dv: 0, lava: tiles[i].scene === 'lava' || tiles[i].ground === 'lava' }));
    if (falls.length) board.falls = falls;
    const hazards = planHazards(theme, board, isBoss, mixSeed(seed, 0x4a2d0, n), flow, arena?.centre);
    if (hazards.length) board.hazards = hazards;
    sections.push({ wave: n, board, rot, origin, join, boss: isBoss });
  }

  return {
    theme,
    seed,
    sections,
    revealWave,
    destination: { wave: waves, u: destinationU, v: destinationV, kind },
    waterLevel: lake ? 1 : null,
  };
}
