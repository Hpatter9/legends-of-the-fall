// TRAIT-PERKS: the tint of a fighter a perk has marked or raised (`UnitView` reads it; pure, so the tests read it): a blood thrall red, a
// mirror image or a foxfire twin pale spirit light, a sentry steel.
// PIXELLAB-ART: a risen skeleton wears its own grave sheet now (summon_grave_*), so it is not tinted; the crowned and the Wanted carry a
// painted mark over their heads (`perkMark`) in place of their tints.

import type { PerkUnit } from '../sim/traitPerks';

export const PERK_TINTS = { thrall: 0xff8080, image: 0xbfe8ff, twin: 0xffc890, grave: 0xc8f0c8, sentry: 0xd8e4f0, standard: 0xffffff, crowned: 0xfff0b8, wanted: 0xffd090 } as const;

/** What a perk raised is drawn tinted for, and what wears art of its own is not. */
const OWN_ART: ReadonlySet<string> = new Set(['grave']);

export function perkTint(p: PerkUnit): number | undefined {
  if (p.raised) return OWN_ART.has(p.raised) ? undefined : PERK_TINTS[p.raised];
  return undefined;
}

/** The mark that floats over a fighter's head: the Royal crown over the crowned hero, the bounty notice over the Wanted foe. */
export type PerkMark = 'crown' | 'wanted';

export function perkMark(p: PerkUnit | undefined): PerkMark | undefined {
  if (!p) return undefined;
  if (p.crowned) return 'crown';
  if (p.wanted) return 'wanted';
  return undefined;
}

/** A mark's two frames (its plain look and its glint) swap slowly; still on the first for reduced motion. */
export const MARK_FRAME_MS = 700;
export const markFrame = (t: number, reduced: boolean): 0 | 1 => (reduced ? 0 : Math.floor(t / MARK_FRAME_MS) % 2 === 0 ? 0 : 1);
