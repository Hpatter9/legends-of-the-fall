// TRAIT-PERKS: how each perk's beat looks (`Fx.perk` draws it from a `perk` event): its word over the fighter or the spot, its colour, and
// the Blender beat clip it plays (`beat-<clip>-<element>`, the showcases' own sheets; a clip not held falls back to sparkles). Where it
// plays: on a fighter (`to`), on a tile (`at`), on each of some tiles, down a file of the board, or on the whole party. Looks only: the
// rule has already happened in the sim. Pure, so the tests read it.

import type { PerkWhat } from '../sim/traitPerks';
import type { BeatClip } from './blenderFxRules';
import type { Element } from './fxRules';

export interface PerkLook {
  /** The word shown, if any (the perk's name, or a short cry). */
  word?: string;
  /** The word's colour. */
  tint: number;
  clip: BeatClip;
  el: Element;
  /** How large the clip is drawn (1 is a fighter's size). */
  size: number;
  /** Where it plays: the fighter, the tile, every tile given, every tile of a file, or every hero. */
  on: 'to' | 'at' | 'tiles' | 'file' | 'party';
}

const L = (word: string | undefined, tint: number, clip: BeatClip, el: Element, size: number, on: PerkLook['on']): PerkLook => ({ ...(word ? { word } : {}), tint, clip, el, size, on });

export const PERK_LOOKS: Readonly<Record<PerkWhat, PerkLook>> = {
  rise: L('Risen!', 0xb8f0c8, 'rise', 'dark', 1.1, 'to'),
  rot: L(undefined, 0x9be07a, 'cloud', 'poison', 1.2, 'at'),
  poem: L('Death Poem', 0xffd2e0, 'ring', 'light', 1.1, 'to'),
  echo: L('Echo', 0xc9b8ff, 'ring', 'wind', 1.2, 'at'),
  conflux: L('Conflux!', 0xe0c8ff, 'nova', 'lightning', 1.4, 'at'),
  twin: L('Foxfire Twin', 0xffb070, 'appear', 'fire', 1, 'at'),
  dusk: L('Night Parade', 0xb8a0ff, 'cloud', 'dark', 1, 'party'),
  oath: L('Oath!', 0xbfe3ff, 'mark', 'light', 1, 'to'),
  standard: L("The Order's Standard", 0xffe27a, 'call', 'light', 1.2, 'to'),
  hallow: L(undefined, 0xfff0a0, 'ring', 'light', 1, 'to'),
  risen: L('Resurrection', 0xfff4c0, 'smite', 'light', 1.3, 'to'),
  stampede: L('Stampede!', 0xd8b070, 'dust', 'earth', 1.2, 'file'),
  weave: L('Spell Weave', 0xc0a8ff, 'nova', 'wind', 1.3, 'at'),
  overload: L(undefined, 0xc0a8ff, 'gather', 'lightning', 0.8, 'to'),
  ambush: L('Ambush', 0xd8c080, 'snare', 'forest', 0.9, 'tiles'),
  wanted: L('Wanted', 0xffc060, 'mark', 'fire', 1.1, 'to'),
  plating: L(undefined, 0xbfd8e8, 'ring', 'lightning', 0.9, 'to'),
  boom: L('Self-Destruct', 0xffa040, 'crash', 'fire', 1.4, 'at'),
  sentry: L('Sentry', 0xbfd8e8, 'appear', 'lightning', 1, 'to'),
  crown: L('Crowned', 0xffe27a, 'mark', 'light', 1, 'to'),
  tribute: L('Tribute', 0xffe27a, 'ring', 'light', 1, 'party'),
  regicide: L("Regicide's Price", 0xffe27a, 'nova', 'light', 1.5, 'to'),
  tide: L('The Tide', 0x8fd0ff, 'puff', 'ice', 1, 'tiles'),
  broadside: L('Broadside!', 0xffb070, 'sky', 'fire', 1, 'file'),
  thrall: L('Blood Thrall', 0xff7a7a, 'appear', 'blood', 1, 'to'),
  challenge: L(undefined, 0xbfe3ff, 'mark', 'light', 0.8, 'to'),
  bastion: L(undefined, 0xbfe3ff, 'blow', 'light', 0.8, 'to'),
  cuts: L('Thousand Cuts', 0xffd0d0, 'cut', 'wind', 1.4, 'to'),
  pin: L('Pinned', 0xd8e0a0, 'snare', 'earth', 0.8, 'to'),
  volley: L('Volley!', 0xffe0a0, 'mark', 'wind', 1.1, 'to'),
  linger: L(undefined, 0xffa080, 'puff', 'fire', 0.8, 'tiles'),
  overcast: L('Overcast', 0xc0a8ff, 'gather', 'lightning', 1, 'to'),
  circle: L('Warding Circle', 0xa8f0c0, 'ring', 'forest', 1.4, 'to'),
  sleight: L('Sleight', 0xa8f0d8, 'puff', 'wind', 0.8, 'to'),
  mirrors: L('Hall of Mirrors', 0xa8e0ff, 'appear', 'light', 1, 'to'),
  roar: L('Roar!', 0xffb070, 'nova', 'earth', 1.2, 'to'),
  apex: L('Apex', 0xff8a5a, 'gather', 'blood', 0.9, 'to'),
  keg: L(undefined, 0xd8b070, 'dust', 'earth', 0.7, 'at'),
  kegBoom: L('Boom!', 0xffa040, 'crash', 'fire', 1.3, 'at'),
  shells: L('Bombardment', 0xffa040, 'sky', 'fire', 1, 'tiles'),
  execute: L('Execute', 0xff6060, 'cut', 'blood', 1.2, 'to'),
  shadow: L('Shadow Step', 0xb8a0ff, 'puff', 'dark', 1, 'at'),
  hymn: L(undefined, 0xffd27a, 'ring', 'light', 0.9, 'party'),
  rally: L('Rallying Cry', 0xffd27a, 'ring', 'light', 1, 'party'),
  onslaught: L('Onslaught!', 0xffc060, 'crash', 'earth', 1.4, 'at'),
  sling: L(undefined, 0xc0a8ff, 'gather', 'wind', 0.8, 'to'),
  anchor: L('Chronal Anchor', 0xc8e8ff, 'nova', 'wind', 1.2, 'party'),
  earthworks: L('Earthworks', 0xd8c090, 'dust', 'earth', 1, 'tiles'),
};

