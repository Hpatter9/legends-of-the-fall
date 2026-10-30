// The Last Stand's castle halls (STAND-003: "make this look like a castle interior. The walls have been breached, so the guard falls back to
// protect the king at his throne"). A run is fought in one of four rooms of the castle, drawn from its seed and never the same as the run before:
// the great hall, the chapel, the library and the courtyard. Each has its walls round the edge of the field with two or three breaches in them
// (the only ways in: the foes come in by those), its own pillars, cover and raised floor, and the dressing the page draws (carpets, braziers,
// lamps, windows). The field itself is built from the plan in `standField.ts`. Pure rules: no Pixi, no DOM; every draw is a side stream of the seed.

import type { Area, At } from './board';
import { mixSeed, Rng } from './rng';

export const HALL_KINDS = ['hall', 'chapel', 'library', 'courtyard'] as const;
export type HallKind = (typeof HALL_KINDS)[number];

/** The four edges of the field, as the foes name them (where `v` or `u` is 0 or the last). */
export type Edge = 'north' | 'east' | 'south' | 'west';

/** What stands on a tile of cover (low: it stops a walker, not every shot). */
export type CoverKind = 'rubble' | 'shelf' | 'crate' | 'barrel' | 'chest' | 'pots' | 'well' | 'fountain';

/** A gap in the wall: its edge, the tile along the edge it is centred on, and how many tiles wide it is. */
export interface Breach {
  edge: Edge;
  at: number;
  width: number;
}

export interface HallPlan {
  kind: HallKind;
  name: string;
  /** The land the field belongs to (its sounds and weather): a stone room, or open sky for the courtyard. */
  area: Area;
  breaches: Breach[];
  /** Tall pillars: they stop walkers and shots. */
  pillars: At[];
  cover: (At & { what: CoverKind })[];
  /** Raised floor away from the dais: the chapel's galleries, a library's mezzanine, a courtyard's terrace (each tile's height). */
  raised: (At & { h: number })[];
  /** The page's dressing (looks only): carpets laid on the floor, braziers and lamps. */
  carpets: At[];
  braziers: At[];
  lamps: At[];
}

/** The side of the field and where the king's dais stands (the same numbers as `standField.ts`; kept here so this file stands alone). */
const N = 24;
const MID = 12;
/** A breach's width in tiles. */
export const BREACH_WIDTH = 5;

export const HALL_NAMES: Record<HallKind, string> = { hall: 'The throne room', chapel: 'The chapel', library: 'The library', courtyard: 'The courtyard' };

/** Which room a run was fought in under the old rule (drawn from its seed, never `avoid`, the room of the run before): a run saved before the
 *  retreat (STAND-RETREAT, `standActs.ts`) without a room of its own takes this one, until its next act's end. New runs start in the courtyard. */
export function hallOf(seed: number, avoid?: string | null): HallKind {
  const rng = new Rng(mixSeed(seed, 0x4a11));
  const pool = HALL_KINDS.filter((k) => k !== avoid);
  return pool[rng.int(0, pool.length - 1)];
}

/** The tiles of a breach, along its edge. */
export function breachTiles(b: Breach): At[] {
  const out: At[] = [];
  const half = Math.floor(b.width / 2);
  for (let i = b.at - half; i <= b.at + half; i++) out.push(b.edge === 'north' ? { u: i, v: 0 } : b.edge === 'south' ? { u: i, v: N - 1 } : b.edge === 'west' ? { u: 0, v: i } : { u: N - 1, v: i });
  return out;
}

/** A step from an edge tile into the room. */
export const inward = (edge: Edge): [number, number] => (edge === 'north' ? [0, 1] : edge === 'south' ? [0, -1] : edge === 'west' ? [1, 0] : [-1, 0]);

const mirror4 = (pts: [number, number][]): At[] => pts.flatMap(([du, dv]) => [[du, dv], [-du, dv], [du, -dv], [-du, -dv]]).map(([du, dv]) => ({ u: MID + du, v: MID + dv }));
const uniq = (pts: At[]): At[] => pts.filter((p, i) => pts.findIndex((q) => q.u === p.u && q.v === p.v) === i);
const rect = (u0: number, u1: number, v0: number, v1: number): At[] => {
  const out: At[] = [];
  for (let v = v0; v <= v1; v++) for (let u = u0; u <= u1; u++) out.push({ u, v });
  return out;
};

