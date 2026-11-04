// The skills overhaul's rules (docs/notes/skills-overhaul-design.md section 3, docs/notes/skills-1.md): every hero skill belongs to one class, and
// the class sets the range its cost, cooldown and cast time sit in. Cheap, quick skills are held back by their cooldown; big ones by their cost.
// Pure data and arithmetic: nothing here draws from any stream, and the battle reads only `SkillClass` (through `Slot.cls`).

import { poolNumbers, type HeroKit, type Pool, type Slot } from './heroKits';

/** A skill's class: a quick poke (jab), the hero's bread and butter (strike), a big one saved for (heavy), a lasting aura, banner, summon or
 *  shape (utility), or an escape, ward or save cast at once when its trigger holds (guard). */
export type SkillClass = 'jab' | 'strike' | 'heavy' | 'utility' | 'guard';

/** Each class's ranges (the design's table): cost in stamina (of 60) and mana (of 100), cooldown and cast time in ms. */
export const CLASS_RANGE: Readonly<Record<SkillClass, { stamina: [number, number]; mana: [number, number]; cd: [number, number]; cast: [number, number] }>> = {
  jab: { stamina: [8, 12], mana: [10, 15], cd: [2500, 4000], cast: [300, 400] },
  strike: { stamina: [20, 28], mana: [30, 40], cd: [5000, 9000], cast: [450, 800] },
  heavy: { stamina: [28, 36], mana: [42, 50], cd: [9000, 14000], cast: [500, 1000] },
  utility: { stamina: [16, 30], mana: [30, 50], cd: [12000, 20000], cast: [400, 800] },
  guard: { stamina: [12, 20], mana: [25, 45], cd: [10000, 20000], cast: [300, 500] },
};

/** How much a class weighs when the AI picks among ready skills, and which may hold a lighter one back: heavy, then utility, then strike,
 *  then jab (a guard is cast by its trigger, so it weighs least and never holds another back). */
export const CLASS_WEIGHT: Readonly<Record<SkillClass, number>> = { heavy: 4, utility: 3, strike: 2, jab: 1, guard: 0 };

/** The skills whose cast times sit outside their class's range, kept as they are (they match their looks): a channel, a burst fired during its
 *  cast, three slow guards and three quick heavies (the design's list). */
export const CAST_EXEMPT: ReadonlySet<string> = new Set(['Soul Siphon', 'Fan the Hammer', 'Rewind', 'Guardian Angel', 'Devour', 'Jump', 'Roll the Bones', 'Grounding']);

/** The pool's reference income at level 20 (points a second), from `tools/skills/measure.mjs 20:30` on the hero sweep (docs/notes/skills-1.md:
 *  3.0 and 4.2 on main before the overhaul, 2.8 and 3.8 once batch 2 slowed the level-10 refill, `RES.SKILL2_PACE_*`): rule 2 (a jab never
 *  empties the pool) and rule 3 (a kit's demand) are read against it. */
export const INCOME: Readonly<Record<Pool, number>> = { stamina: 2.8, mana: 3.8 };

/** A slot's demand: what it would drink a second if cast every time its cooldown came round (its blood is not counted). */
export const slotDemand = (s: Slot): number => s.cost / (s.cd / 1000);

/** A kit's demand against its pool's income (rule 3): above 1 no kit can cast all its cooldowns allow, so the AI's choices matter. With a
 *  hero kind, against that hero's own income at `level` (`heroIncome`). */
export const kitDemand = (hk: HeroKit, slots: readonly Slot[] = hk.slots, kind?: string, level = INCOME_LEVEL): number =>
  slots.reduce((a, s) => a + slotDemand(s), 0) / (kind ? heroIncome(kind, level) : INCOME[hk.pool]);

/** The level the reference income was measured at. */
export const INCOME_LEVEL = 20;
/** A hero kind's own income at a level (STATS batch 6, pools by score): the reference income for its pool, times how much faster its pool
 *  fills than the roster's mean for that pool (CON for stamina, its casting ability for mana; `poolNumbers`). */
export function heroIncome(kind: string, level = INCOME_LEVEL): number {
  const n = poolNumbers(kind, { level });
  return n ? INCOME[n.pool] * n.fill : INCOME.mana;
}

