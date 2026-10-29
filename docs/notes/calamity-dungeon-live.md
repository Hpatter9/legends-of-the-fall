# Live Calamity dungeon map and arrival portal

Owner: current Codex chat. Branch: `feat/calamity-dungeon-map`, based on the approved dungeon-floor proposal.

The owner approved moving forward and requested a visible portal that brings the heroes into the Calamity. The live floating-island renderer has been replaced by connected stone chambers and corridors. The original encounter IDs, links, hidden detours, three-region run, combat rules, rewards and save keys remain intact. Existing six-map runs use the new presentation without being restarted.

## Implementation

- `src/calMap.ts` now renders the live dungeon, using generated encounter symbols and the game's credited stone textures, torch art and current starter sprite. It calls the existing travel/encounter simulation; moving to an uncleared chamber never marks a battle won.
- `src/sim/dungeonLayout.ts` maps saved encounter graphs into deterministic chamber positions and orthogonal halls. Optional detours get their own inter-row band. Walking follows the simulation's route through cleared rooms; arrows select adjacent reachable rooms.
- The arrival portal is a permanent room at `START_ID = -1`, linked to the actual first encounters. Original emerald-and-gold artwork is bundled into the map. The starter emerges at the portal on a fresh regional arrival; the portal remains visible and can be revisited safely. Reduced motion disables arrival, glow and walking animations.
- UI selection now uses `-2` for no selection, fixing the old collision with the portal's ID. Returning to the portal does not reset the route or pay rewards.
- `TowerView` supplies the compact region/hero status, directional controls, encounter details and Altar/Pack/Company actions. The company sheet retains health bars, relic details and abandonment. Entering the boss retains the unexplored-room confirmation. Interrupted travel resumes through the same saved destination; reopening the same map clears the cancelled UI movement flag.
- The previously requested altar artwork is now live too: sanctuary backdrop, patron shrines and crests, slot progress, and consecration/corruption flourishes. Choices are saved before their flourish and buttons are disabled during it. All three slots, review and campfire reforging retain their simulation rules.
- Large generated backdrops use an image layer rather than a CSS custom property, which the browser rejected at this data-URL size. All new art and floor textures are imported as bundled data URLs. Existing service-worker caching of `game.js` covers them; no uncached runtime asset URLs were introduced.
- Keyboard navigation is ignored while company/altar/confirmation cards, the Pack, settings or recap screens are open. Leaving the map releases listeners and animation timers.

## Verification

Typecheck and web build passed. Seven affected test files passed: dungeon layout, Calamity exploration, legacy land graph, modes, rift, tower and tower theme. The six new layout tests cover deterministic layout, preserved encounters/portal links, orthogonal reversible halls, phone bounds and non-overlap, real-route walking, safe directional selection, and portal/reload progression.

The live browser flow passed at 393×852, 360×780 and 412×915: visible portal and starter, real directional battle entry, real win settlement and first altar choice, portal return with unchanged reward/progress, cleared-room keyboard revisit, recruitment, shops, rest and company details. No horizontal overflow; controls remain visible and arrows are at least 44×44. Offline reload at every size retained the portal, recruited party and cleared route.

Focused checks also cover saved mid-walk reload, existing six-map runs, normal-motion portal arrival and emergence completion, interruption by Home followed by resume in the same page, normal-motion corruption with save-before-animation and double-submit prevention, and blocking arrows behind the open Pack. The final focused run is recorded on the task board.

The ornate altar was separately checked at all three sizes: its actual backdrop loads, patron/offering/commandment choices work, corruption persists, review works, and reforging changes the patron while preserving corruption. Screenshots are in `docs/samples/calamity-dungeon-live/`.

Reproduce with `node tools/calamity/dungeon-live-shots.mjs` after `npm run web`. `--altar-only` checks all altar states; `--navigation-only` checks recovery, normal motion and modal keyboard guards. The helper serves only compiled `out/web` files, only on loopback, with browser-only simulation fixtures for reaching later encounters. Original generated sources are retained and credits/provenance updated.

No full-suite or unrelated balance sweep was needed: combat and reward rules are unchanged. No version bump, merge or deployment.
