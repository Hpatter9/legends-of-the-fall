# The lost techniques (LOST-TECHNIQUES)

The Legendary books of [the design](https://github.com/Hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md)
("The lost techniques"), left for later in [shop-books-gear.md](shop-books-gear.md). Four books that are never sold, each the end of a
three-part quest chain on the tavern board whose last part is a quest battle of its own. Everything here is data on the books' and the
quests' existing rails: no new rule in the fight, no new draw from any stream, every save field optional, the save version untouched.
The books' slots and levels (the skills overhaul's work on `claude/skills-9`) are not touched: a lost technique is a `Slot` made by
`slotFor`, so whatever the slots learn to do, it will do too.

## The books and their skills

`src/sim/bookData.ts` gains four Legendary books with `lost: '<id>'` (and `from: LOST_FROM`, no source hero): they study for 20 fights
(`STUDY.legendary`, less with the library), have no price (`BOOK_PRICE` has no Legendary), are read by their kind of calling only
(`READS`), and never sell. `books.ts` `slotFor` builds a lost technique's slot from `kits/lost.ts` (`lostSlot`): its cost the same share
of the reader's pool whatever the pool (half a pool: 30 stamina or 50 mana), no revive face. `kits/when.ts` has a line for each so the AI
holds a lighter skill for it only when it has work.

