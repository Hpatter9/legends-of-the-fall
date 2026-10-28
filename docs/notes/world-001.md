# WORLD-001 — Grand Scenario Battlefields

Owner-approved direction recorded 2026-10-26. Task: https://github.com/Hpatter9/legends-of-the-fall/issues/123

## Design
Keep army wave fights as sequential, physically connected terrain-section drops. The whole run should feel like a coherent journey, and **each revealed section must be larger and richer in environment**, not simply the old 8×11 board with off-board dressing. First prototype target: 12×16 playable tiles per section (~2.18x current 8×11 area); consider 16×20 after mobile performance validation. Do not globally replace existing battle sizes during prototyping.

Scenarios:
- Mountain Ascent: foot of mountain → switchbacks → narrow high passes → fortress; higher world elevation as the route climbs.
- Drowned Temple: route along the shore of the same lake → causeways and flooded ruins → temple.
- Necropolis: cemetery approach → layered graveyard → mausoleum.

Plan the whole landscape deterministically for the seed before revealing sections, including route, height field, nonwalkable scenic landmarks, joined elevations, enemy phases and destination. **Hide final landmark until the final approach**, then reveal it dramatically when later sections drop. Maintain the existing clear-wave → drop-section → move-army progression and mode economy. Preserve realistic walking access through slopes, stairs, fords and bridges.

## Implementation plan
1. Inventory board/chain/render/camera/deployment/encounter dependencies, constants, and compatibility. Prototype configurable 12×16 *army-chain* sections in isolated code. Keep existing modes unchanged by default.
2. Add seeded scenario planner, world-space terrain and water heights, accessible joined edges, landmark footprints, route variety, three themes, and deterministic layout tests.
3. Render larger sections with existing art style, continuous background features and a destination reveal. Improve framing/follow/zoom/pan, depth and visibility, while retaining portrait touch interaction.
4. Balance deployment and wave travel, test enemy AI/pathing/LOS, combat timeouts, and benchmark rendering, memory and simulation work across multiple revealed sections.
5. Validate 360×780, 393×852 and 412×915 visually and with screenshots; run typecheck, complete tests, web build and offline checks; document results here, open PR, seek owner approval. Do not merge or deploy.

## Safety and ownership
Read AGENTS.md, CLAUDE.md, docs/TASKS.md. Branch: codex/world-001. SIM-001 remains open in PR #122 and modifies battle.ts, fightStats.ts, tests and task board; do not overwrite its work. Avoid changing shared task-board status concurrently without explicit review. Maintain deterministic seeds, save compatibility, asset credits, PWA caching, portrait only, and the existing UI-001 layout. No implementation completed merely by creating this plan.

## Initial handoff status (before this implementation)
Planning branch created and this note committed. No runtime changes, no screenshots, no tests run. Next task is prototype implementation and validation, not merge.

## Implementation assignment — 2026-10-26
- Owner: dedicated WORLD-001 implementation worker; director reviews independently.
- Branch/worktree: `codex/world-001`, `/workspace/world-001`.
- Scope: dimension-aware chain, projection, drop and formation; opt-in deterministic scenario prototype, tests, browser validation and handoff.
- Reserved: SIM-001 `battle.ts` and `fightStats.ts`; no combat/economy changes, version bump, merge or deployment.
- Gate: standard boards remain unchanged, 12×16 playable sections connect for jump-1 walkers, seeded scenario plan conceals destination until final approach; typecheck, tests, web and three portrait screenshots.
- Repository snapshot: remote WORLD-001 `5101d38d`; all runtime text restored through connected GitHub because shell proxy access fails. Existing UI screenshot binaries are kept unchanged remotely.

## Implemented prototype — director handoff

This is an **opt-in vertical slice**, not completion of the full Grand Scenario rollout. Issue #123 stays open. The default 8×11 army/daily boards and other modes remain on their original generation and rules. There is no version bump, merge or deployment.

### What works

