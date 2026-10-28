# Duchess joins a fight (DUCHESS-FIGHTS): phase A proposal

The owner's ask, from the fix list: very rarely, **1 fight in 1000**, Duchess the court goat joins a fight on the player's side as a
**level-100 goat**: a real fighter, not a walker. A **short prompt** says so as it happens (whether she can be turned away is the
owner's call: question 1). A **cinematic plays the first time only**, and the scene for it already exists (`duchessInFight` in
`src/sim/sceneEvents.ts`, "Does she fight for your side, or does she seek union with our cause?").

Branch `claude/duchess-fights`, worktree `/home/user/duchess-fights`, from main 0.189.0. This is phase A: a working rough prototype,
the mock-ups and the questions. Nothing here is final until the owner answers.

## What the prototype does

- **The roll** (`src/sim/duchessFight.ts`, `duchessRolls`): a hash of the fight's own seed with her own salt (`DUCHESS_SALT`), true for
  one seed in `DUCHESS_ODDS` (1000). No stream of the fight is drawn from, so a fight without her plays exactly as before (tested),
  and a fight with her plays the same every time. A retried wave has the same seed, so she comes back on a retry of the wave she
  joined; a new run has a new seed.
- **Who asks for the roll**: `startStage(run, duchess = 'never')` takes a `DuchessWish` (`'roll' | 'always' | 'never'`). Only the
  page passes `'roll'`; the tests, the balance tools and the bots leave it `'never'`, so no balance measure moves. The fight carries
  `Battle.duchess = true` when she is due; `Stage.duchess` passes the wish to `startBattle`.
- **When she joins**: as the fight begins (`fight`, after the traits, combos and kits are set, so she changes none of them). She is
  added by `joinDuchess` and the page is told by a `{ kind: 'duchess' }` battle event.
- **Where she stands** (`duchessSpot`): the free deploy tile nearest the middle of the heroes placed (back row first on a tie), so she
  turns up among them. No room: she does not join.
- **Her stats**: `UNITS.duchess` (hp 220, atk 20, def 6, melee, step 520 ms, blow 900 ms, `jump` 4: goats climb), then a level-100
  hero's lasting gains (`lastingBoost(100)`: hp x7.9, attack x6.7), and the castle's hero boost like any hero. She fights at
  1,852 hp and about 133 attack with no castle. She is a `summon` unit: never one of the placed heroes, so she does not count for
  traits, combos, the hero bar, XP, the "No one fell" star or the win (the fight is lost when the heroes fall, even with her
  standing). A heart's revive does not raise her.
- **Her kit** (`DUCHESS_KIT`, the old charge-meter kind the foes and called-up fighters use, set on her unit as `Unit.kit`, so the
  heroes' kit table is untouched):
  - **Headbutt** (skill): the strongest foe beside her takes x1.6, is knocked back two tiles (unless it cannot be moved) and dazed 1 s.
  - **Nom** (ultimate, "eats something she shouldn't"): a foe beside her loses its shield (she has eaten it), is struck and dazed 2 s,
    and she mends a quarter of her health.
  - **Sure-footed** (passive): climbs at no extra cost and cannot be knocked back.
  - No bleat in her kit: the tap's "Lucky Bleat" is the other AI's, and the name stays theirs.
- **Her look in the fight**: a new sheet, `src/art/units/duchess_goat.png`, cut by `tools/duchess/compose-duchess.py` from the same
  white goat in whtdragon's MV animals pack (`animals/goats.png`, right-facing row) her walking sheet comes from, the way the
  Beastmaster's wolves were made: a step cycle, a headbutt (she rears back, drops her head and lunges: the stride frames tilted about
  her hooves), a chewing idle, a brightened knock-back for hurt, and rolled onto her back for dead. The pack has only walking frames,
  so these poses are the pack's frames moved and turned, not new art. **No PixelLab generation is needed**; if the owner wants a true
  headbutt pose, two generations (a lunge and a hurt flinch at 48 px, white goat, right-facing) would cover it.
