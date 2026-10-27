# Combat animation polish (FX-001)

The owner approved the effects concept and asked for implementation in the connected repository. This pass uses the game's existing credited Pixel Effects atlas and fighter textures to fit its pixel-art style. Branch: `feat/combat-animation-polish`; no version bump, merge or deployment.

- Fighters draw back, strike quickly and settle through a bounded presentation curve. The body and its rim move together; shadows, bars and simulation positions stay anchored. Reduced motion suppresses the added body movement.
- Melee impacts throw a small directional fan of sparks, with a warmer, larger fan for heavy hits. Counts follow the particle density and pool cap.
- Dashes leave four fading copies of the fighter's current pose, or two in battery saver. Reduced motion suppresses these copies. They share loaded textures and expire through the existing effect lifecycle, including clearing between battles.
- Standard spell wind-ups gain converging elemental motes timed to the existing release. Skills with a bespoke signature retain their own choreography.
- Last Stand level-ups gain a warm light pillar and delayed expanding ground wave alongside the existing burst and label.

No simulation, save keys, sound, asset credits or externally loaded resources changed. Existing pack textures stay bundled for offline use. Camera shake, flashes and hit-stop retain their existing settings. This pass adds no new simulation rules.

## Validation

Typecheck and the production build passed on the final renderer source. All seven focused files passed: motion, vfx, combat-fx, skill-fx, spectacle, no-flicker and summon-fx. Browser checks passed at 393×852, 360×780 and 412×915, plus reduced motion and battery saver at 393×852: four/two/zero dash silhouettes as expected, no page errors, unchanged battle state for the dash fixture, and no effects left after clearing. The full regression suite remains in progress; its existing simulation/balance tests take considerably longer than the focused renderer checks. No full-suite pass is claimed yet.

`tools/fxlab/polish-checks.mjs` uses the existing battle lab, captures impact, dash, cast and level-up examples at 393×852, 360×780 and 412×915, and checks reduced motion, battery saver, unchanged battle state for the injected dash effect, and effect cleanup. Screenshots and results go to ignored `out/fx-polish/`. Serve the production build on localhost:8000, set `PLAYWRIGHT_MODULE` if needed, and run the tool; `CHROMIUM_PATH` selects a system browser. Use `FX_CASE=393x852` (or another case tag) to refresh one case. These are controlled renderer fixtures, not a full playthrough. The fixture uses a seeded URL to bypass first-save starter selection and advances beyond the initial interpolation tick before freezing the pose.

Selected implemented screenshots: [dash](../samples/combat-polish-dash-393x852.png), [level-up](../samples/combat-polish-level-393x852.png). [Browser results](../samples/combat-polish-checks.json) record all five cases. The 393×852 samples were refreshed after advancing the frozen fixture beyond the initial interpolation tick.
