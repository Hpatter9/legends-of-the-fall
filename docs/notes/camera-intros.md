# Fight camera, boss intros, skill labels

**Fight camera** (`src/render/cameraRules.ts`, `follow()` in `src/main.ts`). During a fight the camera frames the box round
the living fighters (padding for health bars and effects), zoomed in as far as it fits. The zoom is limited: out to the
whole board's width, in to 1.7x the layout's scale (never past 3x overall). A dead zone holds the view until the box's centre
moves 26 world px or the zoom changes 7%, and the camera eases (exponential, 420 ms for the move, 650 ms for the zoom) so
there are no jumps or jitter. A manual pan pauses the follow for 4 s. There is no pinch in the game. Deploy framing and the
end-of-fight return to the board's middle are unchanged. `clampCam` now allows for the zoom.

**Boss intro** (`startIntro`/`stepIntro` in `main.ts`, `#bossCard` in `index.html`, `bossTitles.ts`). About 2.4 s: the screen
dims, the boss's portrait (cropped from its sheet, scaled by a whole number, pixelated) slides in, its name slams down on the
pixel ribbon with a title line from `BOSS_TITLES`, and the camera glides to the boss and back. The slam rumbles (only with
screen shake on) and booms. A tap skips it. It plays once per stage and seed (`introduced`), so a restart of the same fight
(for instance after changing the pack) does not replay it. Reduced motion: a plain fade. The sim is untouched.

**Skill-name labels** (`label()` in `fx.ts`, `labelRules.ts`). Every floating label is lifted above any label still on screen,
fading ones included (`liftClear`), replacing the old count-based stacking. Labels stay inside the board's room below the top bar (`placeLabel`, the page sets `fx.view` each frame): they stack downward if there is no room above, and are pulled in from the screen's sides. At most three skill names show; a fourth fades the oldest out early (200 ms).

The boss portrait is about 48% of the width upright (up to 55% of the height sideways), a whole-number scale, and the ribbon name is larger and heavier.

Tests: `test/camera-intros.test.ts`. Samples: `docs/samples/camera-intros-*.png` (`tools/camera/shots.mjs`, before and after
the camera change, the intro sequence, a label case).
