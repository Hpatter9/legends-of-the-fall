// The aura an awakened hero wears (AWAKEN-002): a hero keeps its own colours, and its class trait (`traitsOf(kind)[1]`,
// not its origin) picks the aura's style. The first awakened step (rank 5) wears a light aura; the second (rank 6) a
// bigger, brighter one with more parts. Every part is a looping strip of the **5000 Pixel Effects** pack (32px frames,
// copied into `src/art/fx/aura/`), placed round the hero by `awakenAura.ts`.
//
// Pure data and rules: no Pixi, no DOM.

import { traitsOf } from '../sim/traits';

/** Where a part sits round the hero.
 *  ground: flat under the feet; wrap: one behind the body's middle; rise: rings rising from the feet;
 *  halo: flat over the head; orbit: a few circling the body (dimmer behind it); motes: a few placed round the body,
 *  each on its own beat; trail: speed lines streaming back from the body. */
export type AuraPlace = 'ground' | 'wrap' | 'rise' | 'halo' | 'orbit' | 'motes' | 'trail';

export interface AuraPart {
  /** The pack strip (its folder name in `pixel-effects/sprites/`). */
  sheet: string;
  place: AuraPlace;
  /** How many (orbit, motes, trail); 1 for the rest. */
  count?: number;
  /** Size, as a share of the hero's height (a strip's frame is square). */
  size: number;
  alpha: number;
  /** Ms a frame shows. */
  frameMs: number;
  /** In front of the body (otherwise behind it). */
  front?: boolean;
  /** Added light (glows) rather than painted over. */
  add?: boolean;
  /** Dropped on battery saver. */
  extra?: boolean;
}

export interface AuraStyle {
  /** The class trait it is for. */
  trait: string;
  /** A short name for the notes and the mock-up. */
  name: string;
  /** The aura's colour: the soft glow behind the body, and the rim round it at the second step. */
  colour: number;
  /** The parts of each step (index 1 and 2). */
  steps: readonly [readonly AuraPart[], readonly AuraPart[], readonly AuraPart[]];
}

const p = (sheet: string, place: AuraPlace, size: number, alpha: number, more: Partial<AuraPart> = {}): AuraPart => ({ sheet, place, size, alpha, frameMs: 130, ...more });

