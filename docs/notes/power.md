## Hero power

One number for how strong a hero is, so heroes can be set side by side. `src/sim/power.ts`:

- `powerOf(kind, boost)` reads what the fight reads: the kind's stats, the boost's hp and attack (grade, rank, level, tier and
  a run's gear) and its `equip` (equipment and talents, `heroStats`).
- Toughness is hp, raised by defence (`DEF_REF` 15), dodge, mending and resistance.
- Harm is attack times blows a second, crit, splash and reach (+10% a tile).
- The power is the square root of toughness times harm, nudged by skill charge, walking speed, abilities (+5% each) and talent
  skill changes (+3% each), times `POWER_SCALE` (10). A fresh Common sits near a thousand.
- `kindPower(meta, kind)` gives a kind's power outside a run (grade 1).

Where it shows:

- the hero sheet ("Power", updated as equipment or talents change);
- the party cards;
- the bench cards in a run (with the hero's grade and run gear; the bench redraws when a power changes).

Test: `test/power.test.ts`.

## The battle's Hire button

The bench's gold button was "Summon", the same word as the crown pulls in the Recruit hall. It now reads "Hire · <cost>", and
so does its tip. "Summon" means only the Recruit hall's pulls. The code names (`summon`, `#summon`) are unchanged.

## Placed heroes leave the bench while deploying

During deploy, a hero already on the board is hidden from the bench (`body[data-phase='deploy'] .card.placed` in
`index.html`), so the bench shows only who is still waiting. Dragging a hero off the board onto the panel brings it back.
Once every hero is placed, the bench reads "Every hero is on the field". In the fight and on the result screen the cards come
back, with their health bars.
