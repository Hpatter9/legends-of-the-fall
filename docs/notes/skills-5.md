# Skills overhaul, batch 5: skill levels by use

The owner-approved design is [skills-overhaul-design.md](skills-overhaul-design.md) (section 5; the owner's answers: the ultimate does **not**
level, there is **no** head start for old saves, and skill levels do **not** apply in the spire or the Calamity). Batches 0 to 3 are in
[skills-1.md](skills-1.md), batch 4 (the third skills) in [skills-4.md](skills-4.md).

## What was built

- `src/sim/skillLevels.ts` (new): the points, the levels, the levelled kit and the counting.
  - **Points:** a cast earns its Level 1 cooldown in whole seconds (`castPoints`; a 3 s jab 3, a 3.5 s jab 4, a 16 s utility 16), so a level
    never slows its own growth; a healer's revive face 30, for its skill 2. Each wave fought (placed when it settles, won or lost, the fallen
    too) gives each **open** skill 2 (`FIELD_POINTS`). Auto-replay counts half (`AUTO_SHARE`, rounded down).
  - **Saved** per hero kind under each skill's fixed key: `Meta.skillUse?: Record<kind, Record<key, points>>` (optional; the save version is
    not bumped). A learned skill counts under its own key for the kind that learned it, so a Samurai's Whirlwind and the Barbarian's are apart,
    and it keeps its level in either slot. No head start: a save from before has none, every skill at Level 1. `readSkillUse` drops unknown
    kinds and keys, points below 1 or above 3,500.
  - **Levels** at 200, 600, 1,500 and 3,500 points (`USE_AT`); points stop at 3,500 ("Mastered").

| Level | Points | Strength (`tune`) | Cost | Cooldown | Durations |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | | | | |
| 2 | 200 | ×1.08 | | | |
| 3 | 600 | ×1.15 | ×0.9 | | |
| 4 | 1,500 | ×1.22 | ×0.9 | ×0.9 | +15% |
| 5 | 3,500 | ×1.30 | ×0.85 | ×0.85 | +25%, and its Level 5 step |

- **The Level 5 step** by the design's rule, one per skill (`src/sim/kits/lv5.ts`, 135 keys): a skill that makes several things makes one more
  (`extra`, 13 skills), one that reaches reaches a tile further (`reach`, 29), any other lasts 15% longer again (`dur`, 53). The table is not
  hand-written: `node tools/skills/lv5.mjs --write` casts every hero's three skills in three set cases and notes which talent keys each cast
  reads (`tools/skills/lv5.ts`); `test/skill-levels.test.ts` holds the file to the probe, so a changed skill shows up.
  - **One move from the design:** 40 skills read none of the three (a plain blow, a heal, a mark with no timer), so "lasts 15% longer again"
    would do nothing for them. Their step is **8% stronger again** (`pow`, `LV5_POW`). An owner question below.
  - **The two named skills:** Summon Beast (`Call of the Wild`) lets three wolves stand from Level 3 and calls a dire wolf beside the wolf at
    Level 5 (one dire wolf at a time, renewed as the wolves are); Conjure Treant (`Call Treant`) lets a second treant stand at Level 5 (its
    `extra` step).
- **In the fight:** `heroStats` puts the kind's levels on its boost (`EquipStats.skillLv`, slot order, only when one is above 1; the tools pass
  `Boost.skillLv`), `addUnit` keeps them on the fighter (`Unit.skillLv`), and `heroKitOf` builds its slots at those levels (`kitWithLevels`,
  built once a kit and level set). A slot carries its strength, cost and cooldown already moved; its durations and Level 5 step sit on the
  caster's talents only while it is cast (`Slot.mods` set as `Unit.castMods` around `powered`; `tal` adds them), so every engine that reads
  `tal(me, 'dur' | 'extra' | 'reach')` needed no change. A level gained takes effect from the next wave.
- **The spire and the Calamity** build their heroes bare (`localBoost`: no `heroStats`), so their skills are Level 1; their fights still
  earn use toward the lasting levels (the owner's answer, below). The Last Stand, the armies, the daily, quest battles and the endless stages
  read the levels; every mode counts.
- **Counting:** `noteCast` (in `fire` and the revive) puts a cast's points on the fighter (`Unit.usePts`, by slot); `fightUse(b, kinds)` reads a
  settled wave's placed heroes (the save's own kinds, so a guest it does not have is left out); `settleSkillUse` adds them and returns each
  skill that rose a level. The page counts it in the wave's settle beside study and wear (`main.ts`: armies, the daily, quests, the endless
  stages, the spire and the Calamity; `useShare`: half under auto-replay, nothing for a practice replay of a daily or a quest battle). The Last Stand is one long battle: each wave's casts and fielding fold into the run (`StandRun.use`, by
  `foldUse` at each clear, held line and the king's fall; a hero fallen in an earlier wave counts no more), and the run's tally is counted in
  full when it ends (`standView.ts`).
