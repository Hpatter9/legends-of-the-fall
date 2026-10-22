# Tower twists and mystery events

The tower's map got two things: **floor twists** on its fights, and **eleven new mystery events**.

## Floor twists (`src/sim/twists.ts`, `src/twistView.ts`, `src/twists.css`)

When a map is made, every fight, elite and boss node rolls a twist from its own side stream
(`mixSeed(seed, 0x7715, act, nodeId)`), after the kinds and links are fixed, so existing maps are as they were
(`makeMap(seed, act, false)` is the bare map). About 40% of fights and 60% of elites get one; a boss always gets one
from act 2 on. `MapNode.twist` is the id (absent on an old save's map: no twist). `fightSpec` copies the twist's data into
`FightSpec.twist` and `Stage.twist`; `startBattle` reads it. A fight with no twist plays exactly as before.

| Twist | Tone | What it does |
|---|---|---|
| Fog | mixed | every shooter loses 1 range (`strikeDef`) |
| Holy ground | blessing | all healing x1.5 (`Unit.healMult`, read by `mendUnit` and the king's heal) |
| Lava cracks | mixed | 4 middle-ground tiles become lava (burns whoever steps on it) |
| Gale | blessing | everyone jumps +1 (`strikeDef`) |
| Blood moon | mixed | foes +25% attack, double gold |
| Narrow pass | curse | boulders fill the heroes' outer back-row tiles (6 tiles, where every tile can still be reached) |
| Treasure floor | blessing | +50% gold |
| Haste | mixed | everyone acts 15% faster (`speedOf`) |
| Frost | mixed | everyone walks 25% slower |
| Mana surge | blessing | the king's mana fills 50% faster |
| Cursed | curse | heroes start 10% down on hp |
| Ambush | curse | the band's last plain fighter starts in the heroes' back row (the leader never) |
| Glory | blessing | heroes +10% attack |
| Fortified | curse | foes +20% hp |

The map shows a corner badge (the tone's colour: curses red, blessings green, mixed gold), and tapping a node adds its
twist's name and line to the info. The fight shows a banner under the top bar (the board makes room for it). Icons are
DawnLike tiles cut by `tools/twist-icons.py` into `src/art/twists/`, bundled into game.js (offline-safe). Nothing blinks.

Gold twists multiply the win's gold in `finishTower`. `placed` spots from the last fight that a twist has since filled are
dropped for a free tile (`newBattle` in main.ts).

## Mystery events (`src/sim/mystery.ts`; kinds in `events.ts`)

They join the tower's mystery pool (`TOWER_EVENT_KINDS`). Every outcome is drawn when the card is made, from the card's
own stream, so a saved card replays and the dice are rolled before the player chooses.

1. **A black altar**: lose a hero for good, gain a **legendary relic** (four new ones: Sun Crown, Dragon Heart, Storm Ring,
   Void Lens; kept out of `RELIC_IDS`, so shops, chests and drops draw as they did). A lone hero is never offered.
2. **A gambling imp**: a small or big stake, about double (x2.2) or nothing at 46%.
3. **A prisoner in irons**: free him (a hero joins free, the guards hurt the party 15%) or rob him for gold.
4. **A glittering fountain**: drink (60%: the party heals 50%; else one hero is poisoned for 35%), or a safe flask (15%).
5. **An abandoned forge**: reforge a piece of gear a tier up for gold, or melt it for gold (no gear: hammer out a new piece).
6. **A wandering trainer**: gold for XP on one of two hero kinds (kept for good; waits in `TowerState.xp` until the page adds it to the meta, `takeXp`).
7. **A shrine of blood and iron**: one hero -20% hp / +25% attack, or everyone -8% / +10%, for good (hp bump floor -50%).
8. **A suspicious chest**: open it for a mimic fight (an elite's strength; its win pays gold, a relic and good gear), prod it (a fixed gamble: a plain chest, or the party bitten 20%).
9. **A ruined library**: read the black book (55%: +6% attack for everyone for good; else the party loses 20% hp) or search the shelves for gold.
10. **A fallen knight's cairn**: a good piece of gear and tougher foes (+25%) next fight, or the party heals 25%.
11. **Bandits on the road**: pay the toll, brawl (party hurt 20%, +gold), or sneak (50%: free, else they take gold).

A mimic's fight is made when the card closes (`finishMystery` sets `Current.fight`, `mimic: true`); the node is cleared
by `finishTower`. `tools/autoplay.ts` plays a mimic and takes a trainer's XP.

## Tests and balance

`test/twists.test.ts` (rolls, rates, no twist = no change, each twist's effect, gold, old saves) and
`test/mystery.test.ts` (each event's card, determinism, outcomes). Tower balance (`npm run balance -- --no-tables --tower`,
60 greedy climbs a row, the bot always takes an event's first option), median floors before / after:

| Level | 1 | 3 | 5 | 8 | 11 | 14 |
|---|---|---|---|---|---|---|
| before | 4 | 10 | 12 | 25 | 38 | 38 |
| after | 6 | 10 | 12 | 25 | 38 | 38 |

Means moved within noise (5.7-6.2 at level 1, 21.6 to 26.2 at level 8, 39.2 to 41.7 at level 14).
