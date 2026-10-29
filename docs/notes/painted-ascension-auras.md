# Painted ascension auras

Owner approved the [generated concept](../samples/painted-auras/approved-concept.png) and asked to apply that direction.
Branch: `art/painted-ascension-auras`. Owner: Codex. No merge, release or deployment requested.

The shared aura atlas now contains original generated painted effects for all 13 classes, both ascension levels and
all 80 named components. Each component has six generated animation frames, sampled smoothly at 96px. Class colours,
part counts, placement, glow, motion, reduced motion and battery-saver behaviour retain the existing aura rules.
No simulation, save or character artwork changes. Both Pixi and canvas renderers already support painted atlases;
the atlas remains bundled into `game.js`, including for offline play.

The generated source sheets follow the class rows in [the existing brief](awaken-auras-art-brief.md). The common
generation instructions specified a six-column transparent grid, one component per row, seamless motion, smooth
painted fantasy effects, bright cores and clear silhouettes, with richer second ascension parts. No characters or
backgrounds were requested. Original files remain unchanged in `/workspace/generated_images`; their paths and SHA-256
hashes are recorded in `tools/awaken/painted-sources.json`. Copies for repacking are kept in the ignored
`tools/awaken/painted/` directory. The shipped atlas is the versioned production artwork.

Repack from this workspace:

```sh
python3 tools/awaken/import-aura-art.py tools/awaken/painted 96 --generated-grid
```

`--generated-grid` cuts six columns and the known number of class rows, normalises the fixed-size generation canvas
to square shipping cells, and feathers cell boundaries to prevent seams. The original square-cell importer mode and
the former pack atlas builder remain available. This is mechanical slicing and packing; original paintings are retained.

Validation:

- `npm run typecheck`: passed.
- `npm test -- awaken ascension`: all four matching test files passed.
- `npm run web`: passed.
- Added atlas coverage for exact keys, six-frame strips, non-overlapping cells, smooth cell size, RGBA and mobile texture bounds.
- `tools/awaken/painted-checks.mjs`: passed at 393×852, 360×780 and 412×915, plus reduced motion and battery saver at
  393×852. All 480 frames are visible, animated and have transparent boundaries. All 26 class/step combinations were
  checked through the live Pixi renderer at 393×852; Wizard and Werewolf at both steps were also checked in the other
  four cases. Smooth texture filtering, stable reduced motion and unchanged battle state passed. Camp, roster and
  dossier captures cover the canvas renderer at every size/mode. No page errors.
- Offline reload passed at 393×852 after the service worker took control; the game booted while disconnected.
- `git diff --check`: passed. Browser tool syntax and Python compilation checks passed.

Review: [all classes and both steps](../samples/painted-auras/all-classes.jpg),
[portrait and accessibility captures](../samples/painted-auras/phone-review.jpg),
[camp](../samples/painted-auras/camp-393x852.png), [dossier](../samples/painted-auras/dossier-393x852.png),
[browser report](../samples/painted-auras/checks.json).
Raw captures stay in `out/painted-auras`; run `python3 tools/awaken/painted-contact.py` after the browser checks to rebuild
the compact review sheets. Set `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` for local browser installations if needed.

The review browser uses controlled awakened saves and deploy-board fixtures; these are actual renderer captures,
not campaign playthroughs. Physical-phone performance has not been measured.
