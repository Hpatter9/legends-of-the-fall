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
  /** ULT-AUDIT: where an ultimate's strike plays. Unset, once at the middle of what it struck (a great blow, a storm); `each`, on every
   *  fighter the ability touches (a heal on each friend, a mark on each foe, a flurry's cut on each foe cut); `self`, round the caster (an
   *  aura, a ward, a transformation). */
  at?: 'each' | 'friends' | 'tiles' | 'line' | 'self';
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
export type BeatClip = 'puff' | 'appear' | 'cut' | 'blow' | 'dust' | 'link' | 'crash' | 'cloud' | 'snare' | 'smite' | 'nova' | 'call' | 'ring' | 'gather' | 'mark' | 'sky' | 'bolt' | 'flame' | 'rise' | 'tunnel' | 'gaze';
const BEAT_ONLY: readonly BeatClip[] = ['bolt', 'flame', 'rise', 'tunnel', 'gaze'];

/** A beat's clip in an element. Undefined for one the pipeline has not made. */
export function beatBfx(clip: BeatClip, el: string): string | undefined {
  const key = BEAT_ONLY.includes(clip) ? `beat-${clip}` : `beat-${clip}-${el}`;
  return BFX_CLIPS[key] ? key : undefined;
}

/** Every clip a showcase in `el` may play: its element's, and the four that are one element's only. Asked for as a fight begins
 *  (`warmBfx`), so they are there when the ultimate is fired. */
export const beatKeys = (el: string): string[] => Object.keys(BFX_CLIPS).filter((k) => k.startsWith('beat-') && (k.endsWith(`-${el}`) || k.split('-').length === 2));

/** ULT-AUDIT: a hero's own showcase beats on the caster: how long its own wind-up plays again as the showcase's gathering (ms), and how
 *  large its finish's flare is drawn. */
export const BEAT_OWN = { GATHER_MS: 1800, FINISH: 0.8 } as const;

/** A line of a showcase (a dash's dust, a hook's reach, a blessing's ribbon) is a row of small clips along it, one every `BEAT_LINE.STEP`
 *  world px (two at least, `MAX` at most), each `LAG` ms after the one before: the points, with the far end last. */
export const BEAT_LINE = { STEP: 26, MAX: 9, LAG: 30 } as const;
export function beatLine(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const n = Math.max(2, Math.min(BEAT_LINE.MAX, Math.round(Math.hypot(x1 - x0, y1 - y0) / BEAT_LINE.STEP)));
  return Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * (i + 1)) / n, y0 + ((y1 - y0) * (i + 1)) / n] as [number, number]);
}

/** ULT-AUDIT: where a hero kind's strike plays (`BfxClip.at`): `one` great thing at the middle of what it struck, on `each` fighter it
 *  touches, on each of the `friends` it helps (and the caster), on each of the `tiles` it takes, or round the caster (`self`). */
export const ultPlace = (kind: string): 'one' | 'each' | 'friends' | 'tiles' | 'line' | 'self' => BFX_CLIPS[`ult-${kind}-strike`]?.at ?? 'one';

/** ULT-AUDIT: the spots a strike plays on, by where it plays, from what the cast touched: the foes it `struck`, the friends it
 *  `helped`, the `tiles` it took. `each`: the foes struck, else the tiles (what is summoned arrives on them), else the friends, else the
 *  caster. `friends`: the caster and each friend helped. `tiles`: its tiles first, then the caster and each friend (a wall's slabs along
 *  the tiles it blocks, and its shield on each friend; a wall that found no line to stand on is its shields alone). At most `cap`. */
export function ultSpots(place: 'each' | 'friends' | 'tiles' | 'line', t: { struck: readonly number[]; helped: readonly number[]; tiles: readonly { u: number; v: number }[] }, caster: number, cap: number): ({ unit: number } | { u: number; v: number })[] {
  const units = (ids: readonly number[]) => ids.map((unit) => ({ unit }));
  const tiles = t.tiles.map(({ u, v }) => ({ u, v }));
  const each = t.struck.length ? units(t.struck) : tiles.length ? tiles : t.helped.length ? units(t.helped) : [{ unit: caster }];
  const friends = units([caster, ...t.helped.filter((id) => id !== caster)]);
  // (`line`: the tiles of the line the ability takes, and nothing else; with none, the foes struck)
  const got = place === 'friends' ? friends : place === 'tiles' ? [...tiles, ...friends] : place === 'line' ? (tiles.length ? tiles : each) : each;
  return got.slice(0, cap);
}

