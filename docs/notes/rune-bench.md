# The rune bench and its pull bar (RUNE-BENCH)

The owner's ask: "the 'pack' while in battle should be renamed since it's kind of misleading. I want to rework the gems screen so it
feels more like the merging and placing heroes ... There is a small pull bar on the right of the bench that pulls to the left and
lands on the left side. this changes the bench to the rune storage where we merge runes then drop them on players in the field. then
pulling the bar back to the right side switches it back ... I also want the runes auto mode to work similarly to the heroes. it
starts locked but unlocks after a set number of stars are earned."

## What changed

- **The pull bar** (`src/benchSlide.ts`, rules in `src/benchSideRules.ts`). A grip on the bench's right edge, worded "Runes" with a
  gold badge counting the rune merges ready. Drag it left (or tap it) and the bench slides across with it; it lands on the left and
  the bench is the rune bench. Drag or tap it back for the heroes. It follows the finger, stretches a little past either end, and
  on letting go springs home with a small overshoot (a pull past 35% of the way, or a flick, lands on the far side; a shorter pull
  springs back). Its touch area is wider than it looks, for one thumb at 360 wide. Reduced motion moves it at once. The keyboard's
  arrows and Enter work too. It shows only on a rune run's deploy screen; a fight puts the heroes back.
- **The rune bench** (`src/runeBench.ts`). The bag's runes as tiles, four across, the way heroes sit as cards. Drag a rune onto its
  twin (or tap one, then the other) to merge, with the merge spark. Drag it onto a hero on the field (or tap it, then the hero) to
  socket it: while it is held its twins on the bench and the heroes that can take it light up (the board's merge tiles), the one
  under the finger gold, or red when it cannot. A refused drop shakes, flies home, and a note says why (a Keystone is never worn;
  the hero's three sockets are full; ...). A finger resting on a tile opens the rune's card (ornate menu); a tap on a hero with no
  rune chosen opens its three sockets (ornate menu), each with a tap to take it off. Socketing refits only the heroes whose runes
  changed (set down again where they stand), so the board and camera stay put.
- **"Pack" is gone.** The deploy bar's Pack button is removed. The old card (relics, every hero's sockets, the remedies) is now the
  **Satchel**, opened from the rune bench's head; the Calamity map's and the rift sanctuary's Pack buttons say Satchel too, and the
  wave card says "A find waits in the satchel".
- **Rune Auto, earned.** The rune bench's Auto (`autoRunes`) starts locked, showing 🔒 and the stars still to win ("Auto · 4★"; a
  tap says how many it opens at). It is `Feature` `'autoRunes'` in `src/sim/featureUnlocks.ts`, opened at **`AUTO_RUNES_STARS` = 6**
  stars won across the armies (`totalStars`, the stars that open the armies and modes), told once like the other helpers ("Rune Auto
  unlocked ..."). Merge all stays free, as it was in the old tray. The bots and balance tools still call `autoRunes` directly.

**Why 6 stars.** `ARMY_NEED` is built on a pace of two stars an army (the clear star and one more). On that pace a player has about 4
stars when the second army falls (Auto merge) and about 8 when the fourth does (Auto place); 6 comes as the third army falls, between
them. A save that has the stars already gets it at once and is told on its next deploy. (`Meta.stars`, the old per-stage stars, is
only written outside the armies now, so it is not what is counted.)

## Art

New pieces are stand-ins until painted (the owner's new rule): the bar, the rune side's backing, the tiles' frames and the lock. The
prompts are in [rune-bench-art-prompts.md](rune-bench-art-prompts.md) (branch `art/rune-bench`, files under
`art-source/rune-bench/`). The tiles use the combat skin's own `ui/combat-skill.png` frame and the painted rune stones meanwhile.

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- rune-bench featureUnlocks unlock-tell runes run-gear-2 ui-standard deploy`: 52 tests pass. `test/rune-bench.test.ts`
  covers the unlock (locked on a new save, opens at 6 not 5, between the other two, told once, old saves, the label) and the bar's
  rules (tap flips, the 35% share, flicks, the stretch, when it shows).
- `node tools/rune-bench/shots.mjs` (after `npm run web`) drives the real page at 393x852, 360x780 and 412x915: the heroes' bench,
  the bar held mid-slide, the rune bench, a drag onto a twin and the merge, a drag onto the archer and the socket, a Keystone refused
  on the knight, the rune's card, and a tap back to the heroes; it checks each did what it should, no side scroll, no page errors.
  Pictures in [docs/samples/rune-bench/](../samples/rune-bench/).
- `tools/gear-build/rune-shots.mjs` and `tools/ui-consistency/shots.mjs` now open the satchel from the rune bench.
