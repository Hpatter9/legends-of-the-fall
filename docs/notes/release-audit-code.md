# RELEASE-AUDIT: code health and background work (0.590.0)

The owner, before the app store: "a full look through: making sure code looks right, no wasted or extra things happening in the
background." This is the code half (another audit covers the art, another store readiness and size). Branch `claude/release-audit-code`
from `main` at 0.590.0 (`d0ffa3a1`).

**How it was measured.** The built game (`npm run web`) on a 393x852 touch page in headless Chromium, the graphics card stood in for by
SwiftShader (software rendering, so the graphics work lands on the CPU and every frame time here is far worse than a phone's), the main
thread throttled 4x (a mid-range phone's CPU, as the soaks before this one did). The tools are in `tools/release-audit/`:

- `profile.mjs` (with `inpage.js`, put in the page before the game): each screen for 6 to 8 s: the main thread's busy share (CDP
  `TaskDuration`), script and style shares, the frames, every animation-frame loop and timer that ran, counted by the place in the code
  that asked for it (`--root out/plain` after `node build.mjs --plain --out out/plain` names the module), the listeners on the window,
  document and body, the observers, audio contexts and workers alive, the heap and Pixi's textures; then a sweep of every menu and the
  three phone sizes, ten waves of one run, and twenty openings of the menus. `--prof <screen>` adds a CPU profile, `--mut` the fight's
  DOM writes. "Tab hidden" is the page told it is hidden (`visibilitychange`, its animation frames held back as a phone holds them):
  headless Chromium never hides a page by itself.
- `robust.mjs`: a corrupt save, an old save, storage full, a reload mid-fight, an offline start through the service worker, a lost
  graphics context and a tab hidden mid-fight.

What this cannot show: a real phone's graphics card, its memory limits and its thermals. The CPU numbers are for comparing screens and
before/after, not a promise of a phone's frame rate. **No real device was measured.**

## The findings, ranked by how much they would hurt a store user

### 1. The 208 MB `game.js`: start-up time and memory (high)

`game.js` is 208.0 MB: 202.8 MB of it is 1,136 PNG and WebP pictures inlined as base64 data URLs, 5.3 MB is code (Pixi is 0.6 MB of
that). What it costs a player, measured here:

- **Start-up.** From the address to the home screen: 40 to 42 s on this machine, unthrottled (the throttle does not change it: it is
  not script). The page's `DOMContentLoaded` alone comes at 35.6 s. The script itself runs for 2.4 s; the rest is the browser reading
  and keeping a 208 MB script, and the pictures' warm-up (next point).
- **The warm-up's pixel reads.** Before the home screen shows, two warm-ups read pixels back from 501 freshly drawn canvases
  (`getImageData`): `render/abilityArt.ts` (`loadAbilityArt`, every skill's painted cell) and `render/cinematicArt.ts` (`surface`).
  Here that is 33.4 s of the start-up (66 ms a read, SwiftShader); on a phone's real graphics card each read is a stall of the GPU too,
  likely a few milliseconds each, so roughly 0.5 to 2.5 s (not measured). After the home screen `warmPortraits` (`render/sheets.ts`)
  goes on reading every loaded sheet's idle frame in idle time (219 more reads, 50% of the home screen's CPU in its first half
  minute, and it carries on while the tab is hidden).
- **Memory.** V8's own heap is small (38 MB after a collection), but its *backing store* holds 397 MB: the bundle's text, data URLs and
  all, kept for the whole session (`performance.memory` reads 435 to 495 MB throughout). On top of that come the decoded pictures and
  the GPU's copies (188 MB of textures in a fight, below). On an iPhone or a 3-4 GB Android phone that is the likeliest reason for the
  app being killed in the background or on a heavy screen.
- **The web build's first visit.** The service worker caches 1,451 files, 381 MB (590 MB of the origin's storage once done): 49 s even
  from localhost. Until it is done, offline does not work.

What could move out of the bundle (the size work is its own job; nothing moved here):

