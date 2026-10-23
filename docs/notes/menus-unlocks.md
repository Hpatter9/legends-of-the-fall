# Menus and unlocks

## Modes and armies open with army stars

The stars counted are every star won over every army and tier (`totalStars` in `src/sim/armies.ts`; 9 armies, 11 stars each).

| Opens | At stars |
| --- | --- |
| Castle (the buildings) | 10 |
| Tower | 15 |
| Calamity | 21 |
| Army n (the first is open from the start) | 2 x n: 2, 4, 6, 8, 10, 12, 14, 16 |

- Rules: `src/sim/modeUnlock.ts` (`MODE_NEED`, `modeOpen`) and `ARMY_NEED` / `armyUnlocked` in `armies.ts`.
- Army curve: today's pace on Normal is a clear star plus about one more per army, so two stars an army never holds that player back. The harder tiers' stars count as well.
- Clearing an army no longer opens the next by itself; its stars do. The banner "A new army marches" still rises when the clearing run's stars open one (`main.ts` compares the open armies before and after the run's stars settle).
- Old saves: `Meta.opened` is read once from what the save had (`grandfather`): each army whose predecessor was cleared, the castle if any building or the chapel was begun, the tower if it was climbed (or a best stage of 10), the Calamity if it was tried. These stay open whatever the stars.
- Camp: the Tower and Calamity plates read "Opens at N stars" (the full label adds "x/N stars"); the Tower keeps its chained picture, the Calamity portal goes grey and still. The Castle tab shows a shut page with the same words and progress; the Achievements and Codex chips stay.
- Locked army cards read "Opens at N stars" with "x/N stars".
- Tips: the Tower and Calamity tips only point at a button that is on and enabled, so they wait for the unlock; the crowns tip now says army stars open the Castle, Tower and Calamity.

## No starting hero in an army run

`armyRun` starts with no hero and `ARMY_START_GOLD` (65: the hires at 30 and 35). Ordinary runs (`newRun`, the tools) and the daily keep their own start (the daily has always begun with its own five and fixed gold, so it is untouched). The deploy bar says "No heroes yet: tap Hire for your first two".

`npm run balance -- --no-tables --climb --saves 240` (mean tries to clear, Normal):

| Start | Orcs | Undead | Beasts | Wildwood | Labyrinth |
| --- | --- | --- | --- | --- | --- |
| before (2 free heroes, 70 gold) | 2.7 | 2.5 | 2.1 | 3.0 | 3.6 |
| 65 gold (chosen) | 2.9 | 2.9 | 2.3 | 3.6 | 4.0 |
| 75 | 2.9 | 2.9 | 2.2 | 3.5 | 4.2 |
| 105 (three hires) | 2.9 | 2.8 | 2.1 | 3.6 | 4.0 |
| 150 (four hires) | 2.8 | 2.7 | 2.0 | 3.3 | 3.7 |

Extra gold barely moves it: the first wave of the Orcs is won 100% of the time with two hired heroes at level 1 (Undead's first wave is 61% at level 1, 100% before; a fresh save cannot reach it until it has 2 stars). The climb tool spends its crowns on the castle from the start, which a save can no longer do before 10 stars, so these are the easy side of the true pace.

## Normal army by army

Superseded the earlier "a little harder" tweak (Ogres and Infernal): see `docs/notes/difficulty.md`, "Normal climbs army by army" (a recommended level per army, shown as "Recommended: Lv N" on the armies screen and "Lv N" on the war table; `start` retuned; the harder tiers keep their old `tierStart`). The climb tool now keeps the castle shut until five armies are cleared (`--castle-open` plays it open from the start).

## A chest for the Mythic star

`MILESTONES` is now 3, 5, 10 and 11 stars. The 11th star (Mythic's flawless clear) pays the best chest the armies give, kind `mythic` (the gold chest's picture turned violet in CSS, no new art): about twice a gold chest's crowns (2400 base), one more shard, two prize heroes (the gold chest has one) and two pieces of gold-quality gear (the second drawn after the first, so the gold chest's own roll is unchanged). Each milestone is given once per army (`rec.chests`), so settling the star again pays nothing; the Mythic first clear's gold chest is a separate award (it comes with any clear, the star only with a flawless one). It sits under the 11th star on the armies screen's track. A save that already has 11 stars gets the chest when it next settles a run. Test: `test/armyStars.test.ts`.

## Codex rewards

The codex page lists every reward row: the share of the collection, how many entries it takes, the crowns it pays, and its state (Claimed, "n to go", or a Claim button). Under each collection: "Each entry counts towards a reward; none pays alone. Paid x of y crowns." A "Claim rewards: +N crowns" button sits on top when any wait. The Codex chip on the Castle page already wears a badge then.

## Settings

The Settings chip on the Castle page was a second way to the same sheet; it is gone. Settings stays on the top bar's gear.

## For the owner

- With the castle shut until 10 stars, the Chapel (spellbook) cannot be built before then either; the Spells tab shows what it did before without the building. Say if the spell library should open earlier.
- The Tower and Calamity open for an old save by what it played, not by its stars.
- The start gold is exactly two hires. Four hires (150 gold) gives back today's pace; the nerf on Normal is +7 to +11% tries.
- Screenshots: `docs/samples/menus-unlocks-*.png` (`node tools/menus-unlocks-shots.mjs`).
