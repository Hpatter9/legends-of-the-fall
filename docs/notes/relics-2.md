# The relics redone as the keep's lost artefacts, step 1 (RELICS-2)

The owner approved the redesign in `docs/notes/relics-redesign.md` and asked for it in two steps. This is step 1: the keep's 24 relics in
six Chapters, the six Storied relics, the relic card, the conversion of old saves, and the balance yardstick. Step 2 (the Calamity's sets
become the six Eidolons' reliquaries, with the bound echo) is not begun: the Calamity's five remaining sets keep their pieces and numbers.
Branch `claude/relics-2`, from `claude/relics` (part 1, the relics shown on the wave-prep screen only, `docs/notes/relics-prep.md`).

The owner's other answers, built as recommended: prices in red, and Auto leaves a price it cannot pay well; the reliquaries stay in the
Calamity (step 2); the Book of Names and the Unfinished Chronicle are kept; old runs convert quietly with one line on the next prep
screen, merged duplicates paid back in gold; the lore is always on the card; a relic's icon shows over a hero when it fires.

## The relics (`src/sim/relics.ts`)

Each `Relic` has `name`, `lore` (one line), `text` (its rule), `price` (its cost, when it has one), `rarity` (`common`, `rare`, `storied`),
`effects` (numbers and fight rules) and, for a growing one, `grow`. The ids are the old ones, so saves and icons carry on; only two old
relics are gone (merged, see below).

| Chapter | Relics (id) |
|---|---|
| I, The Founding (`holy`) | The First Banner (`banner`), The Founder's Ledger (`scholarScroll`, Rare), St Oswin's Cup (`holyChalice`), The Warden's Medal (`saintMedal`) |
| II, The Long Winter (`frost`) | The Gate Boss (`ironShield`), The Stopped Hourglass (`hourglass`, Rare), Rime Sapphire (`frostSapphire`), The Sentry's Cloak (`winterCloak`) |
| III, The Burning (`fire`) | Phoenix Feather (`phoenix`, Rare), The Siege Drum (`warDrum`), Ember of the Great Hall (`emberRuby`), Scorched Scale (`dragonScale`) |
| IV, The Night Watch (`shadow`) | The Watchman's Charm (`featherCharm`), The Hawk's Eye (`hawkEye`, Rare), The Cutpurse's Cloak (`shadowCloak`), The Poisoner's Fang (`viperFang`) |
| V, The Hunt (`beast`) | The Old Whetstone (`whetstone`), The Courier's Boots (`swiftBoots`), The Wolf-Tooth Necklace (`wolfFang`), The Huntmaster's Harness (`beastHarness`, Rare) |
| VI, The Treasury (`fortune`) | The Coronation Crown-Piece (`luckyCoin`), The Tax Ingot (`gildedIngot`), The Pawned Crown (`jewelCrown`, Rare), The Watchtower Glass (`spyglass`) |
| Storied | The Crown of the First King (`sunCrown`), Vaelkhar's Heart (`dragonHeart`), Voltara's Wedding Ring (`stormRing`), The Calamity's Eye (`voidLens`), The Book of Names (`bookOfNames`, new), The Unfinished Chronicle (`unfinishedChronicle`, new) |

The rules and numbers are the design's (`relics-redesign.md`), with these settled in the build:

- **The Sentry's Cloak**: +4% hp for all, and the back row's heroes (the last deploy row, `v = d - 1`) a further 7.7% (12% in all), given
  as the fight starts. The Last Stand has no rows, so there it is the +4% only.
- **Scorched Scale**: 5% less damage for all and a further 10.5% from bosses (15% in all).
- **The Coronation Crown-Piece**: +8 gold a win, and 1 more for every 50 gold held when the win is paid, to +16.
- **The Phoenix Feather** burns out after `PHOENIX_RISES` (5) rises in a run and is Phoenix Ash (+5% attack; `relicName` says so).
- **Growing relics** read the run's tally (`grow`: the Old Whetstone and the Founder's Ledger by waves won, the Hawk's Eye by elites and
  bosses felled, the Book of Names by heroes fallen). The tally counts from the run's start, so one found late is already grown.
- **The Unfinished Chronicle**: `setCount` counts one more for every chapter or set begun (never past its whole).
- The **Chapters' bonuses** are the old tower sets' two and three (they were tuned), and the Treasury's are the old Fortune set's.
- **Rarity**: a draw takes a Rare a third as often as a Common (`pickRelic`, on one number from the stream, as a plain pick takes, so no other
  draw moves); a Rare costs half as much again at a shop (`relicPriceOf`); the Storied six come only from the tower's black altar and the
  cursed crown, as the legendary four did.
- **The Tax Ingot**: every shop and merchant price is 10% dearer (`pricedFor`): the event cards (`priced` in `sim/events.ts`), the cart's
  wares, the tower's shops and the Last Stand's relic offers.
- **The Pawned Crown**: each win pays 10 gold less, never below nothing.

## The fight's rules (`src/sim/relicFight.ts`)

