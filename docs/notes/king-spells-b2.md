# The king's spells, batch 2: the Schools of the Crown and the Decrees (KING-SPELLS)

The owner approved direction B of [king-spells-design.md](king-spells-design.md), and the director passed on the owner's answers to its three
open questions: **defaults on all three** (below). Batch 1 ([king-spells-b1.md](king-spells-b1.md)) was the stand-alone fixes; this batch
builds the schools on today's 21 spells, the new loadout and the Decrees. New spells (batch 4), ranks (batch 3), the Decrees' own art and
voices (batch 5) and the re-measure (batch 6) follow.

## The owner's three answers (the defaults)

1. Every save always knows its ruler's school's **first two spells**. Everything else is still taught by the Mage Tower, the milestones and
   the scrolls, and old saves keep every spell they own.
2. **Changing ruler is free** in Settings, as before; the loadout re-fits to the new school.
3. **Heal stays open to every ruler**: it is the Sun Viper's, and any ruler can put it in the open slot. A save's open slot starts with Heal.

## The schools (`src/sim/schools.ts`)

| Ruler | School | Spells (the first two are always known) | Decree |
| --- | --- | --- | --- |
| Iron Stag | Steel | Rally, Shield, Bulwark, Light Lance, Smite, Earthquake | Stand Fast |
| Ash Empress | Fire | Meteor, Battle Cry, Meteor Shower, Smite | Red Sky |
| Frost Witch | Ice | Frost Nova, Shield, Deep Freeze | Long Winter |
| Storm Corsair | Storm | Chain Lightning, Haste, Blink | The Tempest |
| Rose Duchess | Thorns | Hex, Poison Cloud, Cleanse | The Rose's Price |
| Moon Oracle | Stars | Haste, Renewal, Blink, Meteor Shower | Stop the Clock |
| Sun Viper | Sun | Heal, Light Lance, Cleanse | High Noon |
| Gilded Necromancer | Death | Hex, Call the Wolves, Resurrect | The Gilded Toll |

Every one of the 21 spells has a school. Earthquake, which the design left out, joins Steel. The schools with three spells get their new
ones in batch 4.

## The loadout

- `Loadout` (`src/sim/spells.ts`) gains `open` (the open slot) and `school` (the school it was last fitted to). `equipped` is now the three
  **school slots**. `castList(l)` is what a fight casts: the school slots, then the open slot.
- **The power budget is gone**, along with `spellBudget`, `SPELL_BUDGET` and `budgetOf`. Each spell's `power` stays as data. The Mage Tower's
  card no longer offers spell power (it still speeds the mana and teaches three spells a level).
- `fitSchool(l, ruler)`:
  - It teaches the school's first two spells.
  - It keeps the school's spells in the slots, in order.
  - When the school is new to the loadout (a ruler changed, or a save from before the schools), it fills the empty slots from the known
    spells of the school. A spell that no longer fits moves to the open slot, or Heal goes there if it is free.
  - A loadout already fitted to this school keeps the player's choices, empty slots included.
- The page runs `fitSchool` when the save loads and whenever the settings change (`main.ts`), and the spellbook does too as it draws.
- `equipBlock` / `equipSpell` / `unequipSpell` moved to `schools.ts` and take the ruler's id. A school spell takes a school slot, or the open
  slot once those are full; any other spell takes the open slot.
- An old save, for example one owning Heal, Meteor, Haste, Chain Lightning and Bulwark with the starting three equipped, under the Iron Stag:
  Rally, Shield and Bulwark in the slots, Heal in the open slot, and every spell still known (checked in the browser).

## The Decrees (`src/sim/decrees.ts`)

- The page arms the chosen ruler's Decree on every fight (`armDecree`): army waves, the daily, quests and the Calamity (`main.ts`), and the
  Last Stand, once a run (`standView.ts`). A fight never armed, which is every headless fight, test and balance table, plays as before.
