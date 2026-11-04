# Seven-slot gear, runes and remedies: the build

The build of the approved design, [gear-runes-design.md](gear-runes-design.md), with all ten of its recommended answers. It goes in the
design's eight batches, each with its tests. This note says what each batch built and where it differs from the design's words.

## Batch 1: seven slots

- **The catalogue** (`src/sim/equipBases.ts`, `src/sim/equipBasesNew.ts`). The slots are `head`, `torso`, `main` (the right hand, the
  weapon), `off` (the left hand), `feet`, `belt` and `acc` (`EQUIP_SLOTS`, `SLOT_NAMES` in `equipment.ts`). The 60 bases from before keep
  their ids, names, numbers, abilities and Mythic names, in their new slots; 129 new bases join them, so each slot holds 27 now and 30 once
  batch 2 adds its three named legends. In each slot: twelve set pieces and fifteen ordinary bases. Every new base has its own profile in
  its slot, an ability from Epic up (built from the ability kinds `equipFx.ts` already runs, so nothing new is drawn in a fight), a Mythic
  name and an ability score.
- **One change to the design's table:** the Scholar's Scroll is a **belt** piece (a scroll case), not a left hand, because the Scholar of
  Ash already has the Grimoire in the left hand and a set holds one piece a slot.
- **`SLOT_SCALE`.** The new bases' main stats are scaled by their slot (the hands and torso in full, the left hand and accessory at 0.6,
  the head, feet and belt at 0.45), so a whole kit of seven stays modest. **The 60 bases from before keep `MAIN_SCALE` alone**
  (`OLD_BASES`), so no owned piece is weakened and an old kit fights exactly as before (a test checks every one at every grade and level).
  Batch 8 measures the full kit and sets these numbers.
- **`jump`**, a new main stat: whole steps, at most +1 from gear (`CAPS`), read by `strikeDef` in `battle.ts` beside Athletics. Climber's
  Boots and the Peakwarden's two pieces give it.
- **The quiet slots wear at half** (`QUIET_SLOTS`: head, feet, belt, accessory), so wear is now kept in quarters. A fall still costs the
  torso one more point.
- **The sets** (`gearSets.ts`) are the design's fourteen: five of seven pieces, four of six, five of five, 84 pieces, twelve in each slot.
  Their tiers are 2, 4 and the full set (`TIER_NEEDS`, `activeTiers`); the four-piece tier is the old three-piece one with the same
  ability and strength. The full sets' powers are named and described (`setPowers` lists the ones a kit switches on); batch 2 makes them
  fight.
- **Equip best** (`bestWhole` in `equipment.ts`, used by `bestFor` and the run's `equipBestReal`) searches by set: the kit as worn, the
  best piece slot by slot, and for every set the choices could make 2, 4 or the full set of, its best pieces in the slots where they lose
  least, the rest the best others, and again with a second set's two pieces in what is left. The kit as worn is kept unless a whole beats
  it, so a second press changes nothing.
- **The move of an old save** (`gearMigrate.ts`, run once by `loadMeta`, marked `Meta.gearV = 2`): every piece keeps its id, grade, level
  and wear; a weapon goes to the right hand (the Grimoire to the left), armour to the torso, a trinket to its base's slot; where two land in
  one slot the trinket stays and the other goes to the stash; a hero wearing all three pieces of an old set is given a Common fourth piece
  of the set; and every owned piece (and the cart's) is mended once, Hester's welcome. The hero sheet shows each of these as a line once
  (`Meta.gearNote`, `takeGearNote`). A run saved before has its heroes' finds moved the same way as it loads (`migrateRunWorn`, from
  `catalogueRun`). New saves start at `gearV = 2`.
- **Run finds** keep drawing from the 60 old bases in their old three groups, so every run's finds draw as before (batch 4 replaces them
  with runes).
- **The page** (`equipView.ts`, `equip.css`): the Equipment panel is a paper doll, the hero's portrait in the middle and the seven slots
  around it (the accessory and head above, the hands at its sides, the belt, torso and feet below). A new base not yet painted shows its
  slot's outline, faint, with its name (`docs/notes/gear-art-todo.md` lists them all, and a test keeps that list whole). A set's card shows
  a pip a piece and its three tiers, each lit when on.
