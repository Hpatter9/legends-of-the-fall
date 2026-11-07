// Painted finishing-pass menu assets, bundled as data URLs for offline play.
import type { OathId, TravellerId } from './sim/calJourney';
import type { EquipSlot } from './sim/equipment';
import pilgrim from './art/finishing/pilgrim.webp';
import deserter from './art/finishing/deserter.webp';
import cartographer from './art/finishing/cartographer.webp';
import iron from './art/finishing/oath-iron.webp';
import ember from './art/finishing/oath-ember.webp';
import coin from './art/finishing/oath-coin.webp';
import vigil from './art/finishing/oath-vigil.webp';
import provisions from './art/finishing/provisions.webp';
import head from './art/finishing/empty-head.webp';
import torso from './art/finishing/empty-torso.webp';
import main from './art/finishing/empty-main.webp';
import off from './art/finishing/empty-off.webp';
import feet from './art/finishing/empty-feet.webp';
import belt from './art/finishing/empty-belt.webp';
import acc from './art/finishing/empty-acc.webp';
import backing from './art/finishing/doll-backing.webp';

export const TRAVELLER_ART: Readonly<Record<TravellerId, string>> = { pilgrim, deserter, cartographer };
export const OATH_ART: Readonly<Record<OathId, string>> = { iron, ember, coin, vigil };
export const EMPTY_SLOT_ART: Readonly<Record<EquipSlot, string>> = { head, torso, main, off, feet, belt, acc };
export const PROVISIONS_ART = provisions;
export const DOLL_BACKING = backing;
