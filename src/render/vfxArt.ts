// The effect sheets for the fight's little effects: slashes, dust, ripples, puffs, smoke, status icons and the light
// pillar. Each is a Pixel Effects strip of 32px frames (`src/art/fx/vfx`, credited in CREDITS.md), loaded once by
// `loadVfxArt` and read by `fx.ts` and `unitView.ts`.

import { Rectangle, Texture } from 'pixi.js';
import { loadImage } from './loadImage';
import slashLight from '../art/fx/vfx/slash_light.png';
import slashEarth from '../art/fx/vfx/slash_earth.png';
import slashWind from '../art/fx/vfx/slash_wind.png';
import dustWhite from '../art/fx/vfx/dust_white.png';
import dustGold from '../art/fx/vfx/dust_gold.png';
import puffWhite from '../art/fx/vfx/puff_white.png';
import puffFire from '../art/fx/vfx/puff_fire.png';
import puffIce from '../art/fx/vfx/puff_ice.png';
import puffSand from '../art/fx/vfx/puff_sand.png';
import puffWind from '../art/fx/vfx/puff_wind.png';
import puffBlood from '../art/fx/vfx/puff_blood.png';
import rippleWater from '../art/fx/vfx/ripple_water.png';
import splashWater from '../art/fx/vfx/splash_water.png';
import sparkleFire from '../art/fx/vfx/sparkle_fire.png';
import sparkleLight from '../art/fx/vfx/sparkle_light.png';
import sparkleWhite from '../art/fx/vfx/sparkle_white.png';
import flameFire from '../art/fx/vfx/flame_fire.png';
import dashWhite from '../art/fx/vfx/dash_white.png';
import hitLight from '../art/fx/vfx/hit_light.png';
import smokeDark from '../art/fx/vfx/smoke_dark.png';
import pillarLight from '../art/fx/vfx/pillar_light.png';
import levelupGold from '../art/fx/vfx/levelup_gold.png';
import starGold from '../art/fx/vfx/star_gold.png';
import statusFire from '../art/fx/vfx/status_fire.png';
import statusBlood from '../art/fx/vfx/status_blood.png';
import statusWind from '../art/fx/vfx/status_wind.png';
import statusIce from '../art/fx/vfx/status_ice.png';
import pinkHeart from '../art/fx/magic/pink_heart.png';
import earthShield from '../art/fx/magic/earth_shield.png';
import darkSlash from '../art/fx/magic/dark_slash.png';

const SHEETS = {
  slashLight,
  slashEarth,
  slashWind,
  dustWhite,
  dustGold,
  puffWhite,
  puffFire,
  puffIce,
  puffSand,
  puffWind,
  puffBlood,
  rippleWater,
  splashWater,
  sparkleFire,
  sparkleLight,
  sparkleWhite,
  flameFire,
  dashWhite,
  hitLight,
  smokeDark,
  pillarLight,
  levelupGold,
  starGold,
  statusFire,
  statusBlood,
  statusWind,
  statusIce,
  pinkHeart,
  earthShield,
  darkSlash,
} as const;

export type VfxKey = keyof typeof SHEETS;

/** Each sheet's frames, by key (empty until `loadVfxArt` has run). */
export const VFX = {} as Record<VfxKey, Texture[]>;

async function strip(url: string, size: number): Promise<Texture[]> {
  const base = Texture.from(await loadImage(url));
  const n = Math.floor(base.width / size);
  return Array.from({ length: n }, (_, i) => new Texture({ source: base.source, frame: new Rectangle(i * size, 0, size, size) }));
}

export async function loadVfxArt(): Promise<void> {
  const keys = Object.keys(SHEETS) as VfxKey[];
  const strips = await Promise.all(keys.map((k) => strip(SHEETS[k], 32)));
  keys.forEach((k, i) => (VFX[k] = strips[i]));
}
