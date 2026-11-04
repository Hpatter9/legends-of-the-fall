// Layout templates: hand-made shapes for a battlefield, laid over the seeded land so fights play differently from one
// seed to the next (a river with bridges, a hill to fight over, a canyon, a ruined fort...). A template pins the heights
// of the tiles it shapes in the middle ground (between the two sides' deploy rows), puts its obstacles there (deep
// water, walls) and leaves the rest of the land to be eased to a ramp around it. Every board is checked with `boardOk`
// (all tiles reachable by a fighter that climbs one level, so both sides can reach each other) and keeps its deploy
// rows free of obstacles; a template that fails is tried again with another stream, and in the end the board is laid
// the old way (`classic`: rolling land with platforms and pits). Pure rules: no Pixi, no DOM, and its own side stream of
// the seed (`0x1a70`), so nothing else on the board moves with it.

import { DEPLOY_ROWS, LAVA_LANDS, tileAt, TOP, type Area, type Board, type Ground, type Tile } from './board';
import { clampH, easeAround, fit, fluidOf, idx, put, rowLevel, spread, type Plan } from './layoutKit';
import { mixSeed, Rng } from './rng';
import { ZONE_TEMPLATES, type ZoneId } from './calZones';

export const LAYOUT_IDS = ['classic', 'plain', 'river', 'hill', 'pass', 'fort', 'islands', 'ring', 'plateaus'] as const;
/** A layout: one of the shapes any fight can be laid in, or one of the Calamity's own zones (`calZones.ts`, laid only when asked for: `layoutFor` never picks one). */
export type LayoutId = (typeof LAYOUT_IDS)[number] | ZoneId;

/** What each layout is called, and what the codex says of it. */
export const LAYOUT_INFO: Record<(typeof LAYOUT_IDS)[number], { name: string; text: string }> = {
  classic: { name: 'Rolling land', text: 'Hills, platforms with a staircase and pits.' },
  plain: { name: 'Open plain', text: 'Low, level ground with a few boulders: nothing to hide behind or climb.' },
  river: { name: 'The river', text: 'Deep water splits the field. Cross by the bridges and fords, or fly.' },
  hill: { name: 'The hill', text: 'A hill in the middle of the field. High ground hits harder, so both sides fight for the top.' },
  pass: { name: 'The pass', text: 'Tall ridges close in on a narrow way through the middle. The ridges are a perch for shooters.' },
  fort: { name: 'The ruined fort', text: 'Broken walls round a courtyard. Walls stop shots; the gates and gaps are where the fight goes.' },
  islands: { name: 'The islands', text: 'Islands in deep water, joined by narrow causeways.' },
  ring: { name: 'The ring', text: 'A raised ring round a pit. The way down is by the steps; a fall is a long one.' },
  plateaus: { name: 'The ravine', text: 'Two plateaus split by a ravine. One bridge crosses it.' },
};

type Weights = Partial<Record<(typeof LAYOUT_IDS)[number], number>>;
const BASE: Record<(typeof LAYOUT_IDS)[number], number> = { classic: 5, plain: 1.5, river: 2, hill: 2, pass: 2, fort: 2, islands: 1.2, ring: 1.5, plateaus: 2 };
/** What each area changes of the base odds (an area not named takes the base). */
const BY_AREA: Partial<Record<Area, Weights>> = {
  highlands: { river: 2.5, hill: 2.5 },
  forest: { river: 2.5, pass: 2.5, fort: 1 },
  snow: { islands: 2, ring: 2, plain: 2, fort: 0.5, river: 1.5 },
  desert: { pass: 3, plateaus: 3, fort: 2, river: 0.7, islands: 0.5 },
  volcano: { islands: 2.5, ring: 2.5, pass: 2, river: 2, fort: 0.5, plain: 0.5 },
  dungeon: { fort: 3, ring: 2, pass: 2, river: 1.5, plateaus: 1, hill: 0.5, plain: 0.3 },
  plains: { river: 2, hill: 2.5, plain: 2.5 },
  autumn: { river: 2.5, pass: 2, hill: 2 },
  swamp: { river: 3, islands: 3, plain: 0.5, hill: 1, pass: 1 },
  graveyard: { fort: 2.5, ring: 2, hill: 1.5, plain: 0.7 },
  ruins: { fort: 4, pass: 2, ring: 2, plain: 0.5 },
  temple: { fort: 2.5, ring: 2.5, plateaus: 2, plain: 0.5 },
  crystal: { pass: 2, ring: 2, plateaus: 2.5, islands: 1.5 },
  forge: { fort: 2.5, ring: 2.5, pass: 2, river: 2, islands: 1.5, plain: 0.3 },
  shrine: { ring: 3, hill: 2, fort: 2, plain: 0.5 },
  warcamp: { fort: 3, plain: 2, hill: 2, river: 1 },
  oasis: { river: 3, islands: 2, plateaus: 2, plain: 1.5 },
};

