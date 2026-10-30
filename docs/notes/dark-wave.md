## Dark waves: night and rain lightened

The owner's report: "Some waves, the screen darkens for some reason, fix this".

**The cause.** Each wave is a new board, and each board rolls its own weather (`weatherOf(board)`, `src/sim/weather.ts`, from a
side stream of the board's seed). On an army's road about one wave in eight comes up `night` and one in eight `rain` (over all
nine armies and twenty seeds: 318 night and 318 rain waves out of 2,700). Night laid a flat deep blue (`0x0a1038`) at 0.36 alpha
over the whole screen (`weatherView.ts`, the tint sprite), board and backdrop alike, and rain a slate blue at 0.2. With nothing
else changing between waves, a run of clear waves followed by a night one read as the screen going dark for no reason.

Measured in the browser (the average luminance of the board's band of the screen, Orcs, seed 7919, at ×2, 393×852): wave 1
(clear) 114 to 120; wave 2 (night) 80 to 84 before, about 70% of the clear wave's light; 96 to 98 after, about 85%. The other
suspects were logged every half second through the fights (the ultimate and combo dim `fx.dimLayer`, the stage's and world's
alpha, every DOM layer over the board's middle): nothing was left on between waves or stacked. `fx.clear()` on every
`newBattle` resets the dim, and the dim only fades while the fight's clock runs.

**The fix** (`src/render/weatherRules.ts`, `src/render/weatherView.ts`):
- `MAX_TINT` 0.4 to 0.15: the board keeps at least 85% of its light under any weather (`boardLight(look)`).
  Night 0.36 to 0.14, rain 0.2 to 0.1, ash 0.12 to 0.08, embers 0.1 to 0.08 (snow, fog and leaves were already light).
- The mood moves to the edges: a new `vignette` on a `WeatherLook` (night 0.5, rain 0.25, ash 0.2; `MAX_VIGNETTE` 0.5), drawn
  as one sprite stretched over the screen, clear in an oval over the board (centred a little above the middle, where the board
  sits above the bench) and darkening to the corners in the tint's colour. It fades in with the tint (`vignetteAt`), is steady
  (no flashing), and stays under reduced motion like the tint.
- A small leftover found on the way: when the party falls with a heart left, the fight's clock is held through the burn, so an
  ultimate's dim from the fall stayed on over it. `fx.undim()` lifts it as the wave starts again (`main.ts`, `stepRevive`).

**Test:** `test/lands.test.ts`, "DARK-WAVE: no weather darkens the board much": every land's every weather keeps at least 85%
of the board's light, the edges are capped and fade in, and night still has a blue cast and dark edges.

**Shots:** `docs/samples/dark-wave-before-*.png` and `dark-wave-after-*.png` (the Orcs' night wave 2 in its fight, at 393×852,
360×780 and 412×915).
