// What each weather looks like, as plain data (pure: no Pixi, no DOM; `weatherView.ts` draws it). One light particle layer at
// most, with capped counts; a tint laid over the screen; and night's glows. Nothing here flashes or blinks: tints are steady
// (they fade in over a moment when a fight begins), and a particle only ever drifts.

import type { Area } from '../sim/board';
import type { Weather } from '../sim/weather';

/** The most particles any weather shows at once, and the share a battery saver keeps. */
export const MAX_PARTICLES = 80;
export const SAVER_SHARE = 0.5;
/** A tint is never heavier than this (0 to 1), and takes this long to come in (ms). */
export const MAX_TINT = 0.4;
export const FADE_IN_MS = 700;

export type Flow = 'fall' | 'rise' | 'drift';

export interface WeatherLook {
  /** The colour laid over the screen, and how heavily (a fraction of full). */
  tint: number;
  alpha: number;
  /** The particle layer: how many, their colours, size in px (a whole number), speed in px/s (a range), and how they move. */
  count: number;
  colours: number[];
  size: [number, number];
  speed: [number, number];
  flow: Flow;
  /** Sideways drift in px/s (the wind), and how far a particle sways about it. */
  wind: number;
  sway: number;
  /** A falling streak (rain) is drawn this tall, a whole number of px; 0 for a speck. */
  streak: number;
  /** Soft fog banks drifting across: how many, their colour and how heavy each is. */
  fog: number;
  fogColour: number;
  fogAlpha: number;
  /** Night's glows at the lit props, and their colour. */
  glow: number;
}

const NONE: WeatherLook = { tint: 0, alpha: 0, count: 0, colours: [], size: [2, 2], speed: [0, 0], flow: 'fall', wind: 0, sway: 0, streak: 0, fog: 0, fogColour: 0xffffff, fogAlpha: 0, glow: 0 };

/** The colours of falling leaves by land: autumn leaves, the forest's greens, the shrine's cherry petals. */
const LEAVES: Partial<Record<Area, number[]>> = {
  shrine: [0xf4b8d0, 0xe89ab8, 0xffd6e4],
  forest: [0x6aa84f, 0x9bbb3a, 0xd0b030],
  temple: [0x6aa84f, 0x9bbb3a, 0xd0b030],
  highlands: [0x9bbb3a, 0xd0b030],
};
const AUTUMN = [0xd9822b, 0xb85c1e, 0xe0b040, 0xa83a1a];

/** The tint of the fog by land (a cold mist, a green one over the mire). */
const FOG: Partial<Record<Area, number>> = { swamp: 0xc4dcc8, graveyard: 0xc4d8d0, crystal: 0xc0ccff, dungeon: 0xc8c8dc, shrine: 0xd8c8f0 };

/** The glow of a lit prop at night by land (lanterns and torches are warm; the graveyard's are cold wisps). */
export const GLOW: Partial<Record<Area, number>> = { shrine: 0xffb050, warcamp: 0xff9440, forge: 0xff7a30, graveyard: 0x7dffb4 };

/** Which of a land's boulders give light at night (an index into its boulders, taken as `deco % boulders.length`). */
export const LIT_PROPS: Partial<Record<Area, number[]>> = { shrine: [1], warcamp: [2], forge: [0], graveyard: [0, 1] };

/** A clear day on an army's road (WORLD-ROAD) is not empty air: a few motes the land gives off drift through it, by land (pollen and
 *  petals, fireflies over the mire, embers by the lava, flecks of snow, dust, ash over the graves, motes of crystal). Fewer than any weather. */
