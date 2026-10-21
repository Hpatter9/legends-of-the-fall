## Hero skills and passives

Each hero has a skill that fires on its own when its charge fills, and an always-on passive. All of it is data in
`src/sim/abilities.ts` (`KITS`), with one `cast` function per skill; `battle.ts` calls it through `tryCast` (when a
free hero decides), `onStrike` (before any damage), `afterBlow` and `tickStatus` (every tick).

**Charge** (0 to `CHARGE_MAX` 100): a blow dealt, a blow taken (a splash blow does not count) and each second give the
amounts in the hero's `skill` entry. A full charge waits if the skill has nothing to hit. Casting makes the hero busy
for `castMs`. Randomness for crit and dodge is a side stream, `b.skillRng`, so the main fight stream is untouched.

| Hero | Skill | Passive |
| --- | --- | --- |
| Knight | Shield Wall: foes within 3 tiles must go for him for 4s; he takes half damage | Stout Shield: blows from the front lose a quarter |
| Samurai | Iaido: dashes up to 4 tiles in a line, cutting every foe on it, landing on the last free tile | Keen Edge: 15% of blows crit x1.6 and make the foe bleed |
| Kunoichi | Shadow Step: blinks behind the weakest foe, backstabs for x1.8 atk | Evasion: slips 20% of blows |
| Archer | Volley: after 0.7s arrows land on a 3x3 (the spot with most foes in reach) | Eagle Eye: `heightReach` 1.4, twice the reach bonus from height |
| Fire Wizard | Meteor: after 1.1s a blast on a 3x3 (within 6 tiles), leaving it burning 4s | Cinders: its blows burn the foe (3 every 0.5s for 2s) |

New events: `skill`, `dash`, `blink`, `area` (a volley or meteor on its way), `zone` (burning ground), `dodge`; `hit`
now has `src` (`blow`, `skill` or `dot`). `fx.ts` shows them with the existing hit, fire and blast sheets and the
arrow; `unitView.ts` plays the sheet's `attack2` or `defend` row for a cast (plain `attack` where a sheet has
neither), rings a guarded fighter, tints a burning or bleeding one, and draws the charge bar under the health bar
(gold and flashing when full).

**Balance.** Hero hp was cut by a quarter to make room for the kits, with small stat tweaks to set them apart (knight
slower and tougher, kunoichi faster and lighter). With `readyBattle` the heroes win 29 of 40 fights (26 before).
Tests: `test/abilities.test.ts`.
