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
