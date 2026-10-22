// The rules behind the combat effects, kept free of Pixi and the DOM so the tests can check them: which missile a shot
// draws, the element of each skill and spell, how a fighter dies, which statuses show as loops, and how many bits a
// burst throws. The art is the Pixel Effects pack's strips (`src/art/fx/pack`, packed by `tools/fx-atlas.py`); a
// `PackKey` is '<element>-<family>' and the tests check that every one named here is in the atlas.

import type { Unit } from '../sim/battle';
import type { SpellId } from '../sim/spells';
import type { Shot } from '../sim/units';

export type Element = 'fire' | 'ice' | 'lightning' | 'light' | 'dark' | 'forest' | 'poison' | 'earth' | 'wind' | 'blood';
export const ELEMENTS: readonly Element[] = ['fire', 'ice', 'lightning', 'light', 'dark', 'forest', 'poison', 'earth', 'wind', 'blood'];
/** The families every full element has in the atlas. */
export type Family = 'orb' | 'hit' | 'explosion' | 'slash' | 'circle' | 'rune' | 'shield' | 'status' | 'gather' | 'nova' | 'cross' | 'puff' | 'smoke' | 'sparkle' | 'aura' | 'vortex' | 'pillar' | 'strike' | 'spikes' | 'wave' | 'flame';
export type PackKey = `${Element}-${Family}`;
export const packKey = (el: Element, fam: Family): PackKey => `${el}-${fam}`;

/** The colour of an element's glow (a tint for the bits that are not from the pack, and for light and flashes). */
export const GLOW: Record<Element, number> = {
  fire: 0xff9a3a,
  ice: 0x9fe4ff,
  lightning: 0xbfe6ff,
  light: 0xfff2a0,
  dark: 0xb06aff,
  forest: 0x8aff5a,
  poison: 0x9be07a,
  earth: 0xc89a5a,
  wind: 0xd8f4ff,
  blood: 0xff5a5a,
};

/* ------------------------------------------------------------------ missiles */

/** How a shot is drawn: a sprite (an arrow, a bone), a glowing orb, or a bullet's tracer. */
export interface Missile {
  look: 'arrow' | 'bone' | 'orb' | 'tracer';
  el: Element;
  /** Size on screen (an orb's frames are 32px). */
  scale: number;
  /** How high it arcs over a flight of any length: a share of the distance, plus a floor (px). */
  arc: { share: number; min: number };
  /** Ms between trail puffs. */
  trailMs: number;
  /** The orb turns as it flies (a leaf, a bone). */
  spin: boolean;
  /** A flash and smoke where it leaves (a gun, a staff). */
  muzzle: boolean;
}

/** The missile of a shot, from its kind and the shooter's name (a gorgon spits poison whatever its shot, a lightning mage
 *  flings lightning, a shaman king shadow). */
export function missileOf(shot: Shot, shooter: string): Missile {
  const orb = (el: Element, scale = 1, spin = false): Missile => ({ look: 'orb', el, scale, arc: { share: 0.03, min: 6 }, trailMs: 40, spin, muzzle: true });
  if (/gorgon/i.test(shooter)) return orb('poison', 0.9);
  if (/lightning/i.test(shooter)) return orb('lightning', 1);
  if (/shaman/i.test(shooter)) return orb('dark', 1.1);
  switch (shot) {
    case 'arrow':
      return { look: 'arrow', el: 'wind', scale: 0.55, arc: { share: 0.15, min: 18 }, trailMs: 45, spin: false, muzzle: false };
    case 'bone':
      return { look: 'bone', el: 'dark', scale: 0.6, arc: { share: 0.15, min: 18 }, trailMs: 60, spin: true, muzzle: false };
    case 'bullet':
      return { look: 'tracer', el: 'fire', scale: 1, arc: { share: 0, min: 2 }, trailMs: 30, spin: false, muzzle: true };
    case 'fire':
      return orb('fire', 1);
    case 'bolt':
      return orb('lightning', 1);
    case 'holy':
      return orb('light', 1);
    case 'leaf':
      return orb('forest', 0.9, true);
    case 'curse':
      return orb('dark', 1);
  }
}

