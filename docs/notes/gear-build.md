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
