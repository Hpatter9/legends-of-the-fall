// XP tomes: a chest's extra (the owner's ask: "XP boosts as an item from the chests"). A tome holds a fixed amount of XP that the
// player gives to one hero of their choice, from the hero's page. There are three sizes; a bigger chest holds more tomes and bigger
// ones. What a chest holds is drawn from a side stream of its own seed (`TOME_SALT`), so the crowns, stones and gear of every chest
// roll exactly as they did before tomes existed. The tomes are kept as a count per size (`Meta.tomes`; saves from before have none).
// A tome cannot take a hero past `MAX_LEVEL`: the hero stops at the cap and the rest of the tome's XP is lost (the page says so
// before the tap), and a hero already at the cap cannot read one. Pure rules: no Pixi, no DOM. See `docs/notes/chest-extras.md`.

import type { Meta } from './meta';
import { levelOf, MAX_LEVEL, xpFor, xpOf, type LevelUp } from './levels';
import { mixSeed, Rng } from './rng';

export type TomeSize = 'small' | 'medium' | 'large';
export const TOME_SIZES: readonly TomeSize[] = ['small', 'medium', 'large'];

export interface Tome {
  size: TomeSize;
  name: string;
  /** The XP it gives the hero it is used on (up to the level cap). */
  xp: number;
}

/**
 * The tomes, sized on the level curve (`levels.ts`):
 * - small, 250 XP: about one ordinary fight at mid levels (a mid army's wave pays a hero about 190 on Normal and 300 on Hard);
 * - medium, 5,000 XP: about a level at level 20 (level 21 costs 4,800);
 * - large, 20,000 XP: several levels at level 30: the last three to it (27 to 30 cost 20,160), or one past it (31 costs 20,800).
 */
export const TOMES: Readonly<Record<TomeSize, Tome>> = {
  small: { size: 'small', name: 'Small XP tome', xp: 250 },
  medium: { size: 'medium', name: 'Medium XP tome', xp: 5000 },
  large: { size: 'large', name: 'Large XP tome', xp: 20000 },
};

/** A count of tomes by size (missing is none). */
export type TomeCounts = Partial<Record<TomeSize, number>>;

/** The chest sizes the tomes are drawn for: the army, tower and Last Stand chests by their milestone, the daily chest, and the shop's three. */
export type TomeChest = 'bronze' | 'silver' | 'gold' | 'mythic' | 'daily';

/** What each chest holds: a fixed number of each size, and a chance of one more. */
export const TOME_DROPS: Readonly<Record<TomeChest, Readonly<Record<TomeSize, { n: number; extra: number }>>>> = {
  bronze: { small: { n: 1, extra: 0.3 }, medium: { n: 0, extra: 0 }, large: { n: 0, extra: 0 } },
  daily: { small: { n: 1, extra: 0 }, medium: { n: 0, extra: 0.1 }, large: { n: 0, extra: 0 } },
  silver: { small: { n: 2, extra: 0 }, medium: { n: 0, extra: 0.4 }, large: { n: 0, extra: 0 } },
  gold: { small: { n: 2, extra: 0 }, medium: { n: 1, extra: 0 }, large: { n: 0, extra: 0.25 } },
  mythic: { small: { n: 3, extra: 0 }, medium: { n: 1, extra: 0 }, large: { n: 1, extra: 0 } },
};
/** A daily chest's bonus stars each add a small tome. */
export const DAILY_BONUS_TOMES = 1;

/** The salt of a chest's tome stream (mixed with the chest's own seed). */
export const TOME_SALT = 0x70e3;

