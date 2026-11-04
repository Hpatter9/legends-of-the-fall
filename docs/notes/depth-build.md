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
  - `shelter` (behind: Boar King, Gorgon Queen; water: Devil Leader, Demon Lord, guardian 1; high ground, two steps up: Alpha Werewolf;
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
