# Repo accuracy: no spire or tower, and codex stones at milestones only

## Words (the owner: "there is no spire or tower, it's the Last Stand mode")

Changed, player-facing:
- Codex "where met" lines (`codex.ts`): "Elite of the endless tower" is now "Elite of the Calamity (map N)", "...a run and the tower" is
  "...a run and the Last Stand", "Escort of tower elites" is "Escort of Calamity elites". The class label "Tower elite" (codex page and
  the unit card, `codexView.ts`, `unitInfoRules.ts`) is "Calamity elite". Elites are only met on the Calamity's map now.
- The Last Stand's wave-20 achievement text (`tower20`) no longer promises "20 floors of the old tower" (old records still count, silently).
- README: the height bonus is +15% a step (it said +10%). CLAUDE.md: the Last Stand now has a layout entry, and "the spire" is the Last Stand
  where a land or a tier is meant. CREDITS: the "Tower map" art is named for the Calamity's map it now serves.
- Docs: a Status line on `rogue-tower`, `tower-elites`, `tower-look`, `tower-reset` and `tower-twists`; a note index (`README.md` here); a
  banner on `docs/TASKS.md` saying older entries' "spire/tower" mean the retired climb.
- `src/updates.ts` is untouched (past release notes stay as written).

Left as it is, and why:
- **Reachability.** Nothing a player taps starts a tower climb: the camp's Tower button opens the Last Stand (`onTower: openStand`);
  `towerRun` is called only by tools and tests; a very old saved climb is settled once by `migrateOldClimb` (its note says "The Tower is now the
  Last Stand"). So no spire/tower *mode* is reachable.
- **Dead-looking code is not dead.** `tower.ts`, `towerView.ts`, `towerTheme.ts`, `towerElites.ts`, `rogue.css`, `run.tower`, `Meta.tower`,
  `mode.kind: 'tower'` and the `legends.tower` slot are the Calamity's map engine, the Last Stand's chests (`settleTower`), old-save migration and
  the quest/mode keys; the `'spire'` scene family and `spire.opus` are the Last Stand's milestone scenes and a music track. Renaming them would
  touch saves and the service worker list, so nothing was renamed or deleted.
- "Mage Tower"/"Arcane Spire"/"Archivist Spire" are castle buildings and stay. Code comments that say "the spire" (about 40) are history, not shown.

## Codex stones (a requirement change: the owner's answer is "milestones only")

The codex paid 1 stone for each entry the first time it was discovered (about 108) beside 8 milestone stones. Now only the milestones pay.
Removed: `ENTRY_STONES`, `claimEntries`, `entriesWaiting`, `discoveredKeys`, `readCodexPaid`, `foeKey`/`heroKey`, `Meta.codexPaid`, the
`ENTRIES_CLAIM` button path, its "new entries" line and badge rule (the badge now shows for a waiting milestone). `CODEX_STONES` stays 1. Stones
already taken stay; an old save's `codexPaid` is dropped on load. The codex line reads "Each new entry counts towards a reward." The tests of
the entry stones were replaced by one that checks entries pay nothing and old saves load with their stones. `tools/unlockPace.ts` lost the
entry-stone model (and `--noentries`); `summon-stones.md` and the TASKS entry say so.

## Checked
`npm run typecheck`, `npm test` (full), `npm run web`. The codex page and the unit card carry only a label change; no layout changed.
