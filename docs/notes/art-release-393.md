# Art release 0.393.0

Owner requested merge of the completed art batches and a plan for new artwork. Branch `art/dynasty-backdrops`, worktree `/workspace/legends-of-the-fall`.

Includes fifteen quest-giver paintings and manuscript, eighteen mounted boss trophies plus empty mount, all nineteen Council news mappings and War Trophy token, four season/four modelled fate symbols, House/heirloom paintings, Houses/Council backdrops and twelve learned Nemesis trait symbols. Sources, reproduction tools, screenshots, credits and individual handoffs are retained. No simulation or save changes. Legend source icon is reserved because no Legend fate state exists.

Integrated main through 0.392.0 (`a0900a2c`), preserving the painted battle controls, hero sprite remakes and cozy tavern. Only append conflicts in credits/task board needed resolution; both sets of records were retained. Release metadata is 0.393.0 in package/lock and Updates. New artwork proposal: [next artwork plan](new-artwork-plan.md).

Before integration, all four art batches passed their focused typecheck/build and three-size browser checks; the final batch passed 68 focused tests. Integrated release validation is recorded below after completion.

Integrated release validation passed:

- `npm run typecheck` and `npm run web`.
- `npm test -- dynasty heirs nemesis council ui-standard trophy-wall-hidden tactile-juice updates hero-art tavern`: 100 passed, no failures or skips.
- `node tools/art-release-393/checks.mjs`: 393×852, 360×780 and 412×915 passed for quest portraits, manuscript, nineteen Council news images, dedicated trophy currency, House/fate/heirloom/season art, both painted pages, learned versus unknown traits, eighteen painted boss trophies, detail and close interactions. Reduced-motion detail animation check passed. No page or console errors.
- New art is imported as bundled data URLs; game.js remains in the generated service-worker cache. Existing main's URL-loaded tavern art and cache entries are preserved. This release check did not perform a fresh offline browser reload; prior art-batch checks and main's tavern offline validation are retained separately.
- Source mappings, credits, task board and release diff checked. Original trait pixels match their commissioned source cels exactly.

Release PR and merge result are tracked in the app attachment and director's final response.
