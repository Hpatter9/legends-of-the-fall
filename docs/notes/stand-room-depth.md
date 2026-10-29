# Last Stand room artwork

Branch: `art/stand-room-depth`, worktree: `/workspace/legends-of-the-fall`. Owner requested a PR; no release or deployment requested.

The owner approved the ornate four-room concept with the king at the centre and the current combat layout. The first pass reused the existing game art; the owner rejected that look as lacking and explicitly requested replacement artwork. The 16:9 request applies to the concept presentation; gameplay retains the project's portrait layout.

## Replacement artwork

Seventeen new bundled pieces now replace the coarse room materials and primary scenery: carved heraldic columns, Gothic stained glass, wooden bookcases, braziers, a tiered fountain, rose-covered arcades, reading desks, rubble, a compass medallion, limestone, paving, masonry, embroidered velvet, lawn, rose planters, ivy and banners. Original production atlases are in `tools/stand/generated/`; `cut-ornate.py` extracts, trims and downsamples the sprites. Credits and source hashes are recorded in `CREDITS.md` and `src/art/stand/ornate/provenance.json`.

The renderer uses complete carved columns on the actual blocked tiles, full bookcase bays instead of a cropped old wall painting, matching wall materials, courtyard arcade frames and garden art, and a floor-plane medallion in the chapel/library nave. Larger-scale stone and grass textures span neighbouring tiles, avoiding the old checkerboard. Broad velvet runners retain gilt edges, with contact/cast shadows and warm central light over cool room edges. The backdrop remains dimmed.

The existing well, lamps, stores, smoke and dust remain credited game assets. The new fire and water are painted sprite artwork; the existing torch glow breathes, while the fountain is static. This is an integrated game asset pass using the approved concept's direction, not a pasted illustration behind the combat.

## Selected ruler and current main

The initial checkout was 0.197.0. The owner pointed to the implemented Options king selector; fetching main located it in 0.202.0. Current main 0.204.0 was integrated, preserving its eight-ruler Settings selection, shared ruler atlases/thrones, action reactions, ruler labels and the newer idle-hero assistance rules. The room changes were preserved when resolving the renderer conflict; both task-board entries were retained. Room work is STAND-005 to avoid colliding with main's STAND-004 assistance task.

The king/queen remains in the middle. Last Stand reads the actual Settings choice, including switching ruler while the room is open. No second selection or new appearance save key was introduced. All eight choices were exercised through the real Options UI, checking the ruler label and that eight distinct atlases reached the Last Stand sprite.

Before opening the requested PR, main 0.213.0 was integrated. Its ninth/default ruler (The King), ruler picker modal and stable castle thrones remain intact. Last Stand keeps the owner-requested standing pose and separate rear throne. The browser checks now exercise all nine current Options choices.

## Standing ruler and defence

The owner's follow-up: the ruler need not sit, should help fight if needed, and may have the throne behind them. Last Stand now uses the chosen ruler's standing idle/strike/cast/hurt/fall rows, with their separate empty throne at the reserved tile diagonally behind the centre. The throne remains visible throughout, while the castle tab keeps its existing seated presentation.

The ruler guards the centre and strikes visible adjacent foes using the normal wind-up, damage, cooldown and kill-reward paths. Base attack is 24, melee range one tile and attack interval 1500 ms, shared by all nine appearances and using the existing castle/relic modifiers. The ruler does not chase, even when the final-foe hunt is active. Health, failure condition, hero posts and saves remain unchanged. A swing event drives the standing strike animation; the wave-clear flourish uses a standing cast pose.

`test/stand-ruler.test.ts` covers actual damage, no pursuit, cooldown/wind-up, hidden/charmed targeting, determinism and a finishing blow's run credit/payment. The earlier stationary-objective test was renamed to reflect the authorised ability to strike. The browser tool checks standing idle, a visible rear throne, all nine appearances and a real adjacent enemy causing a strike pose, damage and return to idle. `tools/rulers/check.mjs` now expects standing idle on returning from a Last Stand action.

## Verification

- `npm run typecheck`: passed.
- `npm run web`: passed on main 0.213.0 plus this branch's room work.
- `npm test -- stand rulers settings no-flicker`: passed, eight affected test files on main 0.213.0, including ruler finishing-blow coverage.
- `git diff --check`: passed.
- Browser captures: `tools/stand/depth-shots.mjs`, all four rooms and a live fight at 393x852, 360x780 and 412x915; reduced motion at 393x852; all nine current Options selections. No page errors. The final courtyard crop removes transparent atlas padding that produced black lawn seams. `tools/stand/depth-preview.mjs` lays out the real captures in a 16:9 review image (`docs/samples/stand-depth-preview.png`). Final screenshots: `docs/samples/stand-depth-*.png`, including `stand-depth-selected-ruler-393x852.png` and `stand-depth-ruler-defence-393x852.png`.

The capture tool needs Playwright available to Node and a Chromium executable (`CHROMIUM_PATH`, default `/usr/bin/chromium`). In the managed environment, use the supplied Node dependency directory in `NODE_PATH`. The review browser is capped to 5 FPS for software graphics; the game itself is not capped by this change. Real-phone performance has not been measured.

All new runtime art is imported and embedded in the game bundle, preserving offline asset delivery. The only new combat rule is stationary ruler self-defence; reward formulas and save keys are unchanged. Ready for visual review; no release version bump or deployment.
