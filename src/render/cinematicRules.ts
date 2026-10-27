// Painted combat art keeps the existing event vocabulary. Shapes and motion belong to the presentation only.
import type { Element, Family } from './fxRules';

export type Form = typeof FORMS[number];
export const FORMS = ['slash', 'orb', 'fire', 'smoke', 'bolt', 'ice', 'shield', 'rune', 'heal', 'poison', 'dark', 'spark', 'stone', 'wind', 'blood', 'pillar',
  'arrow', 'bone', 'heart', 'cross', 'ripple', 'splash', 'sparks', 'dust', 'dash', 'soul', 'fireRing', 'vines', 'beam', 'snare', 'nova', 'electric'] as const;
export type PaintedElement = Element | 'moon' | 'star' | 'water';
export const PALETTE: Record<PaintedElement, number> = {
  moon: 0xcdd5ff, star: 0xffdf9a, water: 0x68deed,
  fire: 0xffa448, ice: 0x8cddff, lightning: 0x77cfff, light: 0xffdf91, dark: 0xbb70ff,
  forest: 0x92eb99, poison: 0xc57bed, earth: 0xcfa36d, wind: 0xc4ecf5, blood: 0xf65563,
};

/** Native silhouettes give each element an identity beyond a change of colour. */
export function formOf(element: PaintedElement, family: Family): Form {
  if (element === 'water' && ['orb', 'hit', 'explosion', 'puff', 'spikes'].includes(family)) return 'splash';
  const el = element === 'moon' || element === 'star' ? 'light' : element === 'water' ? 'ice' : element;
  switch (family) {
    case 'orb': return el === 'fire' ? 'orb' : el === 'ice' ? 'ice' : el === 'lightning' ? 'electric' : el === 'forest' ? 'heal' : el === 'poison' ? 'poison' : el === 'earth' ? 'stone' : el === 'dark' ? 'soul' : 'spark';
    case 'slash': return el === 'dark' ? 'dark' : 'slash';
    case 'circle': return el === 'fire' ? 'fireRing' : el === 'forest' ? 'vines' : 'rune';
    case 'rune': case 'aura': return 'rune';
    case 'wave': return el === 'ice' ? 'ripple' : el === 'fire' ? 'fireRing' : 'rune';
    case 'shield': return 'shield';
    case 'sparkle': return 'spark';
    case 'cross': return 'cross';
    case 'smoke': return el === 'poison' ? 'poison' : el === 'earth' || el === 'wind' ? 'dust' : 'smoke';
    case 'puff': return el === 'fire' ? 'fire' : el === 'poison' ? 'poison' : el === 'blood' ? 'blood' : 'dust';
    case 'gather': return 'heal';
    case 'vortex': return 'wind';
    case 'pillar': return 'pillar';
    case 'strike': return el === 'lightning' ? 'bolt' : el === 'ice' ? 'ice' : 'pillar';
    case 'spikes': return el === 'ice' ? 'ice' : 'stone';
    case 'flame': return el === 'fire' ? 'fire' : 'heal';
    case 'status': return el === 'poison' ? 'poison' : el === 'ice' ? 'ice' : el === 'fire' ? 'fire' : el === 'blood' ? 'blood' : 'heal';
    case 'nova': return 'nova';
    default: return el === 'fire' ? 'fire' : el === 'ice' ? 'ice' : el === 'lightning' ? 'bolt' : el === 'earth' ? 'stone' : el === 'blood' ? 'blood' : el === 'forest' ? 'heal' : el === 'poison' ? 'poison' : el === 'dark' ? 'dark' : 'sparks';
  }
}

export interface PaintedPose { x: number; y: number; turn: number; alpha: number }

/** Continuous motion avoids stepping through enlarged pixel frames. Loops hold their body until their final fade. */
export function paintedPose(family: Family, progress: number, elapsed: number, loop: boolean, calm: boolean): PaintedPose {
  const t = Math.max(0, Math.min(1, progress));
  const fade = Math.min(1, t * 14 + 0.2) * Math.min(1, (1 - t) * 4);
  if (calm) return { x: 1, y: 1, turn: 0, alpha: fade };
  const ease = 1 - (1 - t) ** 3;
  switch (family) {
    case 'slash': return { x: 0.8 + ease * 0.4, y: 0.65 + ease * 0.45, turn: -0.32 + ease * 0.6, alpha: fade };
    case 'wave': return { x: 0.5 + ease * 1.1, y: 0.5 + ease * 1.1, turn: 0, alpha: fade * 0.65 };
    case 'circle': case 'rune': case 'aura': return { x: 1, y: 1, turn: 0, alpha: fade * 0.65 };
    case 'smoke': case 'puff': return { x: 0.65 + ease * 0.55, y: 0.7 + ease * 0.55, turn: elapsed * 0.00012, alpha: fade * 0.7 };
    case 'shield': return { x: 0.9 + ease * 0.1, y: 0.85 + ease * 0.15, turn: 0, alpha: fade * 0.7 };
    case 'gather': case 'flame': case 'status': return { x: 0.9 + Math.sin(elapsed * 0.005) * 0.05, y: 0.95 + Math.sin(elapsed * 0.004) * 0.08, turn: 0, alpha: fade * 0.8 };
    case 'pillar': case 'strike': return { x: 0.85 + ease * 0.15, y: 0.5 + ease * 0.55, turn: 0, alpha: fade * 0.85 };
    case 'vortex': return { x: 1, y: 1, turn: elapsed * 0.001, alpha: fade * 0.75 };
    case 'orb': return { x: 1, y: 1, turn: 0, alpha: fade };
    case 'sparkle': case 'cross': return { x: 0.7 + ease * 0.4, y: 0.7 + ease * 0.4, turn: elapsed * 0.0006, alpha: fade };
    default: return { x: 0.55 + ease * 0.65, y: 0.55 + ease * 0.65, turn: 0, alpha: fade * (loop ? 0.7 : 1) };
  }
}

/** The small effect catalogue is pure data, shared with the signature validation. */
export const VFX_LOOKS = {
  slashLight: ['wind', 'slash'], slashEarth: ['earth', 'slash'], slashWind: ['wind', 'slash'],
  dustWhite: ['wind', 'puff'], dustGold: ['light', 'sparkle'], puffWhite: ['wind', 'puff'],
  puffFire: ['fire', 'puff'], puffIce: ['ice', 'puff'], puffSand: ['earth', 'puff'], puffWind: ['wind', 'puff'],
  puffBlood: ['blood', 'puff'], rippleWater: ['ice', 'wave'], splashWater: ['ice', 'hit', 'splash'],
  sparkleFire: ['fire', 'sparkle'], sparkleLight: ['light', 'sparkle'], sparkleWhite: ['wind', 'sparkle'],
  flameFire: ['fire', 'flame'], dashWhite: ['wind', 'slash', 'dash'], hitLight: ['light', 'hit'],
  smokeDark: ['dark', 'smoke'], pillarLight: ['light', 'pillar'], levelupGold: ['light', 'gather'],
  starGold: ['light', 'cross'], statusFire: ['fire', 'status'], statusBlood: ['blood', 'status'],
  statusWind: ['wind', 'status'], statusIce: ['ice', 'status'], earthShield: ['light', 'shield'],
  darkSlash: ['dark', 'slash'], pinkHeart: ['light', 'status', 'heart'],
} as const satisfies Record<string, readonly [Element, Family, Form?]>;
