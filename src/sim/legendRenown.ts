// A named legend's renown (SEVEN-SLOT GEAR batch 2, docs/notes/gear-runes-design.md section 3): the waves it has fought. At 25, 100 and
// 300 a new verse of its story opens and its power grows a step. Kept apart from `legends.ts` (which reads the whole save for the
// legends' sources) so `equipment.ts` can read a legend's strength without it. Pure rules: no Pixi, no DOM, no randomness.

/** The renown at which each later verse opens, and the power steps up. */
export const RENOWN_STEPS: readonly number[] = [25, 100, 300];
/** The power's strength at each step (found, then each verse): the design's 0.6, 0.75 and 0.9 after a first step of 0.45. */
export const LEGEND_S: readonly number[] = [0.45, 0.6, 0.75, 0.9];
/** The power's numbers are written at 0.6 (the second verse): a strength's multiple of them. */
export const LEGEND_BASE_S = 0.6;
/** How many steps a renown has reached (0 to 3). */
export const renownStep = (renown: number): number => RENOWN_STEPS.filter((n) => renown >= n).length;
/** A legend's power at a renown, as a multiple of the numbers in its line: 0.75 found, 1 at 25 waves, 1.25 at 100, 1.5 at 300. */
export const legendStrength = (renown: number): number => LEGEND_S[renownStep(renown)] / LEGEND_BASE_S;