- Dimension-aware section rotations/inverses, footprint placement, terrain contact, formation transfer, world-to-board coordinates, projection/depth, scenery placement and all 192 column drop timings. The incoming rotation inverse contained two default-dimension references; the pre-existing large-board test failed before that fix and now passes.
- An army run may persist `mode.scenario` (`mountain`, `temple`, `necropolis`). The cache key includes it; malformed saved values are rejected. Existing save keys/schema fields remain compatible. Preview entry is `?seed=7&scenario=mountain` (replace the theme as desired). Normal Home → Armies → Party → Start run retains both the explicit prototype seed and theme. Automatic combat and auto-replay remain available.
- A complete seeded plan is built before wave 1. Each section is 12×16; section offsets follow a seeded winding spine, with overlaps avoided and broad joins. A single world-coordinate field supplies heights; mountain altitude rises to the summit, temple shoreline/deep water retains level 1 across sections and causeways, and cemetery props become denser on the approach. Area phases move through forest/highlands/snow, forest/swamp/ruins/temple, or outskirts/graveyard.
- The destination is absent before the penultimate wave. Its world position is fixed across the approach and final boss board. The renderer composes existing credited camp gate/tower sprites on a nonwalkable scenic stone foundation. A bounded camera beat frames the compound, then returns to the heroes; normal tile fit is retained. Destination scenery is removed from demoted/baked sections so there is one compound during the final drop.
- Finished large sections bake only near the camera, requeue on pan-back and use half-resolution baked textures; the active board remains full resolution. This reduces accumulated texture demand without discarding the ability to look back.

### Validation actually run

- `npm run typecheck`: passed on final executable source.
- `npm test`: **105 test files passed, zero failed**, 501.25 seconds. Final test-only additions and the existing long-map cases were rerun with `npm test -- world-001 long-map`: all three files passed. No test was deleted, skipped or weakened.
- `npm run web`: passed, version remains 0.159.0; `git diff --check` passed.
- Focused rules include all four 12×16 rotations/projections, contact/deploy transfer, deterministic three-theme plans, world height/water continuity, saved resume/cache isolation, malformed-save rejection, complete larger drop timing, concealed/world-fixed destinations and known gradient regression seeds.
- Reverse flood checks prove jump-1 paths TO the next formation from every standable survivor tile, not only paths out from a deployment origin. The director's expanded audit covers **20,100 sections / 18,000 joins**, 100 seeds, all three themes, wave counts 2/3/5/10/12/15/20, zero failures (`docs/samples/world-001-connectivity.json`). It initially exposed rare two-step directed pockets; combining continuous height contributions before flooring removed them without locally flattening the global field.
- Director compatibility check in a separate worktree overlaid the exact SIM-001 PR #122 damage/statistics files and regression test: combined typecheck, WORLD/SIM focused tests and web build passed. The full suites ran separately; no SIM files are included here.
- Browser controls at 360×780, 393×852, 412×915 were exercised for each theme with seed 7: Hire twice, Auto-arrange and Fight advance the real simulation with two deployed heroes, with zero page errors. Late-wave screenshots are explicitly staged presentation fixtures, not claims of playing all earlier fights. The strict script additionally waits for actual rendered destination bounds to fit above the panel/below the top bar, asserts concealment and camera return, and closes its browser/server in `finally`.
- Director extra browser checks passed: an actual pointer drag moved the camera, a previously unbaked old section baked and became visible when panning back, and a service-worker-controlled offline reload returned the 12×16 mountain prototype with zero page errors (`world-001-extra-checks.json`).
- A separate **real first-wave playthrough** used Home → Armies → Party → Start run, Hire twice, Auto-arrange, speed ×3 and Fight. Mountain seed 7 won at simulation **16.1s**, advanced to wave 2 and began the genuine terrain drop/hero walk; zero page errors. Screenshot: `../samples/world-001-natural-progression-393.png`.

### Reproduction

