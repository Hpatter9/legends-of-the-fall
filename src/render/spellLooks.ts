// RPG-SPELLS painted effects (docs/notes/spell-art.md): where each painted part sits in its session's atlas, how big it is drawn and
// how it stands. tools/spell-fx/import-spell-art.py packs the sheets painted to the brief (art-source/spell-fx/BRIEF.md) into one
// atlas a session (src/art/fx/spells/<session>.webp) and writes `index.json`, which this reads. A part is read by its key,
// `<sheet>.<part>` (`launch.impact`, `wall-ice.stand`, `revivify.cast`); a key no atlas has is simply not there, and the caller
// keeps its placeholder look. A new session drops in with no code change. Pure data: no Pixi, no DOM, so the tests read it.

import index from '../art/fx/spells/index.json';
import { TW } from './iso';

interface SessionMeta {
  cell: number;
  w: number;
  h: number;
  bytes: number;
  /** `<key>.<part>`: [column, row, frames, size in tiles, 1 when it loops, how far down the cell the painting reaches]. */
  parts: Record<string, [number, number, number, number, number, number]>;
}

/** Each session the importer packed, as `index.json` gives it. */
export const SPELL_SESSIONS: Readonly<Record<string, SessionMeta>> = index as unknown as Record<string, SessionMeta>;

export interface SpellPart {
  session: string;
  cell: number;
  col: number;
  row: number;
  frames: number;
  /** Its width on the board, in tiles (the brief's size: one tile is a fighter's footing). */
  size: number;
  loop: boolean;
  /** How far down its cell (0 to 1) the painting reaches at its lowest: where its foot is. */
  foot: number;
}

const PARTS = new Map<string, SpellPart>();
for (const [session, m] of Object.entries(SPELL_SESSIONS))
  for (const [key, [col, row, frames, size, loop, foot]] of Object.entries(m.parts)) PARTS.set(key, { session, cell: m.cell, col, row, frames, size, loop: loop === 1, foot });

/** A painted part, or undefined when no atlas has it. */
export const spellPart = (key: string): SpellPart | undefined => PARTS.get(key);
/** Every painted part's key. */
export const spellKeys = (): string[] => [...PARTS.keys()];

/** The sprite scale that draws a part at its brief size (times `mult`) in world px. */
export function spellScale(key: string, mult = 1): number {
  const p = PARTS.get(key);
  return p ? ((p.size * TW) / p.cell) * mult : mult;
}

/** The parts painted standing on the cell's bottom edge (the brief: anything that grows from the feet), drawn from the ground up
 *  rather than centred. */
const FOOTED = /^wall-[a-z]+\.(rise|stand|break)$|^(launch\.cast|launch\.impact|burrow\.cast|burrow\.impact|revivify\.cast|revivify\.impact|resurrection\.cast|resurrection\.impact|reincarnate\.cast|reincarnate\.impact|elixir\.impact|mass-resurrection\.impact|berserker-leap\.impact|seismic-slam\.impact|rage\.stand)$/;
/** Whether a part stands on the ground: it is placed by its foot rather than its middle. */
export const footed = (key: string): boolean => FOOTED.test(key);
/** The anchor's height in the cell (0 top, 1 bottom) a part is placed by: its foot when it stands on the ground, else its middle. */
export const spellAnchorY = (key: string): number => (footed(key) ? PARTS.get(key)?.foot ?? 0.92 : 0.5);
