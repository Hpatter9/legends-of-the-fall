// The king's spells' painted sheets (`SPELL_FX`), their words and glows, and the names of the painted skill cues (`MagicKey`).
// Pure data: no Pixi, no DOM.
//
// (This file once held `SKILL_FX`, a sheet for each hero and foe skill's cast and hit. Every skill has had a signature of its
// own since (`signatures.ts`, `kitLooks.ts`), and the renderer read `SKILL_FX` only for a skill with none, so none of its 158
// entries could play. It was removed with the branches that read it: docs/notes/hit-sparks.md.)

import type { SpellId } from '../sim/spells';

/** The named skill cues resolved by `fx.ts`. */
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
  cleanse: { sheet: 'whiteBurst', scale: 1.4 },
  blink: { sheet: 'darkCircle', scale: 1.4, tint: 0xb08af0 },
  hex: { sheet: 'darkCircle', scale: 1.4, tint: 0xb06aff },
  lance: { sheet: 'lightNova', scale: 1.6, tint: 0xfff2a0 },
  renewal: { sheet: 'lightGather', scale: 1.6, tint: 0x7dff8a },
  deepfreeze: { sheet: 'iceShield', scale: 1.8 },
  warcry: { sheet: 'goldBurst', scale: 1.6 },
  bulwark: { sheet: 'earthShield', scale: 1.8 },
  wolves: { sheet: 'earthBurst', scale: 1.4 },
  starfall: { sheet: 'fireExplosion', scale: 1.2 },
  // (KING-SPELLS batch 5: the schools' fourteen spells' own looks)
  firewall: { sheet: 'fireCircle', scale: 1.5 },
  icewall: { sheet: 'iceShield', scale: 1.5 },
  shatter: { sheet: 'iceShield', scale: 1.3, tint: 0xc8f0ff },
  gale: { sheet: 'windWave', scale: 1.5 },
  thunderclap: { sheet: 'lightningBurst', scale: 1.6 },
  snare: { sheet: 'earthBurst', scale: 1.4, tint: 0x8fd16a },
  charm: { sheet: 'pinkHeart', scale: 1.4 },
  foresight: { sheet: 'goldBurst', scale: 1.4 },
  sunbeam: { sheet: 'lightNova', scale: 1.6 },
  venom: { sheet: 'darkSlash', scale: 1.3, tint: 0x8ee86a },
  mirage: { sheet: 'whiteBurst', scale: 1.4 },
  drain: { sheet: 'bloodExplosion', scale: 1.3 },
  bonewall: { sheet: 'earthWave', scale: 1.5, tint: 0xe8dcc0 },
  raisedead: { sheet: 'darkCircle', scale: 1.6 },
};

/** The word that floats up from each fighter a spell touches (Haste, Rally and Shield say theirs in `fx.ts`). */
export const SPELL_WORD: Partial<Record<SpellId, string>> = { cleanse: 'Cleansed', hex: 'Hexed', renewal: 'Renewal', deepfreeze: 'Frozen', warcry: 'Battle Cry', bulwark: 'Bulwark', wolves: 'Wolf', blink: 'Blink' };

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
  cleanse: { color: 0xdff8ff, ms: 600 },
  blink: { color: 0xb08af0, ms: 500 },
  hex: { color: 0xb06aff, ms: 700 },
  lance: { color: 0xfff2a0, ms: 500 },
  renewal: { color: 0x7dff8a, ms: 900 },
  deepfreeze: { color: 0x8ae8ff, ms: 900 },
  warcry: { color: 0xffb04a, ms: 600 },
  bulwark: { color: 0xb88a5a, ms: 600 },
  wolves: { color: 0x7dff8a, ms: 600 },
  starfall: { color: 0xff5a2a, ms: 700 },
  // (KING-SPELLS batch 5: the schools' fourteen spells' own looks)
  firewall: { color: 0xff7a3d, ms: 600 },
  icewall: { color: 0x9ad8ff, ms: 600 },
  shatter: { color: 0xc8f0ff, ms: 500 },
  gale: { color: 0x7fe0d0, ms: 600 },
  thunderclap: { color: 0xfff27a, ms: 500 },
  snare: { color: 0x8fd16a, ms: 600 },
  charm: { color: 0xff9ad8, ms: 600 },
  foresight: { color: 0xffe08a, ms: 600 },
  sunbeam: { color: 0xfff0a0, ms: 500 },
  venom: { color: 0x8ee86a, ms: 500 },
  mirage: { color: 0xd8c8ff, ms: 600 },
  drain: { color: 0xff5a6a, ms: 600 },
  bonewall: { color: 0xe8dcc0, ms: 600 },
  raisedead: { color: 0xb08af0, ms: 700 },
};

/** A foe this big (its full health) that dies is a big kill: a burst, a white flash, a hard shake. */
export const BIG_FOE_HP = 400;
