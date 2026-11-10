# Moonlit Shrine completion

**Visual follow-up:** [A more distinctive shrine](moonlit-shrine-richness.md) adds the later moon-and-fox keep repaint and shrine-specific landmark placement. This note records the initial ten-sheet pass.

Branch: `art/moonlit-shrine-completion`. Owner approved the shrine direction, required all assets to fit the grid and requested continuation.

## Result

Completed source sheets 04–13: wall/cliff faces, ground, transitions, shrine/seat/banner, wall dressing, landmarks, props, ruins, pond and decals. Existing sheets 01–03 remain unchanged. Raw generated paintings, layout-repaired selections and hashes are retained alongside packed PNGs under `art-source/assault/yokai/`. The original briefs remain in [the prompts](assault-4-moonlit-shrine-art-prompts.md).

`tools/moonlit-shrine/pack.py` places the art into the cutter's actual cell layouts with uniform scaling and explicit anchors. Sheets 08–12 use the hold-specific layouts, not the Orc layouts. Repairs to sheets 07, 08, 10 and 12 give complete silhouettes before packing. `check.py` checks exact canvases, occupied cells, sprite bounds and anchors, transparent face bands and all 63 unique new standing sprites; it also generates footprint diagrams. The two 3×3 landmarks intentionally meet the bottom cell boundary at their footprint's front tip, as required by the existing cutter.

Rebuilt the five production atlases and `assaultYokaiAtlas.ts`. The cutter's explicit `--reuse-kits` option preserves the shipped kit sprites when private kit source files are absent. All 62 kit sprites retain their dimensions, anchors and footprints. The WebP encoder may change compressed colours on recut; PNG/raw sources remain lossless. Credits are updated.

## Validation

- Source packing and grid checker passed for all ten sheets and 63 unique standing sprites. All six footprint contact pages inspected.
- Cutter report: no warnings for new sheets 04–13. Existing sheet 01's gate-post warning and inherited Orc fallback/siege warnings remain; see [report](../samples/moonlit-shrine/cutter-report.txt).
- `npm run typecheck` and `npm run web` passed.
- `npm test -- assault`: all 32 test files passed, no failures or skips.
- 15 controlled shipping-renderer views passed at 393×852, 360×780 and 412×915 (keep, south gate, pond, drum, camp), including reduced motion at 412. No page errors, failed requests or page overflow. Screenshots inspected for placement; these are controlled views, not a full campaign playthrough or performance benchmark.
- The five rebuilt atlases retain the existing URLs and are present in the built service-worker cache manifest. Actual disconnected reload was not exercised in this pass.

[Browser results](../samples/moonlit-shrine/browser-results.json) · [Grid checks](../samples/moonlit-shrine/grid-checks.json) · [Kit preservation](../samples/moonlit-shrine/kit-preservation.json) · [Shrine in game](../samples/moonlit-shrine/keep-393.jpg) · [Pond](../samples/moonlit-shrine/pond-412.jpg) · [Footprints](../samples/moonlit-shrine/footprints-1.jpg).

Complete locally for review. Gameplay, saves, renderer scaling, version and deployment are unchanged. Slots not represented in the hold's own layouts still use the existing Orc fallback assets, including shared siege equipment; this pass does not replace those intentionally shared pieces.
