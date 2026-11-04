# The depth build (DEPTH-BUILD)

The build of the approved depth design (`depth-design.md`, all eighteen recommended answers). It goes in the design's order, in batches,
each with its tests. This note says what each batch built, what it measured and what is left.

## Batch 1: the castle's rooms

- **Rooms** (`src/sim/rooms.ts`): seventeen rooms, each `{ id, building, level, name, line, icon }`, at the fixed levels of the design's
  table. `roomOpen(castle, id)` is the only question the rest of the game asks. No room does anything yet; each is wired in its own batch.
- **Three new buildings** (`ROOM_BUILDINGS` in `castle.ts`): the Smithy (3 levels: 150, 400, 900 crowns), the Watchtower (3: 120, 350, 800)
  and the Hall of Legends (4: 600, 1200, 2000, 3000). They give no number of their own, only rooms. Their build times are the usual table.
- **The Chapel is levelled** (3 levels: 200, 450, 1000). Level 1 is the old purchase and takes as long as before; levels 2 and 3 take one
  step longer than a building's (20 minutes, 1 hour). The level lives in `castle.chapel`; `Meta.chapel` is kept as the flag the spellbook
  reads, set whenever the level is 1 or more.
- **Saves:** the new levels are optional keys of `Castle`. `readCastle` keeps them only when built, so a castle from before reads with
  exactly its old keys (and the tools that loop over a castle's keys see what they did). `loadMeta` reads `chapel: true` as Chapel level 1.
  `readWorks` accepts the new sites. `startSite` raises any site; `siteLevel`, `siteNextCost`, `siteTop`, `siteName` answer for any site.
- **The page:** the castle page's chamber grid gains the three buildings' cards (pictures from the isometric kits: the workshop, the
  watchtower, the longhouse, until their own are made), and every card with rooms gets a **Rooms** strip (names only in the grid; each
  room's line on the building's own card). A raised level's popup names the rooms it opened ("The Smithy's Field Anvil is open").
  The castle page no longer draws the courtyard plots (it is the throne room and its cards), so the design's "new plots" batch is these cards.
- Tests: `test/rooms.test.ts`. Shots: `node tools/depth/shots.mjs castle` and `card-smithy` (`docs/samples/depth-*`).

## Batch 2: bosses you learn

- **Weaknesses** (`src/sim/weakness.ts`): all 25 bosses with signature attacks have one (Q7.3), made of four rule shapes:
  - `breakWindup` (Orc Chieftain, Orc Warlord, Minotaur Champion, Oni King, Calamity guardian 4): a stun or freeze laid while its great
    attack is marked breaks it: the attack is lost and the boss is dazed 2 s. (Noted as the windup begins: `BossWarning.stun0`.)
  - `cracks` (Bone Captain, Lich King, Shaman King and guardian 3 to devout heroes; the Grove Spearlord to arcane; the Nine-Tailed Fox to
    wild; Karnok to eight martial blows): so many blows from heroes of a calling crack its guard; it takes 15 to 25% more harm after.
  - `shelter` (behind: Alpha Werewolf, Gorgon Queen; water: Devil Leader, Demon Lord, guardian 1; high ground, two steps up: Boar King;
    tall grass: Wood Raider): heroes standing there are untouched by its great attacks.
  - `sapped` (burn: Thorn Warden, Sapphire Colossus, guardian 2; chill: Horned Ogre, Forge Titan, guardian 5): while it suffers the
    ailment its great attacks land at half.
  - It is always in the rules (Q7.1). A use is noted in `Battle.exploited` and a `weakness` event, which the page shows as a gold
    "Weakness!" over the boss (one every 1.5 s at most). `WEAK.on` is the switch for tools and tests. No stream is drawn from.
- **Learning:** `Meta.weak?: Record<boss, { clues, marks, escorts? }>` (optional; `readWeak` cleans it). `noteWeakness` (from `settleRun`,
  beside `noteFoes`; not for a quest's stand-in): meeting the boss writes clue 1, 50 of its escorts felled (foes that fell on a board where
  it stood) clue 2, and each loss to it (lost with it standing) one more, up to 3. The Library's **Archive** writes any clue found in full.
- **Marks:** a win with the weakness used earns its Hunter's mark for the run's tier (0 Normal to 4 Mythic; other modes count as Normal),
  once; the first mark of a tier pays the trophy drop's crowns (`MARK_CROWNS`: 40, 60, 90, 130, 180, until the economy design's table
  lands); all five give its trophy (the recap line says so). Marks are not army stars (Q7.2), so the army pace does not move by them.
