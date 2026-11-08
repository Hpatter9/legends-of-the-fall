# Complete Nemesis trait artwork

Branch `art/nemesis-traits-completion`, worktree `/workspace/legends-of-the-fall`, based on merged main 0.393.0. The owner approved the Fireproof, Bane of Mages and Elusive proposal, including a comparison at the actual 28px display size.

Added twelve original trait symbols, covering all 24 modelled traits with unique image mappings. The original twelve PNGs are unchanged. Defence and Bane symbols use distinct silhouettes as well as colours. Every icon retains the existing name and explanation. The shipping card's learned/unknown gate is unchanged, so hidden traits reveal no symbol. No simulation, save or version changes.

Source sheets, the rejected hazy take, mappings and reproducible packing are retained in `art-source/nemesis-traits/` and `tools/nemesis-trait-art/`. Outputs have hard alpha, limited palettes, 128px cells, minimum 12px padding and nearest-neighbour display. All new images are bundled into offline-cached game.js.

Validation: typecheck, web build and 42 focused tests (`nemesis council ui-standard`) passed. The importer asserts nonempty content, dimensions, alpha and padding. Browser checks exercise all 24 learned traits three at a time (the simulation's cap) and the same groups while unknown, at 393×852, 360×780 and 412×915. All three viewports passed: all 24 unique modelled trait symbols decoded and displayed at 28px with pixelated sampling, each learned row stayed within horizontal viewport bounds, all unknown groups showed three anonymous entries and zero icons, and the fixture meta stayed unchanged. No page or console errors. Results: `docs/samples/nemesis-traits/browser-results.json`. Fixtures use the actual menu and loaded sprite sheets, never save and are excluded from game.js.

[Contact sheet with 28px samples](../samples/nemesis-traits/contact.png). Road encounters and herald portraits remain separate planned batches. No push, merge or deployment.
