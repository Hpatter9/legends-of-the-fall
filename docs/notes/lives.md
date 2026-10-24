# Lives: the retries shown as hearts

The owner's ask: two hearts at the top of army battles, the lives left for retries. Losing a wave spends one to try again,
with enough gold to buy one more hero. The rule was already there (`MAX_RETRIES` 2, `retryWave`, `retryGold` = the
current hire price in `src/sim/run.ts`; see `battle-flow.md`); this shows it.

- `#lives` in the top bar (`src/index.html`), beside the gold, drawn by `drawLives` in `src/main.ts` on each refresh
  (redrawn only when the count changes): `MAX_RETRIES` hearts, full for each retry left and grey once spent. Shown in every
  run that can retry (armies, the daily); hidden in the tower and the Calamity, which fail their own way.
- The heart: the DawnLike heart already used on the tower map (`src/art/rogue/heart.png`), at twice its size (32px,
  pixelated). The one just spent shrinks from 1.25x and fades to grey once (0.6 s, no flashing; none with reduced motion).
  Styles in `src/stone.css`.
- The defeat card now reads "Spend a heart to try again with +N gold, enough for one more hero, or give up", and its button
  "Use a heart · N left".

> Superseded: there is no "Give up" or "Use a heart" card any more; see `heart-revive.md`.