- **The prompt** (`src/duchessFightView.ts`): a gold-edged card just above the panel with her portrait (her own sheet), "Duchess joins
  the fight!", "Her Grace the court goat · Level 100" and "Mehh.". It goes by itself after about 3 s. The prototype also has the
  other shape, for question 1: "Duchess wanders onto the field" while the heroes are placed, with **Let her fight** and **Not
  today** (`declineDuchess`, only before the fight begins).
- **The cinematic**: the existing `duchessInFight` scene, queued on her `duchess` event; the card follows once it ends. The scene is
  unchanged (mock-up shows its second shot).
- **The page goat**: in a fight she fights in, she does not also watch from the page's edge (`PageGoat.stayAway`).
- **Testing**: `?duchess=1` on the page always brings her (`?duchess=ask` shows the ask shape, `?duchess=0` never). The tests use
  `{ duchess: 'always' }`.

## How strong a level-100 goat is (`tools/duchess/swing.ts`)

Level-1 heroes (the five old ones, placed by the test helper), Normal tier, 20 seeds, wins without her -> with her:

| Army | Wave 1 | Wave 5 | Last wave |
| --- | --- | --- | --- |
| Orcs | 20 -> 20 | 20 -> 20 | 0 -> 14 |
| Undead | 9 -> 20 | 3 -> 20 | 0 -> 0 |
| Beasts | 5 -> 20 | 0 -> 20 | 0 -> 4 |
| Wildwood | 0 -> 20 | 0 -> 14 | 0 -> 0 |
| Labyrinth | 0 -> 20 | 0 -> 19 | 0 -> 0 |
| Ogres | 0 -> 20 | 0 -> 15 | 0 -> 0 |
| Infernal | 0 -> 19 | 0 -> 11 | 0 -> 0 |
| Yokai | 0 -> 18 | 0 -> 12 | 0 -> 0 |
| Golems | 0 -> 20 | 0 -> 9 | 0 -> 0 |

Taken literally, a level-100 goat wins most early and middle waves on her own for a young party, and is a big help, not a sure
win, against a last boss. At one fight in a thousand that is a treat, not a balance problem (question 3).

## Proposed rules still to build (phase B)

