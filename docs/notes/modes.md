# Modes and achievements

Three things reached from the home screen, beside an ordinary run.

- **Daily challenge** (`src/sim/modes.ts`, `dailyRun`, `startDaily`): one run per date (yyyymmdd from the phone's
  calendar, passed in as a number). The seed comes from the date, the squad is the starting five at grade 1, the gold is
  the starting gold, no castle upgrades, and one land for the whole day (`dailyArea`). It is played until defeat. Score =
  stages cleared x 100 + stars x 10 (`dailyScore`; stars come from `Run.stars`, kept by `finish`). The first play of a
  date counts; a replay is practice (`RunMode.practice`) and does not change the day's best. `Meta.daily` keeps each
  date's best and plays. Continue resumes today's run if it is still going.
- **Endless tower** (`towerRun`; now a roguelike map, see `rogue-tower.md`; the paragraph below is how it began): opens once a run has fought stage 10 (`Meta.bestStage`, from `run.best`). It is an
  ordinary run with `mode: { kind: 'tower' }`: the unlocked heroes at their lasting levels, the castle, gold and
  summons, the same stage scaling and bands (`stageBoost`, `bandFor`, bosses every 5th floor), and no events (`finish`
  skips the event card). `Meta.tower` keeps the floors cleared (the stage it is on, less one).
- **Achievements** (`src/sim/achievements.ts`): 18 rules, each with crowns paid the first time. `checkAchievements` reads
  the fight's `Battle`, the run and the meta, and records the ids in `Meta.achievements`. `settleRun` (in `modes.ts`)
  keeps the lasting records first (furthest stage, tower floors, a boss band beaten in `Meta.bosses`, a daily score) and
  then checks. It runs after each settled fight, and after a recruiting pull (the run alone). A new one shows a toast.
- **Pages**: the Daily and Tower buttons on the home menu (`src/home.ts`; the labels come from `dailyLine`/`towerLine`,
  the tower is disabled until it opens); the Achievements page (`src/achievementsView.ts`, with a bar for the ones that
  count up). `src/modes.ts` holds the page's date and clock seed.
- **Saves**: `Meta` gains `bestStage`, `tower`, `daily`, `bosses`, `achievements`; `loadMeta` defaults them, so old saves
  load. `Run` gains `mode`, `area` and `stars`, all optional.
- Tests: `test/modes.test.ts`, `test/achievements.test.ts`.
