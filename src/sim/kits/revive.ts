// The healers' revive (RPG-SPELLS batch 2, docs/notes/rpg-spells-design.md section 2, docs/notes/spells-b2.md): the Cleric (Revivify),
// the High Priestess (Resurrection), the Wanderer (Elixir of Life) and the Druid (Reincarnate) cast skill 2 as a revive instead of its
// usual effect when a placed hero of their side lies fallen and the revive is ready. The fallen hero nearest the healer rises at 30%
// of its health, cleansed, its pool back to its fight-start amount and its ultimate meter empty, and cannot be targeted while it gets
// up. Each healer's revive comes round every 30 s; a hero is raised once a wave at most (by a revive or by Mass Resurrection); at most
// two skill revives a wave; none in the Last Stand, where the fallen stay down. No randomness: the target is chosen in a fixed order.

import type { Battle, BattleEvent, Unit } from '../battle';
import { CHARGE_MAX, type Skill } from '../abilities';
import { cleanse } from '../ailments';
import { realHero } from './effects';

export const REVIVE = {
  /** The share of its health a revived hero rises at. */
  SHARE: 0.3,
  /** A healer's revive comes round this often (its own clock, ready at the fight's start). */
  GAP_MS: 30000,
  /** What a revive costs on top of skill 2's cost (mana). */
  EXTRA: 20,
  /** Skill revives a wave, all healers together (Mass Resurrection is outside the cap). */
  PER_WAVE: 2,
  /** A risen hero cannot act or be targeted this long, while it gets up (the heart revive's `RISE_MS`, with a little to spare). */
  RISE_MS: 1000,
  /** How long the revive takes to cast (the healer is busy). */
  CAST_MS: 1200,
} as const;

/** A healer's revive face: the skill it is cast as (its name and key; its cast is never called: `castRevive` does the work). */
export interface ReviveFace {
  skill: Skill;
}

/** The four healers' revive faces. */
export const REVIVE_FACES: Readonly<Record<string, ReviveFace>> = {
  cleric: face('Revivify', 'A fallen friend is called back: it rises at 30% health, cleansed (once every 30s; each friend once a wave)'),
  priestess: face('Resurrection', 'The nearest fallen friend is raised at 30% health, cleansed (once every 30s; each friend once a wave)'),
  wanderer: face('Elixir of Life', 'A vial poured on the nearest fallen friend: it rises at 30% health, cleansed (once every 30s; each friend once a wave)'),
  druid: face('Reincarnate', 'The nearest fallen friend rises again, wreathed in leaves, at 30% health (once every 30s; each friend once a wave)'),
};

function face(name: string, text: string): ReviveFace {
  return { skill: { name, key: `Revive: ${name}`, text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs: REVIVE.CAST_MS, anim: 'attack2', cast: () => false } };
}

/** Whether a hero was raised already this wave (by any healer's revive or by Mass Resurrection). */
export const risenAlready = (b: Battle, u: Unit): boolean => !!b.risen?.includes(u.id);

/** The fallen placed heroes of `me`'s side that may still be raised this wave, nearest `me` first (ties: the one that fell first, then the
 *  lower id). None in the Last Stand. */
export function fallenFor(b: Battle, me: Unit): Unit[] {
  if (b.stand) return [];
  const d = (x: Unit) => Math.abs(x.u - me.u) + Math.abs(x.v - me.v);
  return b.units
    .filter((x) => !x.alive && x.side === me.side && realHero(x) && !risenAlready(b, x))
    .sort((x, y) => d(x) - d(y) || (x.diedAt ?? 0) - (y.diedAt ?? 0) || x.id - y.id);
}

/** Raise a fallen hero at `share` of its health: cleansed, its pool back to its start, its ultimate meter empty, and up after
 *  `RISE_MS` (it cannot be targeted until then). It counts as raised this wave. Pushes `revive` and `heal`. */
export function raiseFallen(b: Battle, by: Unit, x: Unit, share: number, out: BattleEvent[], startPool: (u: Unit) => void): void {
  x.alive = true;
  x.hp = Math.max(1, Math.round(x.maxHp * share));
  x.diedAt = undefined;
  x.step = x.swing = x.cast = undefined;
  x.hurtAt = undefined;
  x.busyUntil = b.t + REVIVE.RISE_MS;
  x.hideUntil = Math.max(x.hideUntil ?? 0, b.t + REVIVE.RISE_MS);
  cleanse(b, x);
  x.charge = 0;
  startPool(x);
  if (x.charge2 !== undefined) x.charge2 = 0;
  (b.risen ??= []).push(x.id);
  out.push({ kind: 'revive', by: by.id, to: x.id, hp: x.hp });
  out.push({ kind: 'heal', to: x.id, amount: x.hp });
}
