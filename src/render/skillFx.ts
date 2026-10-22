// Which effect each hero or foe skill shows: the sheet it plays on the caster as it goes off (`cast`), and the one it
// plays on each foe it strikes (`hit`). The sheets are the Pixel Effects pack's 32px strips (`src/art/fx/magic`), named
// here by key; `fx.ts` loads them. Pure data: no Pixi, no DOM, so the tests can check that every skill has an entry.

import type { SpellId } from '../sim/spells';

/** The effect sheets in `src/art/fx/magic`. */
export type MagicKey =
  | 'bloodExplosion'
  | 'darkCircle'
  | 'darkSlash'
  | 'earthBurst'
  | 'earthExplosion'
  | 'earthShield'
  | 'earthWave'
  | 'fireCircle'
  | 'fireExplosion'
  | 'goldBurst'
  | 'iceShield'
  | 'lightCircle'
  | 'lightGather'
  | 'lightNova'
  | 'lightningBurst'
  | 'lightningStrike'
  | 'moonSlash'
  | 'pinkHeart'
  | 'whiteBurst'
  | 'windBurst'
  | 'windVortex'
  | 'windWave';

export interface Effect {
  sheet: MagicKey;
  /** Size on screen (the sheet's frames are 32px). */
  scale: number;
  /** Ms a frame stays up (default 70). */
  frameMs?: number;
  /** Optional tint, for a sheet that wants another colour. */
  tint?: number;
}

export interface SkillFx {
  cast?: Effect;
  hit?: Effect;
}

/** Keyed by the skill's name (as in `KITS`, the `skill` event's `name`). */
export const SKILL_FX: Record<string, SkillFx> = {
  'Shield Wall': { cast: { sheet: 'earthShield', scale: 1.5 } },
  Iaido: { cast: { sheet: 'moonSlash', scale: 1.6 }, hit: { sheet: 'moonSlash', scale: 1 } },
  'Shadow Step': { cast: { sheet: 'darkCircle', scale: 1.2, tint: 0xb08af0 }, hit: { sheet: 'darkSlash', scale: 1.2 } },
  Volley: { hit: { sheet: 'windBurst', scale: 0.9 } },
  Meteor: { cast: { sheet: 'fireCircle', scale: 1.4 }, hit: { sheet: 'fireExplosion', scale: 1.3 } },
  'Thousand Fists': { hit: { sheet: 'whiteBurst', scale: 0.9, frameMs: 50 } },
  'Hold the Line': { cast: { sheet: 'iceShield', scale: 1.5 } },
  'Chain Lightning': { cast: { sheet: 'lightningBurst', scale: 1.2 }, hit: { sheet: 'lightningStrike', scale: 1.2 } },
  Sanctuary: { cast: { sheet: 'lightNova', scale: 1.8 } },
  'Fox Charm': { cast: { sheet: 'pinkHeart', scale: 1.4 } },
  Dive: { hit: { sheet: 'earthBurst', scale: 1 } },
  'Wind Gust': { cast: { sheet: 'windWave', scale: 1.6 }, hit: { sheet: 'windBurst', scale: 0.9 } },
  'Ground Slam': { cast: { sheet: 'earthWave', scale: 1.8 }, hit: { sheet: 'earthExplosion', scale: 1 } },
  'Horned Shove': { cast: { sheet: 'earthWave', scale: 1.4, tint: 0xffb080 }, hit: { sheet: 'earthBurst', scale: 0.9 } },
  'Summon Imps': { cast: { sheet: 'darkCircle', scale: 1.8, tint: 0xff7a4a } },
  Hellfire: { cast: { sheet: 'fireCircle', scale: 1.6 }, hit: { sheet: 'fireExplosion', scale: 1.1 } },
  'Spirit Ward': { cast: { sheet: 'lightCircle', scale: 1.6 } },
  'Holy Challenge': { cast: { sheet: 'lightCircle', scale: 1.6, tint: 0xffe27a } },
  Benediction: { cast: { sheet: 'lightGather', scale: 1.8 } },
  'Call Treant': { cast: { sheet: 'earthBurst', scale: 1.6, tint: 0x8aff5a } },
  Whirlwind: { cast: { sheet: 'windVortex', scale: 1.4, tint: 0xff9a6a }, hit: { sheet: 'bloodExplosion', scale: 0.6, frameMs: 50 } },
  'Snare Trap': { hit: { sheet: 'earthBurst', scale: 1 } },
  Hex: { cast: { sheet: 'darkCircle', scale: 1.4, tint: 0xb06aff }, hit: { sheet: 'darkSlash', scale: 1 } },
  'Mirror Image': { cast: { sheet: 'whiteBurst', scale: 1.5, tint: 0xd8b0ff } },
  'Dead Eye': { hit: { sheet: 'whiteBurst', scale: 1, frameMs: 50 } },
  'Tusk Flurry': { hit: { sheet: 'bloodExplosion', scale: 0.6, frameMs: 50 } },
  Ravage: { cast: { sheet: 'darkSlash', scale: 1.2 }, hit: { sheet: 'bloodExplosion', scale: 0.6 } },
  'Gore Charge': { cast: { sheet: 'earthWave', scale: 1.4 }, hit: { sheet: 'earthBurst', scale: 0.9 } },
  'Pipes of Pan': { cast: { sheet: 'lightGather', scale: 1.3, tint: 0xffd27a } },
  'Petrifying Gaze': { cast: { sheet: 'darkCircle', scale: 1.3, tint: 0x9be07a } },
  'War Banner': { cast: { sheet: 'goldBurst', scale: 1.4 } },
  'Raise Dead': { cast: { sheet: 'darkCircle', scale: 1.8, tint: 0x6ab8ff } },
  // the Mythics' ultimates
  'Nine-Tailed Dream': { cast: { sheet: 'pinkHeart', scale: 2.6 }, hit: { sheet: 'pinkHeart', scale: 1 } },
  'Feather Storm': { cast: { sheet: 'windVortex', scale: 2, tint: 0xff5a6a }, hit: { sheet: 'windBurst', scale: 1.3, tint: 0xff8a8a } },
  Tempest: { cast: { sheet: 'windVortex', scale: 2.6 }, hit: { sheet: 'windBurst', scale: 1.1 } },
  'Stone Curse': { cast: { sheet: 'darkCircle', scale: 2.2, tint: 0x9be07a }, hit: { sheet: 'whiteBurst', scale: 0.9, tint: 0xb0c0a0 } },
  'Rally Cry': { cast: { sheet: 'goldBurst', scale: 2.6 } },
  'Soul Nova': { cast: { sheet: 'lightNova', scale: 2.8, tint: 0x6ab8ff }, hit: { sheet: 'iceShield', scale: 1.3 } },
};

