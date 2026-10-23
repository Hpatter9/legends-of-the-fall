# Hero shards: unlocking heroes is much harder

The owner's ask: "make it harder to unlock units. Much harder." Chosen: shards to unlock, ten heroes earned by content,
and about six months or more for a daily player to own all 45.

## The rules

- **Starter heroes** are owned outright (the three of the pack). Nothing else changes about the pick, except that a pack
  never offers a hero earned by content.
- **A pull is one shard of one hero** (`pullOnce`, `unlock.ts`). A hero **not owned** gets an *unlock shard*
  (`Meta.unlock`, kept apart from the rank shards in `Meta.shards`); it joins at rank 0 when it has `unlockNeed` of them.
  A hero **owned** gets a rank shard, exactly as a repeat did (then awakening, talents, then `OVERFLOW_CROWNS`).
- **Shards needed rise with the heroes owned** (`unlockNeed(owned)`, owned = pullable heroes, the starter's three
  count): `NEED_FIRST` 2 for the first, `NEED_LAST` 60 for the last, on a curve (`t^1.6`). The bar shows the need now,
  so it can grow by a shard or two when another hero joins.
- **The price rises with the heroes owned** (`priceMult`): 1x with three owned up to `PRICE_LAST_MULT` 60x with every
  pullable hero (a pull 100 to 5280 crowns; ten pulls 900 to 47510). Why: crown income is about 400 on day 1 and
  15-20k a day by month 4 (the armies' replays pay by tier), so a flat price gates nothing late and everything early.
  Income itself is untouched, so the castle, gear, spells and talents are not slowed (they cost about 13k crowns in
  all).
- **Who a pull gives** (`drawKind`): any pullable hero, but one already begun is likelier (`STICKY` 6: weight
  `1 + 6 x shards held`), so bars fill instead of 30 bars creeping. An owned content hero is in the draw too, for its
  rank shards only.
- **The pity** (`PITY_PULLS` 3): after 3 pulls in a row that gave no unlock shards, the next one is shards of the hero
  closest to joining (most shards; a tie by a side stream, `PITY_SALT`). Late in the game, when most pulls land on
  heroes already owned, this keeps a steady trickle of progress. It replaces `NEW_PITY`. `Meta.unlockDry` counts it
  (the old `sinceNew` is kept in the save but no longer used).
- **Chests** (`armyStars.ts`, `lootOf`): the shards a chest rolls and its hero draw are unlock shards for a hero not owned
  (a plain draw `CHEST_HERO_SHARDS` 2, a gold chest's prize `CHEST_PRIZE_SHARDS` 5), rank shards for one owned (2, as
  before). No chest recruits a whole hero any more. `rollChest` is unchanged (so every chest rolls what it did); a
  content hero it lands on that is not owned is swapped for a pullable one by a side stream of the chest's seed
  (`swapContent`).
- **Saves**: `Meta.unlock` and `Meta.unlockDry` are optional. Heroes owned stay owned and nothing is taken away;
  an old save plays on under the new rules for the heroes it lacks (and pays the price for its roster size). On load
  a content hero whose milestone the save has already reached joins (`grantContent`), and one already owned stays.

## Heroes earned by content (`contentHeroes.ts`)

They never come from pulls or chests (an owned one takes rank shards from them). `grantContent` runs after each fight
settles and when a save loads; a toast says "<Hero> joins you".

| Hero | Joins when you … | Why |
| --- | --- | --- |
| Werewolf | clear the Beast Packs | the wolves' own |
| Reaper | clear the Undead Legion on Hard | death's harvester |
| Demon Swordsman | clear the Infernal Host on Hard | a blade of the pit |
| Samurai Commander | clear the Yokai Night Parade on Elite | the night parade's old foe |
| Juggernaut | clear the Golem Forge on Hard | a walking wall of the forge |
| Dread Pirate | clear 20 floors of the endless tower | a tower captain (bar 0/20) |
| Tyrant | clear 40 floors of the endless tower | the tower's king (bar 0/40) |
| Time Witch | clear a Calamity whole | the end of time |
| Queen Dragoon | clear a Calamity at ascension 3 | (bar 0/3) |
| Great Sage | meet half the foes of the bestiary | the one who knows (bar, 32 of 63) |

## Where it shows

- **Recruit**: the pull's cards show the hero's bar and "4/5"; a hero that joins gets the usual NEW card (glowing). The
  collection shows begun heroes with their name and bar, content heroes "Earned in play". The odds text is two
  sentences, and a line names the hero nearest to joining. The hall's plaque shows the same line.
- **Heroes tab**: a new Roster button (top right of the tavern) lists the heroes owned, then "Earned in play" (each with
  the line "Joins when you …" and its bar where it counts up), then "Gathering shards" (bars). A tap opens the hero's sheet,
  which for a locked hero shows the same line and bar. The party page's locked cards show their bar or "Earned in play",
  and the codex's locked hero sheet gives the line.
- Wording changed: the "crowns" tip, the recruit page text, the codex lock note.

## The pace (`npm run unlock-pace`, `tools/unlockPace.ts`)

A model of a daily player of 30 to 45 minutes: the daily challenge (300 crowns), 13 army runs a day (10 auto and 3 by
hand) on the best tier cleared, one tower climb a day (6 floors growing to 45), the first-clear and star chests (opened
with the real `openChest`), a calamity a week from day 70 (a level higher every 4 weeks), about 900 crowns of
achievements and codex, and the milestones at a plausible pace (Normal clears on days 1, 4, 8, 13, 19, 26, 34, 43, 53;
Hard clears from day 12 to 112, Elite from day 40 to 190). It plays the real rules on a real Meta. Pulls use 90% of the
crowns once the castle is paid (30% of income goes to it while it is unbuilt, 13k in all). Every number is a constant
in the tool.

Median of 30 seeds, 13 runs a day:

| Heroes | Day reached |
| --- | --- |
| 5 | 1 (the first session) |
| 10 | 8 (8 to 12) |
| 15 | 23 |
| 20 | 40 |
| 30 | 77 |
| 40 | 132 |
| 45 | 186 |

Heroes owned on day 1/3/7/14/30/60/90/120/150/180: 6, 7, 8, 12, 17, 25, 33, 38, 42, 44 (all 45 on day 186).
Every pullable hero (35) is owned by day 148; the last content hero (the Tyrant, tower floor 40) comes on day 186, so
the content milestones set the end, the shards the middle.

Sensitivity: a light player (6 runs a day) reaches 10 on day 12, 20 on day 46, 30 on day 87, 40 on day 150, 45 on day 186
(pullable done on day 166). A heavy one (20 runs a day) reaches 10 on day 8, 20 on day 34, 30 on day 72, 40 on day 120
(pullable done on day 134); the content heroes still end it on day 186 in the model, so reaching the milestones sooner
(a faster tower climb) is what shortens it.

Thresholds and prices by roster size:

| Pullable owned | Shards for the next | Price of 1 / 10 pulls |
| --- | --- | --- |
| 3 | 2 | 100 / 900 |
| 5 | 3 | 130 / 1160 |
| 8 | 5 | 190 / 1710 |
| 10 | 7 | 240 / 2200 |
| 14 | 13 | 410 / 3680 |
| 18 | 20 | 680 / 6130 |
| 22 | 29 | 1140 / 10230 |
| 26 | 38 | 1900 / 17070 |
| 30 | 48 | 3160 / 28480 |
| 34 | 60 | 5280 / 47510 |

The first session: a new save has about 900 crowns of the first clear, the daily and the chests; with `STICKY` 6 the
first two heroes (2 shards each) come in a median of 7 pulls (90% within 10), so five heroes are there in the first session.

## Tests (`test/hero-shards.test.ts`)

Thresholds and price curves; a bar filling and the hero joining at rank 0; pulls (unlock shards or rank shards, never a
content hero, a first session reaching five); the pity; the content milestones, each once; chest shards and the content
swap; an old save keeping its heroes (and mending a bad `unlock`); determinism; the lock line.

Tests changed because they encoded the old "a pull unlocks a hero at once / `NEW_PITY`" rule: `meta.test.ts` (the pull costs now
follow the roster; the "fair helper" and "a new kind unlocks" tests are replaced by `hero-shards.test.ts`), `shards.test.ts`
(the first test: a pull of a hero not owned gives unlock shards), `awaken.test.ts` ("a repeat always has a use" skips
unlock pulls by `p.unlock`, not `p.isNew`), `armyStars.test.ts` (a chest's hero draw gives shards, not a whole hero),
`starter.test.ts` (packs offer every pullable hero and no content hero).

## Open points

- Content heroes get rank shards (not unlock shards) from pulls and chests once owned, or they could never rank up.
- Pull prices now depend on the roster (the buttons show the price; `pullCost(count, meta)`).
- The pace model's milestone days and the income are guesses; change the constants in `tools/unlockPace.ts`.
