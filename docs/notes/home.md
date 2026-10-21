# Home screen and castle

- The game opens on `#home` (`src/home.ts`), a castle picture behind wood panels: Continue run (when a run is saved and
  not over), New run, Recruit (opens the recruit screen over it), Heroes and Castle. `?seed=` in the address skips it.
  A lost run's result button reads "Home" and returns here with a line showing the crowns earned. A "Home" button sits
  beside Recruit during a run.
- Heroes page: every hero, locked ones shaded as "???"; unlocked ones show rarity, role, hp/atk/def/range and the skill
  and passive from `KITS` (`abilities.ts`).
- Castle (`src/sim/castle.ts`, pure; levels live in `Meta.castle`, defaulting to 0 so old saves load):

  | Building | Per level | Costs (crowns) |
  |---|---|---|
  | Treasury | +10 starting gold | 50, 100, 180, 300, 500 |
  | Barracks | +6% hp, all heroes | 60, 120, 200, 320, 520 |
  | Armoury | +5% attack, all heroes | 60, 120, 200, 320, 520 |
  | Mage Tower | king's mana fills 12% faster | 80, 160, 280, 450 |

- Applied where runs start: `newRun(seed, pool, castle)` adds the gold and keeps a snapshot in `run.castle`;
  `startStage` passes `Stage.heroes` (hp/atk multipliers, applied in `addUnit` to heroes only) and `Stage.mana`
  (`SpellState.rate`, used by `fillMana`). A fight with no castle plays out as before.
- Left out: the War Table (a sixth slot), since the squad size of five is used across the run and the page.
- Art: `src/art/home/castle.png`, credited in `CREDITS.md`. Tests: `test/castle.test.ts`.
