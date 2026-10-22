# Recycling heroes, and fifteen waves an army (sell-waves)

The owner's two asks: "give the option to recycle heroes I don't want at a lower cost than what they were to bring out in battle, so I can focus
on levelling up one hero", and "extend the number of waves to 15, which should allow more hero evolutions".

## 1. Recycle a hero (`src/sim/run.ts`, the bench in `src/main.ts`)

- **What a hero cost.** `Owned.paid` is the gold paid into a hero: the summon price it was bought at (`summonCost` at the time), a starting hero the base
  price (30), and a merged hero the sum of the three that made it. A hero from an older save has no record, so `paidOf` takes it to have cost the base
  price for each grade-1 hero in it (30 / 90 / 270).
- **`recycle(run, heroId)`** removes the hero from the roster and the squad, puts its gear back in the pack (as a merge does) and pays
  `recycleValue`: **40% of what it cost, rounded, at least 1, and never as much as it cost** (`RECYCLE_SHARE`). It returns the gold, or `null` for an unknown
  hero, a finished run, or the **last hero** (it cannot be recycled). `summons` does not change, so the price of the next summon does not go down and the
  draw (which follows the run's seed and hero ids) is not rerolled: buying and recycling over and over is a steady loss of gold.
- **UI.** Tap a bench card to choose it (as before): a gold **Recycle · +N** button shows on the card, in the deploy phase only, and not on the last hero.
  Nothing was added to the bench row or the bar (the auto-play worker adds an Auto button there). A hero of grade 2 or more asks again: the button turns red and
  reads **Sure? +N** for three seconds, and a second tap does it. A placed hero is chosen the same way (tap it on the board, or its card) and is taken
  off the board. The recycle plays a new `coin` sound (`soundRules.ts`, `sound.ts`: two bright pings), a puff of dust (`recyclePuff` in `uiFx.ts`, once, no
  looping) and a "+N gold" that flies up to the gold counter.
- **Tests** (`test/recycle.test.ts`): what each hero cost (starters, summons, merges), the refund (about 40%, under the cost, at least 1, old saves),
  roster and squad, gear back in the pack, the last hero kept, the summon price and draw unchanged and no free rerolls, and a run saves and loads.

Screenshots (393x852, `tools/sellwaves/shots.mjs`): `docs/samples/sell-waves-recycle-prompt.png` (a grade-2 Knight chosen, "Sure? +38", 210 gold),
`sell-waves-recycled-puff.png` (the moment after) and `sell-waves-recycled.png` (248 gold, one hero fewer), `sell-waves-army-card.png` (the Orc Warband, "15 waves").

## 2. Fifteen waves an army (`src/sim/armies.ts`)

Every army now has `ARMY_WAVES` = 15 waves (it was 8, 8, 8, 9, 9, 10, 10, 10, 10).

- **Bosses.** The armies with one mid-boss have it at **wave 8**, the final boss at 15; the Wildwood's three forest bosses are at **5, 10 and 15**. There is
  no art for a second mid-boss in the other armies (a repeated Chieftain or Lich would be dull), so the single mid-boss moved to about the middle of the longer run. The
  bands round the bosses are the ones the armies had (the final band gets a sixth foe).
- **Troop identity.** The field waves are made by `ramp(pattern, count)`: each army has a pattern of its own troops in the proportions it had (orc grunts, archers and brutes;
  skeletons, spearmen and bone volleys; the three werewolves; the satyrs; minotaurs and gorgons; ...). Wave j takes its foes in turn from the pattern, two places further each
  wave, so the mix shifts, and the size ramps from three foes (waves 1-4) to six (the last four field waves). The first wave of each army is the same kind of band it was.
- **Difficulty.** The foes' multiplier is still `start x (1 + growth x (wave - 1))`; `growth` was lifted by about 1.1 to 1.6 times its old per-wave rate scaled to the longer run
  (`growth` 0.20/0.20/0.18/0.17/0.17/0.16... became 0.176/0.17/0.15/0.136/0.128/0.124/0.13/0.127/0.124), so the last waves are a little harder than the old ones. The `start`, `mid` and `last` boss
  numbers were not touched. A longer run pays much more run gold (`reward` is 20 + 6 x stage, 1,080 over fifteen waves against 436 over eight) and
  gear, which is where the extra merges and evolutions come from, and the foes were raised to keep the targets.
- **Rewards.** `waveCrowns` is still `(10 + 2 x wave) x pay` (a boss wave a half more), so late waves pay more than early ones, but `pay` was scaled down so a **first clear pays about
  15% more** than before, not by half, and `REPLAY_SHARE` (15%) is as it was. The clear bonus is untouched.
- **Stars.** The time star is `timeTarget` = waves x 26 s (x 1.12 a tier), so it is now 6:30 on Normal for every army. Stars and chests are untouched.
- **Old saves.** `ArmyRecord.waves` says what length `best`, `won` and `hard` count in; a record without it is from the shorter armies and is mapped by `migrateArmies` (`OLD_WAVES`
  holds the old lengths): an army already cleared has all 15 waves won and its clears kept, so every wave is a replay and the next army stays open; an army part way through
  keeps its share of the way (never reaching the last wave, which only a clear does); the harder tiers' won waves the same. Stars (keyed by old wave numbers), the conditions met and the
  chests are left as they were. A record that already has `waves` is not mapped again.

### Rewards, per army

| Army | Waves | Bosses | start | growth | Wave 1 → 15 pays | pay | First clear (before) | First clear | Replay |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Orc Warband | 15 | 8, 15 | 0.5 | 0.176 | 6 → 31 | 0.52 | 294 | 339 | 52 |
| Undead Legion | 15 | 8, 15 | 0.7 | 0.17 | 9 → 47 | 0.78 | 460 | 530 | 80 |
| Beast Packs | 15 | 8, 15 | 0.85 | 0.15 | 13 → 66 | 1.1 | 665 | 765 | 115 |
| The Wildwood | 15 | 5, 10, 15 | 1.15 | 0.136 | 21 → 103 | 1.72 | 1026 | 1178 | 178 |
| The Labyrinth | 15 | 8, 15 | 1.38 | 0.128 | 27 → 133 | 2.21 | 1334 | 1536 | 231 |
| Ogre Clans | 15 | 8, 15 | 1.55 | 0.124 | 39 → 194 | 3.23 | 1901 | 2187 | 330 |
| Infernal Host | 15 | 8, 15 | 1.64 | 0.13 | 49 → 246 | 4.1 | 2463 | 2834 | 425 |
| Yokai Night Parade | 15 | 8, 15 | 1.68 | 0.127 | 61 → 307 | 5.11 | 3142 | 3612 | 542 |
| Golem Forge | 15 | 8, 15 | 1.7 | 0.124 | 75 → 376 | 6.26 | 3868 | 4448 | 668 |

### Balance (`npm run balance`)

The targets from `armies.md` hold: the realistic player (table 5c, 120 saves: recruits, a castle grown from the crowns, gear, levels carried) clears every army in
about 2 to 4 tries, the 90th percentile at 4 to 7.

Tries (mean) to clear each army, **before** (8 to 10 waves) and **after** (15 waves):

| Army | Before: tries | median / 90th | Party level | After: tries | median / 90th | Party level | Castle levels |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Orc Warband | 3.1 | 3 / 4 | 1.0 | 2.7 | 3 / 4 | 1.0 | 0.0 |
| Undead Legion | 2.4 | 2 / 4 | 5.9 | 2.6 | 2 / 5 | 8.1 | 2.2 |
| Beast Packs | 1.9 | 2 / 3 | 8.8 | 2.0 | 2 / 4 | 12.3 | 5.6 |
| The Wildwood | 2.7 | 2 / 5 | 10.8 | 2.4 | 2 / 4 | 14.6 | 8.6 |
| The Labyrinth | 2.9 | 3 / 6 | 14.5 | 2.5 | 2 / 4 | 17.2 | 11.7 |
| Ogre Clans | 2.4 | 2 / 5 | 16.9 | 2.1 | 2 / 4 | 18.5 | 15.0 |
| Infernal Host | 2.7 | 2 / 6 | 18.2 | 2.7 | 2 / 5 | 19.2 | 17.5 |
| Yokai Night Parade | 2.8 | 2 / 6 | 19.1 | 2.8 | 2 / 5 | 19.7 | 20.5 |
| Golem Forge | 3.2 | 2 / 6 | 19.5 | 3.1 | 2 / 7 | 19.8 | 23.3 |

Every army is cleared by all 120 saves, before and after. With the same `growth` scaled only for the longer run (0.11, 0.11, 0.1, 0.107, ...), the realistic player walked through in 1.4 to 2.1 tries:
the extra run gold and gear made the 15 waves easier than the 8, which is why the foes' growth was lifted. The parties are now a few levels higher on the first try (the fifteen waves need more).

The tiers still rise steeply (table 5e, recruits, maxed castle, gear, 20 attempts a cell, % clearing on Normal / Hard / Elite / Legendary at hero level 20): before, the Wildwood
95 / 85 / 5 / 0, Ogres 100 / 70 / 0 / 0, Infernal 95 / 20 / 0 / 0, Yokai 70 / 15 / 0 / 0, Golems 75 / 5 / 0 / 0; after: Wildwood 100 / 60 / 0 / 0, Ogres 90 / 50 / 0 / 0,
Infernal 75 / 20 / 0 / 0, Yokai 45 / 10 / 0 / 0, Golems 50 / 0 / 0 / 0 (the raw tables are in `docs/samples/sell-waves-balance.txt`).

The starting five alone, no castle or recruits (tables 5a/5b), are further from the walls than before, as the notes of `armies.md` meant (a fixed level held over fifteen waves; the party's levels are what the
tries earn). The chance of beating the whole army at one level, before then after: the Orc Warband at level 8 100 then 75 (level 14: 100 then 85), the Undead Legion at 11 80 then 20 (at 20: 100 then 45),
the Beast Packs at 14 65 then 25 (at 20: 80 then 35); later armies 0 both ways at these levels.

Table 5b (60 fresh saves, the starting five only, no castle or recruits, at most 25 tries an army), before (400 saves) then after: the Orc Warband 3.4 then 3.4 tries, the Undead Legion 3.3 then 4.8, the Beast Packs 3.4 then 5.0,
the Wildwood 9.9 (95% cleared) then 11.3 (53%), the Labyrinth 38.8% cleared then 5%, the Ogres 0.5% then 1.7%, the rest none: the same shape as before, a little steeper, and nobody is meant to clear the
later armies with the starting five alone.

### Tests changed

`test/armies.test.ts` (fifteen waves, spread bosses, the Orc wall at level 14 not 9, the levels table (undead 20, beasts 20, infernal 14), the Lich King's wave 15, old records mapped,
the time target, pay up by about 15%), `armies2.test.ts` (fifteen waves), `armyStars.test.ts` (the Orc first clear 339 not 294). No test was loosened to pass: each was re-measured and the numbers
adjusted to the new design (the level tables the tests state are what the balance tool shows).
