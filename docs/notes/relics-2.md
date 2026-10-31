# The relics redone as the keep's lost artefacts, step 1 (RELICS-2)

The owner approved the redesign in `docs/notes/relics-redesign.md` and asked for it in two steps. This is step 1: the keep's 24 relics in
six Chapters, the six Storied relics, the relic card, the conversion of old saves, and the balance yardstick. Step 2 (the Calamity's sets
become the six Eidolons' reliquaries, with the bound echo) is not begun: the Calamity's five remaining sets keep their pieces and numbers.
Branch `claude/relics-2`, from `claude/relics` (part 1, released as 0.292.0, the relics shown on the wave-prep screen only, `docs/notes/relics-prep.md`).

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

The rules are the design's; the numbers were tuned with `npm run relic-balance` (below) to the per-rarity targets, so several differ
from the proposal. As built (`RELICS` holds the exact numbers and words):

| Relic | Rule (price in brackets) |
|---|---|
| The First Banner | +6% hp; +10% attack while no hero has fallen this fight |
| The Founder's Ledger (Rare) | +5% attack; skills charge 10% faster, +3% a wave won (to 50%) |
| St Oswin's Cup | +5% hp; the king starts each fight with 2 mana, and it fills 10% faster |
| The Warden's Medal | the last hero standing heals 60% and takes 40% less |
| The Gate Boss | 12% less damage (4% slower) |
| The Stopped Hourglass (Rare) | 5% faster; the king's mana 20% faster, twice as fast in the first 10 s |
| Rime Sapphire | a hero at 75% health or more deals 10% more and charges 20% faster |
| The Sentry's Cloak | +6% hp; +16% for the back row (the last deploy row, `v = d - 1`; not in the Last Stand, which has no rows) |
| Phoenix Feather (Rare) | once a fight the first to fall rises at half health; after 5 rises, Phoenix Ash (+5% attack) |
| The Siege Drum | the foes wait half a second; +15% damage in the first 10 s |
| Ember of the Great Hall | +16% attack (heroes start each fight 8% of their health down) |
| Scorched Scale | 5% less damage, 10% less from bosses |
| The Watchman's Charm | slip 6% of blows, 21% in the first 8 s |
| The Hawk's Eye (Rare) | +4% attack; +6% crit, +2% an elite or boss felled (to 24%) |
| The Cutpurse's Cloak | slip 14% of blows (5% more from those that land) |
| The Poisoner's Fang | +6% crit; crits on a foe under half health deal 60% more |
| The Old Whetstone | +3% attack, +1% a wave won (to 15%) |
| The Courier's Boots | 13% faster (3% less hp) |
| The Wolf-Tooth Necklace | +5% attack; 15% more against beasts |
| The Huntmaster's Harness (Rare) | when a hero falls, the rest act 25% faster for 10 s (three at once at most) |
| The Coronation Crown-Piece | +8 gold a win, +1 for every 50 gold held (to +16) |
| The Tax Ingot | +20 gold a win (every shop and merchant price 10% dearer) |
| The Pawned Crown (Rare) | +6% hp and attack (each win pays 10 gold less, never below nothing) |
| The Watchtower Glass | shooters reach further from high ground, deal 10% more, 20% from above |
| The Crown of the First King | +18% attack and hp (the strongest foe of every fight +12% hp and attack) |
| Vaelkhar's Heart | +12% hp, 12% less damage (bosses +10% attack) |
| Voltara's Wedding Ring | 18% faster, +12% crit (one hero, drawn on its own side stream, starts each fight 15% down) |
| The Calamity's Eye | +12% attack; skills and the king's mana 40% faster (every foe +6% hp) |
| The Book of Names | +4% attack for every hero fallen this run (to 60%) |
| The Unfinished Chronicle | every chapter and set begun counts one more relic |

Besides:

- **Growing relics** read the run's tally (`grow`): the Whetstone and the Ledger by waves won, the Hawk's Eye by elites and bosses felled,
  the Book of Names by heroes fallen. The tally counts from the run's start, so one found late is already grown.
- The **Chapters' bonuses** are the old tower sets' two and three (they were tuned), and the Treasury's are the old Fortune set's.
- **Rarity**: a draw takes a Rare a third as often as a Common (`pickRelic`, on one number from the stream, as a plain pick takes, so no
  other draw moves); a Rare costs half as much again at a shop (`relicPriceOf`); the Storied six come only from the tower's black altar and
  the cursed crown, as the legendary four did.
- **The Tax Ingot** (`pricedFor`): the event cards (`priced` in `sim/events.ts`), the cart's wares, the tower's shops and the Last Stand's
  relic offers. **The Pawned Crown**: each win pays 10 gold less, never below nothing.
- Offers name relics with `relicText` (the rule, then "but" and the price) and in sentences with `theRelic` ("the First Banner", never
  "the The First Banner").

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

`npm run relic-balance` (`tools/relics/balance.ts`): the greedy player's runs (the starting five at a hero level, hires and merges, no
events, no relic, Auto casting the king's spells as AUTO-CAST does) brought to an army's last boss wave, which they win about half the time;
then that fight from each run's state with no relic, with the old Whetstone (a flat +8% attack, the size of most old relics: the yardstick
of a Common), and with each relic alone, a growing relic at its size half way through a run. 200 runs a cell. `--runs` plays whole runs
instead (far noisier). The final pass, each relic's lift as a multiple of the old Whetstone's (cells `undead:18:15`, `beasts:10:15`,
`orcs:4:15`; the Whetstone's own lift +4.5, +13 and +12 points):

| Relic | undead | beasts | orcs | mean | | Relic | undead | beasts | orcs | mean |
|---|---|---|---|---|---|---|---|---|---|---|
| First Banner | 0.22 | 0.81 | 1.21 | 0.75 | | Cutpurse's Cloak | 1.00 | 0.88 | 1.17 | 1.02 |
| Founder's Ledger (R) | 2.33 | 1.12 | 0.58 | 1.34 | | Poisoner's Fang | 0.44 | 0.69 | 0.50 | 0.54 |
| St Oswin's Cup | 2.11 | 0.77 | 1.46 | 1.45 | | Old Whetstone | 1.67 | 0.92 | 1.17 | 1.25 |
| Warden's Medal | 1.00 | 0.42 | 0.46 | 0.63 | | Courier's Boots | 0.67 | 0.23 | 1.00 | 0.63 |
| Gate Boss | 1.67 | 1.23 | 1.21 | 1.37 | | Wolf-Tooth Necklace | 0.56 | 1.81 | 0.58 | 0.98 |
| Stopped Hourglass (R) | 1.56 | 0.58 | 0.67 | 0.94 | | Huntmaster's Harness (R) | 1.11 | 1.88 | 1.21 | 1.40 |
| Rime Sapphire | -0.44 | 0.92 | 0.25 | 0.24 | | Pawned Crown (R) | 1.56 | 1.38 | 1.58 | 1.51 |
| Sentry's Cloak | 1.78 | 1.23 | 1.13 | 1.38 | | Watchtower Glass | 0.56 | 1.81 | 0.54 | 0.97 |
| Phoenix Feather (R) | 2.89 | 2.00 | 1.92 | 2.27 | | Crown of the First King (S) | 2.89 | 1.65 | 2.17 | 2.24 |
| Siege Drum | 0.22 | -0.12 | 0.04 | 0.05 | | Vaelkhar's Heart (S) | 3.67 | 2.46 | 2.38 | 2.84 |
| Ember of the Great Hall | 1.11 | 1.15 | 1.46 | 1.24 | | Voltara's Wedding Ring (S) | 2.44 | 1.58 | 1.96 | 2.00 |
| Scorched Scale | 2.22 | 1.58 | 1.54 | 1.78 | | Calamity's Eye (S) | 2.33 | 1.42 | 1.92 | 1.89 |
| Watchman's Charm | 1.44 | 1.19 | 1.08 | 1.24 | | Book of Names (S) | 2.00 | 1.15 | 1.25 | 1.47 |

The targets: a Common about 1 (most land between 0.6 and 1.4), a Rare about 1.5, a Storied about 2. Read with care: each point is about
3.5 points of noise at 200 fights, and these are boss waves, which flatter Scorched Scale's boss guard. Still outside the targets after two
passes: **the Siege Drum** (about nothing: the foes' wait helps little and can hurt), **Rime Sapphire** (0.24) and **the Poisoner's Fang**
(0.54) are weak; **Scorched Scale** (1.78, in boss waves) and **Vaelkhar's Heart** (2.84) are strong; the Stopped Hourglass and the Hawk's
Eye are Rares at about a Common's worth. A third pass could lift the three weak ones and trim the two strong; it is left for the owner's
review rather than guessed. The Crown-Piece and the Tax Ingot change no fight (their worth is their gold); the Unfinished Chronicle is worth
nothing alone and a set bonus with any chapter begun.

Before and after (current main against this branch, the same commands):

| Sweep | Before | After |
|---|---|---|
| Last Stand, `npm run stand-balance -- --levels 10,30,60 --attempts 20` (median / mean wave) | L10 9 / 9.0, L30 14 / 14.9, L60 19 / 17.9 | L10 9 / 9.0, L30 15 / 15.2, L60 20 / 20.0 |
| Calamity, `npm run balance -- --no-tables --calamity --attempts 36` (mean maps; map 1/2/3 cleared) | 1.47; 94% / 50% / 3% | 1.44; 94% / 44% / 6% |

The Calamity is as it was. The Last Stand's strong parties (level 60) hold about two waves longer: its greedy buyer takes a relic every break,
and the relics it meets are a little stronger on the whole than the old flat ones. (The old spire climb is gone; the tower's machinery is the
Calamity's, measured above.)

## Checks

- `test/relics-2.test.ts` (new): the stories and chapters, growth, the tally, the Phoenix's burning out, the Unfinished Chronicle, prices,
  the weighted draw, the conversion (ordinary run and Last Stand, once only), every fight hook, determinism, Auto's choice.
- Updated to the owner's approved numbers (the redesign changes these rules): `test/relics.test.ts`, `test/elites.test.ts` (the sets'
  numbers and pools), `test/mystery.test.ts` (six Storied relics), `test/midEvents.test.ts` (a Rare's price at the cart),
  `test/recap-reveal.test.ts` (the Banner's new name in a found line).
- `test/ailments-identical.test.ts` re-records `army`, `daily` and `stand` (the greedy player finds and buys the new relics).
- `tools/relics/card-shots.mjs [root] [port]`: the strip with the conversion line, four cards (a chapter, a growing relic, a price, a
  Storied relic) at 393x852, 360x780 and 412x915 (each card fits the screen, no sideways scroll), the line gone and the strip hidden once the
  fight begins, and a relic's mark over a hero. Screenshots `docs/samples/relics-2-*.png`.
