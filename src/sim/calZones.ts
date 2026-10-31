// The Calamity's battle zones (the owner's ask: "Make the battle zones for Calamity much more interesting, more varied, with objects and
// moving parts. Make it feel alive and real."). Six shapes of the Calamity's own, laid on the inner field of a portal court through the
// ordinary layout machinery (`applyLayout` in layouts.ts, checked by `fit`: every tile walkable by a fighter who climbs one level, the
// deploy rows clear): a fallen cathedral nave with its colonnades, a crystal cavern split by chasms, the crypt's rows of coffins, a
// broken bridge over the void, a ritual circle of standing stones, and a flooded vault. Each is a real shape of heights, cover and
// narrows, made only of the terrain the rules already know (walls, boulders, deep ground, shallows, a shrine); and each stands its
// things on its tiles (`Board.props`: pillars, statues, braziers, coffins, crystals, chains, banners, bones...), which are looks only.
// Which zone a fight is on is picked by its seed, leaning by the portal's world and the Calamity's land (`zoneFor`), on a side stream
// of its own (`0xca120e`), so nothing else in a fight moves with it. Pure: no Pixi, no DOM, no clock.

import { tileAt } from './board';
import { clampH, prop, put, spread, type Plan } from './layoutKit';
import { mixSeed, Rng } from './rng';
import type { RiftWorld } from './sanctuary';

