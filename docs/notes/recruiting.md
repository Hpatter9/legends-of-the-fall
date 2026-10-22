> Rarity was removed (see `no-rarity.md`): the tiers, rates, pity and tier shows described below are gone.

# Recruiting (the gacha)

- `src/sim/meta.ts` (pure): lasting progress in localStorage `legends.meta`: crowns, unlocked hero kinds (the starting
  five at first), a pull counter, a pity counter and shards per kind.
- Crowns: a won stage pays `10 + 2n`; a lost fight ends the run and pays `10(n-1) + n²` by the stage reached.
- Pulls: 1 for 100 crowns, 10 for 900. Rates 50 / 28 / 14 / 6 / 2 (Common to Mythic, from `UnitDef.rarity`, unset = common; see `docs/notes/rarity.md`);
  a Legendary or better is guaranteed by the 30th pull without one, a Mythic by the 90th. If no hero has the rolled rarity, the nearest rarity with heroes is used.
- A pull draws from `Rng.from(meta.seed, salt, pulls)`, so it replays. A new kind unlocks; a duplicate gives a shard of
  that kind instead (see `docs/notes/shards.md`).
- Runs carry a `pool` of unlocked kinds that summons draw from; it follows the unlocks when the recruiting screen closes.
- Page: the "Recruit" button beside Summon opens `#gacha` (`src/gacha.ts`): crowns, pull buttons, rates, flipping
  cards glowing by rarity with NEW on unlocks, and the collection with locked heroes shaded. The result banner shows crowns earned.
- Tests: `test/meta.test.ts`.
