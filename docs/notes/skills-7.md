# Skills overhaul, batch 7: three chips in the fight HUD

Design: [skills-overhaul-design.md](skills-overhaul-design.md) section 7. Page only: no fight rule changed (the identity tests were not touched).

## What was built

- **Full rows (a party of five or fewer):** columns 34 px, 0.8 parts (name and bars), 2.2 parts (**three chips**, 3 px gaps; about 79 px each at
  393, 71 at 360, 82 at 412). A chip is the element edge, a 14 px icon, the skill's **chip name** over its cost ("24 SP"), the cooldown sweep and
  the pay line. The cooldown's seconds and a blood cost left the chip (the sheet has both). A locked chip says "Lv 20". The painted faces
  (HUD-FACES), the ultimate's pearl, the TAP plate and the cast banner are as they were.
- **Compact rows (the Last Stand's eight, a Calamity's ten):** the chips column is 44 px and holds three stacked chips, 12 px high with 1 px
  between: the element edge and the cost number, the sweep across it, red while the pool cannot pay. No icon in compact. Locked says "L20".
- **Chip names** (`CHIP_NAMES`, `chipName` in `fightHudRules.ts`): one word, at most 8 letters, unique within a hero's kit ("Wall", "Rush",
  "Hold", "Standard", "Dance"). A one-word skill that is short keeps its name; anything else not in the table falls back to its first word cut to 8
  letters. `test/fight-hud.test.ts` checks every hero's three skills (and a healer's revive face) for length, one word and uniqueness.
- **The skill sheet** (a tap on a chip) has a **Class** row ("Jab: cheap and quick", `CLASS_WORDS`) beside Cost, Cooldown, Strength and Cast
  time; its tabs (Skill 1, Skill 2, Skill 3, Ultimate) fill the row by count. **The unit card** reads the same sheets, so it lists Skill 3 with its
  class, cost and cooldown, locked below level 20. **The hero sheet and the codex** show each skill as "Strike · 24 SP · 5.0s" (`slotBrief`).
- **Light on graphics memory:** no `backdrop-filter`, no masks; the chips are flat gradients and two absolutely placed bars as before
  (docs/notes/menu-glitch.md).

## Checks

`npm run typecheck`; `npm test -- fight-hud unit-info hud-faces`; `npm run web`. Screenshots in `docs/samples/skills-7-*.png` at 393x852,
360x780 and 412x915 with a five (`fight`, `sheet`), the Last Stand's eight (`stand`) and a Calamity's ten (`calamity`), from
`tools/battle-hud/shots.mjs`.