- **The page:** the codex's boss page gains a **Weakness** block (each clue written or a dark bar saying how to learn more, and the five
  marks as badges); the boss's entrance card shows "Known weakness: ..." once the full rule is known; a clue or a mark found comes as a toast.
- Tests: `test/weakness.test.ts`. Shot: `node tools/depth/shots.mjs codex-boss`.

### Batch 2 measure (the bosses' weaknesses, the bot that does not seek them)

`node tools/army-pace/run.mjs cell orcs:1 undead:8 beasts:15 wildwood:22 labyrinth:35 ogres:45 infernal:58 yokai:65 golems:74`, with
`WEAK=0` (new switch) and without; mean tries to clear each army's Normal at its recommended level, 12 saves:

| Army @ level | Without | With |
|---|---|---|
| Orc Warband @ 1 | 2.0 | 2.0 |
| Undead Legion @ 8 | 3.3 | 2.9 |
| Beast Packs @ 15 | 1.6 | 1.6 |
| The Wildwood @ 22 | 1.0 | 1.0 |
| The Labyrinth @ 35 | 2.3 | 2.3 |
| Ogre Clans @ 45 | 2.3 | 2.3 |
| Infernal Host @ 58 | 10.8 | 10.8 |
| Yokai Night Parade @ 65 | 21.5 | 21.1 |
| Golem Forge @ 74 | 9.4 | 9.8 |

