# Dynasty and Council art finishing pass

Branch `art/dynasty-backdrops`, worktree `/workspace/legends-of-the-fall`. Prior completed portrait, trophy and Council/manuscript batches remain intact. Owner approved the existing source artwork and two new House/heirloom symbol concepts.

Four season icons and four modelled fate icons replace borrowed item tiles, with smooth painted sampling. The unused Legend source is retained/imported, but no Legend fate or gameplay has been invented. New House paintings replace the generic ledger mapping and are visible as the Houses/lineage crest. Heirloom rows use the dedicated keepsake painting. Twelve commissioned trait symbols supplement learned trait names/descriptions only; unknown traits reveal no artwork. Traits without commissioned icons and all weaknesses retain their existing text.

The Houses list and lineage page show the existing tapestry backdrop. The Dark Council board shows its existing hall backdrop. Paintings sit under a subdued gradient; standard ornate menu framing, controls and wells remain intact. Sources, mappings, importer and contact sheet are retained in `art-source/dynasty-finish/` and `tools/dynasty-art/`. All shipping images are bundled in offline-cached game.js.

Validation: typecheck and web build passed; 68 focused tests (`dynasty heirs nemesis council ui-standard`) passed. Browser fixtures exercise real menus, controlled lineage data, all four seasons and modelled fates, the heirloom, both backdrops, twelve learned traits and the same twelve while unknown. Fixtures do not enter the game build or save state. Browser checks passed at 393×852, 360×780 and 412×915: both backdrops decoded, four distinct seasons and four modelled fate paintings, House and heirloom images, all twelve learned traits, and no trait images while unknown. No horizontal page overflow or browser errors. Sprite sheets are loaded into the fixture cache so character portraits are visible in the captures. Results: `docs/samples/dynasty-art/browser-results.json`.

[Contact sheet](../samples/dynasty-art/contact.png). No game rules, saves, version, push, merge or deployment changed.
