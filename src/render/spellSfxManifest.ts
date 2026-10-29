// The king's spells' sound files (src/sfx/*.opus, served as sfx/<id>.opus). Written by tools/spell-sfx/render.mjs: do not edit
// by hand. `seconds` is the file's length; `impact`, for a falling thing, is when in the file it lands; `whoomp`, for a cast,
// when its low blow falls. About 478 KB in all.

export interface SpellSfxEntry {
  seconds: number;
  bytes: number;
  impact?: number;
  whoomp?: number;
}

export const SPELL_SFX_FILES = {
  'cast-heal': { seconds: 1.107, bytes: 7502, whoomp: 0.07 },
  'cast-shield': { seconds: 1.107, bytes: 7177, whoomp: 0.07 },
  'cast-smite': { seconds: 1.107, bytes: 7994, whoomp: 0.07 },
  'cast-resurrect': { seconds: 1.107, bytes: 7144, whoomp: 0.07 },
  'cast-cleanse': { seconds: 1.107, bytes: 8549, whoomp: 0.07 },
  'cast-lance': { seconds: 1.107, bytes: 7189, whoomp: 0.07 },
  'cast-meteor': { seconds: 1.107, bytes: 6396, whoomp: 0.07 },
  'cast-rally': { seconds: 1.107, bytes: 7393, whoomp: 0.07 },
  'cast-warcry': { seconds: 1.107, bytes: 6878, whoomp: 0.07 },
  'cast-starfall': { seconds: 1.107, bytes: 6606, whoomp: 0.07 },
  'cast-frost': { seconds: 1.107, bytes: 8438, whoomp: 0.07 },
  'cast-deepfreeze': { seconds: 1.107, bytes: 7167, whoomp: 0.07 },
  'cast-chain': { seconds: 1.107, bytes: 6990, whoomp: 0.07 },
  'cast-quake': { seconds: 1.107, bytes: 7315, whoomp: 0.07 },
  'cast-bulwark': { seconds: 1.107, bytes: 6822, whoomp: 0.07 },
  'cast-blink': { seconds: 1.107, bytes: 7190, whoomp: 0.07 },
  'cast-hex': { seconds: 1.107, bytes: 7089, whoomp: 0.07 },
  'cast-renewal': { seconds: 1.107, bytes: 6648, whoomp: 0.07 },
  'cast-wolves': { seconds: 1.107, bytes: 6749, whoomp: 0.07 },
  'cast-haste': { seconds: 1.107, bytes: 5273, whoomp: 0.07 },
  'cast-poison': { seconds: 1.107, bytes: 6101, whoomp: 0.07 },
  'fx-heal': { seconds: 2.207, bytes: 17330 },
  'fx-meteor': { seconds: 3.189, bytes: 22147, impact: 0.62 },
  'fx-star': { seconds: 2.006, bytes: 15404, impact: 0.38 },
  'fx-starfall': { seconds: 1.806, bytes: 17388 },
  'fx-haste': { seconds: 1.362, bytes: 6609 },
  'fx-shield': { seconds: 2.006, bytes: 12683 },
  'fx-smite': { seconds: 2.607, bytes: 16626 },
  'fx-chain': { seconds: 1.397, bytes: 6176 },
  'fx-chain-hop': { seconds: 0.806, bytes: 3673 },
  'fx-poison': { seconds: 2.797, bytes: 12873 },
  'fx-frost': { seconds: 2.406, bytes: 20511 },
  'fx-rally': { seconds: 2.513, bytes: 16534 },
  'fx-quake': { seconds: 3.606, bytes: 18121 },
  'fx-resurrect': { seconds: 3.406, bytes: 21106 },
  'fx-cleanse': { seconds: 2.006, bytes: 15613 },
  'fx-blink': { seconds: 1.206, bytes: 6315 },
  'fx-hex': { seconds: 2.406, bytes: 13421 },
  'fx-lance': { seconds: 2.006, bytes: 11822 },
  'fx-renewal': { seconds: 2.807, bytes: 19168 },
  'fx-deepfreeze': { seconds: 2.406, bytes: 16577 },
  'fx-warcry': { seconds: 2.607, bytes: 17654 },
  'fx-bulwark': { seconds: 2.406, bytes: 15589 },
  'fx-wolves': { seconds: 3.006, bytes: 17873 },
} satisfies Record<string, SpellSfxEntry>;

export type SpellSfxId = keyof typeof SPELL_SFX_FILES;
