// The Eidolons' strikes, made bigger (EIDOLON-FX, docs/notes/eidolon-fx.md). The owner: "Make sure the effects are good for the Eidolons
// and powerful. Redraw effects if needed." The call's strike (`eidolonCall.ts`) was drawn with the 32 px pack strips blown up two or three
// times, one small burst a foe; now it is layered from the game's own painted spell sheets (cut to `src/art/eidolons/fx/` by
// `tools/eidolon-fx/cut_fx.py`) and one generated impact ring:
//
// - **the charge** (the build-up): the element gathers into a ring closing on the foes' middle, the screen darkening round it;
// - **the blow** (on the strike, with the hit-stop): a white flash and a bloom of the element's light, the shockwave ring along the ground,
//   one huge burst on the foes' middle, and the Eidolon's own pillar over each foe (a wall of fire, spears of ice, a lance of light, a bolt,
//   stone spires, black fire), each a beat after the last; debris flung out of each; the board shaken as the freeze lets go;
// - **the aftershocks**: secondary bursts across the foes' half of the board, one after another;
// - **the aftermath**: the element left burning, standing or glowing on their ground, fading as the fight runs again.
//
// Pure: no DOM, no Pixi, so the tests read it. The rules and numbers of the strike (`sim/eidolons.ts`) are untouched.

import type { Sprite } from './eidolonPass';

/** One of the effect strips: `n` frames of `FX_CELL` px in a row (`sheet` names `src/art/eidolons/fx/<sheet>.webp`), drawn `scale` times
 *  over `ms`, standing on its point (`foot`) or centred on it; `loop` plays on (the aftermath). */
export interface FxStrip {
  sheet: string;
  n: number;
  scale: number;
  ms: number;
  foot: boolean;
  loop?: boolean;
  /** The frame held still with reduced motion (its brightest). */
  hold: number;
}

/** The painted strips' cell (px). */
export const FX_CELL = 160;
/** The generated impact ring (`impact-ring.png`: 8 frames of 200 x 194 px, its middle 54 px from the top). */
export const RING = { sheet: 'impact-ring', fw: 200, fh: 194, n: 8, mid: 54, ms: 640, hold: 4 } as const;

/** One Eidolon's strike. */
export interface StrikeLook {
  /** What rises over each foe struck. */
  pillar: FxStrip;
  /** The one huge burst on the foes' middle. */
  burst: FxStrip;
  /** The aftershocks' secondary bursts across the foes' half. */
  extra: FxStrip;
  /** What lingers on their ground. */
  after: FxStrip;
  /** A shaft from the top of the screen down onto each foe (the light falling from the sky, the bolt), drawn with the pillar. */
  sky: 'beam' | 'bolt' | null;
  /** The pack strip flung out of each blow as debris (embers, ice, sparks, stones, smoke). */
  debris: Sprite;
  /** The impact ring's tint (a CSS filter: the generated ring is white and pale gold). */
  ring: string;
  /** The bloom's colour on the blow. */
  bloom: string;
  /** What makes this Eidolon's blow its own (EIDOLON-FX unique pass): the timing, the order and the extra layers. */
  sig: Signature;
}

/** How the pillars roll over the foes: from the Eidolon's mouth outward along the rows, from the middle outward, one by one left to right,
 *  as a chain hopping foe to foe, all at once, or drawn in towards the middle. */
export type Order = 'mouth' | 'outward' | 'ltr' | 'chain' | 'together' | 'inward';
/** The extra layers only one Eidolon has. */
export type Special = 'wave' | 'frost' | 'dome' | 'arc' | 'fault' | 'void';
/** Where the aftershock bursts fall: along the foes' rows in a wave, outward from the middle, down from the sky, at random jumps, along the
 *  fault, or in towards the middle. */
export type Spread = 'wave' | 'radial' | 'rain' | 'jump' | 'fault' | 'implode';

