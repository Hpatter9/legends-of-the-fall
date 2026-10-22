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
  charge, regen (hp a second) and resist (against burning and bleeding). `RARITY_SCALE` multiplies them (x1 to x2.6), each
  item level adds 4% (`LEVEL_STEP`, levels 1 to 20) and `MAIN_SCALE` (0.6) is the one knob that keeps the kit modest next
  to hero levels. Sums are capped (`CAPS`).
- **Signature ability**: only at Epic and above (`hasAbility`); Common and Rare have stats only. It is x1 at Epic, x1.35 at
  Legendary and x1.8 at Mythic (`ABILITY_SCALE`, plus 1% per item level): bigger numbers, longer durations, better odds.
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

`tools/gear-balance.ts` plays random five-hero teams at stage 12, hero level 3 (about 32% won with nothing worn), paired
by seed. A whole kit on every hero lifts that to about 57% (Common), 72% (Rare), 96% (Epic) and 100% (Legendary and Mythic);
that is an extreme (every hero in a full kit) at a steep part of the curve (one hero level is worth about 45 points there).
A single Mythic level-10 piece worn by every hero lifts it from +6 (Scholar's Scroll) to +68 points (Phoenix Feather,
Blunderbuss, Vial of Vigor, Healer's Lyre); the middle is +45 to +55. `MAIN_SCALE` (0.6) was set from this, and three weak
pieces were nudged up. If the climb gets too easy, lower `MAIN_SCALE` or `ABILITY_SCALE` first.

## Hook for the chests

```ts
import { grantEquipment, rollEquipment } from './sim/equipment';
import { Rng, mixSeed } from './sim/rng';

// in the reward roll's `gear` hook (the chest worker's), with the chest's quality ('bronze' | 'silver' | 'gold'):
const rng = new Rng(mixSeed(meta.seed, <a salt for chests>, <the chest counter>));      // its own side stream
const item = grantEquipment(meta, rollEquipment(rng, { quality, armyIndex, milestone }));
saveMeta(meta);
// `item` is the Equipment granted (with its id), to show in the reward
```

`rollEquipment` draws only from the rng it is given, so a chest's contents follow its seed. `armyIndex` is 0 for the first
army (item level 1 + 3 per army + 0 to 2) and `milestone` (boolean or a count) adds 2 levels each (a boss wave, a clear).
Quality sets the rarity odds (`QUALITY_WEIGHTS`, percent): bronze 70/25/5/0/0, silver 30/40/22/7/1, gold 5/25/40/24/6.
For the screenshots and tests, `grantSampleEquipment(meta)` adds eight items of mixed rarity. A rolled item has no affixes: its ability comes from its base at Epic and up.

## UI

- The hero sheet (`drawHeroSheet`, opened from the tavern or the party screen) has an Equipment panel
  (`src/equipView.ts`, styles in `src/equip.css`, inlined by `build.mjs` after `pixel.css`): three slots with the icon or an
  empty frame; a tap opens the picker in place: what is worn (Unequip), then the spare pieces for the slot, best first,
  with stat changes against the worn piece (green up, red down), affixes, a note when it suits the hero's calling, and
  Equip (Swap when the slot is full) and Salvage. Back returns to the slots.
- The tavern's count pinned over the Heroes page shows "N equipment".
- Icons: one per type, 60 16x16 tiles cut from DawnLike by `tools/equip-icons.py` (`src/art/equip/`, bundled as data URLs, so offline works), drawn at 3x and 4x only; rarity is the frame colour. The picker shows the ability in words, or "Epic and up: <ability>" on a lower piece.

## Screenshots

`node tools/audit/gear.mjs` (after `npm run web`) writes `docs/samples/gear-*.png` at 393x852: `sheet-empty`,
`sheet-filled`, `picker`, `deploy` and `fight` (a hero wearing a Runed Blade, Thornplate and Phoenix Feather). `docs/samples/gear-icons.png` (`python3 tools/equip-sheet.py`) is all 60 icons with their names.
