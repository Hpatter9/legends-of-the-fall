// Each hero's own Level 5 tune (SKILLS-10, docs/notes/skills-10.md): beside the rule's step (`lv5.ts`, written from the probe, and the levels'
// x1.3, which every hero keeps), a hero whose mastered skills carry it out of the roster's band has their strength at Level 5 moved by this
// much, measured on the hero sweep with every skill at Level 5 (`node tools/kits/tune.mjs <knobs> 30 90 12000 --skill-level 5`, knob `l5`).
// A hero not named keeps the rule alone (1). Only a skill at Level 5 reads it, so Levels 1 to 4 are as they were.

export const LV5_TUNE: Readonly<Record<string, number>> = {};