export function ambientOf(area: Area): WeatherLook {
  const mote = (colours: number[], flow: Flow, speed: [number, number], extra: Partial<WeatherLook> = {}): WeatherLook => ({ ...NONE, count: 16, colours, size: [2, 2], speed, flow, wind: 8, sway: 14, ...extra });
  switch (area) {
    case 'volcano':
    case 'forge':
      return mote([0xff8a2a, 0xffc040], 'rise', [18, 46]);
    case 'snow':
      return mote([0xffffff, 0xeaf2ff], 'fall', [16, 34], { size: [2, 3] });
    case 'swamp':
    case 'shrine':
      return mote(area === 'shrine' ? [0xffd6e4, 0xf4b8d0] : [0xd8ff8a, 0xfff2a0], area === 'shrine' ? 'fall' : 'drift', [6, 16], area === 'shrine' ? { size: [2, 3], wind: 18 } : {});
    case 'graveyard':
    case 'dungeon':
      return mote([0x9a9aa8, 0x7dffb4], 'drift', [4, 12]);
    case 'desert':
    case 'warcamp':
      return mote([0xd8c090, 0xb8a078], 'drift', [6, 14], { wind: 26 });
    case 'crystal':
      return mote([0xc0ccff, 0xe8f0ff], 'rise', [8, 20]);
    case 'autumn':
      return mote(AUTUMN, 'fall', [20, 40], { size: [3, 3], wind: 20 });
    default:
      return mote([0xfff6c0, 0xe8ffd0], 'drift', [5, 14]);
  }
}

export function lookOf(w: Weather, area: Area): WeatherLook {
  switch (w) {
    case 'rain':
      return { ...NONE, tint: 0x203048, alpha: 0.2, count: 64, colours: [0xcfe2ff], size: [1, 2], speed: [560, 760], flow: 'fall', wind: -110, sway: 0, streak: 8 };
    case 'snow':
      return { ...NONE, tint: 0xe6f0ff, alpha: 0.06, count: 56, colours: [0xffffff, 0xeaf2ff], size: [2, 3], speed: [36, 76], flow: 'fall', wind: 10, sway: 18 };
    case 'fog':
      return { ...NONE, tint: 0xdde4ea, alpha: 0.08, fog: 5, fogColour: FOG[area] ?? 0xdfe6ee, fogAlpha: 0.22 };
    case 'leaves':
      return { ...NONE, tint: 0xffa040, alpha: 0.04, count: 26, colours: LEAVES[area] ?? AUTUMN, size: [3, 4], speed: [28, 60], flow: 'fall', wind: 26, sway: 22 };
    case 'embers':
      return { ...NONE, tint: 0x300800, alpha: 0.1, count: 40, colours: [0xff8a2a, 0xffc040, 0xff5a1a], size: [2, 2], speed: [26, 76], flow: 'rise', wind: 6, sway: 14 };
    case 'ash':
      return { ...NONE, tint: 0x202020, alpha: 0.12, count: 36, colours: [0x8a8a8a, 0xb0b0b0, 0x606060], size: [2, 3], speed: [22, 48], flow: 'fall', wind: 16, sway: 12 };
    case 'night':
      return { ...NONE, tint: 0x0a1038, alpha: 0.36, count: 14, colours: [GLOW[area] === 0x7dffb4 ? 0x9dffc8 : 0xffe88a], size: [2, 2], speed: [4, 12], flow: 'drift', wind: 0, sway: 10, glow: GLOW[area] ?? 0 };
    default:
      return NONE;
  }
}

/** How many particles to show: the look's count, a share of it on a battery saver, and none when reduced motion is asked for. */
export const countFor = (look: WeatherLook, saver: boolean, calm: boolean): number => (calm ? 0 : Math.min(MAX_PARTICLES, Math.ceil(look.count * (saver ? SAVER_SHARE : 1))));
/** How many fog banks to show (they are still, not drifting, when reduced motion is asked for). */
export const fogFor = (look: WeatherLook, saver: boolean): number => (saver ? Math.ceil(look.fog / 2) : look.fog);
/** The tint's alpha `t` ms into a fight: it comes in over `FADE_IN_MS`, never past `MAX_TINT`. */
export const tintAt = (look: WeatherLook, t: number): number => Math.min(MAX_TINT, look.alpha) * Math.min(1, Math.max(0, t / FADE_IN_MS));
