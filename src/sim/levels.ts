// Levels for the hero kinds. Each fight gives every hero that fought some XP, and most of it is for what the hero killed:
// a kill is worth a tenth of the foe's max hp (a boss kill, several times that), so the XP grows with the foes' strength.
// A smaller share is for the damage it dealt and the healing it did, and a little for taking part (and for a win). A
// fallen hero keeps all it earned. The XP is kept per kind in the meta, and the level is read from it. Each level above
// the first adds to the kind's hp and attack, up to `MAX_LEVEL`, and the curve rises so each level takes more XP than the
// last. Pure rules: no Pixi, no DOM.

import type { Battle, Unit } from './battle';
import { isBoss } from './foes';
import type { Meta } from './meta';

export const MAX_LEVEL = 20;
export const XP_TAKE_PART = 5;
export const XP_WIN = 5;
/** One XP for each this much damage dealt, or healing done. */
export const XP_PER_DAMAGE = 40;
export const XP_PER_HEALING = 40;
/** A kill is worth this share of the foe's max hp (a tenth), and a boss kill `BOSS_KILL` times that. */
export const KILL_HP_SHARE = 0.1;
export const BOSS_KILL = 3;
/** Hp and attack a level adds, as a share of the base, for each level above the first. */
export const LEVEL_HP = 0.22;
export const LEVEL_ATK = 0.18;
const CURVE = 30;

/** Total XP to reach a level: 30 × (level − 1) × level, so each level costs 60 more than the one before. */
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

/** The XP a killing blow is worth: the foe's max hp times `KILL_HP_SHARE` (a boss, `BOSS_KILL` times that). */
export const killXp = (foe: Pick<Unit, 'def' | 'maxHp'>): number => foe.maxHp * KILL_HP_SHARE * (isBoss(foe.def) ? BOSS_KILL : 1);

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
    const share = (u.dealt ?? 0) / XP_PER_DAMAGE + (u.healed ?? 0) / XP_PER_HEALING + (u.slain ?? 0);
    const xp = Math.round(XP_TAKE_PART + (won ? XP_WIN : 0) + share);
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
