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

## The director's calls on the open list

Four items went to the director as needing a design call or art:

1. the Maze's houses keep the Knights kit's colours;
2. the Moonlit Shrine's keep is still the Orc pavilion stand-in;
3. a tap late in an ultimate (its settle) does not skip it;
4. the one-time unlock toasts sit over open cards.

The director answered each. Item 2 waits for its art (the shrine's sheets 08 to 12). The other three were built on this branch, after main
(0.448.0) was merged in:

1. **The Maze's borrowed kit buildings take the hold's palette.**
   - The Heart of the Maze's Knights-kit pieces now take its sand, bronze and terracotta: the barracks and granary (its longhouses and
     storehouses), the gatehouse, the walls, the workshop, the watchtower, the well, the bridge and the goods.
   - The colours:
     - the slate and red tile roofs and the blue cloth go to terracotta;
     - the grey stone goes to sand;
     - the lawns dry to gold;
     - the timber goes to a warm bronze-brown;
     - the lamp and fire light are kept.
   - The kit's trees and bushes are left as they are.
   - The tint is `maze_kit`, through a `kit_tint` in the hold's profile in `tools/assault/cut-sheets.py`, so a fresh cut makes it.
   - The Chronos kits were not to hand for a fresh cut, so the atlas already cut was tinted in place by `tools/assault/tint-kit.py`.
     That is a one-off, never to be run after a fresh cut.
   - Picture: `maze-kit-tint-before-after-393.jpg`; before, `open-maze-knights-houses-393.jpg` and its zoom.
3. **A tap ends an ultimate's moment at any point.**
   - The moment's layer used to take taps only while the battle was held. Through a salvo's settle (about 2.3 s at x1, for the archer's
     and the wizard's) a tap fell through to the board.
   - The layer now takes taps all through the moment. A tap sends it to its fade (0.65 s), and a tap in the fade ends it at once, so the
     fight's speed comes back.
   - A tap that lands while a moment plays is spent on ending it, as one in the opening always was.
   - Tested in `test/ult-moment.test.ts`.
4. **The toasts never cover an open card.**
   - While an ornate card, the hero sheet, a skill's sheet or Settings is open, the toasts wait in their queue, and they show once it
     closes. A toast showing when a card opens steps aside at once, and comes back after.
   - Queueing was chosen over showing them low: at 393 the cards fill the screen with their buttons at the foot, so a low toast would
     cover those.
   - Checked at the three sizes by `tools/sweep-1110/toasts.mjs`, through a `__toastLines` hook (like `__screens`).
   - Before: `open-unlock-toast-over-last-hold-360.jpg`.

The Moonlit Shrine's keep as it stands: `open-moonlit-shrine-keep-standin-393.jpg`.

## Checks

- `npm run typecheck`: clean.
- `npm test -- assault-holds assault-last-hold ult-moment ult-epic ult-show ui-standard`: 47 pass.
- `npm run web`: builds.
- At 393, 360 and 412:
  - `tools/sweep-1110/toasts.mjs`: every check passes;
  - `tools/sweep-1110/assault.mjs` at the Maze, the Last Hold's muster included: no errors;
  - `tools/sweep-1110/fight.mjs`: no errors, and the skip still works.
