# MID-EVENTS: the passing cart as a market, and twelve more events on the road

The owner's ask: "More mid battle events or more in depth ones. Like the passing cart only has two items? That seems odd. There should be more
for the market. But be reasonable about it. There are only [a few] mid battle events I've seen. Let's add some more for a unique experience."

Only **army runs and the daily** change (`roadRun`): an ordinary run, the spire and the Calamity draw their cards as before.

## How a gap's card is picked (`src/sim/midEvents.ts`, `pickRoadKind`)

- A gap still follows every second won wave that is not a boss's (`eventAfter`, unchanged): six in an army run, four in the daily.
- The card's own stream (`mixSeed(seed, 0xe7e47, stage)`) first makes the old draw of the five, as ever. A **shrine** or a **chest** stays
  exactly where it always fell, with the same blessing or loot (`KEPT_KINDS`), so the greedy player of the balance tools gets its free picks
  as often as before. A shrine or chest that comes a second time in a run wears another face (`KEPT_FACES`: "A wayside shrine", "A sunken
  coffer", ...), the same card underneath.
- Any other old draw (the merchant, a cursed path, a training ground) gives way to a weighted draw on a side stream
  (`mixSeed(seed, 0x3ed1e, stage)`) among the kinds **not yet seen this run** (`run.road.seen`): the market, the cursed path, the training
  ground and the thirteen road kinds. Weights (`kindWeight`): the market 1.5; deserters 1.8 with orcs, ogres, yokai and the war camp, 0.3
  with the dead, the beasts and the golems; the witch 2 in forest, swamp, autumn, graveyard and the Wildwood; the crown 1.7 in graveyards,
  ruins, dungeons and with the dead; the Pale Lady 1.7 at temples, shrines, crystal and with the infernal host; storms 1.6 in snow, desert,
  volcano, highlands and oasis; refugees 1.2; the rest 1.
- A debt or a favour that is due (`run.road.owed`, `OWED_AFTER` = 4 stages, two gaps on) comes first, as a card of its own.
- Everything a card's options do (and every gamble's outcome) is drawn with the card, so a saved card replays the same.

## The passing cart (`src/sim/market.ts`)

"A passing cart" (still `kind: 'merchant'`): five or six wares, a rummage and Leave, at most **3 buys** a visit (`MARKET_BUYS`; the
rummage does not count), stock from `mixSeed(seed, 0x3a4e7, stage, roll)`.