- **Hester's gear shelf** shows four pieces a day from four of the seven slots (`STALL_GEAR`), one Epic and one Legendary among them as
  before (the design's economy table; its prices change in batch 3).
- **Identity fixtures:** `calamity` alone was re-recorded in `ailments-identical` and `spells-identity`: its heroes start bare and wear
  the run's finds, and a find from the old trinkets now goes to its own one of the seven slots, so a hero can wear more of them.
- **Screenshots:** `node tools/gear-build/shots.mjs` (after `npm run web`) writes `docs/samples/gear-build-*.png`: an old save moved over
  (the gift and Hester's welcome lines), a doll with a new piece in every slot, and the left hand's picker, at 393x852, 360x780 and
  412x915; no sideways scroll and no page errors at any size.
- **Tests:** `test/gear-slots.test.ts` (the catalogue, every migration case, the old bases unchanged, Equip best by set, jump), and the
  gear tests from before brought to seven slots.

## Batch 2: sets and legends

- **The full sets' powers** (`src/sim/setPowers.ts`): the fourteen of the design, each a rule of its own. A worn kit lists them
  (`EquipStats.powers`, from `setBonus`), and they run on the gear's own hooks (`equipFx.ts` calls in after a blow, when struck, on a kill,
  at the start and every tick) and on five one-line hooks: a damage step in `onStrike`, a skill cast in `powered` and a dodge in
  `onDodged` (`abilities.ts`), and a fall in `hurt` (`battle.ts`). Each is guarded by `powersOn`, set only when a hero wearing a power
  starts a fight, so every other fight plays out as before (the identity fixtures did not move). Chances use the fight's skill stream.
- **Where the words changed to match what the fight can do:** Eye of the Storm leaps every 4th blow (its +20% skill charge is a stat of the
  full tier); Thousand Duels makes the strongest foe come for the wearer (a long taunt) rather than walling the two off; Pyre Walker sets
  what the wearer's skills strike burning rather than the tiles; Tailwind is +30% move for the wearer (a stat) and a haste for it and the
  allies beside it, without the opening dash. Peakwarden's four-piece tier is "+5% hp, and every 5th blow stuns" (its full set is King of
  the Hill, which needs the higher ground).
- **The 21 named legends** (`legendBases.ts`: the pieces, their verses, powers and sources; `legends.ts`: the sources read from the save,
  `claimLegends`; `legendRenown.ts`: renown). A legend is a Legendary piece (item level 12) that is never rolled, bought, combined or sold
  (it is kept out of `EQUIP_LIST` and `EQUIP_BASE_IDS`; `salvageItem` and `sellPiece` refuse it, and the picker shows no Sell). A save holds
  one copy of each (`Meta.legends`). The sources are read from the save, so no mode needed to change: `claimLegends` runs as a save loads,
  as a run's finds come home and as the Equipment panel opens, and the panel says "A legend is yours: ..." once.
- **Sources moved from the design's draft:** the Mask of the Laughing Fox comes from the quest "The Oni King's Mask" (there is no Kitsune
  chain of lost techniques); the Unwritten Book from "Words of Unmaking, III: The Unwritten Library" (the Library has five levels, not
  seven); Captain Rook's Bandolier and the Time Witch's Hourglass from the tales that bring those heroes; the Pilgrim's Cord from the first
  hero to fight 100 waves (`Meta.wavesFought`, counted in `settleWear`); the Ashwalker Sabatons from a Calamity cleared whole with an
  ascension. The others are as drafted.
- **Renown** (`Equipment.renown`): the waves a worn legend fights, counted in `settleWear` (half under auto-replay, as wear is). Its power's
  strength follows the design's steps, 0.45 found, then 0.6, 0.75 and 0.9 at 25, 100 and 300 waves; the numbers in a legend's line are at
  0.6, so its power is x0.75 found, x1, x1.25 and x1.5. A verse of its story opens at each step.
- **Legends' powers** that act between waves (the Ring of Returning, the Pilgrim's Cord) come with batch 6's wounds and remedies.
  Where the fight has no Armour Class bonus to hand out, the Crown of the Last King's "+1 AC" is "allies within 2 tiles take 6% less from
  blows", the Wyrmhide's "+3 AC" is +1.5 defence, and the Seven-League Boots give the +1 jump gear allows (not +2).
- **The page:** a legend's card shows its power, its renown and the latest verse; the codex has a **Legends** page with every legend, its
  verses so far, and for one not yet found where it waits. Legends show the placeholder until painted (listed in `gear-art-todo.md`).
