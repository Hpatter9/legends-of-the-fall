# Four adult character redesigns

The owner approved the four-panel concept, then requested implementation for Kitsune, Gorgon, Illusionist and Time Witch. `docs/samples/seductress/approved-concept.png` is the proposal; `packed-preview.png` shows the implemented assets. The final costumes are more restrained than the proposal after the image service rejected the first atlas.

Design brief: clearly adult, glamorous versions of the existing heroes, fitted costume silhouettes, open shoulders and gold detailing, while retaining their identities. Kitsune uses crimson Japanese dress, fox ears/tail and fan; Gorgon uses emerald snake hair/tail, gold armour, purple drape and jade staff; Illusionist uses violet tricorn and coat, opaque leggings, gloves, wand and mirror; Time Witch uses silver hair, indigo gown/hat, clock jewellery and hourglass staff. Combat definitions remain unchanged.

Generated sources use 8 columns × 7 rows: four front poses followed by four rear poses per row. Rows are idle, walk 1–4, walk 5–8, attack, hurt, death and cast. The four final source atlases are included under `source/` so the next reviewer can repack them; hashes are in `sources.json`. They were generated with OpenAI image generation on 2026-10-28. The unsuccessful Gorgon exports with coloured backgrounds were discarded.

Repack from the repository root with `python tools/seductress/pack.py` (Pillow, NumPy, SciPy). The script extracts components, thresholds alpha, samples with nearest neighbour and writes the eight PNGs plus their layout dimensions. It selects intact walking poses for Kitsune/Illusionist idle where source first-row headwear meets the image edge. Rear Kitsune's last cast repeats the previous rear pose because the generated last frame turns forward. `packing.json` records every chosen source cell. No per-frame warping or procedural costume painting is used.

Validation:

```sh
npm run typecheck
npm run web
npm test -- resonance-facing hero-art hero-kits-looks
node tools/resonance/validate.cjs
node tools/seductress/checks.mjs
```

Browser checks require Playwright and Chromium. Set `PLAYWRIGHT_MODULE` to an installed Playwright package path when it is not installed in the repo. The browser script reviews the four portraits at 393×852, 360×780 and 412×915; verifies four facings and eight walking frames; captures combat, party and reduced-motion views; and checks offline reload at 393. It reuses the existing Resonance fixture. Screenshots and `checks.json` are saved under `docs/samples/seductress/browser/`.
