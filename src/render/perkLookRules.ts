// TRAIT-PERKS: the tint of a fighter a perk has marked or raised (`UnitView` reads it; pure, so the tests read it): a blood thrall red, a
// mirror image or a foxfire twin pale spirit light, a risen skeleton grave green, a sentry steel, the crowned a touch gold, the Wanted amber.

import type { PerkUnit } from '../sim/traitPerks';

export const PERK_TINTS = { thrall: 0xff8080, image: 0xbfe8ff, twin: 0xffc890, grave: 0xc8f0c8, sentry: 0xd8e4f0, standard: 0xffffff, crowned: 0xfff0b8, wanted: 0xffd090 } as const;

export function perkTint(p: PerkUnit): number | undefined {
  if (p.raised) return PERK_TINTS[p.raised];
  if (p.crowned) return PERK_TINTS.crowned;
  if (p.wanted) return PERK_TINTS.wanted;
  return undefined;
}
