# Skills overhaul, batches 0 to 2: the measure, the rules as data, cooldowns by class

The owner-approved design is [skills-overhaul-design.md](skills-overhaul-design.md) (copied here from `claude/skills-design`); this note
covers its build plan's batches 0, 1 and 2 (section 11). Batches 3 on (ranks without skills, the third skills, skill levels by use, the
timers, the page, the full rebalance) are not built.

## Batch 0: main measured

(Filled in below, once the measurements finish.)

## Batch 1: the rules as data, no fight changed

- `src/sim/skillRules.ts` (new): `SkillClass` (`jab`, `strike`, `heavy`, `utility`, `guard`), each class's ranges (`CLASS_RANGE`: cost in
  stamina and mana, cooldown, cast time), the AI's weights (`CLASS_WEIGHT`), the cast-time exemptions the design lists (`CAST_EXEMPT`),
  the reference income (`INCOME`) and a kit's demand (`slotDemand`, `kitDemand`).
- `src/sim/heroKits.ts`: `Slot.cls` (its class) and `Slot.cd` (its cooldown, which replaced the optional `gap`); `HeroKit.slots` (the skills
  in slot order; `s1` and `s2` are kept as the same objects, so every old read stays valid); `SLOT_LEVELS` and `slotOpen`; `canPay`,
  `fire`, `holding` and `reserve` take any slot number; `castHero` weighs the open slots from the highest down, with today's order kept;
  `KitState` gains `at3`, `idle1`, `idle3` and `breath`; `RES.BREATH_MS` (0 in this batch: no breath is kept).
- `src/sim/kits/table.ts`: `CLASSES` (each hero's skill 1 and skill 2 class, from the design's section 3), and every slot's `cd` set to
  the gap it had (its own, or its pool's 3 s or 5 s).
- `src/fightHudRules.ts` (`gapOf` reads `cd`), `tools/kits/table.ts`; `test/fight-hud.test.ts` and `test/hero-kits.test.ts` read `cd`
  where they read `gap` (a rename, the same numbers).
- `tools/skills/measure.ts` (new, `node tools/skills/measure.mjs <level>:<stage> ...`): the hero sweep's fights, measuring each pool's
  income, casts a minute of each skill, the mean fight length and the time a fight.
- Tests: `test/skill-rules.test.ts` (new: slots, classes, cooldowns, the slots' levels, a slot that is not open is never cast). The
  identity fixtures (`test/spells-identity.test.ts`, `test/ailments-identical.test.ts`) did not move.
