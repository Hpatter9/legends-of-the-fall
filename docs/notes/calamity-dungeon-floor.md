# Calamity: research-led dungeon-floor proposal

Owner: current Codex chat. Branch: `design/calamity-dungeon-floor`.

The owner asked for research into King God Castle's Great Rift and a fresh attempt after the scenic overworld proposal. This direction supersedes the valley-map concept.

## Research and design decisions

The [Kamigame Great Rift guide](https://kamigame.jp/kinggodcastle/page/325905942635917295.html) documents moving the starting hero around a floor with directional controls, returning through cleared areas, revisiting shops, and finishing exploration before entering the floor boss. Its map-interface section describes the current location, movement controls, currency, party count and re-entry action. The page explicitly says it is no longer updated, so this is a reference for the documented exploration flow rather than a claim about the latest game version.

A [community stage reference](https://www.namu.moe/w/%ED%82%B9%EA%B0%93%EC%BA%90%EC%8A%AC/%EA%B7%A0%EC%97%B4/%EC%8A%A4%ED%85%8C%EC%9D%B4%EC%A7%80) also describes separate battle, elite, event, altar, shop and boss rooms, and notes that maps vary between runs. No reference-game artwork or screenshots were imported into the project. Direct inspection of the guide's linked images was unavailable through the workspace network; the design is an original interpretation of the documented navigation, not a pixel-exact reconstruction.

The revised example uses compact stone chambers and physical orthogonal corridors. The starter appears in the current room. A directional pad and keyboard arrows move between connected chambers; tapping a room previews its encounter, and the entry button moves to accessible rooms. Cleared rooms remain revisitable, available rooms have warm gold edges, unreached rooms are subdued, and the guardian has a crimson frame. The ornate emerald-and-gold header and altar/company controls retain the game's interface language.

Our three-region Calamity progression and original evolving altar system remain the design foundation. The reference's floor count, monetisation and exact rules were not imported.

## Assets and prototype

- `src/art/calmap-dungeon/encounters.png`: original generated transparent encounter-symbol atlas; unmodified, with measured rectangles and provenance alongside it. The retained source is `/workspace/generated_images/exec-76843a12-06ac-42a4-be7c-7127b9dafbed.png`.
- Existing credited stone textures, torch animation art and the current starter sprite are reused.
- `docs/samples/calamity-dungeon/proposal.html`: separate interactive prototype. Its handcrafted room graph demonstrates loops, optional rooms and backtracking. It does not write game saves or simulate battles. Entering a new room marks it explored for visual testing only.
- `proposal-393.png`, `proposal-360.png`, `proposal-412.png`: initial view. The matching `exploring-*.png` captures show movement.

## Validation and integration boundary

Offline browser checks passed at 393×852, 360×780 and 412×915. No page errors or horizontal overflow; control panel remained visible; all directional targets were at least 44×44. North/south movement, revisiting, keyboard navigation, tap-to-enter and blocking the unreached boss were checked. Rendering embedded a fixed list of local assets and blocked all network requests, with no server. Reduced-motion mode disables transitions and torch glow animation.

Production map rendering and simulation are unchanged. AGENTS.md requires showing and confirming a visual proposal before substantial implementation. This prototype is ready for that review. Live integration must use actual simulation travel/encounter completion, preserve saves, cache or bundle the assets, and validate the connected-room layout against generated graphs. Prototype exploration must never be mistaken for a real battle completion.

Typecheck and web build passed. Simulation tests were not rerun because production simulation and renderer code are unchanged. Reproduce the offline portrait and interaction checks with `node tools/calamity/dungeon-proposal-shots.cjs` using the configured local Chromium/Playwright environment.

No merge, deployment or version bump.
