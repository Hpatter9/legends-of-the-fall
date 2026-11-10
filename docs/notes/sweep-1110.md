# Sweep 1110: playtest of 0.437 to 0.446

A playtest and bug sweep of everything shipped from 0.437.0 to 0.446.0, at the director's ask. Played in Playwright (headless Chromium,
software WebGL) at 393 x 852, 360 x 780 and 412 x 915, on a save with fourteen heroes at level 32 and every army at ten stars, so the Assault
is open at every hold. The Calamity and the Last Stand (`src/sim/hiddenModes.ts`) were left alone and stay hidden.

Pictures: `docs/samples/sweep-1110/`. The scripts are in `tools/sweep-1110/` (`camp.mjs`, `fight.mjs`, `assault.mjs`, `warend.mjs`,
`warend-seen.mjs`, `offline.mjs`, `settings.mjs`, `buttons.mjs`; each writes to `out/sweep-1110/`). The earlier releases' own checks were run
again too: `tools/castle-tab-renewal/checks.mjs`, `tools/bench-marks/shots.mjs` and `tools/rune-bench/shots.mjs`, all passing.

## What was played

- **Armies, deploy and fight** (`fight.mjs`, the rune-bench and bench-marks checks):
  - The bench cards are 94 px at every size.
  - The rune side behind the pull bar works: the bar slides, two runes merge, a rune dropped on a hero is set, and a refused drop is refused.
  - The split SPELL and ULT Auto buttons each flip their own setting (`Meta.spellAuto`, `Meta.ultAuto`) and their `aria-pressed`.
  - A hand-fired ultimate, timed on a clock of our own (16 ms frames):
    - a repeat cast takes 3.0 s (the samurai's) to 3.8 s (the archer's and the wizard's);
    - a hero's first cast takes about 6 s, because its showcase plays once;
    - with the fight set to x3, the battle stays held, or at x1 and slower, all through the moment;
    - a tap in the opening skips it (0.7 s left).
  - The follow camera holds a pan for 4 s, by mouse and by real touch (CDP touch events), then eases back. It frames the fighting.
  - The bench's rank stars sit inside their cards, and the Heroes tab wears one mark at most.
- **The Castle tab:**
  - The Throne Hall and Buildings views are live.
  - Each of the eleven buildings' cards (the Drill Yard and the Hall of Legends with their rooms among them) opens and closes at every size,
    with nothing past the right edge.
  - The royal hall's checks pass, offline reload included.
- **The Summoning tab:** the collection starts closed, and the Nearest to joining row shows the begun heroes, most shards first.
  "Return to sanctum" closes it.
- **The Assault:**
  - The muster and the march at Bloodtusk Hold and at the five painted holds (Barrow Necropolis, Howling Den, Elder Root, Heart of the
    Maze, Moonlit Shrine).
  - At each, the field looked at from the minimap: the South Gate, the Iron Gate, the keep, the camp, the west and the north. Then the host
    ran on Auto at x2 for a minute and the same spots were looked at again, battered gates and drums included.
  - No page errors, no 404s, no piece floating or sunk that could be seen.
  - The frame rate was much the same from hold to hold (software WebGL, so the numbers only compare holds with each other).
  - At the Heart of the Maze, the five bare heroes fell back at 1:40, and the result card showed and closed.
- **The Last Hold** (every other hold fallen): the muster says "<lord> makes his last stand · the whole Council, N strong, defends · its
  fall ends the War", at 360 and 412.
- **The War's end** (`War.end` written):
  - the scene plays at the camp once, after the army's intro, and is marked seen;
  - it does not play on the next visit;
  - the Dark Council's board shows the end's record at all three sizes.
- **Settings:**
  - every page opens and goes back with "‹ Back";
  - Developer's grants add crowns and stones;
  - Settings closes.
- **Offline:**
  - every file in `out/web` is in the service worker's list (1,152 listed, none missing);
  - after the cache filled and the network was cut, a reload brought up the camp, its tabs, the Summoning collection, an army's fight and an
    assault on the Elder Root with no failed request.
- **Generally:**
  - no page errors and no console errors anywhere;
  - nothing ran past the right edge at 360 in any screen checked.

## Bugs fixed

1. **The scouts' report described every hold as Bloodtusk Hold.**
   - The war table's report (the first time the Assault opens) gave every hold a palisade over a ditch, a stone wall and a throne on the
     mound. A first assault on the Heart of the Maze or the Barrow Necropolis read wrong.
   - Each built hold now has its own line, `HOLD_LOOKS` in `src/sim/assault/holdCodex.ts`, taken from its blueprint: its outer ring, its
     inner wall and its heart.
   - Tested in `test/assault-holds.test.ts`.
   - Before and after: `scouts-maze-before-393.jpg`, `scouts-maze-after-393.jpg`.

Nothing else turned up that was a plain bug.

## Open list (for the director)

These need a design call or art, so none was built.

1. **The Maze's houses keep the Knights kit's colours.**
   - The Heart of the Maze's longhouses and storehouses are the Knights kit's barracks and granary, cut straight in. They show their blue
     slate and red tile roofs, on grass, inside a sandstone desert hold.
   - The hold's art prompt says the kit lends "its stone and its drawing, not its colours".
   - A tint in `cut-sheets.py`, or painted pieces? (`open-maze-knights-houses-393.jpg`, `open-maze-knights-house-zoom.jpg`)
2. **The Moonlit Shrine's keep is still the Orc pavilion** (horned skulls, red banners), the known stand-in until its sheets 08 to 12 are
   painted (art wire 8). (`open-moonlit-shrine-keep-standin-393.jpg`)
3. **Skipping late in an ultimate.**
   - A tap skips an ultimate only while the battle is held: the opening, the showcase and the impact.
   - An ultimate with a settle phase (the archer's, the wizard's) then runs about 2.3 s more at x1 with the battle going.
   - A tap there falls through to the board, as `ultMoment.ts` means it to, so it does not skip.
   - At x3 that is 2.3 s the player cannot hurry. Should a tap in the settle and fade end the moment too (and the speed come back)?
4. **Unlock toasts over menus.**
   - The one-time unlock toasts ("Auto place unlocked", "Rune Auto unlocked") sit over the top of whatever card is open for a few
     seconds. In the sweep they covered the Last Hold muster's title and the Castle cards' names.
   - They could wait for a card to close, or sit lower. (`open-unlock-toast-over-last-hold-360.jpg`)

## Checks

- `npm run typecheck`: clean.
- `npm test -- assault-holds assault-last-hold`: 9 pass.
- `npm run web`: builds.
