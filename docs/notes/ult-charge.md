# Ultimates once or twice a battle (ULT-CHARGE)

The owner: "The ultimates should charge up and be used maybe 1-2 times per battle. Right now it hasn't been charging enough." Then, on the
first version (which halved the ultimates' strength to pay for it): "Make it still hit hard" (every ultimate at full strength, the extra power
answered by tougher foes where content got too easy) and "Allow it" (the Samurai, Ninja Monk, Buccaneer and Demon Swordsman may fire more than
twice in a long fight). Built on main 0.208.0 (ARMY-PACE): its army numbers are the base the foes were toughened from.

## What was wrong

The meter (`Unit.charge2`, `ULT_FILL` in `src/sim/heroKits.ts`) filled from damage dealt (16 a hero's own max health), damage taken (26) and
time (0.55 a second), times each ultimate's `tuned.rate`: about 40 s from empty for an average hero. Fights are shorter than that (army waves
18 to 38 s, the daily's 10 s, the Calamity's 16 s), so almost no ultimate fired (table below). The bot and the page's Auto already fire them (a
headless battle has `autoUlt` unset, which counts as on; auto-replay turns it on).

## The charge (heroes)

- **The meter starts part full.** `fight()` (`startKits` in `battle.ts`) calls `startUlt`: every placed hero whose ultimate is open starts at
  `ULT_FILL.START` (60), or what it carried from the run's last wave if more (`keepCharges`). Below level 30 nothing starts.
- **It fills about 2.5 times as fast:** `DEALT` 40, `TAKEN` 64, `PER_SEC` 1.6 (were 16, 26, 0.55).
- **The Last Stand fills at half pace** (`ULT_FILL.STAND` 0.5, set as the new optional `Unit.ultPace` on the Stand's heroes): it is one long
  battle and the meter carries from wave to wave.
- **Full strength.** No ultimate is weaker than on main: every `tuned.power` in `ultimates.ts` is main's or more. The ones raised (they were
  raised for parity in the first version, and stronger is allowed): Samurai 2.43 to 3.07, Kunoichi 0.76 to 3.07, Wizard 1.06 to 1.44, Ninja Monk
  1.64 to 3.07, Lightning Mage 0.57 to 1.24, Karasu 1.52 to 3.07, Yamabushi 2.53 to 3.07, Werewolf 1.72 to 3.05, Minotaur 2.32 to 2.85, Satyr
  0.53 to 0.89, Gorgon 1.51 to 2.2, Samurai Commander 1.4 to 1.6, Barbarian 0.72 to 2.14, Ranger 1.03 to 1.11, Warlock 0.91 to 1.07, Shambler
  0.43 to 0.99, Rifle Bot 0.98 to 2.17, Mercenary 1.67 to 3.07, Buccaneer 1.21 to 3.07, Kraken 0.88 to 0.94, Lancer 1.02 to 3.07, Reaper 0.91
  to 3.07, Time Witch 0.61 to 0.62, Arc Blade 0.81 to 2.42, Dragoon 1.34 to 3.07, Juggernaut 1.39 to 1.5, Demon Swordsman 2.45 to 3.07.
- **Demon Form scales with its strength** (`demonForm` in `abilities.ts`): its length by the square root of its tuned power and its heal by
  the power, as the other ultimates' stuns and heals do; before, nothing in it read the power, so the Demon Swordsman fell 15 points behind
  the roster at full strength and no meter speed could catch him up.
