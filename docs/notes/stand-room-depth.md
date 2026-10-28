# Last Stand room depth

Owner approved the ornate four-room concept direction while keeping the king in the middle and the current combat layout. The requested 16:9 image is the concept presentation; gameplay retains the project's portrait layout.

Branch: `art/stand-room-depth`, worktree: `/workspace/legends-of-the-fall`. No merge or deployment requested.

The Last Stand renderer now uses taller rear walls, large stained-glass windows and bannered pilasters, detailed inner columns, broader gold-bordered carpet runners, room-specific stone tones, perimeter occlusion, cast/contact shadows and a baked warm-to-cool light gradient. Chapel glass casts longer coloured shafts. Library rear walls have two tiers of bookcases. Courtyard planting sits on the boundary walls, with a larger fountain and a paved central court. The background throne-room image is dimmed so it does not compete with the playable room.

The king, posts, blocked tiles, breaches, heights used by combat, pathfinding, rewards and saves are unchanged. Architectural height changes are visual only. Near walls remain cut down. New scenery and shadows are static; existing reduced-motion behaviour remains. All artwork is reused from the already bundled, credited Stand/castle packs; no remote asset dependency was added. Bookcases reuse the finer shelves cropped from the existing library wall painting, replacing the coarse Stand shelf sprites. The concept is an art-direction reference; this pass uses existing game artwork.

## Verification

- `npm run typecheck`: passed.
- `npm run web`: passed.
- `npm test -- stand no-flicker`: passed, four affected test files.
- `git diff --check`: passed.
- Browser captures: `tools/stand/depth-shots.mjs`, all four rooms at 393x852, 360x780 and 412x915, plus a live fight at each size and reduced motion at 393x852. Screenshots: `docs/samples/stand-depth-*.png`. No page errors.

The capture tool needs Playwright available to Node and a Chromium executable (`CHROMIUM_PATH`, default `/usr/bin/chromium`). In the managed environment, run with its supplied Node dependency directory in `NODE_PATH`. The older Stand screenshot libraries hard-code paths unavailable here; the new tool loads a seeded save once and caps the review browser to 5 FPS to avoid saturating software graphics. This cap is only in the capture tool. Real-phone performance has not been measured.

Ready for visual review; no release or version bump.