| Book (kind) | The skill | Slot (class, cost, cooldown, tune) |
| --- | --- | --- |
| **The Ninefold Cut** (Manual) | blinks from foe to foe, up to four in turn (the nearest unstruck foe within 3 of where the last cut left him), cutting each; the last cut is double and bleeds 3 s | heavy, 0.5 pool, 11 s, 0.68 |
| **Words of Unmaking** (Grimoire) | a line of void 4 tiles long across the thickest lane (the Wall of Fire's `laneLine`) for 5 s: foes in it lose shield, haste and guard, are slowed, and take 30% more while marked; needs two foes in the lane | utility, 0.5 pool, 16 s, 1.0 |
| **The Hymn of the Long Dawn** (Hymnal) | for 4 s every friend within 3 heals each second (a third of the singer's attack, scaled by the slot) and cannot fall below 1 health; once a fight, and only while a friend near is under 60% | utility, 0.45 pool, 20 s, 1.0 |
| **The Old Hunger** (Bestiary) | leaps on the hardest-hitting foe within 5, strikes it and pins it 2 s, strikes every other foe within 2 for half and shoves it two tiles away, and heals 8% for each foe struck | heavy, 0.5 pool, 12 s, 0.7 |

Built from the toolkit as designed (`chargePlans`/`leapTo`, `moveMany`, `raiseAura`, `laneLine`, `stunFor`/`chillFor`/`bleedFor`, the kits'
`exposed` mark); one new kit mark, `kx.dawn` ("cannot fall below 1": `kitSpare` holds it up beside Blood Fury) and `kx.hymned`.

**Differences from the design, on purpose:** Words of Unmaking is a mark and a stripping on the foes near the line, not a drawn wall (the toolkit's
walls all block or burn something; a line of void that blocks nothing needed a new wall kind and its painting, which is art and renderer work), so the page shows it
as the aura ring and the foes' mark. The marked foes take 30% more from everything (not only spells: `exposed` is blow-and-skill), 5 s rather
than 4. The skills have no paintings of their own yet (the cast uses the generic dagger icon and the name banner); the books' covers are the
Rare ones in the gold frame.

## Balance

`node tools/lost/measure.mjs [games] [technique] [reader,...]` (new): the hero sweep's random five-hero teams at level 30, stage 78, one reader
in each, played with its own two skills and with the lost technique in slot 1 and in slot 2 (same seeds, same teams). Lift in win-rate points over
its own two skills, 400 games a cell, six readers a technique (noise about plus or minus 2):

| Technique | readers, slot 1 / slot 2 | mean |
| --- | --- | --- |
| Ninefold Cut | Kwame -1.5/+0.8, Kenji +3.0/-0.3, Natsu -2.0/-1.5, Barbarian -0.3/-3.5, Lancer +5.5/+4.0, Reaper +0.3/+0.3 | +0.9 |
| Words of Unmaking | Ravi +1.0/-2.0, Lightning Mage +0.8/+0.8, Warlock -0.3/+3.0, Illusionist -5.0/-1.5, Tyrant -0.8/-1.5, Sage +1.8/+2.5 | -0.2 |
| Hymn of the Long Dawn | Selam +1.3/+2.3, Linnea -4.3/+0.3, Paladin 0.0/-1.0, Druid +4.3/+2.8, Wolf Bard +2.5/+5.3, Time Witch +6.0/+3.8 | +1.7 |
| Old Hunger | Vuk +9.5/+13.0, Minotaur -1.3/+1.0, Gorgon -0.8/+0.8, Kitsune -6.3/-8.0, Kraken -0.5/+0.3, Mummy -1.0/-2.3 | +0.3 (with Vuk), -1.1 (without) |

That is the design's "up to 2 points above the hero's own best loadout" on average; the exceptions are Vuk (his own kit is the weakest
at level 30, and the Hunger's pin and healing suit him; the chain is his, so it reads as the book finding its owner) and the Kitsune and the
Illusionist, for whom a lost technique is a poor swap (they are utility casters whose own two skills are doing something the lost ones do not).
Nobody is forced to read one.

## The chains (`src/sim/questData/lost.ts`)

A new giver, `lost` ("A lost page", the `tale` slot, so each part goes up as soon as the one before is handed in); a part with a `hero` is told
in that hero's own name and face (`giverKeyOf` already does it for any quest with a `hero`, and `heroesOwnedFor` already hides it until the hero is owned).
Every part needs a hero at level 30 (where the ultimates open) and the mode or army named. The last part pays `reward.book` (new: `payReward` calls
`grantBook`, `rewardWords` says "the book The Ninefold Cut"), 1,200 to 1,500 crowns and a keepsake.

1. **The Ninefold Cut** (Kenji; Wildwood cleared): win 15 waves with Kenji on the field and no hero falling; win 5 Wildwood waves with him
   (the pilgrim road: the design asked for a visit to Hester, and there is no "visit" goal yet, so the maker's mark is read by Hester off-screen
   and the road is the part); the quest battle **The Empty Dojo** (Kenji).
2. **Words of Unmaking** (the rift; the Calamity open): clear a Calamity with a Grimoire reader on the field; fell a Calamity guardian; **The
   Unwritten Library** (Ravi). (The Gloaming Dealer's chained page, the design's door into this chain, is not built: the Dealer is the caravan
   batch's. The chain is on the board from the start for now, and the Dealer can offer the same first part later.)
3. **The Hymn of the Long Dawn** (the Last Stand open): heal 20,000 with Hymnal readers (`tally` `by`); reach act 3 (the chapel) of the Last Stand;
   **Matins at the Chapel** (Selam, or Linnea when Selam is not owned). The design had a Royal charge give it; the Royal slot is a weekly draw, so it
   is told by the lost page instead.
4. **The Old Hunger** (the Beast Packs cleared): fell 40 beasts of the Beast Packs; win 5 Wildwood waves with a Bestiary reader; **The Den
   Beneath the Snow** (Vuk). (The design's passing hunter is a passer-by who offers one quest a day; a chain wants its parts in order, so it is
   the same tale slot.)

## The battles (`src/sim/lostBattleData.ts`, in `questBattles.ts`'s lookup and `quest-rate`)

All four are three or four waves on a land of their own with a required hero (`castOf`, `heroesOwnedFor`: not offered until the hero is owned) and a
story before and after in the quest battles' cinematic shots (no portrait art needed; the stories are not in the Scenes list, so no entry in
`docs/lines/new-lines.json`). **No new foes**: each boss is an existing one with a name and title, as the quest battles do (`boneCaptain` is the
Last Master, a pale captain who strikes between his students, and the Sexton of the Dark; `sapphireColossus` the Index; `alphaWolf` the Grandmother
Wolf), so `FOE_LORE` and `new-lines.json` are untouched. The Index does not wall tiles off and the Last Master does not blink: a boss keeps its own kit.
Matins has a last wave and a named captain rather than "survive 60 s": a timed win is a new battle rule.

Strength is an army's Normal at one of its waves (`like`), here the Wildwood (level 22) at its waves 12 to 14, with `ease` set by `npm run quest-rate` for
the level the chains open at, 30 (`-- 40 +8`; the greedy rating party of the required hero and starters, two hearts):

| Battle | `like` | ease | won at level 30 (40 tries) |
| --- | --- | --- | --- |
| The Empty Dojo | wildwood@14 | 2.2 | 55% |
| The Unwritten Library | wildwood@13 | 2.0 | about 55% (68% at 1.85, 53% at 1.9 in 30) |
| Matins at the Chapel | wildwood@12 | 2.4 | 38% |
| The Den Beneath the Snow | wildwood@14 | 1.75 | 45% |

Hard but fair at 30, as the hero tales are (30 to 50%); each is far easier a few levels on.

## Tests, checks and screenshots

`test/lost-techniques.test.ts` (12): the books (Legendary, 20 fights, unpriced, the right readers, the same share of a mana or a stamina pool); each
skill doing what its words say, and not casting with nothing to do; the chains (three parts each in order, a battle last paying the book, level 30);
Kenji's chain offered only once Kenji is owned and paying the book into the bag; the battles' cast, foes and stories; and the AI casting three of the four
on its own in either slot (the Hymn is held for a hurt friend and once a fight, so its own test casts it). `test/books.test.ts` and
`test/quests-content.test.ts` were updated for the new giver and the books without a source hero. Screenshots at 393x852,
`node tools/lost/shots.mjs` after `npm run web`: `docs/samples/lost-board.png`, `lost-offer.png`, `lost-log.png`, `lost-story.png`,
`lost-deploy.png`, `lost-handin.png`, `lost-skillbook.png`.

## Left open

- The skills' own paintings and sounds, the books' Legendary covers (`books/<kind>-legendary`: the gold frame over the Rare cover stands in) and the lost page's face.
- A real "visit" goal (the design's Hester part), the Gloaming Dealer's chained page, and a wall that blocks nothing (the Unmaking's drawn line).
- The skills overhaul's levels by use: a lost technique is a `Slot`, so it levels like any when `skills-9` lands; the tunes above are at level 1.
