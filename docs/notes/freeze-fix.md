## FREEZE-FIX: nothing may hold a fight for good

Branch `claude/freeze-fix` (from main 0.514.0). The owner, on an Android phone (the installed app): "The game is freezing now.
Seemingly random in a wave". It was new: it did not happen a day before (0.492 and earlier).

### The plain answer

**A fight that stops for good was not reproduced here.** A soak of 189 fights on main raised no true stall, no page error and no
hang in the simulation. Four real faults were found on the way (one measured, two by the soak, one by a fuzz test), all of them in
the last day's work, and all are fixed. The first is the best match for "freezing, seemingly random in a wave", but it is a stop of
a fifth of a second to a second, not one the game never comes back from. If the owner's freeze is the second kind, what would
settle it is in "Still open" below.

### What was found

| # | Fault | How it shows | Found by |
| --- | --- | --- | --- |
| 1 | An ultimate's atlas was handed to the graphics card on the frame of the blow, and the browser decoded the whole picture (up to 2048 px a side) again to do it. Pixi takes back any texture not drawn for a minute, so it happened again through a session, at the first blow of most ultimates, and several at once when heroes fired together. | The whole page stops at a blow: 200 ms for one atlas at a phone's speed (4x throttle; 44 ms from a decoded bitmap), more for several. New in 0.507 (the atlases grouped and loaded on demand). | Measured (an upload timed in a bare page) |
| 2 | Ultimates fired by hand queue without limit, each holding the fight 4 to 6 s, and once the last foe had fallen the result waited for every show still queued. | A won fight that seems frozen: seen with 7 shows waiting and no result 40 s after the win. New in 0.497 (every hand-fired use plays its showcase). | The soak (`noResult`) |
| 3 | An Eidolon's call stands on its first blow until the fight makes the strike. If the strike never came (the board became another fight's mid-call), it stood there for ever, and every later fight's result waited on it for ever. | The call's layer never leaves; no result ever comes up. Only reached by leaving a fight mid-call; in ordinary play the fight is held through the call, so this is unlikely to be what the owner saw. | The soak |
| 4 | `stepAt` (the camera's step between strike frames) gave no frame for a share that cannot be told (NaN). | Harmless today (the camera fell back to the caster); made total. | The fuzz test |

Read and found sound: `UltQueue.step` and its loops, the camera rules (no loop without a bound), the walk search with the new
terrain (the cheapest step is 0.5: no negative edge, so no cycle), and the loaders (nothing in a fight awaits a sheet: a sheet
that is late or fails is skipped and the older look plays; the soak made 149 sheets fail and 401 arrive seconds late). The frame
rate did not fall against 0.492 (9 against 7.6 frames a second under the software renderer). Texture memory goes up and down
with the parties fielded (160 to 340 MB with new heroes every fight) rather than climbing.

### The fix

- **Atlases (`src/render/blenderFxArt.ts`, `bfxDrop` in `blenderFxRules.ts`).** Each atlas is decoded once, off the page's thread
  (`createImageBitmap`; the plain image where a browser has none). A fight's atlases are handed to the graphics card as the fight
  begins, one at a time with 80 ms between (`bfxUploader`, which `main.ts` gives the renderer's `initSource`), not on the blow.
  They are kept for as long as a fight wants them (no longer taken back after an idle minute), and those that neither the fight
  beginning nor the one before it wanted are let go, picture and all (`bfxDrop`: the last fight's are kept one fight more, since
  its last effects may still be on the board). So the memory holds two fights' worth, never every hero fielded since the game was
  opened. A sheet not there when its moment comes is still skipped, never waited for.
- **Every moment has a deadline (`momentLimit`, `UltQueue.step` in `src/ultMomentRules.ts`).** A moment that outlives its own
  length plus a salvo's longest wait plus 2.5 s is ended, whatever it was waiting for, and the next plays. It is logged
  (`UltMoments.frame`): it should never happen.
- **The waiting moments are dropped when the fight ends (`UltQueue.dropWaiting`, called by `main.ts`).** The one playing finishes;
  the result is not kept back for shows with nothing left to strike.
- **The call's wait is bounded (`STRIKE_WAIT_MS`, `strikeOverdue` in `src/eidolonRules.ts`; `EidolonCall.frame`, `see`).** It
  waits 2.5 s at most for its strike, counted only while the page is free to step the fight (not under a sheet or a show), and at
  once gives up if the fight is over; then it plays on to its end without the strike. A call that has not struck when the board
  becomes another fight's is dropped; one that has struck plays out as before.
- **The graphics context.** Pixi already keeps the context's loss from being final and rebuilds on its return. `main.ts` now logs
  both, so a report of a frozen picture can be told from a fight that stopped.

Nothing under `src/sim` changed: the fights play out the same.

### The test

`test/freeze-fix.test.ts`: every hero's moment of every shape ends inside its limit and is never cut by the deadline; a moment
with broken lengths (infinite, NaN, negative, huge; each stage in turn, and a showcase with no end) is ended and the next plays;
300 fuzzed queues (pushes, skips, landings, long and short frames) always drain and never hold the fight past six moments' worth;
the waiting moments drop and the one playing ends in its own time; the call's wait; the camera rules end and stay in range for
400 random sets of spots, with NaN and infinite ones among them; and which atlases are let go.

### The soak tool

`node tools/freeze-fix/soak.mjs [--waves 200] [--minutes 40] [--modes auto,hand,horn,spells] [--faults 0] [--real] [--party fixed]`
(after `npm run web`; `ROOT=<dir>` soaks another build). Four pages at 393x852, one for each way of playing: both Auto switches
on; ultimates by hand the moment they can be (two at once, often); the War Horn blown each fight; the king's spells by hand with
the rest. Every fight takes the next army, a stage and a speed (x1, x2, x3) in turn, with five new heroes. The driver hides and
shows the tab, taps to skip shows, and makes some effect sheets fail (8%) or arrive seconds late (22%). The page's sound is
started by a real tap, so the sound's own code runs.

By default the page's clock is stepped by hand (frames of 33 ms of the game's time, as fast as the machine can), because under
the software renderer here real time gives well under ten frames a second with four pages; `--real` leaves the clock alone and
`--cpu N` throttles it. A watchdog in the page flags:

- `stall`: nothing at all moving (the fight's clock, a show's, a call's) for 12 s while a fight is on and no card is up;
- `heldLong`: the fight's own clock held for 20 s by shows that are themselves moving;
- `noResult`: the fight is over and the result is not up 40 s later; `tooLong`: a fight still going after three minutes;
- `frameError`: a fault thrown by a frame (the page's ticker catches these and goes on, so one that comes back every frame would
  hold a fight with the page alive); `hung`: the page no longer answers; and page errors, unhandled rejections, a lost context;
- with `--real`, `longFrame` (a frame over 2 s) and `noFrames`.

On a flag it writes the state (the show, its stage, the queue, the call, every hold) to `out/freeze-fix/flags.json` with a
screenshot, and begins a new fight. It also prints the graphics memory the textures hold and each frame whose own work took over
250 ms.

| | Fights | True stalls | Result kept back | Page errors |
| --- | --- | --- | --- | --- |
| Before (main 0.514.0), four ways, 12 minutes | 189 (auto 76, horn 55, spells 52, hand 6) | 0 | 2 in the hand page's first 5 fights (see below) | 0 |
| After (this branch), the same | 171 (auto 53, horn 53, spells 55, hand 10) | 0 | 0 | 0 |

Before the watchdog told a queue of moving shows from a true stall, a short run of the hand page alone on main raised `noResult`
twice in five fights (7 and 3 shows waiting behind a won fight) and one 12 s hold with 6 waiting: fault 2. After the fix the hand page raised
neither in 16 fights (10 in the long run, 6 alone).

Both runs made sheets fail and arrive late throughout (before: 149 failed, 401 late; after: 203 and 523), hid the tab (32 and 46
times) and tapped to skip (67 and 65 times); 478 and 419 ultimates were fired by hand, the horn blown 53 and 50 times, 128 and 102
spells cast. The one flag left in both is `tooLong` on the hand page (once before, twice after): the driver sets a hero's charge
full and fires it about once a second, far faster than a hero's charge fills, so shows queue behind each other (25 waiting at the
worst) and a fight outlasts the driver's three minutes. Every one of those shows was moving; it is the first question under
"Still open". Texture memory under this stress (five new heroes every fight) peaked at 340 MB before and 371 MB after: the fix
holds two fights' atlases where Pixi used to take back whatever had not been drawn for a minute. With the same party fight after
fight it holds that party's and no more.

What the soak cannot show: a real phone's graphics card and its memory. The software renderer here never loses its context, and
its uploads are slow in a different way, which is why fault 1 was measured apart.

### Still open (the director's or the owner's call; nothing here acts on them)

- **A queue of shows.** Five ultimates fired by hand in a row are five shows of 4 to 6 s, the fight held for most of each. That
  is as designed ("several ultimates queue, each its own moment"), but it reads as a stall. Should a second ultimate fired while
  a show plays get the short banner?
- **A lost context that does not come back.** Today the picture would stay as it was. Reload the page after a few seconds?
- **What the owner sees.** Whether only the picture stops or the buttons too, whether it comes back, and whether Auto is on or
  the ultimates are fired by hand, would say which of these it was, or that it is something else.
- **Seen in passing, not touched:** each damage number is its own `Text` (its own texture; thousands are made and collected in a
  long session), and a board's first frames at deploy take the longest of any frame's work (the forest and the mire most).
