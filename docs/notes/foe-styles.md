# Foe styles

The owner: "We need to make sure all bad guys have unique fighting styles. The stronger ones have skills even." Every foe now fights its own
way: the common foes by a passive and a way of moving, the armies' own kinds from the Beast Packs on and the elites with a skill on top. No
two foes share a kit (`test/foe-styles.test.ts`). The bosses keep their kits and signature attacks as they were.

## The audit (before)

How each foe fought on main 0.331.0, and which fought as another did.

| Foes | How they fought | The same as another? |
| --- | --- | --- |
| Black, Red and White Werewolf; the three Minotaurs, Gorgons and Satyrs; Orc Grunt, Archer and Brute; Imp, Demon, Ogre; Skeleton, Skeleton Spearman, Skeleton Archer (21) | No kit. Walked at the nearest hero and struck the weakest in reach. They differed only by their numbers, their reach (the gorgons, the archers and the spearman), the demon's wings and the werewolves' jump | **Yes, all 21**: a stat block that walks and hits. The three of each sheet fought identically |
| Skeleton Marksman (`boneVolley`) | The Archer's Volley, arrows ignore 2 defence | No |
| The Beast Packs' three werewolves | The Werewolf hero's kit (Ravage, Frenzy) | **Yes**: all three, the Alpha Werewolf (a mid-boss) and the elite Ysolde |
| The Wildwood's three satyrs | The Satyr hero's kit (Pipes of Pan, Sure Hooves) | **Yes**: all three and the elite Silenus |
| The Labyrinth's three minotaurs | Gore Charge, Trample | **Yes**: all three |
| The Labyrinth's three gorgons | Petrifying Gaze, Scaled Hide | **Yes**: all three |
| The Ogre Clans' ogre and orc brute | The Horned Ogre boss's kit (Horned Shove, Thick Hide) | **Yes**: both, the boss and the elite Thrum |
| The Infernal Host's demon | The Devil Leader boss's kit, exactly (Hellfire, Hellborn) | **Yes**: the boss and the elite Cindra |
| The Infernal Host's imp | Tusk Flurry, Hellborn | No |
| The five yokai, the four golems | Each its own (Mirror Image, Hex, Dive, Possession, Wind Gust; Crushing Slam, Shield Wall, Shard Burst, Magma Burst) | No, though the Karasu Tengu's was the elite Kuro's |
| The elites | Gorrak, the Hollow Knight, Nyssa and the Iron Warden had their own; Ysolde (Werewolf), Sethra (Gorgon), Brakka (Minotaur), Cindra (Devil Leader), Vexor (Demon Lord), Thrum (Horned Ogre), Kuro (Karasu) and Silenus (Satyr) wore another's whole kit | **Yes, eight** |

## The new pieces

