# SUMMON-TAROT: shards as tarot cards, every hero's first-time reveal

The owner: "Shards gained with the summoning should show up as tarot cards instead of fully showing the unit. I want the actual
unit to be a more exciting reveal when they get seen the first time." Then a bug report: "the summoning might not be working right.
When I get heroes out, or enough shards for one to unlock, it should play the special unlock scene."

Phase A showed mock-ups and asked six questions; the owner took every recommendation. Phase B (this) builds it as the real path.

Screens (real page, real pulls): [393x852 sheet](../samples/summon-tarot-sheet.png): one stone, a ten-stone draw with a join (the
spread, its unlock scene, the spread after), and the reveal's four beats for a join by shards and for a lucky stone;
[reduced motion, 360x780, 412x915](../samples/summon-tarot-sheet-sizes.png). Single shots: `docs/samples/summon-tarot-*.png`
(`single`, `ten-spread`, `ten-reveal`, `ten-after`, `reveal-kitsune-1..4`, `reveal-gorgon-1..4`, with `-reduced`, `-360x780` and
`-412x915` takes). The phase A mock-ups stay as `summon-tarot-mock-*.png`.

## The owner's decisions

1. The card face is the hero's black silhouette behind its class sigil.
2. The tarot first-time reveal is the whole unlock scene. The hall's altar ritual no longer plays before the cards.
3. A ten-stone draw lays five small cards to a row, and they turn over by themselves.
4. Every hero gets the reveal the first time it joins, including heroes earned in play (after their own scene). The starters and an
   old save's owned heroes count as seen.
5. Keep the gold PixelLab frame; no more generations.
6. Rank shards for heroes already owned are tarot cards too.

## How it works

**The cards** (`src/summonTarot.ts`, `src/gacha.ts` `reveal`):
- Every pull is a card that starts face down (`tarotBack`, a gold sigil and a "?") and turns by itself, left to right, 140 ms
  apart. A tap turns it at once, and so do Enter and Space. The face (`tarotFace`) is the hero's black silhouette, its class
  sigil and class icon, the arcana number at the top and the class trait's name at the foot.
- The face's colour is the class aura's (`auraOf(kind).colour`). The sigil is a Pixel Effects glyph in the trait's colour
  (`TRAIT_ELEMENT`).
- Under each card (`pullInfo`) come the name, what it gave and its bar: green "5/7 to join" for a hero not owned, gold
  "rank 3: 3/6" for one owned. A join shows "Joined your company" (or "Lucky! Joined at once"); crowns from a full hero show
  "+N crowns". The text stays hidden until the card turns, so the name never spoils the turn.
- One stone shows one large card; ten show five to a row, so the whole draw is on screen. "Reveal all" turns every card at once.

**The unlock scene** (`firstReveal`), full screen above everything but a cinematic (z-index 44), about 3 s:
1. The joining hero's card floats, glowing in its class colour ("A new card is drawn…", or "The stone burns gold…").
2. The card turns edge-on, slow rays in the class colour fan out, and a burst breaks from it with the reveal sting.
3. The hero rises out of the light, white-hot at first, with its sigil as a halo and a ring at its feet.
4. The hero settles to its own colours. A plate comes in: "A new ally answers" (or "A lucky summon"), the name, "arcana · origin
   · class", the role line and "Joins your company".

Details of the scene:
- **Taps:** the first `SKIP_GUARD_MS` (450 ms) of the scene, and of its last beat, let a tap go, so a double tap can never pass
  the hero. Any other tap goes to beat 4 (the hero in full view), and a tap there closes the scene.
- **Safe effects:** every moving part is a CSS animation or transition, so nothing is drawn or allocated per frame. Nothing
  blinks off and on.
- **Reduced motion:** the card, then one calm fade to the hero and its plate, with no rays, burst, rise or card turn. The cards on
  the results screen fade instead of turning.
- **Music:** the music ducks under the scene (`duck(true, 'reveal')`).
- **After the scene:** the join's card in the spread shows the hero's figure in a gold frame (`heroCard`). The hero is marked
  seen and saved when its scene closes.

**Every join plays it, whatever the hall's state:**
- `Meta.heroesSeen?: string[]` (`src/sim/heroesSeen.ts`: `readHeroesSeen`, `unseenHeroes`, `heroSeen`, `markHeroSeen`) lists
  the heroes whose reveal has played.
  - A save from before has no list, so every hero it owns counts as seen when it loads.
  - `newMeta` starts with `[]`; `pickStarter` and `startedMeta` add the starters.
