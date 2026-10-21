# Monster heroes

Five heroes from the monster sheets join the roster (`ALL_HEROES` in `units.ts`; `HEROES` stays the five). Each has a
kit in `abilities.ts` (`KITS`), a test in `test/monster-heroes.test.ts`, and forms by grade (the beasts' other colours
at grades 2 and 3; the commander has one look).

| Hero | Rarity | Traits | Skill | Passive |
| --- | --- | --- | --- | --- |
| Werewolf | 3 | Beast, Blade | Ravage: bites the weakest foe in reach for double, healing him half of what it deals | Frenzy: each kill quickens its blows by a fifth for 4s, up to three stacks |
| Minotaur | 3 | Beast, Guardian | Gore Charge: charges up to 4 tiles in a line at a foe, hits it for double, knocks it back a tile and stuns it 1.5s | Trample: blows deal a quarter more to a foe under half health |
| Satyr | 2 | Beast, Caster | Pipes of Pan: hastes the allies within 3 tiles (and him) for 4s; needs an ally | Sure Hooves: climbs ledges at no extra cost |
| Gorgon | 3 | Beast, Marksman | Petrifying Gaze: the strongest foe it sees within 5 tiles takes a blow and is stunned 3s | Scaled Hide: takes a fifth less from shots |
| Samurai Commander | 2 | Knightly, Blade | War Banner: allies within 3 tiles (and him) gain a quarter more attack for 6s; needs an ally | Stand Firm: cannot be knocked back (Gore Charge, Wind Gust) |

The **Beast** trait is new (origin): two beasts give +3% attack, four give +8%. No trait goes past four members.

## Rules added

- `Passive` fields `frenzy`, `finish`, `sure`, `scales` and `steady`; `Unit.frenzy` (the kill stacks) and `Unit.banner`
  (the attack raised by a banner, reverted by `tickStatus` when it fades).
- `onKill` runs when a blow or skill kills (in `hurt`), `frenzyOf` shortens the swing time in `swing`, `finishOf`
  joins the blow's multiplier, and `sureFooted` removes the climb cost in `stepTo`.
- Battle events `frenzy`, `gaze`, `song` and `banner`, drawn in `fx.ts` as labels with the existing magic sheets.
  `skillFx.ts` maps the five skills to sheets.
- Everything uses no randomness, so the fights stay deterministic.

## Balance

`npm run balance` (4000 games): Werewolf -4.2 points against the average, Minotaur +4.7, Satyr -4.7, Gorgon -4.1,
Samurai Commander +2.4 (the average with-hero win rate is 65.6%). All five are inside 8%. Knight, Fire Wizard and
Yamabushi were already outside that band before this change and are not touched here.
