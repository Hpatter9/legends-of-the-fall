# Painted Spells screen

Owner approved the candlelit study concept and requested implementation, including new art as needed. Branch: `design/spells-screen-refresh`. Presentation only: spell balance, school/equip rules, ranks, unlock routes, save keys and the bottom navigation remain unchanged.

The Spells tab now uses a new painted arcane study and botanical parchment material, retained with the approved concept under `art-source/spells-screen/` and credited in `CREDITS.md`. `Library` is a normal scrolling page rather than a fixed pixel canvas above a separate scrolling panel. Its title follows the actual ruler's school. Blue motes animate only while visible, pause under battery saver and disappear with reduced motion; there is no canvas animation loop.

The spellbook reuses standard `menuWell`, `menuSection` and `menuChoice` components, with the game's existing painted frames and spell icons. Four prominent loadout slots show school/open roles, spell names and mana. Tapping an equipped slot unequips it; an empty slot takes the player to the relevant collection filter. Known / Your school / Locked filters keep their state when the game redraws; the school view includes both known and locked spells. Rank and school details are expandable. Actual descriptions, base mana/cooldown, rank bonuses/riders and unlock progress remain available. Blocked equip actions explain the rule. Rank spending, capacity, saving and fitting a ruler's school still call the existing simulation functions. Action focus is restored after redraw, including reaching maximum rank.

The Chapel gate retains its Castle action. `openSpellbook()` now uses the standard ornate sheet, sharing the same view and closing through Close or Escape. Standard headers and the existing bottom navigation are retained rather than baking mockup labels into art.

The normal build's top-level UI asset loop copies both new PNGs and includes them in the service-worker precache list. Source and production artwork copies are lossless; no new remote dependencies.

## Validation

Typecheck and production web build passed. The 33 focused checks covering spellbook saves/schools, unlock sources, Decrees, rank spending and the standard menu passed. No simulation code changed.

Browser validation uses isolated fixture saves, not the owner's live company. Run `npm run web` then `node tools/spells-screen/checks.mjs` with Playwright and Chromium installed (override `PLAYWRIGHT_MODULE` / `CHROMIUM_PATH` where needed). The tool checks 393×852, 360×780 and 412×915, including reduced motion at 412, gate navigation, collection filtering, equip/unequip saves, rank spending, targets, overflow and page errors. At 393 it also checks the standard overlay, maximum rank/zero marks, completed collection, paused ambient motion and real service-worker offline reload with painting/parchment decoding. All 64 browser checks passed with no page errors or horizontal overflow. All three main screens, locked-spell cards and Chapel gates were visually reviewed. The final smooth-scaling pass (`node tools/spells-screen/checks.mjs --visual`) also passed all 10 checks and refreshed the main and card screenshots at all three sizes after overriding inherited pixel-art scaling. Final typecheck/build and diff checks passed.

Evidence: `docs/samples/spells-refresh/`. Final screenshots and machine-readable results are retained there. No merge, release bump or deployment requested or performed.
