// The aura a hero wears at combat tiers 2 and 3: a hero keeps its own colours, and its class trait (`traitsOf(kind)[1]`,
// not its origin) picks the aura's style. Combat tier 2 wears a light aura; combat tier 3 a
// bigger, brighter one with more parts.
//
// The art seam: this table names each step's parts (`ground`, `shell`, `rise`, `halo`, `orbit`, `motes`, `trail`...)
// and says where and how they sit; the frames of a part come only from the aura atlas, by the part's key
// (`<class>.<step>.<part>`, `auraKey`), through `auraArt.ts`. AURAS-BLENDER: the atlas is rendered in Blender, every
// class's parts in its own shapes and colours (`tools/blender-fx/auras/build.py`; `docs/notes/auras-blender.md`).
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

/** AURAS-BLENDER: the parts every class wears, the same at heart for each. Step 1, the light aura: the ring on the ground under
 *  the feet, a faint shell behind the body and the wisps rising at its rim. Step 2, the strong one: a fuller ring, a shimmering shell behind the body (hollow
 *  where the body stands, and added light), more wisps and a few motes at the sides. None of it is in front of the body: the
 *  ring lies under the feet, the rest stands behind and shows round the edges (the owner's rule: an effect never hides a hero). */
const light = (...own: AuraPart[]): AuraPart[] => [p('ground', 'ground', 1.0, 0.95), p('shell', 'wrap', 1.25, 0.5, { add: true }), p('rise', 'rise', 1.7, 1), ...own];
const strong = (low: boolean, ...own: AuraPart[]): AuraPart[] => [
  p('ground', 'ground', 1.25, 0.95),
  p('shell', 'wrap', 1.45, 0.75, { add: true }),
  p('rise', 'rise', 1.9, 1),
  ...own,
  p('motes', 'motes', 0.7, 1, { count: 3, extra: true, ...(low ? { low: true } : {}) }),
];

/** Every class trait's aura: its name, its colour and its own pieces beyond the shared ones. The frames are rendered in Blender,
 *  each class's in its own shapes (`tools/blender-fx/auras/build.py`, `RECIPES`): the Guardian's six-sided seal and shafts of
 *  light, the Beast's burning ring and tongues of flame, the Assassin's dark pool and smoke. */
const TABLE: Record<string, AuraStyle> = {
  guardian: { trait: 'guardian', name: 'Golden ward', colour: 0xffd24a, steps: [[], light(), strong(false)] },
  bulwark: { trait: 'bulwark', name: 'Bronze bastion', colour: 0xf0b860, steps: [[], light(), strong(false, p('ground2', 'ground', 1.7, 0.8, { add: true }))] },
  blade: { trait: 'blade', name: 'Crimson edge', colour: 0xe0304a, steps: [[], light(), strong(false, p('orbit', 'orbit', 0.42, 0.95, { count: 2, frameMs: 100, turn: true }))] },
  marksman: { trait: 'marksman', name: 'Wind wisps', colour: 0xdbe8f4, steps: [[], light(p('trail', 'trail', 0.6, 0.8, { count: 2 })), strong(false, p('trail', 'trail', 0.7, 0.9, { count: 3 }))] },
  gunner: { trait: 'gunner', name: 'Gunsmoke and sparks', colour: 0xf2d35a, steps: [[], light(), strong(false, p('sparks', 'rise', 1.8, 1, { extra: true }))] },
  caster: { trait: 'caster', name: 'Arcane seal and runes', colour: 0xb06cff, steps: [[], light(p('orbit', 'orbit', 0.3, 0.95, { count: 2 })), strong(false, p('orbit', 'orbit', 0.34, 1, { count: 3 }))] },
  arcanist: { trait: 'arcanist', name: 'Starlit sigil', colour: 0x7a86ff, steps: [[], light(), strong(false, p('halo', 'halo', 0.55, 0.95))] },
  support: { trait: 'support', name: 'Radiance and halo', colour: 0xfff0b8, steps: [[], light(p('halo', 'halo', 0.45, 0.9)), strong(false, p('halo', 'halo', 0.55, 1))] },
  beast: { trait: 'beast', name: 'Feral flame', colour: 0xff6a2a, steps: [[], light(), strong(true, p('embers', 'rise', 1.8, 1, { extra: true }))] },
  assassin: { trait: 'assassin', name: 'Shadow smoke', colour: 0x6a46a8, steps: [[], light(), strong(true)] },
  trickster: { trait: 'trickster', name: 'Moonlit mist', colour: 0xc6d2ff, steps: [[], light(), strong(false, p('stars', 'rise', 1.8, 1, { extra: true }))] },
  warden: { trait: 'warden', name: 'Living green', colour: 0x6cd060, steps: [[], light(), strong(false, p('sparks', 'rise', 1.8, 1, { extra: true }))] },
  vanguard: { trait: 'vanguard', name: 'Heat of the charge', colour: 0xffa040, steps: [[], light(p('trail', 'trail', 0.6, 0.85, { count: 2 })), strong(true, p('trail', 'trail', 0.7, 0.9, { count: 3 }))] },
};

/** Every class trait's aura, each part given its atlas key. */
export const AURAS: Readonly<Record<string, AuraStyle>> = Object.fromEntries(
  Object.entries(TABLE).map(([id, a]) => [id, { ...a, steps: a.steps.map((parts, step) => parts.map((x) => ({ ...x, key: auraKey(id, step, x.role) }))) as unknown as AuraStyle['steps'] }]),
);

/** The class a hero's aura falls back to when its class has no aura (none today): the golden shield. */
export const FALLBACK_AURA = 'guardian';
/** A foe a cinematic shows awakened (the Orc Warlord rising) has no class: it wears the feral flame. */
export const FOE_AURA = 'beast';

/** A hero's aura style, by its class trait (a foe's: the feral flame). */
export function auraOf(kind: string): AuraStyle {
  const traits = traitsOf(kind);
  if (!traits.length) return AURAS[FOE_AURA];
  return AURAS[traits[1] ?? ''] ?? AURAS[FALLBACK_AURA];
}

/** The parts a hero wears at an awakened step (none below 1), without the extras on battery saver. */
export function auraParts(kind: string, step: number, saver = false): readonly AuraPart[] {
  const s = Math.max(0, Math.min(2, step));
  const parts = auraOf(kind).steps[s];
  return saver ? parts.filter((x) => !x.extra) : parts;
}

/** Every part's atlas key, in order (what an atlas must hold: the pack's today, a painted one later). */
export const AURA_KEYS: readonly string[] = Object.values(AURAS).flatMap((a) => a.steps.flatMap((s) => s.map((x) => x.key)));