The Undead Legion moves most: the recruits' party has two devout heroes (Paladin, Cleric), so the Lich King's and Bone Captain's guards
crack in most fights. 0.4 tries is inside the bar (no army's mean tries falls by more than one), so no boss's health was raised.

## Batch 3: march orders

- **Rules** (`src/sim/march.ts`): the five tiles (Plain, Cursed, Scouted, Night, Forced) and `Run.orders?: { mod, curse, ... }` (optional;
  `readOrders` drops odd values; a run saved before is a plain march).
  - **Cursed** (opens with the army cleared at the tier): foes +20% health, one heart instead of two (`heartsLost` in `retriesLeft`), and a
    curse drawn from the run's seed by its own side stream (`0x6d61`): *Withered Hands* (the heroes' healing halved, the stage's `heal`),
    *Unbroken* (the final boss's second form at 65%) or *Empty Stalls* (no passing cart on the road: the army road has no mid-boss shop
    of its own, so this is the nearest thing; the drawn card is dropped, the stream untouched). Pays crowns and XP x1.4 and one extra chest
    on a clear (side stream `0x6d62`), and the tier's **laurel** (`ArmyRecord.cursed`). Stars are earned as usual (Q5.2).
  - **Scouted** (Watchtower 1, Lookout): the scouts' report after March names the final boss, its two great attacks and its weakness, and
    the boss's entrance card shows the weakness for that run. Crowns x0.9. (The design's "every wave's foes shown before it" is Far Sight's,
    not yet built.)
  - **Night march** (Watchtower 2, Night Watch): `Battle.night`, fixed at the fight's start: a shooter standing below height 2 reaches a
    tile less (in `strikeDef`, beside fog); foes heal half (`Battle.foeHeal`, the foes' side of `healMult`). A moonlit chest on a clear.
    The design's "Tricksters and Yokai act 10% faster" is left out for now; no night grade on the battle's look yet (art list).
  - **Forced march** (army cleared at the tier): waves 4, 6, 11 and 13 skipped (`finish` steps over them; their gold is not paid). XP x0.8.
  - Pay: `marchCrowns` adds the difference to the wave's pay once (the page, after `settleWave`); `marchPay(...).xp` multiplies the fight's XP.
- **The page:** `src/marchCard.ts`, a sheet that rises after the party is picked, only once some modifier is open (a new player never sees
  it; an auto replay marches plain). Tiles in two columns (three from 400 px), locked ones with their lock line, the cursed tile names the
  run's curse. In the run, a badge beside the hearts (a cursed run shows one heart); a tap says the orders.
- Tests: `test/march.test.ts`. Shots: `node tools/depth/shots.mjs march`, `march-report`.

## Batch 4: the Chapel's and the Library's rooms

- **Vigil** (Chapel 2; `src/sim/chapelRooms.ts`): chosen on the march card (a second row of three tiles, Shielded by default; the card
  now also comes up when only the Vigil is open) and kept in `Run.orders.vigil`. When a heart burns the page calls `applyVigil` after
  `reviveParty`: Shielded (a shield of 15% of health), Swift (hasted 4 s) or Cleansed (every ailment gone).
- **Last Rites** (Chapel 3): an army run that has not spent it starts each fight with `Battle.rites` (the stage's `rites`). The first
  hero to fall is marked (`ritesFall`, from `hurt`) and rises at 15% of its health 10 s later (`tickRites`); `noteFight` keeps
  `Run.ritesUsed`, so it comes once a run. If the whole party falls inside those 10 s, the wave is lost as before.
  - **Measured** (`CHAPEL=3`, new switch in `tools/army-pace`; mean tries at each army's recommended level, 12 saves): at the design's
    numbers (a quarter of health after 5 s) the Yokai fell from 20.9 to 17.7 tries and the Golem Forge from 7.7 to 6.2, past the bar of
    one. Softened to 15% after 10 s: Yokai 20.9 → 20.9, Golem Forge 7.7 → 6.8, Infernal Host 11.8 → 10.7, the rest within a few tenths.
    (`RITES_HP` / `RITES_MS` try other numbers.)
- **Reading Room** (Library 2): `queueStudy` / `unqueueStudy` and `Meta.studyNext` (optional): a student queues its next book (the copy
  leaves the bag at once); `settleStudy` starts it, with any kept progress, when the first is learnt. The book page's reader gains
  "Queue next" and the queued row.
- **Scriptorium** (Library 5): `crossOk`: one book of another calling a hero (never a lost technique), which `slotFor` teaches at
  `CROSS_TUNE` (0.75) of its strength. The reader marks such a book.
- **Left for later:** the Smithy's three rooms wait for the gear build (`claude/gear-build`), which is changing wear and the slots now;
  the Mage Tower's Spell Lectern needs a mid-run spell swap the page does not have yet.
- Tests: `test/chapel-rooms.test.ts`, `test/library-rooms.test.ts`.

## Batch 5: hero bonds and rivalries

- **Rules** (`src/sim/bonds.ts`): 40 kindred pairs (the eight duo combos and 32 written from the heroes' stories) and 15 rival pairs.
  `Meta.bonds?` (points by pair key, the two kinds in alphabetical order), `Meta.bondSettled?`, `Meta.bondScenes?` (all optional).
  `noteBonds` (from `settleRun`, army runs only): a won wave gives every pair placed together a point. Levels at 10 / 40 / 120 / 300 / 600;
  a pair that is not kindred stops at 2 (Comrades). Rivals who win 10 waves together settle into a kindred pair at level 1.
- **In the fight:** the run keeps a snapshot as it starts (`Run.bonds`: each pair's level, -1 for rivals; the page takes it in
  `startRun`), the stage carries it, and `startBonds` fixes the placed pairs as the fight starts. `tickBonds` sets each hero's
  `bondAtk` / `bondCd` for where it stands (two tiles, the same walking distance the rest of the fight uses): Comrades +3% attack,
  Shieldmates +6% and skills 5% quicker (`cdOf`), rivals' skills 10% slower. Sworn (3+): once a wave, a blow that would fell one has 20%
  of it taken on the partner's guard, never felling the partner (`bondCover`, in `hurt`). A rival who sees the other fall fights 10% harder
  for the rest of the wave (`bondFury`). The formations design adds no adjacency rule of its own, so there is one distance and one drawing.
- **The page:** the hero sheet's **Bonds** block (three strongest partners, rivals marked, "All bonds" for the rest); a **Bonds** chip at
  the end of the deploy board's trait strip, a tap for each pair's words; a level risen or a rivalry settled comes as a toast after the
  wave. The gold thread and red spark on the board itself, the tavern seating, the Sparring Yard and the scenes are still to come.
- Tests: `test/bonds.test.ts`. Shots: `node tools/depth/shots.mjs bonds-sheet`, `bonds-deploy`.
- **Scenes, batch 1** (`src/sim/bondScenes.ts`): the first ten kindred pairs' level-1 scenes (the eight duo pairs, Knight and Paladin,
  Archer and Ranger), drafted for the owner to read: one backdrop, the two walk on, four or five lines, a push in for the last word. A new
  moment kind (`{ kind: 'bond', pair, level }`, its key carries the level), the family "Bonds between heroes" in the Scenes list. The
  page plays one due scene when the camp or the castle opens (`HomeHooks.onOpened`). Levels 3 and 5, the rest of the pairs and the
  settling scenes follow in batches of ten. Shot: `node tools/depth/shots.mjs bond-scene`.
