// ALIVE: where each painting's life is (pure data, no page): its fires, candles and lamps, the water that ripples, the trees and
// cloth that sway, the flames that lick, the smoke and embers that rise, the birds, motes and fireflies in its air. Every point and
// polygon is in shares of the painting (0 to 1 across and down), so it holds whatever size the painting is drawn at.
// `ambientPaint.ts` draws it (with `ambient.ts`'s motion); `test/ambient.test.ts` checks every scene is well made.

import type { Anchor, Box, LightKind, Pt, RegionKind } from './ambient';

/** A light that flickers: a glow laid over the painting where it already shows a flame or a lamp. */
export interface Light {
  at: Pt;
  /** Its reach, a share of the painting's width. */
  r: number;
  kind: LightKind;
  colour: number;
  /** How strong the glow is at rest (0 to 1; default 0.5). */
  power?: number;
  /** Squashed flat (a pool of light on a floor): its height over its width (default 1). */
  squash?: number;
  /** A flash now and then (a storm in the clouds, a surge of magic): about one in this many seconds. */
  flash?: number;
}

/** A part of the painting that moves: cut out along its polygon (feathered) and drawn bent, rippled or flowing. */
export interface Region {
  kind: RegionKind;
  poly: readonly Pt[];
  /** How far it moves at most, a share of the painting's width. */
  amp: number;
  /** Where it is held still (trees at the foot, banners and herbs at the top). */
  anchor?: Anchor;
  /** Faster (above 1) or slower than the kind's own pace. */
  pace?: number;
  /** Water: how many glints of light dance on it at once. */
  glints?: number;
}

/** Something that rises from a point: embers or sparks off a fire, smoke from a chimney, steam from a pot. */
export interface Spout {
  kind: 'embers' | 'smoke' | 'steam';
  at: Pt;
  count: number;
  /** How wide it starts (a share of the width) and how far it rises before it is gone (a share of the height). */
  spread: number;
  rise: number;
  /** Seconds each one lives. */
  life: number;
  colour: number;
  /** Blown aside as it rises (a share of the width over its life). */
  drift?: number;
}

/** Things in the air of a box: dust motes in the light, fireflies, wisps of magic, birds or bats crossing the sky. */
export interface Drift {
  kind: 'motes' | 'fireflies' | 'wisps' | 'birds' | 'bats';
  box: Box;
  count: number;
  colour: number;
}

/** Lights to find in the painting itself, where it is too full of small flames to place each by hand (a hall of candles): the
 *  painter looks for its bright spots once, as it lays the painting out (`hotSpots`), and lights each one found in `box`. */
export interface FindLights {
  box: Box;
  /** At most this many. */
  most: number;
  /** What counts as a flame: a warm bright pixel (a fire, a torch) or a near-white one (a candle's tip). */
  hot: 'warm' | 'bright';
  kind: LightKind;
  colour: number;
  r: number;
  power: number;
}

export interface SceneLife {
  /** The painting's size in its own pixels (only its shape matters). */
  size: readonly [number, number];
  lights: readonly Light[];
  find?: FindLights;
  regions: readonly Region[];
  spouts: readonly Spout[];
  drifts: readonly Drift[];
}

const FIRE = 0xff9a40;
const CANDLE = 0xffc86a;
const LAMP = 0xffb050;

const candles = (pts: readonly Pt[], r = 0.03, power = 0.55): Light[] => pts.map((at) => ({ at, r, kind: 'candle', colour: CANDLE, power }));