export const ZONE_IDS = ['nave', 'cavern', 'crypt', 'voidBridge', 'ritual', 'floodVault'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

/** What each zone is called, and what it is like to fight in. */
export const ZONE_INFO: Record<ZoneId, { name: string; text: string }> = {
  nave: { name: 'The fallen nave', text: 'Two rows of pillars down a ruined cathedral, a raised crossing in the middle. The pillars stop shots; the gaps between them are the way across.' },
  cavern: { name: 'The crystal chasm', text: 'A cavern split by a chasm, crossed on two necks of rock. Crystal clusters give cover; only fliers cross the drop.' },
  crypt: { name: 'The crypt rows', text: 'Rows of stone coffins across a sunken crypt, a ledge along each wall. The coffins stop low shots and break up a charge.' },
  voidBridge: { name: 'The broken bridge', text: 'A stone bridge over the void, broken to one tile at its middle, and a narrow plank way beside it. Hold the narrows.' },
  ritual: { name: 'The ritual circle', text: 'A sunken circle ringed by standing stones and braziers. The way in is between the stones.' },
  floodVault: { name: 'The flooded vault', text: 'A vault awash with shallow water that slows every step, deep cisterns, and two dry platforms to fight for.' },
};

/** The zone a world leans to (the plain shapes of `layouts.ts` turn up now and then too, so the Calamity still meets a fort or a ring). */
type Pick = ZoneId | 'fort' | 'ring' | 'plateaus' | 'pass' | 'islands';
const ODDS: Record<RiftWorld, Partial<Record<Pick, number>>> = {
  ashen: { nave: 2, voidBridge: 2.5, ritual: 1.5, cavern: 1.5, crypt: 0.5, ring: 0.8, fort: 0.8 },
  rootbound: { nave: 2.5, floodVault: 2.5, ritual: 2, crypt: 0.8, cavern: 0.6, plateaus: 0.8 },
  caravan: { ritual: 2, floodVault: 2, crypt: 1.5, nave: 1.2, voidBridge: 0.8, pass: 1 },
  prism: { cavern: 3, nave: 2, voidBridge: 1.5, ritual: 1.2, floodVault: 0.6, islands: 0.6 },
  hollow: { crypt: 3, ritual: 2, nave: 1.5, floodVault: 1, voidBridge: 0.6, fort: 0.6 },
  frost: { cavern: 2.5, voidBridge: 2, nave: 1.5, crypt: 1, ritual: 1, ring: 0.6 },
};
/** How each of the Calamity's three lands (The Buried Sanctum, The Forsaken Vaults, The Calamity's Heart) leans on top of the world's odds. */
const LAND_LEAN: readonly Partial<Record<Pick, number>>[] = [
  { nave: 1.4, crypt: 1.4 },
  { floodVault: 1.5, crypt: 1.3, cavern: 1.3 },
  { voidBridge: 1.7, ritual: 1.6, cavern: 1.2 },
];

/** The zone a portal fight is laid in: by its seed, the world and the land (act 1, 2 or 3). The same seed always picks the same. */
export function zoneFor(seed: number, world: RiftWorld, act = 1): Pick {
  const lean = LAND_LEAN[(Math.max(1, act) - 1) % LAND_LEAN.length];
  const odds = Object.fromEntries(Object.entries(ODDS[world]).map(([k, w]) => [k, (w as number) * (lean[k as Pick] ?? 1)])) as Record<Pick, number>;
  return new Rng(mixSeed(seed, 0xca120e)).weighted(odds);
}

const mid = (p: Plan): number => Math.floor((p.m0 + p.m1) / 2);
const inside = (p: Plan, u: number, v: number): boolean => !!tileAt(p.b, u, v);
/** The void: deep ground, drawn as a drop into nothing. */
const VOID = { h: 0, ground: 'deep' as const, chasm: true };

// ---- the zones -------------------------------------------------------------------------------------------------------

/** A fallen cathedral nave: a colonnade down each side (some pillars fallen to rubble), braziers at its ends, the side aisles a step
 *  lower, and a raised crossing in the middle with a dais two steps up. */
function nave(p: Plan): void {
  const { b, rng } = p;
  const L = rng.int(1, 2);
  const cl = Math.max(1, Math.floor(b.w * 0.2));
  const cr = b.w - 1 - cl;
  const cv = mid(p);
  const du = Math.floor((b.w - 2) / 2);
  for (let v = p.m0 - 1; v <= p.m1 + 1; v++)
    for (let u = 0; u < b.w; u++) {
      const aisle = u < cl || u > cr;
      // (the crossing: a ring a step up round a dais two steps up)
      const ring = u > cl && u < cr && Math.abs(v - cv) <= 2 && v >= p.m0 && v <= p.m1;
      const dais = ring && u >= du && u <= du + 1 && Math.abs(v - cv) <= 1;
      put(p, u, v, { h: aisle ? L - 1 : dais ? L + 2 : ring ? L + 1 : L });
    }
  let banner = rng.chance(0.5);
  for (let v = p.m0; v <= p.m1; v++)
    for (const u of [cl, cr]) {
      const k = v - p.m0;
      if (v === p.m0 || v === p.m1) {
        put(p, u, v, { h: L, rock: true });
        prop(p, u, v, 'brazier');
      } else if (k % 2 === 1) {
        if (rng.chance(0.22)) {
          put(p, u, v, { h: L, rock: true });
          prop(p, u, v, 'brokenPillar');
        } else {
          put(p, u, v, { h: L, wall: true });
          prop(p, u, v, 'pillar');
          if ((banner = !banner)) prop(p, u, v, 'banner');
        }
      } else if (rng.chance(0.3)) prop(p, u, v, 'rubble');
    }
  // (statues in the side aisles, and the dais's candles and rune)
  for (const u of [0, b.w - 1]) if (cl >= 2 && rng.chance(0.75)) {
    const sv = cv + rng.int(-1, 1);
    put(p, u, sv, { h: Math.max(0, L - 1), rock: true });
    prop(p, u, sv, 'statue');
  }
  prop(p, du, cv - 1, 'candles');
  prop(p, du + 1, cv + 1, 'candles');
  prop(p, du + rng.int(0, 1), cv, 'rune');
  for (let n = 0; n < 3; n++) prop(p, rng.chance(0.5) ? rng.int(0, cl - 1) : rng.int(cr + 1, b.w - 1), rng.int(p.m0, p.m1), rng.chance(0.5) ? 'bones' : 'rubble');
}

/** A crystal cavern: a chasm right across the middle, one or two tiles wide, crossed on two necks of rock; a pit or two of it besides,
 *  and crystal clusters standing about for cover. */
function cavern(p: Plan): void {
  const { b, rng } = p;
  const L = rng.int(1, 2);
  const rv = mid(p) + rng.int(-1, 0);
  const cross = spread(rng, 1, b.w - 2, 2, 4);
  if (cross.length < 2) cross.push(cross[0] < b.w / 2 ? b.w - 2 : 1);
  const chasm = new Set<number>();
  for (let u = 0; u < b.w; u++) {
    const top = rv + (rng.chance(0.3) ? 1 : 0);
    const bottom = rv + (rng.chance(0.45) ? 1 : 0);
    const lo = Math.min(top, bottom);
    const hi = Math.max(top, bottom);
    put(p, u, lo - 1, { h: L });
    put(p, u, hi + 1, { h: L });
    for (let v = lo; v <= hi; v++) {
      if (cross.includes(u)) put(p, u, v, { h: L });
      else {
        put(p, u, v, VOID);
        chasm.add(v * b.w + u);
      }
    }
  }
  // (a pit or two of the chasm elsewhere in the middle ground, clear of the crossings)
  for (let n = rng.int(1, 2); n > 0; n--) {
    const u = rng.int(0, b.w - 2);
    const v = rng.chance(0.5) ? rng.int(p.m0, rv - 3) : rng.int(rv + 3, p.m1);
    if (v < p.m0 || v > p.m1 || cross.some((c) => Math.abs(c - u) <= 1)) continue;
    for (const [pu, pv] of rng.chance(0.5) ? [[u, v], [u + 1, v]] : [[u, v]]) {
      put(p, pu, pv, VOID);
      chasm.add(pv * b.w + pu);
    }
  }
  // crystal clusters (boulders to the rules), away from the crossings and the chasm's edge
  const near = (u: number, v: number) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([du, dv]) => chasm.has((v + dv) * b.w + u + du));
  let placed = 0;
  for (let tries = 0; tries < 30 && placed < 4; tries++) {
    const u = rng.int(0, b.w - 1);
    const v = rng.int(p.m0, p.m1);
    if (cross.some((c) => Math.abs(c - u) <= 1) || near(u, v) || p.props.some((x) => Math.abs(x.u - u) + Math.abs(x.v - v) < 3)) continue;
    put(p, u, v, { h: clampH(tileAt(b, u, v)!.h), rock: true });
    prop(p, u, v, 'crystal');
    placed++;
  }
  for (let n = 0; n < 4; n++) {
    const u = rng.int(0, b.w - 1);
    const v = rng.int(p.m0 - 1, p.m1 + 1);
    if (!chasm.has(v * b.w + u) && !p.props.some((x) => x.u === u && x.v === v)) prop(p, u, v, 'shards');
  }
}

