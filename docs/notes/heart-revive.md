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
3. Half-way (1.1 s) the heart is spent (`retryWave`: the retry's gold, one hire's worth), the wave starts again on its own,
   and the heroes rise in the promotion's light pillar. About 2 s in all.
4. A tap anywhere skips ahead to step 3 (a tap after it sends the line away).

With `prefers-reduced-motion` the flame is left out, the heart just fades, and the whole moment is 1.2 s. The Settings have
no reduce-motion switch of their own. The effect is one-shot throughout; nothing loops or flashes.

With no heart left, or in a mode with none, the loss is settled as before: "Defeat" card, "Run recap", the recap's
"Continue", then home. All three work (checked at 393x852).

## Which modes

- Armies and the daily lose hearts (`MAX_RETRIES` = 2 each); the daily's "No heart spent" star is unchanged.
- The tower and the Calamity have no hearts (`canRetry` is false for any run with `tower`), so they fail their own way.
- An auto-replay never revives: it settles the loss as before.

## Code

- `src/sim/run.ts`: `fallOutcome`; `canRetry` / `retryWave` unchanged. Tests: `test/heart-revive.test.ts`.
- `src/main.ts`: `beginRevive`, `stepRevive`, `skipRevive`; the Retry button and `pendingLoss` are gone.
- `src/tips.ts`: the tip no longer says "give up".
- Screenshots: `docs/samples/heart-revive-{burn,line,risen}-{393x852,360x780,412x915}.png`, the final screen
  `heart-revive-final-393x852.png` and `heart-revive-final-recap-393x852.png`, and the frame strip `heart-revive-burn-strip.png`.
