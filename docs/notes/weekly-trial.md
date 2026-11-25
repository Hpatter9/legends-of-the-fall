# The Weekly Trial (WEEKLY-TRIAL)

The owner said yes to a Weekly Trial: a rotating weekly challenge with its own rules, to give players a reason to come back each week, build
a second team and summon. It took the director's design, with the changes below ("Where it differs").

## The trial

- **Seven waves** of one army (`trialArmy`, `src/sim/trialRules.ts`): its field waves thinned to five, its mid-boss at wave 4 and its last
  boss at wave 7. An `Army` in shape, as the daily is, so the waves, the boss intro and the long map are the armies' own code. Its land is the
  army's own. The party has the run's ten lives, as in the daily.
- **One or two rules a week**, real rules of the fight (eleven in all, `TRIAL_RULES`):

  | Rule | What it does | Favours |
  | --- | --- | --- |
  | The Wild Kin | Only Beasts and Wardens may enter, and they strike 25% harder | Beast, Warden |
  | No Healers | No Supports or Wardens may enter | Guardian, Bulwark |
  | One of Each | No two heroes of the same class in the field | (any) |
  | Powder and String | Gunners and Marksmen deal double | Gunner, Marksman |
  | Fog | Every shooter, hero or foe, reaches 1 tile less | Blade, Vanguard, Beast |
  | Shield Wall | Bulwarks and Guardians turn 40% of every blow they take back on the striker | Bulwark, Guardian |
  | Last Light | Heroes start each wave 40% down on health, and all their healing is doubled | Support, Warden |
  | Spellstorm | Casters and Arcanists deal 60% more, and the king's mana fills 50% faster | Caster, Arcanist |
  | The Horde | Every field wave brings twice the foes, each at half health | Caster, Gunner |
  | Moonless Night | Tricksters and Assassins deal 60% more | Trickster, Assassin |
  | The Charge | Vanguards, Blades and Beasts deal 40% more, and everyone acts 15% faster | Vanguard, Blade, Beast |

- **The rotation** (`TRIAL_WEEKS`), twelve weeks, each rule matched with an army whose weakness suits it (`ARMY_MATCH`), every army at least
  once, four weeks with two rules: Powder and String v the Golem Forge; Shield Wall v the Orcs; Fog v the Wildwood; Spellstorm v the Ogres;
  No Healers v the Undead; the Wild Kin v the Beasts; Last Light v the Infernal; One of Each and Moonless Night v the Labyrinth; the Horde v
  the Yokai; Moonless Night and Fog v the Orcs; the Charge v the Ogres; the Horde and Powder and String v the Golem Forge.
- **The week** is the game's calendar week (`weekOf`, Monday to Sunday) of the day in **Mountain time** (America/Denver): the week turns at
  Monday 00:00 there, for every player and offline (`src/trialClock.ts`: `trialDayKey`, `trialMsLeft`; a phone without the zone falls
  back to UTC-7). The sim takes the week number and never reads a clock; week n is rotation entry n mod 12, its seed `mixSeed(week, 0x7a1a)`.
- **The starter packs' heroes** are favoured in five weeks (the Knight and the Peasant in Shield Wall, the Samurai in the Charge, the Archer in
  Powder and String, the Kunoichi in Moonless Night, the Wizard in Spellstorm), and either pack may enter eleven weeks of twelve.

## The rules in the sim

- **Who may enter** (`only`, `bar`, `oneClass`): `trialAllows` and `trialSquadOk`, read by the run (`canJoin`), by Auto's pick
  (`pickSquad`) and by the start (`trialFive`, the pool Hire draws from).
- **The fight**: `Battle.trial` (set by `startStage` for a trial run only) carries the rules' blows: a class's harder blows (`classAtk`) and a
  blow turned back on its striker (`reflect`, blows only: not splash, skills or ailments), both through `trialHurt`, which `hurt` calls only
  when `Battle.trial` is set. The other rules are fields the fight already reads: the floor twists' `fog`, `wound`, `mana` and `pace`, and the
  heroes' healing (`Stage.heal`). The Horde is the waves' own (`trialArmy` doubles a field wave's foes, to `SWARM_MAX`; `startStage` halves
  their health, `TRIAL_SWARM_HP`).
- **The army's weaknesses** hold in the trial (`Battle.foeArmy` is the week's army), so the card shows them, and the deploy screen's chip.
- **No stream is drawn from**: the rotation is a fixed cycle and the rules roll nothing. A fight outside the trial has no `Battle.trial` and
  no twist from it, so every other fight and every recorded fight plays out as it did (the tests hold an army run's and a bare fight's).

## Entry

