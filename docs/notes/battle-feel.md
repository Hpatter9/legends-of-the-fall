# BATTLE-FEEL: an audit of how the fights feel, and the clear fixes

Branch `claude/battle-feel` (from main 0.449.0). The owner's ask: "let's make sure the tactics and battles feel right, with skills and
effects". Armies' waves and the hero sweep's field fights were audited. The Calamity and the Last Stand are hidden (`hiddenModes.ts`) and
were skipped. The daily and the Assault were not played separately: the daily fights with the same `decide` and effects as an army wave,
and the Assault's field keeps its own walk (the fix below leaves `b.field` alone). The version and `UPDATES` are untouched.

## The tools

- `node tools/battle-feel/audit.mjs <level>:<stage> ...` (`GAMES`, `SKILLS=1`, `BACKS=1`, `WAITS=1`): the hero sweep's seeded fights,
  headless. It prints fight length, each role's waiting time and why it waits, back-and-forth steps, fighters that walk off from a melee foe
  striking them, distance to the nearest foe by role, and for every skill: its casts, how many reached nobody, foes reached a cast, damage
  and healing a cast, and its hits of 2 or less.
- `node tools/battle-feel/frames.mjs [--only <name>] [--sizes 393x852,...]`: plays six army waves in the page (a range of parties, levels
  1 to 46, armies, tiers and speeds x1 to x3) and writes a frame strip of each to `docs/samples/battle-feel/`. The audit's evidence below
  was read from strips of main's build; the Beasts and Undead strips there were retaken on this branch at all three phone sizes, so they
  show the fixes (fewer, smaller heal numbers).
- `node tools/battle-feel/probe.mjs <army> <stage> <level> <party> [speed]` logs each hero's tile, health and action every half second of
  a page fight; with `DUMP=file` it saves the battle before the fight. `tools/battle-feel/replay.ts` (bundle it with esbuild) replays that
  dump headless and, with `WHY=1`, prints the walk choice behind each of one fighter's decisions.

## What feels wrong, ranked