/** Every class trait's aura. */
export const AURAS: Readonly<Record<string, AuraStyle>> = {
  guardian: { trait: 'guardian', name: 'Golden shield shimmer', colour: 0xffd24a, steps: [[], [
    p('light-circle-s', 'ground', 0.95, 0.85),
    p('light-shield-s', 'wrap', 1.05, 0.38, { add: true }),
  ], [
    p('light-circle-sb', 'ground', 1.2, 0.95),
    p('light-shield-sb', 'wrap', 1.25, 0.5, { add: true }),
    p('light-aura-s', 'rise', 1.0, 0.75, { add: true }),
    p('gold-sparkle-s', 'motes', 0.5, 0.95, { count: 3, extra: true, front: true }),
  ]] },
  bulwark: { trait: 'bulwark', name: 'Bronze bastion', colour: 0xf0b860, steps: [[], [
    p('sand-circle-sb', 'ground', 1.0, 0.9),
    p('sand-shield-sb', 'wrap', 1.1, 0.55, { add: true }),
  ], [
    p('sand-circle-sb', 'ground', 1.25, 1),
    p('light-rune-s', 'ground', 1.6, 0.7, { add: true }),
    p('sand-shield-sb', 'wrap', 1.3, 0.65, { add: true }),
    p('light-aura-s', 'rise', 1.05, 0.7, { add: true, extra: true }),
  ]] },
  blade: { trait: 'blade', name: 'Crimson streaks', colour: 0xe0304a, steps: [[], [
    p('blood-circle-s', 'ground', 0.95, 0.8),
    p('blood-cut', 'motes', 0.4, 0.95, { count: 2, front: true, frameMs: 110 }),
  ], [
    p('blood-circle-sb', 'ground', 1.2, 0.95),
    p('blood-aura-s', 'rise', 1.0, 0.7),
    p('blood-slash-b', 'orbit', 0.42, 0.95, { count: 2, front: true, frameMs: 100 }),
    p('blood-cut-b', 'motes', 0.45, 1, { count: 2, front: true, frameMs: 100, extra: true }),
  ]] },
  marksman: { trait: 'marksman', name: 'Wind wisps', colour: 0xdbe8f4, steps: [[], [
    p('wind-circle-s', 'ground', 0.95, 0.8),
    p('white-dash-s', 'trail', 0.6, 0.75, { count: 2 }),
  ], [
    p('wind-circle-sb', 'ground', 1.2, 0.95),
    p('wind-vortex-s', 'wrap', 1.2, 0.4),
    p('wind-aura-s', 'rise', 1.0, 0.7),
    p('white-dash-s', 'trail', 0.7, 0.85, { count: 3, front: true }),
    p('wind-sparkle-s', 'motes', 0.5, 0.9, { count: 2, front: true, extra: true }),
  ]] },
  gunner: { trait: 'gunner', name: 'Gunsmoke and sparks', colour: 0xf2d35a, steps: [[], [
    p('lightning-circle-s', 'ground', 0.95, 0.8),
    p('white-smoke-s', 'motes', 0.5, 0.55, { count: 2 }),
  ], [
    p('lightning-circle-sb', 'ground', 1.2, 0.95),
    p('lightning-aura-s', 'rise', 1.0, 0.75, { add: true }),
    p('white-smoke-s', 'motes', 0.6, 0.6, { count: 3 }),
    p('lightning-sparkle-sb', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  caster: { trait: 'caster', name: 'Orbiting arcane runes', colour: 0xb06cff, steps: [[], [
    p('crystal-rune-s', 'ground', 1.05, 0.85),
    p('crystal-orb-s', 'orbit', 0.32, 1, { count: 2, front: true }),
  ], [
    p('crystal-rune-sb', 'ground', 1.35, 0.95),
    p('crystal-glyph-s', 'wrap', 1.2, 0.42, { add: true }),
    p('crystal-aura-s', 'rise', 1.0, 0.7, { extra: true }),
    p('crystal-orb-sb', 'orbit', 0.36, 1, { count: 3, front: true }),
  ]] },
  arcanist: { trait: 'arcanist', name: 'Starlit sigils', colour: 0x7a86ff, steps: [[], [
    p('star-rune-s', 'ground', 1.05, 0.85),
    p('star-sparkle-s', 'motes', 0.5, 1, { count: 2, front: true }),
  ], [
    p('star-glyph-sb', 'ground', 1.4, 0.9),
    p('star-vortex-s', 'wrap', 1.25, 0.45),
    p('star-rune-sb', 'halo', 0.55, 0.95),
    p('star-orb-sb', 'orbit', 0.3, 1, { count: 2, front: true }),
    p('star-sparkle-sb', 'motes', 0.5, 1, { count: 3, front: true, extra: true }),
  ]] },
  support: { trait: 'support', name: 'Radiant motes and halo', colour: 0xfff0b8, steps: [[], [
    p('light-rune-s', 'halo', 0.45, 0.9, { add: true }),
    p('light-sparkle-s', 'motes', 0.5, 0.95, { count: 2, front: true }),
  ], [
    p('light-pillar-s', 'wrap', 1.15, 0.35, { add: true }),
    p('light-rune-sb', 'halo', 0.55, 1, { add: true }),
    p('light-aura-s', 'rise', 1.0, 0.6, { add: true }),
    p('light-sparkle-sb', 'motes', 0.5, 1, { count: 4, front: true, extra: true }),
  ]] },
  beast: { trait: 'beast', name: 'Feral flame', colour: 0xff6a2a, steps: [[], [
    p('fire-circle-s', 'ground', 0.95, 0.8),
    p('fire-flame-s', 'motes', 0.5, 0.85, { count: 2 }),
  ], [
    p('fire-circle-sb', 'ground', 1.2, 0.95),
    p('fire-aura-s', 'rise', 1.0, 0.75),
    p('fire-flame-sb', 'motes', 0.62, 0.9, { count: 3 }),
    p('fire-sparkle-sb', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  assassin: { trait: 'assassin', name: 'Shadow smoke', colour: 0x6a46a8, steps: [[], [
    p('dark-circle-s', 'ground', 0.95, 0.85),
    p('dark-smoke-s', 'motes', 0.5, 0.7, { count: 2 }),
  ], [
    p('dark-circle-sb', 'ground', 1.2, 0.95),
    p('dark-aura-s', 'rise', 1.0, 0.8),
    p('dark-smoke-sb', 'motes', 0.62, 0.75, { count: 4 }),
    p('dark-sparkle-sb', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  trickster: { trait: 'trickster', name: 'Moonlit mist', colour: 0xc6d2ff, steps: [[], [
    p('moon-circle-s', 'ground', 0.95, 0.8),
    p('moon-smoke-s', 'motes', 0.5, 0.6, { count: 2 }),
  ], [
    p('moon-circle-sb', 'ground', 1.2, 0.95),
    p('moon-vortex-s', 'wrap', 1.2, 0.4),
    p('moon-smoke-sb', 'motes', 0.6, 0.65, { count: 3 }),
    p('moon-sparkle-sb', 'motes', 0.5, 1, { count: 3, front: true, extra: true }),
  ]] },
  warden: { trait: 'warden', name: 'Living green', colour: 0x6cd060, steps: [[], [
    p('forest-circle-s', 'ground', 0.95, 0.85),
    p('forest-sparkle-s', 'motes', 0.5, 1, { count: 2, front: true }),
  ], [
    p('forest-rune-sb', 'ground', 1.35, 0.95),
    p('forest-vortex-s', 'wrap', 1.2, 0.38),
    p('forest-aura-s', 'rise', 1.0, 0.7),
    p('forest-sparkle-sb', 'motes', 0.5, 1, { count: 4, front: true, extra: true }),
  ]] },
  vanguard: { trait: 'vanguard', name: 'Heat-haze charge', colour: 0xffa040, steps: [[], [
    p('fire-aura-s', 'rise', 0.95, 0.6, { add: true }),
    p('gold-dash-s', 'trail', 0.65, 0.95, { count: 2, front: true }),
  ], [
    p('fire-circle-sb', 'ground', 1.2, 0.9),
    p('fire-aura-sb', 'rise', 1.1, 0.6, { add: true }),
    p('gold-dash-s', 'trail', 0.7, 0.9, { count: 3, front: true }),
    p('lightning-sparkle-s', 'motes', 0.45, 1, { count: 2, front: true, extra: true }),
  ]] },
};

/** The class a hero's aura falls back to when its class has no aura (none today): the golden shield, the old gold glow's colour. */
export const FALLBACK_AURA = 'guardian';

/** A hero's aura style, by its class trait. */
export function auraOf(kind: string): AuraStyle {
  return AURAS[traitsOf(kind)[1] ?? ''] ?? AURAS[FALLBACK_AURA];
}

/** The parts a hero wears at an awakened step (none below 1), without the extras on battery saver. */
export function auraParts(kind: string, step: number, saver = false): readonly AuraPart[] {
  const s = Math.max(0, Math.min(2, step));
  const parts = auraOf(kind).steps[s];
  return saver ? parts.filter((x) => !x.extra) : parts;
}

/** Every pack strip any aura uses (for the copy tool and the loader). */
export const AURA_SHEETS: readonly string[] = [...new Set(Object.values(AURAS).flatMap((a) => a.steps.flatMap((s) => s.map((x) => x.sheet))))].sort();