| Ware | How many | Price (s = the wave just won) |
| --- | --- | --- |
| Gear of the run's tier (`marketTier`: a drop's tier for the stage, an army further on as if 6 stages a place further, as its boss drops) | 2, different slots | 28 × tier + 2s (the old merchant's) |
| Potions for the next fight, two of: Draught of Iron (+25% hp), Fire Tonic (+12% attack), Quicksilver (heroes walk 20% faster) | 2 | 14 + s, 16 + s, 12 + s |
| A sellsword: a grade-1 hero of the party (one the bench has a lone grade-1 of, when it can, so a pair is a buy away) | 1 | the next Hire's price + 10 (the tower shop's); paid back if the bench is full |
| A relic not yet held | half the visits | 70 + 4s (the old merchant's) |
| Rummage in the back: the unsold wares are put away and others brought out | once a visit | 10 + s |

Heals are left out: an army run keeps no hp between waves, so a heal would buy nothing. A card from an older save has no `buys` and no limit.

## The road's cards (`drawRoad`, `applyRoad`)

Hurts are a twist on the next fight (`Buff.twist`, a `TWISTS` id: shown on the deploy banner, `startStage` lays it over a themed daily's own
twist, gone after one fight) or a curse on the foes (`Buff.foes`), never a wound.

| Card | Choices |
| --- | --- |
| A wounded scout | Bind her wound (12 + 2s): the next three waves' foes named, +10% attack next fight · Take her map and go (free): the waves named, +15 + 3s gold, next fight Ambush · Leave |
| The Pale Lady's shrine | Take a relic, free, and she comes to collect two gaps on · Ask only a blessing: Holy ground and +10% hp next fight · Leave |
| *The Pale Lady collects* (follow-up) | Pay 40 + 5s gold · Give the relic back · Refuse her: next fight Cursed and the foes +20% (no Leave: it is a debt) |
| Deserters at a fire | Pay the sellsword's wages (next Hire − 5, at least 20): a named hero joins · Sell them to the bounty men: +20 + 3s gold · Leave |
| The bone-dice countess | Stake 20 + 2s coin on an even hand for 45 + 4s · Stake your weakest gear: 45% it comes back a tier up (+6% attack at the top tier), else it is lost · Leave |
| Tracks in the mud (ambush) | Dig in (15 + 2s): next foes −10% · Spring the trap: next fight Ambush, the win pays +25 + 4s · Slip away: a toll of up to 10 + s (no Leave) |
| A wandering healer | Salves (18 + 2s): +20% hp for two fights · Let her tend one hero: +6% hp for good · Leave |
| A crossroads forge | Temper a piece a tier up (20 × (tier + 1) + 2s) · Quench it in blood: +5% attack on it, next fight Cursed · Leave (no gear: buy a fresh piece) |
| A crown in the reeds | Wear it: a legendary relic, and a heart burns (with no heart left: the next foes +30% and Cursed instead) · Sell it to a fence: +30 + 5s · Let it sink |
| A refugee caravan | Share your coin (25 + 3s): they send something back · Walk with them: free, heroes walk 15% slower next fight, a small thanks later · Pass by |
| *The refugees remember* (follow-up) | Shared coin: a burned heart kindles again (else a relic, else 2 × (30 + 4s) gold); walked with: +30 + 4s gold and Glory next fight · Tell them to keep it |
| A champion's challenge | Send your best (50% + 10% a grade above 1, at most 80%): +10% attack for good and +20 + 3s gold, or −10% hp for good and the foes bolder (+10%) · Refuse: the foes +10% · Pay him off (20 + 3s) (no Leave) |
| A storm (by land) | March into it: the land's twist (Frost in snow, Lava cracks in volcano and forge, Rolling Gales in desert and oasis and elsewhere, Fog in forest, swamp, graveyard, autumn and dungeon), the win pays +30 + 4s · Shelter (8 + s) |
| A stranger who knows a name | Buy the hero's heirloom (30 + 3s): a charm a tier up named for the hero (`heroName`) · Her blessing: that hero +5% hp and +5% attack for good · Leave |
| A hedge witch | A hex (20 + 2s): next foes −12% hp · Her brew: 60% Haste and +10% attack next fight, else Cursed · Leave |

## The page

- `src/events.ts`: an option shows what it gives (relic and gear icons, the twist's icon, a potion's, coin, a sellsword's portrait); the
  cart's gold line counts the buys left; spent wares read "sold", the rummage "done".
- `src/main.ts` (`afterEvent`, `placeSquad`): the deploy was made before the card opened, so a card that changed the next fight's buff (a
  boon, a curse, a twist) makes the fight again and puts the squad back; the twist banner shows the buff's twist. (This also fixes the old
  shrine and cursed path, whose boons missed the fight on the page; the headless tools always applied them.)
- `src/twistView.ts`: `twistIcon`.

## The greedy player (`src/sim/autoplay.ts`)

It leaves the road's cards and the cart alone (as it left the cursed path and the merchant), and on a card with no way off (an ambush, a
duel, a storm, a debt) takes the first free choice, as the page makes a player choose.

## Pace (before on main 0.232.0, after on this branch)

- `npm run daily-rate` (60 dates): with hearts 75% cleared (hearts/run 0.72) before, 75% (0.67) after; no hearts 60% before, 62% after.
- `node tools/army-pace/run.mjs cell ...` (16 saves, mean tries): orcs L1 2.0 → 2.3, undead L8 6.1 → 5.5, beasts L15 1.4 → 1.6,
  wildwood L22 1.9 → 1.6, labyrinth L30 8.4 → 7.9 (94% → 100%). Noise of a few saves either way.
  (Measured before the last change, which keeps shrines and chests exactly where the old draw put them; that only brings the greedy
  player closer to main: the army scenario hash of `ailments-identical` and the infernal guard of `army-pace` are main's again.)
- Re-recorded: the `daily` hash of `test/fixtures/ailment-logs.json` (the daily's gaps can bring hazards the greedy player must answer).

## Tests

`test/midEvents.test.ts`: the road kinds come only in army and daily runs; draws are deterministic; no road card, cart or old kind twice in
a run (a shrine or chest that repeats wears another face); shrines and chests fall where the old five put them; weights by army and land;
every road card has 2-3 options and each resolves; the scout's report; a road twist lies over the next fight only; the Pale Lady's due and
refusal; the refugees' heart; the crown's heart (never past the last); duel, gamble and forge outcomes; the cart's stock, prices, buys,
rummage and a full bench's refund; the greedy player; an older save mid-run.

## Art

Option icons are the existing DawnLike item and twist tiles. Cards that would benefit from a painted illustration (a later prompt): the
passing cart, the Pale Lady (her shrine and her return), the cursed crown in the reeds, the bone-dice countess, the champion's challenge,
the refugee caravan.

Browser check: `npm run web && node tools/mid-events/shots.mjs` (docs/samples/mid-events-*.png).
