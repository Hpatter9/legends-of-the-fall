# Duchess joins a fight (DUCHESS-FIGHTS)

The owner's ask, from the fix list: very rarely, **1 fight in 1000**, Duchess the court goat joins a fight on the player's side as a
**level-100 goat**: a real fighter, not a walker. A short card says so as it happens, and a cinematic plays the first time only.
Branch `claude/duchess-fights`, worktree `/home/user/duchess-fights` (main 0.190.0 merged in).

The owner's answers to phase A: she cannot be turned away (the card just says she joins); the cinematic moves to her first real fight,
under a trigger of its own, so every save sees it once; a true level 100 whatever the party's level; the armies, the daily (and its
practice), the old tower runs and the Calamity, not the Last Stand, and in auto-replay she joins without the cinematic; the achievement
Her Grace's Favour (20 crowns, 2 stones, shown); PixelLab for her missing poses, four generations at most.

## The rules (`src/sim/duchessFight.ts`)

- **The roll** (`duchessRolls`): a hash of the fight's own seed with her own salt (`DUCHESS_SALT`), true for one seed in
  `DUCHESS_ODDS` (1000). No stream of the fight is drawn from, so a fight without her plays exactly as before, and a fight with her
  plays the same every time. A retried wave has the same seed, so she comes back on a retry of the wave she joined.
- **Who asks**: `startStage(run, duchess = 'never')` takes a `DuchessWish` (`'roll' | 'always' | 'never'`); only the page passes
  `'roll'` (auto-replay too), so the tests, the balance tools and the bots never meet her. `duchessModeOk` lets her into the armies,
  the daily, the old tower runs, the Calamity and the old free run; the Last Stand makes its fights itself (`stand.ts`) and never asks.
  `Stage.duchess` carries the wish to `startBattle`, which sets `Battle.duchess` when she is due.
- **Joining**: `fight` calls `joinDuchess` after the traits, combos and kits are set, so she changes none of them. She stands on the
  free deploy tile nearest the middle of the heroes placed (`duchessSpot`); with no room she does not come. The page hears of it by a
  `{ kind: 'duchess' }` battle event.
- **Her stats**: `UNITS.duchess` (hp 220, atk 20, def 6, melee, step 520 ms, blow 900 ms, `jump` 4, `scale` 0.66), then a level-100
  hero's lasting gains (`lastingBoost(DUCHESS_LEVEL)`: hp x7.9, attack x6.7) and the castle's hero boost: 1,852 hp and about 133
  attack with no castle. She is a `summon` unit, so she is never one of the placed heroes: no traits, combos, hero bar tile, XP or
  "No one fell" star, and the fight is won or lost by the heroes. A heart's revive does not raise her.
- **Her kit** (`DUCHESS_KIT`, the charge-meter kind the foes and called-up fighters use, put on her unit as `Unit.kit`, so the
  heroes' kit table is untouched): **Headbutt** (the strongest foe beside her takes x1.6, is knocked back two tiles unless it cannot be
  moved, and is dazed 1 s), **Nom** (her ultimate: a foe beside her loses its shield, is struck and dazed 2 s, and she mends a quarter
  of her health) and **Sure-footed** (climbs at no extra cost, cannot be knocked back).
- **After the fight** she is gone: one fight only, and the next wave rolls for itself. Nothing of her is saved in the run.

How much she swings a fight (`tools/duchess/swing.ts`, level-1 heroes on Normal, 20 seeds): most first and fifth waves turn to
wins on her own (Undead wave 5: 3 -> 20 of 20); against a last boss she is a help, not a sure win (Orcs 0 -> 14, Undead 0 -> 0).

## The cinematic

