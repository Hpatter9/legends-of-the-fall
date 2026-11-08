# Art release 0.394.0

Owner explicitly requested finishing the remaining planned artwork and merging all three batches. Branch `art/calamity-herald-portraits`, worktree `/workspace/legends-of-the-fall`, based on main 0.393.0 (`f5b648cf`). The owner approved the trait proposal, road paintings and sprite-matched herald portrait proposal.

Included:

- Twelve new Nemesis symbols finish the full set of 24 modelled traits; unknown traits still reveal no symbols.
- Eight 768×432 road encounter paintings in compact panels, preserving option text, costs, disabled states, choice reachability and leave/Continue flow. Follow-up scenes do not reuse mismatched paintings.
- Six herald busts plus face crops in the standard boss introduction card and discovered codex entries. Unknown heralds stay concealed; other bosses retain their sprites; cinematic films and all battle sheets remain unchanged.

Sources, reproducible import tools, credits and browser screenshots are retained in the individual batch directories and notes. All new runtime images are bundled into already offline-cached game.js. No simulation or save rules changed. Package, lockfile and Updates use 0.394.0. No new private dependency or network integration was added.

Validation before merge:

- Release `npm run typecheck` and `npm run web` passed.
- `npm test -- nemesis council events codex boss ui-standard updates`: 99 passed, no failures or skips.
- Trait batch: all 24 unique icons, 28px display, all learned/unknown groups, unchanged fixture meta and zero browser errors at three phone sizes.
- Road batch: all eight images, original labels/text/prices, reachable 44px options, leave/Continue, insufficient-gold states and unillustrated follow-ups passed at all three phone sizes, with zero browser errors and unchanged run state while rendering.
- Herald release checks call the actual Game intro and Home codex at all three phone sizes. All three sizes passed for all six busts, codex face mappings, unknown concealment, sprite fallback and close controls. Reduced motion passed; no page or console errors. Results: `docs/samples/herald-art/browser-results.json`.
- Twelve herald exports decoded at their expected sizes; original battle sheets untouched; new images use bundled imports and game.js remains in the service-worker cache. No fresh offline browser reload was run for this release.

The concrete three-batch artwork plan is now completed. Merge details are provided through the attached PR and final report.
