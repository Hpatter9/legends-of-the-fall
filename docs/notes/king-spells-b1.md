# The king's spells, batch 1: the four stand-alone fixes (KING-SPELLS)

The owner approved the revamp in [king-spells-design.md](king-spells-design.md): direction B, Schools of the Crown, with C's Decree meter fed
by spilt mana and the soft snap to aim, plus the four fixes that stand on their own. This batch is those four fixes and the snap. It ships on its
own; schools, ranks and Decrees follow in later batches.

## 1. Mana over the cap is kept

- `fillMana` (`src/sim/spells.ts`): what will not fit in the bar goes to `SpellState.spill`, up to `SPILL_MAX` (10). As soon as a cast makes
  room, the spill pours back into the bar at the next tick. A king who waits for the right moment loses nothing.
- The bar reads "10/10 +4" while spill waits (`manaText`, on the main fight screen and in the Last Stand).
- A fight that never fills the bar has no spill and plays exactly as before (`spill` stays unset).
- Batch 2 sends the spill to the ruler's Decree meter instead.

## 2. Damage spells grow with the foes

- `kingMight(b)`: `max(1, (foeBoost.hp / 1.4) ^ 0.5)`. `Battle.foeBoost.hp` is the health boost the fight's foes were made with (the army, the
  tier, the wave, the mode; the Last Stand sets it wave by wave). 1.4 is about the first army's, so the first armies play as before.
- It multiplies Meteor, Meteor Shower, Smite, Chain Lightning, Earthquake, Light Lance (through `strike`) and Poison Cloud's bites, before the
  foe's defence comes off. Heal, Shield, Bulwark and Renewal were shares of health already.
- The boost by cell (the bot's fights): Orc Warband 1: 1.38 (might 1); Beast Packs 15: 2.8 (1.4); the Labyrinth 35: 8.0 (2.4); the Infernal
  Host 55: 20.6 (3.8); the Golem Forge 74: 27.6 (4.4).

## 3. Auto casts its area spells

- `AREA_CROWD` (2) in `autoCast.ts`: Meteor, Poison Cloud, Frost Nova, Hex, Light Lance and Earthquake go on two foes worth hitting, or one
  elite (`ELITE_FOES`), or the boss (it was three). Chain Lightning needs one other foe in reach (it was two), or an elite.
- A buff waits while a harm spell has foes to hit but not yet the mana. Before, Haste always took the mana first, and with Heal's reserve kept
  back, Meteor never reached its 5.
- Smite's "worth the bolt" line takes the might into account.

## 4. Bigger orbs, and the hint off the board

- The spell orbs, the mana box and the Auto switch are **48 px** (they were 40), on the main fight screen and in the Last Stand
  (`src/fightHud.css`); the Last Stand's countdown and notes moved down 8 px to match.
- The hint is one short line ("Meteor: tap a tile · tap the orb to cancel") above the orbs, over the top bar's status line, so it no longer
  covers the board. The spell's full words stay on the orb's title and in the spellbook.

## 5. The soft snap

- `src/sim/spellAim.ts`, `snapSpell(b, id, u, v)`: when a spell is tapped or dropped on a tile, its 3x3 slides by at most one tile to where it
  catches strictly more. That means foes for a harm spell, health missing for Heal and Renewal, heroes for a buff or Shield, a fallen hero for
  Resurrect, and the fullest column (sideways only) for Light Lance. Between equals it keeps the tile, then prefers a straight step to a diagonal.
  Blink, the wolves and the spells that need no tile are not moved.
- The page snaps the preview and the cast the same way (`main.ts`, `standView.ts`), so what the player sees is what lands. The cast is an
  ordinary `castSpell` on the snapped tile, so the fight's log replays it.

## What it does (the casting bot, `node tools/king-spells-design/run.mjs 8`, Heal, Meteor, Haste)

| Cell | Before: casts, damage share, Meteor casts | After |
| --- | --- | --- |
| Orc Warband, level 1 | 3.9, 0%, 0.0 | 3.6, 3%, 0.3 |
| Undead Legion, level 8 | 4.4, 0%, 0.0 | 4.2, 5%, 0.5 |
| Beast Packs, level 15 | 2.4, 0%, 0.0 | 2.3, 2%, 0.3 |
| The Labyrinth, level 35 | 6.0, 0%, 0.0 | 5.0, 3%, 0.6 |
| Infernal Host, level 55 | 2.3, 0%, 0.0 | 2.1, 0%, 0.0 |

The difficulty is re-measured to the owner's pace in the last batch, once the schools are in.

## Checks

- `test/king-spells-b1.test.ts` (new): the spill (kept, limited, poured back, its words), no spill in a fight that never fills, the might (1
  without a boost, growing with it), a boosted Smite, the snap (harm, heal, ties, Blink, Rally, Lance), and Auto's crowd of two.
- `test/spells-identity.test.ts`: `spells` re-recorded, the only scenario that casts damage spells on boosted foes (said in its header).
- Shots at 393x852, 360x780 and 412x915: `docs/samples/king-spells-b1-aim-armed-*.png` (the hint), `king-spells-b1-aim-spill-*.png` ("10/10
  +1"), `king-spells-b1-auto-cast-393.png` (Auto's first cast), `king-spells-b1-stand-393.png` (the Last Stand's larger orbs).
