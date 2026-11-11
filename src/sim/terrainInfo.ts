// What each kind of ground on a battlefield does, in words, for the codex's Terrain tab. The numbers are read from the rules' own
// constants, so the page cannot drift from them. Pure data: no Pixi, no DOM.

import { BARREL_BLAST, COALS_BURN, COALS_STAND, LAVA_BURN, LAVA_STAND, SHRINE_HEAL, TALL_AC } from './board';
import { ICE_SLIDE } from './battle';
import { LAYOUT_IDS, LAYOUT_INFO } from './layouts';
import { TRAPS } from './fieldTraps';
import { STRIKES } from './hazards';

export interface TerrainInfo {
  id: string;
  name: string;
  /** A one-line tooltip. */
  tip: string;
  /** The colour of the chip beside it. */
  swatch: string;
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;
const sec = (ms: number): string => `${Math.round(ms / 100) / 10} s`;

export const TERRAIN_INFO: readonly TerrainInfo[] = [
  { id: 'water', name: 'Shallow water', tip: 'Slows a walker: a step into it takes twice as long. Fliers do not mind.', swatch: '#6fb0ee' },
  { id: 'deep', name: 'Deep water', tip: 'Cannot be crossed on foot (on a volcano it is a lake of lava). Only fliers go over it. Cross by a bridge or a ford.', swatch: '#1f3f8a' },
  { id: 'lava', name: 'Lava', tip: `Burns whoever steps onto it for ${pct(LAVA_BURN)} of their health, and ${pct(LAVA_STAND)} a second while they stand in it. Fliers pass over.`, swatch: '#ee6a1e' },
  { id: 'coals', name: 'Hot coals', tip: `Burns whoever steps onto it for ${pct(COALS_BURN)} of their health, and ${pct(COALS_STAND)} a second while standing on it. Fliers pass over.`, swatch: '#d04020' },
  { id: 'tall', name: 'Tall grass', tip: `Hides a fighter from shots across it, and it is cover: +${TALL_AC} Armour Class to a fighter in it, so blows on it miss and glance more.`, swatch: '#3c7a30' },
  { id: 'wall', name: 'Ruined wall', tip: 'Nobody can stand on it, and it stops shots, even from a level above. Go round by a gap.', swatch: '#6a6a74' },
  { id: 'ice', name: 'Ice', tip: `A quick step, but slippery: ${pct(ICE_SLIDE)} of the time a walker slides one tile on.`, swatch: '#d4f0ff' },
  { id: 'shrine', name: 'Healing shrine', tip: `Whoever stands on it, friend or foe, mends ${pct(SHRINE_HEAL)} of their health a second. A hurt fighter makes for a shrine close by.`, swatch: '#8cf0d8' },
  { id: 'barrel', name: 'Powder barrel', tip: `A blow on anyone beside it sets it off: everyone within a tile loses ${pct(BARREL_BLAST)} of their health. Barrels beside it go too.`, swatch: '#b0703a' },
  { id: 'bridge', name: 'Bridge', tip: 'Plain ground over a river or a ravine: the way across.', swatch: '#8a5a2a' },
  // (LIVING-FIELDS, `fieldTraps.ts`: the land's traps and hazards. Each hits friend and foe alike, and fliers pass over all but the strikes from above.)
  { id: 'spikes', name: 'Spike trap', tip: `Springs once: the first to step on it, friend or foe, loses ${pct(TRAPS.SPIKES)} of their health, and it is spent. Fliers pass over.`, swatch: '#c8b08a' },
  { id: 'snare', name: 'Snare', tip: `Springs once: the first to step in it is held to the spot for ${sec(TRAPS.SNARE_MS)} (it can still strike what is in reach) and loses ${pct(TRAPS.SNARE)}.`, swatch: '#a8843c' },
  { id: 'ward', name: 'Rune ward', tip: `Springs once: the first to cross it is zapped for ${pct(TRAPS.WARD)} of their health and stunned for ${sec(TRAPS.WARD_MS)}.`, swatch: '#9a7cff' },
  { id: 'brambles', name: 'Brambles', tip: `Scratch whoever steps into them for ${pct(TRAPS.BRAMBLES)} of their health, every time, and the step is slower.`, swatch: '#5a3a2a' },
  { id: 'mud', name: 'Deep mud', tip: 'A step into it takes three times as long (quicksand, on sand). It does no harm.', swatch: '#6a5236' },
  { id: 'bog', name: 'Poison bog', tip: `Whoever steps in loses ${pct(TRAPS.BOG)} of their health and is poisoned, and loses ${pct(TRAPS.BOG_STAND)} more each second they stand in it.`, swatch: '#6a9a3a' },
  { id: 'thin', name: 'Thin ice', tip: `Cracks under the first to cross it and breaks under the next: that one is chilled for ${sec(TRAPS.ICE_MS)} and loses ${pct(TRAPS.ICE)}, and the tile is shallow water after.`, swatch: '#bfe6f6' },
  { id: 'totem', name: 'War totem', tip: `Whoever stands on its tile, friend or foe, strikes ${pct(TRAPS.TOTEM - 1)} harder for as long as they hold it.`, swatch: '#d0843a' },
  { id: 'brazier', name: 'Brazier', tip: `Nobody can stand on it. A blow on anyone beside it tips it over: everyone within a tile loses ${pct(TRAPS.BRAZIER)}, and hot coals lie on the tiles round it for the rest of the fight.`, swatch: '#ff9a3a' },
  { id: 'geyser', name: 'Steam vent', tip: `Bursts every ${sec(TRAPS.CLOCK.geyser[0])}, its tiles marked ${sec(TRAPS.CLOCK.geyser[1])} before: whoever stands there loses ${pct(STRIKES.geyser.share)} of their health, and any fire on them is put out.`, swatch: '#d8f4ff' },
  { id: 'rockfall', name: 'Falling rocks', tip: `Rocks come down every ${sec(TRAPS.CLOCK.rockfall[0])}, the tiles marked ${sec(TRAPS.CLOCK.rockfall[1])} before: whoever stands there loses ${pct(STRIKES.rockfall.share)} of their health, fliers too.`, swatch: '#d8b078' },
  { id: 'grasp', name: 'Restless graves', tip: `Hands come up every ${sec(TRAPS.CLOCK.grasp[0])}, the tiles marked ${sec(TRAPS.CLOCK.grasp[1])} before: whoever stands there loses ${pct(STRIKES.grasp.share)} and is slowed for ${sec(STRIKES.grasp.slowMs ?? 0)}.`, swatch: '#a98aff' },
  { id: 'blades', name: 'Swinging blades', tip: `Sweep every ${sec(TRAPS.CLOCK.blades[0])}, the tiles marked ${sec(TRAPS.CLOCK.blades[1])} before: whoever stands there loses ${pct(STRIKES.blades.share)} of their health. Fliers pass over.`, swatch: '#d8dce8' },
  { id: 'lightning', name: 'Lightning', tip: `Only in the rain: it strikes every ${sec(TRAPS.CLOCK.lightning[0])}, the tiles marked ${sec(TRAPS.CLOCK.lightning[1])} before: whoever stands there loses ${pct(STRIKES.lightning.share)} and is stunned for ${sec(STRIKES.lightning.stunMs ?? 0)}, fliers too.`, swatch: '#fff0a0' },
];

/** The battlefield shapes, as the codex lists them. */
export const LAYOUT_LIST: readonly { id: string; name: string; tip: string }[] = LAYOUT_IDS.map((id) => ({ id, name: LAYOUT_INFO[id].name, tip: LAYOUT_INFO[id].text }));
