# Deploy zoom, and the deploy bar's earned helpers (DEPLOY-ZOOM)

The owner's asks: "At the beginning of every wave, zoom in on the hero placement box for easy placement." and (changing an earlier "get rid
of the auto place button for now") "Actually, let's have the auto merge unlock after defeating the second army, and auto place unlock after
defeating the 4th army."

## The deploy zoom

`src/render/deployCam.ts` (pure, tested in `test/deployCam.test.ts`), hooked into `src/main.ts` (`deployFrame`, `deployEase`, `focus`).

- **The box.** `deployBox(tops)` is the box round every tile a hero may be placed on (the near `DEPLOY_ROWS` rows, `isDeployTile`, and
  `standable`: the same tiles the deploy marks light), with `DEPLOY_PAD` round it: 10 world px at the sides, 58 above (the heroes standing on
  the far row, their heads and bars) and 14 below. The tile tops come from `at`, so a turned long-map section is framed as it is drawn.
- **The zoom.** `deployView(box, w, h, base, lo, hi)` frames that box in the board's room as close as fits (`viewFor` from
  `cameraRules.ts`), up to `DEPLOY_MAX_K` (2.2 screen px a world px) and the free camera's own most; a box too big for the room (a very wide
  board) is framed whole, down to the free camera's least. On the usual 8 x 11 board upright the rows come out at about 1.8-2.2x the old
  deploy view (screen scale about 0.58 → 1.0-1.25), filling the width.
- **When.** A new wave's deploy (`newBattle`: wave 1, every wave after the march, a Calamity or Rift arena, a boss wave, a daily) starts at
  the old view (zoom 1) centred on the rows, and `deployEase` eases the zoom in each frame (`easeTo`, `EASE_ZOOM_MS`). With reduced motion
  it is a cut. The march (`chain.active`), a boss intro, the destination reveal and the look along the road (`survey`) keep the camera while
  they run; the deploy zoom takes over after. A resize keeps the zoom and re-centres.
- **The free camera.** A pan in the deploy now makes the camera the player's (`takeCam`, as a pan or pinch in a fight already did, and a
  pinch or wheel in the deploy already did), so the close view never pulls back a player who has looked away. The next wave frames afresh.
- **Fight!** `begin` keeps the deploy's view through its `layout()` (unless motion is reduced), so the fight camera (`follow`) eases out
  from the close view to its own framing instead of jumping.
- The Rift arenas used to frame the board's middle in the deploy; they now frame their placement rows like every other board.
- **The Last Stand** has no placement rows (its heroes guard posts round the king and are swapped in the tray), and its own camera
  (`standView.ts`, `standCam.ts`) already opens on the king; it is unchanged.

## Auto merge and Auto place, earned

`src/sim/featureUnlocks.ts` (pure, tested in `test/featureUnlocks.test.ts`).

- `autoMergeOpen(meta)`: the second army (`ARMIES[1]`) has been beaten (`armyCleared`); `autoPlaceOpen(meta)`: the fourth (`ARMIES[3]`).
  Opened but unbeaten armies (`Meta.opened`) do not count. A save that has already beaten them has the buttons at once.
- Until then the **Auto merge · N** pill (`#mergeAll`) and the deploy bar's **✦ Auto** (`#auto`) are hidden (`refresh` in `main.ts`; their
  click handlers check too). Merging is by hand: drag a hero onto its match, or tap one then the other. With Auto hidden the bar is Hire, Pack
  and Home under Fight!, the three sharing the row (`#auto[hidden]` in `pixel.css`, which had forced `display: inline-flex`).
- The unlocking is told once, as a toast on the next deploy screen (`tellUnlocks`, `toastLines` in `achievementsView.ts`): "Auto merge
  unlocked · merge every pair ready with one tap" and "Auto place unlocked · set your heroes out with one tap". `Meta.featuresTold`
  (optional; read safely in `loadMeta`) keeps which have been told. A save from before that has already beaten the armies is told once too.
- The deploy tip (`tips.ts` `summon`) now says merging is by hand and Auto merge comes with the second army.
- **Unchanged:** the sim's `autoDeploy` and `autoMerge`, the auto-replay (which uses `autoArrange` for cleared armies only), the Last
  Stand's own Auto-place in its tray, and the hero bar's in-fight AUTO switch for ultimates.
- **Balance:** the tools (`tools/balance.ts`, `tools/autoplay.ts`, `autoRound`) still model a player who taps Auto merge and Auto from the
  start. Before the second army a real player now merges by hand: the same merges, only done by hand, so the numbers stand.

## Checks

`tools/deploy-zoom/shots.mjs` writes `docs/samples/deploy-zoom-*.png` at 393x852, 360x780 and 412x915: wave 1 on a new save (both helpers
locked), the notice and wave 6 with the first four armies beaten (both shown), the fight after Fight!, and a Calamity (Rift) arena.