/** ULT-AUDIT: a strike laid along a line (a breath, a cut down a row) runs out from its caster: the spots nearest first, each `LAG` ms
 *  after the one before, and each a little larger than the last (`FROM` of its size at the caster, `GROW` more a spot, `MAX` at
 *  most), so a breath is seen to leave the mouth and widen. `at` are the spots' places, `cx, cy` the caster's: each spot's place in
 *  the run, its delay and its size. */
export const ULT_LINE = { LAG: 70, FROM: 0.75, GROW: 0.09, MAX: 1.35 } as const;
export function lineRun(at: readonly (readonly [number, number])[], cx: number, cy: number): { i: number; delay: number; size: number }[] {
  const order = at.map((p, i) => ({ i, d: Math.hypot(p[0] - cx, p[1] - cy) })).sort((a, b) => a.d - b.d || a.i - b.i);
  return order.map(({ i }, n) => ({ i, delay: n * ULT_LINE.LAG, size: Math.min(ULT_LINE.MAX, ULT_LINE.FROM + n * ULT_LINE.GROW) }));
}

/** ULT-AUDIT: what a strike adds beyond its own clip, as small clips of the showcase's (`beat-*`) in its element:
 *  - `touch`: on each foe struck by a strike that plays round its caster, as the strike's ring reaches it (`TOUCH_MS` for each
 *    hundred px it stands from the caster): the Bell Warden's toll shakes each foe with a ring as the hoop of sound passes;
 *  - `wake`: along the ground from the first spot of a line to its last, a row of them, ahead of the strike on each spot: the foam
 *    of the Sea Reaver's tide surging down his line;
 *  - `land`: on the caster as the strike begins, large: the spray where the Sea Reaver lands. */
export const ULT_EXTRA: Readonly<Record<string, { touch?: BeatClip; wake?: BeatClip; land?: BeatClip }>> = {
  bellWarden: { touch: 'ring' },
  seaReaver: { wake: 'dust', land: 'puff' },
};
export const ULT_EXTRA_AT = { TOUCH_MS: 220, WAKE_SIZE: 1.5, LAND_SIZE: 1.7 } as const;
/** When the ring reaches a foe `d` px from the caster (ms after the strike begins). */
export const touchDelay = (d: number): number => Math.round((Math.max(0, d) / 100) * ULT_EXTRA_AT.TOUCH_MS);

/** ULT-AUDIT: the kinds whose strike is carried to each spot by a line from the caster (a row of the showcase's `link` clips, the strike
 *  landing as the line arrives, `ULT_LINK_MS` later): a healer's light running out to each friend, the Gorgon's gaze to each foe. */
export const ultLinked = (kind: string): boolean => ultPlace(kind) === 'friends' || kind === 'gorgon' || kind === 'gunslinger';
/** What each link of that line is: sparks of light for a blessing carried to a friend; for the Gorgon's gaze, a row of small open eyes
 *  running out from her to each foe she turns to stone; for the Gunslinger's High Noon, the sparks of a bullet's path to each target. */
export const ultLinkClip = (kind: string): BeatClip => (kind === 'gorgon' ? 'gaze' : kind === 'gunslinger' ? 'blow' : 'link');

/** ULT-AUDIT: what an ultimate leaves hanging over its caster for as long as the ability itself lasts (ms of the fight), beyond its
 *  aftermath: Vael's Kneel Before Night is eight seconds of totality, and a black sun hangs over him for all eight. A looped clip. */
export const ULT_LASTS: Readonly<Record<string, { clip: string; ms: number }>> = { vael: { clip: 'aura-eclipse', ms: 8000 } };
export const ULT_LINK_MS = 200;

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

/** HIT-SPARKS (docs/notes/hit-sparks.md): what plays where a blow lands, as rendered clips in the blow's element, in place of the
 *  painted sparks (which stay as the fallback until a clip's atlas is held). The kinds of landing:
 *  - `blow`: a plain blow: a small star of sparks, larger with the share of the target's health it took;
 *  - `burst`: a shot landing, in the shot's own element: the same star, a little larger;
 *  - `block`: a blow turned aside by a raised guard: a pale blue star;
 *  - `backstab`: a killing blow from behind: two crossed strokes in the dark;
 *  - `crit`: a heavy blow: crossed strokes in gold, plainly the largest.
 *  Each is small and quick (`ms` under 300); `size` is a multiple of the clip's own. */