- **Ways of moving** (`Passive.move`, `src/sim/foeStyles.ts`), read for foes in every fight but the Last Stand (whose foes march on the breaches
  by their own mind, `standAi.ts`):
  - `flank`: goes round to the side or back of a hero busy with someone else (the quick heroes' own step, `flankStep`);
  - `kite`: a shooter, or a spear, steps back from a blade that is striking it and keeps its reach (the quick shooters' `kiteStep`);
  - `hunt`: makes for the heroes' shooters and casters (a shot, or a reach of 3 or more) first, in reach and walking;
  - `guard`: keeps by its most needy friend (a shooter, else the most hurt) and strikes whoever is striking its friends first;
  - `charge`: three steps in a row end in a blow half as hard again (`CHARGE_RUN`, `CHARGE_MULT`); the fight shows "Charge!" over it (a new
    `style` event). This one works in the Last Stand too.
- **A pack's bite** (`Passive.gang`): a tenth more for each other ally of its own beside the prey, up to three.
- **Riders that grow with the foe** (`Passive.rider`): a bleed, burn or poison of a share of its attack every half second (the old `ignite` is a
  fixed number, which the deep acts and late armies would have made nothing of).
- **No skill** (`NO_SKILL`, `hasSkill`): a common foe's kit has only its passive and way of moving; it never charges or casts, and the page
  shows no charge bar or skill line for it (the unit card, the codex).
- The stronger foes' skills are borrowed from the heroes and bosses under names of their own, keeping the borrowed key (so their look, sound
  and rider come with them, and every foe skill still has its painting): their name rises over the foe as it casts, as every foe skill's does.

No randomness was added: every choice is a fixed order over the fight's state, ties broken by id.

## What each foe does now (`src/sim/foeKits.ts`, the elites in `src/sim/eliteFoes.ts`)

**The common foes** (no skill):

| Foe | Passive | Moves |
| --- | --- | --- |
| Orc Grunt | Warband: 6% less from each friend beside it | (holds the line) |
| Orc Archer | Fire Arrows: its arrows burn | kite |
| Orc Brute | Bull Rush | charge |
| Skeleton | Bone Shield: blows from the front lose an eighth | guard |
| Skeleton Spearman | Long Spear: ignores 2 defence | kite |
| Skeleton Archer | Hollow Draw: a fifth more at 4 tiles or more | kite |
| Black Werewolf | Pack Hunter: the pack's bite | flank |
| Red Werewolf | Rending Bite: its bites bleed | hunt |
| White Werewolf | Ghost Pelt: slips 15% of blows | flank |
| Minotaur (1) | Bull Rush, cannot be shoved | charge |
| Minotaur (2) | Gore Rage: up to half again as its health falls | charge |
| Minotaur (3) | Maze Wall: a fifth off blows from the front, cannot be shoved | guard |
| Gorgon (1) | Stony Glare: its shots slow | kite |
| Gorgon (2) | Venom Fangs: its shots poison | kite |
| Gorgon (3) | Serpent Eye: 30% more to shooters | hunt |
| Satyr (1) | Sure Hooves: climbs freely | flank |
| Satyr (2) | Wild Revel: friends within 2 heal 1% a second | guard |
| Satyr (3) | Nimble: slips a fifth of blows | hunt |
| Imp | Hellspark: its claws burn | flank |
| Demon (flies) | Soul Hunger: drinks 15% of what it deals | hunt |
| Ogre | Great Club: hits the hero behind for 60%, cannot be shoved | (plods) |

**The armies' own kinds and the elites** (a skill each):

| Foe | Skill | Passive | Moves |
| --- | --- | --- | --- |
| Skeleton Marksman | Volley | Dead Aim | |
| Black Werewolf (pack) | Ravage | Frenzy | flank |
| Red Werewolf (pack) | Blood Howl (the bard's Dirge: hurts, slows and weakens within 4) | Blood Scent: the pack's bite | hunt |
| White Werewolf (pack) | Moon Pounce (leaps 4 onto the weakest) | Ghost Pelt | flank |
| Grove Satyr (1) | Pipes of Pan | Sure Hooves | flank |
| Grove Satyr (2) | Grove Wine (the Wanderer's healing mist) | Wild Revel | guard |
| Grove Satyr (3) | Briar Snare (the Ranger's snares) | Nimble | hunt |
| Minotaur (maze 1) | Gore Charge | Trample (a quarter) | charge |
| Minotaur (maze 2) | Maze Cleave (Whirlwind) | Gore Rage (40%) | flank |
| Minotaur (maze 3) | Labyrinth Bellow (Hold the Line for its friends) | Maze Wall (a quarter) | guard |
| Gorgon (maze 1) | Petrifying Gaze | Scaled Hide | kite |
| Gorgon (maze 2) | Venom Rain (a volley) | Venom Fangs | kite |
| Gorgon (maze 3) | Serpent Lash (the Buccaneer's hook) | Serpent Eye | hunt |
| Clan Ogre | Club Sweep (Whirlwind) | Hide Like Bark: 1% a second, cannot be shoved | |
| Clan Orc Brute | Skull Bash (Thousand Fists) | Brutal Rush: crits that bleed | charge |
| Hell Imp | Pitchfork Flurry | Hellspark | flank |
| Hell Demon | Hellfire | Brimstone Wings: burns, drinks 12% | hunt |
| Fox Spirit | Mirror Image | Fox Guile | flank |
| Fox Witch | Hex | Black Curse | kite |
| Karasu Tengu | Dive | Hunter's Eye | hunt |
| Crow Seer | Possession | Evil Eye | hunt |
| Yamabushi Monk | Wind Gust | Mountain Breath | guard |
| Stone, Crystal and Magma Golem | as before | as before | |
| Iron Golem | Shield Wall | Iron Plate | guard |
| Gorrak | Ground Slam | Bonebreaker Rage | |
| Nyssa | Eldritch Blast | Venom | kite |
| The Iron Warden | Ground Slam | Iron Plate | guard |
| Ysolde | Ravage | Frenzy | hunt |
| The Hollow Knight | Shield Wall | Hollow Plate | guard |
| Sethra | Petrifying Gaze (and her ultimate) | Scaled Hide | kite |
| Brakka | Gore Charge | Trample, cannot be shoved | charge |
| Cindra | Hellfire | Hellborn Fury: burns, rages up to 40% | |
| Vexor | Summon Imps | Dark Regrowth | guard |
| Thrum | Horned Shove | Avalanche: a fifth off the front, cannot be shoved | charge |
| Kuro | Dive (and Feather Storm) | Hunter's Eye | flank |
| Silenus | Pipes of Pan | Wineskin: 2% a second | guard |

The codex sheet of an entry that covers several kinds (the Minotaur's six, the Gorgon's, each werewolf's two) lists its other kinds under
"Its other kinds", and the tips name each way of moving.

## Rebalance

Built on main 0.345.0 (0.340.0 and 0.345.0 were merged mid-work, each followed by a fresh read of both trees). "Main" below is 0.345.0's own
code run side by side with this branch with the same seeded tools (`tools/foe-styles/suite.sh` on both trees); "styled, untuned" is this branch on
0.345.0 before its army starts were set again.

**The common foes** were brought back by their own numbers, measured on the field bands with the starting five at level 1 over 200 fights
(`node tools/foe-styles/run.mjs bands40 200`): the styles first moved the werewolves from 47% to 24%, the gorgons 70% to 39%, the demons 42%
to 30%; the riders were then made to grow with attack (a flat bleed of 3 was most of a level-1 wolf's bite) and a few foes trimmed:

| Foe | Before | Now |
| --- | --- | --- |
| Black / Red / White Werewolf hp | 250 / 250 / 210 | 243 / 228 / 200 (Red atk 25 to 23) |
| Minotaur (1) atk; Minotaur (2) hp, atk | 27; 330, 24 | 26; 300, 22 |
| Gorgon (1) hp, atk; (2) hp, atk; (3) hp, atk | 300, 26; 300, 22; 250, 26 | 260, 25; 290, 20; 245, 25 |
| Satyr (2) atk; (3) hp, atk | 26; 270, 25 | 25; 250, 24 |
| Orc Archer hp, atk; Orc Brute hp, atk | 200, 24; 420, 30 | 192, 23; 395, 29 |
| Demon hp, atk; Ogre atk | 410, 32; 30 | 395, 29; 31 |
| Skeleton Archer hp | 200 | 195 |

(The elites built on these sheets, `eliteFoes.ts`, take the same numbers.) The heroes' wins against each band, 200 fights, main / now:
skeletons 64 / 67%, werewolves 47 / 51%, minotaurs 63 / 62%, gorgons 70 / 72%, satyrs 69 / 67%, mixed 68 / 68%, orcs 77 / 76%, demons 42 / 46%,
ogres 63 / 61%. `foes.test`'s own fights (seeds 1 to 40) all sit inside its 8 to 32 (the ogres' 35 of 40 at first was what moved the Ogre's
attack). The skeleton first had a spear that also struck the hero behind; that cost the lighter new-hero teams most (they stand in lines), so the
spear pierces armour instead and the skeleton kept its stats (`new-heroes`' seeds: the lightest team 0.38 of the five's wins, the mean 0.51;
over 180 seeds the five win 120 and the teams' mean is 0.47 of it, main 0.52).

**Hero parity** (no hero changed; `node tools/kits/tune.mjs <none> <level> <stage> 12000`, the average team's wins and the spread):

| | Main 0.331 | Now |
| --- | --- | --- |
| Level 1, stage 5 | 56.7%, 11.3, none beyond 6 | `hero-balance` passes (the Rifle Bot's +6.1 on the first styled read was brought back with the common foes' trims) |
| Level 10, stage 27 | 40.5%, 11.4, none beyond 6 | 39.1%, 13.8, the Archer +6.8, Ranger +6.4, Kraken −7.0 (no test holds level 10; read before the last trims) |
| Level 10 on main 0.345.0 | 44.2%, **14.4**, the Kitsune +8.8 and Werewolf +7.3 beyond 6 | 44.1%, 14.1, the Werewolf +7.8, Shambler +6.9, Kitsune +6.7; Lancer −6.0, Siege Bot −6.3 |
| Level 30, stage 90 | 62.5%, 9.1 | 62.1%, 12.0 (the Shambler +6.1 on the first read); `hero-balance-ultimates` passes on the final code |

**The modes** (main 0.345.0 / styled, untuned / now):

| What (tool) | Main 0.345 | Styled, untuned | Now | Knob |
| --- | --- | --- | --- | --- |
| The realistic climb, mean tries: Orcs / Undead / Beasts / Wildwood (`CLIMB_ARMIES=4 node tools/balance.mjs --no-tables --climb --saves 120`) | 2.1 / 2.6 / 5.2 / 1.8 | 2.2 / 2.9 / 4.7 / 1.8 | the same | none (the first four's starts are pinned by `army-pace`) |
| Single tries, 96 saves (`SAVES=96 node tools/merge-two/run.mjs`): Undead 8 | 3% | 2% | 2% | |
| Beasts 15 | 48% | 43% | 43% | |
| Wildwood 22 | 85% | 75% | 75% | none (the owner: acceptable while the climb holds) |
| Labyrinth 30 | 23% | 25% | 25% | `start` 7.9 to 7.65 (set against 0.340's 28%) |
| Ogres 38 | 13% | 10% (at 11.7) | about 13% (10% at 11.7, 18% at 11.4) | `start` 12.5 to 11.55 |
| Golems 52 | 0% | 0% | 0% | |
| Legendary Orcs 55 | 86% | 82% | 82% | |
| Infernal at 55, tries (`SAVES=48 node tools/spells-retune/run.mjs cell infernal:55:0:tph`) | 3.5 | 4.3 (at 20.4) | 3.4 | `start` 20.6 to 19.8 |
| Yokai at 65 | 12.3 (77% cleared) | 10.9 (at 22.3) | 12.0 (79%) | `start` 23.3 to 22.7 |
| Golems at 65 | 8.5 | 8.1 | 8.1 | |
| Mythic at 100, 12 saves: Golems / Yokai / Infernal | 3.3 / 3.5 / 1.8 | 4.2 / 3.6 / 2.9 | the same | none |
| Daily, 120 dates, hearts / none (`node tools/dailyRate.mjs --days 120`) | 77% / 63% | 78% / 67% | the same | `DAILY_START` 0.785 to 0.75 (set on 0.331, held) |
| Last Stand, 40 runs, median wave (mean) at 1 / 10 / 30 / 100 | 4 / 9 / 15 / 25 (3.8 / 9.2 / 16.2 / 26.1) | 4 / 10 / 15 / 26 (3.7 / 9.3 / 15.6 / 25.3) | the same | `HALL_EASE` 1.2 to 1.15, `WAVE_GROWTH_DEEP` 0.22 to 0.21 (set on 0.340, held) |
| Calamity, 100 runs: mean maps (past map 2 / cleared) | 1.82 (73 / 11) | 1.79 (73 / 8) | the same | none |

(The armies' starts were set three times: against 0.331 (the Ogres 12, the Infernal Host 21.3 with its harder tiers lifted, the Yokai 22.7), against
0.340 (11.7, 20.4, 22.3) and against 0.345, each time to that main's own figure, since each main moved them itself: the Ogres' single tries were 9% on
0.331, 19% on 0.340 and 13% on 0.345. The spire stopped being a mode of its own in 0.345 (its map engine runs the Calamity), so it is no longer read;
on 0.340 it read 85.0 / 87.0 mean floors, no castle and full, against main's 85.3 / 89.2. The single 12-save Mythic reads sit within their noise of
the difficulty note's 3 to 4.)

## Tests

- `test/foe-styles.test.ts` (new, 10 tests): no two foes (bosses aside) share a kit or even a kit's shape (its skill, the kinds of its
  passive's effects and its way of moving), and none is a boss's; the armies' kinds from the Beast Packs on and every elite have a skill;
  a skill-less foe never casts; the charge (and its "Charge!"), the pack's bite, the riders growing with attack, kiting (an archer and a
  spear), flanking, hunting and guarding each do what they say; styled fights are deterministic.
- Moved to the new rule (a common foe has no skill): `unit-info` (a skill-less foe's card shows its passive first), and the four tests that
  ask every kit's skill for its element, painting, signature and effect (`combat-fx`, `individual-ability-fx`, `signatures`, `skill-fx`) skip a
  kit with no skill.
- Moved because the skeleton now carries a shield: `levels` (the killing blow is twice its health) and `sim-001`'s two effective-blow tests
  (the skeleton is struck from behind).
- Re-staged on new seeds: `set-powers`' Shadow Dance (orcs, seed 2 to 7) and the Widow's Bow (skeletons, seed 1 to 5), whose fights no longer
  gave the Knight the kill or the first blow on the strongest foe they need; the test still asks each to fire.
- Re-recorded: every identity scenario (on main 0.345.0) (`spells-identity` and `ailments-identical`, the hashes in their headers; every scenario meets foes, so
  every one moved), and the Last Stand's twelve pinned fights (`stand-regression`: all twelve moved; the third, a close loss, is now won, and the
  seventh, a close win, now lost).

## Checks

`npm run typecheck` clean. The full `npm test` on the final code (main 0.345.0 merged): **2,462 of 2,462 pass** (the 2,460 others on the full run, and `set-powers`' two after
its seeds were moved). `npm run web` built. The page:
`node tools/foe-styles/shots.mjs` at 393x852, 360x780 and 412x915 (`docs/samples/foe-styles-codex-*.png`): the Minotaur's sheet with its five other
kinds, no page errors, nothing runs off the side. The fight's "Charge!" is the same floating label as a werewolf's "Frenzy", and a skill-less
foe's bar simply has no charge strip under its health.

## Determinism and saves

Nothing draws from a stream: every style is a fixed order over the fight's state. A charger's run is a number on the unit for the fight only;
nothing new is saved.

## Tools

`tools/foe-styles/`: `suite.sh` runs every mode's yardstick on a tree in two lanes; `run.mjs` runs `bands` and `bands40` (the field bands,
the latter on `foes.test`'s own fights), `teams` and `newteams` (the new-hero teams, the latter on `new-heroes.test`'s own seeds), `merge`
and `cells` (merge-two's single tries and spells-retune's cells), each with `knobs.ts`'s switches: `FOE_SET` (a foe's stats), `FOE_PLAIN`
(a foe without its kit), `KIT_SET` (a kit's number) and `ARMY_SET`; `shots.mjs` the codex at the three phone sizes.

## The owner's answers (through the director)

1. The Last Stand's foes keep marching (their passives, skills and charge, not flank, kite, hunt or guard).
2. The Wildwood's single tries at 74 to 75% are acceptable while its climb holds (1.8 tries, as main).
3. The Ogre Clans' early danger is fine.
4. The common foes stay without a skill.
5. Level-10 parity at 13.8 was too wide: bring it to within about 8 with foe numbers alone, if that can be done. **It cannot, on the measure:**
   main 0.345.0 itself reads a spread of 14.4 at level 10 (the Kitsune +8.8, the Werewolf +7.3), and this branch 14.1; the spread came with main's
   own changes since 0.331 (the tactics, the bonds), not with the styles. By band (`node tools/foe-styles/run.mjs lift 10 27 12000 0 12000
   <heroes>`), the leaders lead against nearly every band (the Werewolf +2 to +14 in all nine, the Shambler +4 to +13 in all nine, the Kitsune in
   eight) and the Siege Bot trails in all nine; only the minotaurs and the satyrs lean (the Kitsune +15 and the Lancer −14 against the minotaurs, the
   Lancer and the Samurai −10 to −13 against the satyrs), and those bands also carry every other mode. Bringing it to 8 needs the heroes' own kits
   (the Werewolf, Kitsune and Shambler trimmed, the Lancer and Siege Bot lifted), which the owner's rule for this work kept untouched: a question
   for a hero batch.
