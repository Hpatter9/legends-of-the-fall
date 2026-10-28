// What the living land's hazards look like (WORLD-ROAD, `sim/hazards.ts`), as plain data: the colour of the tiles' warning, the word
// shown once as it is told, and the Pixel Effects pack's strips played when it goes off. Pure: no Pixi, no DOM.

import type { HazardKind } from '../sim/board';
import type { PackKey } from './fxRules';

export interface HazardLook {
  colour: number;
  /** Shown once over its tiles when it is told (none for the river's current, which is always in sight). */
  word: string;
  /** The strips played on each tile when it goes off, and how big. */
  go: { key: PackKey; scale: number }[];
}

export const HAZARD_LOOKS: Record<HazardKind, HazardLook> = {
  flare: { colour: 0xff7a2a, word: 'Lava flares', go: [{ key: 'fire-pillar', scale: 1.3 }, { key: 'fire-smoke', scale: 1 }] },
  rockfall: { colour: 0xd8b078, word: 'Rockfall', go: [{ key: 'earth-strike', scale: 1.3 }, { key: 'earth-puff', scale: 1 }] },
  geyser: { colour: 0xd8f4ff, word: 'Steam vents', go: [{ key: 'wind-pillar', scale: 1.3 }] },
  spikes: { colour: 0xe0c890, word: 'Spike traps', go: [{ key: 'earth-spikes', scale: 1.1 }] },
  grasp: { colour: 0xa98aff, word: 'The dead stir', go: [{ key: 'dark-spikes', scale: 1.1 }] },
  stampede: { colour: 0xe8b860, word: 'Stampede!', go: [{ key: 'earth-wave', scale: 1.2 }, { key: 'earth-puff', scale: 1 }] },
  spring: { colour: 0x7dff8a, word: 'Healing spring', go: [{ key: 'forest-aura', scale: 1 }] },
  current: { colour: 0x9fd8ff, word: '', go: [{ key: 'ice-puff', scale: 0.7 }] },
};
