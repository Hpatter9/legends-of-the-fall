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

/** How a painted still is posed at one moment. `x`/`y` scale it, `turn` adds to its rotation, `alpha` multiplies its opacity, and `dx`/`dy` move it
 *  from where it was put, in frame widths (1 = the sprite's own 32 logical px at its scale), so a flame can rise and a meteor's burst can billow. */
export interface PaintedPose { x: number; y: number; turn: number; alpha: number; dx: number; dy: number }

/** A flicker in -1..1: three sines that never line up, so a flame's height and lean wander instead of pulsing. Smooth, so it never blinks. */
export const flicker = (elapsed: number, phase = 0): number => 0.5 * Math.sin(elapsed * 0.021 + phase) + 0.3 * Math.sin(elapsed * 0.037 + 1.7 + phase * 1.3) + 0.2 * Math.sin(elapsed * 0.058 + 0.4 + phase * 0.7);

/** Forms that are fire: they lick and lean as well as the family's own motion. */
const FIERY: readonly string[] = ['fire', 'fireRing', 'orb'];

/** Every painted still is one picture, so its life is in its pose: this is what makes a flame flicker, a burst billow and swell, a ward breathe and
 *  turn, a smoke rise, a bolt fall into place and a spike jab up. Loops hold their body (and their opacity) until their final fade. Pure: the same
 *  inputs give the same pose, so it needs no random stream. */
export function paintedPose(family: Family, progress: number, elapsed: number, loop: boolean, calm: boolean, form?: string): PaintedPose {
  const t = Math.max(0, Math.min(1, progress));
  const fade = Math.min(1, t * 14 + 0.2) * Math.min(1, (1 - t) * 4);
  if (calm) return { x: 1, y: 1, turn: 0, alpha: fade, dx: 0, dy: 0 };
  const ease = 1 - (1 - t) ** 3;
  const fast = 1 - (1 - t) ** 5;
  const fiery = form !== undefined && FIERY.includes(form);
  const fl = flicker(elapsed);
  const lick = fiery ? 1 : 0.35;
  switch (family) {
    case 'slash': return { x: 0.8 + ease * 0.4, y: 0.65 + ease * 0.45, turn: -0.32 + ease * 0.6, alpha: fade, dx: 0.12 * ease, dy: 0 };
    case 'wave': return { x: 0.5 + ease * 1.1, y: 0.5 + ease * 1.1, turn: 0, alpha: fade * 0.65, dx: 0, dy: 0 };
    // (a rune or ring turns slowly and breathes; fire rings lick as well)
    case 'circle': case 'rune': case 'aura': return { x: 1 + 0.05 * Math.sin(elapsed * 0.004) + 0.03 * lick * fl, y: 1 + 0.05 * Math.sin(elapsed * 0.004) + 0.03 * lick * fl, turn: elapsed * 0.0007, alpha: fade * 0.65, dx: 0, dy: 0 };
    case 'smoke': case 'puff': return { x: 0.65 + ease * 0.55, y: 0.7 + ease * 0.55, turn: elapsed * 0.00012 + ease * 0.25, alpha: fade * 0.7, dx: 0.14 * ease, dy: -0.55 * ease };
    case 'shield': return { x: 0.9 + ease * 0.1 + 0.025 * Math.sin(elapsed * 0.006), y: 0.85 + ease * 0.15 + 0.025 * Math.sin(elapsed * 0.006 + 1), turn: 0.03 * Math.sin(elapsed * 0.003), alpha: fade * 0.7, dx: 0, dy: 0.03 * Math.sin(elapsed * 0.004) };
    // (a held flame or ailment: height and lean wander, and it rises a little as it burns)
    case 'flame': return { x: 0.9 - 0.08 * lick * fl, y: 1 + 0.16 * lick * fl + 0.04 * Math.sin(elapsed * 0.004), turn: 0.07 * flicker(elapsed, 2.1) * lick, alpha: fade * 0.8, dx: 0.02 * flicker(elapsed, 4), dy: -0.05 * (0.5 + 0.5 * fl) };
    case 'gather': case 'status': return { x: 0.9 + Math.sin(elapsed * 0.005) * 0.05 + 0.04 * lick * fl, y: 0.95 + Math.sin(elapsed * 0.004) * 0.08 + 0.08 * lick * fl, turn: family === 'gather' ? elapsed * 0.0011 : 0.05 * Math.sin(elapsed * 0.006) * lick, alpha: fade * 0.8, dx: 0, dy: form === 'heal' ? -0.3 * t : -0.04 * lick * (0.5 + 0.5 * fl) };
    // (a bolt or a column drops into place and then shimmers)
    case 'pillar': case 'strike': return { x: 0.85 + ease * 0.15 + 0.03 * Math.sin(elapsed * 0.02), y: 0.5 + ease * 0.55 + 0.04 * Math.sin(elapsed * 0.017 + 1), turn: 0, alpha: fade * 0.85, dx: 0, dy: -0.6 * (1 - fast) * (1 - fast) };
    // (spikes jab up out of the ground, the foot of them staying put)
    case 'spikes': { const y = 0.25 + 0.8 * fast; return { x: 0.8 + 0.25 * fast, y, turn: 0, alpha: fade, dx: 0, dy: (1 - y) * 0.5 }; }
    case 'vortex': return { x: 1 + 0.05 * Math.sin(elapsed * 0.006), y: 1 + 0.05 * Math.sin(elapsed * 0.006), turn: elapsed * 0.001, alpha: fade * 0.75, dx: 0, dy: 0 };
    // (a ball is pulsing, and a fire ball leaps and sputters)
    case 'orb': return { x: 1 + 0.06 * Math.sin(elapsed * 0.018) + 0.05 * lick * fl, y: 1 + 0.06 * Math.sin(elapsed * 0.018 + 1) + 0.07 * lick * fl, turn: 0, alpha: fade, dx: 0, dy: 0 };
    case 'sparkle': case 'cross': return { x: 0.7 + ease * 0.4 + 0.12 * Math.sin(elapsed * 0.016), y: 0.7 + ease * 0.4 + 0.12 * Math.sin(elapsed * 0.016), turn: elapsed * 0.0006, alpha: fade, dx: 0, dy: -0.25 * t };
    // (a burst, a hit or a nova: it slams out fast, keeps swelling as it fades, and the fiery ones billow upward and lick)
    default: return { x: 0.4 + fast * 0.75 + t * 0.25 - 0.06 * lick * fl, y: 0.4 + fast * 0.75 + t * 0.3 + 0.1 * lick * fl, turn: (fiery ? 0.45 : 0.12) * ease, alpha: fade * (loop ? 0.7 : 1), dx: 0, dy: -(fiery ? 0.3 : 0.1) * ease };
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
