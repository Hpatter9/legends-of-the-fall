# SUMMON-SHOW: shards first, then the new heroes; the summoning's show in Blender

The owner: "The draw ten summoning screen needs to be reorganized. Have the tarot cards, shards only show first. Then after that the
unlocked heroes can show. The summon effect needs to be redone too. Use blender to make a better effect."

Branch `claude/summon-show`. Part 1 (the order) was pushed on its own so it could go out first; part 2 (the show in Blender) follows.

## Part 1: the order

The rule is pure, in `src/render/summonRules.ts` (`drawOrder`, `cardTimes`, `shardTotals`; `test/summon-show.test.ts`):

1. **Every shard card first.** A draw's pulls that are not a new hero are tarot cards (`tarotFace`, as before), laid five to a row and
   turned by themselves one after another (`FIRST_CARD_MS` 260 ms, then `CARD_GAP_MS` 140 ms apart: ten cards in under two seconds).
   A tap turns one at once; "Reveal all" turns every card. A new hero has **no card in the spread** any more (it used to sit first, as
   a dark figure two cards wide, which showed that a hero had come before the shards were read).
2. **The totals.** Once every card is turned, "Shards gained" lists a line a hero (`shardTotals`): its name (with ×N for more than one
   card), the unlock shards and its bar ("+2 shards · 9/15 to join"), rank shards and the rank bar, crowns from a hero with nothing
   left to buy, and "joins!" for a hero whose shards are in the draw and who joins in it. While the cards are turning the line above
   them says how many shard cards there are and how many sealed summons wait ("7 shard cards · 3 sealed summons wait").
3. **Then the new heroes**, `HEROES_AFTER_MS` (1.1 s, time to read the totals) after the last card turns, each with its own full
   reveal (`firstReveal`: the charge, the arrival, the full art, the battle sprite's attack and its plate), in the order drawn. Every
   hero but the last goes on by itself `HERO_ONWARD_MS` (1.8 s) after it stands in full view (a tap goes sooner); **the last is held**
   until a tap. As each reveal closes, the hero's card (its figure in the gold frame, its name and "Joined your company") joins a row
   "New allies join" under the totals, and the row is brought into view.

The other shapes of a draw:

- **Shards only:** the cards and the totals; nothing follows, and the screen is free as soon as the last card turns.
- **All new heroes** (ten lucky stones, say): no cards and no totals; the line says "10 new allies answer the call…" and the first
  reveal starts after `HEROES_AT_ONCE_MS` (0.35 s). Nine go on by themselves, the tenth is held.
- **A single stone:** a shard is one large card that turns, as before. A new hero goes straight to its reveal (there is no dark card
  to turn first any more), held until a tap, and its large card is left on the screen after.
- **Skip:** a tap on a reveal still goes to the hero in full view (never past it; `SKIP_GUARD_MS` lets the first moments' taps go).
  A skipped hero that is not the last then goes on by itself after `HERO_ONWARD_MS`, so a run of taps moves a ten-draw along.
- **Reduced motion:** the cards fade instead of turning, the reveals are the calm fade they were, the new allies' row comes in
  without its rise, and the scroll to it is instant.

Also fixed on the way: **each reveal took 2.6 to 5.8 seconds to start** on the test page (a slow graphics path): `revealSprite` read
back every frame of the hero's sheet from the shown canvas, which lives on the graphics card, to find the crop. It now reads them on a
scratch canvas kept in memory (`willReadFrequently`): about 50 ms. A ten-draw's heroes now follow one another at once.

Checked in the real page (`node tools/summon-show/film.mjs`, which films a ten-draw and a single new hero from the page's own
screencast and checks that every shard card turned before the first reveal opened; `strip.py` makes a filmstrip of a take).
