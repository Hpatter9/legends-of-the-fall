// The rune stones (SEVEN-SLOT GEAR batch 7's pack audit): the 16px rune discs of the 5000 Pixel Effects pack (each element's second frame,
// copied as they are; CREDITS.md), one a kind: Ember the fire rune, Bulwark the wind's iron grey, Arcana the crystal's violet, Gale the
// forest's green, Hawk the light's gold, Wellspring the water's blue, Warding the moon's white and the Keystone the dark rune. Bundled, so
// they play offline.

import ember from './art/runes/ember.png';
import bulwark from './art/runes/bulwark.png';
import arcana from './art/runes/arcana.png';
import gale from './art/runes/gale.png';
import hawk from './art/runes/hawk.png';
import wellspring from './art/runes/wellspring.png';
import warding from './art/runes/warding.png';
import keystone from './art/runes/keystone.png';
import type { RuneKind } from './sim/runes';

export const RUNE_ICON: Readonly<Record<RuneKind, string>> = { ember, bulwark, arcana, gale, hawk, wellspring, warding, keystone };
