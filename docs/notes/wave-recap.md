# The short wave card and the full end recap — WAVE-RECAP

Owner: Claude. Branch: `claude/wave-recap` (from main 0.220.0).

The owner's asks: "Let's do a shorter recap of a wave and keep most of the info for the end of the battle", then "Make the
between wave recap see through and have it show while the units travel to the next wave".

## Between waves: a short, see-through card over the march

A won wave of an army, a daily or an endless run with more to come no longer stops on a full report. The result card
(`#result`, class `short passing`) becomes a compact, translucent brass-rimmed panel high on the screen (84px below the top
inset, about 150 to 180px tall at 393x852), with the board and the marching party showing through and below it:

- the heading names the wave and how it went: "Wave 4 of 15 won" (`waveHeadline`, `src/sim/waveCard.ts`; "Stage 7 won" for an
  endless run);
- its pay in one line: "+36 gold · +15 crowns · 0:09" (with "a replay pays a share", "first clear!" when they apply);
- its stars as three gems in a row (each rule's words dropped; the stars' pay still flies to the purse);
- only the notable moments, one line each, when they happened (`waveNotes`, drawn by `src/waveCardView.ts`): levels gained
  ("Level up: Cleric Lv 2, Samurai Lv 2", bench heroes too), an ultimate unlocked, gear or prizes found (the run's `found`), the
  heroes that fell in a won wave ("Fell: Archer ×2"), and a heart burned ("A heart burned · 1 left");
- a boss wave's rift ores keep their small chip row.

No performance table, no XP cards, no joke and no button. The card needs no tap: `stepPassing` (main.ts) holds it while the
party marches (`body[data-move]`), a cinematic plays, the destination's camera journey runs or the home screen is up; then it
stays `PASS_AFTER_MARCH_MS` (1.4 s; `PASS_NO_MARCH_MS` 3.2 s when there is no march, as in the daily), fades over
`PASS_FADE_MS` and goes on to the next wave (`afterResult`, so an event card, gear and the bench work as before). A tap on the
card goes on at once. Reduced motion: no fade and no line animations.

A fall with a heart left still has no card (the heart burns and the fight resumes); the wave's card, once won, says the heart
burned. The last card of a battle (a loss with no heart left, or the army or daily cleared) is short too (its heading, the
existing one-line outcome, the run's stars, chest and ores) but stays a full-screen card with its button ("Run recap"), which
opens the full recap. The spire and the Calamity keep their full wave reports: their ends are the tower summaries, which do not
show the per-hero detail.

## The end recap keeps everything

`run.recap` (`src/sim/runRecap.ts`) gains two optional fields, so older saves load as they were:

- `waves?: WaveRow[]`: a line per wave fought (`wave`, `won`, `stars`, `ms`, `mvp`, `hearts`), added by `noteWave` as each
  wave settles; at most `RECAP_WAVES` (60), the latest kept;
- `found?: string[]`: the gear and prizes each wave found, at most `RECAP_FOUND` (40).

`heartsBurned(recap)` sums the rows' hearts. The recap view (`src/recapView.ts`) adds a "Hearts burned" figure when any burned,
a **Wave by wave** strip (each wave's number, stars or "Lost", time and its MVP's face) and a **Spoils found** list, beside the
company performance (damage, healing, kills, MVP), the XP and levels gained per hero, and gold, crowns and chests, which it
already totalled over the whole battle. Nothing in a fight changes: the notes are made from what the settlement already worked
out, and no stream is drawn.

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- battle-flow comeback heart-revive run-recap stars wave-recap`: 40 tests pass (`test/wave-recap.test.ts` is new:
  the wave lines, finds and hearts, the caps, a save round trip, the headline and the notes).
- Full `npm test`: 1423 tests, 0 failures.
- `tools/wave-recap/shots.mjs` (Chromium, the built game, a real Undead Legion run): wave 1 won with heroes down (the card over
  the march, checked as marching when it showed and at the screenshot; it left by itself), wave 2 lost with hearts (a heart
  burns, the fight resumes) then won (reduced motion; a tap on the card goes on), wave 3 lost with no hearts (the short defeat
  card, then the recap with its strip, five heroes' performance and five XP rows). At 393x852, 360x780 and 412x915; no page
  errors, no horizontal overflow. Screenshots `docs/samples/wave-recap-*.png`, results `wave-recap-checks.json`.
- `tools/battle-ui/report-shots.mjs`'s wave-victory step now waits for the card to pass by itself (it pressed Next and looked
  for the performance table, which the card no longer has). Its helper's browser paths do not exist in this environment, so it
  was not run.