- Reveals wait in one line (`queueReveal`), one after another, never twice for a hero. They are started:
  - by the results (`Gacha.playJoins`), for each pull with `isNew`, once every card has turned (with a 0.9 s look at the spread);
  - by `Game.revealEarned`, for a hero earned in play, right after its own `earned` scene;
  - by `revealUnseen`, a catch-all for any owned hero not yet seen, when the home screen opens (`Home.open`), when the
    collection opens (`Gacha.open`) and when the results close (`Gacha.close`). So a reveal missed for any reason (the page shut
    mid-scene, Continue tapped before the cards turned, a hero granted on load) plays the next time the game can show it.
- `Home.summon` no longer plays the hall's altar show. It stops the hall's drawing and the cards open at once, so nothing depends
  on the hall's canvas, its art or its size. `SummoningHall.play` stays for the screenshot tools (`window.__hall`).

## The bug, its cause and the fix

The browser check (`tools/summon-tarot/join-show.mjs`) found that the hall's grand show did start on every join path. Its early
returns (`!running || !art || !still`) never fired, because `play` awaits `start()` first. The real cause was a tap:
- **The skip pad:** it was live from the first frame and ended the whole show. A double tap on "Use 1 stone" reached the cards in
  about 320 ms, before the hero appeared. That was fixed first on its own (`skipAction`, `SKIP_GUARD_MS`; released in 0.207.0).
- **The new design:** it removes the hall from the path entirely. Two more holes turned up while building it, and both are fixed:
  - A pull from the cards while a batch was still turning used to start a new batch over the old one, losing its joins'
    reveals. `Gacha.pull` now ignores it while busy, as the disabled buttons already said.
  - Tapping Continue before the cards had turned closed the results with the join's reveal never played. `Gacha.close` now plays
    any still due, over the hall.

`join-show.mjs` now checks all of these, each with the save's `heroesSeen` checked afterwards, and every join plays its reveal:
- 1-stone and 10-stone pulls from the hall and from the cards;
- a lucky stone, alone and in ten;
- a pull right after a tab change, and one from the collection screen;
- a double tap with a stray tap;
- a save whose last join missed its reveal (it plays when the home screen opens).

## Other screens

- **The hero collection** (in the results) and **the Heroes tab** show owned heroes as before. A hero not yet seen has its
  reveal before the collection or the home screen shows it.
- **The Open-all chest summary** lists crowns, stones, tomes and gear only (a stone is used in the sanctum, not in the chest), so
  it is unchanged.
- The old `.flip` result styles in `hall.ts` are no longer used. `tools/summon-result-checks.mjs` and `tools/sanctum-checks.mjs`
  checked the old cards and are superseded by `tools/summon-tarot/join-show.mjs` and `shots.mjs`.

## Art

- **Frame:** `src/art/ui/tarot-frame.png`, one PixelLab generation in phase A; no more were spent.
- **Sigils, burst, ring, halo:** `src/art/tarot/arcana.png`, 48 unchanged 32px strips of the 5000 Pixel Effects pack, bundled
  into game.js. The frame is a `ui/` file, so the build copies it and the service worker caches it.
- **Class icons:** the talent icons. The figure and silhouette come from the hero's own sheet.
- Both new images are credited in `CREDITS.md`.

## Files

- **Page:**
  - `src/summonTarot.ts` (new): the cards, the reveal, its queue and its styles.
  - `src/gacha.ts`: the tarot results and the join reveals.
  - `src/home.ts`: no hall show, and the reveals due on open.
  - `src/main.ts`: the earned hero's reveal, and the Gacha's old `again` hook removed.
- **Sim:** `src/sim/heroesSeen.ts` (new), and `src/sim/meta.ts` (the optional field, loading, the starters).
- **Tests:** `test/heroes-seen.test.ts` (new; the skip rule's `test/summon-skip.test.ts` came with the earlier fix).
- **Tools:** `tools/summon-tarot/join-show.mjs` (every join path; `ONLY=<words>`), `shots.mjs` (the screens; `W`, `H`,
  `REDUCED=1`), and `join-frames.mjs` (the old hall show frame by frame, for the record).

## Checks

- `npm run typecheck` and `npm run web` passed.
- The affected tests passed: `heroes-seen meta save starter hero-shards summon unlock content codex`.
- Full `npm test`: 1380 passed, 0 failed.
- `join-show.mjs` at 393x852: every join path played its reveal, with nothing left unseen.
- `shots.mjs` at 393x852, 360x780 and 412x915, and with reduced motion: no page errors.
