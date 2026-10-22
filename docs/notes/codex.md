# The Codex

A bestiary of every foe and boss met, and a gallery of the heroes, with milestone rewards.

## Where it lives
A **Codex** chip on the Castle page, next to Achievements (`home.ts`, `drawCastle`). Both are records of what you have done, and
the chip row is already the castle's place for them; a badge shows when a milestone is waiting. The Library building is the
spellbook's, so the codex stays out of it. On a narrow phone the chip row wraps to two lines (`codex.css`).

## Rules (`src/sim/codex.ts`, pure)
- `FOE_ENTRIES`: one entry per named foe (the three minotaur sheets are one "Minotaur", and so on), then the tower's 12 elites and the
  calamity's six heralds: 63 in all.
- The meta keeps two optional fields: `codex` (`met`: foe ids met, `kills`: kills per foe id) and `codexClaimed` (milestone ids).
  Older saves load without them (`readCodex`, `readCodexClaimed`). A boss already beaten (`Meta.bosses`) counts as met.
- `noteFoes` runs from `settleRun` when it is given the finished battle: every foe unit on the board is met; every foe that fell is
  a kill. It reads only the units, so it is deterministic.
- Milestones at 25, 50, 75 and 100% of each collection: Bestiary 10/20/35/60 crowns, Heroes 15/30/50/80. Taken with a tap
  (`claimCodex`), once each.
- `tipsOf` works weaknesses out from a foe's stats and kit (slow, flies, shoots, heals, enrages, shielded, calls helpers...).
  `whereMet` lists where a foe is met (stages, tower, each army, calamity, elite escorts).
- `codexLore.ts`: a lore line per foe entry and a two-to-three-sentence story for all 45 heroes.

## The page (`src/codexView.ts`, `src/codex.css`)
Progress with milestone pips, tabs for Bestiary and Heroes, a three-column grid of cards (scrolls), and a detail sheet with the sprite
on its idle at a whole-number scale (x2 for small figures). Unmet foes are black silhouettes named "???"; unowned heroes are
silhouettes with their name shown and their story locked.

## Checks
`test/codex.test.ts`; screenshots in `docs/samples/codex-*.png` (`node tools/codex/shots.mjs`) at 393x852 and 360x780.