/** Every painted scene that lives, by name. */
export const SCENE_LIFE = {
  /** The Battle Overlook (`art/camp/overlook.png`, stretched over the camp's canvas; the enemy's camp is laid over its middle,
   *  from y 0.32 to 0.64, and its fires are found in that picture as it is painted: `hotSpots`). */
  overlook: {
    size: [1024, 1536],
    lights: [
      { at: [0.9, 0.155], r: 0.16, kind: 'window', colour: 0xff9a3a, power: 0.35 },
      { at: [0.83, 0.075], r: 0.11, kind: 'magic', colour: 0xa060ff, power: 0.45, flash: 7 },
      { at: [0.068, 0.6], r: 0.06, kind: 'lantern', colour: LAMP, power: 0.55 },
    ],
    regions: [
      // (the clouds of the sunset: a slow slide either side of the floating citadel)
      { kind: 'cloud', poly: [[0, 0], [0.72, 0], [0.72, 0.05], [0.45, 0.062], [0.2, 0.07], [0, 0.075]], amp: 0.012 },
      { kind: 'cloud', poly: [[0.92, 0], [1, 0], [1, 0.085], [0.92, 0.075]], amp: 0.008 },
      // (the Calamity's citadel floats)
      { kind: 'float', poly: [[0.74, 0.015], [0.91, 0.015], [0.91, 0.125], [0.74, 0.125]], amp: 0.003 },
      // (the lake under the sun, the river under the aqueduct, and its bend below)
      { kind: 'water', poly: [[0.69, 0.172], [0.82, 0.166], [0.99, 0.163], [1, 0.192], [0.9, 0.2], [0.8, 0.197], [0.7, 0.19]], amp: 0.0025, glints: 4 },
      { kind: 'water', poly: [[0.57, 0.214], [0.66, 0.211], [0.77, 0.204], [0.93, 0.207], [0.93, 0.232], [0.8, 0.237], [0.68, 0.24], [0.57, 0.234]], amp: 0.0025, glints: 3 },
      { kind: 'water', poly: [[0.6, 0.244], [0.71, 0.243], [0.73, 0.262], [0.67, 0.284], [0.6, 0.296], [0.55, 0.292], [0.59, 0.27]], amp: 0.002, glints: 2 },
      // (the falls off the cliffs, top and bottom)
      { kind: 'fall', poly: [[0.315, 0.252], [0.331, 0.252], [0.331, 0.271], [0.315, 0.271]], amp: 0 },
      { kind: 'fall', poly: [[0.313, 0.283], [0.336, 0.283], [0.339, 0.322], [0.311, 0.322]], amp: 0 },
      // (the green banners on their poles, the pines below the drop, the sapling by the chests)
      { kind: 'cloth', poly: [[0.012, 0.36], [0.1, 0.36], [0.1, 0.545], [0.012, 0.545]], amp: 0.006, anchor: 'top' },
      { kind: 'cloth', poly: [[0.925, 0.345], [1, 0.345], [1, 0.605], [0.925, 0.605]], amp: 0.006, anchor: 'top', pace: 0.9 },
      { kind: 'foliage', poly: [[0.885, 0.85], [1, 0.82], [1, 1], [0.875, 1]], amp: 0.004, anchor: 'bottom' },
      { kind: 'foliage', poly: [[0.12, 0.74], [0.2, 0.74], [0.2, 0.8], [0.12, 0.8]], amp: 0.004, anchor: 'bottom', pace: 1.3 },
    ],
    spouts: [],
    drifts: [
      { kind: 'birds', box: [0.05, 0.045, 0.68, 0.12], count: 4, colour: 0x1a1420 },
      { kind: 'fireflies', box: [0.08, 0.63, 0.85, 0.92], count: 8, colour: 0xe0ff9a },
    ],
  },

  /** The tavern's room (`ui/tavern-hearth.png`, drawn to fill its 4:5 box). */
  tavern: {
    size: [1122, 1402],
    lights: [
      { at: [0.675, 0.335], r: 0.24, kind: 'fire', colour: FIRE, power: 0.55, squash: 0.85 },
      { at: [0.66, 0.5], r: 0.3, kind: 'fire', colour: FIRE, power: 0.3, squash: 0.35 },
      ...candles([[0.462, 0.06], [0.483, 0.052], [0.507, 0.078], [0.53, 0.086], [0.575, 0.047], [0.613, 0.086], [0.648, 0.054], [0.667, 0.07]], 0.035),
      ...candles([[0.545, 0.208], [0.567, 0.2], [0.587, 0.222], [0.748, 0.21], [0.766, 0.22]], 0.03),
      ...candles([[0.12, 0.385]], 0.05, 0.6),
      ...candles([[0.4, 0.353]], 0.025, 0.5),
      { at: [0.085, 0.125], r: 0.075, kind: 'lantern', colour: LAMP, power: 0.55 },
      { at: [0.333, 0.212], r: 0.06, kind: 'lantern', colour: LAMP, power: 0.5 },
      { at: [0.97, 0.165], r: 0.06, kind: 'lantern', colour: LAMP, power: 0.5 },
    ],
    regions: [
      { kind: 'flame', poly: [[0.612, 0.365], [0.618, 0.315], [0.648, 0.283], [0.69, 0.276], [0.728, 0.298], [0.742, 0.365]], amp: 0.004, anchor: 'bottom' },
      { kind: 'foliage', poly: [[0.15, 0.06], [0.3, 0.06], [0.3, 0.19], [0.15, 0.19]], amp: 0.003, anchor: 'top', pace: 0.6 },
      { kind: 'foliage', poly: [[0, 0], [0.2, 0], [0.2, 0.07], [0.08, 0.1], [0, 0.11]], amp: 0.002, anchor: 'top', pace: 0.5 },
      { kind: 'foliage', poly: [[0.93, 0], [1, 0], [1, 0.11], [0.93, 0.08]], amp: 0.002, anchor: 'top', pace: 0.5 },
      { kind: 'cloth', poly: [[0.6, 0.105], [0.735, 0.105], [0.735, 0.228], [0.6, 0.228]], amp: 0.0018, anchor: 'top', pace: 0.5 },
    ],
    spouts: [{ kind: 'embers', at: [0.675, 0.33], count: 10, spread: 0.07, rise: 0.09, life: 1.6, colour: 0xffb050 }],
    drifts: [{ kind: 'motes', box: [0.38, 0.22, 0.98, 0.62], count: 16, colour: 0xffd9a0 }],
  },

  /** The Summoning Sanctum (Recruit; `art/hall/sanctum.png`, stretched over the hall's canvas): a hall of candles, found in the
   *  painting; its banners stir, the shards over the altar float, green light breathes in the rose window and over the altar. */
  sanctum: {
    size: [1024, 1536],
    lights: [
      { at: [0.54, 0.2], r: 0.22, kind: 'magic', colour: 0x40e0a0, power: 0.28 },
      { at: [0.54, 0.47], r: 0.26, kind: 'magic', colour: 0x40ffb0, power: 0.35 },
    ],
    find: { box: [0, 0.08, 1, 0.8], most: 36, hot: 'bright', kind: 'candle', colour: 0xffc060, r: 0.03, power: 0.45 },
    regions: [
      { kind: 'cloth', poly: [[0.06, 0.012], [0.155, 0.012], [0.155, 0.225], [0.06, 0.225]], amp: 0.003, anchor: 'top' },
      { kind: 'cloth', poly: [[0.895, 0.012], [0.985, 0.012], [0.985, 0.225], [0.895, 0.225]], amp: 0.003, anchor: 'top', pace: 0.9 },
      { kind: 'cloth', poly: [[0.13, 0.27], [0.225, 0.27], [0.225, 0.45], [0.13, 0.45]], amp: 0.003, anchor: 'top', pace: 1.1 },
      { kind: 'cloth', poly: [[0.825, 0.27], [0.92, 0.27], [0.92, 0.45], [0.825, 0.45]], amp: 0.003, anchor: 'top', pace: 0.8 },
      { kind: 'float', poly: [[0.36, 0.39], [0.72, 0.39], [0.72, 0.52], [0.36, 0.52]], amp: 0.002 },
    ],
    spouts: [],
    drifts: [
      { kind: 'wisps', box: [0.36, 0.36, 0.72, 0.56], count: 12, colour: 0x7dffc0 },
      { kind: 'motes', box: [0.1, 0.55, 0.9, 0.95], count: 14, colour: 0xffd890 },
    ],
  },

  /** The Spellbook's study (`ui/spells-study.png`, covering a 16:9 box): candles, the book's blue magic winding up, moonlight
   *  through the window, ivy, the lectern's cloth. */
  study: {
    size: [1024, 683],
    lights: [
      ...candles([[0.073, 0.52], [0.203, 0.6], [0.232, 0.555], [0.258, 0.61], [0.966, 0.395], [0.922, 0.465], [0.905, 0.545]], 0.045, 0.55),
      { at: [0.48, 0.47], r: 0.2, kind: 'magic', colour: 0x5ab8ff, power: 0.45 },
      { at: [0.49, 0.3], r: 0.12, kind: 'magic', colour: 0x7ad0ff, power: 0.3 },
      { at: [0.855, 0.14], r: 0.11, kind: 'window', colour: 0xc8e4ff, power: 0.3 },
    ],
    regions: [
      { kind: 'heat', poly: [[0.4, 0.15], [0.58, 0.15], [0.58, 0.4], [0.4, 0.4]], amp: 0.004, pace: 0.5 },
      { kind: 'foliage', poly: [[0, 0], [0.35, 0], [0.35, 0.15], [0.1, 0.3], [0.06, 0.45], [0, 0.45]], amp: 0.0025, anchor: 'top', pace: 0.6 },
      { kind: 'foliage', poly: [[0.875, 0.58], [0.99, 0.58], [0.99, 0.88], [0.875, 0.88]], amp: 0.002, anchor: 'bottom', pace: 0.7 },
      { kind: 'cloth', poly: [[0.445, 0.585], [0.625, 0.585], [0.625, 0.86], [0.445, 0.86]], amp: 0.0015, anchor: 'top', pace: 0.6 },
    ],
    spouts: [],
    drifts: [
      { kind: 'wisps', box: [0.38, 0.18, 0.6, 0.48], count: 8, colour: 0x79cfff },
      { kind: 'motes', box: [0.25, 0.3, 0.8, 0.95], count: 14, colour: 0xffe2b0 },
    ],
  },

  /** The throne room behind the High Throne card (`art/throne/throne_room.png`, pixel art drawn at twice its size): the red
   *  banners and the curtain stir, light falls through the stained glass, the sconces gutter, dust in the light. */
  throne: {
    size: [400, 210],
    lights: [
      { at: [0.205, 0.27], r: 0.13, kind: 'window', colour: 0x9ad8ff, power: 0.3 },
      { at: [0.795, 0.27], r: 0.13, kind: 'window', colour: 0x9ad8ff, power: 0.3 },
      { at: [0.035, 0.07], r: 0.045, kind: 'torch', colour: 0xffb050, power: 0.45 },
      { at: [0.315, 0.085], r: 0.045, kind: 'torch', colour: 0xffb050, power: 0.45 },
      { at: [0.665, 0.085], r: 0.045, kind: 'torch', colour: 0xffb050, power: 0.45 },
      { at: [0.935, 0.07], r: 0.045, kind: 'torch', colour: 0xffb050, power: 0.45 },
    ],
    regions: [
      { kind: 'cloth', poly: [[0.022, 0.1], [0.058, 0.1], [0.058, 0.47], [0.022, 0.47]], amp: 0.002, anchor: 'top' },
      { kind: 'cloth', poly: [[0.302, 0.15], [0.338, 0.15], [0.338, 0.5], [0.302, 0.5]], amp: 0.002, anchor: 'top', pace: 1.1 },
      { kind: 'cloth', poly: [[0.652, 0.15], [0.688, 0.15], [0.688, 0.5], [0.652, 0.5]], amp: 0.002, anchor: 'top', pace: 0.9 },
      { kind: 'cloth', poly: [[0.922, 0.1], [0.958, 0.1], [0.958, 0.47], [0.922, 0.47]], amp: 0.002, anchor: 'top', pace: 1.2 },
      { kind: 'cloth', poly: [[0.37, 0.1], [0.63, 0.1], [0.63, 0.45], [0.37, 0.45]], amp: 0.0012, anchor: 'top', pace: 0.5 },
    ],
    spouts: [],
    drifts: [
      { kind: 'motes', box: [0.12, 0.3, 0.3, 0.85], count: 6, colour: 0xd8f0ff },
      { kind: 'motes', box: [0.7, 0.3, 0.88, 0.85], count: 6, colour: 0xd8f0ff },
    ],
  },

  /** CASTLE-REMAKE: the castle's courtyard (`ui/castle/courtyard.webp`, the Castle tab's painting, a stand-in until the owner's lands;
   *  every spot is where docs/notes/castle-remake-art-prompts.md asks for it): the keep's banners wave, its great windows glow, the
   *  gate's and the wall-walks' torches gutter, the fountain ripples, smoke from the keep's chimney, bats over the roofs, fireflies in
   *  the gardens. The buildings are laid over it in the page, so nothing here sits on a plot. */
  courtyard: {
    size: [1024, 1536],
    lights: [
      { at: [0.42, 0.155], r: 0.07, kind: 'window', colour: 0xffb050, power: 0.4 },
      { at: [0.5, 0.15], r: 0.08, kind: 'window', colour: 0xffb050, power: 0.45 },
      { at: [0.58, 0.155], r: 0.07, kind: 'window', colour: 0xffb050, power: 0.4 },
      { at: [0.4, 0.88], r: 0.07, kind: 'torch', colour: LAMP, power: 0.6 },
      { at: [0.6, 0.88], r: 0.07, kind: 'torch', colour: LAMP, power: 0.6 },
      { at: [0.02, 0.3], r: 0.05, kind: 'torch', colour: LAMP, power: 0.5 },
      { at: [0.98, 0.3], r: 0.05, kind: 'torch', colour: LAMP, power: 0.5 },
      { at: [0.02, 0.6], r: 0.05, kind: 'torch', colour: LAMP, power: 0.5 },
      { at: [0.98, 0.6], r: 0.05, kind: 'torch', colour: LAMP, power: 0.5 },
      { at: [0.5, 0.95], r: 0.16, kind: 'fire', colour: FIRE, power: 0.2, squash: 0.4 },
    ],
    regions: [
      { kind: 'cloth', poly: [[0.34, 0.012], [0.4, 0.012], [0.4, 0.07], [0.34, 0.07]], amp: 0.004, anchor: 'top' },
      { kind: 'cloth', poly: [[0.6, 0.012], [0.66, 0.012], [0.66, 0.07], [0.6, 0.07]], amp: 0.004, anchor: 'top', pace: 1.15 },
      { kind: 'water', poly: [[0.63, 0.44], [0.69, 0.44], [0.7, 0.46], [0.66, 0.47], [0.62, 0.46]], amp: 0.0015, glints: 2 },
    ],
    spouts: [{ kind: 'smoke', at: [0.62, 0.065], count: 6, spread: 0.02, rise: 0.05, life: 4, colour: 0x8a8a90 }],
    drifts: [
      { kind: 'bats', box: [0.05, 0, 0.95, 0.06], count: 4, colour: 0x14101a },
      { kind: 'fireflies', box: [0.26, 0.58, 0.74, 0.66], count: 6, colour: 0xe0ff9a },
      { kind: 'motes', box: [0.3, 0.12, 0.7, 0.3], count: 8, colour: 0xffd9a0 },
    ],
  },

  /** Approved painted royal hall: cool stained glass, the two warm braziers and crimson banners.
   *  Positions are in the retained 1536×1024 painting; the canvas crops it evenly to its 800×420 frame. */
  throneHall: {
    size: [1536, 1024],
    lights: [
      { at: [0.15, 0.24], r: 0.15, kind: 'window', colour: 0x9ad8ff, power: 0.18 },
      { at: [0.85, 0.24], r: 0.15, kind: 'window', colour: 0x9ad8ff, power: 0.18 },
      { at: [0.305, 0.47], r: 0.09, kind: 'torch', colour: LAMP, power: 0.3 },
      { at: [0.695, 0.47], r: 0.09, kind: 'torch', colour: LAMP, power: 0.3 },
    ],
    regions: [
      { kind: 'cloth', poly: [[0.265, 0.12], [0.323, 0.12], [0.323, 0.42], [0.265, 0.42]], amp: 0.001, anchor: 'top', pace: 0.6 },
      { kind: 'cloth', poly: [[0.677, 0.12], [0.735, 0.12], [0.735, 0.42], [0.677, 0.42]], amp: 0.001, anchor: 'top', pace: 0.7 },
    ],
    spouts: [],
    drifts: [
      { kind: 'motes', box: [0.12, 0.3, 0.3, 0.85], count: 6, colour: 0xd8f0ff },
      { kind: 'motes', box: [0.7, 0.3, 0.88, 0.85], count: 6, colour: 0xd8f0ff },
    ],
  },

  /** The Altar of Ascension's chamber (`art/altar/sanctuary.webp`, filling the altar's card under its veil): the two torches lick,
   *  the banners stir, the green gems and the shaft of light from above breathe, dust turns in the light. */
  altar: {
    size: [1024, 1536],
    lights: [
      { at: [0.085, 0.265], r: 0.12, kind: 'torch', colour: 0xffa040, power: 0.6 },
      { at: [0.915, 0.265], r: 0.12, kind: 'torch', colour: 0xffa040, power: 0.6 },
      { at: [0.5, 0.12], r: 0.25, kind: 'window', colour: 0xffe2a0, power: 0.25 },
      { at: [0.5, 0.02], r: 0.05, kind: 'magic', colour: 0x40ffa0, power: 0.5 },
      { at: [0.035, 0.47], r: 0.04, kind: 'magic', colour: 0x40ffa0, power: 0.45 },
      { at: [0.965, 0.47], r: 0.04, kind: 'magic', colour: 0x40ffa0, power: 0.45 },
      { at: [0.035, 0.67], r: 0.045, kind: 'magic', colour: 0x40ffa0, power: 0.45 },
      { at: [0.965, 0.67], r: 0.045, kind: 'magic', colour: 0x40ffa0, power: 0.45 },
    ],
    regions: [
      { kind: 'flame', poly: [[0.06, 0.29], [0.07, 0.25], [0.085, 0.235], [0.1, 0.25], [0.11, 0.29]], amp: 0.004, anchor: 'bottom' },
      { kind: 'flame', poly: [[0.89, 0.29], [0.9, 0.25], [0.915, 0.235], [0.93, 0.25], [0.94, 0.29]], amp: 0.004, anchor: 'bottom' },
      { kind: 'cloth', poly: [[0.185, 0.14], [0.265, 0.14], [0.265, 0.32], [0.185, 0.32]], amp: 0.003, anchor: 'top', pace: 0.6 },
      { kind: 'cloth', poly: [[0.735, 0.14], [0.815, 0.14], [0.815, 0.32], [0.735, 0.32]], amp: 0.003, anchor: 'top', pace: 0.7 },
    ],
    spouts: [
      { kind: 'embers', at: [0.085, 0.25], count: 6, spread: 0.03, rise: 0.08, life: 1.6, colour: 0xffa040 },
      { kind: 'embers', at: [0.915, 0.25], count: 6, spread: 0.03, rise: 0.08, life: 1.6, colour: 0xffa040 },
    ],
    drifts: [{ kind: 'motes', box: [0.36, 0.05, 0.64, 0.75], count: 18, colour: 0xffe6a8 }],
  },

  /** Hester's stall, her shelf (`shop/shelf.webp`, covering the scene from its foot): plain wood, so only her lamp's warm light
   *  breathing over it and dust drifting in it. */
  stall: {
    size: [800, 400],
    lights: [{ at: [0.42, 0.18], r: 0.42, kind: 'lantern', colour: 0xffb060, power: 0.18 }],
    regions: [],
    spouts: [],
    drifts: [{ kind: 'motes', box: [0.05, 0.05, 0.95, 0.7], count: 12, colour: 0xffd8a0 }],
  },

  /** The Houses' menus (`art/dynasty/houses-backdrop.webp`, under the card's dark veil, so light only): the candelabras either side
   *  of the great tapestry gutter, dust drifts before it. */
  houses: {
    size: [768, 1152],
    lights: [
      ...candles([[0.02, 0.33], [0.035, 0.35], [0.965, 0.33], [0.98, 0.35]], 0.06, 0.5),
      { at: [0.03, 0.36], r: 0.16, kind: 'candle', colour: 0xffa850, power: 0.3 },
      { at: [0.97, 0.36], r: 0.16, kind: 'candle', colour: 0xffa850, power: 0.3 },
    ],
    regions: [],
    spouts: [],
    drifts: [{ kind: 'motes', box: [0.08, 0.1, 0.92, 0.9], count: 14, colour: 0xffd8a0 }],
  },

  /** The Dark Council's chamber (`art/dynasty/council-backdrop.webp`, under the card's dark veil, so light only): its sconces and
   *  torches burn, the high ones send up embers, violet light breathes over the warchief's seat. */
  council: {
    size: [768, 1152],
    lights: [
      // (the repainted chamber, docs/notes/art-wire-5.md: a high sconce and a low one on each wall, a torch either side of the throne)
      { at: [0.04, 0.207], r: 0.12, kind: 'fire', colour: 0xff8a30, power: 0.55 },
      { at: [0.965, 0.208], r: 0.12, kind: 'fire', colour: 0xff8a30, power: 0.55 },
      { at: [0.071, 0.287], r: 0.07, kind: 'torch', colour: 0xff9a40, power: 0.45 },
      { at: [0.938, 0.287], r: 0.07, kind: 'torch', colour: 0xff9a40, power: 0.45 },
      { at: [0.251, 0.282], r: 0.06, kind: 'torch', colour: 0xff9a40, power: 0.45 },
      { at: [0.753, 0.281], r: 0.06, kind: 'torch', colour: 0xff9a40, power: 0.45 },
      { at: [0.5, 0.25], r: 0.3, kind: 'magic', colour: 0x9a50ff, power: 0.3 },
    ],
    regions: [],
    spouts: [
      { kind: 'embers', at: [0.04, 0.19], count: 8, spread: 0.04, rise: 0.12, life: 1.8, colour: 0xff9a40 },
      { kind: 'embers', at: [0.965, 0.19], count: 8, spread: 0.04, rise: 0.12, life: 1.8, colour: 0xff9a40 },
    ],
    drifts: [{ kind: 'wisps', box: [0.3, 0.1, 0.7, 0.45], count: 8, colour: 0xb080ff }],
  },
} satisfies Record<string, SceneLife>;

export type SceneName = keyof typeof SCENE_LIFE;
export const sceneLife = (name: SceneName): SceneLife => SCENE_LIFE[name];

/** Each scene's painting in the repository (for the mask previews, `tools/alive/masks.mjs`, and the test that each one is there). */
export const SCENE_ART: Record<SceneName, string> = {
  overlook: 'src/art/camp/overlook.png',
  tavern: 'src/art/ui/tavern-hearth.png',
  sanctum: 'src/art/hall/sanctum.png',
  study: 'src/art/ui/spells-study.png',
  throne: 'src/art/throne/throne_room.png',
  courtyard: 'src/art/castle-remake/courtyard.webp',
  throneHall: 'src/art/castle-remake/throne-hall.webp',
  altar: 'src/art/altar/sanctuary.webp',
  stall: 'src/art/shop/shelf.webp',
  houses: 'src/art/dynasty/houses-backdrop.webp',
  council: 'src/art/dynasty/council-backdrop.webp',
};
