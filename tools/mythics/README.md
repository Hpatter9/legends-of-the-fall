# Mythic production assets and review

From the repository root:

```sh
python3 tools/mythics/pack.py
python3 tools/mythics/validate.py
npm run typecheck
npm test -- mythic-heroes hero-kits-all secret-heroes one-of-each traits.test awaken.test
npm run web
node tools/mythics/checks.mjs
```

Packing reuses the existing hero component extractor: no recolouring, procedural
redrawing or invented poses. Sources are retained in `art-source/mythics` and
packed outputs are documented in `docs/samples/mythics/packing.json`. Pixel
atlases contain seven rows and eight columns (four front/four rear): idle,
walk A, walk B, attack, hurt, death, ability. Paired views share one scale.
The tavern export uses a firmer alpha threshold to exclude diffuse shadows.

Browser review requires Playwright and `/usr/bin/chromium`, and serves the actual
production build in an isolated browser context. Its fixture never enters the
production bundle or touches the owner's save. It compares each Mythic alongside
four existing heroes at all three required phone sizes, checks real texture
frames/facings, portraits, combat, reduced motion, party refusal and offline use.

`trials.ts` is a bounded, seeded reachability sample for only the five new trials.
Bundle it with esbuild for Node (PNG/WebP loaders `empty`) and execute the result
from the repository root. It writes `docs/samples/mythics/trials.json`; the build
and limitations of the sample are recorded there and in the handoff.
