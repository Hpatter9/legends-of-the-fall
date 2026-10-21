// Levels for the hero kinds. Each fight gives every hero that fought some XP: a part for taking part, more for a win, and
// a share for the damage it dealt, the healing it did and the kills it made (a fallen hero gets less). The XP is kept per
// kind in the meta, and the level is read from it. Each level above the first adds to the kind's hp and attack, up to
// `MAX_LEVEL`, and the curve rises so each level takes a little more XP than the last. Pure rules: no Pixi, no DOM.

import type { Battle } from './battle';
import type { Meta } from './meta';

export const MAX_LEVEL = 20;
export const XP_TAKE_PART = 10;
export const XP_WIN = 10;
/** One XP for each this much damage dealt, or healing done. */
export const XP_PER_DAMAGE = 20;
export const XP_PER_HEALING = 20;
export const XP_PER_KILL = 5;
/** A fallen hero keeps this share of its XP. */
export const FALLEN_SHARE = 0.75;
/** Hp and attack a level adds, as a share of the base, for each level above the first. */
export const LEVEL_HP = 0.04;
export const LEVEL_ATK = 0.03;
const CURVE = 12;

/** Total XP to reach a level: 12 × (level − 1) × level, so each level costs 24 more than the one before. */
export const xpFor = (level: number) => CURVE * (level - 1) * level;

/** The level a total of XP reaches (1 to `MAX_LEVEL`). */
export function levelOf(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpFor(level + 1)) level++;
  return level;
}

/** Progress into the current level: the XP past its start, and the XP the next level needs (both 0 at the top). */
export function progressOf(xp: number): { level: number; into: number; need: number } {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into: xp - xpFor(level), need: xpFor(level + 1) - xpFor(level) };
}

/** Hp and attack multipliers a level gives (x1 at level 1). */
export const levelBoost = (level: number): { hp: number; atk: number } => ({ hp: 1 + LEVEL_HP * (level - 1), atk: 1 + LEVEL_ATK * (level - 1) });

/** The percentages of hp and attack that the levels from `from` to `to` add, in whole numbers. */
export const levelGain = (from: number, to: number) => ({ hp: Math.round(LEVEL_HP * 100 * (to - from)), atk: Math.round(LEVEL_ATK * 100 * (to - from)) });

export const xpOf = (m: Meta, kind: string): number => m.xp[kind] ?? 0;
export const levelOfKind = (m: Meta, kind: string): number => levelOf(xpOf(m, kind));

/** The XP each hero kind earns from a finished fight, by kind: every hero that fought counts once, and a win pays more. */
export function fightXp(b: Battle): Record<string, number> {
  const out: Record<string, number> = {};
  const won = b.phase === 'won';
  for (const u of b.units) {
    if (u.side !== 'hero') continue;
    const share = (u.dealt ?? 0) / XP_PER_DAMAGE + (u.healed ?? 0) / XP_PER_HEALING + (u.kills ?? 0) * XP_PER_KILL;
    const xp = Math.round((XP_TAKE_PART + (won ? XP_WIN : 0) + share) * (u.alive ? 1 : FALLEN_SHARE));
    out[u.def] = (out[u.def] ?? 0) + xp;
  }
  return out;
}

export interface LevelUp {
  kind: string;
  from: number;
  to: number;
}

/** Add each kind's XP to the meta. Returns the kinds that reached a new level. */
export function gainXp(m: Meta, gains: Record<string, number>): LevelUp[] {
  const ups: LevelUp[] = [];
  for (const [kind, n] of Object.entries(gains)) {
    const from = levelOfKind(m, kind);
    m.xp[kind] = xpOf(m, kind) + n;
    const to = levelOfKind(m, kind);
    if (to > from) ups.push({ kind, from, to });
  }
  return ups;
}
