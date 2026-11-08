// One coming hero's kit as written (docs/notes/twenty-heroes.md): its pool, role, passive, three slots (each with its class, cost and
// cooldown) and ultimate, and the small helpers each batch's file writes its rows with. `kits/coming.ts` builds the kits from the rows.

import type { Passive, Skill } from '../abilities';
import type { Pool, Slot } from '../heroKits';
import type { SkillClass } from '../skillRules';

/** A skill (its old charge numbers are unused: a hero's skills cost its pool). */
export const sk = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast']): Skill => ({ name, text, need: 100, dealt: 0, taken: 0, perSec: 0, castMs, anim, cast });
/** An ultimate: opens at level 30 (`ULT_LEVEL`), with its balance knobs. */
export const ult = (name: string, text: string, castMs: number, cast: Skill['cast'], tuned: { rate: number; power: number }): Skill => ({ ...sk(name, text, castMs, 'attack2', cast), unlock: 30, tuned });
/** The bleed a crit leaves (as the roster's passives write it). */
export const bleedDot = { kind: 'bleed' as const, dmg: 4, every: 500, ms: 3000 };

/** One slot as written: its skill, class, cost and cooldown, and anything more (a guard's trigger, a heal). */
export interface RowSlot {
  skill: Skill;
  cls: SkillClass;
  cost: number;
  cd: number;
  more?: Partial<Slot>;
}
/** One coming hero's kit, as written. */
export interface Row {
  pool: Pool;
  role: string;
  passive: Passive;
  s1: RowSlot;
  s2: RowSlot;
  s3: RowSlot;
  ultimate: Skill;
}

/** A friend within `reach` of the caster (or the caster) is under `share` of its health with a foe beside it: a guard's case. */
export const friendInDanger = (reach: number, share: number) => (b: import('../battle').Battle, me: import('../battle').Unit): boolean =>
  b.units.some((a) => a.alive && a.side === me.side && a.owner === undefined && Math.abs(a.u - me.u) + Math.abs(a.v - me.v) <= reach && a.hp < a.maxHp * share &&
    b.units.some((f) => f.alive && f.side !== me.side && Math.abs(f.u - a.u) + Math.abs(f.v - a.v) <= 1));
