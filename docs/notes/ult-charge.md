# Ultimates once or twice a battle (ULT-CHARGE)

The owner: "The ultimates should charge up and be used maybe 1-2 times per battle. Right now it hasn't been charging enough."

## What was wrong

The meter (`Unit.charge2`, `ULT_FILL` in `src/sim/heroKits.ts`) filled from damage dealt (16 a hero's own max health), damage taken (26)
and time (0.55 a second), times each ultimate's `tuned.rate`: about 40 s from empty for an average hero (COMBAT-002's "rarer and bigger").
Fights are shorter than that: army waves at levels 30 to 52 last 14 to 26 s, their boss waves 28 to 47 s, the daily's waves 10 s, the
Calamity's fights 16 s. So almost no ultimate fired at all (table below). The bot and the page's Auto already fire ultimates (a headless
battle has `autoUlt` unset, which counts as on; the page's auto-replay sets it on), so nothing changed there.

## What changed

- **The meter starts part full.** `fight()` (`startKits` in `battle.ts`) calls `startUlt`: every placed hero whose ultimate is open starts
  at `ULT_FILL.START` (60), or what it carried from the run's last wave if that is more (`keepCharges`). Below level 30 nothing starts.
- **It fills about 2.5 times as fast:** `DEALT` 40, `TAKEN` 64, `PER_SEC` 1.6 (were 16, 26, 0.55).
- **Ultimates are half as strong**, all at once: `ULT_FILL.POWER` 0.5 multiplies every hero's `tuned.power` in `castHero`. Firing five to
  ten times as often at full strength made every level-30+ fight a rout (the hero sweep at stage 39 went from 53% to 99.8% won;
  Legendary at level 45 went from about 25 tries to 1). Cutting the meter back would have broken the owner's "1-2 a battle", so the
  strength paid. Even at 0.1 the deep tiers stayed too easy (the ultimates' stuns, taunts, charms and decoys carry much of their worth),
  so the tiers took the rest (below).
- **The Last Stand fills at half pace** (`ULT_FILL.STAND` 0.5, set as `Unit.ultPace` on the Stand's heroes): it is one long battle and the
  meter carries from wave to wave, so at full pace a level-30 party went 6 waves further than the Stand's new targets (STAND-004).
- **Legendary and Mythic foes are tougher** (`tiers.ts`): Legendary hp 3.4 to 5.1 and attack 2.5 to 3.75 (x1.5), Mythic hp 4.6 to 7.8 and
  attack 3.2 to 5.4 (x1.7). These are the tiers fought with every ultimate open; Normal, Hard and Elite are unchanged.
- **Per-hero retune** (`TUNE` in `ultimates.ts`), for parity at the new stage (below), with `tools/kits/tune.mjs` (power) and a rate step for
  the heroes whose power hit the ceiling or floor. Rates (meter speed) that changed: Samurai 0.84 to 2.04, Kunoichi 0.6 to 1.28, Ninja Monk
  0.96 to 2.33, Kitsune 0.66 to 0.41, Karasu 0.54 to 0.78, Samurai Commander 0.85 to 0.55, Druid 1.15 to 1.01, Illusionist 1.15 to 0.87,
  Mercenary 0.59 to 0.95, Buccaneer 0.76 to 2.2, Beastmaster 0.93 to 0.75, Lancer 0.67 to 1.16, Reaper 0.55 to 1.45, Priestess 0.87 to 0.32,
  Dragoon 0.69 to 0.95, Demon Swordsman 0.79 to 2.2, Wizard 0.7 to 0.56, Tyrant 1.18 to 0.72. Every hero's power moved; the ones whose
  ultimates are mostly control (Kitsune 0.1, Illusionist 0.07, Priestess 0.06, Beastmaster 0.16, Wolf Bard 0.23, Druid 0.24, Mummy 0.25) are now
  light, and 13 heroes sit at the top (3.07, so 1.5 with `POWER`).
- **Tests changed for the new rule:** `hero-balance-ultimates.test.ts` plays stage 56 (was 39: a level-30 team now wins about half there;
  at 39 it wins 99%); `talents.test.ts` "ultRate fills the ultimate faster" measures the gain over 3 s (in 10 s the quicker meter fills and
  fires); `more-heroes.test.ts` turns Auto off after the first Demon Form so a second does not come before the first wears off. New:
  `test/ult-charge.test.ts` (the starting meter, the carried one, locked heroes; and once or twice a fight, the first by mid-fight, two in a
  long fight). Nothing was loosened.

## Before and after (`node tools/ult-charge/run.mjs 4`)

The greedy players of `tools/autoplay.ts`, Auto on, per hero with its ultimate open. "First" is the median second the meter is first full;
"ults" the ultimates a hero fires a fight. (The bot does not carry the meter between waves; the page does, so players see a little more.)

| Mode | Fight (s) | First full (s) | Ults a fight | Fight (s) | First full (s) | Ults a fight |
| --- | --- | --- | --- | --- | --- | --- |
| | **before** | | | **after** | | |
| Army waves, Normal, lv 30-52 | 14-26 | never (0-1% fill) | 0.00 | 13-20 | 10-12 | 0.57-0.88 |
| Army boss waves, Normal | 28-47 | 39-52 (5-22% fill) | 0.00-0.26 | 24-36 | 11-12 | 0.95-1.98 |
| Elite lv 40 (orcs) waves / bosses | 20 / 27 | never | 0.00 | 18 / 22 | 11 | 0.67 / 1.30 |
| Legendary lv 60 waves / bosses | 39 / 53 | 50 | 0.05 / 0.40 | 36 / 58 | 6-11 | 1.61 / 2.20 |
| Mythic lv 100 waves / bosses | 38 / 43 | 38-50 | 0.11 / 0.20 | 39 / 33 | 9-10 | 2.32 / 2.20 |
| Daily waves / boss, lv 30-50 | 10 / 22 | never | 0.00 / 0.01 | 8 / 15 | 4 / 6 | 0.45 / 1.10 |
| Last Stand waves, lv 30-60 | 24 | 14-15 | 0.25 | 24 | 13 | 0.43-0.48 |
| Calamity fights / bosses | 16 / 24 | never / 29 | 0.00 / 0.03 | 14 / 21 | 5 | 0.96 / 1.55 |

The deep tiers with every talent (`ultRate` talents fill it up to half again faster) see a little over two a fight.

## Parity (`node tools/kits/tune.mjs <empty> 30 <stage> 12000`)

Before (stage 39, main 0.204.0): average 52.7%, spread 11.2, none beyond 6, 9 beyond 4.
knight 2.2, samurai -4.5, kunoichi 2.3, archer -0.9, wizard -0.5, peasant 2.2, ninjaMonk -2.7, wanderer -0.0, lightningMage 3.4, kitsune 2.3,
karasu -2.2, yamabushi -2.6, werewolf -3.3, minotaur -5.3, satyr 4.0, gorgon -2.2, samuraiCommander -1.7, paladin 1.1, cleric -0.9, druid 5.5,
barbarian 2.1, ranger -0.2, warlock 0.6, illusionist 4.8, gunslinger -3.3, shambler 2.5, rifleBot 0.3, mercenary -3.0, mummy 3.3, buccaneer -1.3,
wolfBard 4.4, beastmaster 3.6, kraken 0.9, lancer -0.3, reaper 0.8, timeWitch 2.9, arcBlade 1.0, dreadPirate -0.8, siegeBot -4.2, priestess 5.5,
dragoon -1.9, juggernaut -2.1, sage -2.4, demonSwordsman -5.7, tyrant -3.6.

After (stage 56): average 57.7%, spread 7.8, none beyond 6, 1 beyond 4 (at stage 39 the average is now 99.3%).
knight 0.7, samurai -0.1, kunoichi -0.5, archer -0.4, wizard 0.5, peasant -0.1, ninjaMonk -1.4, wanderer 0.6, lightningMage 1.2, kitsune -0.2,
karasu -1.2, yamabushi -0.7, werewolf -0.3, minotaur 1.1, satyr 1.3, gorgon 1.1, samuraiCommander 0.3, paladin 1.6, cleric 1.0, druid -1.1,
barbarian 0.1, ranger -0.5, warlock 0.7, illusionist 0.8, gunslinger 0.1, shambler 1.5, rifleBot 0.2, mercenary -1.6, mummy 0.2, buccaneer -3.5,
wolfBard -0.3, beastmaster 1.0, kraken 0.6, lancer -0.9, reaper -2.3, timeWitch 0.8, arcBlade 2.5, dreadPirate 0.5, siegeBot 1.1, priestess -1.3,
dragoon -2.0, juggernaut 1.2, sage 3.0, demonSwordsman -4.8, tyrant -0.9.

## Pace (mean tries to clear, `SAVES=6 node tools/tries/run.mjs`, the starting five, maxed castle, gear)

| Cell | Before | After |
| --- | --- | --- |
| Labyrinth Normal lv 30 / Golems Normal lv 52 | 1.0 / 1.3 | 1.0 / 1.2 |
| Legendary lv 45 +talents: infernal / yokai / golems | 25.0 / 18.0 / 25.2 | 23.5 / 13.3 / 26.0 |
| Mythic lv 100 +talents: infernal / yokai / golems | 8.0 / 1.8 / 6.7 | 4.2 / 2.2 / 14.8 |
| Last Stand greedy median wave, lv 30 / 60 / 100 (`stand-balance`, 10 runs) | 15 / 22 / 29 | 14 / 20 / 27 |

## Open questions for the owner

- **Weaker ultimates.** Each ultimate now hits about half as hard as in 0.172 to 0.204, and a few control-heavy ones much less; several
  (Knight, Wizard, Siege Bot, Juggernaut, Samurai Commander, Tyrant, Priestess, Illusionist, Kitsune) are now below the strength they had
  before the hero kits, which the owner had asked never to happen. The other way to pay for the frequency is to keep them big and make the
  level-30+ foes tougher everywhere (armies, spire, Calamity, Stand).
- **Four heroes fire more than twice in a fierce fight** (Samurai, Ninja Monk, Buccaneer, Demon Swordsman, rate 2 or more): their kits fall
  behind at the stage where level-30 heroes are now measured, and a quicker ultimate was the lever that keeps them in the band.

## Tools

- `tools/ult-charge/run.mjs [saves] [--only armies,tiers,daily,stand,calamity]`: the table above (`ULT=START=40,POWER=0.6` tries other
  numbers). It wraps `stepBattle` in its own bundle only.
- `tools/tries/run.mjs` takes `TIERK=3:1.2,4:1.3` (a tier's foes' hp and attack) and `ULTK=0.5` (the strength) for tuning runs.
- `tools/ult-charge/shots.mjs` (after `npm run web`): a level-30 wave with Auto off, run until a ring fills by itself, at 393x852, 360x780
  and 412x915 (`docs/samples/ult-charge-bar*.png`: the Samurai's ring full and saying TAP 10.7 s in).