The relics' rules beyond plain numbers are `RelicHooks` on `b.relics.hooks`, each read by one small hook: `relicStart` (the fight's start,
from `applyTraits`; in the Last Stand each wave's, from `beginWave`), `relicFoe` (a foe made stronger by a price; in the Stand as it comes
in), `relicBlow` (in `swing`), `relicTaken` and `relicDodge` (in `onStrike`), `relicCharge` (the skill and pool charge), `relicSpeed`
(`speedOf`), `relicMana` (the king's mana tick), `relicRose` and `relicFall` (in `hurt`). A fight with no relic hooks plays as before.
Voltara's Wedding Ring's struck hero is drawn from its own side stream (`mixSeed(b.seed, 0x5e1c, b.t)`); nothing else draws.

The battle keeps a tally (`b.relicTally`: rises, heroes fallen, elites felled) that `noteFight` adds to the run's (`run.relicMarks`,
`addRelicMarks`; a win counts as a wave won); the Last Stand adds it at each wave cleared or line held (`standMarks`) and gives the growing
relics their new size at once (`refreshRelics`). A relic firing (the Phoenix's rise, the Warden's Medal, the Harness) is a `relic` event,
and the page shows its icon and name over the hero for 1.4 s (`Fx.relicMark`); the relics are otherwise not on the fight's screen.

Auto (`relicSuits` in `sim/autoplay.ts`) leaves the Ember of the Great Hall alone without a healer in the squad, and the Pawned Crown with
under 40 gold.

## The relic card (`src/relicCard.ts`, `src/relicCard.css`)

Tap a relic on the prep screen (or in the Pack, or on the tower's map): a card over the screen with the icon, name and rarity, the lore line,
the rule, the price in red, a growing relic's size now ("Now: +9% attack (at most +15%)", "Rises so far: 2 of 5"), and its chapter: the
chapter's line of story, its four pieces (held ones lit, this one outlined) and its two bonuses (on or off). A tap anywhere closes it. The
Pack lists the relics by chapter. The Last Stand's offers show each relic's own price and its price line.

## Old saves

`RELIC_RENAMES`: the Coin Hoard is now the Crown-Piece and the Gold Band the Tax Ingot. A run saved before (`relicBook` absent) is converted
as it loads (`catalogueRun` for the ordinary run and the Calamity's and quest slots, in `loadStand` for the Last Stand): a relic merged into
one already held is kept once and its price, `RELIC_REFUND` (70 gold), paid back; the tower's open offer, the Pale Lady's due and the
Stand's offer and held relics are renamed too; `relicBook` is set to 2; and a run that held any relic gets `relicNote`, one line under the
strip on its next prep screen (the Stand's break), gone once the fight begins. Every save is written with `relicBook: 2`, so a run of this
version is never converted twice. All new fields are optional; no save version moved.

## Art

Every relic has its own icon: the three without one of their own (the Founder's Ledger shared the Dragon Heart's tile; the two new Storied
relics) are DawnLike Book tiles cut by `tools/relics/relic-icons-2.py`, credited in `CREDITS.md`. They are placeholders until the painted
icons come: the prompts for all 48 (this step's 30 and step 2's 18) are in `docs/notes/relic-art-prompts.md`.

## Balance

`npm run relic-balance` (`tools/relics/balance.ts`): the greedy player's runs (the starting five at a hero level, hires and merges, no events,
no relic) brought to a boss wave it wins about half the time, then that wave fought from each run's state with no relic, with the old
Whetstone (+8% attack, the size of most old relics, the yardstick of a Common), and with each relic alone; a growing relic at its size half
way through a run. `--runs` plays whole runs instead (much noisier). The results are below (BALANCE-TABLE).

Before and after (origin/main against this branch, the same commands):

| Sweep | Before | After |
|---|---|---|
| Last Stand, `npm run stand-balance -- --levels 10,30,60 --attempts 20` (median / mean wave) | L10 9 / 9.0, L30 14 / 14.9, L60 19 / 17.9 | L10 9 / 8.9, L30 14 / 14.8, L60 20 / 18.3 |
| Calamity, `npm run balance -- --no-tables --calamity --attempts 12` (mean maps; map 1/2/3 cleared) | 1.83; 100% / 75% / 8% | 1.75; 100% / 67% / 8% |

Both within their noise: the relics are found at the same rate in the same places, and the run's power moves with them as it did. (The
old spire climb is gone; the "tower" machinery is the Calamity's, measured above.)

## Checks

- `test/relics-2.test.ts` (new): the stories and chapters, growth, the tally, the Phoenix's burning out, the Unfinished Chronicle, prices,
  the weighted draw, the conversion (ordinary run and Last Stand, once only), every fight hook, determinism, Auto's choice.
- Updated to the owner's approved numbers (the redesign changes these rules): `test/relics.test.ts`, `test/elites.test.ts` (the sets'
  numbers and pools), `test/mystery.test.ts` (six Storied relics), `test/midEvents.test.ts` (a Rare's price at the cart),
  `test/recap-reveal.test.ts` (the Banner's new name in a found line).
- `tools/relics/card-shots.mjs [root] [port]`: the strip with the conversion line, four cards (a chapter, a growing relic, a price, a
  Storied relic) at 393x852, 360x780 and 412x915 (each card fits the screen, no sideways scroll), the line gone and the strip hidden once the
  fight begins, and a relic's mark over a hero. Screenshots `docs/samples/relics-2-*.png`.