/** The layout for a seed on a land (a side stream of the seed, so it is the same whatever else changes). */
export function layoutFor(seed: number, area: Area): LayoutId {
  const w = { ...BASE, ...BY_AREA[area] };
  const total = LAYOUT_IDS.reduce((n, id) => n + w[id], 0);
  let r = new Rng(mixSeed(seed, 0x1a70)).next() * total;
  for (const id of LAYOUT_IDS) if ((r -= w[id]) < 0) return id;
  return 'classic';
}

// ---- the templates ---------------------------------------------------------------------------------------------------

/** One or two rows of deep water right across the field, banks of one level, two or three crossings: bridges mostly, a ford sometimes. */
function river(p: Plan): void {
  const { b, rng } = p;
  const thick = p.m1 - p.m0 + 1 >= 5 && rng.chance(0.4) ? 2 : 1;
  // (across the middle of the field, not hard against either side's rows)
  const rv = rng.int(Math.min(p.m0 + 1, p.m1 - thick), Math.max(p.m1 - thick, p.m0 + 1));
  const bank = clampH(Math.max(1, Math.min(3, (rowLevel(b, rv - 1) + rowLevel(b, rv + thick)) / 2)));
  for (let k = 0; k < thick; k++) for (let u = 0; u < b.w; u++) put(p, u, rv + k, { h: Math.max(0, bank - 1), ground: fluidOf(p.area) });
  // (the banks are flat, a level, so a crossing is flush with both)
  for (let u = 0; u < b.w; u++) {
    put(p, u, rv - 1, { h: bank });
    put(p, u, rv + thick, { h: bank });
  }
  const cross = spread(rng, 0, b.w - 1, b.w >= 9 ? 3 : 2, 3);
  cross.forEach((u, n) => {
    // (the first crossing is always a bridge; the others are a ford, shallows to wade, one time in three, unless the river is a lake of lava)
    const ford = n > 0 && !LAVA_LANDS.includes(p.area) && rng.chance(0.35);
    for (let k = 0; k < thick; k++) {
      const t: Partial<Tile> = { h: bank };
      if (ford) t.ground = 'water';
      else t.bridge = true;
      put(p, u, rv + k, t);
    }
  });
}

/** A pyramid hill in the middle of the field, steep on one side (a cliff three levels high) and a ramp on the others. */
function hill(p: Plan): void {
  const { b, rng } = p;
  const cu = Math.floor((b.w - 1) / 2) + rng.int(0, 1) * (b.w % 2 === 0 ? 1 : 0);
  const cv = Math.floor((p.m0 + p.m1) / 2);
  const peak = rng.int(4, TOP);
  const steep = rng.int(0, 3);
  const flatTop = rng.chance(0.5);
  for (let v = p.m0 - 1; v <= p.m1 + 1; v++)
    for (let u = 0; u < b.w; u++) {
      const du = u - cu;
      const dv = v - cv;
      // (a hill wider across than deep, as the field is)
      let dist = Math.max(Math.abs(du) * 0.75, Math.abs(dv)) + (Math.abs(du) + Math.abs(dv)) * 0.15;
      if (flatTop) dist = Math.max(0, dist - 0.8);
      let h = peak - Math.round(dist);
      // (one side drops away: the ring next to the top falls three levels at once)
      const side = Math.abs(du) * 0.75 > Math.abs(dv) ? (du > 0 ? 0 : 2) : dv > 0 ? 1 : 3;
      if (side === steep && Math.round(dist) >= 1) h = Math.min(h, peak - 3 - (Math.round(dist) - 1));
      if (h > 0) put(p, u, v, { h: clampH(h) });
    }
}

/** Tall ridges close in on the sides of the middle ground, leaving a narrow way (two or three tiles wide, wandering a tile) through. */
function pass(p: Plan): void {
  const { b, rng } = p;
  const width = rng.chance(0.6) ? 2 : 3;
  const left = Math.floor((b.w - width) / 2);
  const rows = p.m1 - p.m0 + 3;
  const peak = Math.min(TOP - 1, 1 + Math.floor((rows - 1) / 2));
  const shift = rng.int(-1, 1);
  const bend = rng.int(p.m0, p.m1);
  for (let i = 0; i < rows; i++) {
    const v = p.m0 - 1 + i;
    const ridge = clampH(Math.min(peak, 1 + Math.min(i, rows - 1 - i)));
    // (the way bends a tile at the row `bend`)
    const l = Math.max(1, Math.min(b.w - width - 1, left + (v >= bend ? shift : 0)));
    for (let u = 0; u < b.w; u++) put(p, u, v, { h: u >= l && u < l + width ? 0 : ridge });
  }
}