/** The king's spells: a sheet on each fighter the spell touches (the meteor's is its landing). */
export const SPELL_FX: Record<Exclude<SpellId, 'meteor'>, Effect> = {
  heal: { sheet: 'lightGather', scale: 1.6 },
  haste: { sheet: 'windVortex', scale: 1.5, tint: 0xffe27a },
  shield: { sheet: 'earthShield', scale: 1.5 },
  smite: { sheet: 'lightNova', scale: 1.8 },
  chain: { sheet: 'lightningBurst', scale: 1.4 },
  frost: { sheet: 'iceShield', scale: 1.5 },
  rally: { sheet: 'goldBurst', scale: 1.6 },
  quake: { sheet: 'earthExplosion', scale: 1.2 },
  resurrect: { sheet: 'lightGather', scale: 2.2, tint: 0xfff2a0 },
  poison: { sheet: 'darkCircle', scale: 1.6, tint: 0x8aff5a },
};

/** The tint of the tiles a spell lights, and how long (ms) they glow. */
export const SPELL_GLOW: Record<Exclude<SpellId, 'meteor'>, { color: number; ms: number }> = {
  heal: { color: 0x7dff8a, ms: 600 },
  haste: { color: 0xffe27a, ms: 600 },
  shield: { color: 0x9ad0ff, ms: 600 },
  smite: { color: 0xfff2a0, ms: 500 },
  chain: { color: 0xbfe6ff, ms: 500 },
  frost: { color: 0x8ae8ff, ms: 900 },
  rally: { color: 0xffb04a, ms: 600 },
  quake: { color: 0xb88a5a, ms: 700 },
  resurrect: { color: 0xffffff, ms: 800 },
  poison: { color: 0x8aff5a, ms: 6000 },
};

/** A foe this big (its full health) that dies is a big kill: a burst, a white flash, a hard shake. */
export const BIG_FOE_HP = 400;