/** One Eidolon's signature: all timings in ms after the blow (scaled for the short call). */
export interface Signature {
  special: Special;
  order: Order;
  /** Between one pillar and the next. */
  stagger: number;
  /** The great burst starts this long after the blow (negative: already blazing in the hit-stop). */
  burstAt: number;
  spread: Spread;
  /** First aftershock, and the gap between them. */
  extraAt: number;
  extraGap: number;
  /** The hard flash: its strength (0: none) and colour (null: white). */
  flash: number;
  flashTint: string | null;
  /** The bloom's strength (0: none) and whether it is plain light (`normal`) rather than additive. */
  bloom: number;
  bloomSoft: boolean;
  /** The shockwave ring's strength (0: none). */
  shock: number;
  /** The charge: a closing ring, nothing, a violet-black void, or creeping frost. */
  charge: 'ring' | 'none' | 'void' | 'frost';
  /** How much more the screen darkens on the blow (0..1), and for how long. */
  dim: number;
  /** The shake: its strength and length. */
  shake: { amp: number; ms: number };
  /** Pillars drawn with this blend (`screen` glows, `normal` is solid rock or shadow). */
  solid: boolean;
}

const s = (sheet: string, n: number, scale: number, ms: number, foot: boolean, hold: number, loop = false): FxStrip => ({ sheet, n, scale, ms, foot, hold, ...(loop ? { loop } : {}) });

