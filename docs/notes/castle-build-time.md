## Castle buildings take time to build

The owner's ask: a building's level takes time to go up, and higher tiers take longer. `src/sim/castle.ts`:

- `startBuild(m, id, now)` pays the level's crowns and sets the builders to it: `Meta.works = { id, level, doneAt }`.
  `startChapel(m, now)` does the same for the Chapel.
- The builders do one job at a time. While they are busy, every other Build button is greyed, with a line saying where they
  are and how long is left.
- How long a level takes (`BUILD_MS`): 1 min, 5 min, 20 min, 1 hour, 3 hours, for levels 1 to 5. The Chapel takes 5 min.
- `settleWorks(m, now)` raises the level, or opens the Chapel, once its time is up. The page calls it:
  - on every refresh of the main screen, so a build that finished while the game was closed stands on return;
  - every second while works are running (`Home.tickWorks`). A finished build saves and plays the courtyard's build
    animation, and an open card redraws.
- The level's effect only counts once it stands, and a run takes the castle as it is when the run starts.
- The page passes `Date.now()`, so the rules stay pure. `clockText` formats the time left ("45s", "4:05", "1:02:09").
- Page:
  - the card's button reads "Build · 120 · 5:00", then "Building · 4:05";
  - the courtyard tag reads "building 4:05" in blue;
  - the card's subtitle reads "building level 2".
- Saves: `Meta.works` is optional and is checked on load (`readWorks`). Old saves keep their levels.
- `upgrade` and `buildChapel` (instant) remain for the balance tools and the old tests.

Test: `test/castle-works.test.ts`.
