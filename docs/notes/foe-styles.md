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
| Gorrak, Nyssa (now kites), the Iron Warden | as before | as before | |
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

MEASUREMENTS

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
- Re-recorded: IDENTITY

## Tools

`tools/foe-styles/`: `suite.sh` runs every mode's yardstick on a tree in two lanes; `run.mjs` runs `bands` and `bands40` (the field bands,
the latter on `foes.test`'s own fights), `teams` and `newteams` (the new-hero teams, the latter on `new-heroes.test`'s own seeds), `merge`
and `cells` (merge-two's single tries and spells-retune's cells), each with `knobs.ts`'s switches: `FOE_SET` (a foe's stats), `FOE_PLAIN`
(a foe without its kit), `KIT_SET` (a kit's number) and `ARMY_SET`; `shots.mjs` the codex at the three phone sizes.

## Questions for the owner

QUESTIONS
