# Menu glitches

The owner, on an Android phone with the installed app: "I'm still getting a lot of glitching with menus. Changing screens, opening
tabs, all over the place." Branch `claude/menu-glitch`.

## How it was measured

`tools/menu-glitch/scan.mjs` drives the built page (`npm run web`, served) in Chromium at an upright phone size, with the CPU slowed
four times (CDP `Emulation.setCPUThrottlingRate`, as a mid phone) and touch input, through 42 changes: the five home tabs (each
neighbour and one two apart), the roster, a hero sheet and its tabs, the quest log and its tab, Hester's Stall and a tab, the Pact
Gallery, the codex and a tab, the achievements, settings, the upgrades list, the armies, the party screen, into a fight and back
home, into the Calamity and back, a tap on a camp hero, on the tavern's board and on a quest giver, and a lost fight's result to the
recap and home. It records every frame the browser composites across each change (a CDP screencast) and flags:

- **blank**: a frame mostly one flat colour where neither screen is;
- **bounce**: a big change that goes back within three frames (a panel drawn and redrawn, a picture blinking);
- **pop**: once the change has begun, pieces that were flat (an empty box, an unpainted canvas, a picture not yet decoded) filling in;
- **stale**: a frame showing neither the old screen, nor the new one, nor a blend of the two (an old screen showing through);
- **torn**: in a tab's slide, a page area that is not the old and new pages edge to edge at some point of the move;
- **ghost**: a click landing on something other than what the finger went down on (a panel the tap itself opened);
- beside them: pictures on view but not yet decoded (late), layout shift, pictures and canvases rebuilt (churn) and main-thread
  long tasks (busy).

The frames are compared at their own size and averaged down in script (an earlier version let the browser scale them and read two
identical frames as different). The fight's opening camera and the recap's staged reveal are meant to move, so for those two only
blank and bounce count. `tools/menu-glitch/strip.py` makes the frame strips.

## What was found, and the fix

