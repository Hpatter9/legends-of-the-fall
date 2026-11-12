## FREEZE-FIX: a wave's end never waits on a show

Branch `claude/freeze-fix` (main 0.524.0 merged; the branch's first push, the deadlines and the dropped queue, went into main as
0.521.0). The owner, on an Android phone (the installed app): "The game is freezing now.
Seemingly random in a wave", and then: "The freeze I was getting was usually when one wave ends. Before the next wave begins. The
little red flags on the heroes on the bottom would move like it wasn't frozen." and "Sometimes it would continue but that was after
10-20 seconds later." It was new: it did not happen a day before (0.492 and earlier).

### The cause

**The wave's result waited for every ultimate's show still playing or queued, and for an Eidolon's call still open.** Since 0.497
every ultimate fired by hand plays a show of 4 to 7 s, the shows queued one behind another without limit, and the page did not
begin its end-of-fight wait until the queue was empty. So with the last foe down the board stood still, the page alive (the hero
rows are the page's own, and kept moving), until the shows had run out.

Proved on main 0.520.0 by the soak playing whole runs through the game's own wave-end flow, timing from the simulation's
fight-over to the result's card (or the next deploy) being shown, in the game's own time:

| Main 0.520.0, 12 wave ends (hand and horn pages) | |
| --- | --- |
| At the middle | 7.0 s |
| The four worst | 8.25 s (2 shows and a call), 12.75 s (3 shows), 18.0 s (3 shows), 21.0 s (4 shows) |

Each dump reads the same: the fight won, nothing shown, the queue running down; then the result. That is the owner's "10 to 20
seconds later".

**The wait that never ends** (the owner's "usually") was not reproduced in ordinary play. One way to it was found and closed: an
Eidolon's call stands on its first blow until the fight makes the strike, and a call whose strike never came (the board having
become another fight's) stood there for ever, every later fight's result waiting behind it. Whatever other way there may be, the
result no longer waits on any show, and the page has a belt (below).

### The fix

- **One full show at a time** (`oneShow` in `src/ultMomentRules.ts`, `UltMoments.note`; the director's call). An ultimate fired
  while another show has the screen, an ultimate's moment or an Eidolon's call, takes effect at once with the short banner, as on
  Auto (`FightHud`'s `ultFull` is asked for each caster: `UltMoments.took`). Nothing is queued behind a show any more.
- **No show outlives the fight** (`UltQueue.fightOver`, `EidolonCall.fightOver`, asked by `main.ts` every frame once the fight is
  over). The moment playing goes straight to its aftermath, a second of it at most (`ULT_MOMENT.OVER_MS`); a call that has struck
  keeps its last second (`CALL_OVER_MS`), one that has not goes; and the end-of-fight wait (the 2 s every fight has, for the falls
  to play) no longer waits for either. So the result is up 2 s after the last foe falls, whatever was playing.
- **A deadline on every moment** (`momentLimit`, in `UltQueue.step`): one that outlives its own length, a salvo's longest wait
  and 2.5 s over is ended and logged.
- **The call's wait for its strike is bounded** (`STRIKE_WAIT_MS`, `strikeOverdue` in `src/eidolonRules.ts`): 2.5 s, counted only
  while the page is free to step the fight; then it plays on without the strike. A call that has not struck when the board becomes
  another fight's is dropped.
- **The belt** (`waveEndStuck`, `Game.waveEndBelt` in `main.ts`): a fight over for 10 s with nothing the player can act on shown
  (no result, no card, no film, no revive) has its shows cleared and is settled as it would have been, so the wave's result is
  never lost. What was pending is logged: it should never be needed.
- **A fault in a show's frame drops the show, not the frame** (`Game.guard`; the same in `standView.ts`): the Eidolon's call, the
  ultimate's moment and the effects' part of a tick are each caught on their own, logged, and the show put away. Before, the page's
  ticker caught a frame's fault, but everything after it in the frame, the fight's own step included, was never reached.
- **A lost graphics context** (`src/contextRules.ts`, wired in `main.ts`). Pixi already rebuilds when the browser gives the context
  back; both are now logged. One not given back within 4 s has the page loaded again into the same run and wave (the director's
  call): only while a fight is going or a deploy is up, when the saved run is this wave's start and nothing of the wave has been
  counted; a fight that has ended is left to its result's card (which is the page's, and works), and the reload comes at the next
  deploy. Never twice in a minute. The Last Stand comes back to its own save.
- `stepAt` (the camera's step between strike frames) gave no frame for a share that cannot be told; made total.

The atlas loader is main's (0.519.0, `blenderFxBudget.ts`): an earlier turn of this branch had its own release rule, dropped at the
merge. That work answered the other thing measured here: an ultimate's atlas handed to the graphics card on the frame of the blow
cost 200 ms with the page stopped at a phone's speed from an image element, 44 ms from a decoded bitmap, at 2048 px a side.

Nothing under `src/sim` changed: the fights play out the same.

### The tests

`test/freeze-fix.test.ts`: every hero's moment of every shape ends inside its limit; broken lengths (infinite, NaN, negative,
huge) are ended by the deadline and the next moment plays; 300 fuzzed queues always drain; one show at a time; whatever is playing
or waiting, at any point of it, a second at most is left once the fight is over and the fight is not held; the belt; the context's
reload (when, where, never in a loop); the call's wait; the camera rules end and stay in range for 400 random sets of spots.

### The tools

`node tools/freeze-fix/soak.mjs [--minutes 40] [--modes auto,hand,horn,spells] [--faults 0] [--fresh] [--real]` (after
`npm run web`; `ROOT=<dir>` soaks another build). A page at 393x852 for each way of playing: both Auto switches on; ultimates by
hand the moment they can be; the War Horn blown each fight; the king's spells by hand with the rest. Each plays whole runs, wave
after wave, through the game's own wave-end flow (`--fresh` begins every fight as a new run), at x1, x2 and x3 in turn, hiding and
showing the tab, tapping to skip shows, and making some effect sheets fail or arrive seconds late. The page's clock is stepped by
hand (33 ms frames of the game's time; `--real` leaves it alone), since the software renderer here is slow. Flags:

- `waveEnd`: nothing shown for 8 s after the fight ended (how long it took is kept for every wave end);
- `afterResult`: no next wave 30 s after the result with no card up; `stall`: nothing at all moving for 12 s in a fight;
- `heldLong`, `tooLong`, `frameError`, `hung`, page errors, a lost context.

Each flag writes the state (the show, the queue, the call, every hold, the wave-end's own flags) to `out/freeze-fix/flags.json`
with a screenshot.

| Hand and horn pages, whole runs | Wave ends | Fight's end to something shown: middle | Worst | Over 8 s |
| --- | --- | --- | --- | --- |
| Before (main 0.520.0) | 12 | 7.0 s | 21.0 s | 4 |
| After | 20 | 1.75 s | 2.0 s | 0 |

All four pages on the fix, with sheets failing and late (a short run, cut by the machine's time): 28 wave ends, 1.75 s at the
middle, 2.5 s at the worst, none over 8 s; no stall, no fault in a frame. The fights also go quicker by hand: 13 in the time main
played 8, since shows no longer queue.

With main 0.524.0 merged (TEN-LIVES: a fallen hero rises after 5 s for a life): 22 more wave ends by hand, horn and spells, 1.5 s
at the middle and 2.0 s at the worst. The soak's own runs never ended a wave with a hero down, so those were forced in a page
(a hero killed, then the last foes): a hero down with its countdown running; the same with an ultimate fired; the same with the
horn blown; the whole party down on the tick the last foe falls; the whole party down with foes standing (they rise, and the
fight goes on to its end). All five: the result shown 1.75 to 2.0 s after the fight ended, no fault, the belt never needed.

An earlier soak of 189 fights on main 0.514.0, each begun as a new run, raised no stall, no page error and no hang in the
simulation, with 149 sheets failed and 401 late: a sheet that is late or fails is skipped, never waited for. It missed the freeze
because it never played from one wave into the next.

`node tools/freeze-fix/context.mjs` takes the graphics context away (`WEBGL_lose_context`) mid-wave, mid-ultimate and mid-call, on
a real clock, twice each: given back after a second, and never.

| Context lost | Given back after 1 s | Never given back |
| --- | --- | --- |
| Before (main 0.520.0), all three moments | the picture comes back, the fight goes on | the picture stays dead, the fight going on unseen; nothing logged |
| After: mid-wave | the picture comes back, no reload | loaded again: stage 6, deploy, crowns and xp as they were |
| After: mid-ultimate | the same | the same |
| After: mid-call | the same | the call's strike won the wave before the 4 s were up, so the wave was counted (once) and the page loaded again at stage 7's deploy, as it was saved |

### Still open

- **What the soak cannot show:** a real phone's graphics card and memory.
- **Seen in passing, not touched:** the page logs "ResizeObserver loop completed with undelivered notifications" now and then
  (before and after alike); each damage number is its own `Text` and texture; a board's first frames at deploy are the heaviest
  of any frame's work.
