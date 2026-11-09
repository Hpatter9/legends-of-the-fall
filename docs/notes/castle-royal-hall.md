# Approved royal hall, resumed

The owner approved the stone-hall concept and requested implementation and merge in the original chat, then renewed that request on 2026-11-09. That chat stopped at its usage limit after a browser assertion labelled “Duchess loaded”. Its `art/castle-royal-hall` branch and generated sources were never pushed and are unavailable in this checkout.

Current main already includes the newer courtyard/card Castle tab (0.437.0) and Developer shortcut move (0.438.0). This change completes the approved **throne hall** inside that layout. The courtyard and building paintings remain the separately documented art handoff in `castle-remake.md`; this release does not claim those stand-ins are final paintings.

## Implementation

- New empty architectural painting in `art-source/castle-remake/throne-hall.png`, recreated from the approved deep stone hall direction: raised dais, crimson carpet, cool stained glass, warm braziers. No ruler, chair, guards or goat baked into the background. Prompt: `castle-royal-hall-art-prompts.md`.
- Packed by the existing `python3 tools/castle-remake/cut.py`; `manifest.json` activates `throne-hall` through the existing loader, build and offline cache. Other castle art names retain their current state. Credits updated.
- Live ruler and four strongest guards positioned on the dais/steps and floor. Drawing and hit targets share the same coordinates. Trophies remain accessible through both the header and right alcove.
- Warm embers, banner masks and window light aligned with the retained painting. Removed the broad gold wash over the architecture; existing tap celebrations remain.
- Duchess now loads once in the constructor and initialises without waiting for an animation frame. The browser check verifies her actual canvas image/state, rather than expecting a separate DOM image. Hops, daily haystack treat and save persistence are exercised by taps.
- The scene canvas uses normal image rendering at phone scale for the painted background. Existing sprite drawing, save keys, castle rules and simulation are preserved.

## Validation and release

Branch: `art/castle-royal-hall-finish`; base: main 0.438.0 (`a23846ec`). Owner-authorised release prepared as 0.439.0 with matching Updates entry.

- `npm run typecheck`, `npm run web`.
- `npm test -- castle rulers duchess rooms ui-standard ambient updates` (115 affected tests).
- `node tools/castle/royal-hall-checks.mjs`: 393×852, 360×780 and 412×915; the last uses reduced motion, 360 uses the Frost Witch and the others Iron Stag. Checks live art readiness, ruler decree, guard salute, Duchess hop, haystack reward persistence, trophy wall, building card, portrait fit and browser errors. 393 also reloads offline through the real service worker.
- Retained screenshots and machine-readable results: `docs/samples/royal-hall/`.

Final validation passed: typecheck, production web build and all 115 affected tests. All three portrait browser runs passed, including the Frost Witch, reduced motion, every interaction above and 393px offline reload; zero page errors and no portrait overflow. All three hall screenshots and the narrow building card were visually inspected. Ready for the owner-authorised PR merge.
