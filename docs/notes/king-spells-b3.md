# The king's spells, batch 3: ranks and school marks (KING-SPELLS)

Batch 3 of the owner-approved revamp ([king-spells-design.md](king-spells-design.md); batches 1 and 2: [king-spells-b1.md](king-spells-b1.md),
[king-spells-b2.md](king-spells-b2.md)). The director passed on the owner's yes to the plan: **one mark for each Mage Tower level and one for
each army cleared on Normal, three ranks a spell, and rank 3 adds a rider.**

## The rules (`src/sim/spellRanks.ts`, `src/sim/spells.ts`)

- **Marks**: `marksEarned(m)` is the Mage Tower's level plus the armies cleared (`armyCleared`, the Normal tier being the first a save can
  clear), so 4 + 9 = 13 at most today. `marksSpent` is one for every rank above the first. Marks are never lost, and once spent they don't come
  back.
- **Ranking up**: `rankUp(m, id)` spends a mark on a known spell, up to rank 3. `rankBlock` explains a refusal (not learnt, at the top, no mark
  free).
- **What a rank does** (`RANK_POWER`, `RANK_COOL`):
  - Rank 2: the spell strikes, heals and shields 20% harder and its cooldown is 15% shorter.
  - Rank 3: 40% harder and 30% shorter, plus its **rider**.
  - "Harder" covers the damage (on top of the might from batch 1, including meteors and poison that land later), the heals, Renewal's
    mending, Cleanse's mend and every shield. Durations do not grow, except where a rider says so.
- **The riders** (`RIDERS`, the spellbook's words; the rules are in `castSpell`):

  | Spell | Rank 3 adds |
  | --- | --- |
  | Heal | lifts every ailment from those it heals |
  | Meteor | a second meteor at half power falls on the spot 0.6 s later |
  | Haste | +20 to each hasted hero's skill meter |
  | Shield / Bulwark | the shields last 9 s |
  | Smite | a 1 s stun |
  | Chain Lightning | one more leap |
  | Poison Cloud | lingers 9 s |
  | Frost Nova | the freeze lasts 3 s |
  | Rally | heals every hero 10% |
  | Earthquake | reaches foes one step higher |
  | Resurrect | rises with 75% |
  | Cleanse | a 15% shield too |
  | Blink | untargetable for 3 s |
  | Hex | also slows |
  | Light Lance | sets its foes burning |
  | Renewal | lifts every ailment at once |
  | Deep Freeze | freezes the second sturdiest foe too |
  | Battle Cry | +60 instead of +40 |
  | Call the Wolves | three wolves |
  | Meteor Shower | seven meteors (two more, diagonally) |

- **The save**: `Loadout.ranks` holds the ranks above the first. `readLoadout` keeps only whole ranks from 2 to 3 on real spells. A rank
  belongs to the spell, so it carries over when the ruler, and with it the school, changes.
- **A fight**: the page copies the ranks onto every fight (`b.spells.ranks = fightRanks(...)`, `main.ts` and `standView.ts`). A fight with no
  ranks (`ranks` unset), which is every headless fight, test and balance table, plays exactly as before.

## The spellbook

- Under the slots, a line gives the marks free, the marks earned and where they come from.
- Each card shows its rank (◆◆◇), what the rank gives, the rank-3 rider (lit once it is reached) and a **Rank up · 1 mark** button beside
  Equip. The button is greyed, with its reason on its title, when no mark is free.

## Checks

- `test/king-spells-b3.test.ts` (new): marks from the tower and the armies; ranking up to the top and refusals; saving, loading and an odd
  saved value; a ranked Heal's strength and cooldown (rank 1 the same as none); every spell has a rider; Chain Lightning's extra leap, the
  second meteor and the third wolf.
- The spells, Auto, spellbook and batch 1 and 2 tests pass unchanged.
- Shots at 393x852, 360x780 and 412x915 (`docs/samples/king-spells-b3-spellbook-*.png`): a save with the Mage Tower at 2 and the Orc Warband
  cleared (3 marks), after Heal was raised to rank 2.
- The balance is not re-measured here: the tables play no ranks. Batch 6 re-measures with the schools, the Decrees and the ranks in.
