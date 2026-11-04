// The owner's painted gear pieces that are not equipment (SEVEN-SLOT GEAR batch 7, `tools/gear/import-gear-ui.py`, docs/notes/gear-build.md):
// the eight rune stones, the five rune frames (one a rune level), the merge spark's six-frame strip, the fourteen set emblems, the three
// glyph stones (one a glyph on a piece) and the five remedies. Bundled as data URLs, so they play offline.

import type { RuneKind } from './sim/runes';
import type { RemedyId } from './sim/remedies';
import runeEmber from './art/gear/ui/runes/ember.webp';
import runeBulwark from './art/gear/ui/runes/bulwark.webp';
import runeArcana from './art/gear/ui/runes/arcana.webp';
import runeGale from './art/gear/ui/runes/gale.webp';
import runeHawk from './art/gear/ui/runes/hawk.webp';
import runeWellspring from './art/gear/ui/runes/wellspring.webp';
import runeWarding from './art/gear/ui/runes/warding.webp';
import runeKeystone from './art/gear/ui/runes/keystone.webp';
import runeFrame1 from './art/gear/ui/runes/frame-1.webp';
import runeFrame2 from './art/gear/ui/runes/frame-2.webp';
import runeFrame3 from './art/gear/ui/runes/frame-3.webp';
import runeFrame4 from './art/gear/ui/runes/frame-4.webp';
import runeFrame5 from './art/gear/ui/runes/frame-5.webp';
import mergeSpark from './art/gear/ui/runes/merge-spark.webp';
import emblemArcane from './art/gear/ui/emblems/arcane.webp';
import emblemEmber from './art/gear/ui/emblems/ember.webp';
import emblemFrost from './art/gear/ui/emblems/frost.webp';
import emblemGrave from './art/gear/ui/emblems/grave.webp';
import emblemHunter from './art/gear/ui/emblems/hunter.webp';
import emblemPeak from './art/gear/ui/emblems/peak.webp';
import emblemRadiant from './art/gear/ui/emblems/radiant.webp';
import emblemSamurai from './art/gear/ui/emblems/samurai.webp';
import emblemShadow from './art/gear/ui/emblems/shadow.webp';
import emblemStorm from './art/gear/ui/emblems/storm.webp';
import emblemTide from './art/gear/ui/emblems/tide.webp';
import emblemVanguard from './art/gear/ui/emblems/vanguard.webp';
import emblemWind from './art/gear/ui/emblems/wind.webp';
import emblemWyrm from './art/gear/ui/emblems/wyrm.webp';
import glyphStone1 from './art/gear/ui/glyphs/stone-1.webp';
import glyphStone2 from './art/gear/ui/glyphs/stone-2.webp';
import glyphStone3 from './art/gear/ui/glyphs/stone-3.webp';
import remedyBandageRoll from './art/gear/ui/remedies/bandageRoll.webp';
import remedyHealingDraught from './art/gear/ui/remedies/healingDraught.webp';
import remedyCampStew from './art/gear/ui/remedies/campStew.webp';
import remedyPhoenixAsh from './art/gear/ui/remedies/phoenixAsh.webp';
import remedyElixirOfTheKeep from './art/gear/ui/remedies/elixirOfTheKeep.webp';

export const RUNE_ICON: Readonly<Record<RuneKind, string>> = { ember: runeEmber, bulwark: runeBulwark, arcana: runeArcana, gale: runeGale, hawk: runeHawk, wellspring: runeWellspring, warding: runeWarding, keystone: runeKeystone };
/** A rune's frame by its level (index 0 unused): copper, silver, gold, gold with sapphires, gold with amethysts. */
export const RUNE_FRAME: readonly string[] = ['', runeFrame1, runeFrame2, runeFrame3, runeFrame4, runeFrame5];
/** The merge spark: six frames side by side, played once over a rune just made. */
export const MERGE_SPARK = mergeSpark;
/** Each set's emblem, by the set's id. */
export const SET_EMBLEM: Readonly<Record<string, string>> = { arcane: emblemArcane, ember: emblemEmber, frost: emblemFrost, grave: emblemGrave, hunter: emblemHunter, peak: emblemPeak, radiant: emblemRadiant, samurai: emblemSamurai, shadow: emblemShadow, storm: emblemStorm, tide: emblemTide, vanguard: emblemVanguard, wind: emblemWind, wyrm: emblemWyrm };
/** The glyph stones: the first, second and third glyph on a piece (index 0 unused); the third, gold, is the Enchant tab's icon. */
export const GLYPH_STONE: readonly string[] = ['', glyphStone1, glyphStone2, glyphStone3];
export const REMEDY_ICON: Readonly<Record<RemedyId, string>> = { bandage: remedyBandageRoll, draught: remedyHealingDraught, stew: remedyCampStew, phoenix: remedyPhoenixAsh, elixir: remedyElixirOfTheKeep };
