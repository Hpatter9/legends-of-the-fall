# Hero equipment (permanent gear)

The heroes can wear **equipment** found in reward chests. It is kept for good and is separate from the in-run **gear** of
`src/sim/gear.ts` (one weapon, armour and charm for a run only) and from relics. In code and the UI the new kind is always
"equipment" (`Equipment`, `EquipSlot`, `equipment.ts`); "gear" still means the in-run one.

## Rules (`src/sim/equipment.ts`, pure and deterministic)

- **Slots**: `weapon`, `armour`, `trinket`; a hero *kind* wears one of each (worn by kind, like levels and shards).
- **Rarity**: Common to Mythic (1 to 5, the heroes' rarity and colours). `RARITY_SCALE` multiplies main stats (x1 to x3.2);
  each item level adds 7% of the level-1 stat (`LEVEL_STEP`, levels 1 to 20).
- **Bases** (`EQUIP_BASES`, 15 of them): Iron Sword, Runed Blade, Dragonbone Axe, Hunter's Bow, Oak Staff, Stormcaller
  Staff; Leather Jerkin, Chain Mail, Plate Cuirass, Mage Robe, Ranger's Cloak; Lucky Charm, Iron Ring, Boots of Haste,
  Phoenix Feather. Main stats: attack, hp (shares), defence (flat), attack speed, move speed, crit chance, range (bows,
  whole tiles).
- **Affixes** (Epic and Legendary one, Mythic two, from the base's own pool; a little stronger at Legendary and Mythic):
  lifesteal, burn on hit, thorns, a start shield, and a guard (less damage taken).
- **Callings**: a base can suit `melee`, `shooter` or `caster` (`callingOf(kind)` from the kind's shot). On a matching hero
  its main stats are x1.25 (`CALLING_BONUS`). Any hero can wear any item.
- **Salvage**: a spare item gives crowns, `SALVAGE_CROWNS[rarity] + level - 1` (5 up to 150).
- `itemStats(item, kind?)` is the item's numbers; `equipStats(meta, kind)` is the sum of a kind's worn pieces (undefined
  when it wears nothing).

## Meta

`Meta.equipment` (every item owned, worn or not; each `{ id, base, rarity, level, affixes }`), `Meta.equipped`
(`kind -> slot -> item id`) and `Meta.nextItem`, all optional, so old saves load with none (`readEquipment` and
`readEquipped` also drop nonsense: unknown bases, an item on two heroes, the wrong slot, bad levels). Ids are never reused.
`equipItem(meta, kind, id)` puts a spare item on a kind (the old piece goes back; false if the item is worn or the kind
isn't unlocked), `unequipItem(meta, kind, slot)`, `salvageItem(meta, id)` (spare items only), `spareEquipment(meta, slot?)`.

## Combat

`boostOf(h, rank, level, equip?)` (run.ts) takes the kind's `equipStats`, and `src/main.ts` passes it at both places a
hero is placed (`newBattle` and `put`), so runs, armies, the daily and the tower all get it. `Boost.equip` goes through
`addUnit`: hp and attack multiply into the unit's stats (the same path as levels and grades); the rest is `Unit.eq`, read
by the existing hooks:

- defence: `defenceOf(unit)` (battle.ts) in the blow formula and the skills' `net`;
- attack speed and move speed: the `quick` of `swing` and the step time of `stepTo`;
- crit chance: `rollCrit`; range: `strikeDef` (so reach and walking goals both see it);
- lifesteal and burn: `afterBlow` (burn never replaces a skill's own burn or bleed); thorns and guard: `onStrike`; start
  shield: `applyTraits` at the start of the fight.

A hero with nothing worn has no `eq` and no `equip` in its boost, so fights play out exactly as before (tested).
Tests: `test/equipment.test.ts`.

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
For the screenshots and tests, `grantSampleEquipment(meta)` adds eight items of mixed rarity.

## UI

- The hero sheet (`drawHeroSheet`, opened from the tavern or the party screen) has an Equipment panel
  (`src/equipView.ts`, styles in `src/equip.css`, inlined by `build.mjs` after `pixel.css`): three slots with the icon or an
  empty frame; a tap opens the picker in place: what is worn (Unequip), then the spare pieces for the slot, best first,
  with stat changes against the worn piece (green up, red down), affixes, a note when it suits the hero's calling, and
  Equip (Swap when the slot is full) and Salvage. Back returns to the slots.
- The tavern's count pinned over the Heroes page shows "N equipment".
- Icons: 15 16x16 tiles from DawnLike (`src/art/equip/`, bundled as data URLs, so offline works), drawn at 3x and 4x only.

## Screenshots

`node tools/audit/gear.mjs` (after `npm run web`) writes `docs/samples/gear-*.png` at 393x852: `sheet-empty`,
`sheet-filled`, `picker`, `deploy` and `fight` (a hero wearing a Runed Blade, Plate Cuirass and Phoenix Feather).
