# Hall of Heroes: every hero worth collecting and ranking

The owner's ask: make every hero worth collecting and ranking, not only the five a player fields. Three parts, all in `src/sim/hall.ts`.

## 1. The Hall

Each hero owned lends **every** hero a little of its class's strength for each rank it has: its taken ranks 1 to 4 and its two awakened
steps (`heroRank`, at most 6). Rank 0 lends nothing.

| Class | Lends | Per rank | Cap |
|---|---|---|---|
| Guardian, Bulwark, Warden, Support | HP | +0.15% | +9% |
| Blade, Vanguard, Beast, Gunner | ATK | +0.15% | +8% |
| Assassin, Marksman, Trickster | Crit | +0.08% | +3% |
| Caster, Arcanist | Skill charge | +0.15% | +6% |

- The first draft was a third higher (0.2%, 0.2%, 0.1%, 0.2%; caps 12%, 10%, 4%, 8%); the measure below took it down.
- **Where it counts:** it is added to every hero's lasting stats (`heroStats`, after gear and talents), so it counts wherever those do: the
  army runs, the daily, the Last Stand, the quests, and the hero's Power on the page. A run whose heroes start bare (the Calamity's) reads
  none of it.
- **Duels:** a duel's champion fights **without** the Hall (`withoutHall`, at the page's and the tools' `startDuel`): with a day-180 Hall
  the duels rose past their band (below).
- **The switch:** `HALL.on` (the tools' `HALL.force` sets a measure's own Hall). The recorded fights pass unchanged: their saves own few
  ranked heroes.

## 2. Trait sets

Every trait (origins and classes, 26) with two or more heroes on the roster is a set (`setOf`). Owning every hero of it completes it: a
**Claim** in the Hall pays **6 stones and 600 crowns, once** (`claimSet`, `Meta.hallSets`), and a title ("Keeper of the Undead", "Master of
the Blades") shown at the head of the Hall. Recruit's "Nearest to joining" marks a hero missing from a set begun ("◆ Completes Undead",
"◆ Marksman −2", `setTarget`); only a hero a summon can bring is marked, never one earned in play.

## 3. Rested heroes

An army run's end (`settleRun`) starts its heroes' rest again and counts one more army run sat out for every other hero owned (`noteRest`,
`Meta.rest`, to 3). A hero who sat out the last **three** army runs is **Rested**: in its next army run it earns **half again** the XP of
each fight (`restedXp`, the page's XP), and its bench card wears a small "Rested" tag. Never a penalty.

## On the page

- **The Hall** (`hallView.ts`, rows in `hallRules.ts`): a standard ornate page, "‹ Back". Its head says "Your Hall: +3.5% HP, +1.7% ATK, …";
  then what each stat holds against its cap and who lends it, your titles, the trait sets (nearest to done first, a Claim on one done), and
  every hero, owned first, with its rank pips and what it lends ("+0.6% HP", "Rank up to lend HP", "Not yet joined").
- **Its doors:** the tavern's "Your strongest heroes" (the Heroes tab) and the roster ("All heroes") each have a "Hall of Heroes" button with
  the running total.
- **The tutorial** (`hall`): on the Heroes tab the first time the Hall lends anything (a hero owned at rank 1), pointing at the door; `newer`.
- **Saves:** `Meta.hallSets` and `Meta.rest` are optional; a save from before has neither and reads as before.

Photographs at 393 x 852, 360 x 780 and 412 x 915 are in `docs/samples/hall-of-heroes/` (`node tools/hall/shots.mjs`): the tavern's door,
the Hall (its head, its sets, its heroes), the tutorial, Recruit's set target and the bench's Rested tag.

## Measured

**The Hall a daily player has** (`npm run unlock-pace -- --hall`, 20 seeds, the median; hero level from `npm run level-pace`):

| Day | Heroes owned | Level | HP | ATK | Crit | Charge | Sets claimed |
|---|---|---|---|---|---|---|---|
| 30 | 14 | 42 | +0.9% | +0.8% | +0.4% | +0.3% | 0 |
| 90 | 21 | 70 | +3.1% | +2.9% | +1.2% | +1.2% | 0 |
| 180 | 31 | 100 | +6.5% | +6.0% | +2.5% | +2.1% | 1 |
| 365 | 49 | 100 | +9.0% | +8.0% | +3.0% | +4.2% | 5 |

**Clears** (`npm run balance -- --no-tables --hall-table`, `tools/hallTable.ts`): the balance tool's recruits (Knight, Paladin, Archer,
Warlock, Cleric) at the day's level, on the tier meant for it, a maxed castle, gear, talents and mastered skills; one try over 32 fresh saves
an army, the Hall off -> on (clear %):

| Army | Day 90, Legendary, Lv 70 | Day 180, Mythic, Lv 100 |
|---|---|---|
| Orc Warband | 100 -> 100 | 100 -> 100 |
| Undead Legion | 100 -> 97 | 91 -> 100 |
| Beast Packs | 97 -> 100 | 100 -> 100 |
| The Wildwood | 94 -> 94 | 78 -> 75 |
| The Labyrinth | 84 -> 75 | 31 -> 41 |
| Ogre Clans | 78 -> 78 | 78 -> 78 |
| Infernal Host | 47 -> 47 | 47 -> 41 |
| Yokai Night Parade | 0 -> 0 | 25 -> 38 |
| Golem Forge | 3 -> 0 | 28 -> 22 |
| **Mean** | **67.0 -> 65.7** | **64.2 -> 66.1** |

Day 30 (Hard, level 42) was measured with the first draft's larger Hall (+1.2% HP, +1.0% ATK): 69.1 -> 71.2%, within the noise; the final
Hall there is smaller still. The first draft at day 180 (+8.6% HP, +8.0% ATK) took Mythic from 64.2 to 73.3% (the Labyrinth 31 -> 50, the
Golem Forge 28 -> 47): too much, so every rate and cap came down a quarter. Now the game is no easier by day 90 and about two points easier by
day 180, within a single try's noise, while waves won rise a little.

**Stones** (`npm run unlock-pace`, mean per save a year): 2,927 before, 2,955 with the trait sets (+28, 1%: 56.3 to 56.8 a week). The
unlock pace by day is unchanged.

**Duels** (`npm run balance -- --no-tables --duel --duel-seeds 8`, twelve kinds, every army): 64.3% won without a Hall; with a day-180 Hall
in them 68.8% (the Beast Packs 60 -> 72, the Labyrinth 72 -> 78, the Golem Forge 69 -> 75), past the 55 to 65% band. So the champion
fights without it (`withoutHall`), and the duels are exactly as they were: 64.3% again, army by army, with the Hall on
(`--hall-day 180`).

## Tests

`test/hall.test.ts`: every class lends a stat; each rank's share and the exact sum; the caps at a full collection; the Hall in `heroStats`
and none with the switch off; a set's progress, its summon target (never a hero earned in play) and its reward paid once; every set of two
or more; rested heroes (three runs, half again, reset when fielded, off with the switch); the save's readers; the page's rows.
