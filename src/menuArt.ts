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
import icStone from './art/ui/ic-stone.png';
import icGold from './art/ui/ic-gold.png';
import icTrophy from './art/ui/ic-trophy.png';
import type { Area } from './sim/board';
import type { BuildingId } from './sim/castle';

export const ICONS = { crowns: icCrown, stones: icStone, gold: icGold, recruit: tabRecruit, heroes: tabHeroes, battle: tabBattle, castle: tabCastle, spells: tabSpells, trophy: icTrophy, daily: hourglass, tower: spyglass };
export const BUILDING_ICON: Record<BuildingId, string> = { treasury: coin, barracks: armour1, armoury: sword, mageTower: whetstone, stable: boots, library: scroll };

export const AREA_NAMES: Record<Area, string> = {
  highlands: 'Highlands', forest: 'Greenwood', snow: 'Snowfields', desert: 'Dunes', volcano: 'Ashlands', dungeon: 'Dungeon',
  plains: 'Meadows', autumn: 'Autumn Wood', swamp: 'Mire', graveyard: 'Graveyard', ruins: 'City Ruins', temple: 'Ancient Temple', crystal: 'Crystal Caves', forge: 'Forge', shrine: 'Moonlit Shrine', warcamp: 'War Camp', oasis: 'Oasis',
};

/** Pictures already asked for once: the first <img> to use one decodes it, the rest find it ready, so a rebuilt menu never shows an empty box. */
const warm = new Map<string, HTMLImageElement>();

/** Start decoding a picture now (the menu icons are warmed as the page loads). */
export function warmIcon(url: string): void {
  if (warm.has(url) || typeof Image === 'undefined') return;
  const im = new Image();
  im.decoding = 'sync';
  im.src = url;
  warm.set(url, im);
}
for (const u of [...Object.values(ICONS), ...Object.values(BUILDING_ICON)]) warmIcon(u);

/** An icon as an <img> (pixel art, never smoothed). */
export function icon(url: string, cls = 'ico'): HTMLImageElement {
  warmIcon(url);
  const el = document.createElement('img');
  el.decoding = 'sync';
  el.src = url;
  el.className = cls;
  el.alt = '';
  el.draggable = false;
  return el;
}
