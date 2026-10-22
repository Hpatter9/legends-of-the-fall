// Pictures and names the menus share: tab and building icons (the item pack's small sprites, bundled as data URLs) and
// the lands' display names.

import coin from './art/items/lucky_coin.png';
import sword from './art/items/weapon1.png';
import armour1 from './art/items/armour1.png';
import whetstone from './art/items/whetstone.png';
import hourglass from './art/items/hourglass.png';
import spyglass from './art/items/spyglass.png';
import boots from './art/items/swift_boots.png';
import scroll from './art/items/scholar_scroll.png';
import tabRecruit from './art/ui/tab-recruit.png';
import tabHeroes from './art/ui/tab-heroes.png';
import tabBattle from './art/ui/tab-battle.png';
import tabCastle from './art/ui/tab-castle.png';
import tabSpells from './art/ui/tab-spells.png';
import icCrown from './art/ui/ic-crown.png';
import icGold from './art/ui/ic-gold.png';
import icTrophy from './art/ui/ic-trophy.png';
import type { Area } from './sim/board';
import type { BuildingId } from './sim/castle';

export const ICONS = { crowns: icCrown, gold: icGold, recruit: tabRecruit, heroes: tabHeroes, battle: tabBattle, castle: tabCastle, spells: tabSpells, trophy: icTrophy, daily: hourglass, tower: spyglass };
export const BUILDING_ICON: Record<BuildingId, string> = { treasury: coin, barracks: armour1, armoury: sword, mageTower: whetstone, stable: boots, library: scroll };

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
