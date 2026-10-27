# Painted battle effects (FX-002)

The owner approved the cinematic fantasy proposal on 2026-10-27: textured magic, luminous trails and dramatic finishers, with non-pixel artwork permitted. Implemented on `design/battle-effects-remake` in `/workspace/legends-of-the-fall`. Owner: Codex. Ready for owner review; no merge, release version bump or deployment.

## Implementation

Thirty-two original painted shapes in two transparent atlases replace the combat loaders' enlarged pixel strips. The existing element/family vocabulary, skill signatures and cast timings now select shared painted materials. Fire, ice, lightning, earth, blood, forest and poison use distinct impact silhouettes. The accent atlas supplies arrows, bone darts, hearts, water ripples and splashes, impact sparks, dust, dash trails, soul wisps, flame rings, vines, runes and novas.

`cinematicRules.ts` owns the pure material catalogue, ten elemental palettes and motion envelopes. `cinematicArt.ts` prepares reusable 128px surfaces with a logical 32px footprint, linear filtering and feathered cell borders. Native painted colour is retained; other elemental variants preserve luminance and pale hot cores. Continuous expansion, sweep, drift, stretch, rotation and fade follow the battle clock. The six-slot arrays retain existing strip lifetimes; they share a painted texture rather than storing six duplicate GPU images. Sources and materials are cached and reused between battles.

Weapon arcs are larger. Projectile artwork faces its flight direction, and falling meteors point towards their landing. Big paintings use normal blending to preserve flame, smoke and crystal detail; small sparks add light. Shields remain translucent and persistent statuses hold their opacity instead of vanishing at a strip boundary. Promotions use a softer painted pillar; traps use the painted snare rune. The particle pool now resets size at spawn, including reused sprites, and safely ignores empty strips.

All skills, ultimates, king's spells, status overlays, death bursts, movement/terrain particles, boss entrances, combos and promotions use the new materials through their shared loaders. The party tableau also inherits painted effects because it reads the same VFX catalogue. Character sprites, signature props, health bars, damage labels, tactical tile markers and the existing lightning/thread geometry retain their roles. Sound, simulation, save format, version and gameplay rules are unchanged. The new atlases are bundled as data URLs in `game.js`, already cached by the service worker; no new external resource is required.

Reduced motion keeps painted silhouettes steady while preserving readable cast/impact cues and fades. Existing shake/camera/hit-stop preferences remain in force. Battery saver retains half particle density and its lower cap.

## Validation

- `npm run typecheck` passed.
- `npm test -- cinematic-fx combat-fx skill-fx signatures spectacle vfx motion no-flicker summon-fx` passed: 59 tests across nine files. New coverage checks shape resolution, distinct elemental silhouettes, finite motion, reduced motion and stable ward opacity. Signature validation reads the pure VFX catalogue rather than matching the old import syntax.
- `npm run web` passed.
- `tools/fxlab/cinematic-checks.mjs` passed at 393×852, 360×780 and 412×915, plus reduced motion and battery saver at 393×852. Six screenshot fixtures cover weapons, fire/projectiles, lightning, healing/shields, frost/poison and a finisher. All 22 named skill materials have high-resolution sources, linear filtering and the expected logical size. The base portrait case exercised 90 skill/ultimate cues for all 45 heroes and all 21 king's spells, checking that the renderer left battle state unchanged. Particle expiry, delayed spawn, pool reuse, shared-source survival and cleanup passed, with no page errors.
- `tools/fxlab/polish-checks.mjs` passed all five cases on the final build, preserving dash silhouette counts (four/two/zero), battle-state isolation and cleanup.
- `tools/fxlab/offline-check.mjs` passed: production service worker cached the game, the page launched again without a connection, and painted fire artwork remained available without changing battle state.
- Inspected actual browser screenshots at all three required portrait sizes. These are controlled renderer fixtures, not an exhaustive playthrough or physical-phone performance measurement.

Use `PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright` in this environment; serve `out/web` at localhost:8000 after building. `GAME_URL`, `CHROMIUM_PATH` and `FX_CASE` can select another local server, browser or individual portrait case. The offline check always uses 393×852.

## Review artifacts and handoff

[Implemented screenshot gallery](../samples/battle-effects-remake.png), [fire at 393×852](../samples/battle-effects-fire-393x852.png), [frost at 360×780](../samples/battle-effects-frost-360x780.png), [healing at 412×915](../samples/battle-effects-healing-412x915.png).

[Painted-effects browser results](../samples/battle-effects-checks.json), [existing polish regression results](../samples/battle-effects-polish-checks.json), [offline results](../samples/battle-effects-offline.json).

No implementation blockers remain. Owner review and any requested release integration are next; the owner has not yet accepted the implemented visuals or authorised deployment for FX-002.