| # | What | Evidence | Done |
| --- | --- | --- | --- |
| 1 | **Fighters pace back and forth.** `decide` walked for the foe nearest *as the crow flies* that had any free tile to strike from, however long the walk round. As friends filled and freed that foe's tiles, the choice flipped each step. | Beasts wave 6, level 20 (`beasts-melee-lv20-393.jpg`; probe and replay): the Barbarian steps 11,12 → 11,11 → 11,12 … from 7.9 s to 10.2 s without a blow. `WHY=1` shows its pick: a foe whose nearest open tile is 28 steps' walk (via 11,12) over one 12 steps away; one step later the costs flip. | Fixed |
| 2 | **A skill's hits look and sound like the caster's previous skill.** A cast's hits come in the tick *before* its `skill` event. The effects read the caster's last cast (`casting`), and the sound read its kit's first skill. So a second skill or an ultimate struck with the wrong sheet, the wrong element and the normal size, not the ultimate's. | Event log, seed 7: `hit … src:"skill"` lines at t 2600, then `skill "Burst Fire"` in the same tick (the same for Dead Eye, Smite, Ravage). | Fixed |
| 3 | **Small heals bury the fight in numbers.** Every heal popped a bold 15 px "+N" (damage numbers are 9 px), a green ring and a thread from the healer, even for an aura's 1%-a-second tick or a drain. | `undead-mixed-lv12-393.jpg`: "+2", "+3", "+6", "+7", "+8", "+10", "+16" over the front every second from the Paladin's aura. | Fixed |
| 4 | **Effects with no sound.** Laid ground (fire, thorns, ice, stone, wind), the marks that change a fighter (turned to stone, frightened, changed into a beast, charged, warded, hexed) and "Immune" were silent. | 300 fights at level 35: fire laid 182 times, thorns 97, immune 242, polymorph 44, stone 31, fear 26, charged 54. None has a cue in `cuesFor`. | Fixed |
| 5 | **The biggest kills held for the shortest time.** A crit, or a backstab, that killed with a third of the target's health took the 34 ms crit stop ahead of the 90 ms big-kill stop. | `hitStopMs(true, 0.4, true, false, false, true)` gave 34. | Fixed |
| 6 | **Skills that hit for 1 or 2.** Several skills at low level land below the armour and show a "1" or "2". | Audit, level 1, stage 3, hits of 2 or less: Kraken Mate Undertow 247 of 107 casts (2 damage a cast), Harpooner Barbed Harpoon 146 (2), Ninja Monk Thousand Fists 171 (7), Corsair Surgeon Boarding Swing 92 (1), Vampire Lord Crimson Lunge 89 (2), Astral Sphinx Rift Pounce 71 (3), Paladin Holy Challenge 35 (2). Gone by level 35. | For the director |
| 7 | **Melee strikers stuck behind friends.** Strikers spend 11 to 14% of their time waiting with no way to any foe. Most of that is a friend standing in a gap in a wall, often a shooter that does not move. | Audit, level 15: "striker: no way to a foe" 2,930 waits in 500 fights. Seed 50003: the Ninja Monk at 3,8 behind a friend in the wall's gap at 2,8. | For the director |
| 8 | **Words pile up over the melee.** "Saved" (about six a fight), "Glance", "Miss" and "Immune" stack above a crowd. | `beasts-melee-lv20-393.jpg`, frames 2 and 5; `undead-mixed-lv12-393.jpg`, frame 9. 300 fights at level 35: saved 1,871, dodge 1,409, immune 242. | For the director |
| 9 | **Wall of Fire hides its own side.** The tall flame loop is drawn over the heroes standing in the wall. | `ogres-casters-lv32-393.jpg`, frames 4 to 6. | Art prompt (`battle-feel-art-prompts.md`) |
| 10 | **Pace.** Sweep fights last a median 22.7 s at level 1 (stage 3), 13.8 s at level 15 (stage 12) and 10.7 s at level 35 (stage 25), so 4 to 8 s of real time at x3. Army waves at x1 read well. At x3 a wave is over in a few seconds, and the stacking numbers (8) blur it. | Audit; the frame strips at x1, x2 and x3. | For the director |

What held up well:

- **Skills.** Hero casts that reached nobody: 0.8% at level 1, 1.1% at 15, 1.5% at 35. Nearly all of those are self-buffs with no event of
  their own (Shield Wall, Hold the Line, Bronze Peal), not misfires. Heals land on the hurt: no heal skill averages a small heal, and
  `mendUnit` never heals past full.
- **Area skills reach crowds.** At level 35: Cataclysm 2.7 foes a cast, Harvest of Souls 3.1, Maelstrom 2.8, Shell Storm 2.2,
  Astral Convergence 2.5.
- **Turning their backs.** Heroes rarely walk away from a melee foe that is striking them: strikers 5 to 7 times in 500 fights, front-liners
  1 or 2. The rest are quick shooters kiting (by design), spearmen and other kiting foes (their foe style), shoves, fear and dashes.
- **Role spacing.** Mean tiles to the nearest foe: front 2.2, striker 2.3, support 2.7, back 3.7 at level 15. Tanks stand nearest and
  shooters keep their distance.
- **Hit weight.** Hits already knock their target back by the share of health taken, shake the screen by trauma, and flash and burst on a
  crit. The one fault was the precedence (5).

Not measured: how the formations (wall, wedge, square, spread) change a fight. The sweep fights without one, and the strips used the
page's default.

## The fixes

1. **The foe a fighter walks for** (`decide`, `src/sim/battle.ts`). Each foe's nearest strike tile by walking is worked out first. A foe whose
   nearest tile is more than `FAR_WALK` (4) steps further than the soonest strike tile of any foe is passed over. Otherwise the order is as
   before (nearest by air first, with the same perch, menace and flank scores). No randomness is involved. The Assault's field
   (`b.field`) keeps the old choice. Tests: `test/battle-feel.test.ts` (a wall between the hero and the near-by-air foe: it goes for the
   other and never paces; with no wall it still takes the near foe). The first test fails on main.
