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
}

const s = (sheet: string, n: number, scale: number, ms: number, foot: boolean, hold: number, loop = false): FxStrip => ({ sheet, n, scale, ms, foot, hold, ...(loop ? { loop } : {}) });

export const STRIKE_FX: Readonly<Record<string, StrikeLook>> = {
  // a wall of fire roaring up round each foe, one firestorm on their middle, embers flung out, the ground left burning
  askel: { pillar: s('askel-pillar', 12, 1.7, 1150, true, 5), burst: s('fire-burst', 6, 2.9, 620, false, 3), extra: s('fire-burst', 6, 1.5, 560, false, 3), after: s('askel-after', 6, 0.9, 520, true, 2, true), sky: null, debris: 'embers', ring: 'sepia(1) saturate(6) hue-rotate(-12deg) brightness(1.15)', bloom: '#ff7a1e' },
  // spears of ice bursting up under each foe and shattering, a frost nova on their middle, the ice left standing
  nivra: { pillar: s('nivra-pillar', 12, 1.55, 1150, true, 5), burst: s('ice-burst', 6, 2.9, 620, false, 3), extra: s('ice-burst', 6, 1.5, 560, false, 3), after: s('nivra-after', 6, 0.75, 700, true, 0, true), sky: null, debris: 'iceGlint', ring: 'sepia(1) saturate(4) hue-rotate(160deg) brightness(1.2)', bloom: '#8fdcff' },
  // a lance of light falling from the sky onto each foe, a sunburst on their middle, starbursts after, a curtain of light left glowing
  aurelan: { pillar: s('aurelan-pillar', 6, 2.1, 620, true, 2), burst: s('light-burst', 6, 3, 620, false, 3), extra: s('aurelan-extra', 6, 1.6, 520, false, 0), after: s('aurelan-after', 6, 0.7, 600, true, 2, true), sky: 'beam', debris: 'sparkLight', ring: 'brightness(1.1)', bloom: '#ffe07a' },
  // a bolt out of the sky onto each foe, a blinding discharge on their middle, sparks crackling after
  voltara: { pillar: s('voltara-pillar', 6, 2.3, 520, true, 1), burst: s('lightning-burst', 6, 3, 600, false, 3), extra: s('voltara-extra', 6, 1.8, 480, false, 1), after: s('voltara-extra', 6, 0.9, 420, false, 1, true), sky: 'bolt', debris: 'sparkLight', ring: 'sepia(1) saturate(4) hue-rotate(170deg) brightness(1.3)', bloom: '#9ad8ff' },
  // stone spires bursting up under each foe and crumbling, the ground shattering on their middle, a ring of rubble, the cracks left glowing
  gorm: { pillar: s('gorm-pillar', 12, 1.6, 1150, true, 5), burst: s('earth-burst', 6, 3, 640, false, 3), extra: s('gorm-ring', 8, 1.6, 640, false, 2), after: s('gorm-after', 6, 1.6, 600, false, 2, true), sky: null, debris: 'sand', ring: 'sepia(1) saturate(2.5) hue-rotate(-20deg) brightness(0.95)', bloom: '#ffb54a' },
  // black fire pouring up round each foe, the void tearing open on their middle, shadow bursts after, the ground left burning violet
  vaelkhar: { pillar: s('vaelkhar-pillar', 12, 1.8, 1150, true, 5), burst: s('dark-burst', 6, 3, 640, false, 3), extra: s('vaelkhar-extra', 6, 1.8, 600, false, 3), after: s('vaelkhar-after', 6, 0.9, 520, true, 2, true), sky: null, debris: 'embers', ring: 'sepia(1) saturate(5) hue-rotate(225deg) brightness(0.9)', bloom: '#9b4dff' },
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
