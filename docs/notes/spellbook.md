# The spellbook

More king's spells, a power budget so three strong ones can't be taken together, and slower mana.

- **Spells** (`src/sim/spells.ts`; mana / power / cooldown): Heal 3/2/6s, Haste 3/2/8s, Shield 3/2/8s (absorbs 40% of
  max health for 6s), Smite 3/3/8s (160 raw on the sturdiest foe in the 3x3), Chain Lightning 4/3/9s (70 raw, three
  jumps of 80%), Poison Cloud 4/3/12s (14 a second for 6s, ignores defence), Frost Nova 4/3/12s (freeze 2s, then half
  speed to 6s), Rally 4/3/14s (+25% attack, all heroes, 8s), Meteor 5/4/10s, Earthquake 5/4/14s (60 raw on every foe on
  height 1 or lower), Resurrect 5/5/20s (a fallen hero in the 3x3 rises at half health; refused, and no mana spent, with
  nobody to lift). Rally and Earthquake need no tile (`target: 'all'`); the page casts them on the card tap.
- **Power budget**: three slots, and the equipped powers must add up to `spellBudget(castle)` in `castle.ts`: 9, and the
  Mage Tower adds 1 at level 2 and again at level 4. The starting three (Heal, Meteor, Haste) cost 8.
- **Unlocking**: `Meta.spellbook = { owned, equipped }`. The starting three are free; the rest cost crowns
  (Shield 60 up to Resurrect 250). `readLoadout` makes a saved value sane (old saves get the starting three equipped;
  unowned, extra or over-budget spells are dropped). Rules: `equipBlock`, `equipSpell`, `unequipSpell`, `unlockSpell`.
- **Mana**: `MANA_PER_SEC` 1 -> 0.5, start still 2, top 10. A fight of 30-40s buys two to four casts.
- **The page**: `src/spellbook.ts` builds its own overlay; `bindSpellbook(meta, onChange)` once, then `openSpellbook()`
  (home has a "Spells" button; the menu redesign can call it from a tab). The fight's spell bar shows the equipped
  three, rebuilt at each fight.
- **Effects**: new `spellfx` battle event (a spell touched this fighter) plays `SPELL_FX[id]`; `SPELL_GLOW` tints the
  3x3. All sheets were already in `src/art/fx/magic`.
- The balance tool doesn't play spells, so the stage curve is unchanged. Tests: `test/spells.test.ts`,
  `test/spellbook.test.ts`.
