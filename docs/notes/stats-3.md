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

## After batch 2 (merged, 0.316.0)

- **The gear compare is real.** Gear bases carry `scores` now; the picker lists, on each spare piece, "STR 19 → 20 (+4 → +5): blows and skills +5%,
  to hit +1, skill DC +1" (or "+4 still"), worked from the hero's scores as it stands (level, rank, what it wears and its talents, `heroStats`)
  plus the swap's difference. The worn piece shows none. The sheet's tiles and the unit card include the worn gear's points too.
- **`LIVE` (in `statLines.ts`) is the hook for what fights do.** The page says only what is live: blows, skills and health by score, AC, to hit,
  skill DC and the saves. Off for now, with no line anywhere: `crit`, `initiative`, `blowSpeed` (batch 4), `shove` (5), `cooldown`, `ultFill`,
  `pools`, `perception` (6). Each batch flips its own flag to `true` and the figure, tap line, card roll and compare clause appear. A test holds
  them off. The panel therefore lists AC, To hit, Skill DC and Proficiency; the Crit and Initiative figures come with batch 4. (AC, to hit, DC
  and the saves are on as the director's list left them; they are also batch 4 and 5 effects, so flip `ac`, `toHit`, `dc`, `saves` off if they
  should wait too.)
- `tools/stats-3/gear.mjs` takes `docs/samples/stats-3-gear-393.png`.

## Open points

- The foe card shows the Normal tier's proficiency (a battle does not carry its army's tier).
- The Last Stand's recap shows no score lines.

## Checks

`npm run typecheck` clean; `npm test -- stats-3` 13 of 13; the full `npm test` 2181 pass, 0 fail (the identity fixtures unmoved); `npm run web` built.
Shots (`node tools/stats-3/shots.mjs`; 393x852, 360x780, 412x915, no sideways scroll, no page errors): `docs/samples/stats-3-sheet-*.png`,
`stats-3-sheet-tap-*.png` (a tile tapped), `stats-3-card-hero-*.png`, `stats-3-card-foe-*.png`, `stats-3-recap-*.png` (Kwame's level 8 shows
"STR 15 → 16 +1 improvement · STR +3"). The gear compare has no shot: no piece has score points until batch 2.