- **Where it shows:**
  - The wave card and the results screen: "Shield Wall reached Level 2!" (a `skill` line, after a learned book's line; the Last Stand's end
    card lists the run's).
  - The skill sheet in a fight and the unit card between waves: a **Level** row ("Level 3 · 812 of 1,500 to Level 4", "Level 5 · Mastered", and
    "· Level 1 here" in the spire and Calamity), and the five levels' list in place of the rank line, the one it fights at marked. The
    ultimate's sheet keeps the rank line.
  - The hero sheet's Skills tab: each skill's level and a thin bar to the next. The skill book's picker: each known skill's level.
  - The chips' bronze, silver and gold rims are batch 7's (the page batch), with the three chips.
- **Tools:** `--skill-level <1-5>` (or `SKILL_LEVEL`) on the hero sweep (`tools/heroSweep.ts`), so `tools/kits/tune.mjs` and
  `tools/skills/measure.mjs` fight every hero's three skills at that level. The design's `--mastery auto` belonged to the books' old mastery
  and is not built: auto-replay's half is a settle rule, not a tool option.

## The measured effect of Level 5

`PARTS=4 node tools/kits/tune.mjs <empty knobs> <level> <stage> 6000 --skill-level <L>`: the hero sweep's seeded five-hero teams on the field
bands, every hero's skills at the level shown (the ultimate unchanged).

| Hero level, stage | Skills at Level 1 | Level 3 | Level 5 |
| --- | --- | --- | --- |
| 1, stage 5 | 54.0% (spread 10.7) | 61.1% (20.4) | **82.1%** (22.1) |
| 10, stage 24 | 37.5% (10.2) | 45.2% (18.1) | **65.7%** (24.0) |
| 20, stage 30 | 59.3% (9.2) | 70.2% (14.2) | **86.6%** (14.8) |
| 30, stage 78 | 61.3% (8.9) | 66.4% (14.3) | **76.6%** (14.1) |

- A team with every skill mastered wins about **15 points more at level 30** and 27 more at level 20; the lift is largest where the skills
  are most of a hero's worth (levels 1 to 20) and smallest at 30, where the ultimate and the stats weigh more.
- The heroes spread apart as they level (the spread about 9 at Level 1, 14 at Level 5 from level 20): those whose steps compound most pull
  ahead: the Karasu Tengu (beyond +6 at every hero level), the Kunoichi and the Knight at 30; the Shambler, Warlock, Mercenary, Beastmaster,
  Lancer and High Priestess at the low levels.
- Level 5 takes about 175 waves of a skill (the design's pace), so these are the long game's numbers: a new save meets none of it, and the
  spire and Calamity are untouched. The design leaves the answer to batch 8 (the full rebalance, the armies' `start`, `DAILY_START`, the Stand's
  waves), which should be measured with mastered skills in its late cells.

## Tests

- `test/skill-levels.test.ts` (new): the levels and their words; a cast's points and the wave's 2 (a level-10 Knight: skill 3 shut earns
  nothing); a guest kind left out; auto-replay's half; the cap at 3,500 and each level told once; unknown keys and kinds not counted; a learned
  skill under its own key in either slot; each level's strength, cost and cooldown; the durations and Level 5 steps only while a skill is cast;
  Summon Beast's third wolf at Level 3 and dire wolf at 5; a Level 5 skill dealing more in the same seeded fights; the levels reaching the fight
  from the save but not through the spire's and Calamity's boost; the Last Stand's tally per wave; a practice replay counting nothing and a spire or Calamity fight counting into the lasting points; every skill's Level 5 step matching the
  probe; a save's nonsense dropped; a Level 1 boost leaving the fighter as before.
- **A Level 1 fight is unchanged:** `test/spells-identity.test.ts` and `test/ailments-identical.test.ts` pass with no fixture re-recorded (the
  identity scenarios field heroes with no skill levels: the slots, costs and cooldowns are the very kit objects of batch 4).
- `test/fight-hud.test.ts`: the rank line test moved with the owner-approved design (section 7): the skills' sheets list the five levels in
  its place; the ultimate keeps it.

## Checks

`npm run typecheck`; `npm test -- skill-levels identity ailments-identical fight-hud unit-info wave-card jrpg books skill3 skill-rules
summon-timers meta stand.test revive hero-kits`; `npm run web`; the full `npm test` (2,095 of 2,095); `node tools/skills/levelShots.mjs` (393x852: the
hero sheet's Skills tab, a skill's sheet in a fight, the wave card's line; no page error).

## The owner's answers (1 November 2026)

1. The skills with nothing that lasts keep "8% stronger again" as their Level 5 step.
2. Level 5's size is left to batch 8's rebalance.
3. Spire and Calamity fights **do** earn use toward the lasting levels (their heroes still fight at Level 1 there): built.
4. Practice replays (a daily or quest battle that pays nothing) do **not** count: built (`useShare`).

## The owner's later answer: the Last Stand and the Calamity count nothing

"Last Stand and Calamity actually shouldn't raise skill use. They're separate." `useShare` gives the Calamity 0, and the Last Stand's end card
no longer settles its tally (`standView.ts`; `run.use` is still kept on the run, unused). The spire still counts in full.

## The owner's final answer: army runs only

"Skill use should only come from the army runs." `useShare` counts an army run (or a run with no mode) in full, half under auto-replay, and
every other mode (the daily, quest battles, the spire, the Calamity, the Last Stand) not at all.
