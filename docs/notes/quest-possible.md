# QUEST-POSSIBLE: the "no hire" rule, and every quest checked against the game as it stands

Branch `claude/quest-possible`. The owner sent a screenshot of Askel's Part 3 of 5, "The Kennel-Master's Bell" ("Fell the Bone Captain on
Hard, with no hero hired in the run"), and asked whether it was fixed. It was not. No quest with that rule could ever be done.

## The bug

`noHires` failed when `QuestFight.hires > 0`, and `hires` was `run.summons`. An army run starts with no hero and the gold for two Hires
(`armyRun`), and every hero put on its board is bought with Hire (`summon`, `run.summons++`). So every army run had hires above 0. Played to
check: `test/quest-no-hires.test.ts` buys a Hard Undead Legion run's squad with Hire, fells the Bone Captain and settles the fight as the log
reads it. Before the fix `hires` was 3 and the Bell's goal failed. The audit (below), put back on the old rule, finds all 8 quests that use it
broken.

## The rule, as it was meant

The words ask for no outside help: Askel's Summoner "was never one for hired hands", the proving quest "no foot-soldier hired", the
treasurer's "hired swords, an expensive sort of friend". So `noHires` now reads **outside help hired** in the run, a new fact kept on the run,
`Run.hired` (optional: a run saved before it counts none, and junk is read as none, `catalogueRun`). It is counted by `noteHired` when:

- the passing cart's **sellsword** is bought (`events.ts`, `hire`);
- the cart's **guest** is hired (`events.ts`, `guest`);
- a **deserters' captain** is paid his wages (`midEvents.ts` `applyRoad`, `hire`).

