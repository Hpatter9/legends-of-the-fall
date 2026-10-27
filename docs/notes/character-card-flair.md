# Character card flair

The owner approved the side-by-side concept in the conversation and requested implementation. UI-002 updates the owned hero cards in the company roster with an ornate antique brass surround, folded class banners, larger pixel fighters, class-coloured atmospheric scenes, rank/awakening indicators and cloth level tabs. Mage cards have subtle drifting embers at steady brightness; reduced-motion settings disable them. The no-flicker regression caught an opacity pulse during validation; the animation now changes position only.

The displayed banner names are Guardian, Fighter, Mage, Shooter and Support. They map to the existing starter classes without changing hero rules. Search accepts both established class names and the new banner names. Hero names wrap across lines rather than being truncated. Rows leave clear space beneath the hanging level tabs. Level badges retain their milestone colours. Rank-up readiness stays visible.

The last unlocked hero viewed gets a gold surround and a check seal when returning to the roster. This is session-only viewing state, not party selection or new save data. Locked hero inspection does not change that marker. Existing hero details, equipment and navigation remain available. Awakened cards reuse the same look selection as the detail sheet.

## Assets and offline use

The brass surround is generated for this approved concept and credited in CREDITS.md. The characters, talent emblems and forest scenery reuse existing assets. The build automatically copies the new `src/art/ui/hero-brass-frame.png` into `out/web/ui` and includes it in the service worker's cache list. The forest backdrop was already cached; class icons are bundled into game.js. No external resources are needed.

## Validation

- Typecheck: passed.
- Web build: passed.
- Browser checks: passed at 360×780, 393×852 and 412×915, with no page errors. [Results](../samples/character-card-flair-checks.json).
- Full test set: all 103 test files passed across split runs. The initial `npm test` completed the first 51 files (including both long hero-balance simulations); its already-validated duplicate remainder was then stopped. Of the remaining 52 files, 29 passed in the parallel batch, the corrected no-flicker check passed separately, and all 22 affected files passed in the recovery batch. No tests or assertions were skipped or loosened.
- Validation recovery: a targeted `npm test -- no-flicker` rebuilt the shared test output directory and interrupted the parallel batch. All compiled tests were restored and all 22 affected files were rerun successfully. Future overlapping targeted runs should use separate output directories or run the existing compiled test directly.
- Final browser checks passed again after the steady-brightness fix at all three sizes; saved screenshots and results are from that final run.
- Documentation and source diff checks: passed.
- Targeted browser checks cover class search, opening a hero and returning, last-viewed state, card/ribbon fit and clearance between rows, long names, all five class styles, reduced motion and keyboard focus at 360×780, 393×852 and 412×915. Test-only inventories are created in the browser; player starting heroes are unchanged. The roster fixture opens Heroes directly to avoid competing with the animated camp during software WebGL checks.

The approved generated concept is a reference. Real browser screenshots of the implementation: [360×780](../samples/character-card-flair-360x780.png), [393×852](../samples/character-card-flair-393x852.png), [412×915](../samples/character-card-flair-412x915.png), and [long names at 360px](../samples/character-card-flair-long-names-360x780.png).

To reproduce, serve `out/web` on port 8000 and run `node tools/character-card-checks.mjs` with Playwright installed separately. `PLAYWRIGHT_MODULE` can select its module path and `CHROMIUM_PATH` can select an existing Chromium binary. Outputs go to `out/card-checks`.

## Handoff

Branch: `design/character-card-flair-mockup`; worktree: `/workspace/legends-of-the-fall`. Implementation is limited to roster markup/style, in-memory last-viewed state, artwork/credits, browser checks and these coordination notes. No simulation changes, merge, deployment or version bump. Ready for owner review with no technical blockers. The implementation was saved in `ca163a9b`; the follow-up commit records the steady-brightness correction and final validation. Owner acceptance of the implementation remains pending.
