// Pictures and names the menus share: tab and building icons (the item pack's small sprites, bundled as data URLs) and
// the lands' display names.

import coin from './art/items/lucky_coin.png';
import weapon from './art/items/weapon2.png';
import sword from './art/items/weapon1.png';
import charm from './art/items/charm1.png';
import armour1 from './art/items/armour1.png';
import phoenix from './art/items/phoenix.png';
import banner from './art/items/banner.png';
import whetstone from './art/items/whetstone.png';
import hourglass from './art/items/hourglass.png';
import shield from './art/items/iron_shield.png';
import spyglass from './art/items/spyglass.png';
import type { Area } from './sim/board';
import type { BuildingId } from './sim/castle';

export const ICONS = { crowns: coin, gold: charm, recruit: phoenix, heroes: weapon, battle: shield, castle: banner, spells: whetstone, trophy: phoenix, daily: hourglass, tower: spyglass };
export const BUILDING_ICON: Record<BuildingId, string> = { treasury: coin, barracks: armour1, armoury: sword, mageTower: whetstone };

export const AREA_NAMES: Record<Area, string> = { highlands: 'Highlands', forest: 'Greenwood', snow: 'Snowfields', desert: 'Dunes', volcano: 'Ashlands', dungeon: 'Dungeon' };

/** An icon as an <img> (pixel art, never smoothed). */
export function icon(url: string, cls = 'ico'): HTMLImageElement {
  const el = document.createElement('img');
  el.src = url;
  el.className = cls;
  el.alt = '';
  el.draggable = false;
  return el;
}