| Group | In game.js | Could be |
|---|---|---|
| `src/art/units/` (266 fighter sheets) | 98.2 MB | files by URL, loaded when a fighter of that kind is first needed (as `heroes/` and `awakened/` already are); the PNGs as lossless WebP |
| `src/art/fx/` (the aura, ability, cinematic and status atlases) | 32.5 MB | files, loaded behind the home screen before the first fight |
| `src/art/rulers/` (9 paintings, 3 to 3.5 MB each) | 27.3 MB | files, loaded when the ruler's screen opens; lossy WebP would make each a few hundred KB |
| `src/art/camp/` (7, 4.6 to 5.7 MB each) | 21.0 MB | files; WebP |
| `src/art/hall/` (sanctum, summoner) | 6.9 MB | files |
| `src/art/quests/`, `altar/`, `eidolons/`, `rift-sanctuary/`, `calmap-dungeon/` and the rest | ~13 MB | files |

The thirty largest inputs of `game.js` (MB):

| # | Input | MB |
|---|---|---|
| 1 | `src/art/fx/aura/atlas.png` | 8.40 |
| 2 | `src/art/camp/camp-war.png` | 5.66 |
| 3 | `src/art/camp/camp-wild.png` | 5.49 |
| 4 | `src/art/camp/camp-arcane.png` | 5.18 |
| 5 | `src/art/camp/overlook.png` | 4.61 |
| 6 | `src/art/fx/cinematic/painted-atlas.png` | 4.08 |
| 7 | `src/art/hall/sanctum.png` | 3.99 |
| 8 | `src/art/rulers/moon_oracle.png` | 3.54 |
| 9 | `src/art/rulers/frost_witch.png` | 3.45 |
| 10 | `src/art/rulers/iron_stag.png` | 3.36 |
| 11 | `src/art/rulers/gilded_necromancer.png` | 3.33 |
| 12 | `src/art/rulers/sun_viper.png` | 3.14 |
| 13 | `src/art/rulers/ash_empress.png` | 3.12 |
| 14 | `src/art/rulers/rose_duchess.png` | 3.11 |
| 15 | `src/art/rulers/storm_corsair.png` | 3.09 |
| 16 | `src/art/hall/summoner-active.png` | 2.94 |
| 17 | `src/art/fx/cinematic/accents-atlas.png` | 2.46 |
| 18 | `src/art/fx/abilities/atlas-1.png` | 1.63 |
| 19 | `src/art/fx/abilities/atlas-2.png` | 1.60 |
| 20 | `src/art/fx/abilities/atlas-4.png` | 1.54 |
| 21 | `src/art/fx/abilities/atlas-6.png` | 1.52 |
| 22 | `src/art/fx/abilities/atlas-0.png` | 1.48 |
| 23 | `src/art/fx/abilities/atlas-5.png` | 1.48 |
| 24 | `src/art/fx/abilities/atlas-7.png` | 1.47 |
| 25 | `src/art/fx/abilities/atlas-3.png` | 1.46 |
| 26 | `src/art/fx/status/atlas.png` | 1.34 |
| 27 | `src/art/rulers/thrones.png` | 1.17 |
| 28 | `src/art/units/hero_res_treant2_back.png` | 1.08 |
| 29 | `src/art/units/hero_res_treant2.png` | 1.07 |
| 30 | `src/art/units/hero_res_treant3_back.png` | 1.05 |

The largest code: `quipData.ts` 124 KB, `main.ts` 113 KB, `updates.ts` 110 KB (the whole Updates list, read only in Settings: could be
loaded when opened), `signalsmith-stretch` 100 KB (pulled in by `@audiorective/effects`, of which the game uses only `Limiter`: never
run), `render/combatAudioBank.ts` 99 KB (base64 sound), `render/fx.ts` 92 KB, `render/blenderFxData.ts` 79 KB.

Unused in the bundle: nothing large that is plainly dead; every fighter sheet is named by a unit, a test or a tool. The hidden modes'
share is in point 9.

**Recommendations:** (a) the size job: fighter sheets, rulers, camp, hall and the effect atlases to files by URL (cached by the service
worker, as the other 1,279 files already are), and the big PNG paintings to WebP; (b) the warm-up's 501 reads done once at build time
(the surfaces are fixed by their atlases; the build could write them as a sheet) or at least after the home screen shows. A
`willReadFrequently` canvas would make each read cheap but was measured **not** to give the same pixels as the GPU canvas (premultiplied
differences up to 74/255 on the painted atlas), so it is a look change for the owner to judge, not a safe fix; (c) `warmPortraits`'s
boxes also fixed at build time (they are each sheet's idle frame's box, known when the sheet is cut).

