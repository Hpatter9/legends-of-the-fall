# Council symbols and Lost Techniques manuscript

Branch `art/council-manuscript`, worktree `/workspace/legends-of-the-fall`. The owner approved the existing Council icon sheet and the generated manuscript proposal. Completed portrait and trophy work remains intact in this workspace.

The Council now uses its existing commissioned source artwork for fifteen News events and its own War Trophy medallion. Claim/crowned use the existing warchief badge; named/muster use the painted Book of Names and war drum, with smooth sampling. All nineteen event types have explicit mappings. Public NEWS_ICON and TROPHY_ICON exports remain available from nemesisView. No Council event rules, purchases, saves or balances changed.

Lost Techniques without a speaking hero now use the approved painted manuscript in the giver card and quest log. Quests spoken by a hero continue to use that hero's face through the existing helper.

Source provenance and cell mapping: `art-source/council-manuscript/README.md`. Rebuild with `python3 tools/council-art/import.py`. All images are bundled data URLs in already offline-cached game.js.

Typecheck and web build passed. The 42 existing focused tests (`nemesis council ui-standard`) passed; browser checks passed at 393×852, 360×780 and 412×915. All nineteen News images decoded at their expected source sizes; the two painted relic symbols use smooth sampling. The dedicated trophy token and matching manuscript in card/log decoded at each size, with no page or console errors. Results: `docs/samples/council-art/browser-results.json`. Controlled fixtures use the actual shipping Council and quest menus, including a row for every news type. Fixtures are excluded from the game build and are not a campaign playthrough.

[Council icon preview](../samples/council-art/icons.png). No version bump, push, merge or deployment.