- **Tests:** `test/set-powers.test.ts` (every power fires in a small fight, a fight plays out the same twice, a full set switches its
  power on and six of seven does not, a fight with no power never switches them on) and `test/legends.test.ts` (the catalogue, the
  sources, one copy, never sold or combined, renown's steps, saves).
- **Screenshots:** `docs/samples/gear-build-legend-*.png` (a full Winter Court on the doll), `gear-build-legend-card-*.png` and
  `gear-build-legends-codex-*.png`, at the three sizes.

## Batch 3: growth, repair, patch, enchant, prices

- **Seasoning** (`season`, `seasonNeed`, `SEASON_CAP` in `wear.ts`; `Equipment.xp`): a piece worn in a wave gains a point (half under
  auto-replay, none while broken); at 8 + 2 x level points its item level goes up one, to its grade's cap (Common 8, Rare 12, Epic 16,
  Legendary and Mythic 20), and its durability with it. A legend grows by renown instead. The card shows a thin gold bar and "Seasoning
  14/26 waves · Lv 9 (cap 16)".
- **Repairs** are 1.6 times dearer a point (`REPAIR`: 0.32 Common to 0.88 Mythic), a quarter more for each glyph (`pointsCost`).
- **Patch and reforge** (`enchant.ts`): a patch, at camp or the stall, mends to 60% for 40% of a repair's price now, and scars the piece 2
  points of maximum durability for good (`Equipment.scars`, to a third of it; `maxDurability` takes them off). A reforge at the stall
  (standing 2) clears the scars for the price of a full repair from nothing.
- **Enchanting** (`glyphs.ts`, `enchant.ts`; the stall's new **Enchant** tab, standing 1): ten glyphs, each slot taking its own four to
  six; three are offered for a piece's next one, drawn from `mixSeed(m.seed, ENCHANT_SALT, piece id, count)` (`Meta.enchants` counts
  each glyph taken or cleared), so a reload offers the same three. Up to three a piece, at 300, 900 and 2,400 crowns times the grade's
  step (0.5 Common to 2 Mythic). Each wears the piece a fifth faster and makes its repairs a quarter dearer; clearing is free and returns
  nothing; a glyph adds nothing to the sale price. A legend takes none.
