# FX-CLEAR: see-through effects over fighters, and a greyed skill 2 pip

The owner's asks: "Some of the effects cover the heroes too much, make them more opaque" (meaning: let the fighters show through
them) and "The 10 can be removed and the second box can be greyed out till unlock."

## Effects over a fighter are see-through

Every effect `Fx` plays (skill and ultimate casts, spells, combos, hits, heals, smoke, signature steps) sits in one layer above all
the fighters, and the painted art is drawn with normal blending, so a big cast or burst on a fighter's tile hid its body and face.

- `src/render/overFighter.ts` (new, pure): `OVER_FIGHTER_ALPHA = 0.6` and `OVER_FIGHTER_STATUS_ALPHA = 0.7`, the two numbers to
  tune; `overFighter(x, y, half, bodies)` (does an effect's box overlap a living fighter's body: the feet up to the head, a little
  narrower than the fighter is tall) and `coverAlpha`.
- `src/render/fx.ts`: `anim` (every painted cue played on a point: `effect`, the hit bursts, the shatter, and so on) works out once,
  on its first step, whether it lies over a fighter (`overBody`) and draws at `OVER_FIGHTER_ALPHA` of its own alpha if so. A strip
  that is not one of the painted materials now keeps (the thinned) alpha too. The Fx gives its `Particles` a `cover` hook, so the
  puffs, rings, novas and signature steps spawned over a fighter are thinned the same way.
- `src/render/particles.ts`: the optional `cover(x, y, half)` multiplier, fixed when a bit spawns (`Live.k`).
- `src/render/statusStyles.ts`: `OVER_BODY` (front, halo, motes) and `partAlpha`: an ailment's parts in front of the body are drawn
  at `OVER_FIGHTER_STATUS_ALPHA` of their alpha; the ground rings and back layers are as they were. The painted front parts that
  were biggest are a little smaller and lower, so the face reads: burn's flames 0.7 to 0.6 of the body, centred at 0.22 (was 0.3);
  freeze's crystals 0.95 to 0.8, at 0.13 (was 0.18). `ailmentLayer.ts` uses `partAlpha`.
- Only a lower alpha, fixed when the effect starts: nothing blinks or vanishes, and reduced motion takes the same paths as before.
  Effects off any fighter (projectiles in flight, rings on empty ground, the screen flash and dim) are unchanged.
- `test/fx-clear.test.ts`: the alphas stay plainly visible, the overlap test, which status parts are thinned, and the big front
  parts leave the face clear.
- Screenshots (`node tools/fx-clear/shots.mjs before|after`, the same staged moment at 393x852: a hero burning, one frozen, one
  burning and poisoned, a fire blast and a frost ward laid on heroes, a frost hit and a heal): `docs/samples/fx-clear-before.png`,
  `docs/samples/fx-clear-after.png`.

## The hero bar's skill 2 pip

`src/heroBar.ts`: the second pip always reads "2" (it read "10", the level that opens skill 2, while locked). While skill 2 is
locked it has the class `shut`: greyed out (dim, colourless, `src/battleUi.css` `.hbPips b.shut`) and never lit, even with the pool
full; its tooltip says "Skill 2 opens at level 10". `docs/notes/hero-kits.md` updated. Screenshots of a level-1 party with full
pools (pip 1 lit, pip 2 grey): `docs/samples/fx-clear-bar-393x852.png`, `-360x780.png`, `-412x915.png`
(`node tools/fx-clear/shots.mjs bar`).