/** The crypt: rows of stone coffins across a sunken floor, the lanes between them strewn with bones, a ledge a step up along each
 *  wall, and a brazier or a skull totem at the ledges' ends. */
function crypt(p: Plan): void {
  const { b, rng } = p;
  const L = rng.int(0, 1);
  for (let v = p.m0 - 1; v <= p.m1 + 1; v++) for (let u = 0; u < b.w; u++) put(p, u, v, { h: u === 0 || u === b.w - 1 ? L + 1 : L });
  const shift = rng.int(0, 1) * 2;
  let row = 0;
  for (let v = p.m0 + 1; v <= p.m1 - 1; v += 2, row++) {
    const off = (row * 2 + shift) % 4;
    for (let s = 1 + off; s + 1 <= b.w - 2; s += 4)
      for (const u of [s, s + 1]) {
        if (rng.chance(0.15)) {
          // (a coffin broken open: rubble and bones on open ground)
          prop(p, u, v, rng.chance(0.5) ? 'rubble' : 'skeleton');
          continue;
        }
        put(p, u, v, { h: L, rock: true });
        prop(p, u, v, 'coffin');
      }
  }
  // (bones and candles in the lanes)
  for (let n = 0; n < 5; n++) {
    const u = rng.int(1, b.w - 2);
    const v = p.m0 + 2 * rng.int(0, Math.floor((p.m1 - p.m0) / 2));
    if (!p.props.some((x) => x.u === u && x.v === v)) prop(p, u, v, n % 2 ? 'candles' : 'bones');
  }
  const ends: [number, number][] = [[0, p.m0], [b.w - 1, p.m1]];
  if (rng.chance(0.5)) ends.reverse();
  put(p, ends[0][0], ends[0][1], { h: L + 1, rock: true });
  prop(p, ends[0][0], ends[0][1], 'totem');
  put(p, ends[1][0], ends[1][1], { h: L + 1, rock: true });
  prop(p, ends[1][0], ends[1][1], 'brazier');
}

