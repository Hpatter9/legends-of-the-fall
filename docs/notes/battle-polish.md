# BATTLE-POLISH: five fixes the owner asked for

Branch `claude/battle-polish` (from main 0.440.0). One commit per change, in the owner's order. Before and after shots at 393x852, 360x780
and 412x915 are in `docs/samples/battle-polish/` (`tools/battle-polish/shots.mjs`; the "before" shots come from a build of main).

## 1. Ultimates fired by hand take about 3 s and land heavier

The full moment plays only when the player fires an ultimate by hand: Auto off and the full-scene setting on (`fullScene`). Auto's quick
banner is unchanged.

| Part | Before (ULT-EPIC) | Now |
| --- | --- | --- |
| Opening (the band, the name, the power gathering, the battle held) | 1150 ms | 1450 ms |
| Freeze on the blow (`HIT_STOP_MS`) | 150 ms | 240 ms |
| Slow-motion beat after the freeze (`SLOW_MS`, at `SLOW_RATE` 0.3) | none | 500 ms, inside the impact |
| Impact (an instant ultimate's effects on the held board) | 700 ms | 650 ms |
| Fade (the dim lifts, the camera eases back) | 450 ms | 650 ms |
| **Whole moment, an instant ultimate** | **2.45 s** | **2.99 s** |
| The flash on the blow (`.umFlash`) | 0.55 s | 0.8 s |
| The camera's lean on the caster | 1.3x, at once | builds through the opening to 1.4x (`ultLean`) |

- **Build-up**: the opening is longer, and the camera creeps in as the power gathers (a smoothstep from a little lean to the full 1.4x by
  four fifths of the opening), so the build is felt before the blow.
- **Landing**: a longer freeze, then a slow-motion beat. Through it the effects (the fight's and the moment's own) run at 0.3 speed, and a
  lingering or delayed ultimate's live battle does too (`UltQueue.rate`, used by `main.ts` and `standView.ts`).
- **Easing back**: the fade is longer and the follow camera takes the board back.
- **Speed**: the fight runs at x1 through the whole moment, whatever speed is set (`momentSpeed`). The fight's own effects now step at x1
  through it too (they stepped at the set speed before), and the set speed comes back when the moment ends.
- **A tap** still skips the moment, and drops the freeze and the slow beat.
- **Reduced motion and shake off** (`calm`): no freeze, no slow beat, no lean, as before. **Battery saver**: unchanged (fewer bursts).
- Files: `src/ultMomentRules.ts` (`SLOW_MS`, `SLOW_RATE`, `slowLeft`, `rate`, `openT`), `src/ultEpicRules.ts` (`HIT_STOP_MS`, `ZOOM`,
  `ultLean`), `src/ultMoment.ts`, `src/main.ts`, `src/standView.ts`, `src/fightHud.css`. Tests: `test/ult-moment.test.ts` (the whole moment
  is about 3 s, stepped frame by frame), `test/ult-epic.test.ts` (the slow beat, skipped by a tap, none when calm; the lean builds).
  `test/ult-show.test.ts` still passes: every showcase stays within 4 to 6 s with the longer opening and fade.
- Shots: `ult-samurai-{before,after}-393.png`, `ult-wizard-{before,after}-393.png` (frames across the moment).

## 2. Auto spells and Auto ultimates are two buttons

- Two painted buttons at the end of the spell orbs' row on the fight HUD (`FightHud.spellAutoEl`, `FightHud.autoEl`, placed together as
  `FightHud.autosEl`). **Auto spells** uses the painted `autocast` / `autocast-lit` medallion. **Auto ultimates** uses the painted
  `ultimate` medallion, dimmed while off and lit with a gold glow while on. Each has a small word under it (SPELL, ULT) so they read apart.
- Each has its own saved setting: `Meta.ultAuto` (the ultimates, the old key) and the new `Meta.spellAuto` (the spells). A save from the
  one-switch days has only `ultAuto`. `spellAutoSaved` reads `spellAuto ?? ultAuto`, so an old save with Auto on starts with both on. The
  first time either button is flipped, the spells' setting is written down as it read, so the two are separate from then on.
- **The unlock rules**: on main the one switch had no unlock rule (it showed in every fight). Auto ultimates still always shows. Auto
  spells shows only while the ruler has spells equipped (the same rule that shows the spell orbs). I asked the director to confirm this.
- Every mode with the toggle: army runs, the daily and the Calamity (all through `main.ts`), and the Last Stand (`standView.ts`).
  Auto-replay turns both on for its fights, as it did the one. **The Assault** has no such toggle: its Auto button (`assaultScene.ts`)
  hands the platoons to the plan, a different thing, so it is unchanged.
- **A full row**: with four spells and the War Horn on a 360-wide phone the row has no room for both buttons. The pair then wraps onto a line
  of its own under the orbs, and the boss's bar follows the row's real bottom (`placeTopHud`).