| Where | Glitch | Cause | Fix |
| --- | --- | --- | --- |
| Tavern: a tap on a quest giver (Gwen, Duchess) | the giver's card opened and shut at once | the tavern acts on `pointerup`; a phone aims the tap's click afterwards, at what is now under the finger: the card's backdrop, which shuts it | `src/tapGuard.ts` (rule in `tapGuardRules.ts`, tested): a click that lands on something unrelated to what the finger went down on, within 600 ms of it lifting, is swallowed |
| Tavern: a tap on the quest board | the log opened and the click pressed the quest row under the finger | the same | the same |
| Camp: a tap on a hero | the sheet opened and the click landed on its name block | the same | the same |
| Into the Calamity (and any screen laid over the home screen the same way: the party, the daily's card) | the last fight's board, HUD and all, showed through as the new screen faded in | `Home.go` hid the home screen at once, before the new screen (a fading overlay over the game's stage) covered anything | `Home.handOff`: the home screen stays drawn, still and untouchable (`#home[hidden].handoff`, `.handoffQuiet`), under a screen laid over it until nothing covers it any more; a screen that is the board itself covers nothing, so the home screen goes at once, as before |
| Hester's Stall | the shelf, Hester and the wares filled in over three frames | new `<img>`s and a background of data-URL pictures, decoded only once on view | `src/paintReady.ts` `showWhenPainted`: the panel is laid out and painted at no opacity (`.paintWait`, its animations paused) until its pictures are decoded, at most 450 ms, then shows whole |
| Pact Gallery | empty alcoves, then the Eidolons popped in | the same (files by URL) | the same |
| Armies | the land dark, then the day picture | the backdrop layers are files by URL | the same, on `#hmSub` |
| Roster and every fresh sheet | (seen while fixing the others) pictures on view before they were decoded | the same | the same, for a sheet coming up fresh; a sheet redrawn in place (a tab, the next hero) stays in view |
| Tab change, first visit to Heroes or Recruit | the tavern or the sanctum slid in as an empty dark page | their canvases were never painted until the tab was shown | `Home.primeScenes`: each scene paints one still (`paintOnce`, new for the camp, hall and library) while the page is idle after the home screen opens |
| Every tab change | the tap froze for 150-250 ms, then the slide jumped most of the way | the whole refresh (and the incoming scene's first paint) ran on the tap, and each page slid on its own CSS transition, started whenever the browser got to it | the pages ride one strip (`.hmTrack`), moved by one Web Animation, so the two pages can never part or overlap; the new page is laid beside the view and given two frames to be drawn before the strip moves; a change while one slides finishes it first; reduced motion: no slide |
| Every home refresh (each tab change, the builders' clock each second) | 11 pictures and canvases rebuilt each time | the castle's seven chamber cards, the power banner and the castle chips were rebuilt from scratch, and the camp's stall picture was made anew only to be compared and thrown away | keyed: each is built again only when what it shows changes (`dataset.key`) |
| Deploy, back to the home screen | the camp showed the previous army's land for a frame | the stopped camp's canvas kept its last picture until its loop drew again | `CampScene.update` draws at once when the army changes |
| Armies opening | a forced reflow on each refresh (about 120 ms slowed) | `CampScene.at` read the page's `clientWidth` after the DOM had changed | the width is kept from `fit` (the ResizeObserver) |
| Codex, first opening | over a second of main thread (slowed) | each portrait read its sheet's pixels to find the figure's bounds | `warmPortraits` finds them while the page is idle |

Kept as they are: the fight's opening camera, the recap's staged reveal (DEFEAT, the stats, the company), the Pact Gallery's rise
and the codex's claim-button glow (intended effects; the scan still flags the gallery's rise and the glow as one "pop" frame each now
and then). Not changed: the party screen's first opening still holds the main thread for about 0.8 s slowed: the game's board,
paused under the home screen, starts drawing again under the party screen and compiles its shaders the first time (a one-off).

## Before and after

Glitch frames (blank + bounce + pop + stale + torn) and ghost clicks over the 42 changes, CPU four times slower unless marked:

| Build | Size | CPU | Glitch frames | blank | bounce | pop | stale | torn | Ghost clicks | Late pictures | Pictures rebuilt (6 tab changes) | Main thread busy (6 tab changes) | Codex first open busy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| before | 393x852 | 4x | 13 | 0 | 0 | 5 | 7 | 1 | 3 | 2 | 66 | 601 ms | 1279 ms |
| after | 393x852 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 142 ms | 526 ms |
| before | 360x780 | 4x | 16 | 0 | 0 | 6 | 8 | 2 | 3 | 15 | 66 | 599 ms | 1288 ms |
| after | 360x780 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 137 ms | 545 ms |
| before | 412x915 | 4x | 15 | 0 | 0 | 5 | 8 | 2 | 3 | 8 | 66 | 682 ms | 1424 ms |
| after | 412x915 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 138 ms | 652 ms |
| before | 393x852 | 6x | 14 | 0 | 0 | 4 | 7 | 3 | 3 | 9 | 66 | 955 ms | 1942 ms |
| after | 393x852 | 6x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 439 ms | 756 ms |

The one frame left in every after run is the Pact Gallery's own rise (its box fades and lifts in over 0.3 s, sampled sparsely on a
slowed CPU), which is the panel's designed entrance. No run, before or after, had a page error.

Not improved: the Armies screen still holds the main thread for 0.5-0.7 s (slowed four times) as it opens. Most of it is the
screen's own layout and its figures' first drawing (`snapFigures` reading the layout); it now shows whole rather than dark and then
lit, but it is not quicker. The busy figures vary by a few hundred ms between runs (the idle warm-up of the portraits can land in a
change's window).

The per-change numbers are in `docs/samples/menu-glitch-<before|after>-<size>.json`. The strips (red frames are the flagged ones):

- `docs/samples/menu-glitch-calamity-enter-before.png` / `-after.png`: the old board through the Calamity's fade, then the home screen under it.
- `docs/samples/menu-glitch-stall-open-before.png` / `-after.png`: the stall filling in, then whole.
- `docs/samples/menu-glitch-tab-heroes-recruit-before.png` / `-after.png`: a 265 ms freeze and the sanctum sliding in empty, then a prompt slide of a painted page.
- `docs/samples/menu-glitch-gallery-open-before.png` / `-after.png`, `menu-glitch-armies-open-*`, `menu-glitch-deploy-home-*`.

## Checks

- `npm install`; `npm run typecheck`: passed.
- `npm test` (the full suite): 1963 tests, 1963 passed (including the new `test/tap-guard.test.ts`).
- `npm run web`: built.
- `node tools/menu-glitch/scan.mjs` on the build before (main, 0.293.0) and after, at 393x852, 360x780 and 412x915 with the CPU
  four times slower, and at 393x852 six times slower: the table above. The final screens of each tab, the stall and the Calamity
  were looked at, at 360x780 and 412x915 as well: laid out as before.
- Reduced motion (Playwright `reducedMotion: 'reduce'`): a tab change shows the new page at once, with no slide.

## Files

`src/tapGuard.ts`, `src/tapGuardRules.ts`, `src/paintReady.ts` (new); `src/home.ts` (the strip, `handOff`, `sheetUp`,
`primeScenes`, keyed castle chips and stall); `src/castle.ts` (keyed chamber cards and power banner); `src/camp.ts` (`paintOnce`,
the army drawn at once, the width kept, the plate written only when it changes); `src/hall.ts`, `src/library.ts` (`paintOnce`);
`src/render/sheets.ts` (`warmPortraits`); `src/stallView.ts`, `src/eidolonChainView.ts` (shown once painted); `src/main.ts`
(installs the guard); `src/index.html` (`.hmTrack`, `.handoff`, `.paintWait`); `test/tap-guard.test.ts`;
`tools/menu-glitch/scan.mjs`, `tools/menu-glitch/strip.py`; `docs/samples/menu-glitch-*`.
