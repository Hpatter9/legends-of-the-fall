// Art-only aliases for the older sheet names used by hero transformation events.
// The simulation keeps its existing look IDs and behaviour.
import layout from '../art/units/sheets.json';

const FORMS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  werewolf: { werewolf_white: 'hero_res_werewolf', werewolf_black: 'hero_res_werewolf_brute', werewolf_red: 'hero_res_werewolf_awakened' },
  druid: { cls_treant: 'hero_res_treant', cls_treant_2: 'hero_res_treant2', cls_treant_3: 'hero_res_treant3' },
};

/** A transformation's original look name, resolved to this hero's new art. */
export const heroLook = (kind: string, sheet: string): string => FORMS[kind]?.[sheet] ?? sheet;

/** The separately drawn rear view, or the existing sheet for art without one. */
export function rearView(sheet: string): string {
  return (layout as Record<string, { rear?: string }>)[sheet]?.rear ?? sheet;
}

/** The Brute's larger body belongs to that transformation, not to the stats. */
export const formScale = (sheet: string): number | undefined => sheet === 'hero_res_werewolf_brute' ? 0.75 : undefined;
