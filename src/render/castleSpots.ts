// The castle courtyard's floor plan: the scene's size, where each upgrade's building stands, what it looks like at each
// level, where its smoke and glow come from, and the words of its upgrade card. Plain data (no Pixi, no DOM), so a test
// can check it. All numbers are in the scene's own pixels; `y` is the building's foot line (what the scene sorts by).

import { BUILDING_IDS, BUILDINGS, GOLD_PER_LEVEL, HP_PER_LEVEL, ATK_PER_LEVEL, MANA_PER_LEVEL, maxLevel, spellBudget, type BuildingId } from '../sim/castle';

export const SCENE_W = 384;
export const SCENE_H = 340;
/** Where the back wall's foot is: the courtyard lies below. */
export const GROUND_Y = 150;

/** How many looks a building has: 0 an empty plot, 1 small, 2 bigger, 3 grand. */
export const STAGES = 4;

/** The look of a building at a level: the plot at 0, the grand one at the top level, the others spread between. */
export function stageOf(id: BuildingId, level: number): number {
  const top = maxLevel(id);
  const l = Math.max(0, Math.min(top, Math.floor(level)));
  return l === 0 ? 0 : 1 + Math.min(STAGES - 2, Math.floor(((l - 1) * (STAGES - 1)) / top));
}

export interface Plot {
  /** Centre across and the foot line. */
  x: number;
  y: number;
}

/** Where each building stands: the tall tower and the treasury at the back, the barracks and armoury in front. */
export const PLOTS: Record<BuildingId, Plot> = {
  mageTower: { x: 44, y: 214 },
  treasury: { x: 324, y: 220 },
  barracks: { x: 108, y: 326 },
  armoury: { x: 292, y: 326 },
};

/** Where a building's pictures are (file names without .png; one per stage). */
export const spriteName = (id: BuildingId, stage: number): string => `${id}${stage}`;

/** A puff of smoke or a spark comes from here: a fraction across and down the building's picture, at the stages that have it. */
export interface Vent {
  fx: number;
  fy: number;
  stages: readonly number[];
  kind: 'smoke' | 'glint' | 'rune';
}

export const VENTS: Record<BuildingId, readonly Vent[]> = {
  treasury: [
    { fx: 0.3, fy: 0.9, stages: [1, 2, 3], kind: 'glint' },
    { fx: 0.7, fy: 0.85, stages: [2, 3], kind: 'glint' },
    { fx: 0.5, fy: 0.25, stages: [3], kind: 'glint' },
  ],
  barracks: [],
  armoury: [
    { fx: 0.28, fy: 0.02, stages: [1], kind: 'smoke' },
    { fx: 0.27, fy: 0.07, stages: [2], kind: 'smoke' },
    { fx: 0.26, fy: 0.02, stages: [3], kind: 'smoke' },
  ],
  mageTower: [
    { fx: 0.5, fy: 0.5, stages: [1], kind: 'rune' },
    { fx: 0.5, fy: 0.55, stages: [2], kind: 'rune' },
    { fx: 0.5, fy: 0.35, stages: [3], kind: 'rune' },
  ],
};

/** The plain props of the yard (drawn with the buildings and heroes, sorted by their foot line). */
export interface Prop {
  sprite: 'well' | 'tree' | 'crates';
  x: number;
  y: number;
}
export const PROPS: readonly Prop[] = [
  { sprite: 'well', x: 196, y: 236 },
  { sprite: 'tree', x: 16, y: 330 },
  { sprite: 'tree', x: 368, y: 334 },
  { sprite: 'crates', x: 236, y: 336 },
];

/** The back wall and its gate. */
export const WALL = { y: GROUND_Y, gateX: 192 };

/** Where the heroes stroll: the open lawn in the middle (they pass behind the buildings, which are sorted in front of them). */
export const WALK = { x0: 128, x1: 262, y0: 200, y1: 318 };

/** The words a building's upgrade card shows for a level (0 = nothing built). */
export function effectText(id: BuildingId, level: number): string {
  switch (id) {
    case 'treasury':
      return `+${GOLD_PER_LEVEL * level} starting gold`;
    case 'barracks':
      return `+${Math.round(HP_PER_LEVEL * level * 100)}% hp for every hero`;
    case 'armoury':
      return `+${Math.round(ATK_PER_LEVEL * level * 100)}% attack for every hero`;
    case 'mageTower':
      return `mana fills ${Math.round(MANA_PER_LEVEL * level * 100)}% faster, +${spellBudget({ treasury: 0, barracks: 0, armoury: 0, mageTower: level }) - spellBudget()} spell power`;
  }
}

export const BLURB: Record<BuildingId, string> = {
  treasury: 'Gold in the vault: every run starts richer.',
  barracks: 'Beds and a training yard: your heroes are tougher.',
  armoury: 'Smiths and weapon racks: your heroes hit harder.',
  mageTower: 'The king\'s own spires: mana comes quicker and spells hit harder.',
};

export const NAME_OF = (id: BuildingId): string => BUILDINGS[id].name;
export { BUILDING_IDS };