export const STRIKE_FX: Readonly<Record<string, StrikeLook>> = {
  // a wall of fire roaring up round each foe, one firestorm on their middle, embers flung out, the ground left burning
  askel: { pillar: s('askel-pillar', 12, 1.7, 1150, true, 5), burst: s('fire-burst', 6, 2.9, 620, false, 3), extra: s('fire-burst', 6, 1.5, 560, false, 3), after: s('askel-after', 6, 0.9, 520, true, 2, true), sky: null, debris: 'embers', ring: 'sepia(1) saturate(6) hue-rotate(-12deg) brightness(1.15)', bloom: '#ff7a1e', sig: { special: 'wave', order: 'mouth', stagger: 85, burstAt: 420, spread: 'wave', extraAt: 60, extraGap: 55, flash: 0.55, flashTint: '#ffb050', bloom: 0.8, bloomSoft: false, shock: 0.5, charge: 'ring', dim: 0, shake: { amp: 0.8, ms: 520 }, solid: false } },
  // spears of ice bursting up under each foe and shattering, a frost nova on their middle, the ice left standing
  nivra: { pillar: s('nivra-pillar', 12, 1.55, 1150, true, 5), burst: s('ice-burst', 6, 2.9, 620, false, 3), extra: s('ice-burst', 6, 1.5, 560, false, 3), after: s('nivra-after', 6, 0.75, 700, true, 0, true), sky: null, debris: 'iceGlint', ring: 'sepia(1) saturate(4) hue-rotate(160deg) brightness(1.2)', bloom: '#8fdcff', sig: { special: 'frost', order: 'outward', stagger: 150, burstAt: 640, spread: 'radial', extraAt: 700, extraGap: 70, flash: 0, flashTint: null, bloom: 0.35, bloomSoft: true, shock: 0.35, charge: 'frost', dim: 0, shake: { amp: 0.45, ms: 460 }, solid: false } },
  // a lance of light falling from the sky onto each foe, a sunburst on their middle, starbursts after, a curtain of light left glowing
  aurelan: { pillar: s('aurelan-pillar', 6, 2.1, 620, true, 2), burst: s('light-burst', 6, 3, 620, false, 3), extra: s('aurelan-extra', 6, 1.6, 520, false, 0), after: s('aurelan-after', 6, 0.7, 600, true, 2, true), sky: 'beam', debris: 'sparkLight', ring: 'brightness(1.1)', bloom: '#ffe07a', sig: { special: 'dome', order: 'ltr', stagger: 170, burstAt: 760, spread: 'rain', extraAt: 100, extraGap: 150, flash: 0.35, flashTint: '#ffe7a8', bloom: 0.6, bloomSoft: true, shock: 0.3, charge: 'ring', dim: 0, shake: { amp: 0.4, ms: 420 }, solid: false } },
  // a bolt out of the sky onto each foe, a blinding discharge on their middle, sparks crackling after
  voltara: { pillar: s('voltara-pillar', 6, 2.3, 520, true, 1), burst: s('lightning-burst', 6, 3, 600, false, 3), extra: s('voltara-extra', 6, 1.8, 480, false, 1), after: s('voltara-extra', 6, 0.9, 420, false, 1, true), sky: 'bolt', debris: 'sparkLight', ring: 'sepia(1) saturate(4) hue-rotate(170deg) brightness(1.3)', bloom: '#9ad8ff', sig: { special: 'arc', order: 'chain', stagger: 48, burstAt: 330, spread: 'jump', extraAt: 120, extraGap: 62, flash: 0.5, flashTint: '#cfe9ff', bloom: 0.3, bloomSoft: false, shock: 0.35, charge: 'ring', dim: 0, shake: { amp: 0.6, ms: 360 }, solid: false } },
  // stone spires bursting up under each foe and crumbling, the ground shattering on their middle, a ring of rubble, the cracks left glowing
  gorm: { pillar: s('gorm-pillar', 12, 1.6, 1150, true, 5), burst: s('earth-burst', 6, 3, 640, false, 3), extra: s('gorm-ring', 8, 1.6, 640, false, 2), after: s('gorm-after', 6, 1.6, 600, false, 2, true), sky: null, debris: 'sand', ring: 'sepia(1) saturate(2.5) hue-rotate(-20deg) brightness(0.95)', bloom: '#ffb54a', sig: { special: 'fault', order: 'together', stagger: 0, burstAt: 520, spread: 'fault', extraAt: 450, extraGap: 160, flash: 0, flashTint: null, bloom: 0, bloomSoft: true, shock: 0.25, charge: 'none', dim: 0.1, shake: { amp: 1.6, ms: 900 }, solid: true } },
  // black fire pouring up round each foe, the void tearing open on their middle, shadow bursts after, the ground left burning violet
  vaelkhar: { pillar: s('vaelkhar-pillar', 12, 1.8, 1150, true, 5), burst: s('dark-burst', 6, 3, 640, false, 3), extra: s('vaelkhar-extra', 6, 1.8, 600, false, 3), after: s('vaelkhar-after', 6, 0.9, 520, true, 2, true), sky: null, debris: 'embers', ring: 'sepia(1) saturate(5) hue-rotate(225deg) brightness(0.9)', bloom: '#9b4dff', sig: { special: 'void', order: 'inward', stagger: 70, burstAt: 560, spread: 'implode', extraAt: 300, extraGap: 110, flash: 0, flashTint: null, bloom: 0.22, bloomSoft: true, shock: 0, charge: 'void', dim: 0.45, shake: { amp: 0.7, ms: 680 }, solid: true } },
};

/** The sheets the strikes use (for the build's check and the credits test). */
export const FX_SHEETS: readonly string[] = [...new Set(Object.values(STRIKE_FX).flatMap((l) => [l.pillar.sheet, l.burst.sheet, l.extra.sheet, l.after.sheet]))];

/** How much of the strike is drawn: the secondary bursts, the debris a foe, the foes left with a lingering aftermath. Battery saver draws
 *  less; reduced motion flings no debris. */
export function fxBudget(saver: boolean, reduced: boolean): { extras: number; debris: number; linger: number } {
  return { extras: saver ? 2 : 6, debris: reduced ? 0 : saver ? 2 : 5, linger: saver ? 3 : 8 };
}

/** Each pillar a beat after the last (ms), so the blow rolls across the foes. */
export const PILLAR_STAGGER = 55;