/** The tomes a chest holds, drawn from a side stream of its seed: the same chest always holds the same. `bonus` is a daily chest's bonus stars. */
export function rollTomes(seed: number, chest: TomeChest, bonus = 0): TomeCounts {
  const rng = new Rng(mixSeed(seed, TOME_SALT));
  const out: TomeCounts = {};
  for (const size of TOME_SIZES) {
    const d = TOME_DROPS[chest][size];
    // (the chance is drawn for every size, in the same order, whether or not it can pay, so the stream is the same shape for every chest)
    const n = d.n + (rng.chance(d.extra) ? 1 : 0) + (chest === 'daily' && size === 'small' ? DAILY_BONUS_TOMES * bonus : 0);
    if (n > 0) out[size] = n;
  }
  return out;
}

/** The tomes the meta holds of a size. */
export const tomesOf = (m: Meta, size: TomeSize): number => m.tomes?.[size] ?? 0;
/** All the tomes the meta holds. */
export const tomeTotal = (m: Meta): number => TOME_SIZES.reduce((n, s) => n + tomesOf(m, s), 0);

/** Add tomes to the meta. */
export function grantTomes(m: Meta, add: TomeCounts): void {
  for (const size of TOME_SIZES) {
    const n = add[size] ?? 0;
    if (n > 0) (m.tomes ??= {})[size] = tomesOf(m, size) + n;
  }
}

/** Two counts added together (for the Open all summary). */
export function addTomes(a: TomeCounts, b: TomeCounts): TomeCounts {
  const out: TomeCounts = {};
  for (const size of TOME_SIZES) {
    const n = (a[size] ?? 0) + (b[size] ?? 0);
    if (n > 0) out[size] = n;
  }
  return out;
}

/** The words for a count of one size: "2 small XP tomes". */
export const tomeWords = (size: TomeSize, n: number): string => `${n} ${size} XP tome${n === 1 ? '' : 's'}`;

/** The XP a hero can still take before the level cap. */
export const roomOf = (m: Meta, kind: string): number => Math.max(0, xpFor(MAX_LEVEL) - xpOf(m, kind));

/** What a tome would do to a hero now: the XP it would give (to the cap) and the XP lost over it. */
export function tomeGain(m: Meta, kind: string, size: TomeSize): { gain: number; lost: number } {
  const gain = Math.min(TOMES[size].xp, roomOf(m, kind));
  return { gain, lost: TOMES[size].xp - gain };
}

/** Whether a tome of a size can be used on a hero: one is held, the hero is owned, and it is below the level cap. */
export const canUseTome = (m: Meta, kind: string, size: TomeSize): boolean => tomesOf(m, size) > 0 && m.unlocked.includes(kind) && roomOf(m, kind) > 0;

export interface TomeUse {
  kind: string;
  size: TomeSize;
  /** The hero's XP before, and the XP the tome gave (the cap may have cut it), and the XP lost over the cap. */
  before: number;
  gain: number;
  lost: number;
  /** The levels it reached, when it reached a new one (the same shape as a fight's level-ups). */
  up: LevelUp | null;
}

/** Use a tome on a hero: one tome of the size is spent, and its XP is added (up to the level cap; the rest is lost). Null when it cannot be (`canUseTome`). */
export function useTome(m: Meta, kind: string, size: TomeSize): TomeUse | null {
  if (!canUseTome(m, kind, size)) return null;
  const before = xpOf(m, kind);
  const { gain, lost } = tomeGain(m, kind, size);
  const from = levelOf(before);
  m.xp[kind] = before + gain;
  const to = levelOf(m.xp[kind]);
  const left = tomesOf(m, size) - 1;
  if (left > 0) m.tomes![size] = left;
  else delete m.tomes![size];
  return { kind, size, before, gain, lost, up: to > from ? { kind, from, to } : null };
}

/** A saved tome count that is sane: whole counts of the three sizes; undefined when there are none. */
export function readTomes(raw: unknown): TomeCounts | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: TomeCounts = {};
  for (const size of TOME_SIZES) {
    const n = (raw as Record<string, unknown>)[size];
    if (typeof n === 'number' && n >= 1) out[size] = Math.floor(n);
  }
  return Object.keys(out).length ? out : undefined;
}