### 2. A full storage stops the game (high, rare)

`saveMeta` and `saveRun` (`sim/meta.ts`, `sim/run.ts`) call `localStorage.setItem` with nothing round it. With the page's storage full
(5 MB a site in Chrome; the test filled 19 x 256 KB):

- starting a run throws `QuotaExceededError` out of `startRun` (the Battle button does nothing, the run is not begun);
- the game's own start-up saves the meta before anything else (`main.ts`, after `loadAwakenedSheets`): a throw there would stop the
  start-up before the home screen.

How likely: the game's own keys are small today (the meta is tens of KB), so it needs something else filling the site's storage, or a
save that grows for years. **Recommendation:** catch in the two savers and say so to the player once ("Your progress could not be
saved: the phone's storage is full"); what to tell the player is the owner's call, so it is not changed here.

Also seen: **a corrupt save is replaced without a copy.** An unreadable `legends.meta` (half a save) is read as a fresh one, and the
first save writes over it: whatever could have been recovered is gone. **Recommendation:** keep the unreadable text under
`legends.meta.unreadable` before starting afresh. An old save (the fewest fields an early build wrote) loads with its crowns and party:
fine. A reload in the middle of a fight comes back to the home screen with the run kept at its stage: fine.

### 3. The developer grant ships to every player (high, a store matter)

Settings › Developer (`settings.ts` `devRow`, `sim/devGrant.ts`) gives crowns, shards of every hero or summoning stones, a hundred or a
thousand a tap, and Build Town raises every castle upgrade a level. It is one tap from the home screen in the built game. On the web
build `?eidolons=all` binds all six Eidolons and fills the War Horn. **Recommendation (the owner's call):** leave both out of the store
build (a build flag, as `__TACTIC_ART__` is defined now), or behind a hidden gesture. The `window.__*` hooks (`__game`, `__castSpell`,
`__forceLucky`, `__forceDrop`, `__audioDebug` and others) need the browser's developer tools, so cost nothing to a player; the Assault
bench (`?bench=assault`, `assaultBench.ts`) also ships in `game.js`.

### 4. Duchess's taps are lost (medium, a plain bug, not fixed)

Four places count a tap on Duchess by reading the save from `localStorage`, adding one to `duchessTaps` and writing it back:
`duchess.ts` (`PageGoat.tap`), `camp.ts`, `castle.ts` and `tavern.ts`. The game's own copy of the meta never sees the count, so the
achievement ("Tap Duchess 5 times") and the Tiny Tin Crown, which read the game's copy, do not see the taps until the next start, and
the game's next save (a fight's end, a build finishing) writes its old count back over them. **Recommendation:** each place counts on the
game's meta (`camp`, `castle` and `tavern` already hold it; `PageGoat` would be given it) and saves it with `saveMeta`. It touches five
files and the save, so it is left for its own change.

### 5. Wasted work on the home screen and its menus (medium; part fixed)

| Screen (4x throttle) | Main thread busy | What runs |
|---|---|---|
| Home, first half minute | 94 to 96% | the camp's scene (60 frames a second), `warmPortraits` (about half), the ALIVE painting layer |
| Home, later | ~55% | the camp (60/s) |
| Recruit / Heroes / Castle / Spells tab | 26 / 38 to 46 / 47 to 62 / 25 to 39% | each its own scene at 60/s |
| **Settings over the home screen** | **47.5 to 57.7% before, 13.7 to 14.8% after** | before: the camp under the 97% veil, unseen. Fixed |
| **Armies (War Room) over the home screen** | **50.7% before, 14.3% after** | the same: the camp under the page. Fixed |
| Home, tab hidden | 22 to 35% (the warm-up), no frames | `warmPortraits` goes on in idle time; the five intervals |

Always running, on every screen: Pixi's own system ticker (an animation frame every frame, for its pointer events, while the game's
ticker is stopped under the home screen), `@audiorective/core`'s `ParamSync` (an animation frame every frame for the life of the audio
engine, to read its parameters back ten times a second), and five intervals: the tips (250 ms, works only on the home screen), the
loop's watch and the graphics context's watch (1 s each), the builders' clock (1 s) and the ambience beds (500 ms). Each is a few
microseconds; together they mean the page never sleeps between frames. While the tab is hidden the browser holds every animation frame
back, the sound stops (both audio contexts read "suspended"), and only the timers run.