/** The secondary bursts after the blow: spread over the foes' half of the board (round their middle, at least `minSpan` of the screen
 *  wide, held inside it), each a little after the last. Points and the result are shares of the screen; `delay` is ms after the strike. */
export function extraSpots(foes: readonly { x: number; y: number }[], n: number, minSpan = 0.7): { x: number; y: number; delay: number }[] {
  if (n <= 0) return [];
  const pts = foes.length ? foes : [{ x: 0.5, y: 0.35 }];
  const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  // (the area: the foes' own spread, at least `minSpan` across and a fifth of the screen deep; the board's tiles are twice as wide as deep)
  const rx = Math.max(minSpan / 2, (Math.max(...xs) - Math.min(...xs)) / 2 + 0.08);
  const ry = Math.max(0.1, (Math.max(...ys) - Math.min(...ys)) / 2 + 0.04);
  const out: { x: number; y: number; delay: number }[] = [];
  for (let i = 0; i < n; i++) {
    // (round the ellipse's edge and in, by the golden angle, so they fall evenly and never in a line)
    const a = i * 2.39996 + 0.6;
    const r = 0.55 + 0.45 * ((i % 3) / 2);
    const x = Math.max(0.08, Math.min(0.92, mx + Math.cos(a) * rx * r));
    const y = Math.max(0.12, Math.min(0.78, my + Math.sin(a) * ry * r));
    out.push({ x, y, delay: 140 + i * 95 });
  }
  return out;
}

/** A point on the page (px). */
export interface Pt { x: number; y: number }

/** The order the pillars roll over the foes in (their indexes), by the Eidolon's `Order`: from its mouth outward along the rows, from the
 *  foes' middle out, left to right, hopping to the nearest foe in a chain, all at once, or the far ones first, drawn in. */
export function pillarOrder(order: Order, foes: readonly Pt[], mid: Pt, mouth: Pt | null): number[] {
  const idx = foes.map((_, i) => i);
  const d = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
  if (order === 'together') return idx;
  if (order === 'ltr') return idx.sort((a, b) => foes[a].x - foes[b].x);
  if (order === 'mouth') {
    const m = mouth ?? { x: 0, y: mid.y };
    return idx.sort((a, b) => Math.abs(foes[a].x - m.x) - Math.abs(foes[b].x - m.x));
  }
  if (order === 'outward') return idx.sort((a, b) => d(foes[a], mid) - d(foes[b], mid));
  if (order === 'inward') return idx.sort((a, b) => d(foes[b], mid) - d(foes[a], mid));
  // (chain: start at the top-left foe, then always the nearest one not yet struck)
  if (!idx.length) return idx;
  const left = new Set(idx);
  let cur = idx.reduce((a, b) => (foes[b].y + foes[b].x * 0.3 < foes[a].y + foes[a].x * 0.3 ? b : a));
  const out = [cur];
  left.delete(cur);
  while (left.size) {
    let best = -1;
    for (const i of left) if (best < 0 || d(foes[i], foes[cur]) < d(foes[best], foes[cur])) best = i;
    out.push(best);
    left.delete(best);
    cur = best;
  }
  return out;
}

/** A jagged line from `a` to `b` (px): `bends` points knocked off the straight by up to `amp` px, by a fixed pattern (the same every time). */
export function jagged(a: Pt, b: Pt, bends: number, amp: number, seed = 0): Pt[] {
  const pts: Pt[] = [a];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  for (let i = 1; i <= bends; i++) {
    const t = i / (bends + 1);
    const o = (((i * 7 + seed * 5) % 5) - 2) / 2;
    pts.push({ x: a.x + dx * t + (-dy / len) * o * amp, y: a.y + dy * t + (dx / len) * o * amp });
  }
  pts.push(b);
  return pts;
}

