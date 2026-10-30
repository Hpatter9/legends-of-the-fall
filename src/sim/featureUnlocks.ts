// The deploy bar's helpers that a player earns (the owner: "let's have the auto merge unlock after defeating the second army, and auto
// place unlock after defeating the 4th army"). Until then merging is by hand (drag a hero onto its match, or tap one then the other) and so
// is placing. A save that has already beaten those armies has them at once; each one's unlocking is told once, on the next deploy screen
// (`Meta.featuresTold`). Pure rules: no Pixi, no DOM. The sim's own `autoDeploy` and `autoMerge` are untouched (the bots and balance tools
// still use them, as a player tapping the buttons would).

import { ARMIES, armyCleared } from './armies';
import type { Meta } from './meta';

export type Feature = 'autoMerge' | 'autoPlace';

/** Which army (by its place in `ARMIES`) must be beaten for each helper, and the line that tells it. */
export const FEATURES: Readonly<Record<Feature, { army: number; line: string }>> = {
  autoMerge: { army: 1, line: 'Auto merge unlocked · merge every pair ready with one tap' },
  autoPlace: { army: 3, line: 'Auto place unlocked · set your heroes out with one tap' },
};

/** Whether a helper is open: its army has been beaten (old saves count by their records, as `armyCleared` reads them). */
export function featureOpen(m: Meta, f: Feature): boolean {
  const a = ARMIES[FEATURES[f].army];
  return !!a && armyCleared(m, a.id);
}
export const autoMergeOpen = (m: Meta): boolean => featureOpen(m, 'autoMerge');
export const autoPlaceOpen = (m: Meta): boolean => featureOpen(m, 'autoPlace');

/** The helpers open but not yet told, in the order they unlock; marking them told is `markTold`. */
export function featuresToTell(m: Meta): Feature[] {
  return (['autoMerge', 'autoPlace'] as const).filter((f) => featureOpen(m, f) && !m.featuresTold?.includes(f));
}

/** Remember that these helpers' unlocking has been told, so the notice shows once a save. */
export function markTold(m: Meta, fs: readonly Feature[]): void {
  if (!fs.length) return;
  m.featuresTold = [...new Set([...(m.featuresTold ?? []), ...fs])];
}
