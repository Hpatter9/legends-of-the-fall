// Permanent awakening selects new equipment; combat grade selects the aura.
// Pure: no Pixi, no DOM.

import { formOf, UNITS } from '../sim/units';
import { MAX_RANK } from '../sim/meta';
import art from '../art/awakened/manifest.json';

const forms: Readonly<Record<string, string>> = art.forms;

/** Resolve a permanent upgraded form, including borrowed druid/werewolf shapes.
 * Enemy disguises and sheets without an upgraded counterpart keep their art. */
export const awakenedSheet = (sheet: string, step: number): string => step > 0 ? forms[sheet] ?? sheet : sheet;

/** Tier 1 is unadorned; tiers 2 and 3 reuse the light and strong class auras. */
export const combatAuraStep = (grade: number): number => Math.max(0, Math.min(2, Math.floor(grade) - 1));

/** The awakened step a full rank stands for (0 below rank 5). */
export const stepOfRank = (rank: number): number => Math.max(0, Math.min(2, rank - MAX_RANK));

/** The form at its combat grade, then its permanent equipment evolution. */
export function lookSheet(kind: string, rank: number, grade: number): string {
  return awakenedSheet(formOf(UNITS[kind], grade), stepOfRank(rank));
}

/** Battle units carry the awakened step directly, rather than the whole rank. */
export const battleSheet = (kind: string, step: number, grade: number): string => lookSheet(kind, MAX_RANK + step, grade);