/** The element an arrow's or bullet's landing spark is drawn in (wind for arrows reads as a white scatter). */
export const impactElement = (m: Missile): Element => (m.look === 'orb' ? m.el : m.look === 'tracer' ? 'fire' : m.look === 'bone' ? 'earth' : 'wind');

/* ------------------------------------------------------------------ skills and spells */

/** The element of each skill (the glow under the caster as it winds up, and an extra burst where it lands). */
export const SKILL_ELEMENT: Record<string, Element> = {
  'Shield Wall': 'earth',
  Iaido: 'wind',
  'Shadow Step': 'dark',
  Volley: 'wind',
  Meteor: 'fire',
  'Thousand Fists': 'light',
  'Hold the Line': 'earth',
  'Chain Lightning': 'lightning',
  Sanctuary: 'light',
  'Fox Charm': 'dark',
  'Nine-Tailed Dream': 'dark',
  Dive: 'wind',
  'Feather Storm': 'blood',
  'Wind Gust': 'wind',
  Tempest: 'wind',
  'Holy Challenge': 'light',
  Benediction: 'light',
  'Call Treant': 'forest',
  Whirlwind: 'blood',
  'Snare Trap': 'earth',
  Hex: 'dark',
  'Mirror Image': 'dark',
  'Dead Eye': 'fire',
  'Ground Slam': 'earth',
  'Horned Shove': 'earth',
  'Summon Imps': 'fire',
  Hellfire: 'fire',
  'Spirit Ward': 'light',
  Ravage: 'blood',
  'Gore Charge': 'earth',
  'Pipes of Pan': 'forest',
  'Petrifying Gaze': 'poison',
  'Stone Curse': 'poison',
  'War Banner': 'light',
  'Rally Cry': 'light',
  'Tusk Flurry': 'blood',
  'Raise Dead': 'dark',
  'Soul Nova': 'ice',
  Possession: 'dark',
  Foxfire: 'fire',
  'Kanabo Smash': 'earth',
  'Thunder Drum': 'lightning',
  'Crushing Slam': 'earth',
  'Shard Burst': 'ice',
  'Shard Storm': 'ice',
  'Magma Burst': 'fire',
  'Forge Hammer': 'earth',
  'Furnace Blast': 'fire',
  // the second wave of heroes
  'Rotting Touch': 'poison',
  'Burst Fire': 'fire',
  'Bounty Hunt': 'blood',
  'Binding Wraps': 'earth',
  'Grappling Hook': 'blood',
  Dirge: 'ice',
  'Call of the Wild': 'forest',
  Undertow: 'ice',
  'Lance Charge': 'earth',
  Reap: 'dark',
  'Temporal Surge': 'light',
  'Voltage Blink': 'lightning',
  Broadside: 'fire',
  'Shell Barrage': 'fire',
  'Holy Light': 'light',
  'Dragon Breath': 'fire',
  Earthquake: 'earth',
  Starfall: 'light',
  'Hellblade Sweep': 'blood',
  Judgement: 'dark',
  'Astral Convergence': 'light',
  'Demon Form': 'blood',
  'Reign of Terror': 'dark',
};

export const skillElement = (name: string): Element => SKILL_ELEMENT[name] ?? 'light';

/** The element of each king's spell. */
export const SPELL_ELEMENT: Record<SpellId, Element> = {
  heal: 'light',
  meteor: 'fire',
  haste: 'wind',
  shield: 'light',
  chain: 'lightning',
  frost: 'ice',
  rally: 'fire',
  quake: 'earth',
  smite: 'light',
  resurrect: 'light',
  poison: 'poison',
};

/* ------------------------------------------------------------------ deaths */

/** How a fighter falls apart. */
export type DeathKind = 'bones' | 'burn' | 'thud' | 'stone' | 'blood' | 'light';

/** From the kind's name and side: skeletons into bones, imps and demons burn away, ogres and the other big brutes thud
 *  with dust, a gorgon turns to stone chips, a hero fades in motes of light, the rest bleed. */
