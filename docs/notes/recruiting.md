# Recruiting (the gacha)

- `src/sim/meta.ts` (pure): lasting progress in localStorage `legends.meta`: crowns, unlocked hero kinds (the starting
  five at first), a pull counter and a pity counter.
- Crowns: a won stage pays `10 + 2n`; a lost fight ends the run and pays `10(n-1) + n²` by the stage reached.
- Pulls: 1 for 100 crowns, 10 for 900. Rates 70 / 25 / 5 (common / rare / epic, from `UnitDef.rarity`, unset = common);
  an epic is guaranteed by the 30th pull without one. If no hero has the rolled rarity, the nearest rarity with heroes is used.
- A pull draws from `Rng.from(meta.seed, salt, pulls)`, so it replays. A new kind unlocks; a duplicate pays crowns back
  (15 / 40 / 120 by rarity). (Shards with lasting hero bonuses were left out to keep the rules small.)
- Runs carry a `pool` of unlocked kinds that summons draw from; it follows the unlocks when the recruiting screen closes.
- Page: the "Recruit" button beside Summon opens `#gacha` (`src/gacha.ts`): crowns, pull buttons, rates, flipping
  cards glowing by rarity with NEW on unlocks, and the collection with locked heroes shaded. The result banner shows crowns earned.
- Tests: `test/meta.test.ts`.
