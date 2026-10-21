# The king's spells

The one thing the player does during a fight. Rules are in `src/sim/spells.ts` (pure, deterministic, no randomness).

- **Mana**: `b.spells.mana`, 1 a second from 2 to 10, filled in `stepBattle`.
- **Spells** (`SPELLS`): Heal (3 mana, 6 s cooldown, heroes in a 3x3 regain 40% of their health), Meteor (5, 10 s,
  110 raw damage less defence to foes in a 3x3, 0.9 s after the cast), Haste (3, 8 s, heroes in a 3x3 act 1.5x as fast
  for 5 s; `speedOf` scales attack and walk times in `battle.ts`).
- **`castSpell(b, id, u, v)`** is the only way in. It refuses (returns false, changes nothing) unless the fight is on,
  the tile is on the board, and the mana and cooldown allow. Its events (`spell`, `heal`, `haste`, and an `area` for
  the meteor's fall) wait in `b.spells.events` and come out of the next `stepBattle`. Meteor hits show `by: 0` (the
  king, who is not on the board).
- **The page**: `#spells` sits at the top of the panel, shown only during the fight. Tap a card, then a tile (a
  finger down on the board previews the 3x3, red for the meteor, green otherwise); tap the card again to cancel.
  Cards grey out while unaffordable and show a cooldown shade.
- Effects reuse `src/art/fx` (blast, fire, impact tinted green or gold); nothing new was copied from the packs.
- Tests: `test/spells.test.ts`.
