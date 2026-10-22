// The equipment icons: 60 tiles of 16x16 cut from the DawnLike item sheets (`tools/equip-icons.py` makes `src/art/equip/`), bundled
// as data URLs. Drawn only at whole-number scales (the CSS asks for 3x and 4x), never smoothed. Rarity is the frame, not the icon.

import sword from './art/equip/sword.png';
import blade from './art/equip/blade.png';
import claymore from './art/equip/claymore.png';
import frostbrand from './art/equip/frostbrand.png';
import katana from './art/equip/katana.png';
import axe from './art/equip/axe.png';
import battleaxe from './art/equip/battleaxe.png';
import mace from './art/equip/mace.png';
import maul from './art/equip/maul.png';
import spear from './art/equip/spear.png';
import dagger from './art/equip/dagger.png';
import scythe from './art/equip/scythe.png';
import fist from './art/equip/fist.png';
import bow from './art/equip/bow.png';
import longbow from './art/equip/longbow.png';
import crossbow from './art/equip/crossbow.png';
import blunderbuss from './art/equip/blunderbuss.png';
import stormstaff from './art/equip/stormstaff.png';
import wand from './art/equip/wand.png';
import tome from './art/equip/tome.png';
import jerkin from './art/equip/jerkin.png';
import hide from './art/equip/hide.png';
import cloak from './art/equip/cloak.png';
import shadowcloak from './art/equip/shadowcloak.png';
import mail from './art/equip/mail.png';
import scale from './art/equip/scale.png';
import plate from './art/equip/plate.png';
import thornplate from './art/equip/thornplate.png';
import bastion from './art/equip/bastion.png';
import robe from './art/equip/robe.png';
import vestments from './art/equip/vestments.png';
import silk from './art/equip/silk.png';
import dragonscale from './art/equip/dragonscale.png';
import gi from './art/equip/gi.png';
import lamellar from './art/equip/lamellar.png';
import mithril from './art/equip/mithril.png';
import aegis from './art/equip/aegis.png';
import bone from './art/equip/bone.png';
import harness from './art/equip/harness.png';
import emberrobe from './art/equip/emberrobe.png';
import charm from './art/equip/charm.png';
import ring from './art/equip/ring.png';
import boots from './art/equip/boots.png';
import feather from './art/equip/feather.png';
import drum from './art/equip/drum.png';
import lyre from './art/equip/lyre.png';
import bell from './art/equip/bell.png';
import amulet from './art/equip/amulet.png';
import pendant from './art/equip/pendant.png';
import sapphire from './art/equip/sapphire.png';
import ruby from './art/equip/ruby.png';
import emerald from './art/equip/emerald.png';
import orb from './art/equip/orb.png';
import scroll from './art/equip/scroll.png';
import vial from './art/equip/vial.png';
import elixir from './art/equip/elixir.png';
import shard from './art/equip/shard.png';
import idol from './art/equip/idol.png';
import spectacles from './art/equip/spectacles.png';
import circlet from './art/equip/circlet.png';

export const EQUIP_ICONS: Record<string, string> = {
  sword, blade, claymore, frostbrand, katana, axe, battleaxe, mace, maul, spear, dagger, scythe, fist, bow, longbow, crossbow, blunderbuss, stormstaff, wand, tome, jerkin, hide, cloak, shadowcloak, mail, scale, plate, thornplate, bastion, robe, vestments, silk, dragonscale, gi, lamellar, mithril, aegis, bone, harness, emberrobe, charm, ring, boots, feather, drum, lyre, bell, amulet, pendant, sapphire, ruby, emerald, orb, scroll, vial, elixir, shard, idol, spectacles, circlet,
};
