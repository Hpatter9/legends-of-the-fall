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

## Current handoff status
Planning branch created and this note committed. No runtime changes, no screenshots, no tests run. Next task is prototype implementation and validation, not merge.
