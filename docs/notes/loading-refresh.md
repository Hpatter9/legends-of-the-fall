# Illustrated loading screen

Owner: current Codex chat. Branch: `design/loading-refresh`.

The owner approved the moonlit keep concept and requested movement and liveliness. The old CSS landscape and sprite duel are replaced with an original illustrated king and personal guard, keep and looming demon. The owner approved the revised formation: the crowned king stands centrally, with an archer and paladin guarding opposite flanks and a fire wizard behind him. The production background has no baked-in lettering; the title, loading status and existing random gameplay tip remain live HTML.

The compressed WebP is embedded in index.html by build.mjs, so the cached page contains the art and can show it before game.js arrives. No extra network request or service-worker file entry is required. The indeterminate bar conveys ongoing startup without claiming a percentage. Startup timing, first-time hero selection, save keys, game rules and version are unchanged.

CSS adds a slow depth movement, two drifting mist layers, a breathing beacon glow and twelve rising embers. Text stays still. Reduced motion disables all loading animations, retaining the illustration, lighting and a static indicator. Removing the loading element also removes its animated layers; no timers or listeners are added.

Artwork: `src/art/loading/last-keep.webp`; original concept and clean generated source remain in `/workspace/generated_images`. Credits are in CREDITS.md. Old duel assets remain available for history/tool compatibility.

Validation refreshed after the approved king-and-guard artwork replacement: typecheck and web build passed. Browser checks passed at all three sizes with 17 active loading animations, moving mist, zero animations under reduced motion, no horizontal overflow, successful seeded startup and zero page errors. Real service-worker offline reload passed and the cached HTML contains the illustration. Results are recorded in `docs/samples/loading/checks.json`, with normal and reduced-motion screenshots at 393×852, 360×780 and 412×915. `node tools/loading-check.mjs` holds game.js while inspecting the actual loading screen, then releases it for seeded startup; a separate un-routed context checks real service-worker offline reload. It uses the project's software WebGL browser settings. Simulation tests are not required for this presentation-only change.

Owner requested a PR for Claude: [PR #179](https://github.com/Hpatter9/legends-of-the-fall/pull/179). Branch validation is against main 0.204.0; latest main at PR creation is 0.213.0 (`b5ceafc1`). GitHub reports merge conflicts: Claude must integrate current main, preserve its changes, rerun affected checks and handle the version bump. No merge or deployment performed.
