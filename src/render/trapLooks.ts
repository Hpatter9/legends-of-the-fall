// LIVING-FIELDS, step 3: what the battlefield's traps look like (`sim/fieldTraps.ts`), as plain data: the colour of each one's rim and tell,
// the word shown as it springs, the Pixel Effects strips played, and the cue heard. Pure: no Pixi, no DOM.

import type { HazardKind, Tile, Trap } from '../sim/board';
import type { PackKey } from './fxRules';

export interface TrapLook {
  /** The rim round its tile and the colour of its mark (a CSS colour for the tile's painting, a number for the effects). */
  rim: string;
  colour: number;
  /** Shown once over the tile when it springs (none for the quiet ones). */
  word: string;
  /** The strips played when it springs or bites. */
  go: { key: PackKey; scale: number }[];
}

export const TRAP_LOOKS: Record<Trap | 'brazier', TrapLook> = {
  spikes: { rim: 'rgba(224,200,144,0.95)', colour: 0xe0c890, word: 'Spikes!', go: [{ key: 'earth-spikes', scale: 1.1 }] },
  snare: { rim: 'rgba(200,160,80,0.95)', colour: 0xc8a050, word: 'Snared!', go: [{ key: 'forest-circle', scale: 0.9 }, { key: 'earth-puff', scale: 0.8 }] },
  ward: { rim: 'rgba(170,130,255,0.95)', colour: 0xaa82ff, word: 'Warded!', go: [{ key: 'lightning-strike', scale: 1.1 }, { key: 'lightning-nova', scale: 0.9 }] },
  brambles: { rim: 'rgba(96,60,40,0.9)', colour: 0x8a5a3a, word: '', go: [{ key: 'forest-puff', scale: 0.7 }] },
  mud: { rim: 'rgba(110,84,52,0.9)', colour: 0x6e5434, word: '', go: [] },
  bog: { rim: 'rgba(130,190,70,0.95)', colour: 0x82be46, word: '', go: [{ key: 'poison-puff', scale: 0.8 }] },
  thin: { rim: 'rgba(210,245,255,0.95)', colour: 0xd2f5ff, word: 'The ice breaks!', go: [{ key: 'ice-explosion', scale: 1 }, { key: 'ice-puff', scale: 1 }] },
  cracked: { rim: 'rgba(120,170,220,0.95)', colour: 0x78aadc, word: 'The ice cracks', go: [{ key: 'ice-puff', scale: 0.7 }] },
  totem: { rim: 'rgba(230,150,60,0.95)', colour: 0xe6963c, word: '', go: [] },
  brazier: { rim: 'rgba(255,150,50,0.95)', colour: 0xff9632, word: 'The brazier falls!', go: [{ key: 'fire-explosion', scale: 1.2 }, { key: 'fire-smoke', scale: 1 }] },
};

/** The rim round a tile a timed strike comes down on, by its kind (the colours of `HAZARD_LOOKS`, as CSS). */
export const RISK_RIM: Partial<Record<HazardKind, string>> = {
  geyser: 'rgba(216,244,255,0.9)',
  rockfall: 'rgba(216,176,120,0.9)',
  grasp: 'rgba(169,138,255,0.9)',
  blades: 'rgba(216,220,232,0.9)',
  lightning: 'rgba(255,240,160,0.9)',
  flare: 'rgba(255,122,42,0.9)',
  spikes: 'rgba(224,200,144,0.9)',
};

// ---- the painted sheet's cells (`tools/living-fields/import-art.py`, `trapArt.ts`) ---------------------------------------------------

/** The cell a tile's trap, brazier or strike is drawn from (its name in the sheet), by land. */
export function trapCell(t: Pick<Tile, 'trap' | 'brazier'>, area: string, strike?: HazardKind): string | null {
  if (t.brazier) return 'brazier';
  switch (t.trap) {
    case 'spikes': return 'spikes';
    case 'snare': return 'snare';
    case 'ward': return 'ward';
    case 'brambles': return area === 'desert' || area === 'oasis' || area === 'autumn' ? 'bramblesDry' : 'brambles';
    case 'mud': return area === 'desert' || area === 'oasis' ? 'quicksand' : 'mud';
    case 'bog': return 'bog1';
    case 'thin': return 'thin';
    case 'cracked': return 'cracked';
    case 'totem': return 'totem';
    default: break;
  }
  return strike === 'geyser' ? 'vent' : strike === 'rockfall' ? 'rubble' : strike === 'grasp' ? 'graveHands' : strike === 'blades' ? 'bladeSlot' : strike === 'lightning' ? 'scorch' : null;
}

/** The sheet's cell for a land's own shrine, ruined wall or powder barrel (the audit's finding 6: one picture on every land today), or
 *  null where the land keeps the shared picture. `deco` picks between a land's two walls. */
export function propCell(kind: 'shrine' | 'wall' | 'barrel', area: string, deco = 0): string | null {
  if (kind === 'shrine') return area === 'desert' || area === 'oasis' ? 'shrineSun' : area === 'snow' || area === 'crystal' ? 'shrineIce' : area === 'forge' || area === 'volcano' ? 'shrineAnvil' : area === 'shrine' ? 'shrineMoon' : 'shrineStone';
  if (kind === 'wall') return area === 'desert' || area === 'oasis' || area === 'ruins' || area === 'temple' ? (deco % 2 ? 'wallSand2' : 'wallSand1') : area === 'snow' ? 'wallSnow' : area === 'forest' || area === 'swamp' || area === 'autumn' || area === 'plains' || area === 'highlands' ? 'wallMoss' : 'wallCrypt';
  return area === 'volcano' ? 'urnAsh' : area === 'forge' || area === 'crystal' ? 'crateForge' : area === 'warcamp' ? 'kegCamp' : null;
}