After `npm run web`, use an installed Playwright/Chromium, e.g. in this environment:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium WORLD_CHECK_PORT=8190 node tools/world-001/checks.mjs out/web
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node tools/world-001/entry.mjs out/web
```

The first script captures deploy/fight/drop/reveal for the three themes and portrait sizes, with machine-readable results in `../samples/world-001-checks.json`. `--smoke` selects 393×852 only. The second plays a real first wave through controls, with no run replacement or forced win.

Representative images: [mountain fight](../samples/world-001-mountain-fight-393.png), [actual wave progression](../samples/world-001-natural-progression-393.png), [mountain approach](../samples/world-001-mountain-reveal-393.png), [temple approach](../samples/world-001-temple-reveal-393.png), [necropolis approach](../samples/world-001-necropolis-reveal-393.png), and mountain approach at [360×780](../samples/world-001-mountain-reveal-360.png) / [412×915](../samples/world-001-mountain-reveal-412.png).

### Performance and remaining gates

Host-only measurements are evidence for a prototype, **not mobile-device performance approval**:

- Director pure pathfinding sample: 1,000 empty-board jump-1 searches, standard 8×11 33.06ms total versus 12×16 63.83ms (~1.93×); excludes targeting/units/rendering.
- Small deterministic battle pacing sample (seeds 7/19/97, the same unboosted knight+archer vs skeleton+bone archer): standard first contact 2.5–3.2s, scenario 3.6–4.7s. All 12 battles ended in 24.0–45.4s, below the existing 120s timeout. Terrain changes outcomes; this is not a balance guarantee (`world-001-pacing.json`). No combat or reward multipliers were changed.
- Same-browser 393×852 SwiftShader comparison at wave 14: standard idle warm mean 113.48ms / p95 366.7ms; mountain 91.32ms / p95 150ms. The short software-rendered sample is noisy and does not establish a speed improvement. Standard held 13 baked textures (~10.65MB pixel storage), large prototype held one nearby baked texture (~0.52MB). The prototype still exhibited a **2,033ms cold-frame hitch** (standard worst 683ms), so late-run resume remains a performance blocker for broader rollout (`world-001-browser-perf.json`). GPU overhead and live textures are additional to these pixel estimates.

Remaining before wider rollout: replace the initial seeded-offset spine with richer authored multi-direction mountain passes/lake circuits; more dramatic navigable cliffs, stairs and scenario-specific set pieces; distinctive temple/mausoleum compounds beyond tinted reused gate/towers; improve cold build/upload scheduling and validate real portrait devices, long full-run pacing and extended real-device/offline soak. Current art is a functional style-preserving composition, not final bespoke landmark art. Existing bundled art is reused, so no new network-loaded asset was added; generated service worker caching is retained.

The original target remains ambitious WORLD-001, with this tested prototype offered for director/owner review. Keep the PR draft and do not merge or deploy until the owner approves.

## Continuation scope — 2026-10-27

Owner confirmed continuing #126 first, then the broader route/terrain milestone. The prior unpublished candidate was absent from this workspace; recovered published `7426ac5a` and reconstructed the bounded column cache from the issue handoff. Current validation belongs to the continuation, not the earlier prototype checks above.

Route proposal: [planning diagram](../samples/world-001-route-proposal.png), explicitly a geographic concept rather than implemented game art. Mountain ascent uses switchbacks/high passes and legal stair lanes; cemetery uses rising gated terraces. **Owner correction: Drowned Temple ends on an island in the middle of the same lake.** The shore route culminates in a final crossing to the central island; do not leave the temple on the far shoreline. Preserve concealment until the final approach and a fixed destination across the last sections.

Rendering results and outstanding checks are being recorded in `world-126.md`; no mobile approval, merge, deployment or version bump is implied.


## Owner scope revision — per-army maps

Owner requested a unique style and varied trees, rocks, debris, rivers, hills, bridges and roads for each army, using **14×18** playable sections. This exact size supersedes the initial 12×16 prototype target (14×18 is larger than that prototype, despite the owner's word “smaller”). Clarification of connected sections versus one map per army is pending; do not silently remove wave-clear/drop/walk progression. Proposed identities are in [army theme proposal](../samples/world-001-army-themes-proposal.png). The Drowned Temple must culminate on an island in the lake's middle, per the owner's explicit correction.
