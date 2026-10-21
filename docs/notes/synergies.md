# Hero synergies (traits)

Every hero has an origin and a class (`HERO_TRAITS` in `src/sim/traits.ts`). Different hero kinds of a trait on the
board (two Knights count once) unlock its team bonus at 2 (Samurai again at 4). `fight()` fixes the bonuses with
`applyTraits` into `b.traits`; small hooks read them: `onStrike` (guard, dodge), `rollCrit`, `tickStatus` (charge),
`speedOf`, `strikeDef` (shot reach from height), and mana rate, attack and health are set at the start.

| Trait | Heroes | Bonus |
|---|---|---|
| Samurai | samurai, kunoichi, archer, ninjaMonk | 2: +1% atk, 4: +10% atk |
| Mystic | wizard, lightningMage, wanderer | king's mana +30% |
| Yokai | kitsune, karasu, yamabushi | slip 6% of blows |
| Knightly | knight, peasant | +5% health |
| Guardian | knight, yamabushi, peasant | take 5% less |
| Blade | samurai, ninjaMonk | +10% crit chance |
| Marksman | archer, lightningMage | shooters +0.5 reach per step of height |
| Caster | wizard, wanderer | skills charge 30% faster over time |
| Trickster | kunoichi, kitsune, karasu | act and walk 5% faster |

The bonuses are kept small because the starting five already sit at the top of the 20-80% band test
(`test/foes.test.ts`), so the first Samurai tier is only +1%. The balance pass can retune `TRAITS`.

Page: a trait strip above the bench in deploy (lit when active, "Guardian 1/2"; tap for the explanation), two short
badges on each bench card, and the trait names on the Heroes collection rows.
