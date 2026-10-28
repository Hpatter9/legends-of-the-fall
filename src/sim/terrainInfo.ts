// What each kind of ground on a battlefield does, in words, for the codex's Terrain tab. The numbers are read from the rules' own
// constants, so the page cannot drift from them. Pure data: no Pixi, no DOM.

import { BARREL_BLAST, COALS_BURN, COALS_STAND, LAVA_BURN, LAVA_STAND, SHRINE_HEAL, TALL_DODGE } from './board';
import { ICE_SLIDE } from './battle';
import { LAYOUT_IDS, LAYOUT_INFO } from './layouts';

export interface TerrainInfo {
  id: string;
  name: string;
  /** A one-line tooltip. */
  tip: string;
  /** The colour of the chip beside it. */
  swatch: string;
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

export const TERRAIN_INFO: readonly TerrainInfo[] = [
  { id: 'water', name: 'Shallow water', tip: 'Slows a walker: a step into it takes twice as long. Fliers do not mind.', swatch: '#6fb0ee' },
  { id: 'deep', name: 'Deep water', tip: 'Cannot be crossed on foot (on a volcano it is a lake of lava). Only fliers go over it. Cross by a bridge or a ford.', swatch: '#1f3f8a' },
  { id: 'lava', name: 'Lava', tip: `Burns whoever steps onto it for ${pct(LAVA_BURN)} of their health, and ${pct(LAVA_STAND)} a second while they stand in it. Fliers pass over.`, swatch: '#ee6a1e' },
  { id: 'coals', name: 'Hot coals', tip: `Burns whoever steps onto it for ${pct(COALS_BURN)} of their health, and ${pct(COALS_STAND)} a second while standing on it. Fliers pass over.`, swatch: '#d04020' },
  { id: 'tall', name: 'Tall grass', tip: `Hides a fighter from shots across it, and ${pct(TALL_DODGE)} of the blows on a fighter in it miss.`, swatch: '#3c7a30' },
  { id: 'wall', name: 'Ruined wall', tip: 'Nobody can stand on it, and it stops shots, even from a level above. Go round by a gap.', swatch: '#6a6a74' },
  { id: 'ice', name: 'Ice', tip: `A quick step, but slippery: ${pct(ICE_SLIDE)} of the time a walker slides one tile on.`, swatch: '#d4f0ff' },
  { id: 'shrine', name: 'Healing shrine', tip: `Whoever stands on it, friend or foe, mends ${pct(SHRINE_HEAL)} of their health a second. A hurt fighter makes for a shrine close by.`, swatch: '#8cf0d8' },
  { id: 'barrel', name: 'Powder barrel', tip: `A blow on anyone beside it sets it off: everyone within a tile loses ${pct(BARREL_BLAST)} of their health. Barrels beside it go too.`, swatch: '#b0703a' },
  { id: 'bridge', name: 'Bridge', tip: 'Plain ground over a river or a ravine: the way across.', swatch: '#8a5a2a' },
];

/** The battlefield shapes, as the codex lists them. */
export const LAYOUT_LIST: readonly { id: string; name: string; tip: string }[] = LAYOUT_IDS.map((id) => ({ id, name: LAYOUT_INFO[id].name, tip: LAYOUT_INFO[id].text }));
