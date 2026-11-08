# Painted boss trophy wall

Owner approved the Thorn Warden / Karnok / Forge Titan proposal. Branch `art/boss-trophy-paintings`, worktree `/workspace/legends-of-the-fall`; completed quest portraits remain in the same workspace.

All eighteen boss entries now display distinct painted keepsakes mounted on carved oak with brass fittings. Locked entries and locked details use a separate empty mount. The wall header uses a painting too. Existing catalogue, unlock checks, boss names, stories and save fields remain unchanged.

The shared trophy image module bundles 19 small WebPs into already offline-cached game.js. Source images, approved proposal, importer and contact sheet are retained. Detail art is larger, full plaques are visible in the grid, long labels wrap, and Close controls have room for their labels with 44px tap targets. Existing reduced-motion support and hidden-overlay rule are preserved. Existing wall/detail structures are retained rather than adding a new menu.

Validation: typecheck, web build and 13 focused tests (`trophy-wall-hidden tactile-juice ui-standard`) passed. Browser validation results and screenshots are retained in `docs/samples/trophies/`; fixtures use the real shipping TrophyWallModal and are excluded from game.js. All three required phone viewports (393×852, 360×780, 412×915) passed: eighteen distinct decoded trophies, all eighteen details within viewport bounds, 6/12-entry filters, empty locked mounts with no defeat story, and close interactions. Reduced motion disabled the detail animation. No page or console errors. Results are recorded in browser-results.json.

[Contact sheet](../samples/trophies/contact.png). No version bump, push, merge or deployment.

Follow-up backlog check: `src/render/items.ts` already selects the 48 shipped painted relic icons via `PAINTED_RELICS`; the old item-tile imports are fallbacks and do not establish a missing-art gap. Nemesis rank badges also already use `RANK_BADGE` from expansionArt. Check the remaining Council event icons and the Lost Techniques manuscript before requesting further generations.
