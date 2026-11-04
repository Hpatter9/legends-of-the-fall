# The king's spells, batch 4: the schools' new spells (KING-SPELLS)

Batch 4 of the owner-approved revamp ([king-spells-design.md](king-spells-design.md); batches 1 to 3:
[b1](king-spells-b1.md), [b2](king-spells-b2.md), [b3](king-spells-b3.md)). Fourteen new spells bring every school to five or six. The art
credits come back later, so for now each new spell **borrows the look and the sound of one of the first 21** (`SPELL_LOOK`); batch 5 gives
them their own.

## The spells (`src/sim/spells.ts`; mana, cooldown; rank 3 rider)

| School | Spell | What it does | Rank 3 |
| --- | --- | --- | --- |
| Fire | **Wall of Fire** (4, 12 s) | a burning wall three tiles across the tapped row for 6 s; it is laid under fighters too, so the foes in it burn at once | five tiles |
| Ice | **Ice Wall** (3, 12 s) | an ice wall three tiles across, barring the way for 6 s and chilling the foes beside it | five tiles |
| Ice | **Shatter** (4, 10 s) | a heavy blow (90) on the foes in a 3x3, twice as heavy on a frozen, chilled or slowed foe | three times |
| Storm | **Gale** (3, 10 s) | the foes in a 3x3 are thrown two tiles back from the hero nearest the gust (a shove: walls, edges and saves as for the heroes' shoves) | three tiles |
| Storm | **Thunderclap** (4, 12 s, no tile) | every foe beside a hero takes 50 and is stunned 1 s | 2 s |
| Thorns | **Thorn Snare** (3, 12 s) | the foes in a 3x3 are held still 2 s | 3 s |
| Thorns | **Charm** (4, 14 s) | the sturdiest foe in a 3x3, never a boss, fights for you 4 s | 6 s |
| Stars | **Foresight** (3, 12 s) | the heroes in a 3x3 slip from sight 2 s: no foe can single them out | 3 s |
| Sun | **Sunbeam** (4, 9 s) | a beam along the tapped row: 75 to every foe in it, and it burns | three rows |
| Sun | **Venom Fang** (3, 8 s) | the sturdiest foe in a 3x3 takes 40 and three stacks of poison | five |
| Sun | **Mirage** (3, 14 s) | two decoys rise on free tiles in a 3x3 and draw the blows | three |
| Death | **Drain Life** (4, 10 s) | the sturdiest foe in a 3x3 takes 100, and your most wounded hero heals by the harm done | the other heroes in the area heal by half |
| Death | **Bone Wall** (3, 14 s) | a stone wall three tiles across for 8 s | five tiles |
| Death | **Raise Dead** (5, 20 s) | up to two foes fallen in a 3x3 rise as wraiths that fight for you (each foe once; never a boss) | three |

- The damage grows with the foes (`kingStrike`, batch 1) and the rank (batch 3), like the first spells'.
- The walls use the movement toolkit's walls (`toolkit/walls.ts`), the throw its shoves (`toolkit/move.ts`), the hold, charm and poison the
  ailment model, and the decoys and wraiths are the heroes' existing summons.
- **Foresight** was meant to be "dodge the next blow". That needs a hook in the blow code, outside the spell modules (other workers are
  changing the fights now), so it hides the heroes for 2 s instead, through the same rule as Blink. Say if it should be the dodge after all.
- A cast is refused, and no mana is spent, when a wall has no tile to stand on, Mirage has no room, or Raise Dead has no fallen foe to lift.

## The schools (`src/sim/schools.ts`)

| School | Spells |
| --- | --- |
| Steel | Rally, Shield, Bulwark, Light Lance, Smite, Earthquake |
| Fire | Meteor, Battle Cry, Meteor Shower, Smite, **Wall of Fire** |
| Ice | Frost Nova, Shield, Deep Freeze, **Ice Wall**, **Shatter** |
| Storm | Chain Lightning, Haste, Blink, **Gale**, **Thunderclap** |
| Thorns | Hex, Poison Cloud, Cleanse, **Thorn Snare**, **Charm** |
| Stars | Haste, Renewal, Blink, Meteor Shower, **Foresight** |
| Sun | Heal, Light Lance, Cleanse, **Sunbeam**, **Venom Fang**, **Mirage** |
| Death | Hex, Call the Wolves, Resurrect, **Drain Life**, **Bone Wall**, **Raise Dead** |

## Where they come from

- **The Mage Tower teaches them**, beside the three everyday spells a level it already taught (`TOWER_SPELLS`):
  - level 1: Ice Wall, Gale, Thorn Snare, Venom Fang;
  - level 2: Shatter, Foresight, Sunbeam, Bone Wall;
  - level 3: Wall of Fire, Thunderclap, Mirage, Drain Life;
  - level 4: Charm, Raise Dead.
- A save whose tower already stands learns them when it loads (`grantSpells`).
- Chest scrolls can hold them too.

## Auto (`autoCast.ts`) and the snap (`spellAim.ts`)

- **Help**: Drain Life when a hero is hurt and a foe worth it is at the heroes; Foresight on a 3x3 holding a hero below 30% with foes on it.
- **Harm**:
  - Wall of Fire and Shatter on the thickest pack at the heroes (Shatter counts the frozen and chilled twice).
  - Gale and Thorn Snare on the pack at the heroes.
  - Ice Wall and Bone Wall halfway between the nearest hero and two or more foes still on their way.
  - Thunderclap when two foes are beside heroes.
  - Sunbeam down the fullest row.
  - Venom Fang on the sturdiest foe at the heroes, and Charm on the same while above half its health (never a boss).
  - Mirage when three foes or a boss are close by.
  - Raise Dead where most foes have fallen.
- **The snap**:
  - The 3x3 spells slide to the most foes.
  - Sunbeam slides up or down a row, and Raise Dead to the most fallen.
  - The walls and Mirage land where they are put.

## Look and sound

- `SPELL_LOOK` maps each new spell to the first spell it borrows from, and `withLooks` fills the renderer's and the sound's tables
  (`fxRules.ts`, `skillFx.ts`, `spellSignatures.ts`, `spellIcons.ts`, `spellSfx.ts`); `castOf` and `effectOf` play the borrowed files.
- The pairs: Wall of Fire uses Meteor's; Ice Wall, Frost Nova's; Shatter, Deep Freeze's; Gale, Haste's; Thunderclap, Chain Lightning's; Thorn
  Snare and Venom Fang, Poison Cloud's; Charm, Hex's; Foresight, Blink's; Sunbeam, Light Lance's; Mirage, Cleanse's; Drain Life, Smite's; Bone
  Wall, Bulwark's; Raise Dead, Resurrect's.
- Thunderclap, cast on no tile, is heard in the middle (`NO_TILE_SPELLS`).

## Checks

- `test/king-spells-b4.test.ts` (new): fourteen spells, every school five or six, each taught, with a look, a rider and a school; the walls
  (and refusals, and the five-wide rank 3); Shatter, Sunbeam, Thunderclap and Venom Fang; Drain Life, Foresight, Mirage and Charm; Raise Dead
  once each; Gale and Thorn Snare; Auto's picks and Sunbeam's snap.
- Changed to match the approved plan:
  - `spell-sfx.test.ts`: the first 21 keep sounds of their own, and the new ones borrow, checked against `SPELL_LOOK`.
  - `spell-sources.test.ts`: the Mage Tower's new lists.
  - `spells-more.test.ts`: the count of spells.
- The identity proofs re-recorded `spells` alone, which casts every spell once, now 35. No other scenario moved.
- Shots (`docs/samples/king-spells-b4-*.png`): a Storm Corsair save with Auto on, its first cast (Gale) at 393x852, and the spellbook at
  393x852, 360x780 and 412x915 ("30 of 35 spells known" with the tower at 4). No sideways scroll.