export function deathKind(name: string, side: 'hero' | 'foe'): DeathKind {
  if (/skeleton/i.test(name)) return 'bones';
  if (/^(imp|demon|devil)/i.test(name)) return 'burn';
  if (/ogre|minotaur|warlord|boar|brute|forest boss|juggernaut/i.test(name)) return 'thud';
  if (/gorgon/i.test(name)) return 'stone';
  return side === 'hero' ? 'light' : 'blood';
}

/* ------------------------------------------------------------------ statuses */

export type StatusKey = 'shield' | 'slow' | 'burn' | 'bleed' | 'curse' | 'stun' | 'haste' | 'rally' | 'banner' | 'frenzy' | 'regen';

/** A looping overlay that stays on a fighter while its status lasts. */
export interface StatusLook {
  sheet: PackKey;
  /** Size relative to the fighter's height (1 = as tall as it is). */
  size: number;
  /** Where its centre sits up the body: 0 at the feet, 1 at the head. */
  at: number;
  alpha: number;
  frameMs: number;
  tint?: number;
}

export const STATUS_LOOKS: Record<Exclude<StatusKey, 'stun'>, StatusLook> = {
  shield: { sheet: 'light-shield', size: 1.15, at: 0.5, alpha: 0.4, frameMs: 120, tint: 0x9ad0ff },
  slow: { sheet: 'ice-status', size: 1.3, at: 0.55, alpha: 0.95, frameMs: 130 },
  burn: { sheet: 'fire-flame', size: 0.7, at: 0.35, alpha: 0.9, frameMs: 90 },
  bleed: { sheet: 'blood-status', size: 1.2, at: 0.5, alpha: 0.9, frameMs: 130 },
  curse: { sheet: 'dark-aura', size: 1.3, at: 0.3, alpha: 0.9, frameMs: 120 },
  haste: { sheet: 'wind-status', size: 1.3, at: 0.5, alpha: 0.9, frameMs: 100 },
  rally: { sheet: 'fire-aura', size: 1.2, at: 0.3, alpha: 0.85, frameMs: 120 },
  banner: { sheet: 'light-aura', size: 1.2, at: 0.3, alpha: 0.8, frameMs: 120, tint: 0xffe27a },
  frenzy: { sheet: 'blood-aura', size: 1.3, at: 0.3, alpha: 0.9, frameMs: 90 },
  regen: { sheet: 'forest-status', size: 1.3, at: 0.5, alpha: 0.9, frameMs: 130 },
};

/** The fields of a fighter the statuses read (a `Unit` has them all). */
export type StatusSource = Pick<Unit, 'alive' | 'dot' | 'slowUntil' | 'hasteUntil' | 'rallyUntil' | 'banner' | 'frenzy' | 'form' | 'hot' | 'shield' | 'stunUntil'>;

/** The statuses holding on a fighter at time `t`, most telling first. */
export function statusesOf(u: StatusSource, t: number): StatusKey[] {
  if (!u.alive) return [];
  const out: StatusKey[] = [];
  if (u.stunUntil !== undefined && t < u.stunUntil) out.push('stun');
  if (u.dot && t < u.dot.until) out.push(u.dot.kind === 'burn' ? 'burn' : u.dot.kind === 'curse' ? 'curse' : 'bleed');
  if (u.slowUntil !== undefined && t < u.slowUntil) out.push('slow');
  if (u.shield && t < u.shield.until && u.shield.hp > 0) out.push('shield');
  if (u.hasteUntil !== undefined && t < u.hasteUntil) out.push('haste');
  if (u.rallyUntil !== undefined && t < u.rallyUntil) out.push('rally');
  if (u.banner && t < u.banner.until) out.push('banner');
  // (a demon form burns with the same red aura as a frenzy)
  if ((u.frenzy && t < u.frenzy.until) || (u.form && t < u.form.until)) out.push('frenzy');
  if (u.hot && t < u.hot.until) out.push('regen');
  return out;
}

/** The most statuses drawn on one fighter at once (the saver draws fewer). */
export const maxStatuses = (saver: boolean) => (saver ? 2 : 3);

/* ------------------------------------------------------------------ amounts */

/** How many bits of a burst to throw: the usual count scaled by the particle density, never fewer than one. */
export const bits = (n: number, density: number) => Math.max(1, Math.round(n * density));