- **One try a day** (`TRIAL_TRIES`), **the best of the week kept** (`Meta.trial.cur.best`). A try started is spent; a run going can be carried
  on whatever the day (the card's Continue). My call, over a few a week: a daily try is the daily habit the trial should sit beside.
- **The five who start** are the save's best for the week (`trialFive`: lasting power, a quarter more for a class the rules favour, and the
  army's weakness or resistance), one of each class on a one-of-each week; Hire draws from every hero the week admits. A save with no hero the
  week admits cannot enter, and the card says what to summon ("Summon Beasts and Wardens to take it on").
- **The foes answer the five's lasting power** as the daily's do (`trialScale`, the daily's `DAILY_ANSWER`), so a strong save meets as hard a
  trial as a new one.

## Rewards

Paid once a week, by the furthest wave (`TRIAL_TIERS`, `settleTrial`): **3 waves**: 80 crowns; **5 waves**: 80 crowns and 1 stone; **all 7**:
40 crowns, 3 stones and a **Trial Laurel**. A week's whole pay is 200 crowns and 4 stones, about a daily's worth (a daily clear pays 170
crowns and a daily chest of about 3 stones). The laurels are counted (`Meta.trial.laurels`) and give a title on the card: Trialbreaker (1),
Trial Master (5), Trial Legend (12). A run begun last week and finished after the week turned pays nothing. Earn rates elsewhere are
unchanged.

**The pace** (`npm run unlock-pace`, which now plays the trial: its tiers at the greedy player's rates, a clear 75% of weeks, nothing in a
week no hero may enter; `-- --no-trial` leaves it out): stones a year **2,927 → 3,068** (+141, +4.8%; the trial pays 153 a year, about 2.9 a
week; the chest shop's share moves by a few). The heroes' pace barely moves.

## On the page

- **The camp**: the Trial stands over the Daily (the Dark Council, once the War is open, moves up over it), dressed as the Daily: a red dot
  for a week's trial not yet looked at (`trialIsNew`, cleared once the card opens: `markTrialSeen`), a green check once the week is
  cleared. Its medallion is a stand-in, the painted cup (`docs/notes/weekly-trial-art-prompts.md` has the prompt for its own).
- **The card** (`src/trialView.ts`, the standard ornate menu, a sheet): this week's rules and the classes they favour, the army with its
  "Weak to" and "Resists" rows, your heroes for it, the rewards ticked as paid, your best and laurels, the time left, and Fight! (Tried
  today, Continue).
- **In the fight**, the week's rules in the banner over the board (`showTrialBanner`), in the deploy and through the fight.
- **At the run's end**, the reward card (`showTrialRewards`) lists the tiers it paid this week.
- **The tutorial**: "The Weekly Trial", told the first time the card opens (`at: 'trial'`, `newer`), and listed in Settings, Tutorials.
- **Offline**: nothing new is loaded by URL (the medallion is one of the painted buttons the service worker caches already).
- **Save-compatible**: `Meta.trial` is optional; `readTrial` (`src/sim/trialSave.ts`) reads a bad one safely, and a save from before has none.

## Where it differs from the director's design

- **One try a day**, not a few a week (the director left it to me).
- **The rewards** are crowns and stones and a laurel with a title on the card; no new badge in the achievements, as an achievement pays stones
  of its own and would have moved the pace twice.
- **"Every foe is a Marksman"** was left out: turning every melee foe into a shooter needs foes' sheets and kits that do not exist. Fog,
  Shield Wall and the rest cover the same ground.

## Measured (`npm run trial-rate`, `tools/trialRate.ts`)

Each week of the rotation at ten seeds (its place in ten turns of the rotation), with the lives, the greedy player (Auto), for four rosters: a
new save's first five (level 1), each starter pack alone (three heroes, level 1), and a broad collection (22 heroes, every class, level 30).
The numbers (`TRIAL_START` 1.0, `TRIAL_GROWTH` 0.17, `TRIAL_BOSS` by army) were set so every week a roster may enter is won at least a third
of the time and most about two times in three or more. Clears (all seven waves), ten seeds a week:

| Week | First five, Lv 1 | Pack: Sword and Shield | Pack: Blade and Spell | Collection, Lv 30 |
| --- | --- | --- | --- | --- |
| Powder and String v Golems | 90% | 100% | 60% | 100% |
| Shield Wall v Orcs | 100% | 100% | 90% | 80% |
| Fog v Wildwood | 80% | 90% | 60% | 90% |
| Spellstorm v Ogres | 100% | 40% | 60% | 80% |
| No Healers v Undead | 90% | 80% | 70% | 60% |
| The Wild Kin v Beasts | no entrants | no entrants | no entrants | 100% |
| Last Light v Infernal | 30% | 90% | 40% | 50% |
| One of Each + Moonless Night v Labyrinth | 80% | 70% | 80% | 100% |
| The Horde v Yokai | 80% | 60% | 40% | 70% |
| Moonless Night + Fog v Orcs | 100% | 90% | 100% | 60% |
| The Charge v Ogres | 90% | 70% | 50% | 100% |
| The Horde + Powder and String v Golems | 80% | 100% | 30% | 100% |
| **All weeks entered** | **84%** | **81%** | **62%** | **83%** |

Three waves are reached in every run measured, five in 50% to 100% by week. The Wild Kin is the week a new save cannot enter (no Beast or
Warden among the starters): the week that asks the player to summon.

## Checked

- `test/weekly-trial.test.ts`: the week turns on Monday (and in Mountain time, summer and winter); the choice by week alone, the cycle, every
  rule and army in it; the rules' words; the starter heroes favoured; the seven waves; who may enter (only, barred, one of each, Hire's pool,
  `canJoin`); a class's harder blows and Shield Wall's turned blow, exactly; the twists, healing and the Horde laid by a trial's stage; a fight
  outside the trial untouched; one try a day; rewards paid once a week, again the next week, never for a past week's run; the pay's size;
  the pip and the save.
- `test/pause-tips.test.ts` (the tutorial's lines), `test/ui-standard.test.ts` (the card is the standard menu).
- `node tools/weekly-trial/shots.mjs` (after `npm run web`): the camp, the tutorial, the card (top and foot), the deploy and a fight under
  Powder and String, and the reward card at 393 x 852, 360 x 780 and 412 x 915; the card of a week the save has nobody for, and Settings,
  Tutorials, at 393. Pictures in `docs/samples/weekly-trial/`.
