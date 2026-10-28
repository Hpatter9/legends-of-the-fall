# Where spells come from

The owner's ask: spells should be gained some other way than buying them; the spellbook stays as the place to pick the
three and read what each does. Spells are no longer bought: `unlockSpell` and each spell's crown `price` are gone.
The rules are in `src/sim/spellSources.ts`.

- **The Mage Tower teaches the everyday spells** (`TOWER_SPELLS`), three a level:
  - Level 1: Shield, Cleanse, Smite.
  - Level 2: Hex, Chain Lightning, Blink.
  - Level 3: Poison Cloud, Frost Nova, Light Lance.
  - Level 4: Rally, Renewal, Battle Cry.

  A level teaches its spells the moment it stands (the home's `onBuilt` hook in `main.ts`).
- **Milestones earn the grand spells** (`MILESTONE_SPELLS`), each from the thing it suits:

  | Spell | Earned when you |
  | --- | --- |
  | Resurrect | clear the Undead Legion |
  | Call the Wolves | clear the Beast Packs |
  | Deep Freeze | clear the Ogre Clans |
  | Meteor Shower | clear the Infernal Host |
  | Earthquake | clear the Golem Forge |
  | Bulwark | reach wave 15 of the Last Stand (old endless-tower floors count too) |

- **Spell scrolls are the backstop.** A gold chest holds a scroll 30% of the time and a Mythic chest 60% of the time.
  The scroll teaches one spell the save does not know yet. Each chest draws it from its own side stream of its seed
  (`SCROLL_SALT`), so the crowns, stones, tomes and gear roll exactly as they did. Peeking at a chest and then opening it
  show the same scroll. A save that knows every spell finds no scroll. The Open all summary lists the scrolls above the
  gear. Daily, bronze and silver chests hold no scrolls, and neither do the shop's chests.
- **`grantSpells(m)`** teaches every spell whose tower level or milestone is met. It runs when a save loads, after a
  fight settles (beside `grantContent`, with a "Spell learnt" toast) and when a build stands.
- **Old saves** keep every spell they bought. They also learn at once anything their Mage Tower level or milestones
  already earn.
- **The spellbook** still has the power meter, the three slots and a card for every spell:
  - The header counts the spells known ("7 of 21 spells known") instead of showing crowns.
  - A card for a spell not yet known says where it comes from, with a bar for the tower level or the Last Stand wave.
  - Those cards are sorted by tower level, then the milestones.
  - A hint under the slots explains the three sources.
- The Mage Tower's card now says that each level teaches three spells.

Tests: `test/spell-sources.test.ts` (new). `spellbook`, `spells`, `spells-more` and `chapel` were updated: the buying
tests became "nothing is bought" and "learning a spell once the Chapel is built".
