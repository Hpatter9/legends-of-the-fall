// Each hero's own Level 5 tune (SKILLS-10, docs/notes/skills-10.md): beside the rule's step (`lv5.ts`, written from the probe, and the levels'
// x1.3, which every hero keeps), a hero whose mastered skills carry it out of the roster's band has their strength at Level 5 moved by this
// much, measured on the hero sweep with every skill at Level 5 (`node tools/kits/tune.mjs <knobs> 30 90 12000 --skill-level 5`, knob `l5`).
// A hero not named keeps the rule alone (1). Only a skill at Level 5 reads it, so Levels 1 to 4 are as they were.

// (SKILLS-10: with every skill at Level 5 at level 30, stage 90, main read 76.0%, spread 15.4, five beyond 6; this branch's skill 3 alone brought
// it to 80.0%, spread 10.3, none beyond 6; these four, the nearest the band's edge, bring it to 79.5%, spread 7.9, one beyond 4)
export const LV5_TUNE: Readonly<Record<string, number>> = {
  beastmaster: 0.65, // (+5.7 at Level 5: her wolves and the dire wolf compound)
  shambler: 0.85, // (+4.7)
  knight: 0.9, // (+4.2)
  archer: 1.17, // (-4.6)
};
