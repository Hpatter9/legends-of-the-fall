import { MYTHIC_KINDS } from '../sim/mythicRules';
// Permanent awakening selects new equipment; combat grade selects the aura.
// Pure: no Pixi, no DOM.

import { formOf, UNITS } from '../sim/units';
import { MAX_RANK } from '../sim/meta';
import art from '../art/awakened/manifest.json';

const forms: Readonly<Record<string, string>> = art.forms;

/** The heroes that join the roster before their awakened battle sheets are painted (the owner's deferral for the twenty,
 *  docs/notes/twenty-heroes.md): awakened, such a hero keeps its plain sprite (no form in the manifest, so `awakenedSheet` returns its
 *  own sheet), with its class aura from its combat grade as every hero has, and its awakened figure in the menus. A hero leaves this
 *  list when its awakened sheets are packed. */
export const AWAKENED_SHEETS_LATER: ReadonlySet<string> = new Set<string>(['vampireLord', 'hemomancer', 'nightstalker', 'bloodGargoyle', 'dhampir', 'warDrummer', 'geomancer', 'bellWarden', 'falconer', 'banneret', 'astralSphinx', 'mirageDancer', 'plagueDoctor', 'bombardier', 'astrologer', 'inquisitor', 'seraph', 'corsairSurgeon', 'harpooner', 'seaReaver', ...MYTHIC_KINDS]);

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