/** A ruin: a ring of broken wall round a courtyard, with gates and gaps. */
function fort(p: Plan): void {
  const { b, rng } = p;
  const u0 = 1;
  const u1 = b.w - 2;
  const v0 = p.m0;
  const v1 = p.m1;
  const floor = rng.int(1, 2);
  const gates = new Set<string>();
  // (a gate in each of the long walls, and one in a side wall, then the walls crumble here and there)
  const gate = (u: number, v: number) => gates.add(`${u},${v}`);
  gate(rng.int(u0 + 1, u1 - 1), v0);
  gate(rng.int(u0 + 1, u1 - 1), v1);
  if (rng.chance(0.7)) gate(rng.chance(0.5) ? u0 : u1, rng.int(v0 + 1, v1 - 1));
  for (let v = v0; v <= v1; v++)
    for (let u = u0; u <= u1; u++) {
      const edge = u === u0 || u === u1 || v === v0 || v === v1;
      if (!edge) {
        put(p, u, v, { h: floor });
        continue;
      }
      const corner = (u === u0 || u === u1) && (v === v0 || v === v1);
      const open = gates.has(`${u},${v}`) || (!corner && rng.chance(0.18));
      put(p, u, v, open ? { h: floor } : { h: floor, wall: true });
    }
  // (the ground outside the fort is level with its floor on the gate side, so the gates are not a climb)
  for (const k of gates) {
    const [u, v] = k.split(',').map(Number);
    const out = v === v0 ? [u, v - 1] : v === v1 ? [u, v + 1] : u === u0 ? [u - 1, v] : [u + 1, v];
    put(p, out[0], out[1], { h: floor });
  }
}

/** A lake with islands, joined by causeways a level lower than the islands: you climb a step to reach each. */
function islands(p: Plan): void {
  const { b, rng } = p;
  const sea = fluidOf(p.area);
  for (let v = p.m0; v <= p.m1; v++) for (let u = 0; u < b.w; u++) put(p, u, v, { h: 0, ground: sea });
  const top = 2;
  const low = 1;
  const rows = p.m1 - p.m0 + 1;
  // two big islands, one against each end of the middle ground, offset across, with a causeway between them
  const wA = rng.int(3, Math.max(3, Math.min(4, b.w - 4)));
  const uA = rng.int(0, b.w - wA - 2);
  const wB = rng.int(3, Math.max(3, Math.min(4, b.w - 4)));
  const uB = rng.int(Math.max(0, uA - 1), Math.min(b.w - wB, uA + wA - 1));
  const hA = Math.max(1, Math.floor((rows - 1) / 2));
  const clear = (u: number, v: number, h: number) => put(p, u, v, { h });
  for (let v = p.m0; v < p.m0 + hA; v++) for (let u = uA; u < uA + wA; u++) clear(u, v, top);
  for (let v = p.m1 - hA + 1; v <= p.m1; v++) for (let u = uB; u < uB + wB; u++) clear(u, v, top);
  // the causeway: between the islands, a column both share (the nearest if they do not overlap)
  const lo = Math.max(uA, uB);
  const hi = Math.min(uA + wA - 1, uB + wB - 1);
  const cu = lo <= hi ? rng.int(lo, hi) : Math.round((uA + wA / 2 + uB + wB / 2) / 2 - 0.5);
  for (let v = p.m0 + hA; v <= p.m1 - hA; v++) clear(Math.max(0, Math.min(b.w - 1, cu)), v, low);
  // a second link from each end to its shore, off to the side, as a short spit of low ground
  const spit = rng.chance(0.6);
  if (spit) {
    const su = rng.chance(0.5) ? Math.max(0, uA - 1) : Math.min(b.w - 1, uA + wA);
    for (let v = p.m0; v < p.m0 + Math.max(1, hA - 1); v++) clear(su, v, low);
    const tu = rng.chance(0.5) ? Math.max(0, uB - 1) : Math.min(b.w - 1, uB + wB);
    for (let v = p.m1; v > p.m1 - Math.max(1, hA - 1); v--) clear(tu, v, low);
  }
  // (a few stepping stones of the sea's rim: shallows at the shores)
  for (const v of [p.m0, p.m1]) {
    for (let u = 0; u < b.w; u++) {
      const t = tileAt(b, u, v);
      if (t?.ground === sea && sea === 'deep' && rng.chance(0.25)) {
        t.ground = 'water';
        t.h = low;
      }
    }
  }
}