**Recommendation (not changed):** the camp and courtyard at 30 frames a second when idle (they are pixel art: the owner should look);
Pixi's events ticker (`app.renderer.events`) stopped under the home screen, where Pixi draws nothing; the warm-up as in point 1.

### 6. The fight's page work (medium; part fixed)

At 4x throttle a fight at x1 takes 73 to 87% of the main thread, a third of it (27 to 37%) recalculating styles: the HUD's rows, chips
and bars are DOM, written every frame. Of 1,150 DOM writes in five seconds, about 340 wrote the value already there (the mana box's
title, role, label and count, every row's TAP plate, the bench's On field mark). Those are fixed (below). The rest change (the meters'
widths). Duchess's place by the panel is measured twice a second (`getBoundingClientRect`), and since the HUD has just been written that
forces a layout: 507 ms of 8.9 s profiled. Her own loop runs every frame of every fight, even the three fights in four she does not
visit (it hides her each frame). **Recommendation:** the HUD's meters as transforms (`scaleX`) rather than widths, which need no layout;
Duchess's loop stopped while she is away and her place measured on resize only.

### 7. Memory and textures over ten waves and twenty menus (low: no leak)

Ten waves of one run, a collection forced after each (heap is `performance.memory`, which counts the bundle's backing store):

| Wave | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Heap MB | 454 | 456 | 460 | 461 | 464 | 466 | 467 | 471 | 472 | 475 |
| Pixi textures | 312 | 546 | 609 | 673 | 687 | 690 | 708 | 664 | 645 | 628 |
| Their GPU MB | 169 | 178 | 183 | 185 | 186 | 187 | 188 | 187 | 188 | 188 |

The textures and their memory level off (the three boards kept, the sheets kept ready, as designed: `texReadyRules.ts`,
`boardWarmRules.ts`); the heap grows about 2 MB a wave (21 MB over ten): worth a longer soak, not a leak shown. Twenty openings of
Settings and every tab: the heap, the DOM (1,374 elements), the textures, the 77 listeners on the window, document and body, the 21
observers and the 5 intervals all the same before and after. The DOM grows by about 4 elements a wave (1,341 to 1,380); the canvases
stay at 21 to 23.

### 8. Console errors and warnings (low; fixed)

A full sweep (every home menu, every Settings page, the three phone sizes, ten waves): no errors, no unhandled rejections, no failed loads,
no 404s. Warnings: 8 of "Oscillator.frequency.setValueAtTime value 22,xxx outside nominal range" (a bell's overtone past half the sample
rate; fixed) and one Pixi deprecation, "addChild: Only Containers will be allowed to add children" (a damage number's high-ground arrow;
fixed, as is the same on a boss's warning tile; the same pattern remains in `Fx.immune`, a crossed-out chip added to its "Immune" label, left because its label's width places
the label: worth the same container). The ResizeObserver message ("loop completed with undelivered notifications") did not come in any
run here. It comes when an observer's callback changes the size of something observed in the same frame; the likely one is
`main.ts` `watchTopHud`, whose callback moves `#bossBar` and `#hudSpells`, both of which it observes. The browser reports it and then
delivers the rest next frame: it is harmless.

### 9. Old systems kept behind switches (low; what they cost)

Hidden by the owner's choice (`sim/hiddenModes.ts`), not removed:

| | Code in game.js | Art in game.js | Elsewhere |
|---|---|---|---|
| The Calamity (`cal*`, `tower*`, the sanctuary) | 122 KB | 2.8 MB | |
| The Last Stand (`stand*`) | 83 KB | 0.85 MB | |
| The Assault (`assault*`) | 381 KB | 0 | `assault-worker.js` 1.5 MB, 11 MB of `assault/` art files, all cached by the service worker |

About 4 MB of the 208 (2%); the Assault's 12.5 MB of files are cached on every web visit.

### 10. Dead and duplicate code (low)

- **Files:** of the 706 TypeScript files under `src/`, six are not in `game.js`: `assaultWorker.ts` (its own bundle), `sim/assault/holdTypes.ts`
  (types only), `render/campSpots.ts` (read by `tools/camp/prep.py`), `render/libraryLayout.ts` and `sim/tacticAdvice.ts` (only their tests
  and a tool read them: kept for those), and `render/calRealm.ts`, which nothing named: **removed**.
- **Exports:** 90 exports are named nowhere, not even in their own file beyond the export (for example `armiesView.ts` `crewOf`,
  `paintedButton.ts` `setMedal`, `setLit`, `choiceRow`, `shopView.ts` `openShop`, `render/juiceRules.ts` `killCallout`, `comboText`,
  `bannerMotion`, `ghostStep`, `sim/kits/front.ts` `shieldBash`, `braceSpears`, `martyrsVow`, `raiseRampart`). esbuild drops them, so they
  cost the player nothing; they are clutter. A further 141 are named only by tests or tools.
- **CSS:** all 63 sheets are in the page. Of 3,463 class names in them, 225 are named nowhere in the code; many are built from parts
  (`el-${element}`, `at-${slot}`), but some are plainly gone (`hmBig`, `hmPanel`, `hmCard`, `hmBuild`, `hrow`, `xprow` across five
  sheets, `ctCitadel*`). Worth a pass with a check like `css-orphans.test.ts`.
- **Art in `src/art` named by nothing:** 46 files (0.17 MB: the 18 `fx/magic` and 23 `fx/vfx` strips not used, five `calmap` nebulae and
  planets, `camp/sky.png`), none shipped (neither in `game.js` nor copied). Left for the art audit, as it touches `CREDITS.md`. 114 more
  (11 MB) are named only by tools (the `hero_res_*` sources, the loading paintings, inlined by `build.mjs`).
- **Duplicates:** two `loadImage`s (`render/loadImage.ts` and a private one in `summonFx.ts`); the "write only when it changes" helpers
  in `fightHud.ts` and now `decreeHud.ts`; two `clamp`s; the same start/stop/paint-once/visibility pattern in `camp.ts`, `hall.ts`,
  `tavern.ts`, `paintedTavern.ts` and `castle.ts`. The browser's second audio context is always "suspended".

### 11. The web build's service worker (low for the store app, which does not use it)

`sw.js` is network first: every request of an online visit fetches afresh and puts the answer in the cache again, `game.js` included (a
208 MB write to the cache on every online start). Offline start works once the worker has finished installing: 1,451 files, then an
offline start in 40 s here. Inside the app (`inApp()`) no worker is registered. **Recommendation:** for files whose name changes with
their content, or with the version (all but `index.html` and `sw.js`), cache first; at least skip the put when the cached copy is the same
version.

## What was fixed (each its own commit; looks and the fights' outcomes unchanged; nothing under `src/sim/`)

1. **The home screen's scenes hold still under a page over it** (`home.ts`, the rules in `homeMotionRules.ts`, `test/home-motion.test.ts`).
   Settings and the achievements, codex and armies page put a 97% opaque veil over the whole home screen; the camp (or the courtyard,
   tavern, library) under them drew sixty pictures a second. Now they stop as the page goes up and move again as it goes.
2. **The cue synth's frequencies held to half the sample rate** (`render/audioProcessors.ts`): the browser held them there anyway, with
   a warning each; the same sound.
3. **A damage number and its arrow ride a container** (`render/fx.ts`): the same place, scale and fade, no deprecation warning.
4. **The fight's HUD writes the same words only once** (`main.ts`, `fightHud.ts`, `decreeHud.ts`, `test/decree-writes.test.ts`).
5. **`render/calRealm.ts` removed** (nothing imported it).
6. **A boss's warning tile and its fill ride a container** (`render/bossFx.ts`): a Graphics with a Graphics child, the second Pixi
   deprecation (seen on wave 8's boss); the rim, the fill over it and the fade as before.

### Before and after

The same tool, the same seeds, `origin/main` (`out/before`) against this branch (`out/web`), 4x throttle, 8 s a screen:

| Screen | Before: main thread busy (style), animation frames asked a second | After |
|---|---|---|
| Home | 96.3% (1.7%), 160 | 96.1% (1.4%), 164 |
| Home, tab hidden | 27.5% (1.2%), 0 | 16.7% (1.2%), 0 |
| Recruit tab | 34.9% (1.4%), 183 | 34.3% (1.6%), 183 |
| Heroes tab | 45.0% (4.6%), 177 | 44.8% (5.2%), 177 |
| Castle tab | 56.2% (1.8%), 183 | 58.3% (2.3%), 183 |
| Spells tab | 25.8% (1.7%), 118 | 27.6% (2.0%), 120 |
| **Settings over the home screen** | **44.3% (1.6%), 173** | **12.7% (1.3%), 120** |
| **Armies page over the home screen** | **50.7% (1.5%), 183** | **14.3% (1.5%), 123** |
| Deploy | 53.6% (2.1%), 66 | 43.3% (1.5%), 65 |
| **A fight at x1** | **86.3% (45.4%), 21** | **68.9% (32.6%), 25** |
| A fight, tab hidden | 40.7% (3.7%), 0 | 36.9% (4.6%), 0 |
| Home after the run | 45.4% (1.7%), 85 | 43.9% (1.7%), 78 |
| Home after the run, hidden | 45.6% (2.9%), 0 | 53.6% (3.7%), 0 |
| **DOM writes in 5 s of a fight (of them the value already there)** | **337 (99)** | **348 (2)** |
| Heap MB, waves 1 to 10 | 450, 452, 456, 457, 459, 460, 460, 463, 462, 465 | 450, 453, 455, 457, 460, 460, 462, 463, 464, 463 |
| Pixi textures, waves 1 to 10 | 513, 731, 576, 602, 676, 633, 669, 590, 646, 607 | 529, 727, 576, 654, 667, 682, 676, 598, 600, 643 |
| Twenty openings of the menus: heap / DOM / listeners / observers / intervals | 473 to 466 MB / 1,889 / 79 / 25 / 5, no growth | 473 to 461 MB / 1,889 / 79 / 26 / 5, no growth |
| Console warnings (a menu sweep, ten waves; Playwright's own left out) | 8 (the oscillator warnings and a Pixi deprecation) | 2 after the first five fixes (the boss tile's deprecation); 0 after the sixth (a third run: Settings 12.3%, Armies 13.9%, a fight 63.4%, style 28.9%) |
| Address to home screen | 40.0 s | 38.5 s |

Reading it: the two fixed pages over the home screen drop to a quarter (what is left is the always-on loops of point 5). The fight's
style share falls from 45% to 33% and the no-op writes from 99 to 2; with SwiftShader drawing the board, its frames stay slow whatever
the page does, so the fight's own line is noisy (its frame rate was 3.7 and 4.5). The other rows move by a few points either way, which
is the noise between two runs of the same screen here (the home screen's hidden rows are the start-up warm-up's idle work, which runs
whenever it runs). The memory and textures over ten waves are the same: no leak before, none after.

## The proof

- `npm run typecheck`: clean.
- `npm test` (the full suite, on the branch before the boss tile's commit): 3,389 tests, 3,389 pass, 0 fail. After the boss tile's
  commit: `npm test -- boss-big ground-marks home-motion decree-writes hit-sparks battle-feel`, 35 pass. (A first full run showed 222
  "failures": two single-file runs started beside it emptied `out/test` under it. Not the code; run again alone, all pass.)
- `npm run web`: builds (`game.js` 208,045,632 bytes, 916 more than `main`'s: the comments).
- The before/after profiles: `node tools/release-audit/profile.mjs --root out/before --waves 10 --secs 8 --mut --json before.json`, the
  same for `out/web`, `node tools/release-audit/compare.mjs before.json after.json`.
- `node tools/release-audit/robust.mjs`: corrupt save (fresh save, the old one lost), old save (read), storage full (the run cannot
  start: `QuotaExceededError`), reload mid-fight (the run kept), offline start (works once the worker is installed; 40 s), a lost
  graphics context mid-fight (given back, the fight goes on), five seconds hidden (the fight goes on, the sound suspended meanwhile).
- Not run: a real phone, the soaks (`tools/freeze-fix/soak.mjs`, `tools/wave-delay/delays.mjs`), the balance tools (nothing under
  `src/sim/` changed).
