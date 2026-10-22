# Hero equipment (permanent gear)

The heroes can wear **equipment** found in reward chests. It is kept for good and is separate from the in-run **gear** of
`src/sim/gear.ts` (one weapon, armour and charm for a run only) and from relics. In code and the UI the new kind is always
"equipment" (`Equipment`, `EquipSlot`, `equipment.ts`); "gear" still means the in-run one.

## Rules (`src/sim/equipment.ts`, pure and deterministic; the catalogue is `src/sim/equipBases.ts`)

- **Slots**: `weapon`, `armour`, `trinket`; a hero *kind* wears one of each (worn by kind, like levels and shards).
- **60 types, twenty a slot** (`EQUIP_LIST`). Weapons cover every calling: swords (Iron Sword, Runed Blade, Claymore,
  Frostbrand, Moonlit Katana), axes (Dragonbone, Headsman's), a mace and a maul, a spear, a dagger (Vampire Fang), a scythe,
  knuckles, bows and a crossbow, a blunderbuss, staves, a wand and a grimoire. Armours run light, medium and heavy (jerkin,
  hide, cloaks, chain, scale, plate, thornplate, bastion), robes, and special ones (dragonscale, lamellar, mithril, bone, ...).
  Trinkets are rings, amulets, charms, an idol, feathers, a drum, a lyre, a bell, orbs, potions and shards. Each has its own
  main-stat profile (no two alike; fast and light against slow and heavy, crit against raw attack, range for bows and
  guns, dodge, skill charge, regen, resist), its own icon, its own signature ability and its own Mythic name.
- **Main stats**: attack, hp (shares), defence (flat), attack speed, move speed, crit, range (whole tiles), dodge, skill
  charge, regen (hp a second) and resist (against burning and bleeding). `RARITY_SCALE` multiplies them (x1 to x2.05), each
  item level adds 4% (`LEVEL_STEP`, levels 1 to 20) and `MAIN_SCALE` (0.4) is the one knob that keeps the kit modest next
  to hero levels. Sums are capped (`CAPS`).
- **Signature ability**: only at Epic and above (`hasAbility`); Common and Rare have stats only. It is x0.45 at Epic, x0.55 at
  Legendary and x0.7 at Mythic (`ABILITY_SCALE`, plus 1% per item level; the catalogue's numbers are the full-strength ones): bigger numbers, longer durations, better odds.
  A **Mythic** also takes its own name (`itemName`: "Stormcaller Staff" becomes "Thunderlord's Reach"), and the name
  shows as the pop-up when its ability fires. (No sprite change: the pop-up is the cheap effect.)
- **Callings**: a base can suit `melee`, `shooter` or `caster` (`callingOf(kind)`); on a matching hero its main stats are
  x1.25 (`CALLING_BONUS`). Any hero can wear any item.
- **Salvage**: a spare item gives crowns, `SALVAGE_CROWNS[rarity] + level - 1` (5 up to 150).
- `itemStats(item, kind?)` is the item's numbers and abilities; `equipStats(meta, kind)` is the sum of a kind's worn pieces
  (undefined when it wears nothing). `describeAbility(ability, s)` writes an ability in plain words.

### The abilities (`equipFx.ts`)

An ability is data: a trigger (`hit` with a chance, `nth` blow, `crit`, `kill`, `struck` by a chance or every n-th blow
taken, `start`, `tick` every n seconds, `low` below 35% hp once, `death` once) and a kind (leech, burn, bleed, curse, slow,
stun, chain, splash, pierce, smite, execute, burst, charge, mana, heal, healAlly, shield, haste, stealth, guard, reflect,
counter, taunt, revive, regen, aura, banner, rally, berserk, cleanse), with a value, a duration and a count or chance.
Every one of the 60 is its own id and its own combination, for example: Stormcaller Staff chains lightning on every 4th
blow; Vampire Fang heals for 15% of its damage; Thornplate reflects 30% of a melee blow; Phoenix Feather revives the wearer
once a fight; Frostbrand freezes on a crit; the Warlord's Drum raises the attack of allies beside it; the Shadowcloak makes
the wearer untargetable for 3 seconds at the start. They run on the sim's own statuses: `Unit.dot` (burn, bleed, curse),
`stunUntil`/`busyUntil`, `slowUntil`, `hasteUntil`, `shield`, `guardUntil`, `banner` (the Samurai Commander's), `taunt`, the
king's mana and the heroes' skill charge, and the existing `arc` event. New small hooks: `fxBlow` (in `afterBlow`),
`fxStruck` (in `onStrike`), `fxKill` and `fxRevive`/`fxHurt` (in `hurt`), `fxStart` (the fight's start), `fxTick`
(`tickStatus`), and `Unit.hideUntil` (stealth; `decide` and the skills' `foesOf` skip a hidden fighter). Chances roll the
skill stream (`roll`), so fights stay deterministic; only a hero with equipment ever draws from it. `firedCount(unit, id)`
says how often an ability has fired.

## Meta

`Meta.equipment` (every item owned, worn or not; each `{ id, base, rarity, level }`), `Meta.equipped`
(`kind -> slot -> item id`) and `Meta.nextItem`, all optional, so old saves load with none (`readEquipment` and
`readEquipped` also drop nonsense: unknown bases (an item from the first 15-type draft of this branch is dropped), an item on two heroes, the wrong slot, bad levels). Ids are never reused.
`equipItem(meta, kind, id)` puts a spare item on a kind (the old piece goes back; false if the item is worn or the kind
isn't unlocked), `unequipItem(meta, kind, slot)`, `salvageItem(meta, id)` (spare items only), `spareEquipment(meta, slot?)`.

## Combat

`boostOf(h, rank, level, equip?)` (run.ts) takes the kind's `equipStats`, and `src/main.ts` passes it at both places a
hero is placed (`newBattle` and `put`), so runs, armies, the daily and the tower all get it. `Boost.equip` goes through
`addUnit`: hp and attack multiply into the unit's stats (the same path as levels and grades); the rest is `Unit.eq`, read
by the existing hooks: defence (`defenceOf` in the blow formula and the skills' `net`), attack and move speed (`swing`,
`stepTo`), crit (`rollCrit`), range (`strikeDef`), dodge and resist (`onStrike`), skill charge (`tickStatus`), regen
(`fxTick`) and the abilities above. A hero with nothing worn has no `eq` and no `equip` in its boost, so fights play out
exactly as before (tested). Tests: `test/equipment.test.ts` (the catalogue, rarity gating, every ability firing in a small
fight, a few effects, determinism, the rules and old saves).

### Balance (`npm run gear-balance`)

`tools/gear-balance.ts` plays random five-hero teams (300 per cell) at stage 13, hero level 3 (17.7% won with nothing worn),
paired by seed. Table 1 gives a whole kit's **effective strength**: the plain hp and attack bonus, with no equipment, that wins
as often as the kit (a random weapon, armour and trinket on every hero, item level 1 + 3 per army). The owner's target is a full
Mythic kit at a high item level worth about +25 to +35%.

| item level | Common | Rare | Epic | Legendary | Mythic |
|---|---|---|---|---|---|
| **Before** (`MAIN_SCALE` 0.6, ability x1 / 1.35 / 1.8) | | | | | |
| 1 (army 1) | +9% | +13% | +32% | +40% | +44% |
| 7 (army 3) | +11% | +17% | +36% | over +50% | over +50% |
| 13 (army 5) | +14% | +18% | +37% | over +50% | over +50% |
| 19 (army 7) | +16% | +21% | +41% | over +50% | over +50% |
| **After** (`MAIN_SCALE` 0.4, rarity x1 to x2.05, ability x0.45 / 0.55 / 0.7) | | | | | |
| 1 (army 1) | +6% | +8% | +18% | +21% | +29% |
| 7 (army 3) | +7% | +11% | +21% | +25% | +30% |
| 13 (army 5) | +9% | +12% | +22% | +27% | +34% |
| 19 (army 7) | +9% | +14% | +27% | +30% | +36% |

("Over +50%" is a kit that wins more than 99% of the fights, past what the table can measure.) Table 2 is each of the 60
types alone, worn Mythic at level 10 by every hero, as a win-rate lift in points: now from +1 (Scholar's Scroll) to the high
thirties, none breaking the balance. To tune further, lower `MAIN_SCALE` or `ABILITY_SCALE` in `equipment.ts`. (`npm run
balance` has no equipment in it; `gear-balance` is its equipment counterpart.)

## Chests (done)

`rollGear(rng, at, armyIdx)` in `src/sim/armyStars.ts` is filled in: silver (5 stars) and gold (10 stars) chests always drop one
piece, bronze (3 stars) 35% of the time (`BRONZE_GEAR_CHANCE`), by `rollEquipment` with the chest's quality, the army's place in
the list and a milestone bonus on the 10-star chest. It draws last from the chest's own stream, so no other reward changed.
`lootOf` grants it with `grantEquipment` when the chest is opened (a look at the stash grants nothing), and the reveal shows
the item's icon on its rarity frame ("Lucky Charm (Epic, Lv 20)"; a Mythic is a prize card). Tests: `test/armyStars.test.ts`.

## UI

- The hero sheet (`drawHeroSheet`, opened from the tavern or the party screen) has an Equipment panel
  (`src/equipView.ts`, styles in `src/equip.css`, inlined by `build.mjs` after `pixel.css`): three slots with the icon or an
  empty frame; a tap opens the picker in place: what is worn (Unequip), then the spare pieces for the slot, best first,
  with stat changes against the worn piece (green up, red down), affixes, a note when it suits the hero's calling, and
  Equip (Swap when the slot is full) and Salvage. Back returns to the slots.
- The tavern's count pinned over the Heroes page shows "N equipment".
- Icons: one per type, 60 16x16 tiles cut from DawnLike by `tools/equip-icons.py` (`src/art/equip/`, bundled as data URLs, so offline works), drawn at 3x and 4x only; rarity is the frame colour. The picker shows the ability in words, or "Epic and up: <ability>" on a lower piece.

## Screenshots

`node tools/audit/gear.mjs` (after `npm run web`) writes `docs/samples/gear-*.png` at 393x852 (and the sheet, picker and chest reveal also at 360x780 and 412x915): `sheet-empty`,
`sheet-filled`, `picker`, `deploy` and `fight` (a hero wearing a Runed Blade, Thornplate and Phoenix Feather). `docs/samples/gear-icons.png` (`python3 tools/equip-sheet.py`) is all 60 icons with their names.
