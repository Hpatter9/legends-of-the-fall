# Ultimates for every hero

> **COMBAT-002 (hero kits):** the ultimates now fill their own meter from the fight (about 40 s of fighting) and are fired by a tap on the
> hero's portrait, or on their own with Auto; their `rate` and `power` were tuned again. See [`hero-kits.md`](hero-kits.md). The tables below
> are the record of the level-15 and level-30 tuning before that.

> **Now level 30** (`hero-skills.md`, the owner's call): every `ULT_LEVEL` below reads 30 and every table and test was re-run at level 30. The text from "How often they fire" down is the record of the level-15 tuning, kept as it was.

Every hero has an ultimate now (all 45; `KITS[kind].ultimate`), **unlocked when the hero fights at level 30**. Eight heroes (Kitsune, Karasu Tengu,
Yamabushi Tengu, Gorgon, Samurai Commander, Great Sage, Demon Swordsman, Tyrant) wrote theirs first and had it from level 1; since `balance-pass.md` they
wait for level 30 like the other 37.

## The rules

- **Level.** A fight carries the level a hero fights at: `Boost.level`, set by `gradeBoost` (a hero kind's *lasting* level, 1 to 30)
  and by `localBoost` (the spire's and Calamity's *in-run* level, capped at 30 since `balance-pass.md`). `addUnit` stores it on `Unit.level` (absent is 1).
  An ultimate with an `unlock` level (`ULT_LEVEL` = 30 for the 37 new ones) does not charge, does not show its meter and does not go
  off below it (`ultimateOf(unit)` is the one place that decides; `tryCast`, `gain`, `ultimateReady` and the unit's bars read it).
  All 45 carry `unlock: ULT_LEVEL` (the first eight's are gated copies, made in `heroUltimates`). In the spire and Calamity the in-run level counts, so they
  unlock at in-run level 30 there.
- **Foes never take a hero's ultimate.** `ultimateOf` returns nothing for a foe whose ultimate has an `unlock`, so a boss whose
  second phase borrows a hero's skill by name (`bossPhases.ts`: Boar King and the Minotaur's skill, forest boss 3 and the Satyr's)
  does not borrow the ultimate too; the bosses are as they were. The foes that share one of the first eight's kits (the Gorgon Queen,
  Nine-Tails, the elites Sethra and Kuro) keep the ungated original (`abilities.ts`, `GATED`), so they fight with it from the start as before; a test holds it.
- **Charge.** As before: the ultimate fills at `ULT_RATE` (0.45) of the skill's rate, on its own meter (`charge2`), and goes before
  the skill when full. From level 30 up each ultimate also has a `tuned` pair (`Skill.tuned`, set in `ultimates.ts` `TUNE`): `rate` (its meter speed, times
  `ULT_RATE`) and `power` (times the caster's attack while it casts, and what its stuns, guards and heals are worth), the two balance knobs. Below
  level 30 every ultimate is locked.
- **Talents.** `ultPow` and `ultRate` (`talents.ts`) read the unlocked ultimate of whatever hero has them, so they work for the new
  ultimates too; only the Karasu, Yamabushi and Gorgon trees use them. The general nodes reach the new ultimates the way they reach
  every skill: `pow` lifts the attack while it casts (damage, healing, what is called up), `dur` lengthens stuns, guards, hastes,
  curses and decoys (the engines read `durOf`), `reach` lengthens reach, `extra` adds one more salvo, blink, shot, charge, hook or
  summoned fighter. That is the right size of change: a node that says "Shield Wall lasts longer" also lengthens Mass Muster for the
  Peasant, which a player would expect of a hero's whole kit. No tree names a new ultimate, and none needed to.
- **Hero sheet.** The sheet lists the ultimate under the skill; below its level it is dimmed and ends "Unlocks at level 30." (all 45).

## How they are built (`src/sim/ultimates.ts`)

`abilities.ts` builds its table, then calls `heroUltimates` once, which returns all 45. The new ones are thin configs on six engines
made from the skills' own helpers (`abilities.ts` exports them in one `export { ... }` at its end), so each reuses the looks
(`skillFx.ts`, the 'area', 'arc', 'heal', 'haste', 'banner', 'song' and 'frenzy' events) and none draws from the fight's main
stream.

| Engine | What it does | Used by |
| --- | --- | --- |
| `sky` | salvos (volley or meteor) on separate crowds, staggered; an optional echo | Archer, Fire Wizard, Dread Pirate, Siege Bot |
| `smite` | a burst round the caster: hurt, held, slowed, brittle, pulled in, cursed, drunk from | Juggernaut, Kraken Mate, Mummy, Shambler, Arc Blade, Lightning Mage, Warlock, Ranger, Time Witch, Wolf Bard |
| `bless` | the team healed, cleansed, shielded, guarded, hastened, rallied, charged, mended over time | Peasant, Cleric, Wanderer, Wolf Bard, Satyr, Time Witch, Druid |
| `fortify` | foes drawn to the caster, who and his allies guard (and are healed) | Knight, Paladin |
| `summon` | up to n of a kind called up at once | Beastmaster (wolves), Druid (treants) |
| `blinks` / `shots` / `fists` | a chain of blinks, shots or blows at separate foes | Kunoichi, Mercenary, Gunslinger, Rifle Bot, Ninja Monk |

The rest (Samurai, Minotaur, Lancer, Barbarian, Werewolf, Reaper, Queen Dragoon, Buccaneer, Illusionist, High Priestess) are
small functions of their own over the same helpers (`iaido` and `chargeAt` with more tiles and more damage, a frenzy filled to the
brim, a harvest that feeds on its kills, a line of fire, hooks, decoys, raising the fallen).

## All 45

Starred (*) are the first eight's, from `abilities.ts`; they unlock at level 30 and are tuned like the rest. *Meter* and
*Power* are the tuned numbers (`TUNE` in `ultimates.ts`, read from level 30 up): the meter's speed as a multiple of `ULT_RATE`, and the strength
as a multiple of the caster's attack while it casts (a stun, guard, shield or drink scales with it too: by its square root for how long, and
directly for how much; a talent's `pow` and `ultPow` add to it).

| Hero | Ultimate | What it does | Meter | Power |
| --- | --- | --- | --- | --- |
| Knight | Last Bastion | Every foe within 5 tiles must go for him for 6s; he takes half damage and a quarter of his health forms a shield | 0.68 | 0.25 |
| Samurai | Heaven-Splitting Cut | Dashes up to 7 tiles in a line, cutting every foe on it with a huge blow | 1.76 | 1.24 |
| Kunoichi | Shadow Dance | Slips behind the four weakest foes in turn and backstabs each | 0.95 | 0.08 |
| Archer | Arrow Storm | Five volleys fall on separate crowds across the field | 1.02 | 0.07 |
| Fire Wizard | Armageddon | Three meteors fall on separate crowds, each leaving the ground burning | 1.27 | 0.89 |
| Peasant | Mass Muster | Every ally closes ranks and takes half damage for 6s, and a sixth of their health comes back | 0.73 | 0.05 |
| Ninja Monk | Hundred Fists | Five blows on each of the three nearest foes, and each is stunned for 1.2s | 0.77 | 0.07 |
| Wanderer | Dawn Light | A dawn heals every ally, shields them for 3s and hastens them for 4s | 0.97 | 0.07 |
| Lightning Mage | Thunderstorm | Bolts strike the six toughest foes within 8 tiles, each stunned for 0.8s | 1.10 | 0.07 |
| Kitsune | Nine-Tailed Dream * | The three strongest foes in sight fight their own side for 4s | 1.02 | 0.07 |
| Karasu Tengu | Feather Storm * | A storm of blades falls on the thickest knot of foes for more than double | 1.35 | 0.07 |
| Yamabushi Tengu | Tempest * | A great gale: every foe within 4 tiles is hurt hard, shoved back and stunned for 1.5s | 1.31 | 1.42 |
| Werewolf | Full Moon | His frenzy fills to the brim for 7s and a quarter of his health comes back | 1.10 | 0.07 |
| Minotaur | Stampede | Up to three charges in a row, each at the weakest foe in line, shoving and stunning | 1.11 | 0.92 |
| Satyr | Bacchanal | Allies are hastened for 6s, mended over time and their skills surge | 0.90 | 0.10 |
| Gorgon | Stone Curse * | Every foe in sight within 6 tiles is hurt and turned to stone for 2.5s | 0.96 | 0.07 |
| Samurai Commander | Rally Cry * | The war banner flies over every ally: attack up a quarter for 9s and a quarter of their health back | 1.54 | 1.05 |
| Paladin | Divine Aegis | Foes within 4 tiles are struck and must go for him for 5s; the allies near him are healed and shielded | 0.74 | 0.07 |
| Cleric | Divine Intervention | Every ally is cleansed, healed, shielded and mended over 5s | 0.81 | 0.07 |
| Druid | Heart of the Grove | Two treants rise at her side and every ally is healed | 1.02 | 0.07 |
| Barbarian | Bloodlust | A whirl of blows round him; he drinks a third of what they deal and runs fast for 5s | 0.96 | 0.07 |
| Ranger | Hunter's Net | A net of vines hurts every foe in sight within 8 tiles and holds it for 2.2s; each takes a third more from every blow for 6s | 1.00 | 0.07 |
| Warlock | Soul Harvest | Every foe within 7 tiles is cursed and burns for 6s; he drinks from each | 0.90 | 0.05 |
| Illusionist | Hall of Mirrors | Four decoys appear round her and every foe within 6 tiles turns on them for 4.5s | 1.00 | 0.05 |
| Gunslinger | High Noon | Six shots at the hardest-hitting foes in reach | 0.98 | 0.07 |
| Shambler | Plague Tide | A wave of rot leaves every foe within 5 tiles cursed for 7s; he drinks from them | 0.74 | 0.07 |
| Rifle Bot | Overclock | Hits half as hard again and shoots faster for 7s, and fires four shots at the weakest foe | 1.01 | 0.13 |
| Mercenary | Contract Killer | Slips beside the three hardest-hitting foes in turn and cuts each hard | 1.24 | 0.07 |
| Mummy | Curse of the Pharaoh | Every foe within 5 tiles is cursed and slowed for 6s, and the Mummy is shielded | 0.85 | 0.07 |
| Buccaneer | Keelhaul | Hooks the three nearest shooters (or foes) in beside him, cuts each hard and holds it 1.5s | 1.26 | 0.07 |
| Wolf Bard | Battle Hymn | Allies are hastened and rallied (attack up a quarter) for 6s; every foe within 7 tiles is slowed | 0.96 | 0.05 |
| Beastmaster | Hunt of the Pack | Four dire wolves answer his call at once | 1.09 | 0.05 |
| Kraken Mate | Maelstrom | A whirlpool drags every foe within 6 tiles toward him, hurts and slows it | 0.84 | 0.07 |
| Lancer | Charge of the Knights | A long charge for a huge blow, and the riders near him gallop faster for 4s | 1.11 | 0.07 |
| Reaper | Harvest of Souls | Every foe within 5 tiles is cut; those under a third of their health are reaped for far more, and each kill feeds him | 1.38 | 0.09 |
| Time Witch | Time Stop | Every foe within 8 tiles is stopped where it stands for 2.6s, while her friends are hastened for 5s | 0.88 | 0.05 |
| Arc Blade | Thunder Cascade | Lightning leaps to every foe within 6 tiles, hurting and stunning each for 1.4s | 1.10 | 0.07 |
| Dread Pirate | Ghost Fleet | Three broadsides from the ghost fleet fall on separate crowds | 0.93 | 0.07 |
| Siege Bot | Orbital Strike | A great shell on the thickest crowd, and a second on the same spot a moment after | 0.89 | 0.50 |
| High Priestess | Resurrection | Up to two fallen heroes rise with half their health, and every ally is healed and cleansed | 0.84 | 0.05 |
| Queen Dragoon | Inferno Breath | Fire down the longest line of foes, up to 8 tiles, burning each for 5s | 1.11 | 0.07 |
| Juggernaut | Cataclysm | The ground splits: every foe within 6 tiles is hurt hard and held still for 2s | 0.89 | 0.97 |
| Great Sage | Astral Convergence * | Every ally's skill meter jumps by 50 and a starlit shield forms round it for 4s | 1.15 | 0.13 |
| Demon Swordsman | Demon Form * | For 7s he hits half as hard again, and a fifth of his health comes back | 1.31 | 1.05 |
| Tyrant | Reign of Terror * | Every foe within 6 tiles is hurt and slowed for 5s; every ally is rallied: attack up a quarter for 7s | 0.98 | 0.89 |

Looks: each ultimate has an entry in `SKILL_FX` (the sheet it plays on the caster and on what it hits) and `SKILL_ELEMENT` (the colour of its wind-up),
and the fight's own ultimate treatment (the dimmed world, the flash and the nova, `fx.ts`) is chosen by the name, so all 45 get it. Every effect is one-shot.
Screenshots: `docs/samples/ultimates-<name>-upright.png` (nine frames each: Arrow Storm, Armageddon, Last Bastion, Divine Intervention, Hunt of the Pack,
Time Stop, Cataclysm; `SIZES=upright node tools/fxlab/shots.mjs ultimates-arrow-storm,...`), and the hero sheet locked and unlocked at 393x852,
360x780 and 412x915: `ultimates-sheet-{locked,unlocked}[-360x780|-412x915].png` (`node tools/audit/ultimates.mjs`).

## Balance

The owner's rule: all 45 heroes within 4 points of each other (`test/hero-balance.test.ts`), with the ultimates locked and unlocked. Two tests hold it:

- **Locked** (the existing test: level 1, stage 5). The 37 new ultimates are locked here, so this table only moved through the small stat trims below
  (and the first eight's ultimates, which are as written below level 15). Largest lift 2.9 (Peasant, -2.9).
- **Unlocked** (`test/hero-balance-ultimates.test.ts`: level 15, stage 27, where a team of level 15 heroes wins about half). Largest lift 3.3 (Wolf Bard,
  Illusionist, Warlock and Kunoichi +3.3; Siege Bot -3.1); rms about 2.

Both play 12,000 seeded fights of random five-hero teams, as before, so the numbers are the same every run. They are tuned to those seeds (as the first
test always was): on other seeds a hero can read a point or two further out (a hero's own sample noise is about 1.4 points), so when a hero's stats or
kit change, re-run the sweep (`heroLifts(12000, 27, 0, 15)` in `tools/heroSweep.ts`, and `npm run balance -- --heroes-only`) and retune rather than loosening a test.

**What was tuned, and why.** Without any ultimate, heroes are not level at level 15 as they are at level 1: the high-defence heroes (Samurai Commander, Demon
Swordsman, Yamabushi, Minotaur, Tyrant, Siege Bot, Samurai, Fire Wizard) sit 3 to 6 points under the average, and a few light, quick ones (Beastmaster, Reaper,
Illusionist, Kunoichi, Wolf Bard, Peasant, Time Witch) three or four over, because flat defence is worth a lot at stage 5 and next to nothing at stage 27. The
ultimates are how it is evened out (the 37 do not exist at level 1): each has a **meter speed** and a **power** (`Skill.tuned`), and a hero who is strong without an
ultimate gets a quiet, weak one while a weak hero gets a quicker, stronger one (the table: Demon Swordsman, Samurai and Yamabushi are at the top, Archer, Ranger and
Gunslinger at the bottom). A tuning tool (`tools/heroSweep.ts` plus a damped search over the two knobs per hero, then a stat trim as a last resort) found the
numbers; the shipped state is one the sweep measured, not an extrapolation, with level 1 and level 15 measured together.

Beyond the knobs: Wolf Bard's Catchy Tune now charges allies' *skill* meters only (it was also filling their ultimate meters, which made him by far the strongest hero
at level 15), and nine heroes' stats were trimmed a little, only where an ultimate could not be quiet enough: Kunoichi hp 195 to 190, Peasant hp 315 to 306 and attack
18 to 17, Warlock hp 185 to 182, Illusionist hp 180 to 172, Wolf Bard hp 235 to 231, Beastmaster hp 195 to 184 and attack 17 to 16, Reaper hp 180 to 175 and attack
27 to 26, Time Witch hp 190 to 188, High Priestess hp 225 to 215 and attack 18 to 17; and +1 defence for Kunoichi, Illusionist, Reaper and High Priestess, which gives
level 1 back what the trim took (defence matters there) and leaves level 15 alone.

**How often they fire.** At level 15 and stage 27 a fight lasts about 25s and a team of five casts about 0.4 ultimates in it (one in every two or three fights). A hero's own
ranges from one fight in two (Yamabushi) and one in three (Samurai) to one in thirty (Knight, Siege Bot, Paladin, Kraken Mate), a typical one is about one in fifteen; the long fights
of the armies' last waves and bosses see more. Only so much can be asked of them: the late armies' power (`late-power.md`) is already won back by levels, so how much the
ultimates may weigh in all is set by that, not by how big they look.

**The late armies** (`npm run balance -- --no-tables --climb --saves 240`, mean tries, the merged base 0.101.0 without and with the ultimates; the tool's own noise is about 0.15):

| | Orc | Undead | Beast | Wildwood | Labyrinth | Ogre | Infernal | Yokai | Golem |
|---|---|---|---|---|---|---|---|---|---|
| before | 2.7 | 2.6 | 2.4 | 4.2 | 3.7 | 2.6 | 2.4 | 2.6 | 2.1 |
| now | 2.7 | 2.4 | 2.2 | 3.9 | 2.9 | 2.3 | 2.3 | 2.4 | 1.9 |

The Labyrinth's drop of 0.8 is the one above the 0.5 asked for; the rest are 0.3 or less (the party there is level 17 to 19, every hero past the unlock). The first
tuning, where every hero's ultimate was strong and fired often, took 1.8 tries off the Wildwood and 1.5 off the Labyrinth; the state before this one (ultimates twice as
frequent, `Meter` floor 1.0) was 0.8 on the Wildwood and 0.8 on the Labyrinth. The spire (`--tower`) and Calamity (`--calamity`) are as before within the tools' noise:
their heroes seldom reach in-run level 15 (mean level at the end 4 and 8).

At levels 20 and 30 (informational, not held by a test, and noisier than the table above: 12,000 fights at stage 29 and 37) the same heroes sit at the two ends (largest lifts
4.1 at level 20 and 5.0 at level 30, against a sample noise of about 1.4), so no hero jumps ahead as the level grows.

## Tests

`test/ultimates.test.ts`: every hero has an ultimate (45, all different); all 45 unlock at 15, locked at 14 and at level 1; the foes that borrow the first eight's kits keep theirs;
a locked ultimate neither charges nor casts, an unlocked one does both; the level reaches the fight (`gradeBoost`, and `localBoost` capped at the in-run 20);
the tuned meter applies from 15 and not below; every one of the 37 fires in a fight; a fight with them is deterministic; every ultimate has a cast effect; and a boss whose
second phase borrows a hero's skill (Boar King, the grove boss) does not borrow its ultimate. `test/hero-balance-ultimates.test.ts`: the level-15 balance above.
`test/talents.test.ts`: the capstone check is for the first eight (whose trees were written around an ultimate). `test/more-heroes.test.ts`: every second-wave hero has one.


**Gated, and the Labyrinth and Calamity retuned:** see `balance-pass.md`.
