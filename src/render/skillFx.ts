// Which effect each hero or foe skill shows: the sheet it plays on the caster as it goes off (`cast`), and the one it
// plays on each foe it strikes (`hit`). The sheets are the Pixel Effects pack's 32px strips (`src/art/fx/magic`), named
// here by key; `fx.ts` loads them. Pure data: no Pixi, no DOM, so the tests can check that every skill has an entry.

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
  'Tusk Flurry': { hit: { sheet: 'bloodExplosion', scale: 0.6, frameMs: 50 } },
};

/** The king's spells: a sheet on each hero the spell touches (the meteor's is its landing). */
export const SPELL_FX: Record<'heal' | 'haste', Effect> = {
  heal: { sheet: 'lightGather', scale: 1.6 },
  haste: { sheet: 'windVortex', scale: 1.5, tint: 0xffe27a },
};

/** A foe this big (its full health) that dies is a big kill: a burst, a white flash, a hard shake. */
export const BIG_FOE_HP = 400;