/** A hit-stop in ms for a blow: only a crit or a big share of health, and none when reduced motion or no-shake is on. */
export function hitStopMs(heavy: boolean, share: number, killed: boolean, calm: boolean): number {
  if (calm) return 0;
  if (killed && share >= 0.3) return 90;
  return heavy ? 60 : 0;
}

/** The knock a blow gives its target, in px along the line from the attacker: bigger for a bigger share of health. */
export const nudgeOf = (share: number) => Math.min(7, 2 + share * 14);

/* ------------------------------------------------------------------ tethers */

/** What a line between two fighters is: lightning jumping between foes, the Kitsune's charm, the Warlock's hex. */
export type ArcStyle = 'lightning' | 'charm' | 'hex';

/** From the id of the fighter the line leaves (the sim sends one `arc` event for all three). */
export const arcStyle = (fromDef: string): ArcStyle => (fromDef === 'kitsune' ? 'charm' : fromDef === 'warlock' ? 'hex' : 'lightning');

/* ------------------------------------------------------------------ the king's spells */

/** What a spell throws where it lands (on the tapped tile's centre): strips and their size (1 = 32px). */
export const SPELL_CAST: Record<Exclude<SpellId, 'meteor'>, { key: PackKey; scale: number }[]> = {
  heal: [{ key: 'light-circle', scale: 2.8 }, { key: 'forest-aura', scale: 3 }],
  haste: [{ key: 'wind-circle', scale: 2.8 }, { key: 'wind-vortex', scale: 3 }],
  shield: [{ key: 'light-circle', scale: 2.8 }, { key: 'light-nova', scale: 3 }],
  smite: [{ key: 'light-circle', scale: 2.8 }, { key: 'light-pillar', scale: 3.5 }, { key: 'light-nova', scale: 3 }],
  chain: [{ key: 'lightning-circle', scale: 2.8 }, { key: 'lightning-nova', scale: 3 }],
  frost: [{ key: 'ice-circle', scale: 2.8 }, { key: 'ice-nova', scale: 4 }, { key: 'ice-wave', scale: 4 }],
  rally: [{ key: 'fire-nova', scale: 3 }],
  quake: [{ key: 'earth-wave', scale: 4 }],
  resurrect: [{ key: 'light-circle', scale: 2.8 }, { key: 'light-pillar', scale: 3 }, { key: 'light-rune', scale: 2.8 }],
  poison: [{ key: 'poison-circle', scale: 2.8 }, { key: 'poison-explosion', scale: 3 }],
};

/** What a spell plays on each fighter it touches: a strip, its size as a share of the fighter's height, and where up the body. */
export const SPELL_TOUCH: Record<Exclude<SpellId, 'meteor'>, { key: PackKey; size: number; at: number } | undefined> = {
  heal: { key: 'forest-sparkle', size: 1.3, at: 0.5 },
  haste: { key: 'wind-nova', size: 1.2, at: 0.5 },
  shield: { key: 'light-shield', size: 1.2, at: 0.5 },
  smite: { key: 'light-pillar', size: 3, at: 0.2 },
  chain: { key: 'lightning-hit', size: 1.2, at: 0.5 },
  frost: { key: 'ice-explosion', size: 1.3, at: 0.5 },
  rally: { key: 'fire-aura', size: 1.3, at: 0.2 },
  quake: { key: 'earth-hit', size: 1.2, at: 0.2 },
  resurrect: { key: 'light-pillar', size: 2.5, at: 0.2 },
  poison: undefined,
};

/* ------------------------------------------------------------------ keeping big effects readable */

/** A screen flash is a blink: at most this bright (alpha) and this long (ms). Only ultimates and big crits use one. */
export const FLASH_MAX = 0.35;
export const FLASH_MS = 120;

/** The colour an ultimate's layers are drawn in, where the pack's own strip would clip to white (wind and lightning are
 *  near-white; a pale blue and cyan keeps them a storm). Fire, blood and the rest keep their own colours. */
export const ULT_TINT: Partial<Record<Element, number>> = { wind: 0x8fe0ff, lightning: 0x9fd8ff, light: 0xffe9a0 };