- **Modes**: every mode with a party: the armies (every tier), the daily (its practice too; there is no leaderboard, and every
  player's daily has the same seed, so a "Duchess day" is the same for all), the old spire runs and the Calamity. **Not the Last
  Stand**: its fights are the king's, made in `stand.ts` without a run stage, and its eight heroes guard posts. Auto-replay rolls as
  well; the cinematic waits for a fight played by hand (cinematics never play in auto-replay).
- **After the fight**: she leaves. She is in one fight only; the next wave rolls for itself. Nothing of her is saved in the run.
- **Stars**: unchanged (she is not a hero, so her fall costs no star). **XP**: none (she is level 100 already).
- **Achievement** (proposal): **Her Grace's Favour**, "Win a fight with Duchess on the field", 20 crowns and the usual 2 stones. It
  reads the finished fight (`checkAchievements`), so it needs no save field.
- **Her voice** (`docs/lines/new-lines.json`, `quipData.ts`): new kinds in `DUCHESS_LINES`, only "Mehh." and "Nom." in variations (the
  existing parenthetical asides kept as the house style): `joins` ("Mehh.", "Mehh. (Make way.)"), `headbutt` ("MEHH!", "Mehh! (Out of
  my meadow.)"), `nom` ("Nom.", "Nom nom. (Shield-flavoured.)"), `won` ("Mehh. (Naturally.)"). Said in a bubble over her on the board.
- **Her name plate**: her health bar over her as any fighter; the tap card on her reads "Duchess · Level 100" with her kit's three lines.
- **The cinematic's key**: the scene now plays the first time she *visits* a fight's edge (`PageGoat.onArrive`), one fight in four or
  five, so most saves have seen it. Proposal: move it to her first real fight, with a moment of its own (`duchessFights`), so every
  save sees it once when it matters; her edge visits then have no cinematic (question 2).
- **The test**: `test/duchess-fights.test.ts` (six tests, passing): the odds near 1 in 1000 and stable per seed; joining at level 100
  among the heroes and not counted as placed; a fight without her unchanged; a fight with her the same every time, no XP, no star
  lost; "Not today" only before the fight; a run's stage rolls only when the page asks.

## Files

New: `src/sim/duchessFight.ts`, `src/duchessFightView.ts`, `src/art/units/duchess_goat.png`, `tools/duchess/compose-duchess.py`,
`tools/duchess/swing.ts`, `tools/duchess/mock.mjs`, `test/duchess-fights.test.ts`. Small hooks: `src/sim/battle.ts` (`Stage.duchess`,
`Battle.duchess`, the `duchess` event, one line each in `startBattle` and `fight`), `src/sim/run.ts` (`startStage`'s second
argument), `src/sim/units.ts` (`UNITS.duchess`), `src/render/sheets.ts` (her sheet), `src/art/units/sheets.json`, `src/duchess.ts`
(`stayAway`), `src/main.ts` (the wish, the card, the scene). Phase B adds `achievements.ts`, `quipData.ts`, `sceneEvents.ts`/
`sceneKit.ts`/`sceneRules.ts` (if the scene moves) and `CREDITS.md` (her fighting sheet under Duchess's entry).

**Save fields**: none. The achievement and the scene's seen-mark use the lists that exist.

## How it sits with the other AI's Duchess work

The other AI builds her tap "Lucky Bleat", her trinkets and her hats. This work keeps to her fighting: one sim file, one view file,
her own unit id (`duchess`) and sheet (`duchess_goat`). It does not touch her tap, `render/duchessRules.ts` or the camp. The one
shared file is `src/duchess.ts`, where it adds a four-line `stayAway` method. If hats come to the fight, they would sit on the
`duchess_goat` sprite in `unitView.ts`, where this work changes nothing.

## Risks

- A level-100 goat decides most fights she joins (the table): the owner may want her scaled (question 3).
- The daily's seed is shared, so on a "Duchess day" every player's same wave has her.
- Her poses are the pack's walking frames moved and turned; at the board's size this reads as a headbutt, close up it is plainly a
  tilted stride.
- whtdragon's pack folder has no licence file (the same note as her existing sheets in `CREDITS.md`).

## Questions for the owner (with my recommendation)

1. **Can she be turned away?** Recommend **no**: she simply joins with the card ("Duchess joins the fight!"), as a gift; a choice
   at one fight in a thousand adds a button nobody needs. (The "ask" shape is built and shown in case you prefer it.)
2. **The cinematic**: the scene now plays the first time she wanders to a fight's edge, which most saves have seen. Recommend moving
   it to **her first real fight** (so everyone sees it once), and her edge visits get none.
3. **How strong**: recommend **a true level 100**, whatever the party's level (it is the joke, and it is rare). The other choice: her
   party's highest level plus 20.
4. **Modes**: recommend **every mode with a party, not the Last Stand** (auto-replay included, no cinematic there).
5. **Achievement**: recommend **Her Grace's Favour** (win a fight with her on the field; 20 crowns, 2 stones). Hidden until earned?
   Recommend shown, as a hint that she exists.
6. **Art**: recommend **the pack's frames as built** (no PixelLab). If you want a true headbutt pose, two PixelLab generations.

## Checks run (phase A)

See the task board row and the handoff report.

Mock-ups (labelled MOCK-UP, real in-game captures at 393x852): `docs/samples/duchess-fights-mock-ask.png` (the ask shape, while
placing), `-cinematic.png` (the existing scene's second shot), `-join.png` (the join card as the fight begins), `-fight.png`
(her in the fight), `-close.png` (a 3x close-up of her among the heroes), and the contact sheet `duchess-fights-mock-sheet.png`.