/** The plan of a run's room: its breaches (on two or three of the four walls, drawn from the seed) and the room's own furniture. */
export function hallPlan(seed: number, kind: HallKind): HallPlan {
  const rng = new Rng(mixSeed(seed, 0x4a12));
  const edges: Edge[] = ['north', 'east', 'south', 'west'];
  const count = kind === 'library' || kind === 'courtyard' ? 3 : 2;
  const pick: Edge[] = [];
  while (pick.length < count) pick.push(edges.splice(rng.int(0, edges.length - 1), 1)[0]);
  // (a breach is never at a corner, nor where a pillar or a shelf of the room stands just inside)
  const breaches: Breach[] = pick.map((edge) => ({ edge, at: rng.int(5, 18), width: BREACH_WIDTH }));
  const plan: HallPlan = { kind, name: HALL_NAMES[kind], area: kind === 'courtyard' ? 'plains' : 'dungeon', breaches, pillars: [], cover: [], raised: [], carpets: [], braziers: [], lamps: [] };
  const nearBreach = (p: At, gap = 2) => breaches.some((b) => breachTiles(b).some((t) => Math.abs(t.u - p.u) + Math.abs(t.v - p.v) <= gap));
  if (kind === 'hall') {
    // two colonnades down the length of the hall, a carpet the length of it through the dais, braziers round the dais and down the nave
    plan.pillars = mirror4([[-5, -8], [-5, -4], [-5, 4], [-5, 8]].map(([a, b]) => [a, b] as [number, number])).filter((p) => p.v >= 1 && p.v <= 22);
    plan.carpets = rect(MID, MID, 1, 22).filter((p) => Math.abs(p.v - MID) > 2);
    plan.braziers = mirror4([[3, 1]]).concat([{ u: MID - 5, v: MID }, { u: MID + 5, v: MID }]);
    plan.raised = [...rect(2, 4, 2, 4), ...rect(19, 21, 19, 21)].map((p) => ({ ...p, h: 2 }));
  } else if (kind === 'chapel') {
    // a ring of pillars round the nave, galleries raised round the walls, a carpet cross to the dais
    plan.pillars = mirror4([[7, 7], [0, 8], [8, 0]]);
    plan.carpets = [...rect(MID, MID, 4, 20), ...rect(4, 20, MID, MID)].filter((p) => Math.max(Math.abs(p.u - MID), Math.abs(p.v - MID)) > 2);
    plan.braziers = mirror4([[3, 1]]);
    for (let v = 1; v <= 22; v++) for (let u = 1; u <= 22; u++) {
      const r = Math.max(Math.abs(u - MID), Math.abs(v - MID));
      if (r >= 9) plan.raised.push({ u, v, h: r === 9 ? 2 : 3 });
    }
  } else if (kind === 'library') {
    // rows of shelves in the four corners as cover, a mezzanine in one, a carpet to the dais
    for (const [u0, u1, v0, v1] of [[2, 5, 2, 8], [18, 21, 2, 8], [2, 5, 15, 21], [18, 21, 15, 21]])
      for (const p of rect(u0, u1, v0, v1)) if ((p.u === u0 + 1 || p.u === u1 - 1) && p.v !== v0 && p.v !== v1) plan.cover.push({ ...p, what: 'shelf' });
    plan.pillars = [{ u: 7, v: 7 }, { u: 17, v: 7 }, { u: 7, v: 17 }, { u: 17, v: 17 }];
    plan.carpets = rect(MID, MID, 15, 21);
    plan.braziers = mirror4([[3, 1]]);
    plan.lamps = [{ u: 9, v: 5 }, { u: 15, v: 5 }, { u: 9, v: 19 }, { u: 15, v: 19 }];
    plan.raised = rect(9, 15, 1, 3).map((p) => ({ ...p, h: 2 }));
  } else {
    // open to the sky: a fountain, a well, stores as cover, a terrace, lamps, flagstone paths (the carpets) to the dais
    plan.cover = [
      { u: 18, v: 17, what: 'fountain' }, { u: 6, v: 6, what: 'well' }, { u: 17, v: 6, what: 'crate' }, { u: 18, v: 7, what: 'barrel' },
      { u: 5, v: 18, what: 'chest' }, { u: 7, v: 19, what: 'pots' }, { u: 4, v: 11, what: 'crate' }, { u: 20, v: 13, what: 'barrel' },
    ];
    plan.carpets = [...rect(MID, MID, 1, 22), ...rect(1, 22, MID, MID)].filter((p) => Math.max(Math.abs(p.u - MID), Math.abs(p.v - MID)) > 2);
    plan.braziers = mirror4([[3, 1]]);
    plan.lamps = [{ u: 9, v: 4 }, { u: 15, v: 4 }, { u: 4, v: 9 }, { u: 4, v: 15 }, { u: 20, v: 9 }, { u: 9, v: 20 }, { u: 15, v: 20 }];
    plan.raised = rect(15, 20, 15, 20).filter((p) => !(p.u === 18 && p.v === 17)).map((p) => ({ ...p, h: 2 }));
  }
  // rubble strewn inside each breach, beside the way in (never in it)
  for (const b of breaches) {
    const [du, dv] = inward(b.edge);
    const ends = [breachTiles(b)[0], breachTiles(b)[b.width - 1]];
    const along: [number, number] = b.edge === 'north' || b.edge === 'south' ? [1, 0] : [0, 1];
    ends.forEach((t, i) => {
      const s = i === 0 ? -1 : 1;
      plan.cover.push({ u: t.u + du + along[0] * s, v: t.v + dv + along[1] * s, what: 'rubble' });
      if (rng.chance(0.6)) plan.cover.push({ u: t.u + 2 * du + along[0] * s * 2, v: t.v + 2 * dv + along[1] * s * 2, what: 'rubble' });
    });
  }
  // (nothing of the room stands in a breach's way in, or on the dais)
  const clear = (p: At) => !nearBreach(p, 1) && Math.max(Math.abs(p.u - MID), Math.abs(p.v - MID)) > 3 && p.u > 0 && p.v > 0 && p.u < N - 1 && p.v < N - 1;
  plan.pillars = uniq(plan.pillars).filter(clear);
  plan.cover = plan.cover.filter((c, i) => plan.cover.findIndex((d) => d.u === c.u && d.v === c.v) === i).filter((c) => c.what === 'rubble' ? clear(c) || nearBreach(c, 3) : clear(c)).filter((c) => !breaches.some((b) => breachTiles(b).some((t) => t.u === c.u && t.v === c.v)) && c.u > 0 && c.v > 0 && c.u < N - 1 && c.v < N - 1);
  plan.raised = plan.raised.filter((p) => !nearBreach(p, 1));
  return plan;
}
