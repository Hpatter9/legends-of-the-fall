# Rarity (five tiers)

- Tiers (`UnitDef.rarity`, `Rarity` in `units.ts`): 1 Common (grey), 2 Rare (blue), 3 Epic (purple), 4 Legendary (gold),
  5 Mythic (crimson to gold, a shimmering frame). All 25 heroes have one: 6 / 6 / 5 / 3 / 5.
  - Common: the starting five and Peasant. Rare: Ninja Monk, Wanderer, Cleric, Ranger, Barbarian, Satyr.
  - Epic: Lightning Mage, Paladin, Druid, Illusionist, Minotaur. Legendary: Warlock, Gunslinger, Werewolf.
  - Mythic: Kitsune, Karasu Tengu, Yamabushi Tengu, Samurai Commander, Gorgon.
- Stats: `TIER_MULT` in `meta.ts` (1 / 1.08 / 1.16 / 1.26 / 1.4) on hp and attack, applied in `gradeBoost` (`run.ts`)
  when it is given the hero kind (`boostOf` always does). A Mythic is also drawn `MYTHIC_SIZE` (1.12) bigger.
- Mythic ultimates (`Kit.ultimate`, `abilities.ts`): a second skill on its own meter (`Unit.charge2`), filling at
  `ULT_RATE` (45%) of the first skill's rate from the same blows, hits and time. A full ultimate goes before the skill;
  if it has no target the skill may still go. Each has its own name, so `SKILL_FX` has an effect for it, and it shakes
  and flashes the screen.
  - Kitsune, Nine-Tailed Dream: the three strongest foes within 7 tiles fight their own side for 4s.
  - Karasu Tengu, Feather Storm: a storm of blades on the thickest knot of foes, 2.6x attack.
  - Yamabushi Tengu, Tempest: Wind Gust over 4 tiles at double the power, and everything in it is stunned 1.5s.
  - Gorgon, Stone Curse: every foe in sight within 6 tiles is hurt and petrified for 2.5s.
  - Samurai Commander, Rally Cry: the banner flies over every ally for 9s and heals each by a quarter.
- Recruiting: rates 50 / 28 / 14 / 6 / 2 (`RATES`). Pity: a Legendary or better by pull 30 (`PITY`, counter `dry`), a
  Mythic by pull 90 (`MYTHIC_PITY`, counter `dryMythic`, new in the save; old saves start it at 0). Duplicates still
  give shards. The recruit screen and the Summoning hall show the odds and both pity counters.
- Look: rarity classes `r1`..`r5` set `--rc`; frames on the bench, party, heroes tab, collection and reveal use it.
  A Legendary frame gleams; a Mythic frame shimmers. The reveal: a Legendary pull waits a beat, flashes and throws
  beams; a Mythic card trembles, then turns slowly under crimson-and-gold beams with a flash over the screen
  (`rarityFlash` in `uiFx.ts`). A summon in a run flashes the same way. On the board a Mythic has a crimson halo, a
  pulsing ring, rising embers, an ember trail where it has walked (`unitView.ts`), a burst when it appears, and a
  second crimson sliver under its charge bar for the ultimate.
- Balance (`npm run balance`, which now gives each hero its tier): value by tier, mean win % with a hero of it, on
  random teams at stage 5 foes: Common 92.6, Rare 93.9, Epic 95.1, Legendary 96.3, Mythic 98.3 (the average team is now
  much stronger than with plain heroes, by design). Whole runs from fresh saves are unchanged (starting five, all
  Common): 93% still lose to the stage-5 boss on a first run.
- Tests: `test/rarity.test.ts` (tiers, multipliers, rates, pity, ultimates, old saves).
