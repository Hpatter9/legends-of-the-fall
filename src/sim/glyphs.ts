// The enchanting glyphs (SEVEN-SLOT GEAR batch 3, docs/notes/gear-runes-design.md section 5): a small extra line a piece can take, up to
// three, chosen at Hester's Enchant tab (`enchant.ts` has the prices and the rules). Each is about a third of a Rare piece's main stat,
// and each slot has its own list, so a boot takes a Swiftfoot glyph and a weapon a Keen one. Pure data: no Pixi, no DOM.

import type { EquipSlot, Main } from './equipBases';

export interface Glyph {
  id: string;
  name: string;
  /** What it adds, as main stats (shares are 0.06 for +6%; `def` flat), as they are. */
  main: Main;
  text: string;
}

/** The most glyphs a piece takes. */
export const MAX_GLYPHS = 3;

const G = (id: string, name: string, main: Main, text: string): Glyph => ({ id, name, main, text });
export const GLYPH_LIST: readonly Glyph[] = [
  G('keen', 'Keen', { crit: 0.012 }, '+1.2% crit chance'),
  G('mighty', 'Mighty', { atk: 0.012 }, '+1.2% attack'),
  G('quick', 'Quick', { atkSpeed: 0.012 }, '+1.2% attack speed'),
  G('swiftfoot', 'Swiftfoot', { moveSpeed: 0.04 }, '+4% move speed'),
  G('stout', 'Stout', { hp: 0.015 }, '+1.5% hp'),
  G('guarded', 'Guarded', { def: 0.3 }, '+0.3 defence'),
  G('warded', 'Warded', { resist: 0.025 }, '+2.5% resist'),
  G('focused', 'Focused', { charge: 0.03 }, '+3% skill charge'),
  G('mending', 'Mending', { regen: 0.001 }, 'mends 0.1% hp a second'),
  G('nimble', 'Nimble', { dodge: 0.012 }, '+1.2% dodge'),
];
export const GLYPHS: Readonly<Record<string, Glyph>> = Object.fromEntries(GLYPH_LIST.map((g) => [g.id, g]));

/** The glyphs each slot takes. */
export const SLOT_GLYPHS: Readonly<Record<EquipSlot, readonly string[]>> = {
  main: ['keen', 'mighty', 'quick', 'focused'],
  off: ['guarded', 'warded', 'focused', 'stout', 'mighty'],
  torso: ['stout', 'guarded', 'warded', 'mending', 'nimble'],
  head: ['warded', 'focused', 'keen', 'stout'],
  feet: ['swiftfoot', 'nimble', 'guarded', 'quick'],
  belt: ['stout', 'mending', 'mighty', 'warded'],
  acc: ['keen', 'mighty', 'focused', 'nimble', 'mending', 'quick'],
};
