// Individual authored silhouettes. These IDs survive material resolution, so distinct strip names cannot hide shared art.
import catalogue from '../art/fx/abilities/catalogue.json';
import type { Family } from './fxRules';
import type { Shape } from './signatures';

export const ABILITY_ART = catalogue;
export const ABILITY_LOOKS = Object.fromEntries(catalogue.map(row => [row.id, row]));
export type AbilityId = `skill:${string}` | `spell:${string}`;

/** The real source cell is the artwork identity, independently of tint, size and animation vocabulary. */
export function abilitySource(id: string): string | undefined {
  const row = ABILITY_LOOKS[id];
  return row ? `${row.atlas}/${row.cell}` : undefined;
}

export function shapeFamily(shape: Shape): Family {
  switch (shape) {
    case 'slashX': case 'cleave': case 'sweep': return 'slash';
    case 'dome': case 'barrier': return 'shield';
    case 'pillar': case 'pillars': return 'pillar';
    case 'rain': case 'drop': case 'meteor': return 'strike';
    case 'cone': return 'flame';
    case 'orbit': case 'spiral': case 'inward': case 'draw': return 'gather';
    case 'ring': case 'ripple': return 'wave';
    case 'beam': case 'fan': case 'chain': case 'dash': return 'orb';
    default: return 'hit';
  }
}

/** The authored comet/feather axis, used to point a falling painting along its flight instead of tumbling it. */
export const abilityHeading = (id: string): number => id === 'skill:Dive' ? Math.PI * 0.75 : Math.PI * 0.25;