export type HitKind = 'blow' | 'burst' | 'block' | 'backstab' | 'crit';
export const HIT_SPARK: Readonly<Record<HitKind, { clip: 'blow' | 'cut' | 'block'; el?: string; size: number; grow: number; ms: number }>> = {
  blow: { clip: 'blow', el: 'light', size: 1.0, grow: 0.5, ms: 200 },
  burst: { clip: 'blow', size: 1.0, grow: 0.5, ms: 220 },
  block: { clip: 'block', size: 1.1, grow: 0, ms: 220 },
  backstab: { clip: 'cut', el: 'dark', size: 0.7, grow: 0, ms: 260 },
  crit: { clip: 'cut', el: 'light', size: 0.8, grow: 0.2, ms: 280 },
};
/** The spark for a landing of `kind`: its clip (in `el` where the kind has no element of its own), how large it is drawn for a blow
 *  that took `share` of the target's health (0 to 1), and how long it plays. Undefined where the pipeline has not made the clip. */
export function hitSpark(kind: HitKind, el: string, share: number): { key: string; size: number; ms: number } | undefined {
  const h = HIT_SPARK[kind];
  // (a block's arc is one clip, in its own pale steel whatever struck it)
  const key = h.clip === 'block' ? 'hit-block' : `hit-${h.clip}-${h.el ?? el}`;
  if (!BFX_CLIPS[key]) return undefined;
  return { key, size: h.size + h.grow * Math.max(0, Math.min(1, share * 3)), ms: h.ms };
}

/** SHOTS (docs/notes/shots.md): the rendered orb of a shot in `el`, its tail behind it (the clip flies to the screen's right and the
 *  renderer turns it to its heading). Undefined where the pipeline has not made it: the painted orb flies. */
export const shotOrb = (el: string): string | undefined => (BFX_CLIPS[`shot-orb-${el}`] ? `shot-orb-${el}` : undefined);
/** How large a shot's rendered orb is drawn, as a multiple of the clip's own size at the missile's scale of 1. */
export const SHOT_ORB_SIZE = 1.25;
/** The rendered strand between two fighters, by what runs along it: chain lightning's bolt, a charm's thread, a hex's. */
export const ARC_STRAND: Readonly<Record<'lightning' | 'charm' | 'hex', string>> = { lightning: 'arc-bolt', charm: 'arc-charm', hex: 'arc-hex' };
/** How far a strand's clip may be stretched or squeezed along its length before it is laid as more (or fewer) lengths end to end. */
export const STRAND_STRETCH = 1.35;
/** A strand of clips of length `own` (world px) laid from (x0, y0) to (x1, y1): how it is turned, how many lengths lie end to
 *  end, how far each is stretched along the line (never beyond `most`, `STRAND_STRETCH` when not given), and each length's middle. */
export function strandLay(x0: number, y0: number, x1: number, y1: number, own: number, most: number = STRAND_STRETCH): { turn: number; stretch: number; at: { x: number; y: number }[] } {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.ceil(len / (own * most)));
  const at = Array.from({ length: n }, (_, i) => ({ x: x0 + ((x1 - x0) * (i + 0.5)) / n, y: y0 + ((y1 - y0) * (i + 0.5)) / n }));
  return { turn: Math.atan2(y1 - y0, x1 - x0), stretch: len / n / own, at };
}

/** SWINGS (docs/notes/swings.md): the rendered stroke of a melee blow, by the slash its weapon draws (`slashOf`): a sword's
 *  crescent, a club's heavy arc, a spear's thrust, raking claws. Each travels to the screen's right; the renderer turns it to the
 *  blow. `size` is a multiple of the clip's own, `ms` how long it plays (quick, as a hit's spark is). */
