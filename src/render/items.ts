// The item icons (DawnLike 16x16 tiles, cut one a file into `src/art/items/`): a relic's by id, a piece of gear's by slot and tier.

import whetstone from '../art/items/whetstone.png';
import banner from '../art/items/banner.png';
import hourglass from '../art/items/hourglass.png';
import war_drum from '../art/items/war_drum.png';
import lucky_coin from '../art/items/lucky_coin.png';
import phoenix from '../art/items/phoenix.png';
import iron_shield from '../art/items/iron_shield.png';
import feather_charm from '../art/items/feather_charm.png';
import hawk_eye from '../art/items/hawk_eye.png';
import swift_boots from '../art/items/swift_boots.png';
import scholar_scroll from '../art/items/scholar_scroll.png';
import spyglass from '../art/items/spyglass.png';
import sun_crown from '../art/items/sun_crown.png';
import dragon_heart from '../art/items/dragon_heart.png';
import storm_ring from '../art/items/storm_ring.png';
import void_lens from '../art/items/void_lens.png';
import weapon1 from '../art/items/weapon1.png';
import weapon2 from '../art/items/weapon2.png';
import weapon3 from '../art/items/weapon3.png';
import armour1 from '../art/items/armour1.png';
import armour2 from '../art/items/armour2.png';
import armour3 from '../art/items/armour3.png';
import charm1 from '../art/items/charm1.png';
import charm2 from '../art/items/charm2.png';
import charm3 from '../art/items/charm3.png';

const RELIC_ICONS: Record<string, string> = {
  whetstone: whetstone,
  banner: banner,
  hourglass: hourglass,
  warDrum: war_drum,
  luckyCoin: lucky_coin,
  phoenix: phoenix,
  ironShield: iron_shield,
  featherCharm: feather_charm,
  hawkEye: hawk_eye,
  swiftBoots: swift_boots,
  scholarScroll: scholar_scroll,
  spyglass: spyglass,
  sunCrown: sun_crown,
  dragonHeart: dragon_heart,
  stormRing: storm_ring,
  voidLens: void_lens,
};
const GEAR_ICONS: Record<string, readonly string[]> = {
  weapon: [weapon1, weapon2, weapon3],
  armour: [armour1, armour2, armour3],
  charm: [charm1, charm2, charm3],
};

export const relicIcon = (id: string): string => RELIC_ICONS[id] ?? '';
export const gearIcon = (slot: string, tier: number): string => GEAR_ICONS[slot]?.[Math.max(1, Math.min(3, tier)) - 1] ?? '';

/** A pixel-art icon as an <img> (drawn crisp, enlarged by the page's CSS). */
export function iconImg(src: string, label: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = src;
  img.alt = label;
  img.className = 'icon';
  img.draggable = false;
  return img;
}
