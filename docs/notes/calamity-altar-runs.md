# Calamity: starter-led altar runs

Implemented on `feat/calamity-altar-runs` in `/workspace/legends-of-the-fall`. This is the first playable implementation of the owner's approved restart: begin alone, recruit during the run, and evolve the original hero through an altar.

New runs have three regions (6, 7 and 8 rows), ending in heralds 1 and 3 and the final Calamity. Existing saved six-map runs retain their maps and original rules. Save keys, lasting hero progression, equipment, asset credits and offline packaging are preserved.

The starter's roster ID stays on the run. Main-route victories guarantee two levels of progress per victory; the three altar milestones guarantee at least levels 6, 16 and 26. Entering the final lair guarantees level 30 and tier three. Recruits keep the existing XP catch-up, gear and team systems. The starter cannot be recycled.

The first victory unlocks Ember (damage pulses), Bastion (nearby shields) or Echo (nearby skill charging). Guardian victories unlock an offering (health versus damage) and a commandment (together versus alone). Every evolution strengthens the starter and its patron's pulse. Each choice may be consecrated or corrupted, with consequences previewed before committing. Corruption grants starter attack and combat gold but strengthens enemies and gives bosses a telegraphed pulse. Corrupted Bastion bosses also shield themselves; Echo bosses drain skill charge. Boss pulses stop when the boss falls. Campfires can reforge the patron instead of resting or training, without removing corruption.

Altar decisions persist across reloads and must be resolved before travelling onward. Existing map cards, sprites, gear and recruitment screens are reused. Generic battle tutorial bubbles now stay hidden on the map so they cannot block altar choices.

## Checks

- Typecheck and web build passed.
- All 44 Calamity tests passed, including the existing 24-seed opening/full-clear difficulty check and successful endgame starter-growth check. Updated only the changed three-region expectations and taught the test player to choose altar upgrades.
- Thirteen new rift tests passed: choices, growth, catch-up, starter recycling protection, save round trip, legacy runs, all three combat paths, commandments, reforging, corruption, deterministic replays, final starter level/tier and dead-boss pulse behaviour.
- Affected tower, tower-theme, battle-flow, modes, recycle, awakening-material and tutorial tests passed.
- Browser checks passed at 393×852, 360×780 and 412×915, including altar choices, corruption, offerings, commandments and reforging. No page errors or horizontal overflow. Offline reload retained the altar at all three sizes. Screenshots are in `docs/samples/calamity-rift/`. Reproduce with `node tools/calamity/rift-shots.mjs` after `npm run web`; this helper uses local Chromium and injects simulation fixtures only into the QA browser.

This pass reuses the existing route, recruitment, equipment and reward content. It does not add new artwork, a new permanent-unlock economy or an extraction mode. Further balance iteration should use human playtesting of altar combinations and corruption levels; the automated checks establish an initial playable baseline.

No version bump, merge or deployment. Ready for owner review.
