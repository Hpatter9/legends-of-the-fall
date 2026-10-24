# Heart revive (no give-up)

## What was wrong

On a lost wave with hearts left, the card showed "Use a heart" and "Give up". Give up did nothing: its handler cleared
`pendingLoss` and called `refresh()`, and `refresh()` set `pendingLoss` straight back to true because the loss was not
settled and `canRetry(run)` was still true. So the card stayed, the run never ended, and the recap never opened
(reproduced in the browser: after the click `pendingLoss` was true again, the run not over, the button still "Give up").

## The flow now

When the party falls and a heart is left (`fallOutcome(run) === 'heart'`, in `src/sim/run.ts`), there is no card and no button:

1. The last full heart in the top bar burns: the `flame_fire` strip plays once over it while the heart blackens (`src/reviveView.ts`).
2. A line says "A heart burns. The party rises." (a plate that takes no taps; fades in and out once).
3. Half-way (1.1 s) the heart is spent (`retryWave`: the retry's gold, one hire's worth, into the pocket for after the wave) and the
   wave is set out again with the same squad on the same tiles, the heroes glowing in the promotion's light pillar. No deploy
   screen waits: half a second later the fight starts by itself (no Fight! tap, and the deploy tutorial is held back while it
   happens). About 2 s in all.
4. A tap anywhere skips ahead: the first to the wave set out, the next to its fight starting; the line goes with it.

With `prefers-reduced-motion` the flame is left out, the heart just fades, and the whole moment is 1.2 s. The Settings have
no reduce-motion switch of their own. The effect is one-shot throughout; nothing loops or flashes.

With no heart left, or in a mode with none, the loss is settled as before: "Defeat" card, "Run recap", the recap's
"Continue", then home. All three work (checked at 393x852).

## Which modes

- Armies and the daily lose hearts (`MAX_RETRIES` = 2 each); the daily's "No heart spent" star is unchanged.
- The tower and the Calamity have no hearts (`canRetry` is false for any run with `tower`), so they fail their own way.
- An auto-replay revives the same way (the replay's own tick starts the fight); only with no heart left does it stop, as a loss.

## Code

- `src/sim/run.ts`: `fallOutcome`; `canRetry` / `retryWave` unchanged. Tests: `test/heart-revive.test.ts`.
- `src/main.ts`: `beginRevive`, `stepRevive`, `skipRevive`; the Retry button and `pendingLoss` are gone.
- `src/tips.ts`: the tip no longer says "give up".
- Screenshots: `docs/samples/heart-revive-{burn,line,rising,fighting}-{393x852,360x780,412x915}.png (a real losing fight, played in the browser)`, the final screen
  `heart-revive-final-393x852.png` and `heart-revive-final-recap-393x852.png`, and the frame strip `heart-revive-burn-strip.png`.
