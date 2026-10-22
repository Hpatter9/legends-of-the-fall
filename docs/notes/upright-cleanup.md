## Upright cleanup and phone audit

### The cleanup
- Every `@media (orientation: landscape)` block is gone from `src/index.html` and `src/pixel.css` (only `#turnUp`'s own rule stays), and so is the
  short-screen (`max-height: 500px`) party block. The `@media (orientation: portrait)` blocks are now plain rules, in the same order, so the
  cascade is unchanged (and a wide desktop window gets the upright rules, which it did not before).
- `main.ts` (`layout`, the boss card's portrait size, the camera area) has no sideways branch; the tavern always draws its room at 3x; the
  sideways case in `test/tips.test.ts` is removed (the bubble placer itself is unchanged).
- **Desktop**: the page is a phone-width column (`body { max-width: 480px; margin: 0 auto; transform: translateZ(0) }`, so the fixed layers fill
  the column) on a dark backdrop. `src/viewport.ts` has `viewW()` / `viewH()` / `colLeft()`; Pixi sizes itself to `#stage`, pointer and box
  positions that meet the board subtract `colLeft()`, and the CSS `vw` units use `--vw: min(1vw, 4.8px)` so they stop growing past the column.
  Samples: `docs/samples/upright-desktop*.png` (1280x800).
- **Size** (`npm run web`, before -> after): `index.html` 93,760 -> 89,931 bytes (-3,829); `game.js` 9,814,079 -> 9,814,812 (+733: the viewport
  helpers and the tavern's bubble cache outweigh the few sideways lines in the script, which were small). Net -3.1 KB, nearly all CSS.

### Audit tools (`tools/audit/`)
`perf.mjs` (frame times), `profile.mjs` (CPU profile), `offline.mjs`, `battery.mjs`, `shots.mjs`. They use the Playwright in `/opt/node-tools` and the Chromium in
`/opt/pw-browsers`, and serve `out/web`.

### Performance (393x852, CPU throttled 4x, 10 s per scene)
Headless Chromium draws with a *software* GL and compositor, so the elapsed frame time (average / 95th / worst, ms) is dominated by rasterising,
not by the game's code, and is far worse than a phone's GPU. A static fight board with nothing moving already takes ~76 ms here. So the
table also gives `cpu`: the page's script + layout + style time per frame at 4x, which a phone would also pay (the budget is 16.7 ms at 4x, i.e. 4.2 ms
at full speed). Page at device pixel ratio 1; the "before" build is the commit this branch started from.

| scene | before: avg / p95 / worst | before cpu | after: avg / p95 / worst | after cpu |
| --- | --- | --- | --- | --- |
| castle square | 56.8 / 66.7 / 83.4 | 12.5 | 22.9 / 33.4 / 50.0 | 7.3 |
| tavern, 25 heroes | 85.3 / 100.1 / 116.8 | 24.9 | 43.4 / 66.6 / 66.8 | 18.2 |
| home (battle tab) | 49.3 / 66.7 / 83.4 | 9.3 | 16.8 / 16.8 / 33.4 | 4.8 |
| boss fight, 5 grade-3 heroes, spells and ultimates | 92.1 / 116.7 / 150.1 | 20.9 | 88-124 / 116-150 / 150-183 (run to run) | 21.8 |

(The game's squad is at most five heroes, so "10 heroes" was not possible: the fight is the five strongest against the Orc Warlord's boss wave, with
all three spells cast every two seconds.)

What was fixed, in order of effect:
1. **The board kept drawing under the home screen** (the Pixi ticker ran at full rate behind the opaque home page, the tavern and the castle). Now the
   stage is not drawn while home is up, and a board that is not in a fight stops its ticker (it restarts when home closes; tips on the home page are looked
   after by a 250 ms timer). This is the big one: home 49 -> 17 ms, castle 57 -> 23 ms, and it saves the battery, not just the frame.
2. **The tavern** redrew the whole 1152x888 room every frame. It now repaints only the part on the screen, draws each speech bubble from a cached canvas
   (a bubble was ~100 one-pixel `fillRect`s; the room made ~210 `fillRect`s a frame) and flips heroes with `setTransform` instead of `save`/`restore`.
3. Checked and left: the hero colour filters (switching them off changed nothing measurable), text and allocations (GC under 1%).

Not fixed, and a call for the owner: the fight's cost on a phone is GPU fill, and the Pixi canvas uses a resolution of up to 3 (`main.ts`,
`resolution: Math.min(3, devicePixelRatio)`). Capping it at 2 (battery saver only, if you want the look kept) would cut the pixels drawn by more than half. I did not
change it since it changes how the art looks. The fight's script time is 4.9 ms a frame at full speed, inside the budget.

### Offline (`tools/audit/offline.mjs`)
Built, served, loaded once online while touring all five tabs, a fight, the armies screen and the sound; then `setOffline(true)`, reload, and the same tour.
Result: no failed requests, no page errors, the three fonts report loaded, both music tracks reach `readyState` 4 from the cache, the fight runs, the
armies screen lists its seven armies. Every file in `out/web` (except the `.map`) is in the service worker's `FILES`, and nothing the tour asked for was
missing from the cache. No change needed.

### Battery (`tools/audit/battery.mjs`, saver on)
- The saver caps every scene at 30 frames a second: Pixi `maxFPS` 30, the tavern and castle canvases ~30/s on a 60 Hz page. (The setting is applied at
  start-up, not only on change.) The recruit page and the summoning cards are CSS animations with no script loop; the page draws nothing while they play.
- The tavern and the castle halt on `visibilitychange` (no draws while hidden); the browser itself stops animation frames for a hidden page, which stops Pixi.
  (Headless Chromium cannot truly hide a page, so the hidden case was checked by firing the event.)
- The screen wake lock: 0 held on the home screen and while deploying, 1 in a fight, 0 again once the fight is won.
- One gap left alone: leaving a fight for the home screen mid-fight (the Home button) does not release the lock until the fight ends. It is a few
  lines in `main.ts` if the owner wants it.