The scene (`sceneEvents.ts`) is now `duchessJoins` on the moment `{ kind: 'duchessJoins' }` (it was `duchessInFight` on `duchess`,
played on her first visit to a fight's edge). The new id means a save that saw the old one still sees it once, when she first really
fights. Her edge visits play nothing now (`main.ts` no longer sets `PageGoat.onArrive`; the hook itself stays in `duchess.ts`). The
page queues it on her event; cinematics never play in an auto-replay, and it is not marked seen there, so it waits for a fight
played by hand. The scene's lines are unchanged; `docs/lines/new-lines.json` has its key renamed.

## The page

- **The card** (`src/duchessFightView.ts`): a gold-edged card just above the panel with her portrait from her own sheet, "Duchess
  joins the fight!", "Her Grace the court goat · Level 100" and one of her `joins` lines. It comes once the cinematic (if any) is over
  and goes by itself after `CARD_MS` (3.4 s). It takes no taps. While it is up the speech bubbles keep quiet (`body.dfUp`), so no
  bubble lies over it.
- **Her bubbles** (`duchessFightSays`): over her on the board on a Headbutt or a Nom (at most one every 4 s) and on a won fight with
  her standing; the "Hero quips" setting silences them as it does the rest.
- **Her lines** (`src/duchessFightLines.ts`, the writer's copy `duchess_fights` in `docs/lines/new-lines.json`): only "Mehh." and
  "Nom." in their variations, with the house's asides: `joins`, `headbutt`, `nom`, `won`, five each.
- **The page goat** stays away from a fight she fights in (`PageGoat.stayAway`).
- **Testing**: `?duchess=1` on the page always brings her, `?duchess=0` never. The "ask" shape of the card from phase A is gone,
  with `declineDuchess`.

## Her art (`src/art/units/duchess_goat.png`, `tools/duchess/`)

`compose-duchess.py` builds the sheet on a 64-pixel canvas, scaled 2x (128-pixel cells): walk and idle are the pack's white goat
(whtdragon's MV animals, `animals/goats.png`, the right-facing row, the same goat as `src/art/duchess/goat.png`); her **headbutt** and
**fall** are PixelLab clips (`gen.py`, `/animate-with-text-v3` from her own standing frame, so size, palette and angle match), native
pixels with hard alpha. PixelLab's hurt take drew a lightning flash over her head, so her hurt stays the pack's standing frame
brightened and knocked back. Four generations spent (20.75 before, 16.75 after): two headbutt takes (the second, seed 11, used),
the hurt take (unused) and the fall (its last three frames). The takes are kept in `tools/duchess/generated/`. Sheet:
`docs/samples/duchess-fights-sheet.png`.

## Her Grace's Favour (`achievements.ts`)

"Win a fight with Duchess on the field": 20 crowns and the usual 2 stones, shown in the list like the rest, with its aside in
`AWARD_JOKES` (`quipData.ts`, and `award_jokes` in `new-lines.json`). It reads the finished fight, so it needs no save field.

## Files

New: `src/sim/duchessFight.ts`, `src/duchessFightView.ts`, `src/duchessFightLines.ts`, `src/art/units/duchess_goat.png`,
`tools/duchess/` (`compose-duchess.py`, `gen.py`, `generated/`, `swing.ts`, `shots.mjs`), `test/duchess-fights.test.ts`. Hooks:
`src/sim/battle.ts` (`Stage.duchess`, `Battle.duchess`, the `duchess` event, a line each in `startBattle` and `fight`), `src/sim/run.ts`
(`startStage`'s wish), `src/sim/units.ts` (`UNITS.duchess`), `src/sim/achievements.ts`, `src/sim/sceneEvents.ts`, `sceneKit.ts`,
`sceneRules.ts`, `sceneScripts.ts` (the scene's id and moment), `src/render/sheets.ts`, `src/art/units/sheets.json`, `src/duchess.ts`
(`stayAway` only), `src/main.ts`, `docs/lines/new-lines.json`, `test/cinematics.test.ts` (the firsts list names the new moment),
`tools/cinematics/flow5.mjs`, `CREDITS.md`. **Save fields**: none.

The other AI's Duchess work (her tap's Lucky Bleat, trinkets, hats) is not touched: her fighting lives in its own files, under its
own unit id (`duchess`) and sheet (`duchess_goat`); the one shared file, `src/duchess.ts`, gains only `stayAway`.

## Tests (`test/duchess-fights.test.ts`)

The odds near 1 in 1000 and fixed per seed; joining at level 100 among the heroes, not counted as placed, told to the page, only
once; a fight without her unchanged; a fight with her the same every time, no XP, no star lost; a run rolls only when the page asks;
never in the Last Stand; the headbutt and Nom; the cinematic due once, also for a save that saw the old scene; the achievement; her
lines match the writer's copy and are only "Mehh." and "Nom.".

## Checks

Typecheck; `npm test -- duchess-fights achievements new-lines scene cinemat quips`; the full `npm test` (1287 of 1287); `npm run web`;
`tools/duchess/shots.mjs` at 393x852, 360x780 and 412x915 with no page errors or sideways overflow. Screens: `docs/samples/duchess-fights-{cinematic,card,fight,close}-{393,360,412}.png` and the sheet
`docs/samples/duchess-fights-sheet.png`.

## Limits

- At one fight in a thousand she decides most fights she joins (the owner's call: a true level 100).
- The daily's seed is shared, so on a "Duchess day" every player's same wave has her.
- whtdragon's pack folder has no licence file (the same note as her other sheets in `CREDITS.md`).
