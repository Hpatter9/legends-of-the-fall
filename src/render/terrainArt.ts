// The battlefield's terrain props, as data URLs: the powder barrel, the ruined walls, the shrine's crystal and the bridge planks
// (cut from the asset packs by `tools/map-layouts/terrain-art.py`; credited in CREDITS.md).

import barrel from '../art/terrain/barrel.png';
import wall1 from '../art/terrain/wall1.png';
import wall2 from '../art/terrain/wall2.png';
import wall3 from '../art/terrain/wall3.png';
import crystal from '../art/terrain/crystal.png';
import planks from '../art/terrain/planks.png';

export const TERRAIN_URLS = { barrel, walls: [wall1, wall2, wall3], crystal, planks };
