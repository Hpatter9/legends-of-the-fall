# Animated Shattered Crown loading screen

Owner: current Codex chat. Branch: `design/shattered-crown-loading`.

The owner selected option 4, the minimalist Shattered Crown, approved its full portrait concept and requested effects and animation. The new original source is `art-source/loading/shattered-crown.png` (851×1847); `src/art/loading/shattered-crown.webp` is the 258,842-byte runtime image. The generated painting has no baked-in title or loading bar. Live HTML preserves the status message and gameplay tip.

The poster has a slow depth drift, a breathing gold crown light, a soft sweeping crown gleam, two drifting cloud cutouts, two mist layers, 36 falling snowflakes, twelve rising gold flecks and a travelling indeterminate bar with a sheen. Both crown lighting effects are constrained by an alpha mask extracted from the gold ink, excluding the banners, clouds, fracture and landscape. The mask shares the poster’s sizing and depth transform so it stays aligned. The two cloud layers reuse ivory strokes lifted from the approved painting, moving at different speeds. Snow varies in size, speed and drift and fades away from the title and footer. The title stays still. The effects use CSS and disappear with the existing loading element, with no added timers or startup delays. Reduced motion stops every animation and hides moving embellishments. The obsolete loading beacon flicker was removed from alive.css.

The build embeds the poster, crown mask and cloud cutout into the cached HTML, preserving immediate display and offline play without another asset request. Existing startup, save keys and simulation remain unchanged. The owner approved the red banners and requested a PR and merge. Latest main 0.466.0 was integrated cleanly; this release is 0.467.0 with its matching Updates entry. Final PR/merge verification is pending. The temporary blue alternative was never applied.

## Validation

- `npm run typecheck` and `npm run web`: passed.
- `LOADING_SAMPLES=docs/samples/shattered-crown node tools/loading-check.mjs`: passed, actual Chromium at 393×852, 360×780 and 412×915; all screenshots visually inspected.
- Updated browser checks passed: 57 animations, crown mask excludes banners/clouds/landscape, two cloud layers, 36 flakes, advancing gleam/light/bar/cloud/snow timelines, moving mist and clean layouts. All three revised screenshots visually inspected.
- Reduced motion: zero running animations at all sizes.
- Actual seeded game startup: passed at all sizes, no page errors.
- Actual service-worker offline reload: passed; cached HTML contains embedded art. Rechecked with `LOADING_SAMPLES=docs/samples/shattered-crown node tools/loading-check.mjs --offline-only` after the three phone checks completed; DOM event waits were replaced by navigation commit plus the actual game-readiness signal to avoid asset-load timeouts in Chromium.
- `git diff --check`: passed. Simulation tests not run; no simulation changes.

Evidence and animation preview: [browser results](../samples/shattered-crown/checks.json), [standalone animated HTML](../samples/shattered-crown/preview.html), [MP4 with snowfall](../samples/shattered-crown/snowfall-preview.mp4), [GIF](../samples/shattered-crown/preview.gif). Preview HTML deliberately holds the loading screen indefinitely; production removes it as soon as startup finishes. The ten-second clip/GIF samples the real CSS animations in Chromium at eight frames per second. Production animation runs at the browser's normal refresh rate.

The original illustrated king-and-guard asset remains available. Art direction prompt: [Shattered Crown art](shattered-crown-art-prompts.md).

## Rebuilding effect layers and previews

`python3 tools/shattered-crown-layers.py` derives `crown-mask.png` and `crown-clouds.webp` from the runtime poster, without repainting it. Run `npm run web`, then `node tools/shattered-crown-preview.mjs` to refresh the standalone HTML, MP4 and GIF. The preview tool decodes every image before capturing the CSS timelines.
