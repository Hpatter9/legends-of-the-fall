# SUMMON-TAROT: shards as tarot cards, a big first reveal (phase A: mock-ups and questions)

The owner: "Shards gained with the summoning should show up as tarot cards instead of fully showing the unit. I want the actual
unit to be a more exciting reveal when they get seen the first time." Then a bug report: "the summoning might not be working right.
When I get heroes out, or enough shards for one to unlock, it should play the special unlock scene."

This is **phase A only**: a rough prototype in the real page and screenshots for the owner, plus one small bug fix. The tarot
results and the reveal run only when a page sets `window.__tarotMock` (the mock-up script does). Nothing a player sees has changed
except the skip fix below.

Mock-ups (393x852, real page): [contact sheet](../samples/summon-tarot-mock-sheet.png),
[reduced motion, 360x780 and 412x915](../samples/summon-tarot-mock-sheet-sizes.png). Single shots:
[one stone, sigil face](../samples/summon-tarot-mock-single-sigil.png),
[one stone, silhouette face](../samples/summon-tarot-mock-single-shadow.png),
[ten stones, the spread](../samples/summon-tarot-mock-ten-spread.png),
[ten stones, after the join's reveal](../samples/summon-tarot-mock-ten-after.png), the reveal held at each beat
(`summon-tarot-mock-reveal-kitsune-1..4.png`, a join by shards; `summon-tarot-mock-reveal-gorgon-1..4.png`, a lucky stone).

## The bug: a join's unlock show could be skipped before the hero appeared

`tools/summon-tarot/join-show.mjs` plays joins down every path at 393x852: a save one shard short on every unowned hero, then
1-pulls and 10-pulls from the hall, 1 and 10 again from the reveal screen, a forced lucky stone from both, a pull at once after a
tab change, and a pull from the hero collection screen.

- **Every path did start the hall's grand show** in a settled browser. The early returns in `SummoningHall.play` (`!this.running ||
  !a || !this.still || ...`) did not fire: `play` awaits `start()`, which loads the art and fits the canvas before it checks.
- **The cause I could reproduce:** the hall's skip pad is live from the show's first frame, and any tap ended the whole show
  (`finish(true)`). The show opens with about 1.9 s of darkening charge with no hero yet. A second tap on "Use 1 stone" (a double
  tap, 250 ms later) went straight to the result cards in about 320 ms. The new hero never stepped out, so it looked as if no unlock
  scene played.
- **Fixed on this branch** (commit `74998e7`, separate from the mock-up): `skipAction(plan, t)` in `src/render/summonRules.ts`.
  Taps in the first `SKIP_GUARD_MS` (450 ms) are ignored. While a new hero is still coming, a tap jumps to its reveal
  (`plan.revealAt`, the hero in full view with the ribbon, one sting) instead of past it, and only a tap after that ends the show.
  The double tap now plays the whole show. Test: `test/summon-skip.test.ts`.
- **Weak spots still left in today's design**, which the new design removes:
  - The unlock show depends on the hall's canvas. `play` still returns silently when the page is hidden (`start()` skips loading
    the art, so there is no `still`), when the hall's box has no size (`fit()` bails), or when a show is already playing.
  - A pull tapped on the reveal screen while the last batch is still turning does nothing (`busy`).
  - Heroes earned in play and the starter heroes never get a reveal of their own. Earned heroes have the `earned` scene instead.

**How the design fixes it:** the first-time reveal becomes *the* unlock scene, and the results screen plays it from the pull
itself. The rule is any pull with `isNew`, or any owned hero not yet in a new optional `Meta.heroesSeen`. It is plain DOM over
the results, so it does not depend on the hall's canvas, the art loading, the page size or the tab. A join that misses its reveal
for any reason, such as the app shut mid-show, plays it the next time that hero is shown, because the hero is still not "seen".

## The proposal

**Shards are tarot cards** (`src/summonTarot.ts`, `tarotFace`, `shardResult`):
- **The card:** a gold tarot frame (`ui/tarot-frame.png`) on a dark emerald field glowing in the hero's class aura colour
  (`auraOf(kind).colour`). In the middle is the class sigil, a turning Pixel Effects glyph in the trait's colour
  (`TRAIT_ELEMENT`), with the class icon (shield, sword, flame, target, halo) at its heart. At the top is the hero's arcana
  number (its place in the roster, in Roman numerals), and at the foot the class trait's name (GUARDIAN, TRICKSTER...).
- **Under the card:** the name, "+1 shard", and the bar. The unlock bar is green ("5/7 to join"); the rank bar is gold ("rank 3:
  3/6").
- **No figure.** The alternative face (`shadow`) puts the hero's black silhouette behind a fainter sigil, a stronger hint. See
  question 1.
- **Ten stones:** five cards to a row, two rows, so the whole draw is seen at once above the fold. Rules and collection follow as
  before.

**The first-time reveal** (`firstReveal`), full screen over the results, about 3 s:
1. The joining hero's card floats, glowing in its class colour ("The shards are whole…", or "The stone burns gold…" for a lucky
   stone).
2. It turns edge-on, rays in the class colour fan out, and a Pixel Effects burst breaks from it with the reveal sting.
3. The hero rises out of the light, white-hot at first. Its sigil hangs behind it as a halo and its ring lies at its feet.
4. The hero settles to its own colours. A plate slams in with "A new ally answers" (or "A lucky summon"), the name in large gold,
   "arcana · origin · class" in the class colour, the role line and "Joins your company".
- **Taps:** a tap skips to beat 4 and a second tap closes. In a ten-pull with several joins, each reveal plays in turn. The join's
  card in the spread then turns to show the hero (gold-framed), since the hero has now been seen.
- **Safe effects:** nothing strobes or blinks. The rays turn slowly, every texture stays drawn, and light comes in and goes out on
  fades.
- **Reduced motion:** the card, then a calm fade to beat 4, with no rays or rise.

**Seen** (phase B): `Meta.heroesSeen?: string[]`, optional. Old saves count every hero they own as seen, so nobody gets a flood
of reveals. A new save counts its three starters as seen. A hero is marked seen when its reveal closes or is skipped. Anything
that adds a hero (shards, a lucky stone, a milestone) plays the reveal the next time the results or the Heroes tab show.

## Art

- **Frame:** one PixelLab generation (asked for a tarot back; it came back as a transparent gold frame, used as the frame). About
  15 PixelLab generations remain; I used 1 of the 3 allowed. A dedicated card back could take one more if the owner wants it.
- **Sigils, burst, ring, halo:** `src/art/tarot/arcana.png`, 48 unchanged 32px strips of the 5000 Pixel Effects pack
  (glyph, burst, circle and aura for twelve elements), credited in `CREDITS.md`. The aura strips are packed but not used in the
  mock-up: scaled up they looked blocky.
- **Class icons:** the existing talent icons. The figure comes from the hero's own sheet (`portrait`).
- **No pack has tarot cards or card frames.** I searched the packs: the only "Card" is a tiny spinning blue card sprite in a
  Craftpix tileset.

## Questions for the owner

1. **Card face:** the sigil card (no figure at all), or the silhouette card (the hero's shadow behind the sigil)?
2. **The hall's altar ritual for a join:** keep it before the cards (the reveal then plays after it), or let the tarot reveal be
   the whole unlock scene? I recommend the second: one scene, played from the results, can't be missed.
3. **The ten-pull spread:** five to a row as shown (all ten in view), or bigger cards three to a row with scrolling? Should cards
   turn over by themselves as now, or is each tapped?
4. **Which heroes get the first reveal:** every hero the first time it joins, including those earned in play (after their
   `earned` scene)? I'd count starters and the old save's heroes as already seen.
5. **The frame:** is the gold PixelLab frame right, or should I spend one more generation on a darker card back with a crest?
6. **Rank shards** on heroes you already own: tarot cards too, as in the mock-up?

## Files (phase A)

- `src/summonTarot.ts`: the prototype cards and reveal, with its own styles. `window.__tarot` lets the shots reach it.
- `src/gacha.ts`: `tarotReveal`, used only when `window.__tarotMock` is set.
- `src/hall.ts`, `src/render/summonRules.ts`: the skip fix (`skipAction`, `SKIP_GUARD_MS`).
- `src/art/ui/tarot-frame.png`, `src/art/tarot/arcana.png`, `CREDITS.md`.
- `tools/summon-tarot/join-show.mjs` (the join paths, `ONLY=<words>` for one), `join-frames.mjs` (today's show frame by frame),
  `mock-shots.mjs` (the mock-ups; `W=360 H=780`, `REDUCED=1`).
- `test/summon-skip.test.ts`.

## Checks run

- `npm run typecheck` and `npm run web` passed.
- `npm test -- summon-skip summon-fx` passed (15 tests).
- The full suite: see the report.
- Browser: `join-show.mjs` (every join path), and `mock-shots.mjs` at 393x852, 360x780, 412x915 and with reduced motion. No page
  errors.
