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
| after | 393x852 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 293 ms | 582 ms |
| before | 360x780 | 4x | 16 | 0 | 0 | 6 | 8 | 2 | 3 | 15 | 66 | 599 ms | 1288 ms |
| after | 360x780 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 137 ms | 545 ms |
| before | 412x915 | 4x | 15 | 0 | 0 | 5 | 8 | 2 | 3 | 8 | 66 | 682 ms | 1424 ms |
| after | 412x915 | 4x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 255 ms | 710 ms |
| before | 393x852 | 6x | 14 | 0 | 0 | 4 | 7 | 3 | 3 | 9 | 66 | 955 ms | 1942 ms |
| after | 393x852 | 6x | **1** | 0 | 0 | 1 | 0 | 0 | **0** | 0 | 12 | 439 ms | 756 ms |

The frames left after are designed entrances, sampled sparsely on a slowed CPU: the Pact Gallery's rise (its box fades and lifts in
over 0.3 s) and, in the last 393x852 run, a quest giver's card fading in (before the fix that card shut the moment it opened, so
there was nothing to flag). The 393x852 after run was made again after the full-artwork work below, and the 412x915 one after the chest work. No run, before or after, had a page error.

Not improved: the Armies screen still holds the main thread for 0.5-0.7 s (slowed four times) as it opens. Most of it is the
screen's own layout and its figures' first drawing (`snapFigures` reading the layout); it now shows whole rather than dark and then
lit, but it is not quicker. The busy figures vary by a few hundred ms between runs (the idle warm-up of the portraits can land in a
change's window).

The per-change numbers are in `docs/samples/menu-glitch-<before|after>-<size>.json`. The strips (red frames are the flagged ones):

- `docs/samples/menu-glitch-calamity-enter-before.png` / `-after.png`: the old board through the Calamity's fade, then the home screen under it.
- `docs/samples/menu-glitch-stall-open-before.png` / `-after.png`: the stall filling in, then whole.
- `docs/samples/menu-glitch-tab-heroes-recruit-before.png` / `-after.png`: a 265 ms freeze and the sanctum sliding in empty, then a prompt slide of a painted page.
- `docs/samples/menu-glitch-gallery-open-before.png` / `-after.png`, `menu-glitch-armies-open-*`, `menu-glitch-deploy-home-*`.

## The chest that would not open (the owner's phone)

The director passed on a case from the owner's phone (Android Chrome, the installed app, about 412 px wide): a Bronze chest bought on
Hester's Stall's Chests tab opened with the title, the chest and the rays, but a flat grey-brown box over the lower right of the chest,
the rays cut off by a hard line across the screen, an empty dark band under it, the rewards never showing and the stall dimly showing
through.

**Cause: the phone ran out of graphics memory, and the parts it could not paint were left as flat boxes.** On a phone a page is
painted in tiles within a memory budget. The chest's light was a 520 px spinning square of conic gradient under a radial CSS mask; at
the phone's pixel ratio (about 2.6) that is a layer of about 11 MB, and its mask another. Under the opening's 94% dark backdrop the
stall, the home screen and the game's board were all still being painted too. Past the budget, tiles are skipped: a flat rectangle
where a tile of the chest should be, the rays ending at a tile's edge, the reward cards and the Collect button missing.

Reproduced in Chromium at 412x915 with the phone's pixel ratio 2.625, GPU rasterisation and a fixed graphics budget
(`--force-gpu-mem-available-mb`), buying a Bronze chest on the stall: frames at 1.3 s and 3.5 s, a trial failing when the chest's own
picture is left unpainted (by measuring flat 40 px blocks in it, and by eye).

| Graphics budget | main | this branch |
| --- | --- | --- |
| 512 MB | 0 of 2 fail | 0 of 2 |
| 48 MB | 1 of 6 fail (`menu-glitch-stall-chest-before-after.png`: the rays cut across the chest, its lower half and the Collect button gone, the stall through the band) | 0 of 6 |
| 40 MB | 1 of 6 fail | 0 of 6 |
| 24 MB | 4 of 5 fail (the chest and the rays gone) | 0 of 5 by the measure, but by eye parts of the chest still go missing in some frames: at that budget a full-screen reveal at this pixel ratio does not fit whatever is done |

The earlier menu work had made it worse before this fix: the pages' strip kept a permanent `will-change: transform`, a whole extra
screen-sized layer, and at 48 MB that build lost the chest 4 times in 4.

**Fix:**

- The chest's rays are painted once into a 520 px canvas (`raysCanvas` in `src/chestStash.ts`: the same rays, colour and fade), which
  costs about 1 MB at any pixel ratio, in place of the masked gradient's two full-resolution layers. The daily chest's violet comes
  from `--p4` as before.
- While a full-screen reveal is up (`.chestShow`, `.tarotReveal`, an Eidolon's binding until it starts to fade out), the screens it
  covers (the game's board, the home screen, the party, the summoning, the stall and the old chest shop) are `visibility: hidden`,
  so the phone paints the reveal alone (`src/pixel.css`). Under the chest's 94% backdrop the dim stall no longer shows; nothing else
  changes.
- The home pages' strip is its own layer only while it slides (`.hmTrack.sliding`).

**Every other reveal checked.** The stash's chests on the Battle tab (the army star chests, the daily chest, and any opened with Open
all) use the same opening and so share the fix. The first-time summoning reveal had the same fault and worse: its rays were a masked
gradient 1.8 screens wide and tall, spinning, tens of megabytes; at 48 MB the home screen showed through holes in it and the hero's
painting never came (`menu-glitch-summon-reveal-before-after.png`). It gets the same treatment (`raysCanvas` in `src/summonTarot.ts`,
half the screen's size, the same thin rays and elliptical fade) and the screens under it hidden. The Eidolon binding was not
measured (it needs a bound chain); it is opaque and full-screen, so the screens under it are hidden as well. The other
masked layers left (the War Horn's fill and aura) are small.

## The hero's full artwork, half painted (the owner's phone)

A second case from the owner's phone: "View full artwork" on a hero's sheet (Dorion, Piper of the Revel) showed the artwork only in an
L-shaped part of the panel; a large rectangle showed the old hero sheet through it, dimmed, with the panel's frame cut along it.

**Cause: the same, graphics memory; most of it held by screens nobody could see.** The composited layers with the viewer open
(CDP `LayerTree`, at 412x915 and pixel ratio 2.625) came to about 165 MB on main (187 MB on this branch before this fix):

- the fight's sky under the home screen: five parallax layers 124% of the screen wide, each kept on the graphics card for good by
  `#sky div { will-change: transform }`, about 65 MB, all the time the menus were up;
- the board's WebGL canvas, the bench panel (`#panel`) and its pseudo-elements, another 30 MB or so, also under the opaque home screen;
- the hero sheet under the viewer's 91% backdrop (its scrolling body, its frame's pseudo-elements and portrait);
- on this branch, the tavern's canvas and the top bar, promoted beside them.

With the viewer: 4 drawing layers, about 31 MB. On the home screen: about 47 MB.

**Reproduced:** buying nothing, just opening Dorion's sheet and the artwork, frames compared with one drawn with plenty of memory:
main was wrong in 3 of 3 at 48 MB and 3 of 3 at 32 MB (the lower part of the panel unpainted, the sheet through it, the frame cut:
`menu-glitch-hero-artwork-before-after.png`); this branch 0 of 3 at both.

**Fix (`src/pixel.css`):**

- While the home screen is open, the game's own screen under it (the sky, the board's canvas, the HUD, the bench, the duchess) is
  `visibility: hidden`. The home screen is opaque, so nothing changes to the eye. A screen opened from the home screen gets them back
  as the home screen closes (also while it is still drawn under the new screen, `.handoff`).
- While the full artwork is open (`dialog.heroArtViewer[open]`), the screens under it are hidden as under the chest. The sheet no
  longer shows faintly through the 91% backdrop.

With these the chest opening now paints fully even at 24 MB (3 of 3), where it lost parts of the chest before; the first-time
summoning reveal is whole at 48 MB, but at 32 MB the lower part of the hero's painting can still be missing.

**Audit of the rest, as the director asked:**

- `backdrop-filter`: one use, the locked Calamity portal on the Battle tab (`campPlaces.css`, greying the citadel painted behind it);
  it makes that button a screen-sized layer (about 10 MB) while the Calamity is locked. Left as it is: replacing it changes the look,
  and it goes once the Calamity opens.
- `will-change` left on for good: the sky layers (now hidden under the menus, still needed in a fight); the home strip's was removed
  (only while it slides).
- Full-size artwork: the hero illustrations are 1024x1536 (portraits 320x480), about 6 MB each decoded; shown one at a time, they fit
  once the hidden screens are out of the way, so they were not cut down.
- Big filters: the drop-shadows on the dossier portrait and the artwork are painted with them, not separate layers; nothing showed in
  the layer tree.

## Checks

- `npm install`; `npm run typecheck`: passed.
- `npm test` (the full suite): 1963 tests, 1963 passed (including the new `test/tap-guard.test.ts`).
- `npm run web`: built.
- `node tools/menu-glitch/scan.mjs` on the build before (main, 0.293.0) and after, at 393x852, 360x780 and 412x915 with the CPU
  four times slower, and at 393x852 six times slower: the table above. The final screens of each tab, the stall and the Calamity
  were looked at, at 360x780 and 412x915 as well: laid out as before.
- Reduced motion (Playwright `reducedMotion: 'reduce'`): a tab change shows the new page at once, with no slide.
- The chest and summoning trials above (`--force-gpu-mem-available-mb`, pixel ratio 2.625, 412x915), against main and this branch.
  After the chest work: `npm run typecheck` passed, the full `npm test` 1963 of 1963 passed, `npm run web` built, and the menu scan
  at 393x852 and 412x915 gave the after rows above.
- The full-artwork trials and the layer tree above. After that work: `npm run typecheck` passed, the full `npm test` 1963 of 1963
  passed, `npm run web` built, and the menu scan at 393x852 (the after row above) found no stale, torn or blank frame; the final
  frames of entering a fight, coming home from one, the Calamity and the party screen look as before.

## Files

`src/tapGuard.ts`, `src/tapGuardRules.ts`, `src/paintReady.ts` (new); `src/home.ts` (the strip, `handOff`, `sheetUp`,
`primeScenes`, keyed castle chips and stall); `src/castle.ts` (keyed chamber cards and power banner); `src/camp.ts` (`paintOnce`,
the army drawn at once, the width kept, the plate written only when it changes); `src/hall.ts`, `src/library.ts` (`paintOnce`);
`src/render/sheets.ts` (`warmPortraits`); `src/stallView.ts`, `src/eidolonChainView.ts` (shown once painted); `src/chestStash.ts`, `src/summonTarot.ts` (rays in a canvas);
`src/pixel.css`, `src/daily.css` (the chest's rays, the screens covered by a reveal, the artwork or the home screen hidden); `src/main.ts`
(installs the guard); `src/index.html` (`.hmTrack`, `.handoff`, `.paintWait`); `test/tap-guard.test.ts`;
`tools/menu-glitch/scan.mjs`, `tools/menu-glitch/strip.py`; `docs/samples/menu-glitch-*`.
