// SUMMON-ART: the looks of the units heroes call up in a fight (docs/notes/summon-art.md). Art only: the simulation keeps its
// `UNITS` sheets and scales (a test pins the wolf's), and the renderer draws each summon in its own sheet from here instead.
// Pure: no Pixi, no DOM.

import { auraOf } from './auraStyles';

export interface SummonLook {
  /** The sheet at grade 1, 2 and 3 (the last is used above that). */
  sheets: readonly string[];
  /** The scale it is drawn at (the sheets are cut at their own sizes, so the old `UNITS` scale no longer fits them). */
  scale: number;
  /** The hero kind that calls it, whose element colours the mark under its feet. */
  caller: string;
  /** How solid it is drawn (a spirit or a mirage lets the ground show through a little). */
  alpha?: number;
}

/** Every summon kind a hero calls up, its sheet, size and caller. The Duchess and the Last Stand's king are not called up, so they keep their own art. */
export const SUMMON_LOOKS: Readonly<Record<string, SummonLook>> = {
  // (whtdragons' MV wild dogs, doubled: a grey wolf, silver at tier 3; the dire wolf a great black one)
  wolf: { sheets: ['summon_wolf', 'summon_wolf', 'summon_wolf_white'], scale: 0.45, caller: 'beastmaster' },
  direWolf: { sheets: ['summon_direwolf'], scale: 0.64, caller: 'beastmaster' },
  // (the Druid's old mossy treant and its two evolved forms, no longer her own shape: hers is the leafy Resonance treant)
  treant: { sheets: ['cls_treant', 'cls_treant_2', 'cls_treant_3'], scale: 0.5, caller: 'druid' },
  // (batareya's blue spirit, not a tinted copy of the foe it was)
  wraith: { sheets: ['summon_wraith'], scale: 0.55, caller: 'reaper', alpha: 0.88 },
  // (the war standard of the camp, its pennants stirring)
  standard: { sheets: ['summon_standard'], scale: 0.45, caller: 'samuraiCommander' },
  // (batareya's violet crystal figure: a mirage of glass, not a second Illusionist)
  decoy: { sheets: ['summon_decoy'], scale: 0.52, caller: 'illusionist', alpha: 0.85 },
};

/** A summon kind's look, or undefined for every other unit. */
export const summonLook = (kind: string): SummonLook | undefined => SUMMON_LOOKS[kind];

/** The sheet a summon is drawn in at its grade. */
export function summonSheet(kind: string, grade = 1): string | undefined {
  const look = SUMMON_LOOKS[kind];
  if (!look) return undefined;
  return look.sheets[Math.max(0, Math.min(look.sheets.length - 1, Math.floor(grade) - 1))];
}

/** The colour of the small ring under a summon's feet: its caller's element, so it reads as theirs and not a foe's. */
export const summonMark = (kind: string): number | undefined => (SUMMON_LOOKS[kind] ? auraOf(SUMMON_LOOKS[kind].caller).colour : undefined);

/** Every sheet the summons are drawn in (loaded with the rest). */
export const SUMMON_SHEETS: readonly string[] = [...new Set(Object.values(SUMMON_LOOKS).flatMap((l) => l.sheets))];