/** A raised ring round a pit, with steps down into it on one or two sides. */
function ring(p: Plan): void {
  const { b, rng } = p;
  const pw = rng.chance(0.5) ? 2 : 3;
  const ph = rng.chance(0.5) ? 2 : 1;
  const pu = Math.floor((b.w - pw) / 2);
  const pv = Math.floor((p.m0 + p.m1 - ph + 1) / 2);
  const rim = rng.int(3, 4);
  const floor = LAVA_LANDS.includes(p.area) ? ({ ground: 'lava' } as Partial<Tile>) : {};
  const spots = [
    [rng.int(pu, pu + pw - 1), pv - 1],
    [rng.int(pu, pu + pw - 1), pv + ph],
    [pu - 1, rng.int(pv, pv + ph - 1)],
    [pu + pw, rng.int(pv, pv + ph - 1)],
  ];
  const steps = new Set<number>([rng.int(0, 3)]);
  if (rng.chance(0.6)) steps.add(rng.int(0, 3));
  for (let v = pv - 1 - rim; v <= pv + ph + rim; v++)
    for (let u = pu - 1 - rim; u <= pu + pw + rim; u++) {
      if (!tileAt(b, u, v)) continue;
      const du = u < pu ? pu - u : u >= pu + pw ? u - (pu + pw - 1) : 0;
      const dv = v < pv ? pv - v : v >= pv + ph ? v - (pv + ph - 1) : 0;
      const dist = Math.max(du, dv);
      if (dist === 0) put(p, u, v, { h: 0, ...floor });
      else {
        const h = rim - (dist - 1);
        if (h >= 1) put(p, u, v, { h });
      }
    }
  // the steps: the ring tile next to the pit is 1, the one outside it 2, and so up to the rim
  for (const k of steps) {
    const [su, sv] = spots[k];
    const outward = k === 0 ? [0, -1] : k === 1 ? [0, 1] : k === 2 ? [-1, 0] : [1, 0];
    put(p, su, sv, { h: 1 });
    put(p, su + outward[0], sv + outward[1], { h: 2 });
  }
}

/** Two plateaus split by a ravine with one stone bridge across it. */
function plateaus(p: Plan): void {
  const { b, rng } = p;
  const gap = rng.chance(0.5) ? 2 : 3;
  const left = Math.floor((b.w - gap) / 2) + rng.int(-1, 0);
  const rows = p.m1 - p.m0 + 3;
  const top = Math.min(rng.int(3, 4), Math.floor((rows + 1) / 2));
  // (the bridge crosses where the plateaus are flat on top, so both its ends are level with them)
  const bridgeRow = p.m0 - 1 + rng.int(top - 1, rows - top);
  for (let i = 0; i < rows; i++) {
    const v = p.m0 - 1 + i;
    // (the plateaus slope up to their tops at both ends, like the ridges of the pass)
    const h = clampH(Math.min(top, 1 + Math.min(i, rows - 1 - i)));
    for (let u = 0; u < b.w; u++) {
      if (u >= left && u < left + gap) {
        const bridge = v === bridgeRow;
        put(p, u, v, bridge ? { h: top, bridge: true } : { h: 0, ...(rng.chance(0.4) && !LAVA_LANDS.includes(p.area) ? { ground: 'water' as Ground } : {}) });
      } else put(p, u, v, { h });
    }
  }
  // (the bridge's two ends are as high as the plateaus' tops: the plateaus are flat there)
  for (const u of [left - 1, left + gap]) put(p, u, bridgeRow, { h: top });
}

/** Low, level ground. */
function plain(p: Plan): void {
  const { b } = p;
  for (let v = 0; v < b.d; v++) for (let u = 0; u < b.w; u++) put(p, u, v, { h: b.tiles[idx(p, u, v)].h >= 3 ? 1 : Math.min(1, b.tiles[idx(p, u, v)].h) });
}

const TEMPLATES: Partial<Record<(typeof LAYOUT_IDS)[number], (p: Plan) => void>> = { plain, river, hill, pass, fort, islands, ring, plateaus };

/** Lay a template on the board (its land already rolled and eased to a ramp). Returns whether it took: if not, the board is left as it was. */
export function applyLayout(b: Board, id: LayoutId): boolean {
  const template = TEMPLATES[id as (typeof LAYOUT_IDS)[number]] ?? ZONE_TEMPLATES[id as ZoneId];
  if (!template) return false;
  const before = b.tiles.map((t) => ({ ...t }));
  for (let attempt = 0; attempt < 5; attempt++) {
    b.tiles = before.map((t) => ({ ...t }));
    const p: Plan = { b, rng: new Rng(mixSeed(b.seed, 0x1a71, attempt)), area: b.area, pinned: new Set(), m0: DEPLOY_ROWS, m1: b.d - 1 - DEPLOY_ROWS, props: [] };
    template(p);
    easeAround(b, p.pinned);
    if (fit(b)) {
      // (a Calamity zone's things on its tiles: the tiles they stand on are the zone's own, so they are kept with it)
      if (p.props.length) b.props = p.props;
      return true;
    }
  }
  b.tiles = before;
  return false;
}