/** A broken bridge over the void: the middle ground is a drop into nothing but for a stone bridge two wide (broken to one tile at its
 *  middle) and a narrow plank way off to one side; a floating ledge beside the bridge holds a statue; pillars with hanging chains stand
 *  at the bridge's heads. */
function voidBridge(p: Plan): void {
  const { b, rng } = p;
  const L = rng.int(1, 2);
  for (let v = p.m0; v <= p.m1; v++) for (let u = 0; u < b.w; u++) put(p, u, v, v === p.m0 || v === p.m1 ? { h: L } : VOID);
  const bu = rng.int(2, b.w - 4);
  const left = bu >= b.w / 2 - 1;
  // (the plank way is on the far side of the bridge from its ledge)
  const pu = left ? rng.int(0, Math.max(0, bu - 3)) : rng.int(Math.min(b.w - 1, bu + 4), b.w - 1);
  const rb = rng.int(p.m0 + 2, p.m1 - 2);
  const broke = bu + rng.int(0, 1);
  for (let v = p.m0 + 1; v < p.m1; v++) {
    for (const u of [bu, bu + 1]) if (!(v === rb && u === broke)) put(p, u, v, { h: L });
    put(p, pu, v, { h: L, bridge: true });
  }
  prop(p, broke === bu ? bu + 1 : bu, rb, 'rubble');
  // (the floating ledge: two by two a step up, off the bridge's other side from the plank way)
  const lu = left ? bu + 2 : bu - 1;
  const lv = mid(p) + (rb <= mid(p) ? 0 : -1);
  for (const [du, dv] of [[0, 0], [left ? 1 : -1, 0], [0, 1], [left ? 1 : -1, 1]]) if (inside(p, lu + du, lv + dv)) put(p, lu + du, lv + dv, { h: L + 1 });
  const su = lu + (left ? 1 : -1);
  if (inside(p, su, lv)) {
    put(p, su, lv, { h: L + 1, rock: true });
    prop(p, su, lv, rng.chance(0.5) ? 'statue' : 'brazier');
  }
  // the pillars at the bridge's heads, chains hanging from them (and a banner on one, now and then)
  const heads: [number, number][] = [];
  for (const v of [p.m0, p.m1])
    for (const u of [bu - 1, bu + 2]) {
      if (!inside(p, u, v) || u === pu) continue;
      put(p, u, v, { h: L, wall: true });
      prop(p, u, v, 'pillar');
      prop(p, u, v, 'chain');
      heads.push([u, v]);
    }
  if (heads.length && rng.chance(0.6)) prop(p, ...rng.pick(heads), 'banner');
}

/** A ritual circle: a sunken disc of runes (a shrine at its heart, now and then), a ring of standing stones round it with the way in
 *  between them, and braziers outside. */
