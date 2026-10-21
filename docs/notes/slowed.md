# Slowed, and the level-up pillar

Two small pieces from the effects pass.

- **Slowed** (the sim): Frost Nova's slow is the `slowUntil` status in `src/sim/battle.ts`. `isSlowed` (in
  `src/sim/spells.ts`) reads it, and `speedOf` multiplies by `SLOW_MULT` (0.5) for as long as it holds, so a slowed foe
  walks and swings at half speed (`stepTo` and `swing` both use `speedOf`). Frost Nova still freezes for 2s first, then
  slows to 6s. The multiplier stays at 0.5 (not 0.6) so the foes' pace and the balance don't move.
- **Showing it** (`src/render/unitView.ts`, `src/render/fx.ts`): the body is tinted frosty blue; the status icon over
  the shoulder is the snowflake (`VFX.statusIce`), after burning, bleeding, charmed and hasted; and ice puffs drift up
  off the fighter while it lasts (a 30% chance a tick, through the particle budget).
- **Level-up pillar** (`src/main.ts`, `showXp`): at the moment a hero kind reaches a new level (the chime plays), its
  XP row gets a light pillar (`pillar_light.png`, six 32px frames scaled to 120px, rising and fading in CSS, in
  `src/index.html`). Every hero on the board of that kind gets `UnitSprite.evolve()`, the same light pillar and burst the
  evolve uses. A kind not on the board has no sprite, so only the row shows it.
- Tests: `test/spells.test.ts` (a slowed knight's swing takes about twice as long; it's back to normal once `SLOW_MS`
  passes).
- Checked at 393x852 with Playwright: the slowed foes show the blue tint and ice puffs; the level-up row shows the
  pillar frames advancing. The pillar is faint over the dark card. It was not looked at on the board.