- **The meter** (`feedDecree`, in `spells.ts` beside the mana that feeds it) fills to `DECREE_FULL` (8) from:
  - the mana that will not fit in the bar, one for one (with a Decree armed this replaces batch 1's spill);
  - three quarters of the mana spent on spells (`DECREE_PER_SPENT`);
  - a trickle of 0.1 a second.

  Hero ultimates do not feed it, because that would need a hook in the heroes' code. Other workers are changing the fights now, so this batch
  keeps its code in the spell modules.
- **Casting**: `castDecree` refuses unless the fight is on and the meter is full and unspent. It works once a fight, with no aim. It goes into
  the fight's log (`{ kind: 'decree' }`, replayed by `replayLog`). Its events are `decree` (its name) and a `spell` event and `spellfx` with
  the spell whose look and sound it borrows until batch 5.
- **The eight**: each touches every foe or every hero.

  | Decree | Effect |
  | --- | --- |
  | Stand Fast | A shield worth 40% of each hero's health for 6 s, and no fear |
  | Red Sky | A meteor's blow on every foe, with burning |
  | Long Winter | Every foe frozen 3 s, then chilled |
  | The Tempest | Lightning on every foe, which is left shocked |
  | The Rose's Price | Three stacks of poison on every foe, and a hex |
  | Stop the Clock | Every foe frozen 3 s, every hero hasted |
  | High Noon | Every hero heals 30%, and a beam burns every foe |
  | The Gilded Toll | The fallen rise at 40% (not in the Last Stand), and every hero heals 15% |

  The damage grows with the foes, like the spells (`kingStrike`, batch 1).
- **Auto** (`autoDecree`, called by `autoCast` before any spell):
  - A Decree on the foes is cast on a boss below half its health, or on three foes still worth fighting (two when only two are left).
  - Stand Fast and High Noon wait until three heroes are below half.
  - The Gilded Toll waits for a hero to fall.
  - The War Horn stays the player's. Both the Decree and the Eidolon may be used in one fight.
- **The HUD** (`src/decreeHud.ts`): a 360 px phone has no room for a fifth orb as well as the horn and the Auto switch, so **the mana box
  carries the Decree**. A thin gold bar under the mana shows the meter. Full, the box glows gold (a steady glow: the game allows no looping brightness), reads DECREE
  and casts it on a tap. The spell row may wrap the Auto switch underneath on a narrow phone that also shows the horn. The design suggested
  the ruler's face at the row's end; that comes back with the Decree's own art in batch 5 if there is room.

How often Auto casts a Decree (the casting bot, Red Sky armed on every fight, `DECREE=redSky node tools/king-spells-design/run.mjs 8`):

| Cell | Decrees a fight | King's share of damage |
| --- | --- | --- |
| Orc Warband, level 1 | 0.40 | 8% |
| Undead Legion, level 8 | 0.46 | 10% |
| Beast Packs, level 15 | 0.14 | 3% |
| The Labyrinth, level 35 | 0.70 | 8% |
| Infernal Host, level 55 | 0.13 | 2% |

The short fights end before the meter fills. The re-measure in batch 6 will tune the meter with the schools in.

## The spellbook

- It shows the ruler's school and its Decree, three school slots and the open slot, and a card for every spell with its schools ("School of
  Sun (yours)").
- The power meter and pips are gone.
- A known spell of another school offers "Equip in the open slot".

## Checks

- `test/king-spells-b2.test.ts` (new): every ruler has a school and its own Decree, and every spell a school; the meter's three feeds; once a
  fight, only when full; every Decree does something; a recorded fight replays its Decree; Auto's rules.
- `test/spellbook.test.ts` was rewritten for the new rules, an owner-approved change of requirement: the starting fit, the slots and open slot,
  the re-fit on a ruler change, an old save, saving and loading, a messy save.
- `spells-more.test.ts` (Hex, Poison Cloud and Cleanse in the Rose Duchess's slots), `castleScene.test.ts` (the Mage Tower's words), `docs/lines/new-lines.json` and the
  Chapel tip and quip, which no longer speak of a power budget, were updated to match.
- Shots at 393x852, 360x780 and 412x915 (`docs/samples/king-spells-b2-*.png`): the fight's four orbs (`fight`), the Decree ready (`ready`),
  just cast (`cast`), and the spellbook (`spellbook`). The row fits with no sideways scroll at every size.