function ritual(p: Plan): void {
  const { b, rng } = p;
  const L = rng.int(1, 2);
  const cu = Math.floor((b.w - 1) / 2) + (b.w % 2 === 0 ? rng.int(0, 1) : 0);
  const cv = mid(p);
  for (let v = p.m0; v <= p.m1; v++)
    for (let u = 0; u < b.w; u++) {
      const d = Math.max(Math.abs(u - cu), Math.abs(v - cv));
      if (d <= 3) put(p, u, v, { h: d <= 1 ? L - 1 : L });
    }
  // (the heart of the circle; a shrine there now and then, which mends whoever holds it)
  if (rng.chance(0.4)) put(p, cu, cv, { h: L - 1, ground: 'shrine' });
  else prop(p, cu, cv, 'rune');
  for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) prop(p, cu + du, cv + dv, 'rune');
  // the standing stones: the four corners of the ring, two of them skull totems burning green
  const totems = rng.chance(0.5) ? [0, 3] : [1, 2];
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([du, dv], k) => {
    if (!inside(p, cu + du, cv + dv)) return;
    put(p, cu + du, cv + dv, { h: L, wall: true });
    prop(p, cu + du, cv + dv, totems.includes(k) ? 'totem' : 'statue');
  });
  if (rng.chance(0.6))
    for (const dv of [-2, 2]) {
      put(p, cu, cv + dv, { h: L, wall: true });
      prop(p, cu, cv + dv, 'pillar');
    }
  for (const du of [-3, 3]) if (inside(p, cu + du, cv)) {
    put(p, cu + du, cv, { h: L, rock: true });
    prop(p, cu + du, cv, 'brazier');
  }
  for (let n = 0; n < 3; n++) prop(p, rng.int(0, b.w - 1), rng.chance(0.5) ? p.m0 : p.m1, rng.chance(0.5) ? 'candles' : 'bones');
}

/** A flooded vault: shallow water over the whole middle ground (it slows every step), a deep cistern or two, pillars standing in the
 *  water with chains and dripping water, and two dry platforms two steps up, each with a stair down. */
function floodVault(p: Plan): void {
  const { b, rng } = p;
  for (let v = p.m0; v <= p.m1; v++) for (let u = 0; u < b.w; u++) put(p, u, v, { h: 0, ground: 'water' });
  const cv = mid(p);
  // the two platforms, one on each side, offset along the field; a stair a level down on the side facing the middle
  const sides: [number, number][] = [
    [rng.int(0, 1), cv - 1 - rng.int(0, 1)],
    [b.w - 2 - rng.int(0, 1), cv + rng.int(0, 1)],
  ];
  sides.forEach(([u0, v0], k) => {
    for (const [du, dv] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(p, u0 + du, v0 + dv, { h: 2 });
    const su = k === 0 ? u0 + 2 : u0 - 1;
    put(p, su, v0 + rng.int(0, 1), { h: 1 });
    const corner = k === 0 ? [u0, v0] : [u0 + 1, v0 + 1];
    put(p, corner[0], corner[1], { h: 2, rock: true });
    prop(p, corner[0], corner[1], k === 0 ? 'statue' : 'brazier');
  });
  // a deep cistern in the middle, one or two tiles
  const ku = Math.floor(b.w / 2) - rng.int(0, 1);
  put(p, ku, cv, { h: 0, ground: 'deep' });
  if (rng.chance(0.5)) put(p, ku + 1, cv, { h: 0, ground: 'deep' });
  // pillars standing in the water, near the field's ends
  for (const [u, v] of [[2, p.m0 + 1], [b.w - 3, p.m0 + 1], [2, p.m1 - 1], [b.w - 3, p.m1 - 1]]) {
    if (!inside(p, u, v) || tileAt(b, u, v)!.h > 0) continue;
    put(p, u, v, { h: 0, wall: true });
    prop(p, u, v, 'pillar');
    if (rng.chance(0.6)) prop(p, u, v, 'chain');
  }
  for (let n = 0; n < 4; n++) {
    const u = rng.int(0, b.w - 1);
    const v = rng.int(p.m0, p.m1);
    const t = tileAt(b, u, v);
    if (t?.ground === 'water' && !t.wall) prop(p, u, v, 'drip');
  }
}

export const ZONE_TEMPLATES: Record<ZoneId, (p: Plan) => void> = { nave, cavern, crypt, voidBridge, ritual, floodVault };

/** Whether a layout is one of the Calamity's zones. */
export const isZone = (id: string | undefined): id is ZoneId => !!id && (ZONE_IDS as readonly string[]).includes(id);

/** The props on a board that stand tall over their tile (drawn faded when a fighter is behind them). */
export const TALL_PROPS = new Set(['pillar', 'statue', 'brazier', 'crystal', 'totem', 'banner', 'chain', 'brokenPillar']);
