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
import founders_ledger from '../art/items/founders_ledger.png';
import book_of_names from '../art/items/book_of_names.png';
import unfinished_chronicle from '../art/items/unfinished_chronicle.png';
import spyglass from '../art/items/spyglass.png';
import ember_ruby from '../art/items/ember_ruby.png';
import dragon_scale from '../art/items/dragon_scale.png';
import frost_sapphire from '../art/items/frost_sapphire.png';
import winter_cloak from '../art/items/winter_cloak.png';
import holy_chalice from '../art/items/holy_chalice.png';
import saint_medal from '../art/items/saint_medal.png';
import shadow_cloak from '../art/items/shadow_cloak.png';
import viper_fang from '../art/items/viper_fang.png';
import wolf_fang from '../art/items/wolf_fang.png';
import beast_harness from '../art/items/beast_harness.png';
import sun_crown from '../art/items/sun_crown.png';
import dragon_heart from '../art/items/dragon_heart.png';
import storm_ring from '../art/items/storm_ring.png';
import void_lens from '../art/items/void_lens.png';
import thunder_horn from '../art/items/thunder_horn.png';
import cloud_treads from '../art/items/cloud_treads.png';
import thunder_pendant from '../art/items/thunder_pendant.png';
import tempest_ring from '../art/items/tempest_ring.png';
import granite_heart from '../art/items/granite_heart.png';
import moss_amulet from '../art/items/moss_amulet.png';
import stone_gauntlet from '../art/items/stone_gauntlet.png';
import earthen_bell from '../art/items/earthen_bell.png';
import blood_vial from '../art/items/blood_vial.png';
import bloodstone_ring from '../art/items/bloodstone_ring.png';
import reaver_helm from '../art/items/reaver_helm.png';
import ruby_locket from '../art/items/ruby_locket.png';
import star_chart from '../art/items/star_chart.png';
import comet_shard from '../art/items/comet_shard.png';
import moon_lantern from '../art/items/moon_lantern.png';
import astral_circlet from '../art/items/astral_circlet.png';
import coin_hoard from '../art/items/coin_hoard.png';
import gilded_ingot from '../art/items/gilded_ingot.png';
import jewel_crown from '../art/items/jewel_crown.png';
import gold_band from '../art/items/gold_band.png';
import rift_shard from '../art/items/rift_shard.png';
import void_sigil from '../art/items/void_sigil.png';
import doom_helm from '../art/items/doom_helm.png';
import last_light from '../art/items/last_light.png';
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
  // (RELICS-2: placeholders cut by tools/relics/relic-icons-2.py until the painted icons come)
  scholarScroll: founders_ledger,
  bookOfNames: book_of_names,
  unfinishedChronicle: unfinished_chronicle,
  spyglass: spyglass,
  emberRuby: ember_ruby,
  dragonScale: dragon_scale,
  frostSapphire: frost_sapphire,
  winterCloak: winter_cloak,
  holyChalice: holy_chalice,
  saintMedal: saint_medal,
  shadowCloak: shadow_cloak,
  viperFang: viper_fang,
  wolfFang: wolf_fang,
  beastHarness: beast_harness,
  sunCrown: sun_crown,
  dragonHeart: dragon_heart,
  stormRing: storm_ring,
  voidLens: void_lens,
  thunderHorn: thunder_horn,
  cloudTreads: cloud_treads,
  thunderPendant: thunder_pendant,
  tempestRing: tempest_ring,
  graniteHeart: granite_heart,
  mossAmulet: moss_amulet,
  stoneGauntlet: stone_gauntlet,
  earthenBell: earthen_bell,
  bloodVial: blood_vial,
  bloodstoneRing: bloodstone_ring,
  reaverHelm: reaver_helm,
  rubyLocket: ruby_locket,
  starChart: star_chart,
  cometShard: comet_shard,
  moonLantern: moon_lantern,
  astralCirclet: astral_circlet,
  coinHoard: coin_hoard,
  gildedIngot: gilded_ingot,
  jewelCrown: jewel_crown,
  goldBand: gold_band,
  riftShard: rift_shard,
  voidSigil: void_sigil,
  doomHelm: doom_helm,
  lastLight: last_light,
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
