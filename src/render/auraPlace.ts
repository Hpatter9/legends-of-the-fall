// Where each piece of an awakened hero's aura sits at a moment: shared by the fight's Pixi aura (`awakenAura.ts`) and the
// canvas one the menus and scenes draw (`auraCanvas.ts`), so the two always look the same. The hero's feet are at (0, 0)
// and it is `tall` px high; the answer is written into the caller's own `AuraPose` (nothing is made per frame).
//
// Pure: no Pixi, no DOM.

import type { AuraPart } from './auraStyles';

export interface AuraPose {
  x: number;
  y: number;
  /** Scale, as a multiple of `tall / cell` (the cell: a frame's side in the atlas). */
  sx: number;
  sy: number;
  rot: number;
  alpha: number;
  /** Which frame of the part's strip. */
  frame: number;
  /** The frame's anchor: 0.5 is its middle, 1 its bottom edge. */
  ay: number;
}

export const newPose = (): AuraPose => ({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, alpha: 1, frame: 0, ay: 0.5 });

/** Lay copy `i` of a part with `frames` frames, at time `t` (ms), round a hero `tall` px high facing `dir` (1 right,
 *  -1 left). `calm` (reduced motion) holds it on one frame, still. Scales are in px per atlas cell. */
export function poseAura(part: AuraPart, i: number, frames: number, t: number, tall: number, dir: number, calm: boolean, cell: number, out: AuraPose): AuraPose {
  const n = part.count ?? 1;
  const phase = i * 397 + part.key.length * 53;
  out.frame = calm ? frames >> 1 : Math.floor((t + phase) / part.frameMs) % frames;
  const k = (part.size * tall) / cell;
  out.alpha = part.alpha;
  out.rot = 0;
  out.ay = 0.5;
  switch (part.place) {
    case 'ground': {
      // (a flat ring under the feet, its width set by the footprint rather than the height, so a giant's stays sensible)
      const w = (part.size * Math.max(26, Math.min(44, tall * 0.7))) / cell;
      out.x = 0;
      out.y = part.ring ? 0 : -1;
      out.sx = w;
      out.sy = part.ring ? w * 0.42 : w;
      break;
    }
    case 'wrap':
      out.x = 0;
      out.y = -tall * 0.45;
      out.sx = out.sy = k;
      break;
    case 'rise': {
      const w = (part.size * Math.max(26, tall * 0.8)) / cell;
      out.x = 0;
      out.y = 3;
      out.sx = w;
      out.sy = w * 1.15;
      out.ay = 1;
      break;
    }
    case 'halo':
      out.x = 0;
      out.y = -tall * 1.02 + (calm ? 0 : Math.sin(t / 420) * 1.2);
      out.sx = k;
      out.sy = k * 0.38;
      break;
    case 'orbit': {
      const a = (calm ? 0.6 : t * 0.0021) + (i * Math.PI * 2) / n;
      const r = tall * 0.42;
      const s = Math.sin(a);
      out.x = Math.cos(a) * r;
      out.y = -tall * 0.45 + s * r * 0.32;
      out.sx = out.sy = k * (s < 0 ? 0.8 : 1);
      // (behind the body, it dims, so the circle reads as going round)
      if (s < 0) out.alpha *= 0.4;
      if (part.turn) out.rot = a + Math.PI / 2;
      break;
    }
    case 'motes': {
      const side = i % 2 ? 1 : -1;
      const out1 = tall * (0.26 + (i >> 1) * 0.1);
      out.x = side * out1;
      out.y = part.low ? 2 - (i >> 1) * 3 : -tall * (0.2 + ((i * 3) % 5) * 0.14);
      out.sx = out.sy = k * (part.low && i > 1 ? 0.85 : 1);
      if (part.low) out.ay = 1;
      break;
    }
    case 'trail':
      // (speed lines streaming back from the body, the way it faces)
      out.x = -dir * tall * (0.32 + (i % 2) * 0.08);
      out.y = -tall * (0.22 + i * 0.2);
      out.sx = k * dir;
      out.sy = k;
      break;
  }
  return out;
}