The party's own heroes bought with Hire do not count. A tavern regular who rides along as a guest for nothing (`main.ts`, `takeGuest(run,
ride, 0)`) is not hired at the cart and does not count either (a call for the director, below). The fact is deterministic: counted only
where the player buys, and read from the run. A quest already in progress on an old save keeps its count and now progresses.

## The words

Each of the 8 quests says "no sellsword hired at the cart", in its giver's voice (the goal's line, and the offer or the Summoner's words where
they named hiring): `folly2Undead` (Pim), `taxQuiet` (the treasurer), `provShoestring` and `provBareKnuckles` (Oswy), and the Eidolon parts
`askel3`, `aurelan5`, `voltara5`, `gorm5`. The rule chip (`questGoto.ts`) says "No sellsword hired at the cart".

The audit also found two chips that did not say what the rule needs:

- **"No king's spells" and "No ultimates in this fight"** now add "(SPELL Auto off)" and "(ULT Auto off)". A new save starts with SPELL
  Auto on, and the Auto switches cast for the player, so a `noSpells` goal (31 in the game) failed silently for a player who left Auto on.
  The quests can be done with the switch off; the chip now says so. (`test/quest-rules.test.ts`'s expected chip follows the new words.)
- **"All in one army run"** said "army" for a one-run daily quest (`hardBread`: all ten waves of one daily). The log's one-run rule
  counts in any one run, so the chip now says "All in one daily" there.

## The audit: `tools/quest-audit/audit.ts`

`npx esbuild tools/quest-audit/audit.ts --bundle --platform=node --format=esm --outfile=out/quest-audit.mjs --loader:.png=empty --loader:.webp=empty && node out/quest-audit.mjs [--md]`

It checks every quest as the player sees it (with its retune and, while the modes are hidden, its hidden-mode patch), each of its
objectives, and every Eidolon chain part, by rule against the game's own tables:

- **Things that exist:** armies, tiers, heroes (`with`, `only`, `by`, `all`, `without`), foes, foe families, spells, combos and quest battles.
- **Waves and bosses:** a named boss is a boss of the army asked (and of a wave at or after the `stage` asked); no `stage` beyond the
  waves a run has (15, or the daily's 10).
- **Riders that cross:** a goal counting what a rule bars (ultimates with `noUlts`, spells with `noSpells`); ultimates under a level cap
  below 30; heroes asked for and barred; more heroes together than `most`, `exactly` or the field allow; `with` and `only` sharing no hero.
- **One run:** a one-run count more than a run holds (waves, the army's bosses, clears, dailies).
- **What the save may not have yet:** spells only the Chapel sells (10 stars) asked by a quest that may come sooner; ultimates (level
  30) asked by a quest that may come sooner.
- **Hidden modes:** a quest or chain part that needs the Last Stand or the Calamity. These are not offered while the modes are hidden
  (`questShown`, `chainListed`): "hidden" in the table.
- **Tried against the sim:** a real Hard army run, its squad bought with Hire, its wave-8 boss felled and settled as the log reads it;
  every quest with the "no sellsword" rule must pass it.

It exits 1 if any quest is broken. Recent changes checked: no goal reads formations, the Castle's 6 stars, skills or the Assault; the SPELL
and ULT Auto switches are the chips above.

**Result: 413 checked: 346 can be done, 65 wait with the hidden modes, 2 need a call, 0 broken** (8 broken before the fix).

## For the director's call

1. **`lichsLetter`** (the Lich King's spoils, needs nothing): "The king casts Resurrect 12 times in Hard or harder army runs". Resurrect is
   bought at the Chapel (10 stars). The Lich King falls in the second army, so the quest can come well before a save can cast it. It is
   not impossible, since it waits in the log, but it may sit there a long time. Add a `{ kind: 'spell', id: 'resurrect' }` need?
2. **`voltara3`** (the Dry Storm, opens with the Labyrinth cleared): "Fire 6 ultimates in army fights where no king's spell is cast".
   Ultimates open at hero level 30, and the Labyrinth is set for hero level 16 (`docs/notes/difficulty.md`). It can be done once a
   hero reaches 30. Leave it, or gate the part on level 30?
3. **A tavern regular riding along** as a free guest: counted as no outside help hired (it was not hired at the cart). Say if it should
   count.
4. **SPELL Auto against `noSpells`:** the chip now tells the player to turn it off. Should a fight that counts for a taken `noSpells`
   quest turn Auto spells off by itself instead?

## Checks

- `test/quest-no-hires.test.ts`: the party's Hires are not hired help and the Bell is met; a sellsword, a guest and a deserters' captain
  each count, a resumed run remembers and junk reads as none; the chip's words.
- Full suite: 3056 pass, 0 fail. Typecheck and `npm run web` pass.
- `node tools/quest-audit/shots.mjs`: the Eidolons tab on Askel's Part 3 at 393x852, 360x780 and 412x915 shows the new words with nothing
  wider than the page (`docs/samples/quest-possible/`).

## Every quest checked

| Quest | Kind | Goal | State | Why |
| --- | --- | --- | --- | --- |
| `cartersWheels` The Carter's Wheels | gwen | Win 3 waves of the Orc Warband with Kwame or a Guardian on the field | ok |  |
| `roundForTheHouse` A Round for the House | gwen | Win 10 waves, in any mode | ok |  |
| `boneCollector` The Bone Collector | gwen | Fell 300 skeletons, in any mode | ok |  |
| `quietHands` Quiet Hands | gwen | Beat the Undead Legion's boss on Hard or harder with no hero falling | ok |  |
| `cartersDaughter` The Carter's Daughter | gwen | Win 6 waves with three heroes or fewer on the field | ok |  |
| `wheelForTheWall` A Wheel for the Wall | gwen | Your Guardians or Bulwarks take 100,000 damage, across fights | ok |  |
| `dogsSecondCourse` The Dog's Second Course | gwen | Beat the Lich King 3 times on Hard or harder, no hero falling | ok |  |
| `knockingCellar` Knocking in the Cellar | gwen | Fell 80 foes in the daily challenge, 3 days running | ok |  |
| `lastOrders` Last Orders | gwen | Win 3 waves on Hard or harder, each in 25 seconds or less | ok |  |
| `kenjisTab` Kenji's Tab | gwen | Kenji is the MVP of 10 wins, with three heroes or fewer on the field | ok |  |
| `cellarDoor` Hold the Kitchen Door | gwen | Hold the line 3 times at the Last Stand, and reach the chapel having held on the way | hidden |  |
| `brothersPatrol` My Brother's Patrol | gwen | Win 12 waves of the Wildwood with no hero falling | ok |  |
| `slateBehindTheBar` The Slate Behind the Bar | gwen | Your heroes deal 90,000 damage, across fights | ok |  |
| `smokeTheBees` Smoke Out the Bees | gwen | Cast Meteor, Meteor Shower or Poison Cloud 40 times, and fell 120 foes of the Beast Packs | ok |  |
| `longTable` The Long Table | gwen | Set off the Holy Order's combo 3 times in one run on Hard or harder, no hero falling | ok |  |
| `gwensLedger` Gwen's Ledger | gwen | Clear armies on Hard 3 times, no heart spent in any, within 7 days | ok |  |
| `twosCompany` Two's Company, Three's a Siege | gwen | Beat the Boar King with two heroes or fewer, no ultimate fired | ok |  |
| `nightWatchKeep` Night Watch at the Keep | gwen | Reach the library in a run of the Last Stand having held the line, and reach wave 18 | hidden |  |
| `bardsWager` The Bard's Wager | gwen | Fire 30 ultimates in fights where the king casts no spell, within 7 days | ok |  |
| `theLastLight` The Last Light in the Window | gwen | Win 3 boss waves on Elite or harder, no hero falling | ok |  |
| `lostSirPounce` LOST: Sir Pounce | notice | Win 4 waves of the Beast Packs with a Beast or Wild hero on the field | ok |  |
| `foundWrongCat` FOUND: One Cat (Wrong Cat) | notice | Win 10 waves in which the king casts only healing spells (Heal, Renewal, Cleanse, Resurrect) | ok |  |
| `wantedChieftain` WANTED: The Orc Chieftain | notice | Beat the Orc Chieftain 3 times, each in under 45 seconds, within 5 days | ok |  |
| `apprenticeWanted` Apprentice Wanted, Must Enjoy Fire | notice | Your casters deal 60,000 damage, across fights | ok |  |
| `choirAuditions` Choir Auditions | notice | A Holy, Warden or Support hero is the MVP of 8 wins | ok |  |
| `knifeInTheBoard` A Knife in the Board | notice | A Blade hero is the MVP of 8 wins on Hard or harder, with only Blades on the field and no spell cast, within 7 days | ok |  |
| `backRent` Back Rent, the Labyrinth | notice | Beat the Gorgon Queen or the Minotaur Champion twice on Hard or harder, no hero falling | ok |  |
| `midnightRecital` A Recital at Midnight | notice | Reach the chapel in the Last Stand having held the line, hold the line 3 times in all, and reach wave 20 | hidden |  |
| `missingTaxman` Missing: The Tax Collector | notice | Beat 3 bosses of the Ogre Clans | ok |  |
| `lostSpectacles` Lost: Spectacles, Wave Twelve | notice | Win wave 12 or later of the Labyrinth 10 times | ok |  |
| `scarecrowNeeded` Scarecrow Needed | notice | Win 8 waves with two heroes or fewer on the field | ok |  |
| `bellRinger` Wanted: A Bell-Ringer | notice | Reach the throne room in the Last Stand having held the line, reach wave 30, and hold the line 3 times | hidden |  |
| `freshBread` Fresh Bread for the Front | pedlar | Clear a daily challenge | ok |  |
| `pedlarsPans` Guaranteed Orc-Proof Pans | pedlar | Fell 200 foes of the Orc Warband, in any mode | ok |  |
| `clockworkSnuffbox` The Clockwork Snuffbox | pedlar | The king casts 40 spells in army fights on Hard or harder | ok |  |
| `lampOilKeep` Lamp Oil for the Keep | pedlar | Reach wave 20 of the Last Stand in one run | hidden |  |
| `bulkDiscount` Bulk Discount | pedlar | Clear the day's challenge, 4 days running | ok |  |
| `loadedDice` Loaded Dice | pedlar | A Trickster hero is the MVP of 8 wins | ok |  |
| `pilgrimsRoad` The Pilgrim's Road | pilgrim | Win 10 waves of the Wildwood with a healer on the field | ok |  |
| `shrineBell` The Shrine Bell | pilgrim | Fell 250 foes of the Undead Legion on Hard or harder, and win 6 of their waves with the king casting no spells | ok |  |
| `pilgrimsLastMile` The Pilgrim's Last Mile | pilgrim | Clear the Labyrinth on Hard or harder in one run, burning no heart | ok |  |
| `vowOfQuiet` A Vow of Quiet | pilgrim | Win 15 waves with the king casting no spells | ok |  |
| `lanternsForTheLost` Lanterns for the Lost | pilgrim | Your heroes heal 80,000 across fights, and win 6 waves of the Undead Legion with no hero falling | ok |  |
| `relicOfOswin` The Relic of St Oswin | pilgrim | Fell 3 Calamity guardians, no hero falling and the king casting no spells | hidden |  |
| `sealedOrders` Sealed Orders | messenger | Set off 12 duo combos, across fights | ok |  |
| `unsealedOrders` Unsealed Orders | messenger | Win 5 waves with at least 4 ultimates fired in each and no hero falling | ok |  |
| `messengersHorse` My Horse Threw a Shoe | messenger | Beat 3 bosses of the Ogre Clans on Hard or harder with no hero falling, within 6 days | ok |  |
| `dispatchForTheFront` A Dispatch for the Front | messenger | Win 20 waves with a Royal hero on the field | ok |  |
| `hardNewsForge` Hard News from the Forge | messenger | Clear the Golem Forge on Hard or harder in one run, no hero falling and no heart burnt | ok |  |
| `theCensus` The Census | messenger | Within 5 days: heal 50,000, fell 1,200 foes and set off 6 duo combos, across fights | ok |  |
| `tracksInSnow` Tracks in the Snow | hunter | Fell 300 foes of the Beast Packs, in any mode | ok |  |
| `theWhiteWolf` The White Wolf | hunter | Beat the Alpha Werewolf 3 times with no hero falling | ok |  |
| `colderAim` Colder Aim | hunter | A Marksman or Gunner is the MVP of 10 wins | ok |  |
| `snaresInTheWood` Snares in the Wood | hunter | Win 10 waves of the Wildwood in one run with a Frontier hero on the field and no hero falling | ok |  |
| `boarKingsTusk` The Boar King's Tusk | hunter | Beat the Boar King in 60 seconds or less, 4 times, within 6 days | ok |  |
| `longWinterNight` The Long Winter Night | hunter | Win 12 waves of the Yokai Night Parade in one run, no hero falling and the king casting no spells | ok |  |
| `lastHunt` The Last Hunt | hunter | Clear the Beast Packs twice on Hard or harder, burning no heart | ok |  |
| `kwameShieldPractice` Shield Practice | patron | Kwame takes 15,000 damage, across fights | ok |  |
| `kenjiCleanCut` A Clean Cut | patron | Beat 3 bosses in 60 seconds or less each, with Kenji on the field | ok |  |
| `natsuHighCrags` Eye of the High Crags | patron | Natsu is the MVP of 3 wins | ok |  |
| `minhOnTheEdge` Pitchfork at the Edge | patron | Win a wave with Minh on the field and a hero left on a quarter of their health or less | ok |  |
| `ayameNeverSeen` Never Seen | patron | Ayame fells 150 foes in fights where no hero falls | ok |  |
| `raviShowMeFire` Show Me Your Fire | patron | Fire Ravi's ultimate 5 times | ok |  |
| `selamLantern` Lantern of Mercy | patron | Selam heals 80,000, across fights | ok |  |
| `itzelGreyPack` The Grey Pack | patron | Win 10 waves of the Wildwood with Itzel on the field and no hero falling | ok |  |
| `tiagoSaltBetweenUs` Salt Between Us | patron | Win 12 waves with both Tiago and Harrow on the field | ok |  |
| `harrowWhoPaysForRum` Who Pays for the Rum | patron | Beat 3 bosses with Tiago and Harrow on the field, no hero falling and one left on a quarter of their health or less | ok |  |
| `hideoHoldTheLine` Holder of the Bridge | patron | Hold the line ten times at the Last Stand, within 7 days | hidden |  |
| `eirikRedAxe` Forty for the Saga | patron | Eirik fells 400 foes, across fights | ok |  |
| `zofiaSmallPrint` The Small Print | patron | Win 10 waves with only spellcasters on the field (Caster, Arcanist or Mystic heroes) | ok |  |
| `hobbUnburied` Among My Own | patron | Win 10 waves with only Undead heroes on the field | ok |  |
| `maeveSixShots` Six Shots, Thirty Seconds | patron | Win 10 waves in 40 seconds or less each, with Maeve on the field | ok |  |
| `rookCalibration` CALIBRATION PROTOCOL | patron | Your Machine heroes fire 30 ultimates across fights, and you win 6 waves with a Machine hero on the field and no hero falling | ok |  |
| `vesperLastHour` The Last Hour | patron | Beat 8 bosses on Hard or harder with Vesper on the field, within 7 days | ok |  |
| `edmundVerdict` The Unbending Verdict | patron | Clear any army on Elite or harder in one run with Edmund on the field, no hero falling and no heart burnt | ok |  |
| `royalBanners` By My Word: the Banners | ruler | Clear armies twice on Hard or harder | ok |  |
| `royalFeast` By My Word: the Feast | ruler | Win 30 waves on Elite or harder | ok |  |
| `royalLongNight` By My Word: the Long Night | ruler | Reach wave 30 of the Last Stand, and hold the line at an act's end 3 times, within 6 days | hidden |  |
| `royalRift` By My Word: the Rift | ruler | Clear the Calamity twice with no hero falling at the end, and fell 3 guardians on the third map or later | hidden |  |
| `royalTreasury` By My Word: the Leaky Treasury | ruler | The king casts 100 spells in Hard or harder army runs | ok |  |
| `royalHeir` By My Word: the Heir | ruler | A Royal hero is the MVP of 8 wins on Hard or harder, and fell 2 bosses there with a Royal hero on the field | ok |  |
| `royalThrone` By My Word: the Throne Room | ruler | Reach the throne room in a run of the Last Stand, having held the line on the way, and reach wave 25 | hidden |  |
| `royalLastKeep` By My Word: the Last Keep | ruler | Win 2 boss waves on Legendary or harder, no hero falling | ok |  |
| `warlordsMap` The Warlord's Map | spoils | Win wave 8 or later of the Undead Legion 3 times, with four heroes or fewer | ok |  |
| `chieftainsTally` The Chieftain's Tally Stick | spoils | Clear the Orc Warband twice on Hard or harder | ok |  |
| `lichsLetter` The Lich King's Letter | spoils | The king casts Resurrect 12 times in Hard or harder army runs | call | asks for resurrect, which a save learns only at the Chapel (10 stars), and the quest may come sooner |
| `gorgonsMirror` The Gorgon's Hand Mirror | spoils | Beat the Gorgon Queen 3 times with two heroes or fewer on the field | ok |  |
| `oniMask` The Oni King's Mask | spoils | Win 6 waves on Hard or harder with only Yokai heroes on the field | ok |  |
| `forgeCore` A Forge Core, Still Warm | spoils | Your heroes deal 600,000 damage in Elite or harder army runs, within 7 days | ok |  |
| `demonsContract` The Demon Lord's Contract | spoils | Fell 300 foes of the Infernal Host, in any mode | ok |  |
| `riftWait` The Voice Says Wait | rift | Fell 3 Calamity guardians on the second map or later | hidden |  |
| `riftNow` The Voice Says Now | rift | Fell 2 Calamity guardians on the fourth map or later with no hero falling | hidden |  |
| `riftNames` It Knows Your Names | rift | Fire 12 ultimates in Calamity fights, at least 2 in one fight | hidden |  |
| `riftHunger` It Is Hungry | rift | Fell 500 foes in Calamity fights, within 5 days | hidden |  |
| `riftTwin` Two Are Stronger Than It | rift | Set off 20 duo combos in Calamity fights, with three heroes or fewer | hidden |  |
| `riftLast` At the Last Door | rift | Fell the Calamity's last guardian twice, each time with a hero left on a quarter of their health or less, and clear the Calamity twice | hidden |  |
| `duchessHatEmergency` Duchess's Hat Emergency | duchess | Beat the Orc Warlord 3 times | ok |  |
| `duchessSecondHat` The Second Hat Emergency | duchess | Beat the Oni King twice, no hero falling | ok |  |
| `duchessMenu` The Specials | duchess | Clear the daily challenge 4 days running | ok |  |
| `duchessFriend` Duchess Wants a Friend | duchess | The king casts Call the Wolves 15 times | ok |  |
| `repGlasses` The Glasses Need Washing | repeat | Win 5 waves, in any mode | ok |  |
| `repRats` The Dog's Nerves | repeat | Fell 30 foes, in any mode | ok |  |
| `repQuietNight` A Quiet Night | repeat | Win a wave with no hero falling | ok |  |
| `repKitchenFire` Kitchen Fire | repeat | The king casts 4 spells | ok |  |
| `repRegularsWager` The Regulars' Wager | repeat | Win a boss wave | ok |  |
| `repNewBarrel` Tap the New Barrel | repeat | Clear a daily challenge | ok |  |
| `repBountyOrcs` Bounty: Orc Raiders | repeat | Fell 40 foes of the Orc Warband | ok |  |
| `repBountyBones` Bounty: Restless Bones | repeat | Fell 40 skeletons | ok |  |
| `repBountyWolves` Bounty: Wolves at the Fold | repeat | Fell 40 foes of the Beast Packs | ok |  |
| `repBountyThorns` Bounty: Thorns on the Road | repeat | Win 3 waves of the Wildwood | ok |  |
| `repBountyLabyrinth` Bounty: Lost in the Labyrinth | repeat | Win 3 waves of the Labyrinth | ok |  |
| `repBountyOgres` Bounty: The Ogre Toll | repeat | Beat a boss of the Ogre Clans | ok |  |
| `repBountyInfernal` Bounty: Hellfire Insurance | repeat | Fell 40 foes of the Infernal Host | ok |  |
| `repBountyParade` Bounty: Lanterns Out | repeat | Win 3 waves of the Yokai Night Parade | ok |  |
| `repPedlarSamples` Free Samples | repeat | The king casts 6 spells | ok |  |
| `repPedlarWhetstone` Sharpening, While You Wait | repeat | Your heroes deal 20,000 damage | ok |  |
| `repPedlarOil` More Lamp Oil | repeat | Reach wave 8 of the Last Stand in one run | hidden |  |
| `repPilgrimAlms` Alms for the Shrine | repeat | Your heroes heal 8,000 | ok |  |
| `repPilgrimPrayers` Evening Prayers | repeat | Win 2 waves with the king casting no spells | ok |  |
| `repPilgrimCandle` A Candle at the Shrine | repeat | Clear a daily challenge | ok |  |
| `repHunterPelts` Pelts for Winter | repeat | Fell 50 foes on Hard or harder | ok |  |
| `repHunterMeat` Winter Meat | repeat | Win a boss wave on Hard or harder | ok |  |
| `repHunterWatch` Snow Watch | repeat | Hold the line once at the Last Stand | hidden |  |
| `repHunterSnares` Night Snares | repeat | Win 2 waves in 40 seconds or less | ok |  |
| `repMessengerDispatches` Dispatches, Again | repeat | Win 4 waves of any army | ok |  |
| `repMessengerErrand` A Royal Errand | repeat | Fire 3 ultimates | ok |  |
| `repRiftWhispers` Whispers | repeat | Fell a Calamity guardian | hidden |  |
| `repRiftEchoes` Echoes | repeat | Fell 40 foes in Calamity fights | hidden |  |
| `repDuchessSnack` Snack Run | repeat | Win 3 waves in the daily challenge | ok |  |
| `repDuchessNap` Nap Guard | repeat | Win 2 waves with no hero falling | ok |  |
| `twoBladesBridge` Two Blades on the Bridge | patron | Win the quest battle Two Blades on the Bridge (Kenji and Hideo must fight) | ok |  |
| `captainsWager` The Captain's Wager | patron | Win the quest battle Salt and Cannon (Tiago and Harrow must fight) | ok |  |
| `cinderCrown` A Crown of Cinders | pedlar | Win the quest battle The Kiln Road (Ravi must fight) | ok |  |
| `frostOnTheirBacks` Frost on Their Backs | hunter | Win the quest battle The Frozen Meadow (Vuk and Itzel or Inti must fight) | ok |  |
| `duchessHole` A Large Hole | duchess | Win the quest battle Under the Courtyard (Kwame or Minh, and Asterion or another strong back, must fight; Duchess fights too) | ok |  |
| `whatKnocksBelow` What Knocks Below | gwen | Win the quest battle What Knocks Below (Natsu or Ayame must fight; two heroes at most) | ok |  |
| `theSweeper` The Sweeper | pilgrim | Win the quest battle The Swept Floor (Selam or Linnea must fight) | ok |  |
| `zofiaAudit` The Audit | patron | Win the quest battle The Audit (Zofia must fight; only Caster, Arcanist or Mystic heroes) | ok |  |
| `theEncore` The Encore | notice | Win the quest battle The Midnight Recital (Lovell must fight) | hidden |  |
| `riftOneMore` One More Door | rift | Win the quest battle Karnok's Door (Vesper must fight) | hidden |  |
| `emptyDen` An Empty Den | hunter | Win the quest battle The White Wolf's Den (Inti must fight) | ok |  |
| `taleFoldTracks` The Thing at the Fold, I: Tracks | shepherd | Win 5 waves of the Beast Packs | ok |  |
| `taleFoldNight` The Thing at the Fold, II: The Moonlit Fold | shepherd | Win the quest battle The Moonlit Fold (a hero of yours must fight) | ok |  |
| `taleChainsWorth` A Sellsword in Chains, I: His Keep | gaoler | Win 20 army waves | ok |  |
| `taleChainsCrew` A Sellsword in Chains, II: His Old Crew | gaoler | Fell 40 skeletons | ok |  |
| `taleChainsTide` A Sellsword in Chains, III: The Tide in the Moat | gaoler | Win the quest battle The Tide in the Moat (a hero of yours must fight) | ok |  |
| `taleIronSlag` The Iron Pilgrim, I: Footprints in the Slag | smith | Win 6 waves of the Golem Forge on Hard | ok |  |
| `taleIronMarch` The Iron Pilgrim, II: The Long March | smith | Win the quest battle The Long March (a hero of yours must fight) | ok |  |
| `taleLedgerUncounted` The Ledger of the Unburied, I: The Uncounted | sexton | Win 6 waves of the Undead Legion on Hard | ok |  |
| `taleLedgerBell` The Ledger of the Unburied, II: The Bell at Midnight | sexton | Fell 60 of the Undead Legion's foes | ok |  |
| `taleLedgerThirteen` The Ledger of the Unburied, III: The Thirteenth Bell | sexton | Win the quest battle The Thirteenth Bell (a hero of yours must fight) | ok |  |
| `talePawnTicket` The Pawned Blade, I: Ticket Thirteen | pawnbroker | Win 6 waves of the Infernal Host on Hard | ok |  |
| `talePawnCollectors` The Pawned Blade, II: The Debt Collectors | pawnbroker | Win the quest battle The Debt Collectors (a hero of yours must fight) | ok |  |
| `taleBannerLanterns` The Banner in the Mist, I: Lanterns on the Road | lantern | Win 5 waves of the Yokai Night Parade on Elite | ok |  |
| `taleBannerCrows` The Banner in the Mist, II: The Crows' Tally | lantern | Fell 30 crow tengu and crow seers | ok |  |
| `taleBannerNight` The Banner in the Mist, III: A Hundred Lanterns | lantern | Win the quest battle A Hundred Lanterns (a hero of yours must fight) | ok |  |
| `taleThroneSummons` The Second Throne, I: A Summons | herald | Win 3 Hard or harder army boss waves | ok |  |
| `taleThroneContempt` The Second Throne, II: Contempt of Court | herald | Clear 3 daily challenges | ok |  |
| `taleThroneAppeal` The Second Throne, III: The Appeal | herald | Win the quest battle The Appeal (a hero of yours must fight) | ok |  |
| `taleClockStopped` Yesterday's Visitor, I: The Stopped Clocks | clock | Win 4 Hard or harder army boss waves | ok |  |
| `taleClockHour` Yesterday's Visitor, II: The Hour Out of Place | clock | Win the quest battle The Hour Out of Place (a hero of yours must fight) | ok |  |
| `taleEyrieAsh` The Scorched Eyrie, I: Feathers and Ash | falconer | Clear an army on Elite or harder twice | ok |  |
| `taleEyrieNets` The Scorched Eyrie, II: The Net-Men | falconer | Fell 40 of the Ogre Clans' foes | ok |  |
| `taleEyrieNest` The Scorched Eyrie, III: The Nest | falconer | Win the quest battle The Scorched Eyrie (a hero of yours must fight) | ok |  |
| `taleStarMargins` The Fallen Star, I: Notes in the Margin | archivist | Fell 30 of the Labyrinth's foes | ok |  |
| `taleStarCaves` The Fallen Star, II: The Crystal Moths | archivist | Fell 20 crystal golems | ok |  |
| `taleStarHome` The Fallen Star, III: The Way Home | archivist | Win the quest battle The Star-Hearted (a hero of yours must fight) | ok |  |
| `mythic-vael-trace` A Shadow Facing Dawn, I: A Trace | herald | Win 12 Infernal Host waves on Legendary or harder without a Mythic | ok |  |
| `mythic-vael-rite` A Shadow Facing Dawn, II: The Rite | herald | Defeat 3 Legendary or harder army bosses without a king’s spell or a Mythic | ok |  |
| `mythic-vael-trial` A Shadow Facing Dawn, III: Beyond the Veil | herald | Win the hidden trial A Shadow Facing Dawn without a Mythic | ok |  |
| `mythic-astrax-trace` The Star That Fell Upwards, I: A Trace | archivist | Defeat 8 Legendary or harder army bosses without a Mythic | ok |  |
| `mythic-astrax-rite` The Star That Fell Upwards, II: The Rite | archivist | Clear 2 armies on Legendary or harder without spending a heart or using a Mythic | ok |  |
| `mythic-astrax-trial` The Star That Fell Upwards, III: Beyond the Veil | archivist | Win the hidden trial The Star That Fell Upwards without a Mythic | ok |  |
| `mythic-ilyra-trace` The Funeral Nobody Finished, I: A Trace | sexton | Win 15 Undead Legion waves on Elite or harder with no hero falling and no Mythic | ok |  |
| `mythic-ilyra-rite` The Funeral Nobody Finished, II: The Rite | sexton | Win 5 Elite or harder army boss waves with no hero falling and no Mythic | ok |  |
| `mythic-ilyra-trial` The Funeral Nobody Finished, III: Beyond the Veil | sexton | Win the hidden trial The Funeral Nobody Finished without a Mythic | ok |  |
| `mythic-orrun-trace` Roots Beneath the Stone, I: A Trace | shepherd | Win 15 Wildwood waves on Elite or harder without a Mythic | ok |  |
| `mythic-orrun-rite` Roots Beneath the Stone, II: The Rite | shepherd | Defeat 5 Elite or harder army bosses with no hero falling and no Mythic | ok |  |
| `mythic-orrun-trial` Roots Beneath the Stone, III: Beyond the Veil | shepherd | Win the hidden trial Roots Beneath the Stone without a Mythic | ok |  |
| `mythic-nyxara-trace` The Room Behind Tomorrow, I: A Trace | clock | Defeat 4 Mythic army bosses without a Mythic | ok |  |
| `mythic-nyxara-rite` The Room Behind Tomorrow, II: The Rite | clock | Win 6 Legendary or harder army boss waves without ultimates or a Mythic | ok |  |
| `mythic-nyxara-trial` The Room Behind Tomorrow, III: Beyond the Veil | clock | Win the hidden trial The Room Behind Tomorrow without a Mythic | ok |  |
| `lostNineScroll` The Ninefold Cut, I: The Torn Scroll | patron | Win 15 waves with Kenji on the field and no hero falling | ok |  |
| `lostNineRoad` The Ninefold Cut, II: The Pilgrim Road | patron | Win 5 waves of the Wildwood with Kenji on the field | ok |  |
| `lostNineDojo` The Ninefold Cut, III: The Empty Dojo | patron | Win the quest battle The Empty Dojo (Kenji must fight) | ok |  |
| `lostWordsCrossing` Words of Unmaking, I: A Heavy Page | lost | Clear a Calamity crossing with a Grimoire reader on the field | hidden |  |
| `lostWordsGuardian` Words of Unmaking, II: What the Guardian Guards | lost | Fell a Calamity guardian | hidden |  |
| `lostWordsLibrary` Words of Unmaking, III: The Unwritten Library | patron | Win the quest battle The Unwritten Library (Ravi must fight) | hidden |  |
| `lostDawnWounds` The Hymn of the Long Dawn, I: Whoever Remembered | lost | Heal 20,000 across fights with Hymnal readers | hidden |  |
| `lostDawnChapel` The Hymn of the Long Dawn, II: The Chapel | lost | Reach the chapel in the Last Stand | hidden |  |
| `lostDawnMatins` The Hymn of the Long Dawn, III: Matins at the Chapel | lost | Win the quest battle Matins at the Chapel (Selam or Linnea must fight) | hidden |  |
| `lostHungerPacks` The Old Hunger, I: A Hide, Scratched | lost | Fell 40 beasts of the Beast Packs | ok |  |
| `lostHungerWood` The Old Hunger, II: Under the Wildwood | lost | Win 5 Wildwood waves with a monster hero on the field | ok |  |
| `lostHungerDen` The Old Hunger, III: The Den Beneath the Snow | patron | Win the quest battle The Den Beneath the Snow (Vuk must fight) | ok |  |
| `provTwoWillDo` Two Will Do | oswy | Fell the Orc Chieftain with two heroes or fewer on the field | ok |  |
| `provHandsOffTheHorn` Hands Off the Horn | oswy | Win 10 waves with no ultimate fired and no spell cast | ok |  |
| `provShoestring` Shoestring | oswy | Win 10 waves with no sellsword hired at the cart in the run | ok |  |
| `provGreenCompany` The Green Company | oswy | Fell the Wildwood's last boss within 150 seconds, with every hero at level 20 or lower | ok |  |
| `provWithoutTheCaptain` Without the Captain | oswy | Win 5 boss waves with your highest-level hero benched | ok |  |
| `provIronDiscipline` Iron Discipline | oswy | Clear the Labyrinth in one run with four heroes or fewer, no spell and no heart spent | ok |  |
| `provFullMuster` Full Muster | oswy | Win a boss wave with a full company of five and no hero falling | ok |  |
| `provLongDrill` The Long Drill | oswy | Within 3 days: fell 3 bosses without a hero falling, win 20 waves and set off 5 duo combos | ok |  |
| `provBareKnuckles` Bare Knuckles | oswy | Fell the Demon Lord with no ultimate, no spell, no sellsword hired at the cart in the run, and no hero falling | ok |  |
| `provThinLine` The Thin Line | oswy | Clear any army on Hard with exactly three heroes | ok |  |
| `provGraduation` Oswy's Graduation | oswy | Fell the Golem Forge's last boss on Elite, flawless, with every hero at level 70 or lower | ok |  |
| `provDrillEveryMorning` Drill Every Morning | oswy | Clear the daily challenge on 5 days running | ok |  |
| `wantedChieftainQuickly` Wanted: the Chieftain, Quickly | notice | Fell the Orc Chieftain within 40 seconds | ok |  |
| `wantedBoneCaptain1` Wanted: the Bone Captain, Twice | notice | Fell the Bone Captain on Normal | ok |  |
| `wantedBoneCaptain2` Wanted: the Bone Captain, Twice | notice | Fell the Bone Captain on Hard | ok |  |
| `wantedAlphaAlive` Wanted: the Alpha, Alive Enough | notice | Fell the Alpha Werewolf with a hero left on a quarter of their health or less, and no heart spent | ok |  |
| `wantedThornWarden` Wanted: the Thorn Warden, Unburnt | notice | Fell the Wildwood's three bosses, without Ravi fielded | ok |  |
| `wantedGorgonBlindfolded` Wanted: the Gorgon, Blindfolded | notice | Fell the Gorgon Queen with no archer, wizard or other shooter fielded | ok |  |
| `wantedOgrePair` Wanted: the Ogre Pair | notice | Within a day: fell the Ogre Shaman King, and then the Horned Ogre, in one day | ok |  |
| `wantedDevilLeader` Wanted: the Devil Leader, Dead or Paid | notice | Fell the Devil Leader on Hard within 30 seconds | ok |  |
| `wantedFoxNotTails` Wanted: the Fox, Not the Tails | notice | Fell the Nine-Tailed Fox with no hero falling | ok |  |
| `wantedColossusByTuesday` Wanted: the Colossus, by Tuesday | notice | Within 2 days of taking it: fell the Sapphire Colossus on Hard | ok |  |
| `wantedBigBoard` The Big Board | notice | Within 5 days: fell 3 bosses on Elite, none of them with a hero falling | ok |  |
| `bellRinging` The Drowned Bell, I: Ringing Under the Water | campaign | Win 10 waves of the Undead Legion without a king's spell | ok |  |
| `bellRingers` The Drowned Bell, II: Who Pulls the Rope | campaign | Fell 80 skeletons, in any mode | ok |  |
| `bellCaptain` The Drowned Bell, III: The Captain on the Jetty | campaign | Fell the Bone Captain twice without a hero falling | ok |  |
| `bellDeep` The Drowned Bell, IV: A Hard Winter Below | campaign | Clear the Undead Legion on Hard | ok |  |
| `bellTide` The Drowned Bell, V: The Tide Comes In | campaign | Win the quest battle The Tide at the Bell (a hero of yours must fight) | ok |  |
| `folly1Orc` The Cartographer's Folly, I: A Map With Gaps | campaign | Win 10 waves of the Orc Warband | ok |  |
| `folly2Bones` The Cartographer's Folly, II: The Edge of the Graveyard | campaign | Win 10 waves of the Undead Legion with no sellsword hired at the cart | ok |  |
| `folly3Wolves` The Cartographer's Folly, III: Where the Wolves Are | campaign | Fell 200 foes of the Beast Packs | ok |  |
| `folly4Grove` The Cartographer's Folly, IV: The Grove That Moves | campaign | Fell the three forest lords, with no hero falling | ok |  |
| `folly5Maze` The Cartographer's Folly, V: The Maze, Mapped Backwards | campaign | Fell the Gorgon Queen and the Minotaur Champion, with no spell cast | ok |  |
| `folly6Wrong` The Cartographer's Folly, VI: The One I Got Wrong | campaign | Fell the Horned Ogre without a hero falling | ok |  |
| `keysFirst` The Thirteen Keys, I: A Key in a Gorgon | campaign | Fell the Gorgon Queen with no hero falling and no spell cast | ok |  |
| `keysChampion` The Thirteen Keys, II: Horns and Iron | campaign | Fell the Minotaur Champion with no hero falling and no spell cast | ok |  |
| `keysWarlords` The Thirteen Keys, III: Keys on Hard Ground | campaign | Fell the Orc Warlord and the Lich King, on Hard | ok |  |
| `keysHeights` The Thirteen Keys, IV: The Ring of Many Keys | campaign | Fell the Horned Ogre and the Demon Lord on Hard, with no hero falling | ok |  |
| `keysLast` The Thirteen Keys, V: The Chain of Eleven | campaign | Fell 4 bosses of any army on Hard, with no ultimate fired | ok |  |
| `keysThirteenth` The Thirteen Keys, VI: The Thirteenth Door | campaign | Win the quest battle The Thirteenth Door (a hero of yours must fight) | ok |  |
| `harvestSign` Red Harvest, I: Sign on the Fence | campaign | Win 10 waves of the Beast Packs on Hard without a spell | ok |  |
| `harvestPack` Red Harvest, II: The Thinning | campaign | Fell 200 foes of the Beast Packs, on Hard | ok |  |
| `harvestAlpha` Red Harvest, III: The One With the Scar | campaign | Fell the Alpha Werewolf on Hard, within 200 seconds | ok |  |
| `harvestClear` Red Harvest, IV: To the Last Den | campaign | Clear the Beast Packs on Hard with no hero falling | ok |  |
| `harvestCub` Red Harvest, V: The Cub in the Den | campaign | Win the quest battle The Cub in the Den (a hero of yours must fight) | ok |  |
| `glassSeed` The Glass Orchard, I: A Seed of Broken Glass | campaign | Win 10 waves of the Wildwood on Hard without a spell | ok |  |
| `glassRoot` The Glass Orchard, II: Roots in the Satyr Ground | campaign | Fell 80 foes of the Wildwood, on Hard | ok |  |
| `glassLord` The Glass Orchard, III: A Fruit From a Forest Lord | campaign | Fell the second forest lord on Hard, with no hero falling | ok |  |
| `glassHarvest` The Glass Orchard, IV: A Hard Harvest | campaign | Win 12 waves of the Wildwood on Hard with 2 ultimates in a fight, at most 3 heroes, and a hero on a quarter health | ok |  |
| `glassBloom` The Glass Orchard, V: The Orchard in Bloom | campaign | Clear the Wildwood on Hard with no hero falling | ok |  |
| `choirHum` The Iron Choir, I: A Hum in the Slag | campaign | Win 10 waves of the Golem Forge on Hard without a spell, with no hero falling | ok |  |
| `choirTenor` The Iron Choir, II: The Colossus Sings Low | campaign | Fell the Sapphire Colossus on Hard with no hero falling | ok |  |
| `choirVerse` The Iron Choir, III: A Verse for the Fallen | campaign | Fell 200 foes of the Golem Forge, on Hard, with a hero on a quarter health | ok |  |
| `choirCrescendo` The Iron Choir, IV: Crescendo | campaign | Win 15 waves of the Golem Forge on Hard with at most 3 heroes, and no spell cast | ok |  |
| `choirCoda` The Iron Choir, V: The Last Verse | campaign | Clear the Golem Forge on Hard with no hero falling and no heart burnt | ok |  |
| `choirFurnace` The Iron Choir, VI: Before the Furnace Goes Out | campaign | Win the quest battle The Furnace Race (a hero of yours must fight) | ok |  |
| `surveyStones` The Border Survey: the Marker Stones | campaign | Fell a boss in the Orc Warband | ok |  |
| `surveyBarrows` The Border Survey: the Barrow Line | campaign | Fell a boss in the Restless Dead with no hero falling | ok |  |
| `surveyWolfwater` The Border Survey: the Wolf Water | campaign | Fell a boss among the beasts with no hero falling | ok |  |
| `surveyMarch` The Border Survey: the Long March | campaign | Clear one army from its first wave to its last in one run | ok |  |
| `surveyFort` The Border Survey: the Fort at the Edge | campaign | Win the quest battle The Fort at the Edge (Kwame must fight) | ok |  |
| `taxQuiet` The Tax Road: the Lean Purse | ruler | Win 10 waves with no sellsword hired at the cart in the run | ok |  |
| `taxBandits` The Tax Road: the Bandit Toll | ruler | Win the quest battle The Bandit Toll (Natsu must fight) | ok |  |
| `taxCollector` The Tax Road: the Collector of the Hard Road | ruler | Win a boss wave on Hard or harder | ok |  |
| `musterOrcs` The Winter Muster: the Orc Gate | campaign | Clear the Orc Warband on Hard or harder | ok |  |
| `musterDead` The Winter Muster: the Barrow Road | campaign | Clear the Restless Dead on Hard or harder | ok |  |
| `musterPack` The Winter Muster: the Frost Pack | campaign | Clear the Beast Pack on Hard or harder | ok |  |
| `musterDaily` The Winter Muster: the Daily Drill | campaign | Clear the daily challenge 3 days running | ok |  |
| `musterHold` The Winter Muster: the Keep in Snow | campaign | Reach wave 20 of the Last Stand in one run | hidden |  |
| `musterStandard` The Winter Muster: the Standard | campaign | Win the quest battle The Standard in the Snow (Kwame must fight) | ok |  |
| `embassyRoad` The Embassy: the Envoy on the Road | ruler | Win the quest battle The Envoy on the Road (Kwame must fight) | ok |  |
| `embassyGuard` The Embassy: the Guard Who Turned | ruler | Win the quest battle The Bewitched Guard (Ayame must fight), sparing the envoy's guard | ok |  |
| `embassyTreaty` The Embassy: the Treaty Table | ruler | Fell a boss on Hard or harder with no hero falling | ok |  |
| `embassyFeast` The Embassy: the Farewell Feast | ruler | Fell 2 bosses on Hard or harder, no hero falling in either | ok |  |
| `crownOrcs` The Second Coronation: the Orc Oath | campaign | Clear the Orc Warband on Elite or harder | ok |  |
| `crownDead` The Second Coronation: the Barrow Oath | campaign | Clear the Restless Dead on Elite or harder | ok |  |
| `crownBeasts` The Second Coronation: the Wild Oath | campaign | Clear the Beast Pack on Elite or harder | ok |  |
| `crownDeep` The Second Coronation: the Deep Oath | campaign | Clear the Labyrinth on Elite or harder | ok |  |
| `crownClans` The Second Coronation: the Clan Oath | campaign | Clear the Ogre Clans on Elite or harder | ok |  |
| `crownNight` The Second Coronation: the Night Oath | campaign | Clear the Night Parade on Elite or harder | ok |  |
| `crownUsurper` The Second Coronation: the Usurper | campaign | Win the quest battle The Usurper at the Door (Kenji must fight) | ok |  |
| `keepMythicBoss` The Last Keep Holds: the First Mythic Wall | campaign | Win a boss wave on Mythic | ok |  |
| `keepMythicClear` The Last Keep Holds: the Mythic Road | campaign | Clear the Orc Warband on Mythic | ok |  |
| `keepNoHeart` The Last Keep Holds: the Unspent Hearts | campaign | Win 15 waves in one Mythic run without a heart spent | ok |  |
| `keepCalamity` The Last Keep Holds: the Third Ascension | campaign | Fell 3 Calamity guardians, on the third map or later, with no hero falling | hidden |  |
| `keepThroneRoom` The Last Keep Holds: the Throne Room | campaign | Reach the throne room in a run of the Last Stand, having held the line on the way | hidden |  |
| `keepOneRun` The Last Keep Holds: the Whole Road | campaign | Clear one army on Mythic in one run, without a heart spent | ok |  |
| `keepBosses` The Last Keep Holds: the Four Walls | campaign | Win 4 boss waves on Mythic with no hero falling | ok |  |
| `keepHolds` The Last Keep Holds: the Keep Holds | campaign | Clear the Stone Golems on Mythic in one run, without a heart spent | ok |  |
| `kwameWeightOfShield` The Weight of the Shield | patron | Kwame takes 40,000 damage in one army run, with no heart spent | ok |  |
| `kenjiNatsuWhoIsFaster` Who Is Faster | patron | Kenji and Natsu are each the MVP of 3 wins | ok |  |
| `ayameNoOneSaw` No One Saw | patron | Fell 3 bosses with Ayame on the field and no hero falling | ok |  |
| `raviBankedFire` The Banked Fire | patron | Beat a boss with Ravi and at most one other hero, with an ultimate fired in the fight | ok |  |
| `selamLanternsEveryGrave` Lanterns for Every Grave | patron | Selam heals 80,000 across fights | ok |  |
| `tiagoHarrowUnpaidCrew` The Unpaid Crew | patron | Win the quest battle The Unpaid Crew (Tiago and Harrow must fight; keep the bosun alive) | ok |  |
| `hideoOldKata` The Old Kata | patron | Beat the Oni King on Hard or harder with Hideo, every hero at level 60 or lower | ok |  |
| `zofiaSecondAudit` The Second Audit | patron | On Hard, with only casters on the field and no heart spent: fell 2 bosses and cast 20 spells, in one run | ok |  |
| `hobbPatientDead` The Patient Dead | patron | Win 12 waves with only Undead heroes on the field | ok |  |
| `maeveSixBosses` Six Shots, Six Bosses | patron | Maeve is the MVP of 6 fights in which a boss falls | ok |  |
| `rookCalibrationError` Calibration Error | patron | Fire Rook-7's ultimate 10 times, in fights with at most one other hero | ok |  |
| `edmundVerdictShield` The Final Verdict: The Shield | patron | Win 8 waves with only Guardians on the field | ok |  |
| `edmundVerdictBlade` The Final Verdict: The Blade | patron | Fell a boss with only Blades on the field and no hero falling | ok |  |
| `edmundVerdictBow` The Final Verdict: The Bow | patron | Win 10 waves with only Marksmen on the field | ok |  |
| `edmundVerdictVeil` The Final Verdict: The Veil | patron | Fell a boss within 60 seconds with only Tricksters on the field | ok |  |
| `edmundVerdictLast` The Final Verdict | patron | Win the quest battle The Final Verdict (Edmund must fight; keep his banner standing) | ok |  |
| `duchessWantsBell` Duchess Wants a Bell | duchess | Fell 3 bosses | ok |  |
| `duchessHayInspection` Hay Inspection | duchess | Win the quest battle Hay Inspection (Minh must fight; keep Duchess alive) | ok |  |
| `duchessNotForSale` The Goat Is Not for Sale | duchess | Win the quest battle The Goat Is Not for Sale (two heroes must fight; spare the satyr who is Duchess) | ok |  |
| `goatTourOrcs` The Grand Goat Tour: The Warlord's Plume | campaign | Beat the Orc Warlord on Hard or harder | ok |  |
| `goatTourUndead` The Grand Goat Tour: The Bone Crown | campaign | Beat the Lich King on Hard or harder | ok |  |
| `goatTourWood` The Grand Goat Tour: A Wreath of Thorn | campaign | Beat a boss of the Wildwood on Hard or harder with no hero falling | ok |  |
| `goatTourFox` The Grand Goat Tour: The Fox Tippet | campaign | Beat the Nine-Tailed Fox on Hard or harder with no hero falling | ok |  |
| `goatTourCrown` The Grand Goat Tour: The Last Hat | campaign | Fell 2 bosses on Elite or harder with no hero falling | ok |  |
| `mapWithAHole` A Map with a Hole | spoils | Win wave 10 or later of any army | ok |  |
| `captiveTalksRace` The Captive Talks | spoils | Win the quest battle The Hideout Race (Kenji or Ayame must fight; fell the foes within 110 seconds) | ok |  |
| `captiveTalksBoss` The Captive Talks: What Was Behind | spoils | Beat the Lich King with no hero falling | ok |  |
| `warlordsSeal` The Warlord's Seal | spoils | Clear the Orc Warband on Elite in one run | ok |  |
| `boxThatTicks` A Box That Ticks | spoils | Win the quest battle A Box That Ticks (two heroes must fight; hold out for 120 seconds) | ok |  |
| `demonsReceipt` The Demon's Receipt | spoils | Beat the Demon Lord on Hard or harder with no spell cast, fell 100 Infernal foes, and win 5 Infernal waves with no spell cast | ok |  |
| `aLameMule` A Lame Mule | hunter | Win 5 waves with Kwame or a Guardian on the field | ok |  |
| `tinkersToll` The Tinker's Toll | pedlar | Fell 60 foes of the Orc Warband, in any mode | ok |  |
| `pilgrimsEscort` The Pilgrim's Escort | pilgrim | Win the quest battle The Pilgrim's Escort (keep the pilgrim alive through three waves) | ok |  |
| `saltForThePass` Salt for the Pass | pedlar | Fell 3 Beast Packs bosses | ok |  |
| `messengersRelay` The Messenger's Relay | messenger | Win a wave in an army, a wave of the daily and a wave of the Last Stand | hidden |  |
| `huntersLastArrow` The Hunter's Last Arrow | hunter | Fell the Boar King on Hard with only Marksman heroes on the field | ok |  |
| `cartInRiver` A Cart in the River | messenger | Win the quest battle A Cart in the River (hold the ford for 90 seconds while the cart is hauled out) | ok |  |
| `longWayRound1` The Long Way Round: The Map | pilgrim | Win a wave in each of the Orc Warband, the Undead Legion, the Beast Packs, the Wildwood and the Labyrinth | ok |  |
| `longWayRound2` The Long Way Round: The Guardian | pilgrim | Fell an army boss with no hero falling | ok |  |
| `longWayRound3` The Long Way Round: The Flood | pilgrim | Win the quest battle The Flood on the Causeway (every wave won inside the time) | ok |  |
| `courtyardWatch` The Courtyard Watch | gwen | Reach the library in the Last Stand | hidden |  |
| `holdTwice` Hold Twice | messenger | Hold the line twice in one Last Stand run, and reach the library | hidden |  |
| `noCandleWasted` No Candle Wasted | gwen | Reach the chapel in the Last Stand, having held the line once on the way | hidden |  |
| `thirtyStillStanding` Thirty and Still Standing | notice | Reach wave 30 of the Last Stand in one run | hidden |  |
| `throneRoomUnbent` The Throne Room, Unbent | gwen | Reach the throne room in the Last Stand, having held the line in every hall on the way | hidden |  |
| `nightRota` The Night Rota | notice | Win 45 waves of the Last Stand within a week (three nights of fifteen) | hidden |  |
| `riftIsDoor` A Rift Is a Door | gwen | Fell a Calamity guardian | hidden |  |
| `throughCrossings` Through the Crossings | rift | Win 4 Calamity crossings with no hero falling in any of them | hidden |  |
| `deepMaps` The Deep Maps | rift | Fell the fifth Calamity guardian (on the fifth map or later) | hidden |  |
| `ascendCalamity` Ascend | rift | Clear the Calamity twice more, with no hero falling in the last guardian's fight | hidden |  |
| `riftChoir` The Rift Choir | rift | In Calamity fights: fell 2 guardians (fourth map or later), set off 10 duo combos and one five-hero combo | hidden |  |
| `waitsUnder1` What Waits Under: The Floor of the Third Door | campaign | Fell a Calamity guardian on the third map or later | hidden |  |
| `waitsUnder2` What Waits Under: The Long Stair | campaign | Fell 2 Calamity guardians on the fifth map or later | hidden |  |
| `waitsUnder3` What Waits Under: The Lamp Carried Whole | campaign | Clear the Calamity with no hero falling in the last guardian's fight | hidden |  |
| `waitsUnder4` What Waits Under: The Sixth Door, Sung | campaign | Fell the sixth Calamity guardian, and set off a five-hero combo in Calamity fights | hidden |  |
| `waitsUnder5` What Waits Under: The Thing in the Frame | campaign | Win the quest battle What Waits Under (a rift-born boss, and no hearts to spend) | hidden |  |
| `freshBreadAgain` Fresh Bread Again | pedlar | Clear the daily challenge on 2 days running | ok |  |
| `bakersWeek` The Baker's Week | gwen | Clear the daily challenge on 5 days | ok |  |
| `threeStarsEveryTime` Three Stars Every Time | messenger | Clear 3 dailies, with no heart spent and every wave won in 90 seconds or less | ok |  |
| `hardBread` The Hard Bread | notice | Win all 10 waves of one daily with no hero falling and no heart spent | ok |  |
| `weddingBanns` The Banns | campaign | Win 10 waves, in any mode | ok |  |
| `weddingGuests` The Guest List | campaign | Fell 120 Labyrinth foes, in any mode | ok |  |
| `weddingCake` The Cake | campaign | Win 2 boss waves with no hero falling | ok |  |
| `weddingBorrowed` Something Borrowed | campaign | Win 12 Wildwood waves with two heroes at most | ok |  |
| `weddingProcession` The Procession | campaign | Clear the Labyrinth with no spells cast, and fell its Minotaur Champion with no hero falling | ok |  |
| `weddingUninvited` The Uninvited Guest | campaign | Win the quest battle The Uninvited Guest (Kwame or Minh must fight) | ok |  |
| `weddingVows` Till Death, or Dessert | campaign | Clear the Ogre Clans on Hard or harder in one run, burning no heart | ok |  |
| `marketFirst` The First Stall | campaign | Win a Night Parade wave from wave 10 on Hard or harder, on 3 days running | ok |  |
| `marketPaper` Paper and Oil | campaign | Clear the daily challenge 3 days running | ok |  |
| `marketMask` The Mask Seller | campaign | Fell the Nine-Tails on Hard or harder, no hero falling, on 2 days running | ok |  |
| `marketHaggle` Haggling Hours | campaign | Deal 40,000 damage in Hard or harder army runs, within 6 days | ok |  |
| `marketLast` The Last Stall | campaign | Win the quest battle The Last Stall (Ayame must fight) | ok |  |
| `marketDawn` Dawn Over the Market | campaign | Win a daily wave with no hero falling, on 5 days running | ok |  |
| `mapFirst` The First Crossing | campaign | Fell a Calamity guardian on the second map or later | hidden |  |
| `mapNarrow` The Narrow Crossing | campaign | Fell a Calamity guardian on the third map or later with no hero falling | hidden |  |
| `mapMargins` Margins of the Map | campaign | Fell 300 foes in Calamity fights | hidden |  |
| `mapInk` What the Ink Will Not Say | campaign | Fell 2 Calamity guardians on the fourth map or later | hidden |  |
| `mapFifth` The Fifth Fold | campaign | Fell a Calamity guardian on the fifth map or later without casting a spell | hidden |  |
| `mapSixth` The Sixth Guardian | campaign | Fell the Calamity's sixth guardian without burning a heart | hidden |  |
| `winterTracks` Tracks That Do Not Thaw | campaign | Win 12 waves on Elite or harder | ok |  |
| `winterSnares` The Snare Line | campaign | Fell 200 foes on Elite or harder | ok |  |
| `winterFrostbite` The Frostbite Count | campaign | Win 2 boss waves on Elite or harder | ok |  |
| `winterHearth` The Hungry Hearth | campaign | Deal 25,000 damage on Elite or harder, casting no spell, within 7 days | ok |  |
| `winterThaw` A Thaw That Lies | campaign | Win 2 boss waves on Elite or harder with no hero falling | ok |  |
| `winterCourt` The Pale Huntsman's Court | campaign | Win the quest battle The Pale Huntsman's Court (Natsu or Inti must fight) | ok |  |
| `winterSpring` Spring, Eventually | campaign | Clear the Beast Packs on Elite or harder with no hero falling | ok |  |
| `siegeWall` The Wall Remembers | campaign | Reach wave 30 of the Last Stand | hidden |  |
| `siegeBreach` The Breach, Again | campaign | Reach the Last Stand's throne room, having held the line on the way | hidden |  |
| `siegeSappers` Sappers in the Cellar | campaign | Hold the line at an act's end 4 times | hidden |  |
| `siegeMorning` The Same Morning | campaign | Win the quest battle The Same Morning (Kwame must fight) | hidden |  |
| `siegeBanners` The Banners Return | campaign | Reach wave 35 of the Last Stand, and hold the line at an act's end twice | hidden |  |
| `siegeEnd` The Siege's End | campaign | Reach wave 40 of the Last Stand, and reach the throne room having held the line | hidden |  |
| `ninthSeal` The Unnumbered Seal | campaign | Win 10 waves on Mythic | ok |  |
| `ninthCrown` A Crown Without a Number | campaign | Win 2 boss waves on Mythic | ok |  |
| `ninthSilence` The Silence Before | campaign | Fell 200 foes on Mythic without casting a spell | ok |  |
| `ninthHeir` Before the First Heir | campaign | Deal 25,000 damage on Mythic, within 7 days | ok |  |
| `ninthVigil` The Vigil Under the Keep | campaign | Win the quest battle The Vigil Under the Keep (Kenji must fight) | ok |  |
| `ninthWitness` Witnesses | campaign | Win 3 boss waves on Mythic with no hero falling | ok |  |
| `ninthRoad` The Long Road Down | campaign | Clear any army on Mythic | ok |  |
| `ninthKing` The Ninth King | campaign | Win the quest battle The Ninth King (Kwame and Ravi must fight) | ok |  |
| `askel1` Embers of the Warband | chain: The Hound Comes Home | Beat the Orc Warlord (wave 15) on Hard, with no hero falling | ok |  |
| `askel2` The Kennel Fires | chain: The Hound Comes Home | Win the quest battle The Kennel Fires (Ravi or Natsu fights; any starter hero may stand in) | ok |  |
| `askel3` The Kennel-Master's Bell | chain: The Hound Comes Home | Fell the Bone Captain (the Undead Legion's eighth wave) on Hard, with no sellsword hired at the cart in the run | ok |  |
| `askel4` The Long Run | chain: The Hound Comes Home | Clear the Orc Warband whole on Hard with no heart spent | ok |  |
| `askel5` Run With the Hound | chain: The Hound Comes Home | Win 6 army waves on Hard without firing an ultimate | ok |  |
| `nivra1` The Pack That Ran | chain: What Sleeps Under the Mere | Beat a Beast Packs boss on Hard, with no hero falling: the Alpha Werewolf (wave 8) or the Boar King (wave 15) | ok |  |
| `nivra2` The Glass Mere | chain: What Sleeps Under the Mere | Win the quest battle The Glass Mere (Ayame or Kenji fights; any starter hero may stand in) | ok |  |
| `nivra3` Hold Your Breath | chain: What Sleeps Under the Mere | Win 5 army waves without casting a king's spell or firing an ultimate | ok |  |
| `nivra4` Through the Pack | chain: What Sleeps Under the Mere | Clear the Beast Packs whole on Hard with no heart spent | ok |  |
| `nivra5` The Quiet Bosses | chain: What Sleeps Under the Mere | Beat 2 Beast Packs bosses on Hard without casting a king's spell | ok |  |
| `aurelan1` Gold in the Grove | chain: The Late Dawn | Beat a Wildwood boss on Hard, with no hero falling: the Thorn Warden (wave 5), the Wood Raider (wave 10) or the Grove Spearlord (wave 15) | ok |  |
| `aurelan2` The Sunless Shrine | chain: The Late Dawn | Win the quest battle The Sunless Shrine (Kwame or Minh fights; any starter hero may stand in) | ok |  |
| `aurelan3` Not One on the Floor | chain: The Late Dawn | Win 4 army waves on Hard with no hero falling | ok |  |
| `aurelan4` The Whole Wood | chain: The Late Dawn | Clear the Wildwood whole on Hard with no heart spent | ok |  |
| `aurelan5` Before the Cock Crows | chain: The Late Dawn | Beat 2 Wildwood bosses on Hard with no sellsword hired at the cart in the run | ok |  |
| `voltara1` Wire in the Maze | chain: The Dry Storm | Beat a Labyrinth boss on Hard, with no hero falling: the Gorgon Queen (wave 8) or the Minotaur Champion (wave 15) | ok |  |
| `voltara2` The Copper Works | chain: The Dry Storm | Win the quest battle The Copper Works (Kwame or Minh fights; any starter hero may stand in) | ok |  |
| `voltara3` Thunder on Demand | chain: The Dry Storm | Fire 6 ultimates in army fights where no king's spell is cast | call | ultimates open at level 30; the quest may come sooner |
| `voltara4` The Straight Road | chain: The Dry Storm | Clear the Labyrinth whole on Hard with no heart spent | ok |  |
| `voltara5` Both Lords, One Storm | chain: The Dry Storm | Beat 2 Labyrinth bosses on Hard with no hero falling and no sellsword hired at the cart in the run | ok |  |
| `gorm1` Fire in the Stone | chain: A Goat of Consequence | Beat an Infernal Host boss on Hard, with no hero falling: the Devil Leader (wave 8) or the Demon Lord (wave 15) | ok |  |
| `gorm2` The Buried Foundation | chain: A Goat of Consequence | Win the quest battle The Buried Foundation (Kwame or Minh fights; any starter hero may stand in) | ok |  |
| `gorm3` Stand Your Ground | chain: A Goat of Consequence | Take 25,000 damage across Hard army fights that you win with no hero falling | ok |  |
| `gorm4` The Pit, End to End | chain: A Goat of Consequence | Clear the Infernal Host whole on Hard with no heart spent | ok |  |
| `gorm5` Plumb and True | chain: A Goat of Consequence | Win 5 army waves on Hard with no hero falling and no sellsword hired at the cart in the run | ok |  |
| `vaelkhar1` Under the Guardians | chain: The Guest's Things | Fell 2 Calamity guardians with no hero falling | hidden |  |
| `vaelkhar2` The Guest Wing | chain: The Guest's Things | Win the quest battle The Guest Wing (Kwame or Minh fights; any starter hero may stand in) | hidden |  |
| `vaelkhar3` A King's Ransom | chain: The Guest's Things | Deal 200,000 damage across Calamity fights, casting no king's spell in them | hidden |  |
| `vaelkhar4` The Gate, Properly | chain: The Guest's Things | Clear the Calamity whole with no heart spent and no king's spell cast | hidden |  |
| `vaelkhar5` Paid in Kind | chain: The Guest's Things | Fell 3 Calamity guardians with no hero falling and no ultimate fired | hidden |  |
