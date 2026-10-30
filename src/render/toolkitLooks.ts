// How the movement toolkit's events are drawn until the painted spell effects arrive (RPG-SPELLS batch 1, docs/notes/spells-b01.md;
// the paintings are briefed in docs/notes/rpg-spells-art-prompt.md). Every look is a strip of the Pixel Effects pack (`PACK`, by
// element and family) or the board's own props, tinted: plain data, free of Pixi, so a test can check every wall and aura has one.
// The painted effects (docs/notes/spell-art.md) name their part as `paint`: `fx.ts` draws the painted part when an atlas has it
// (`spellArt.ts`) and falls back to the strip here when none does.

import type { WallKind } from '../sim/toolkit';
import type { PackKey } from './fxRules';

export interface Look {
  /** A strip played once as it starts (or lands), and a strip looped while it lasts. */
  once?: PackKey;
  loop?: PackKey;
  tint?: number;
  alpha?: number;
  /** Draw the board's ruined-wall prop under the loop (a solid wall). */
  prop?: boolean;
  /** The painted part drawn instead, when an atlas has it (`<sheet>.<part>`; for a wall or an aura, the sheet alone: a wall's
   *  `rise`, `stand` and `break`, an aura's `ground` and `motes`). */
  paint?: string;
}

/** Each wall's look: the strip it rises in, the one it stands in, its tint. */
export const WALL_LOOKS: Readonly<Record<WallKind, Look>> = {
  stone: { once: 'earth-explosion', prop: true, tint: 0xc8b8a0, paint: 'wall-stone' },
  ice: { once: 'ice-explosion', loop: 'ice-spikes', prop: true, tint: 0xbfe8ff, alpha: 0.95, paint: 'wall-ice' },
  thorns: { once: 'forest-gather', loop: 'forest-spikes', tint: 0x9ce07a, paint: 'wall-thorns' },
  light: { once: 'light-nova', loop: 'light-pillar', tint: 0xfff0b0, alpha: 0.75, paint: 'wall-light' },
  fire: { once: 'fire-explosion', loop: 'fire-flame', paint: 'wall-fire' },
  wind: { loop: 'wind-vortex', tint: 0xdffcff, alpha: 0.7, paint: 'wall-wind' },
};

/** An aura's ring colour and the strip that turns at its heart, by the aura's name (a word in it); a gold ring when none matches. Its
 *  `paint` is the sheet of session B (auras and fields) for it, drawn once that session is painted. */
export function auraLook(what: string): Look & { ring: number } {
  const w = what.toLowerCase();
  if (/rot|plague|contagion|poison/.test(w)) return { ring: 0x8aa83a, loop: 'poison-circle', paint: 'aura-rot' };
  if (/storm|lightning/.test(w)) return { ring: 0x77cfff, loop: 'lightning-circle', paint: 'storm-cloud' };
  if (/mana|font|arcane/.test(w)) return { ring: 0x9a6aff, loop: 'light-rune', tint: 0xc8a8ff, paint: 'mana-font' };
  if (/guardian|spirit/.test(w)) return { ring: 0xd8ecff, loop: 'light-circle', paint: 'spirit-guardians' };
  if (/mist|heal|life/.test(w)) return { ring: 0x7be08a, loop: 'forest-aura', paint: 'healing-mist' };
  if (/dagger|feather|blade/.test(w)) return { ring: 0x9a9aa8, loop: 'wind-vortex', tint: 0x504858, paint: 'cloud-of-daggers' };
  if (/slow|time/.test(w)) return { ring: 0xffe08a, loop: 'light-rune', paint: 'slow-field' };
  if (/death|curse|dark/.test(w)) return { ring: 0x7a3aa0, loop: 'dark-circle' };
  if (/spike|thorn/.test(w)) return { ring: 0x5aa83a, loop: 'forest-spikes', paint: 'spike-growth' };
  if (/anthem|dirge|song|hymn/.test(w)) return { ring: 0xffd36a, loop: 'light-circle', paint: 'bardic-notes' };
  return { ring: 0xffd36a, loop: 'light-circle', paint: 'aura-protection' };
}

/** The other moves' looks: a launch's lift and landing, a slam, the burrow's dig, mound and eruption, a swap's swirl, an ice wall
 *  shattering. */
export const MOVE_LOOKS = {
  lift: { once: 'earth-hit', paint: 'launch.cast' },
  land: { once: 'earth-explosion', paint: 'launch.impact' },
  slam: { once: 'earth-hit', tint: 0xffffff, paint: 'slam.impact' },
  dig: { once: 'earth-explosion', paint: 'burrow.cast' },
  mound: { loop: 'earth-hit', tint: 0x8a6a4a, paint: 'burrow.ground' },
  erupt: { once: 'earth-explosion', paint: 'burrow.impact' },
  swap: { once: 'light-gather', tint: 0xd8b8ff, paint: 'swap.cast' },
  shatter: { once: 'ice-explosion', paint: 'wall-ice.break' },
} as const satisfies Record<string, Look>;

/** The painted parts that have no placeholder strip of their own: where none is painted, the move keeps the look it had (the
 *  dust, streak and puff `fx.ts` draws). */
export const PAINT = {
  /** A rock chunk spinning along with a launched fighter. */
  flight: 'launch.motes',
  /** A shove's burst of air, and its skid along the ground. */
  shove: 'shove.impact',
  skid: 'shove.trail',
  /** A pull's tether and the grip that yanks. */
  tether: 'pull.beam',
  grip: 'pull.impact',
  /** The ribbon between two fighters who swap. */
  swapLink: 'swap.beam',
  /** A dash's streak and where it stops. */
  dash: 'dash.trail',
  dashStop: 'dash.impact',
  /** A blink: vanishing, and appearing. */
  blinkOut: 'blink.cast',
  blinkIn: 'blink.impact',
  /** A teleport slash: the cut along each hop, and the crossed slash on each foe struck. */
  slash: 'teleport-slash.trail',
  slashHit: 'teleport-slash.impact',
} as const;
