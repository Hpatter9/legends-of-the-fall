# Quests, batch 1: the tavern and the first quests

Batch 1 of the owner-approved design in [quests-summons-design.md](quests-summons-design.md) (its Build plan, item 1). No quest battles
(batch 2), no War Horn or Eidolons (batches 3 on). Every existing fight plays out the same: nothing new draws from a fight's streams.

## What it does

- **The Heroes tab opens the tavern** (it no longer opens the hero list over it). The tavern's buttons, top right in a column: **Quests**
  (a gold dot while something waits), **Trophies**, **All heroes** (the old Roster button, renamed; it opens the list as before; the
  comeback pointers still open a hero's sheet). The tab wears a gold "!" (`i.qbadge`) while a quest waits to be taken or handed in,
  beside the red dot of a rank ready.
- **Gwen Tallow** stands behind the bar (`GWEN_SPOT`, the bar hides her legs) with a gold "!" over her while she offers a quest and a
  gold tick while one of hers waits to be handed in. A tap opens **her card** (`questCard.ts`): a hand-in first, else her offer (Take it
  on / Not now), else a word on her quest going, else a line of gossip. The card rises from the bottom; a tap outside closes it.
- **The quest board** leans on the wall left of the bar (`BOARD_SPOT`), a gold "!" over it while anything is on offer; a tap opens
  the log's Board tab.
- **The quest log** (`questLog.ts`, in the hero sheet's `#hmSheet`): tabs **Active** (n/3; each quest's goal, a bar, Track, or Hand in
  once done), **Board** (every offer from every giver, with Take), **Done** (newest first, with the giver's last word). The
  **Eidolons** tab has its place in `LOG_TABS` (`shown: false`) for the chains' batch.
- **The tracked chip** on the Battle tab's command bar, top row at the right ("The Carter's Wheels 0/3", or "Done: hand it in"); the
  army's line moves left for it. The pinned quest, else the newest taken. A tap opens the log.
- **A toast** when a fight (or a Last Stand's end) completes a quest: "Quest done: ... · return to the tavern", after the achievements'.

## The rules (`src/sim/quests.ts`, data in `src/sim/questData.ts`)

- **Givers and slots:** Gwen (`gwen` slot: the board holds up to 3 of hers, one new a day, each kept 3 days) and the passersby (a
  pedlar and a pilgrim share the `passerby` slot: one a day, gone at midnight). `SLOT_RULES`, `SLOTS`.
- **Offers:** `refreshOffers(m, date)` (the page calls it on each home redraw with `todayKey()`): takes down the offers past their days,
  then the first time a date is seen draws one offer for each slot with room from `mixSeed(m.seed, QUEST_SALT, dayNumber(date), slot)`.
  Kept in the save, so a reload, a take or a second look the same day never rerolls anything.
- **Who is offered what:** `needMet` (an army cleared, or N armies), not taken, on offer or done, and **the owner's rule**
  (`heroesOwnedFor`): a quest whose goal has a `with` rider (heroes, or heroes of a trait) is not offered until the player owns a hero
  who fits it. The Carter's Wheels takes Kwame or any Guardian, so both starter packs see it (Minh is a Guardian).
- **Limits:** `ACTIVE_MAX` 3 taken at once (`cannotTake`: 'full'); a quest is done once and not offered again.
- **Goals** (`goalGain`, from a `QuestFight`): `wavesWon` (optionally one army; riders `with`, `flawless`), `bossDown` (a boss wave won;
  riders), `kills` (a foe family, counted won or lost: `skeletons` are the foes on a skeleton sheet, bosses aside), `clearDaily` (a
  counted daily cleared, not a practice replay). `questFightOf` builds the fight's facts from the achievements' context;
  `noteQuests` adds them, capped at the need. Called in `settleRun` beside `checkAchievements` (army, daily, spire and Calamity fights,
  and the auto-replay's), and at the Last Stand's end (`standFight`: its waves cleared count as waves won). Losing never takes
  progress away.
- **Hand-in** (`handIn`): pays the reward (`payReward`: crowns, stones, a chest into the stash as a chest of the furthest army open,
  `tower: true` with a seed from `CHEST_SALT` and the quest's id; rift ores) and moves it to `done`.
- **Saves:** `Meta.quests?` (`{ active: {id, progress, took}[], offers: {id, giver, day}[], done, tracked?, day? }`), read by
  `readQuests` in `loadMeta` (unknown ids dropped, counts capped, at most 3 taken; a later batch's `chains`, `pieces` and `tries` are
  kept as they are). An old save has none: it loads with nothing begun, and its first look at the tavern is offered what its progress
  already allows; nothing is back-paid. The save version is not bumped.

## The six quests (from the design's first set)

| Quest | Giver | Needs | Goal | Reward |
| --- | --- | --- | --- | --- |
| The Carter's Wheels | Gwen | the Orc Warband cleared | 3 waves of the Orcs with Kwame or a Guardian | 120 crowns, 2 stones |
| A Round for the House | Gwen | any | 10 waves, any mode | 150 crowns, a bronze chest |
| The Bone Collector | Gwen | the Undead Legion cleared | fell 60 skeletons | 200 crowns, 3 stones |
| Quiet Hands | Gwen | 2 armies cleared | a boss wave won, no hero falling | 250 crowns, a silver chest |
| Fresh Bread for the Front | a pedlar | any | clear a daily | 3 stones |
| The Pilgrim's Road | a pilgrim | the Wildwood cleared | 3 waves of the Wildwood with a healer (the Cleric, the Wanderer, the Druid or the High Priestess) | 200 crowns, 2 Hearthsalt, 2 Mossjade |

## Art (placeholders, keys in `src/questArt.ts`)

`FACES` (the givers' portraits), `GWEN` (her sheet) and `BOARD`. Gwen is composed from LPC layers, the passersby are the Tiny RPG Town
pack's faces, the board is Craftpix's field-work Quest Board; `tools/quests/cut.py` cuts them (CREDITS.md). When the owner's painted
givers (`art-source/eidolons/givers/*.png`) and board papers (`board/*.png`) land, they replace these keys; the board's papers can then
be pinned one per offer.

## Checked

`npm run typecheck`; `npm test -- quests` (14 tests: offers, determinism, slots and days, the owned-hero rule, the limit, goals and
riders, settleRun and hand-in, losing, the fight's facts, tracking, saves and old saves, the fight's stream untouched); the full
`npm test`; `npm run web`. Screenshots by `tools/quests/shots.mjs` at 393x852, 360x780 and 412x915 (reduced motion):
`docs/samples/quests-1-{tavern,offer,log-active,log-board,chip,ready,handin,log-done}-<width>.png`.

## Changed from the design, or left open

- The design's first set lists three passersby's quests; batch 1 asks for six in all, so Word from the Capital (duo combos, which need
  level 30 ultimates) waits.
- The passersby have no walking figure yet (the camp's ledge is batch 8): their offers show on the log's Board tab, and they are
  handed in from the log.
- "Not now" leaves an offer on the board until it expires; there is no way to drop a quest taken (the design names none).
- The tracked chip sits in the command bar's top row, not on the scene's foot: there the Last Stand's and the Daily's plates are.
- The board shows its pack picture with its own three papers and one "!" for any offer, until the painted papers can be pinned per offer.

---

# Quests, batch 1b: repeats, drops, and the hundred and thirty quests

The owner's decisions: "Quests should repeat: yes. Then let's go through adding 100 unique quests and 30 repeatable ones." and "A way to
drop a quest you've taken: yes." With the director's ask that the quests feel unique and varied (goals, stories and rewards). Every
existing fight still plays out the same: nothing new draws from a fight's streams.

## Repeats and drops (`src/sim/quests.ts`)

- **Repeatable quests** (`QuestDef.repeat`, a cooldown in days, 1 to 3): handed in, a repeatable goes on counting (`QuestState.times`,
  `timesDone`) and waits its cooldown from the hand-in's date (`QuestState.last`, `cooledDown`), then may be drawn again like any offer
  (seeded, never rerolled). The Done tab keeps one row for it, moved to the top each time, with its count ("×3"); the Board row says
  "repeatable, done 3×". A repeatable's chest seed takes its count, so each chest differs. A giver's day draw goes to their unique
  quests first, with `REPEAT_SHARE` (30%) of draws for their repeatables while both are open (`pickOffer`).
- **Dropping** (`dropQuest`): the Active tab's **Drop** turns the row into a confirm ("Drop it? Its progress is lost..." with **Drop
  it** and **Keep**). A dropped unique is not done: a later day's draw may offer it again, from nothing. A dropped repeatable waits its
  cooldown, as after a hand-in, and its count does not go up. A pinned quest dropped is unpinned.
- **Saves:** `times`, `last` and `drawn` (below) are new optional fields of `Meta.quests`, read safely by `readQuests`; a batch 1 save
  loads as it was. Not a version bump.

## The givers and how their offers reach the player

Each giver has a slot (`SLOT_RULES` in `questData.ts`; `SLOTS` keeps batch 1's two first, so their streams are unchanged):

| Slot | Givers | On the board | Where else |
| --- | --- | --- | --- |
| `gwen` | Gwen Tallow | 3, one new a day, 3 days | her card behind the bar (and now and then a remark on a quest you did for her, `GWEN_REMARKS`) |
| `notice` | strangers' notices (the board itself) | 2, one new a day, 3 days | the board (face: the board) |
| `passerby` | the pedlar, the pilgrim, a royal messenger, a frost-bitten hunter | 1 a day, gone at midnight | board only (their walk across the camp's ledge is batch 8) |
| `patron` | the player's own heroes (`QuestDef.hero`) | 2, a new draw every 2 days (`every`), 2 days | **in the tavern:** the hero wears the gold "!" (a tick once done); a tap on them opens their card in their name, title and painted portrait |
| `royal` | the chosen ruler ("By my word") | 1, a new draw every 7 days, kept 7 days | board only (the throne's place is the Castle tab's, later): the card shows the chosen ruler's name and picture, and their lines say "the queen" for a queen (`rulerWords`) |
| `duchess` | Duchess, once met (tapped, her bleat or her haystack) | 1, every 3 days, 2 days | **in the tavern:** the "!" over her; while she has one, a tap on her is her card (else her hat, as before) |
| `spoils` | found on a fallen army boss | 1, kept 5 days | **after a fight:** `offerAfterFight` (from `settleRun`): an army boss wave won turns up spoils about one time in three (`SPOILS_CHANCE`), only from the quests whose `from` names a boss felled in that fight; a toast says "Spoils found: ... · see the quest board" |
| `rift` | the voice in the rift | 1, kept 5 days | **after a fight:** a Calamity guardian felled (`calBoss1` to `6`), about one in two (`RIFT_CHANCE`) |

The after-fight draws are from their own side stream (`AFTER_SALT`, the run's seed, the wave and the slot), so the same fight finds
the same thing, and they are dated the day the board was last drawn (nothing before the tavern has been seen). The board (the log's
Board tab) shows every offer with its giver's face and where it came from ("Tiago, in the tavern", "The King · a Royal charge",
"Spoils, found on a fallen boss", "A voice in the rift", "A pedlar, passing today"); every offer, from any giver, can be taken and
handed in from the log, so none is unreachable. Faces: the patrons' painted portraits (`heroes/<kind>-portrait.webp`), the ruler's
picture (`RULER_URLS`), the messenger and the hunter from the Tiny RPG Town npc sheet (`tools/quests/cut.py`), Duchess from her own
goat sheet, the board for the notices, and two gear icons for the things: a star chart (spoils) and a rift shard (the rift).

## Goals and riders

Goal kinds now (`Goal` in `questData.ts`, counted by `goalGain`): `wavesWon`, `bossDown`, `kills` (a family, some kinds, an army's
foes `ofArmy`, or any), `clearDaily`, `clearArmy`, `tally` (dealt, healed, taken or kills, by heroes who fit `by`), `ults`, `spells`
(or only some), `duos`, `teamCombo` (a five-hero combo, or one in particular), `mvp`, `calGuardian` (a Calamity guardian, on map N
or later), `calClear`, `standWave` and `standRoom` (bests: the furthest run counts, `BEST_GOALS`), `holdLine` (holds of the line won,
summed).

Riders (`Cond`, on any fight goal, any mix): `army`, `mode`, `tier` (an army run on that tier or harder), `stage`, `with` (one of),
`all` (every one of these heroes: a pair who quarrel), `only` (every hero fielded fits: only the dead, only spellcasters, only yokai),
`most` (at most N fielded), `flawless`, `quick` (won within N seconds), `lowHp` (a hero ends the won fight on a quarter of its health
or less), `ultsIn` (N ultimates in the one fight), `spellsOnly` (the king cast some, and only these: the healing ones), `noSpells`,
`boss` (one of these bosses felled).

**What the game hands the goals** (`QuestFight`, `questFightOf`): batch 1's facts plus the mode, tier and wave, the bosses felled, the
fight's length (`b.t`), a hero left on low health, the king's spells (the fight's own `b.log`), the duo combos (`b.duoCombos`'
counts), the five-hero combo (`b.combo.fired`), the Calamity guardian's map (from the felled `calBossN`), a run cleared; and from the
page (`settleRun`'s new optional `stats` and `ults`): the heroes' tallies (the result screen's `FightStats`) and their MVP, and the
ultimates fired (`ultsIn` picks them from each tick's `skill` events, as the ultimate's moment does). The Last Stand's end passes its
best wave, its act and its holds of the line (`standFight`); a new count, `StandRun.holds` (and `StandSummary.holds`), counts every
bonus wave won, with a relic or not (`clearHold` in `stand.ts`).

**Needs** (when a quest may be offered) added: `level` (a hero at that level), `tier` (any army cleared on that tier or harder),
`mode` (the Last Stand or the Calamity open), `duchess` (met), `spell` (known), `all` (several). `QuestDef.after` holds a story's next
part until the part before is handed in. The owner's rule (`heroesOwnedFor`) now reads every rider and a patron's own hero: `with`,
`only` and a goal's `by` need one owned hero who fits, `all` needs every one of them owned, a named five-hero combo all five, and a
patron's quest its patron.

## The hundred and thirty quests (`src/sim/questData/*.ts`)

One file a giver: `gwen.ts` (20, and `GWEN_REMARKS`), `notices.ts` (12), `road.ts` (the pedlar 6, the pilgrim 6, the messenger 6, the
hunter 7), `patrons.ts` (18 heroes: Kwame, Kenji, Natsu, Minh, Ayame, Ravi, Selam, Itzel, Tiago, Harrow, Hideo, Eirik, Zofia, Hobb,
Maeve, Rook-7, Vesper, Edmund; the six starter heroes each have one, so both packs have patrons from day one), `royal.ts` (8),
`spoils.ts` (7), `rift.ts` (6), `duchess.ts` (4), and `repeat.ts` (the 30 repeatables: Gwen 6, the board's standing bounties 8, the
pedlar 3, the pilgrim 3, the hunter 4, the messenger 2, the rift 2, Duchess 2). Batch 1's six keep their ids and words.

- **Goal kinds of the 100 uniques:** wavesWon 24, bossDown 17, tally 10, kills 7, mvp 7, clearArmy 7, spells 5, standRoom 4, ults 4,
  calGuardian 4, clearDaily 3, holdLine 2, standWave 2, duos 2, teamCombo 1, calClear 1. Counted by shape (kind and riders, numbers
  aside), the commonest is "an MVP of a kind" (7); a test keeps every shape at 12 or fewer.
- **Moods:** funny 26, heroic 16, warm 14, petty 12, eerie 11, mysterious 11, sad 10.
- **Stories in parts (14 links):** the carter, his daughter, his wheel for the wall; the dog's bones, then the Lich King; Sir Pounce
  lost, then the wrong cat found; the pilgrim's road, the shrine bell, the last mile; the sealed orders, then unsealed; the hunter's
  tracks, the white wolf, the last hunt; Tiago and Harrow's ship, then their rum; the ruler's banners, then the feast; the rift's
  "wait", "now" and the last door; Duchess's hat, then her second hat. Gwen remarks on 16 of hers when she has nothing on offer.
- **Pace:** 13 need nothing, 8 the Orcs cleared; the rest open with armies cleared (1 to 6), a hero's level (30, for ultimates and
  combos), a tier, the Last Stand (12 stars) or the Calamity (16 stars). A test checks every stage of a save, with either starter pack,
  has at least five uniques open, one of Gwen's and a passerby's; late in the game over 80 are open at once, so the board keeps changing.
- **Rewards:** crowns in 98 of the uniques (mean 350, 100 to 1,200 by difficulty), stones in 37, chests in 25 (bronze to gold), rift ores
  in 24, XP tomes in 11, a hero's shards in 9 (a fitting hero: the pilgrim's cleric, the hunter's ranger Inti, Tiago's Skerry, the
  choir's wolf bard, Selam's high priestess, the ruler's heir Bataar, Zofia's Adaeze, the Oni mask's kitsune, Itzel's own), and a
  keepsake in 30 (words, shown at the hand-in and in the Done tab: "The carter's spare wheel", "A Lich King's finger bone (chewed)").
  Shards were paid only by stones and the armies' rare drop; the owner's ask for quest rewards adds `quests.ts` to that list
  (`summon-stones.test.ts` updated to match).

## The economy check

Crown income for a daily player, from the unlock-pace model (`tools/unlockPace.ts`, first seed, one day's crowns): day 1 about 1,300,
day 7 about 1,270, day 30 about 3,400, day 90 about 9,700, day 180 about 19,700. The chest shop sells up to 32 stones a day.

- **A day of repeatables:** they pay 93 crowns and 0.67 stones on average (60 to 180 crowns; at most 2 stones; never a chest or shards).
  With the log's three places all on repeatables (the most a day can hold, and only when the board offers three), a day adds about
  **280 crowns and 2 stones**: about a fifth of day 1's income, a twelfth of day 30's, a thirtieth of day 90's; the stones are a
  sixteenth of what the shop can sell a day.
- **The uniques**, once each: 34,960 crowns and 106 stones over the whole game (plus their chests, ores, tomes and shards), about what
  three or four days bring in by month three, spread over months by their needs. Each pays about what an achievement or a first army
  clear's share does, as the design asked (100 to 600 for most; the late Royal charges and the Legendary road up to 1,200).

## Quest battles for batch 2 (ideas, not built)

- **Two Blades on the Bridge** (Kenji and Hideo): the design's worked example; Hideo's "Holder of the Bridge" (built here as holding the
  line) is its prologue.
- **Salt and Cannon** (Tiago and Harrow): a sea-cliff fight against drowned pirates; follows "Who Pays for the Rum".
- **The Cellar Door** (Gwen): the thing knocking in her cellar, at last; a small room, two heroes, waves out of the dark.
- **The Wrong Cat** (the notices): the burning cat's mother comes looking; win without felling her (a protect-and-calm fight).
- **The Swept Floor** (the pilgrim): the heart of the Labyrinth and whoever sweeps it.
- **The White Wolf's Den** (the hunter): before "The Last Hunt", the den itself, with snow on the board.
- **The Small Print** (Zofia): her patron's auditor arrives to collect; only casters may fight.
- **The Recital** (the notices): the chapel at midnight, the dead as an audience that must not be woken.
- **Karnok's Door** (the rift): the voice's last door as a fight of its own, not the Calamity's map.
- **The Red Horns** (Duchess): she wants the Oni King's horns, and Duchess fights.

## Checked (batch 1b)

`npm run typecheck`; `npm test -- quests summon-stones` (the 14 tests of batch 1, three of them updated for the new slots (a fresh save
and an old save now also see the notices and the patrons; the passersby are told apart by slot, not "not Gwen"), and
`quests-content.test.ts`: 25 tests: the data whole, words not repeated, British spelling, the goals' spread, the givers, the rewards,
repeats and cooldowns, drops, the save's new fields, every slot's rhythm, the patrons' and Duchess's rules, the owner's rule on every
rider, the needs and the stories' order, spoils and the rift after a fight, every rider and goal kind, the fight's facts, `ultsIn`,
`settleRun` with the page's tallies, the rewards, the pace at every stage, the limit of three); the full `npm test`; `npm run web`.
Screenshots by `tools/quests/shots2.mjs` at 393x852, 360x780 and 412x915 (reduced motion):
`docs/samples/quests-2-{tavern,hero-offer,board,board-more,drop,dropped,done}-<width>.png`.

A fix found by the screenshots: a long board squeezed its rows into each other (the list's rows shrank to fit); they keep their height
now and the list scrolls (`.qlRow { flex: none }`).

## Left open

- The passersby still have no walking figure, the ruler's charges no seat at the throne (the Castle tab), and spoils no card on the
  victory screen: their offers reach the player on the board (and a toast for spoils and the rift). Gwen, the board, the patrons and
  Duchess are in the tavern.
- Keepsakes are words (in the Done tab and the hand-in); a shelf or the trophy wall could show them when there is art.
- The goal kinds the design lists that wait: `visit` (a tap on a place), `duchess` (her lucky bleat: she joins one fight in a thousand,
  too rare for a goal), and the spire's floors (the spire is the Last Stand now).
