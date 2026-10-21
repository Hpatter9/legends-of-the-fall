# Events, relics and gear

The run's layer between fights. All of it is saved in the run (old saves just have none of it).

- **Events** (`src/sim/events.ts`, screen `src/events.ts`): after every 2nd stage that is not a boss stage, `finish`
  draws a card (`run.event`) from `mixSeed(seed, 0xe7e47, stage)`. Everything it can give is drawn with the card, so a
  saved card replays. Kinds: shrine (free +30% hp or +15% attack next fight), merchant (a relic and a piece of gear for
  gold; the stall stays open), mystery chest (relic, gear or gold), cursed path (next foes +30% for +gold and a better
  piece of gear) and training ground (gold for +12% attack or +20% hp to one hero, for good). `run.buff` carries the
  next fight's boons and is cleared when it ends. The card opens over the next stage's board after "Next stage".
- **Relics** (`src/sim/relics.ts`): 12, kept by id in `run.relics`, no duplicates. Whetstone (+8% atk), Banner (+10% hp),
  Hourglass (mana +25%), War Drum (foes wait 1s), Lucky Coin (+12 gold a win), Phoenix Feather (one hero rises at half
  hp once a fight), Iron Shield (-6% damage), Feather Charm (6% dodge), Hawk Eye (+8% crit), Swift Boots (+6% speed),
  Scholar's Scroll (skills charge +20%), Spyglass (+0.3 reach from height). `startStage` puts atk, hp and mana into the
  fight's boost and the rest into `Stage.relics`; `applyTraits` merges those with the traits (`b.traits`).
- **Gear** (`src/sim/gear.ts`): weapon (+8% atk per tier), armour (+8% hp), charm (+3% of each); tiers 1-3 rise with the
  stage. A boss stage always drops one (a tier up, stream `0x6ea2`); chests, the merchant and cursed paths give more.
  `run.items` is the pack; `Owned.gear` is what a hero wears; a merge hands the worn gear back to the pack.
  `boostOf` is a hero's whole boost (grade, rank, gear, training).
- **The page**: relic icons in the panel (tap for the text), a Pack button (relics, then tap a hero and an item to equip,
  tap a worn piece to take it off; gear changes before a fight only). Item icons are DawnLike tiles in `src/art/items/`.
- Tests: `test/events.test.ts`, `test/relics.test.ts`.
