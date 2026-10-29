# Each army needs the one before it beaten

The owner found the fourth army open before the third was beaten: armies opened on the stars won over every army (`ARMY_NEED`, two
more an army), and the first army's tiers hold enough stars on their own to open several armies.

`armyUnlocked` (`src/sim/armies.ts`) now opens an army only when the army before it (`armyBefore`) has been beaten (cleared on any
tier: `armyCleared`) **and** the stars reach its number, as before. A save that had an army open from before the stars
(`Meta.opened`) keeps it. The locked card says what is missing: "Beat the Beast Packs · 6 stars" (the army before is named once
it is open, else "the army before"), and "Opens at 6 stars" once that army is beaten.

Tests: `test/armies.test.ts` (stars alone never open an army past an unbeaten one; the star curve and the "new army glows" test
now beat the armies before, the owner's changed rule).
