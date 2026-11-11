// BLENDER-FX (docs/notes/blender-fx.md): the rules of the Blender-rendered, pixelated frame sheets (tools/blender-fx/), kept free of Pixi and
// the DOM so the tests can check them. The owner's call: every battle effect is to be one of these, so everything matches; the lights
// (heals, holy, lightning) keep a soft glow under their pixels. A clip is a run of frames in an atlas (`blenderFxData.ts`, written by the
// pipeline): this says which frame shows when, how big it is drawn, where it stands, and which clips each king's spell plays.

import type { SpellId } from '../sim/spells';
import { TW } from './iso';
import { BFX_CLIPS, BFX_DENSITY, BFX_GLOW_SHRINK } from './blenderFxData';

export interface BfxGlow {
  a: number;
  x: number;
  y: number;
  w: number;
  h: number;
  cols: number;
  ax: number;
  ay: number;
}

/** One effect's frames, as the pipeline packed them. */
export interface BfxClip {
  /** Which pixel atlas, and where its block of frames starts in it. */
  a: number;
  x: number;
  y: number;
  /** One frame's size, how many there are, and how many a row of the block holds. */
  w: number;
  h: number;
  n: number;
  cols: number;
  /** Where the middle of the tile it stands on sits in a frame, in the frame's own px. */
  ax: number;
  ay: number;
  /** How long one pass lasts, and whether it goes round again. */
  ms: number;
  loop: boolean;
  /** The frame that stands for it when motion is reduced. */
  hold: number;
  layer: string;
  el: string;
  /** A staged effect's stages, each its first and last frame (a wind-up, a strike, an aftermath). */
  cuts?: number[][];
  /** Its soft glow's frames (a light effect only). */
  g?: BfxGlow;
}

/** World px to one of an effect's pixels: a tile is `BFX_DENSITY` of them across, the heroes' pixel size on the board. */
export const BFX_SCALE = TW / BFX_DENSITY;
/** World px to one of a glow's pixels (the glow is kept smaller and stretched smooth). */
export const BFX_GLOW_SCALE = BFX_SCALE * BFX_GLOW_SHRINK;
/** How strong the glow under a light effect is drawn (added to what is under it). */
export const BFX_GLOW_ALPHA = 0.5;
/** The share of its glow each piece of a line keeps (the Lance's column, the Sunbeam's row): the pieces' glows overlap. */
export const BFX_LINE_GLOW = 0.35;
/** How long an effect takes to come in and to go when it is held still (reduced motion), and to go when a loop ends. */
export const BFX_FADE_MS = 140;

/** A clip by its key, when the pipeline has made it. */
export const bfxClip = (key: string): BfxClip | undefined => BFX_CLIPS[key];

/** Where frame `i` of a block lies in its atlas: [x, y, w, h]. */
export function bfxRect(c: { x: number; y: number; w: number; h: number; cols: number }, i: number): [number, number, number, number] {
  return [c.x + (i % c.cols) * c.w, c.y + Math.floor(i / c.cols) * c.h, c.w, c.h];
}

/** How long a clip is on screen when played once (a loop: one pass). `stretch` slows it (2 plays it at half speed). */
export const bfxLife = (c: BfxClip, stretch = 1): number => c.ms * stretch;

/** Which frame shows `elapsed` ms in. Reduced motion (`still`) holds the clip's one readable frame for its whole life, so nothing moves;
 *  the battery saver (`saver`) steps a loop at half its rate. A clip played once holds its last frame if it is kept longer than its life. */
export function bfxFrame(c: BfxClip, elapsed: number, still: boolean, saver = false, stretch = 1): number {
  if (still || c.n <= 1) return Math.min(c.n - 1, c.hold);
  const per = (c.ms * stretch) / c.n;
  const f = Math.floor(Math.max(0, elapsed) / per);
  if (!c.loop) return Math.min(c.n - 1, f);
  return saver ? (Math.floor(f / 2) * 2) % c.n : f % c.n;
}

