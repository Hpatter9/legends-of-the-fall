// The equipment icons: 16x16 tiles cut from the DawnLike item sheets (`src/art/equip/`), bundled as data URLs. Drawn
// only at whole-number scales (the CSS asks for 3x and 4x), never smoothed.

import axe from './art/equip/axe.png';
import blade from './art/equip/blade.png';
import boots from './art/equip/boots.png';
import bow from './art/equip/bow.png';
import charm from './art/equip/charm.png';
import cloak from './art/equip/cloak.png';
import feather from './art/equip/feather.png';
import jerkin from './art/equip/jerkin.png';
import mail from './art/equip/mail.png';
import plate from './art/equip/plate.png';
import ring from './art/equip/ring.png';
import robe from './art/equip/robe.png';
import staff from './art/equip/staff.png';
import sword from './art/equip/sword.png';
import wand from './art/equip/wand.png';

export const EQUIP_ICONS: Record<string, string> = { axe, blade, boots, bow, charm, cloak, feather, jerkin, mail, plate, ring, robe, staff, sword, wand };