- Art: a painted off and lit pair for Auto ultimates would match the spells' button. Its prompt is in
  [battle-polish-art-prompts.md](battle-polish-art-prompts.md); the CSS stand-in is used until it lands.
- Files: `src/fightHud.ts`, `src/main.ts`, `src/standView.ts`, `src/sim/autoCast.ts` (`spellAutoSaved`), `src/sim/meta.ts`,
  `src/paintedButtons.css`, `src/fightHud.css`, `src/tips.ts`. Test: `test/auto-cast.test.ts`.
- Shots: `hud-{before,after}-{360,393,412}.png`, `hud-on-after-412.png` (both lit).

## 3. Shorter hero cards on the bench

- The rune bench sits beside the hero bench on one track (RUNE-BENCH), and its side (title row, two rows of four tiles, the hint: about
  170 px) set the bench's height. The hero cards stretched to match, leaving an empty brown panel under each.
- Now the rune side takes the hero side's height (`contain: size`) and fits into it: its eight tiles in one row, 40 px tall, and the hint on
  one line. The hero cards are cut to their content: **94 px at 393 wide, was 170**, so the board gets 76 px back.
- The pull bar (`#benchGrip`) stays centred on the shorter bench (90 px tall, 2 px inside it at each end) at all three sizes.
- The rune names on the narrower tiles are clipped ("Bulwa…") at 360 wide. A hold still shows the rune's card with its full name.
- File: `src/runeBench.css` (the end). Shots: `bench-{before,after}-{360,393,412}.png`, `bench-runes-after-{360,393,412}.png` (with runes in
  the bag), `bench-runes-before-393.png`.

## 4. The camera follows the fighting

- Pure rules in `src/render/followCamRules.ts`, tested in `test/follow-cam.test.ts`:
  - **Heat** (`heatOf`): 0.35 for being alive, 3 in a fight (a foe within 2 tiles, `engagedAt`), plus up to 2 for a blow struck or taken in
    the last 1.2 s, plus up to 6 for an ultimate cast in the last 2.5 s (each fading straight down).
  - **The frame** (`followFrame`, `followView`): the fighters in combat (or everyone, while nobody is), their heat-weighted middle, and the
    box round them made even about that middle. The camera looks at the middle and zooms out as far as the box needs, between the usual
    limits, so every active fight stays in view however far the middle leans. The dead zone (`settle`) is as before.
  - **The manual hold** (`manualHeld`, `returnEase`): in a fight, a pan or a pinch keeps the camera where the player put it while a finger is
    down and for **4 s after the last touch**. Then the follow takes it back, gliding more slowly than usual (1.1 s moves, 1.3 s zoom) for
    1.6 s. Before, a moved camera stayed the player's until the next wave. In a deploy a moved camera is still the player's until the
    fight starts (DEPLOY-ZOOM).
- `main.ts` records each fighter's last blow and last ultimate from the tick's events (`noteHeat`). It buckets the fighters by tile so a
  crowded field costs little, and feeds the rules each frame (`follow`). The Last Stand keeps its own camera (`standCam.ts`), unchanged.
- Checked in the game at 393x852: the view frames the clash. After a drag, the camera stayed put at 2.5 s, was let go by 4.5 s and was back
  on the fight by 6 s.

## 5. The Summoning tab's collection

- **What it was**: every hero (about 70) with a 72 px portrait and its shard or rank bar, open whenever the screen opened. It answers "who
  do I have, and how far along is each". The Heroes tab has the full roster too.
- **Now** (the director's call): the collection starts closed, in a denser grid of 48 px portraits (5 across at 360, 6 at 393 and 412).
  Above it, a short row, **Nearest to joining**, shows the heroes you have begun collecting, the nearest to joining first, up to five, each
  with its shard bar (`nearestBegun` in `src/sim/unlock.ts`; its first is the hero the line above names). The row hides while none is
  begun.
- Files: `src/gacha.ts`, `src/index.html` (`#nearRow`, the grid), `src/ornateMenus.css`, `src/sim/unlock.ts`. Test:
  `test/hero-shards.test.ts`.
- Shots: `summon-{before,after}-{360,393,412}.png` (closed) and `summon-open-{before,after}-{360,393,412}.png`.

## Checks run

- `npm run typecheck`: clean.
- `npm test -- ult` (224 pass), `auto-cast fight-hud hero-kits-saves tips ui-standard hud-faces` (39 pass), `follow-cam fight-cam camera`
  (21 pass), `ui-standard hero-shards summon gacha` (66 pass). None failed.
- `npm run web`: builds.
- Screens checked in Chromium at 393x852, 360x780 and 412x915 (the shots above). Also the spell row at 360 with four spells and the War
  Horn (the Auto pair wraps), and the rune side with seven runes in the bag. No page errors.