/** The fault line Gorm's hammer opens: from the screen's near edge to the far one through the foes' middle, a jagged crack (px). */
export function faultLine(mid: Pt, W: number, from: 'left' | 'right' = 'left'): Pt[] {
  const a = { x: from === 'left' ? -10 : W + 10, y: mid.y + 26 };
  const b = { x: from === 'left' ? W + 10 : -10, y: mid.y - 22 };
  return jagged(a, b, 9, 20, 3);
}

/** One aftershock burst: where, how long after the blow, how big (a share of the strip's size). */
export interface Shock extends Pt { delay: number; mul: number }

/** Where the aftershocks fall, by the Eidolon's `Spread`: a wave along the rows from its mouth, rings outward from the middle, rain down
 *  the screen, jumps from place to place, along the fault, or hopping in towards the middle. */
export function spreadShocks(kind: Spread, n: number, mid: Pt, W: number, H: number, sig: Pick<Signature, 'extraAt' | 'extraGap'>, mouth: Pt | null, fault?: readonly Pt[]): Shock[] {
  if (n <= 0) return [];
  const out: Shock[] = [];
  const at = (i: number) => sig.extraAt + i * sig.extraGap;
  const clampX = (x: number) => Math.max(W * 0.06, Math.min(W * 0.94, x));
  if (kind === 'wave') {
    // (a line of fire racing across the foes' rows, from the side the breath came from)
    const right = (mouth?.x ?? 0) < W / 2;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1);
      out.push({ x: clampX(W * (right ? 0.08 + 0.84 * t : 0.92 - 0.84 * t)), y: mid.y + (i % 2 ? -1 : 1) * H * 0.03, delay: at(i), mul: 0.95 + (i % 3) * 0.1 });
    }
  } else if (kind === 'radial') {
    // (rings of shards flung outward from the middle)
    for (let i = 0; i < n; i++) {
      const ring = 1 + Math.floor(i / 4);
      const a = (i % 4) * (Math.PI / 2) + ring * 0.7;
      out.push({ x: clampX(mid.x + Math.cos(a) * W * 0.17 * ring), y: mid.y + Math.sin(a) * H * 0.07 * ring, delay: at(Math.floor(i / 2)), mul: 0.9 + ring * 0.1 });
    }
  } else if (kind === 'rain') {
    // (smites falling one after another down the foes' half)
    for (let i = 0; i < n; i++) out.push({ x: clampX(W * (0.14 + 0.72 * ((i * 0.618) % 1))), y: mid.y + (((i * 37) % 5) - 2) * H * 0.04, delay: at(i), mul: 0.9 + (i % 2) * 0.2 });
  } else if (kind === 'jump') {
    // (quick jumps from place to place, never next door)
    for (let i = 0; i < n; i++) out.push({ x: clampX(W * (0.1 + 0.8 * ((i * 0.381 + (i % 2) * 0.5) % 1))), y: mid.y + (((i * 53) % 7) - 3) * H * 0.035, delay: at(i), mul: 0.8 + (i % 3) * 0.12 });
  } else if (kind === 'fault') {
    // (rock bursting along the crack, from its near end to its far one)
    const line = fault && fault.length ? fault : [{ x: 0, y: mid.y }, { x: W, y: mid.y }];
    for (let i = 0; i < n; i++) {
      const p = line[Math.min(line.length - 1, Math.round(((i + 0.5) / n) * (line.length - 1)))];
      out.push({ x: clampX(p.x), y: p.y - 8, delay: at(i), mul: 1.1 });
    }
  } else {
    // (implode: from the far edges in towards the middle, each nearer than the last)
    for (let i = 0; i < n; i++) {
      const t = 1 - i / n;
      const a = i * 2.39996;
      out.push({ x: clampX(mid.x + Math.cos(a) * W * 0.42 * t), y: mid.y + Math.sin(a) * H * 0.14 * t, delay: at(i), mul: 0.7 + (1 - t) * 0.5 });
    }
  }
  return out;
}