/** The hymn's word, by its kind. */
export const HYMN_WORDS: Readonly<Record<string, string>> = { haste: 'Hymn of Haste', guard: 'Hymn of Guard', might: 'Hymn of Might' };

/** The clips a fight's awake perks may play (asked for as the fight begins, so the first one shows). */
export const perkClips = (whats: Iterable<PerkWhat>): [BeatClip, Element][] => [...new Set(whats)].map((w) => [PERK_LOOKS[w].clip, PERK_LOOKS[w].el]);

/** The beats each trait's perks can make (for the clips asked for as a fight begins). */
export const TRAIT_BEATS: Readonly<Record<string, readonly PerkWhat[]>> = {
  undead: ['rise', 'rot'], samurai: ['poem'], mystic: ['echo', 'conflux'], yokai: ['twin', 'dusk'], knightly: ['oath', 'standard'],
  holy: ['hallow', 'risen'], wild: ['stampede'], arcane: ['weave', 'overload'], frontier: ['ambush', 'wanted'], machine: ['plating', 'boom', 'sentry'],
  royal: ['crown', 'tribute', 'regicide'], pirate: ['tide', 'broadside'], vampire: ['thrall'], guardian: ['challenge', 'bastion'], blade: ['cuts'],
  marksman: ['pin', 'volley'], caster: ['linger', 'overcast'], warden: ['circle'], trickster: ['sleight', 'mirrors'], beast: ['roar', 'apex'],
  gunner: ['keg', 'kegBoom', 'shells'], assassin: ['execute', 'shadow'], support: ['hymn', 'rally'], vanguard: ['onslaught'], arcanist: ['sling', 'anchor'],
  bulwark: ['earthworks'],
};
