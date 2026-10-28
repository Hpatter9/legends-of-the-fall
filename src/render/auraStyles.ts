// The aura an awakened hero wears (AWAKEN-002): a hero keeps its own colours, and its class trait (`traitsOf(kind)[1]`,
// not its origin) picks the aura's style. The first awakened step (rank 5) wears a light aura; the second (rank 6) a
// bigger, brighter one with more parts.
//
// The art seam: this table names each step's parts (`ground`, `back`, `rise`, `halo`, `orbit`, `motes`, `trail`...)
// and says where and how they sit; the frames of a part come only from the aura atlas, by the part's key
// (`<class>.<step>.<part>`, `auraKey`), through `auraArt.ts`. Today the atlas holds strips of the 5000 Pixel Effects pack
// (`tools/awaken/aura-sheets.py` packs them, by `tools/awaken/aura-pack.json`); a painted atlas with the same keys
// replaces it with no code change (`docs/notes/awaken-auras-art-brief.md`).
//
// Pure data and rules: no Pixi, no DOM.

import { traitsOf } from '../sim/traits';

/** Where a part sits round the hero.
 *  ground: flat under the feet; wrap: one behind the body's middle; rise: rings rising from the feet;
 *  halo: flat over the head; orbit: a few circling the body (dimmer behind it); motes: a few placed round the body,
 *  each on its own beat; trail: speed lines streaming back from the body. */
export type AuraPlace = 'ground' | 'wrap' | 'rise' | 'halo' | 'orbit' | 'motes' | 'trail';

export interface AuraPart {
  /** The part's name within its step (unique there): with the class and step, its key in the atlas. */
  role: string;
  /** Its key in the aura atlas (`auraKey`); set when the table is built. */
  key: string;
  place: AuraPlace;
  /** How many (orbit, motes, trail); 1 for the rest. */
  count?: number;
  /** Size, as a share of the hero's height (a frame is square). */
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
  /** A ground part drawn as a ring seen from above (squashed flat), rather than a ring already drawn flat. */
  ring?: boolean;
  /** Motes that stand on the ground (flames, smoke) rather than float round the body. */
  low?: boolean;
  /** Orbiting pieces turned along their path (arcs, blades). */
  turn?: boolean;
}

export interface AuraStyle {
  /** The class trait it is for. */
  trait: string;
  /** A short name for the notes and the mock-up. */
  name: string;
  /** The aura's colour: the soft glow behind the body, and the rim round it. */
  colour: number;
  /** The parts of each step (index 1 and 2; 0 is none). */
  steps: readonly [readonly AuraPart[], readonly AuraPart[], readonly AuraPart[]];
}

/** A part's key in the aura atlas. */
export const auraKey = (trait: string, step: number, role: string): string => `${trait}.${step}.${role}`;

const p = (role: string, place: AuraPlace, size: number, alpha: number, more: Partial<AuraPart> = {}): AuraPart => ({ role, key: '', place, size, alpha, frameMs: 130, ...more });

