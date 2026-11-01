# STATS batch 3: the page

Batch 3 of the D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), sections 8 and 14). **Page only: no fight changed**, and the
identity fixtures did not move. Every number comes through `stats.ts` (`derivedOf`, `scoresOf`, `foeStatsOf`, `scoresAtLevel`), never a
copied formula, so the page stays true when batch 2 (scores drive power) lands.

## What it adds

- **`src/sim/statLines.ts`** (pure): the words and numbers for the pages: `statPanelOf` (six tiles with the primary and the weakness marked, the
  figures AC / To hit / Skill DC / Crit / Initiative / Proficiency, the six saves with the two trained ones marked, "Next: Level 12 · STR +2"),
  `scoreWhy` and `figureWhy` (the plain line a tap opens, in this hero's numbers), `heroCardScores` / `foeCardScores` (the unit card), `scoreRises`
  (the recap's lines) and `scoreCompare` / `gearScores` (the gear compare).
- **The hero sheet's Stats panel** (`src/statsPanel.ts`, `src/stats.css`), above the Skills tab on the Overview: Health, Attack and Armour on
  top (Defence is now "Armour"; Range and the three speeds stay in their own row below), one row of six score tiles ("STR 18 +4"; the
  primary has a gold rim, the weakness a dim one), the figures in a three-wide grid, one line of saves, and one line of words: tap a tile or a
  figure and it says what it does for this hero ("Strength 20 (+5): blows +25% · ... · STR save +8 (trained)"); tap again to close it.
- **The unit card**: a row of six scores (the modifiers small) with "AC · To hit · DC · Init" under it, for heroes and foes alike; "Defence" is
  "Armour". A hero's rank is not on a unit, so the card counts an awakened hero as rank 4 plus its steps and any other as rank 1 (the sheet,
  which knows the meta, is exact).
- **The level-up recap**: the scores a level raised (old → new, the gain, "improvement" or "epic boon", and the modifier when it moved), and on a
  proficiency step "To hit +4 → +5" and "Skill DC 14 → 15". Only on levels that change them. The spire's run levels do the same; the Last
  Stand's own levels are not hero levels and show none.
- **The gear compare**: `scoreCompare` writes "STR 19 → 20 (+4 → +5): blows +5%, to hit +1", or "STR 18 → 19, +4 still" when a point does not move
  the modifier. **It is dormant**: no piece of gear has score points until batch 2 puts a `scores` key on a piece's stats (`gearScores` reads
  that key), so the picker shows no new lines yet. The tests hold it.
- `test/stats-3.test.ts`, and `tools/stats-3/shots.mjs` for the pictures (`docs/samples/stats-3-*.png`).

## Open points

- The panel's lines for crit, initiative, blow speed, cooldowns and ultimate fill describe what the design makes the scores do; those effects
  arrive in batches 4 to 6. Until then the panel's figures are the data, not yet a fight rule. Say if the page should hold those lines back.
- The foe card shows the Normal tier's proficiency (a battle does not carry its army's tier).
- The Last Stand's recap shows no score lines.
