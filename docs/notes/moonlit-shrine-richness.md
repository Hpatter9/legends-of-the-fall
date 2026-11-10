# A more distinctive Moonlit Shrine

**Whole-map follow-up:** [Regional detail pass](moonlit-shrine-map-detail.md) extends the treatment to woods, ruins, shoreline, perimeter and reserve camp.

Owner requested a more interesting result, like the Orc hold's refinement. This continues `art/moonlit-shrine-completion` and preserves the original ten-sheet implementation and its review captures.

## What changed

- Repainted the main shrine with a clear crescent crown, broad swept eaves, gold fox guardians, a white kitsune-mask entrance and a moon-lit doorway. This follows the Orc pass's stronger silhouette and faction identity while retaining the shrine's approved palette. Its source cell, 6×4 footprint metadata, anchor, production packing and in-game scale are unchanged; raw initial and revised paintings are both retained. [Prompt](moonlit-shrine-richness-art-prompts.md).
- The three existing longhouse plots now show two fox shrines and a lantern garden. Their 2×2 source footprints fit within the existing 3×2/2×3 solid plots.
- A moon pavilion and a waterfall island occupy two flat 3×3 patches of deep pond water, with floating lamps, koi and lilies nearby. The bridge and the shallow fords remain clear.
- Blossom trees, bamboo, wind-shaped pines, fox statues, sake barrels, weapon racks and violet spirit fires replace generic dressing in the shrine grounds. Paired paper lanterns pick out the paved approach.
- Small Japanese lanterns replace the borrowed tall gothic lamps around the keep, leaving its silhouette readable.

`src/render/moonlitDressing.ts` contains the bounded, deterministic, shrine-only placement changes; `placementsOf` invokes it only for `yokai`. No simulation tiles, routes, hazards, fort state or save fields change. Existing destructible placements retain their fort/hut associations. The two large water additions check all nine tiles for equal-height deep water before placement. No new runtime URLs are introduced.

## Validation

- `tools/moonlit-shrine/check.py`: all ten source sheets and 63 unique standing sprites pass canvas/cell/anchor checks. The revised keep retains its source grid; no new-sheet cutter warnings.
- `npm run typecheck` and `npm run web`: passed after the final shrine recut.
- Focused tests: `assault-shrine-dressing`, `assault-looks`, `assault-shrine` and `assault-render` all passed. The new checks verify deterministic placements, full board/map immutability, valid atlas names, retained forts, deep-water footprint fit and isolation from the Orc hold.
- 24 controlled scene captures at 393×852, 360×780 and 412×915: keep, approach, fox shrine, garden, pond, pavilion, waterfall and camp. Reduced motion exercised at 412. After the final shrine repaint, all three keep views were captured again. No page errors, failed requests or page overflow. This is an art/layout check, not a phone performance benchmark or full campaign playthrough.
- The five existing atlas URLs remain in the built offline cache manifest; actual disconnected reload was not exercised.

[Before/after keep](../samples/moonlit-shrine-rich/keep-comparison.jpg) · [Scene review](../samples/moonlit-shrine-rich/scene-review.jpg) · [Browser results](../samples/moonlit-shrine-rich/browser-results.json) · [Pavilion](../samples/moonlit-shrine-rich/pavilion-393.jpg) · [Waterfall](../samples/moonlit-shrine-rich/waterfall-393.jpg).

Complete locally for review; no version bump, merge or deployment. Some shared camp/kit art intentionally remains, and the original known sheet-01/Orc fallback cutter warnings are unchanged.