2. **A skill's hits use the tick's cast.** `fx.ts` reads `tickCasts` before `casting` for a skill hit's sheet, signature, element and
   size. `soundRules.ts` has a new `castsOf(events)`, `cuesFor` takes it, and `sound.ts` passes it.
3. **Small heals are pooled** (`HealPool`, `HEAL_BIG` 5% of health, `HEAL_POOL_MS` 1 s, in `fxRules.ts`). A heal of 5% or more shows as
   before. Smaller ones add up per fighter and show as one 12 px "+N" with sparkles, a second after the first, or as soon as they reach 5%.
4. **New cues** (`terrainCue`, `markCue` in `soundRules.ts`): fire whooshes, thorns rustle, ice cracks, stone, ramparts and statues rumble,
   wind gusts, light chimes. Stone thuds, fear and hexes hum, a change of shape blinks, a charge crackles, wards hum. "Immune" rings like a
   soft block. A tile's terrain going away is quiet. Each cue goes through the mixer like any other.
5. **Hit-stop precedence** (`hitStopMs`): a kill that takes 30% or more holds 90 ms, crit or backstab or not. The 2-frame crit, backstab
   and meteor stops are otherwise unchanged. Test added to `test/tactile-juice.test.ts`.

Tests for 2 to 4: `test/battle-feel-fx.test.ts`.

## Balance (main 0.449.0 against this branch, the same seeds)

The hero sweep (`node tools/skills/measure.mjs`, 1,500 fights a cell; one standard error is about 1.3 points):

| Level:stage | main won / fight | branch won / fight |
| --- | --- | --- |
| 1:5 | 58.0% / 32.4 s | 56.9% / 32.3 s |
| 1:8 | 6.5% / 24.5 s | 6.1% / 24.2 s |
| 15:24 | 97.2% / 22.4 s | 97.3% / 22.5 s |
| 15:30 | 69.7% / 28.1 s | 68.7% / 27.8 s |
| 35:65 | 98.1% / 18.3 s | 98.1% / 18.3 s |

The armies by wave (`npm run balance -- --armies-only --attempts 12 --levels 1,15,30`, table 5a): mean waves won over every army and
level, main 116.8 and branch 118.1. The cells that moved are within one or two attempts of twelve (Orc Warband level 1 clear 16.7% to 25.0%,
Undead level 15 75.0% to 66.7%, Beast Packs level 15 50.0% to 58.3%). The audit at level 15 (500 fights): back-and-forth steps fell for
every role (foes 7.0% to 6.4%, front-liners 5.8% to 5.1%), with the same win rate and fight length.

## For the director (not built: each changes the design or the balance)

1. **A floor for skill hits** (6). Recommendation: a skill's blow never lands below about a third of its blow before armour, so a skill
   always reads as a skill. It lifts the weak low-level utility skills, so it needs a balance pass with `npm run balance`.
2. **Unjamming the doorway** (7). Recommendation: a melee hero with no way to any foe may swap places with a friend that has stood still
   for a second and is not in melee (the toolkit's `swap` event and its look already exist). The other way round, a shooter steps aside
   for a blocked friend. Either is new behaviour, and it would speed up fights on walled maps.
3. **Fewer words over the fight** (8). Recommendation: drop the "Saved" word and keep only its ailment chip, and show "Glance" only on a
   crit-sized blow. Or put both behind the numbers setting's "less" option.
4. **Wall of Fire's art** (9): the prompt is in `docs/notes/battle-feel-art-prompts.md`. Until it lands, an alternative is to dim the loop
   to about 60% over a tile with a fighter on it (renderer only).
5. **x3 pace** (10). Recommendation: leave the sim's pace. If x3 feels like a blur, cap x3 at x2.5, or at x3 show only crit and kill
   numbers. The owner's call.

## Checks run

`npm run typecheck`. `npm test -- battle-feel battle-sound tactile-juice combat-fx battle terrain height foe-styles hero-kits`. `npm run web`.
The page at 393x852, 360x780 and 412x915 (frame strips in `docs/samples/battle-feel/`).