/** Every class trait's aura. */
const TABLE: Record<string, AuraStyle> = {
  guardian: { trait: 'guardian', name: 'Golden shield shimmer', colour: 0xffd24a, steps: [[], [
    p('ground', 'ground', 0.95, 0.85),
    p('back', 'wrap', 1.05, 0.38, { add: true }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('back', 'wrap', 1.25, 0.5, { add: true }),
    p('rise', 'rise', 1.0, 0.75, { add: true }),
    p('motes', 'motes', 0.5, 0.95, { count: 3, extra: true, front: true }),
  ]] },
  bulwark: { trait: 'bulwark', name: 'Bronze bastion', colour: 0xf0b860, steps: [[], [
    p('ground', 'ground', 1.0, 0.9),
    p('back', 'wrap', 1.1, 0.55, { add: true }),
  ], [
    p('ground', 'ground', 1.25, 1),
    p('ground2', 'ground', 1.6, 0.7, { add: true, ring: true }),
    p('back', 'wrap', 1.3, 0.65, { add: true }),
    p('rise', 'rise', 1.05, 0.7, { add: true, extra: true }),
  ]] },
  blade: { trait: 'blade', name: 'Crimson streaks', colour: 0xe0304a, steps: [[], [
    p('ground', 'ground', 0.95, 0.8),
    p('motes', 'motes', 0.4, 0.95, { count: 2, front: true, frameMs: 110 }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('rise', 'rise', 1.0, 0.7),
    p('orbit', 'orbit', 0.42, 0.95, { count: 2, front: true, frameMs: 100, turn: true }),
    p('motes', 'motes', 0.45, 1, { count: 2, front: true, frameMs: 100, extra: true }),
  ]] },
  marksman: { trait: 'marksman', name: 'Wind wisps', colour: 0xdbe8f4, steps: [[], [
    p('ground', 'ground', 0.95, 0.8),
    p('trail', 'trail', 0.6, 0.75, { count: 2 }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('back', 'wrap', 1.2, 0.4),
    p('rise', 'rise', 1.0, 0.7),
    p('trail', 'trail', 0.7, 0.85, { count: 3, front: true }),
    p('motes', 'motes', 0.5, 0.9, { count: 2, front: true, extra: true }),
  ]] },
  gunner: { trait: 'gunner', name: 'Gunsmoke and sparks', colour: 0xf2d35a, steps: [[], [
    p('ground', 'ground', 0.95, 0.8),
    p('motes', 'motes', 0.5, 0.55, { count: 2, low: true }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('rise', 'rise', 1.0, 0.75, { add: true }),
    p('motes', 'motes', 0.6, 0.6, { count: 3, low: true }),
    p('motes2', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  caster: { trait: 'caster', name: 'Orbiting arcane runes', colour: 0xb06cff, steps: [[], [
    p('ground', 'ground', 1.05, 0.85, { ring: true }),
    p('orbit', 'orbit', 0.32, 1, { count: 2, front: true }),
  ], [
    p('ground', 'ground', 1.35, 0.95, { ring: true }),
    p('back', 'wrap', 1.2, 0.42, { add: true }),
    p('rise', 'rise', 1.0, 0.7, { extra: true }),
    p('orbit', 'orbit', 0.36, 1, { count: 3, front: true }),
  ]] },
  arcanist: { trait: 'arcanist', name: 'Starlit sigils', colour: 0x7a86ff, steps: [[], [
    p('ground', 'ground', 1.05, 0.85, { ring: true }),
    p('motes', 'motes', 0.5, 1, { count: 2, front: true }),
  ], [
    p('ground', 'ground', 1.4, 0.9, { ring: true }),
    p('back', 'wrap', 1.25, 0.45),
    p('halo', 'halo', 0.55, 0.95),
    p('orbit', 'orbit', 0.3, 1, { count: 2, front: true }),
    p('motes', 'motes', 0.5, 1, { count: 3, front: true, extra: true }),
  ]] },
  support: { trait: 'support', name: 'Radiant motes and halo', colour: 0xfff0b8, steps: [[], [
    p('halo', 'halo', 0.45, 0.9, { add: true }),
    p('motes', 'motes', 0.5, 0.95, { count: 2, front: true }),
  ], [
    p('back', 'wrap', 1.15, 0.35, { add: true }),
    p('halo', 'halo', 0.55, 1, { add: true }),
    p('rise', 'rise', 1.0, 0.6, { add: true }),
    p('motes', 'motes', 0.5, 1, { count: 4, front: true, extra: true }),
  ]] },
  beast: { trait: 'beast', name: 'Feral flame', colour: 0xff6a2a, steps: [[], [
    p('ground', 'ground', 0.95, 0.8),
    p('motes', 'motes', 0.5, 0.85, { count: 2, low: true }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('rise', 'rise', 1.0, 0.75),
    p('motes', 'motes', 0.62, 0.9, { count: 3, low: true }),
    p('motes2', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  assassin: { trait: 'assassin', name: 'Shadow smoke', colour: 0x6a46a8, steps: [[], [
    p('ground', 'ground', 0.95, 0.85),
    p('motes', 'motes', 0.5, 0.7, { count: 2, low: true }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('rise', 'rise', 1.0, 0.8),
    p('motes', 'motes', 0.62, 0.75, { count: 4, low: true }),
    p('motes2', 'motes', 0.5, 1, { count: 2, front: true, extra: true }),
  ]] },
  trickster: { trait: 'trickster', name: 'Moonlit mist', colour: 0xc6d2ff, steps: [[], [
    p('ground', 'ground', 0.95, 0.8),
    p('motes', 'motes', 0.5, 0.6, { count: 2, low: true }),
  ], [
    p('ground', 'ground', 1.2, 0.95),
    p('back', 'wrap', 1.2, 0.4),
    p('motes', 'motes', 0.6, 0.65, { count: 3, low: true }),
    p('motes2', 'motes', 0.5, 1, { count: 3, front: true, extra: true }),
  ]] },
  warden: { trait: 'warden', name: 'Living green', colour: 0x6cd060, steps: [[], [
    p('ground', 'ground', 0.95, 0.85),
    p('motes', 'motes', 0.5, 1, { count: 2, front: true }),
  ], [
    p('ground', 'ground', 1.35, 0.95, { ring: true }),
    p('back', 'wrap', 1.2, 0.38),
    p('rise', 'rise', 1.0, 0.7),
    p('motes', 'motes', 0.5, 1, { count: 4, front: true, extra: true }),
  ]] },
  vanguard: { trait: 'vanguard', name: 'Heat-haze charge', colour: 0xffa040, steps: [[], [
    p('rise', 'rise', 0.95, 0.6, { add: true }),
    p('trail', 'trail', 0.65, 0.95, { count: 2, front: true }),
  ], [
    p('ground', 'ground', 1.2, 0.9),
    p('rise', 'rise', 1.1, 0.6, { add: true }),
    p('trail', 'trail', 0.7, 0.9, { count: 3, front: true }),
    p('motes', 'motes', 0.45, 1, { count: 2, front: true, extra: true }),
  ]] },
};

/** Every class trait's aura, each part given its atlas key. */
export const AURAS: Readonly<Record<string, AuraStyle>> = Object.fromEntries(
  Object.entries(TABLE).map(([id, a]) => [id, { ...a, steps: a.steps.map((parts, step) => parts.map((x) => ({ ...x, key: auraKey(id, step, x.role) }))) as unknown as AuraStyle['steps'] }]),
);

/** The class a hero's aura falls back to when its class has no aura (none today): the golden shield. */
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

/** Every part's atlas key, in order (what an atlas must hold: the pack's today, a painted one later). */
export const AURA_KEYS: readonly string[] = Object.values(AURAS).flatMap((a) => a.steps.flatMap((s) => s.map((x) => x.key)));