export const SWING: Readonly<Record<'slashLight' | 'slashEarth' | 'slashWind' | 'darkSlash', { key: string; size: number; ms: number }>> = {
  slashLight: { key: 'swing-blade', size: 1.15, ms: 240 },
  slashEarth: { key: 'swing-heavy', size: 1.2, ms: 290 },
  slashWind: { key: 'swing-thrust', size: 1.1, ms: 200 },
  darkSlash: { key: 'swing-claw', size: 1.05, ms: 260 },
};
/** The swing for a slash sheet, or undefined where the pipeline has not made its clip (the painted slash plays). */
export const swingClip = (sheet: keyof typeof SWING): { key: string; size: number; ms: number } | undefined => (BFX_CLIPS[SWING[sheet].key] ? SWING[sheet] : undefined);
/** What a fighter leaves as it falls, by its kind (`deathKind`): the rendered clip, or undefined where it is not made. */
export const deathClip = (kind: string): string | undefined => (BFX_CLIPS[`death-${kind}`] ? `death-${kind}` : undefined);
/** A gun's shot: the flash at its muzzle and the bullet with its streak (both to the screen's right, turned to the shot). */
export const GUN = { muzzle: 'shot-muzzle', tracer: 'shot-tracer', muzzleSize: 1.3, tracerSize: 1 } as const;
/** The rendered clip a shot's missile flies as: an orb's in its element, a bullet's tracer; an arrow and a bone stay painted. */
export const shotClip = (look: string, el: string): string | undefined => (look === 'orb' ? shotOrb(el) : look === 'tracer' && BFX_CLIPS[GUN.tracer] ? GUN.tracer : undefined);

/** A blink that strikes (a teleport slash's hop): the rendered streak from where the fighter was to where it lands (`streak`, one
 *  stroke `ms` long, fitted to the hop: stretched up to `STRETCH` of its length before a second is laid) and the crossed cut on the
 *  foe (`cut`, `CUT_MS` long at `CUT_SIZE`, `CUT_LAG` ms after the streak sets off). */
export const BLINK_CUT = { streak: 'swing-dash', ms: 220, STRETCH: 1.5, cut: 'hit-cut-dark', CUT_SIZE: 0.9, CUT_MS: 260, CUT_LAG: 80 } as const;
/** The streak and the cut, or undefined where the pipeline has not made both (the painted ones play). */
export const blinkCut = (): typeof BLINK_CUT | undefined => (BFX_CLIPS[BLINK_CUT.streak] && BFX_CLIPS[BLINK_CUT.cut] ? BLINK_CUT : undefined);

/** EMIT-POINTS: how much of its length a shot's clip is drawn at when it has come `gone` px from where it left and its tail is
 *  `tail` px long: the tail never reaches back past the point it left from (it would lie across the shooter), and the clip is never
 *  squeezed under `MIN` of itself, so its head is there from the first frame. */
export const TAIL_MIN = 0.35;
export const tailShare = (gone: number, tail: number): number => (tail <= 0 ? 1 : Math.max(TAIL_MIN, Math.min(1, gone / tail)));

/** EMIT-POINTS: a breath leaves the mouth. For an ultimate laid down a line whose caster has a mouth point (`ULT_EMIT`), a run of
 *  small flames blown OUTWARDS from the mouth at (mx, my), along the line and at the mouth's own height, to the point that high over
 *  the line's first spot (x1, y1): one every `STEP` px (`MIN` to `MAX` of them), each `LAG` ms after the one before and larger than
 *  it (`FROM` of its size at the mouth, `TO` at the far end), each turned to point the way the breath goes (`turn`; the clip is a
 *  flame standing upright). It comes down to the ground only there, where the line's own flames take it on, `wait` ms after it set
 *  off. A line that begins on the tile beside the caster has the shortest run, `MIN` flames, still at the mouth's height. */
export const MOUTH_RUN = { clip: 'flame', STEP: 16, MIN: 2, MAX: 9, LAG: 40, FROM: 0.3, TO: 0.8 } as const;
export function mouthRun(mx: number, my: number, x1: number, y1: number): { at: { x: number; y: number; delay: number; size: number }[]; wait: number; turn: number } {
  const n = Math.max(MOUTH_RUN.MIN, Math.min(MOUTH_RUN.MAX, Math.round(Math.hypot(x1 - mx, y1 - my) / MOUTH_RUN.STEP)));
  const at = Array.from({ length: n }, (_, i) => {
    const f = i / n;
    return { x: mx + (x1 - mx) * f, y: my + (y1 - my) * f, delay: i * MOUTH_RUN.LAG, size: MOUTH_RUN.FROM + (MOUTH_RUN.TO - MOUTH_RUN.FROM) * f };
  });
  return { at, wait: n * MOUTH_RUN.LAG, turn: Math.atan2(y1 - my, x1 - mx) + Math.PI / 2 };
}