- **Parity by meter speed only** (`tuned.rate`, `tools/kits/tune.mjs` with `KEY=ur`; the tool now starts `ur` from the ultimate's own rate, it
  used to start it from skill 2's tune): knight 1.86 to 1.46, samurai 0.84 to 2.33, kunoichi 0.6 to 1.65, archer 0.77 to 0.65, wizard 0.7 to
  0.51, peasant 1.95 to 1.11, ninjaMonk 0.96 to 2.41, wanderer 0.58 to 0.37, lightningMage 0.72 to 0.92, kitsune 0.66 to 0.6, karasu 0.54 to
  0.77, yamabushi 1.4 to 1.85, werewolf 0.61 to 0.73, minotaur 1.41 to 1.51, satyr 0.67 to 0.69, gorgon 1.06 to 1.29, samuraiCommander 0.85 to
  1.1, paladin 1.53 to 1.31, cleric 0.76 to 0.58, druid 1.15 to 1.19, barbarian 0.84 to 0.9, ranger 0.8 to 0.84, warlock 0.72 to 0.5,
  illusionist 1.15 to 1.08, gunslinger 0.73 to 0.37, shambler 1.53 to 1.04, rifleBot 0.76 to 1.01, mercenary 0.59 to 1.21, mummy 1.7 to 0.99,
  buccaneer 0.76 to 3.11, wolfBard 1.04 to 0.93, beastmaster 0.93 to 0.7, kraken 1.62 to 1.37, lancer 0.67 to 1.61, reaper 0.55 to 1.79,
  timeWitch 0.97 to 1.09, arcBlade 0.54 to 0.59, dreadPirate 1.4 to 1.06, siegeBot 1.18 to 0.5, priestess 0.87 to 0.38, dragoon 0.69 to 1.1,
  juggernaut 1.87 to 1.55, sage 0.95 to 1.7, demonSwordsman 0.79 to 2.06, tyrant 1.18 to 0.88.

## The answer (foes): every foe-strength change

With full-strength ultimates firing once or twice a fight a level-30 team is far stronger (the hero sweep's even stage moved from 39 to 78),
so the content fought with ultimates open was made tougher, measured against main 0.208.0. Nothing below level 30 moved: the first four
armies' Normal, Hard and Elite, the fresh-save daily and the Calamity's first five maps are as they were.

| Where | Change (was) | Why |
| --- | --- | --- |
| Labyrinth Normal `start` (`armies.ts`) | 4.85 (3.05) | 2.8 tries at its level 35 again |
| Ogre Clans Normal `start` | 9.3 (4.1) | 2.8 tries at 45 |
| Infernal Host Normal `start` | 10 (5.67) | about 6 tries at 55, and not cleared at 45 in three tries (`army-pace.test.ts`) |
| Yokai Night Parade Normal `start` | 12.5 (7) | not cleared at 45 in three tries |
| Golem Forge Normal `start` | 12.7 (7.1) | about 10 tries at 65 |
| Legendary and Mythic, every army (`tiers.ts`, new `Tier.answer`) | x2.8 and x2.6 on hp and attack (x1) | the first army's stars at the levels they were |
| Labyrinth `tierLift` Hard, Elite, Legendary, Mythic | 1.6, 2.34, 0.83, 0.98 (none) | its tiers' clears where they were; Hard above Normal |
| Ogre Clans `tierLift` | 3.18, 2.57, 0.83, 0.92 (1.45, 1.1, 1, 1) | as above |
| Infernal Host `tierLift` | 2.97, 2.38, 0.76, 0.87 (1.55, 1.16, 1, 1) | as above |
| Yokai Night Parade `tierLift` | 3.45, 2.76, 0.79, 0.67 (2.12, 1.6, 1.25, 1) | as above |
| Golem Forge `tierLift` | 3.3, 2.5, 0.74, 0.73 (1.8, 1.34, 1.2, 1) | as above |
| Last Stand `WAVE_GROWTH_LATE`, `WAVE_GROWTH_DEEP` (`stand.ts`) | 0.2, 0.29 (0.14, 0.35) | level 30's median wave back from 19 toward 14; the climb past wave 18 as steep |
| Calamity `CAL_SCALE.final` (`calamity.ts`) | 1 (0.6) | the last map's fights (not its boss), the only map with heroes at 30: its boss share 36% back to 16% |
| Daily `DAILY_ANSWER.ult` (`modes.ts`, new) | 0.17 more foe strength for each of the five at level 30+ (none) | a levelled save's clear rate back to about 70% |

The XP stays as it was: `armyXpShare` also divides by the tier's `answer`, as it does by `tierLift` and the raised `start`
(`xpStart`). The late armies' Legendary and Mythic lifts are below 1 because the tiers' own answer (tuned on the first army) overshoots for them.

## Before and after (main 0.208.0 / this branch)

**Ultimates a hero a fight, and the median second its meter is first full** (`node tools/ult-charge/run.mjs 4`, the greedy players, Auto on;
the bot does not carry the meter between waves, the page does):

| Mode | Before: fight, first full, ults | After: fight, first full, ults |
| --- | --- | --- |
| Army waves, Normal, at their levels 35-74 | 18-38 s, 33-36 s (0-9% fill), 0.00-0.09 | 18-38 s, 10-13 s, 0.92-1.77 |
| Army boss waves | 36-50 s, 34-49 s, 0.10-0.25 | 19-46 s, 9-13 s, 1.0-2.2 |
| Elite lv 40 (Orcs) waves / bosses | never / 0 | 12-13 s / 0.50 / 0.95 |
| Legendary lv 60 waves / bosses | 50 s / 0.05 / 0.40 | 7-12 s / 1.35 / 2.0 |
| Mythic lv 100 waves / bosses | 38-50 s / 0.11 / 0.20 | 12 s / 1.72 / 2.3 |
| Daily waves / boss, lv 30-50 | never / 0.00 / 0.01 | 3.5 / 6.6 s / 0.6 / 1.3 |
| Last Stand waves, lv 30-60 | 14-15 s / 0.25 | 11-14 s / 0.37-0.44 |
| Calamity fights / bosses | never / 0.00 / 0.03 | 5 s / 0.92 / 1.55 |

**Parity** (`node tools/kits/tune.mjs <empty> 30 <stage> 12000`; `hero-balance-ultimates.test.ts` now plays stage 78):
before (stage 39) average 52.7%, spread 11.2, none beyond 6, 9 beyond 4; after (stage 78) average 49.7%, spread 5.7, none beyond 4. After:
knight 0.8, samurai 0.8, kunoichi -0.1, archer -0.3, wizard 1.6, peasant -0.7, ninjaMonk 0.0, wanderer 0.1, lightningMage 0.9, kitsune 2.9,
karasu 1.6, yamabushi -0.5, werewolf -0.7, minotaur -0.4, satyr -0.7, gorgon -1.4, samuraiCommander -0.8, paladin 1.1, cleric -2.8, druid 0.7,
barbarian 0.9, ranger -0.7, warlock -1.7, illusionist 0.4, gunslinger 0.3, shambler -0.6, rifleBot -0.4, mercenary -0.2, mummy 0.7, buccaneer
-0.2, wolfBard -0.5, beastmaster -0.4, kraken -1.4, lancer 1.0, reaper 0.8, timeWitch -1.0, arcBlade -0.4, dreadPirate -1.8, siegeBot 2.7,
priestess -0.3, dragoon 0.9, juggernaut 0.3, sage -0.3, demonSwordsman 0.1, tyrant -0.6. (Before, stage 39: knight 2.2, samurai -4.5,
kunoichi 2.3, archer -0.9, wizard -0.5, peasant 2.2, ninjaMonk -2.7, wanderer -0.0, lightningMage 3.4, kitsune 2.3, karasu -2.2, yamabushi
-2.6, werewolf -3.3, minotaur -5.3, satyr 4.0, gorgon -2.2, samuraiCommander -1.7, paladin 1.1, cleric -0.9, druid 5.5, barbarian 2.1, ranger
-0.2, warlock 0.6, illusionist 4.8, gunslinger -3.3, shambler 2.5, rifleBot 0.3, mercenary -3.0, mummy 3.3, buccaneer -1.3, wolfBard 4.4,
beastmaster 3.6, kraken 0.9, lancer -0.3, reaper 0.8, timeWitch 2.9, arcBlade 1.0, dreadPirate -0.8, siegeBot -4.2, priestess 5.5, dragoon
-1.9, juggernaut -2.1, sage -2.4, demonSwordsman -5.7, tyrant -3.6.)

**The army pace** (`SAVES=8 node tools/army-pace/run.mjs normal|stars`, ARMY-PACE's player): mean tries to clear Normal, before / after.

| Army (level) | Lv 35 | Lv 45 | Lv 55 | Lv 65 | Lv 75 |
| --- | --- | --- | --- | --- | --- |
| Orcs to Wildwood | 1.0 / 1.0 | 1.0 / 1.0 | 1.0 / 1.0 | 1.0 / 1.0 | 1.0 / 1.0 |
| Labyrinth (35) | 2.5 / 3.0 | 1.0 / 1.1 | 1.0 / 1.0 | 1.0 / 1.0 | 1.0 / 1.0 |
| Ogre Clans (45) | 18.1 / 20.8 | 2.9 / 2.4 | 1.1 / 1.4 | 1.0 / 1.0 | 1.0 / 1.0 |
| Infernal Host (58) | 26 / 23.5 | 21.5 / 15.0 | 5.4 / 6.5 | 1.3 / 1.6 | 1.0 / 1.3 |
| Yokai Night Parade (65) | 26 / 26 | 25.9 / 26 | 17.0 / 25.8 | 2.3 / 8.1 | 1.8 / 3.6 |
| Golem Forge (74) | 26 / 26 | 26 / 26 | 25.9 / 26 | 10.1 / 11.3 | 2.5 / 4.1 |

The first army's 11 stars (tries to all of a tier's stars, Legendary / Mythic; saves with all 11 of 8), before / after: level 45 4.6 / 17.0,
4 of 8 / 4.5 / 22.3, 2 of 8; level 55 2.1 / 17.4, 5 / 2.4 / 17.1, 4; level 65 1.3 / 6.0, 8 / 1.6 / 6.4, 8; level 75 1.3 / 2.4, 8 / 1.5 / 2.3, 8.
(Without the answer, the ultimates had every star by level 35, 2.3 tries of Mythic.) So the owner's ARMY-PACE target holds: a typical player
has all 11 between levels 55 and 65 to 72; the Infernal Host comes just before (6.5 tries at 55), the Yokai (26 at 55, 8 at 65) and the
Golem Forge (26 at 55, 11 at 65) after. The Yokai is a little later than on main (its first clear about level 70, was about 64), the price of
keeping it out of reach at 45 (a lucky level-45 seed cleared it at a `start` of 12).

The late armies' tiers (`SAVES=6 ONLY=... tiers 55,70,85,100`), mean tries before / after: Ogres Hard 3.0 / 2.8 at 55, Elite 14.2 / 9.3 at 55,
Legendary 3.8 / 4.0 at 70, Mythic 16.0 / 13.0 at 85; Infernal Hard 13.3 / 12.5 at 55, Elite 5.8 / 6.7 at 70, Legendary 16.5 / 14.7 at 70,
Mythic 9.0 / 12.2 at 100; Yokai Hard 2.8 / 2.8 at 70, Elite 15.3 / 12.3 at 70, Legendary 3.3 / 3.3 at 85, Mythic 14.5 / 11.5 at 85; Golems
Hard 5.8 / 6.8 at 70, Elite 4.5 / 4.8 at 85, Legendary 11.3 / 7.3 at 85, Mythic 7.7 / 9.7 at 100; Labyrinth Elite 13.2 / 16.0 at 55,
Legendary 10.3 / 12.0 at 70, Mythic 6.2 / 7.2 at 100. Without the answer every late Hard and Elite was a first-try clear at 55.

**The Last Stand** (greedy median wave, `stand-balance`, 10 to 16 runs), levels 1, 10, 20, 30, 60, 100: before 4, 9, 10, 15, 22, 29 (25 at 100
over 20 runs); the charge alone 19 at 30; after 4, 10, 11, 16, 20, 25 (the owner's targets about 4, 9, 10, 14, 20, 25).

**The Calamity** (`npm run balance -- --no-tables --calamity --attempts 100`, share felling each map's boss): before 91 / 79 / 65 / 51 / 51 /
16%; the charge alone 91 / 79 / 65 / 51 / 51 / 36%; after 91 / 79 / 65 / 51 / 51 / 16%. Raising the last boss's health (even x1.8) did not
move it: the heroes now come through the last map's fights, which is where `final` acts.

**The daily** (the scaled daily, 60 dates, the starting five at a level): cleared before 67% (level 30), 73% (level 50); the charge alone
100% and 100%; after 70% and 75%. A fresh save (no hero at 30; `npm run daily-rate`, the 66% target) meets the daily as it was.

## Tests changed for the new rules (none loosened)

- `hero-balance-ultimates.test.ts` plays stage 78 (39 before: at 39 a level-30 team now wins 99%).
- `army-pace.test.ts`: the first four armies have no lift (it said the first five, and Mythic 1 on every army); a changed army's XP share
  takes out its lift and the tier's answer.
- `armyStars.test.ts`: a tier's strength includes its answer.
- `hero-kits-all.test.ts`: the long fight's band has hp 80 (was 16: the ultimates now ended it before the skills came round).
- `ultimates.test.ts` (Tempest, Stone Curse) and `more-heroes.test.ts` (Demon Form): sturdier foes, so the stun, shove, petrify and the
  form's end are seen on a living foe; Auto off after the first Demon Form.
- `talents.test.ts` "ultRate fills the ultimate faster" measures the gain over 3 s.
- New `test/ult-charge.test.ts`: the starting meter, a carried one, locked heroes; about once a fight, the first by mid-fight, two in a long one.

## Tools

- `tools/ult-charge/run.mjs [saves] [--only armies,tiers,daily,stand,calamity]`: the ultimates table (and the daily's clear rate; `ULT=...`,
  `DAILYK=0.17` for tuning runs). It wraps `stepBattle` in its own bundle only.
- `tools/army-pace/run.mjs` takes `TIERK=3:2.8,4:2.6` (a tier's hp and attack) for tuning runs; `tools/tries/run.mjs` too.
- `tools/ult-charge/shots.mjs` (after `npm run web`): a level-30 wave, Auto off, run until a ring fills on its own, at 393x852, 360x780 and
  412x915 (`docs/samples/ult-charge-bar*.png`: the Samurai's ring full and saying TAP 9.9 s in).