- **Prices and odds** (the design's economy table): stall gear 200 / 550 / 1,600 / 4,000; books 500 / 1,300, the traders' Rare 3,400;
  chests 600 / 2,400 / 9,000 with gear in 15% / 60% / every one; silver chests' Legendary 5% and no Mythic, gold's Legendary 16% and
  Mythic 3% (`QUALITY_WEIGHTS`, used by every chest). Income is not touched. Hester's welcome (everything mended once) came with batch 1's
  move.
- **The page:** the piece's card (seasoning, scars, glyphs) and Patch beside Repair; the stall's Repair tab with Patch and Reforge, and
  the Enchant tab. The Enchant tab's icon is a Rare book until its glyph-stone painting is made.
- **Tests:** `test/gear-upkeep.test.ts` (seasoning and its caps, patch scars and reforge, glyph offers, prices, wear and repairs, the
  no-loop rules: patching then selling never beats selling, an enchanted piece sells for no more); `wear.test.ts` and `stall.test.ts`
  brought to the new prices.
- **Screenshots:** `docs/samples/gear-build-upkeep-card-*.png`, `gear-build-stall-repair-*.png` and `gear-build-stall-enchant-*.png`.

## Batch 4: runes, the rules

- **`src/sim/runes.ts`**: the eight kinds (Ember +4% attack, Bulwark +1 defence and +5% hp, Arcana +5% skill power, Gale +4% attack and
  move speed, Hawk crit, Wellspring mending, Warding resist, and the Keystone), levels I to V at x1, x2, x3.5, x5.5, x8 (`RUNE_LEVEL`), times
  one knob, `RUNE_SCALE` (0.5 for now; see below). A level V rune adds a flourish, a signature ability the gear already runs.
- **Where the words changed:** Hawk is crit chance alone (+4.5% at I: the fight has no gear-side crit damage to raise); Wellspring is
  mending alone (0.3% hp a second); Warding is resist alone; Arcana's skill power is the talents' `pow` (it lifts the skills' blows and
  heals), so no new stat was needed; the level V flourishes are the nearest signature abilities (Ember V burns, Gale V a haste at the start,
  Bulwark V a ward at the start, Hawk V a crit feeds the skill...).
- **Getting runes:** every source that handed out a run's gear hands out a rune instead (`findGear`, `findSlotGear`): it still draws the
  slot from its own stream, so events, relics and foes play out the same, and the rune's kind from `mixSeed(run.seed, RUNE_SALT, stage,
  source, n)`, one in fifteen a Keystone. A better source (a boss, an elite, a cursed path) gives a level II. Every won wave adds a level I of
  its own (`waveRune`, its own source), so a boss wave gives two, one of them II. The merchant prices them 25 (I), 60 (II), and 60 a level
  past that, plus 2 a stage. The road's smiths and the mystery forges (the rune-carver) raise a rune a level (`upgradeFound`); a lost wager
  or a melt takes one (`loseFound`). The first clear's Keystone II is left for later.
- **Wearing, the bag, merging:** three sockets a hero kind (`RuneState.worn`, so merges and partings keep them); a Keystone is never worn.
  The bag holds eight: a ninth merges at once with a twin there, or the lowest is broken for 5 gold (the wave card says so). Two of a kind
  and level, or one and a Keystone of that level, make the next level where the one dropped onto was; V is the top. `mergeAll` merges the
  highest first, Keystones last, keeping the result on the hero that wore one.
- **Auto** (`autoRunes`): merges everything, then hands the runes out best first to the heroes named (the strongest first), three each, to
  the hero whose role wants it most (`RUNE_ROLE`: front-liners Bulwark, Ember, Warding; shooters Hawk, Gale, Ember; casters Arcana, Hawk;
  healers Arcana, Wellspring); a rune stays put unless a place rates it a tenth higher. The bot and auto-replay run it before every wave
  (`dressSquad`), and a rune run's Equip best is it.
- **In the fight:** a kind's worn runes add on top of its lasting kit (`runKitStats`), or alone in a run whose heroes start bare
  (`bareKitStats`), capped as the kit is.
- **The run's end:** runes are gone. A boss leaves a trophy (`trophyPiece`: any base of the catalogue, its own stream), which comes home a
  quarter of the time, every one on an army's first clear of its tier (`settleFinds`, read after the clear is recorded). Nothing else comes
  home. A run saved before runes (no `run.runes`) finishes on its finds as before.
- **`RUNE_SCALE` 0.5:** at 1 a fresh save cleared the daily's measured window 89% of the time (the test's bar is 50 to 85%); 0.5 reads
  80% and 0.25 71%, against the joint rebalance's 79%. Batch 6's wounds make the late waves harder, and batch 8 re-measures every mode.
- **Fixtures:** `calamity`, `daily` and `tower` re-recorded in `ailments-identical` and `spells-identity` (the run modes, as the design
  said); the Calamity's greedy run no longer reaches a boss with signature attacks, so it left that test's moved list.
- **Tests:** `test/runes.test.ts`; the RUN-GEAR tests now run on a run saved before runes (`pre` in `test/run-gear.test.ts`), the events,
  mystery, Calamity and recap tests count runes (`foundOf` in `test/helpers.ts`), and the wave's gains list a run's new runes
  (`waveGains.ts`).

## Batch 5: runes, the page

- **The rune tray** (`src/runeTray.ts`): in a rune run the pack ("Relics and runes") is the tray: a row for each fielded hero (each hero
  of the company before any is placed) with its portrait, name, three sockets and what its runes give ("+2% attack, +5% hp, +1 defence");
  the bag's eight cells; **Merge all** (with the merges ready) and **Auto runes**. Runes change between waves only (the tray is read-only in
  a fight). The relics stay at its top as before.
- **Tap to do it:** tap a rune and the places it can go light up in gold (the heroes' free sockets, the bag when it is worn, its twins);
  tap one to set it, swap it onto a full hero's rune, take it off, or merge it. Tap it again to put it down. **Drag is not built**: tapping
  does everything one-handed, and dragging between the tray's small cells on a phone was the riskier half; it can come later.
- **Showing who wears what:** each hero's card on the bench carries its three sockets over its portrait on the deploy screen (hidden in
  the fight). **Sockets over the heroes on the board are not built** (the board is drawn by Pixi; the bench beside it shows the same).
  Twins (a rune with another of its kind and level, or a Keystone of its level) have a gold rim and a "2" badge in the tray; the stone swells
  gently (its glow is steady, as the no-flicker rule asks), and holds still with reduced motion. The Pack button says "Pack · 3 merges" when merges are ready.
- **The stones** are drawn in their kind's colour with the level as pips (a clear placeholder) until their paintings come
  (`gear-art-todo.md`).
- **The wave card:** a rune's line reads "Ember rune I (+2% attack)"; a rune broken for room in a full bag says so; the wave's gains list
  new runes as its gear.
- **Pure helpers** (`runes.ts`): `socketsOf`, `runeTotals`, `runeTargets`, `dropRune`; tested in `test/runes-page.test.ts`.
- **Screenshots:** `node tools/gear-build/rune-shots.mjs` writes `docs/samples/gear-build-runes-bench-*.png`, `-tray-` and `-pick-` (a
  rune chosen, its targets lit), at the three sizes, no sideways scroll, no page errors.

## Batch 6: wounds and remedies

- **Wounds** (`src/sim/wounds.ts`): in a run started since runes, after a won wave of an army, the daily or a quest battle, each hero that
  fell stands again at half its hp (`REVIVE_SHARE`), those still standing are whole, and the Ring of Returning's wearer comes back whole.
  After a lost wave with hearts left, everyone is whole again. Settled in `noteFight`, which the page and the bot both call; kept as
  `Run.wounds`; read as a fight's start share through `hpShare` (`health.ts`), which the page already passed to every hero; the bot's
  `botBoost` now passes it too. The wave card says "Aiko stands again at half". A hero's bench card shows its wound before the fight (a
  part-filled amber bar and a bandage mark). The spire and the Calamity keep their own wounds (25%, campfires; the owner's answer 3).
- **Remedies** (`src/sim/remedies.ts`): the Bandage Roll (+30%, 60 crowns), Healing Draught (+60%, 180), Camp Stew (the squad +25%, 320,
  standing 2), Phoenix Ash (to full, 500, standing 2) and Elixir of the Keep (the squad to full, 1,400, standing 3). Owned in `Meta.satchel`.
  **Where the words changed:** the Phoenix Ash heals to full without the "+10% max hp for the next wave" (there is no next-wave bonus
  to hang it on without touching the fight); remedies are not in chests or first and Mythic clears yet (only Hester's shelf and a daily's
  clear give them), so a chest's opening did not need a new kind of item.
- **The satchel:** the party screen shows it once a remedy is owned: up to five, at most one Elixir, each with − and +, the last choice
  remembered (`satchelFor`, `pickSatchel`; the strongest first when room runs out), and the switch **Auto may use remedies** (off by
  default). The satchel is packed into the run the first time it is needed (the pack opens, or Auto heals) and its unused remedies come
  home when the run ends (`settleFinds`).
- **Using them:** the pack's tray has a Remedies pocket: tap a squad remedy to use it, or tap one and then a wounded hero (each hero shows
  its health). They work in the spire and the Calamity too, on their own wounds (`setShare`). The Alchemist's Sash adds a quarter and the
  Pilgrim's Cord a half on their wearer (`remedyBonus`).
- **Auto's rule** (`autoRemedy`, run by `autoRound` before a wave when the switch is on): any hero under half gets the cheapest remedy
  that brings it to three quarters (else the strongest it may use), keeping the Phoenix Ash and the Elixir for a boss wave; it never buys.
- **The stall:** the Tomes tab shelves the remedies (four Bandages and two Draughts a day, then the better ones by standing); they sell back
  for a fifth (`sellRemedy`). A cleared daily gives a Bandage Roll. Their icons are the rogue pack's potion and elixir until painted.
- **Tests:** `test/wounds.test.ts`, `test/remedies.test.ts`.
- **Screenshots:** `docs/samples/gear-build-remedies-*.png` (the pocket, a Bandage Roll chosen, the wounded knight lit),
  `gear-build-satchel-*.png` (the party screen) and `gear-build-runes-bench-*.png` (the wounded knight's card).

## Batch 7: art

- **The rune stones** are the 16px rune discs of the 5000 Pixel Effects pack (`src/art/runes/`, `src/runeArt.ts`, `CREDITS.md`): Ember the
  fire rune, Bulwark the wind's iron grey, Arcana the crystal's violet, Gale the forest's green, Hawk the light's gold, Wellspring the
  water's blue, Warding the moon's white, the Keystone the dark rune. They are drawn upright and pixel-sharp with the level as pips under
  them; an empty socket keeps its dark diamond. The twin's rim swells gently (reduced motion holds it still).
- **The pack audit** found nothing in the paintings' style for the equipment (`docs/notes/gear-art-todo.md` says what was looked at), so
  the 150 new pieces and the 21 legends keep their placeholders.
- **The painting pipeline** is ready for when the image account has credits: `tools/gear/gen-icons.mjs` paints a slot at a time into
  `art-source/gear/<slot>/`, and `tools/gear/import-gear-icons.py` now reads all 210 bases (new bases need only their standard painting).
  Nothing has been generated yet.
