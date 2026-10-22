# Calamity

A King God Castle style mode on the tower's machinery (`src/sim/calamity.ts`, `tower.ts`, `modes.ts` `calamityRun`,
`towerView.ts`, `calamityView.ts`). Home screen: a "Calamity" pill under Party (open from the start).

- **Start**: pick one owned hero (level 1). The run's `local` rules apply (see tower-reset.md); 40 gold.
- **Maps**: 6 maps of 6, 7, 7, 8, 8 and 8 floors (`CAL_ROWS`), each ending in a boss of its own (`CAL_BOSSES`: Orc Warlord, Thorn Warden, Demon Lord, Horned Ogre, Grove Spearlord, Boar King), drawn bigger and tougher each map (`calBossBoost`), with the tower's boss intro card and, from map 2, a twist on the boss floor (lava, a narrow pass, ...) as the escalating mechanic; each map has its own
  name and one of the tower's three looks (`calamityLook`, the fourth tinted). `calamityMap`: floor 1 fights, floor 2 fights or
  a mystery, floor 3 is a recruit camp on every path (the long maps add a second), the floors between are fights, elites,
  shops, chests and mysteries, the one before the boss is a campfire. Every map has a shop and a chest. A boss's fall opens the
  next map; the last one's fall clears the run (`run.cleared`).
- **Mini-bosses**: every map has a named elite on a floor with other ways round it (so it can be skipped). Its win pays a choice of three relics, a piece of gear and double gold.
- **Hiring**: new node kind `recruit` offers three different kinds for `45 + 7 x floor` gold (kinds not yet owned first);
  shops sell a hero at the same price. Hires join at 70% of the roster's mean XP and take a squad place. Ten heroes at most
  (`CALAMITY_SQUAD`, `squadLimit`), **no merging**. The summon button is hidden.
- **Foes** (`foeScale`): `0.2 x (1 + 0.05 x (floor-1)) x (1 + 0.25 x (map-1))`, +10% per hero past five, a band fitted to
  the party (a lone hero meets two foes).
- **Rewards**: the fights' crowns as in the tower, `MAP_CROWNS` (60, 120, 200, 300, 420, 600) per map cleared, and a gold chest on a
  full clear; the best is `meta.calamity`. Abandoning ends the run behind a confirm and pays like a loss.
- **Saving**: own slot, see tower-reset.md.

**Balance** (`npm run balance -- --no-tables --calamity --attempts 100`, greedy bot, no castle): maps cleared 92% / 90% / 90% / 90% / 64% / 13%, so a full clear is 13%; 9.2 heroes held and level 11 on average at the end. The wall is the fifth and sixth boss. A human should do better.
Tests: `test/calamity.test.ts` (hiring, cap, no merge, map progression, pay, save and reload). Shots: `docs/samples/calamity-*.png`.
