// How the movement toolkit's events are drawn until the painted spell effects arrive (RPG-SPELLS batch 1, docs/notes/spells-b01.md;
// the paintings are briefed in docs/notes/rpg-spells-art-prompt.md). Every look is a strip of the Pixel Effects pack (`PACK`, by
// element and family) or the board's own props, tinted: plain data, free of Pixi, so a test can check every wall and aura has one.
// When the painted atlases land, `toolkitFx` reads the painted part first and falls back to these.

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
}

/** Each wall's look: the strip it rises in, the one it stands in, its tint. */
export const WALL_LOOKS: Readonly<Record<WallKind, Look>> = {
  stone: { once: 'earth-explosion', prop: true, tint: 0xc8b8a0 },
  ice: { once: 'ice-explosion', loop: 'ice-spikes', prop: true, tint: 0xbfe8ff, alpha: 0.95 },
  thorns: { once: 'forest-gather', loop: 'forest-spikes', tint: 0x9ce07a },
  light: { once: 'light-nova', loop: 'light-pillar', tint: 0xfff0b0, alpha: 0.75 },
  fire: { once: 'fire-explosion', loop: 'fire-flame' },
  wind: { loop: 'wind-vortex', tint: 0xdffcff, alpha: 0.7 },
};

/** An aura's ring colour and the strip that turns at its heart, by the aura's name (a word in it); a gold ring when none matches. */
export function auraLook(what: string): Look & { ring: number } {
  const w = what.toLowerCase();
  if (/rot|plague|contagion|poison/.test(w)) return { ring: 0x8aa83a, loop: 'poison-circle' };
  if (/storm|lightning/.test(w)) return { ring: 0x77cfff, loop: 'lightning-circle' };
  if (/mana|font|arcane/.test(w)) return { ring: 0x9a6aff, loop: 'light-rune', tint: 0xc8a8ff };
  if (/mist|heal|life/.test(w)) return { ring: 0x7be08a, loop: 'forest-aura' };
  if (/dagger|feather|blade/.test(w)) return { ring: 0x9a9aa8, loop: 'wind-vortex', tint: 0x504858 };
  if (/slow|time/.test(w)) return { ring: 0xffe08a, loop: 'light-rune' };
  if (/death|curse|dark/.test(w)) return { ring: 0x7a3aa0, loop: 'dark-circle' };
  if (/spike|thorn/.test(w)) return { ring: 0x5aa83a, loop: 'forest-spikes' };
  return { ring: 0xffd36a, loop: 'light-circle' };
}

/** The other moves' looks: a launch's lift and landing, a slam, the burrow's dig, mound and eruption, a swap's swirl, an ice wall
 *  shattering. */
export const MOVE_LOOKS = {
  lift: { once: 'earth-hit' },
  land: { once: 'earth-explosion' },
  slam: { once: 'earth-hit', tint: 0xffffff },
  dig: { once: 'earth-explosion' },
  mound: { loop: 'earth-hit', tint: 0x8a6a4a },
  erupt: { once: 'earth-explosion' },
  swap: { once: 'light-gather', tint: 0xd8b8ff },
  shatter: { once: 'ice-explosion' },
} as const satisfies Record<string, Look>;
