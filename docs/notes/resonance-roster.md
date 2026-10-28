# ART-002 — full roster and four facings

The approved Resonance inspired pixel artwork now covers all 45 collectible heroes. Each has separately drawn front and rear animation sheets, mirrored for the four isometric directions. All four facings follow section rotation. Walking uses eight contact/down/passing/lift poses with alternating legs, timed to tile movement progress. Flat-ground bounce is reduced to keep footfalls grounded; climbs retain their height movement. Mounted, serpent and floating characters use appropriate movement.

Branch: `art/resonance-roster`. The two-hero pilot was merged in PR #144. This follow-up integrates main through 0.190.0 without changing its version, combat values, identities or save keys. Main's awakened class auras remain in place; awakening does not switch to the unused red Werewolf art.

The 50 front/rear pairs include five supporting appearances: Werewolf Brute, the unused red variant, and three Treants. Werewolf and Druid transformation look IDs resolve to the new art. Foe disguises retain their borrowed enemy art. Promotion grades keep their existing size/effect progression, using the new character design. Menu portraits stay front-facing; battle sprites have all four facings.

## Artwork and packing

Production PNGs, layout metadata, prompts, packing tools and visual evidence are committed. Raw generated intermediates remain locally in `tools/resonance/source/roster`, `turning` and `walk`, ignored to avoid hundreds of megabytes in Git. `roster.json` contains 43 designs; `variants.json` contains five supporting forms. Pilot sources remain in `source/soldier.png` and `archer.png`.

Repacking order (requires the local sources):

```sh
node tools/resonance/pack-roster.cjs
node tools/resonance/pack-turning.cjs
node tools/resonance/pack-walk.cjs
node tools/resonance/repair-poses.cjs
node tools/resonance/trim.cjs
node tools/resonance/apply.cjs
```

Eight walk frames span two physical rows; `_walk` reserves the continuation. Battle and small-rig frame selection both wrap correctly. Seven action sequences with overlapping source actors use selected intact attack/cast poses and idle recovery, recorded in `pose-selection.json`. The walking sources have no touching-component warnings. Symmetric transparent trimming preserves paired frame centres and foot anchors. Decoded atlas footprint fell from 393.75 to 187.36 MiB (52.4%); this is texture geometry, not a real-phone peak-memory measurement. Only currently required unit sheets and their rear views are loaded.

## Validation

- `npm run typecheck`, `npm run web`: passed after integrating main.
- `npm test -- resonance-facing hero-art awaken class-heroes monster-heroes new-heroes more-heroes hero-kits-looks hero-kits-all party`: all 11 selected test files passed.
- `node tools/resonance/validate.cjs`: all 2,800 animation cells bounded and nonempty, hard alpha, 50 matched pairs, 100 eight-frame walk clips (800 frames), no outstanding death-pose reviews.
- Ten walk contact sheets reviewed for all heroes/forms; the Soldier/Archer four-facing GIF contains eight frames at 80 ms per frame.
- Browser checks passed at 393×852, 360×780 and 412×915 with no console/page errors: 45 portraits at 393, nine representative portraits at each other size; 1,760 actual sprite facing/frame checks; five transformation aliases; combat, party and reduced motion at each size; offline reload at 393. Screenshots: `docs/samples/resonance-roster/browser/`; final results recorded in `checks.json` by `tools/resonance/roster-checks.mjs`. Browser validation uses localhost because the game deliberately registers its service worker only for HTTPS or localhost.

No merge or deployment performed. Real-phone frame rate and peak GPU memory remain unmeasured.
