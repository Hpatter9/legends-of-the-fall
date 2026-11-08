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

export interface SceneLife {
  /** The painting's size in its own pixels (only its shape matters). */
  size: readonly [number, number];
  lights: readonly Light[];
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
} satisfies Record<string, SceneLife>;

export type SceneName = keyof typeof SCENE_LIFE;
export const sceneLife = (name: SceneName): SceneLife => SCENE_LIFE[name];

/** Each scene's painting in the repository (for the mask previews, `tools/alive/masks.mjs`, and the test that each one is there). */
export const SCENE_ART: Record<SceneName, string> = {
  overlook: 'src/art/camp/overlook.png',
  tavern: 'src/art/ui/tavern-hearth.png',
};