/** How strong a clip played once is drawn `elapsed` ms into its `life`: full while it animates (its own frames carry its coming and going);
 *  held still, it comes in and goes over `BFX_FADE_MS`, since its one frame would otherwise pop. */
export function bfxAlpha(elapsed: number, life: number, still: boolean): number {
  if (!still) return elapsed >= 0 && elapsed < life ? 1 : 0;
  return Math.max(0, Math.min(1, elapsed / BFX_FADE_MS, (life - elapsed) / BFX_FADE_MS));
}

/** A staged clip's stage at frame `f` (0 when it has no stages): which of wind-up, strike and aftermath is showing. */
export function bfxStage(c: BfxClip, f: number): number {
  if (!c.cuts) return 0;
  let at = 0;
  c.cuts.forEach(([from], i) => {
    if (f >= from) at = i;
  });
  return at;
}

/** The box a clip covers on the board when it stands at (x, y), in world px: [left, top, right, bottom]. FX-CLEAR reads it to thin a clip
 *  that lies over a fighter. */
export function bfxBox(c: BfxClip, x: number, y: number, mult = 1): [number, number, number, number] {
  const s = BFX_SCALE * mult;
  return [x - c.ax * s, y - c.ay * s, x + (c.w - c.ax) * s, y + (c.h - c.ay) * s];
}

/** What the battery saver keeps: no glow layer, fewer of a spell's touches drawn at once, and loops at half their rate (`bfxFrame`). */
export function bfxBudget(saver: boolean): { glow: boolean; hits: number } {
  return saver ? { glow: false, hits: 3 } : { glow: true, hits: 8 };
}

/* ------------------------------------------------------------------ the king's spells */

/** The parts a king's spell can have: `cast` where it lands, `hit` on each fighter it touches, `fly` and `land` for what comes from the sky,
 *  `stand` for what stays on the ground while the spell lasts. */
export type SpellPartName = 'cast' | 'hit' | 'fly' | 'land' | 'stand';

/** A spell's part's clip key (`spell-<id>-<part>`), when the pipeline has made it. */
export const spellBfx = (id: SpellId, part: SpellPartName): string | undefined => (BFX_CLIPS[`spell-${id}-${part}`] ? `spell-${id}-${part}` : undefined);

/** How a spell's cast is laid, where it is not simply played once on the spell's own tile:
 *  - `tiles`: played on every tile the spell touches (`spellTiles`), each `step` ms after the one before, so a beam runs down its line;
 *  - `flip`: mirrored left to right, which turns a clip rendered along the board's u into one along its v (the Lance's column);
 *  - `lift`: raised over the ground, in tiles' heights (an eye that hangs over the squad). */
export const SPELL_LAY: Partial<Record<SpellId, { tiles?: true; step?: number; flip?: true }>> = {
  lance: { tiles: true, step: 45, flip: true },
  sunbeam: { tiles: true, step: 70 },
};

/** The spells whose `stand` clip is one tile's worth, laid on each tile the spell touches for as long as it lasts (a cloud, a wall). */
export const SPELL_STANDS: Partial<Record<SpellId, 'cloud' | 'wall'>> = { poison: 'cloud', firewall: 'wall', icewall: 'wall', bonewall: 'wall' };

/** A standing clip's first frame on a tile: each tile a few frames on from its neighbours, so a row of them never moves as one. */
export const standPhase = (u: number, v: number, n: number): number => (((u * 5 + v * 3) % n) + n) % n;

/** Which spell's `stand` loop each kind of the king's walls is (`WALLS` in the sim). */
export const BFX_WALL_SPELL: Partial<Record<string, SpellId>> = { fire: 'firewall', ice: 'icewall', stone: 'bonewall' };

/** What falls from the sky (the meteor, the shower's stars) flies in from here, relative to where it lands, in world px: up and to the right,
 *  the slant its sheet was rendered at; and the longest its flight takes (a later star of a shower waits, then falls as fast as the first). */
export const BFX_FLY_FROM: readonly [number, number] = [300, -333];
export const BFX_FLY_MS = 900;
