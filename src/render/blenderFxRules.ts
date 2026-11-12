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
  /** A staged effect's scenes, in order (the library's names: what the effect is made of). */
  sc?: string[];
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

/* ------------------------------------------------------------------ the ground loops */

/** An element's ground loop (`ground-<element>`): one tile of ground taken by the element, laid on every tile of a marked patch
 *  (`alivePatch`: an area's warning, a spell's tiles, an aura, a Mythic's diamond). Undefined for an element the pipeline has not made. */
export const groundBfx = (el: string): string | undefined => (BFX_CLIPS[`ground-${el}`] ? `ground-${el}` : undefined);

/** Burning ground's loop (the fire a skill leaves on a 3x3): a tile of tall flames. */
export const ZONE_BFX = 'zone-fire';

/* ------------------------------------------------------------------ the ultimates */

/** An ultimate's three stages (`ultStageRules.ts`). */
export type UltStageName = 'windup' | 'strike' | 'aftermath';

/** The sheet a hero kind's ultimate plays in a stage. Its strike is its own (`ult-<kind>-strike`); its wind-up is by its weight and its
 *  element's palette (`ultwind-<weight>-<palette>`), its aftermath by the palette (`ultafter-<palette>`); the palette is its strike's.
 *  `weight` is `ultWeight(kind)`. Undefined for a kind the pipeline has not made. */
export function ultBfx(kind: string, stage: UltStageName, weight: string): string | undefined {
  const strike = BFX_CLIPS[`ult-${kind}-strike`];
  if (!strike) return undefined;
  // (a hero whose turn has come has its own wind-up and aftermath, `ult-<kind>-windup` and `-aftermath`; the rest share one by weight and
  // element, and one by element, until theirs are made)
  if (BFX_CLIPS[`ult-${kind}-${stage}`]) return `ult-${kind}-${stage}`;
  const key = stage === 'windup' ? `ultwind-${weight}-${strike.el}` : `ultafter-${strike.el}`;
  return BFX_CLIPS[key] ? key : undefined;
}

/* ------------------------------------------------------------------ the showcase's beats */

/** The clips a showcase's beats are made of (`Fx.showBeat`): most in each of the game's elements (`beat-<clip>-<element>`), the last four
 *  one element's only (`beat-<clip>`: a bolt, a tongue of flame, a spire of rock, the ground heaving). */
export type BeatClip = 'puff' | 'appear' | 'cut' | 'blow' | 'dust' | 'link' | 'crash' | 'cloud' | 'snare' | 'smite' | 'nova' | 'call' | 'ring' | 'gather' | 'mark' | 'sky' | 'bolt' | 'flame' | 'rise' | 'tunnel';
const BEAT_ONLY: readonly BeatClip[] = ['bolt', 'flame', 'rise', 'tunnel'];

/** A beat's clip in an element. Undefined for one the pipeline has not made. */
export function beatBfx(clip: BeatClip, el: string): string | undefined {
  const key = BEAT_ONLY.includes(clip) ? `beat-${clip}` : `beat-${clip}-${el}`;
  return BFX_CLIPS[key] ? key : undefined;
}

/** Every clip a showcase in `el` may play: its element's, and the four that are one element's only. Asked for as a fight begins
 *  (`warmBfx`), so they are there when the ultimate is fired. */
export const beatKeys = (el: string): string[] => Object.keys(BFX_CLIPS).filter((k) => k.startsWith('beat-') && (k.endsWith(`-${el}`) || k.split('-').length === 2));

/** A line of a showcase (a dash's dust, a hook's reach, a blessing's ribbon) is a row of small clips along it, one every `BEAT_LINE.STEP`
 *  world px (two at least, `MAX` at most), each `LAG` ms after the one before: the points, with the far end last. */
export const BEAT_LINE = { STEP: 26, MAX: 9, LAG: 30 } as const;
export function beatLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const n = Math.max(2, Math.min(BEAT_LINE.MAX, Math.round(Math.hypot(x1 - x0, y1 - y0) / BEAT_LINE.STEP)));
  return Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n] as [number, number]);
}

/** Where a sheet on the moment's layer is put so the middle of its tile is at (x, y): the layer's bits are held by their own middle, so
 *  this is the frame's middle, `mult` times its size. */
export function bfxCentre(c: BfxClip, x: number, y: number, mult = 1): [number, number] {
  const s = BFX_SCALE * mult;
  return [x + (c.w / 2 - c.ax) * s, y + (c.h / 2 - c.ay) * s];
}

/** How large a further burst of a flurry or a storm is drawn beside the one great strike, the most spots a further burst or an aftermath
 *  is drawn on (and on the battery saver), how strong an aftermath is drawn (it lies over those it struck, so they must show through), and how far
 *  the moment's dim is lifted round a wind-up or a strike, of the sheet's longer side (the dim fades back in over the outer half of that, so the sheet's heart is fully clear and its rim nearly so). */
export const ULT_BFX = { ECHO: 0.4, SPOTS: 5, SPOTS_SAVER: 2, AFTER_ALPHA: 0.7, LIGHT: 1 } as const;

/** FREEZE-FIX (docs/notes/freeze-fix.md): the ultimates' atlases a fight no longer needs are let go as the next one begins, so the
 *  graphics memory holds a few fights' worth and not every hero ever fielded. Of the atlases `held`, those to let go: not one every
 *  fight needs (`core`), not wanted by the fight beginning (`now`), and not by the one before it (`before`: its last effects may
 *  still be on the board). */
export function bfxDrop(held: readonly number[], now: ReadonlySet<number>, before: ReadonlySet<number>, core: readonly number[]): number[] {
  return held.filter((a) => !core.includes(a) && !now.has(a) && !before.has(a));
}
