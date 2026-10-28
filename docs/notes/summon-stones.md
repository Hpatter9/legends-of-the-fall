# Summoning stones: a second currency for heroes

The owner's ask: "I want to make it harder to get units. Maybe we make a second currency. The crowns buy chests; the chests give
equipment and summoning stones. Each summoning stone gives one shard, with a 1/100 chance to summon a random hero as is."

## The rules

- **A stone is the pull.** `useStones(m, 1 | 10)` (`meta.ts`) spends one stone a pull and calls `pullOnce`: the same draw as
  before (`drawKind`, `giveShards`, `STICKY`, the pity, `ownedWeight`), one shard of one hero. Crowns buy no pull any more
  (`PULL_COST`, `PULL10_COST` and `recruit` are gone). `Meta.stones` is optional (saves from before have none).
- **The lucky roll**: one stone in `LUCKY_ODDS` (100) is a whole hero instead. The hero is drawn from the pullable heroes **not yet owned**
  (`toCollect`: never a content hero, never one owned), joins at rank 0 and spends its bar. When every pullable hero is owned, the roll
  gives `LUCKY_RANK_SHARDS` (10) rank shards of a hero drawn as a pull would draw it (a rank-4 hero's worth). The roll has its own side
  stream (`LUCKY_SALT`, the seed and the pull counter), so the shard draws of every other stone are exactly what they were.
  `pullOnce(m, { lucky: true | false })` forces it (the tests, and the page's `window.__forceLucky` for screenshots).
- **Shards come only from stones.** `giveShards` is called by `pullOnce` and nowhere else (a test scans `src/` for it). Content heroes
  still join by their milestones (`contentHeroes.ts`, unchanged). `swapContent` is gone: a chest no longer names a hero.
- **Pity and `unlockDry`** work per stone, as they did per pull; a lucky hero resets the counter.

## Where stones come from

| Source | Stones |
| --- | --- |
| Army chest, first-clear chest, Last Stand chest, by size (`CHEST_STONES`) | bronze (3★) 1, silver (5★) 1, gold (10★) 3, Mythic (11★) 5 |
| Daily chest (`DAILY_CHEST_STONES`) | 2, and one more for each bonus star (2 to 4) |
| Calamity clear (`clearStones`) | `CAL_STONES_PER_DRAW` (3) for each of `2 + level/2` draws: 6 at level 0, 21 at level 10 |
| The chest shop | see below |
| Old saves, once | 10 (`STONES_GIFT`) |

Codex milestones and achievements paid only crowns and still do. Every chest's crowns and gear roll exactly as before (`rollChest`
and `rollDailyChest` are untouched); only the hero shards they named became stones (`chestStones`). `stand.ts` is untouched: its
chests are the same stash chests, so they pay stones through `lootOf`.

## The chest shop (`chestShop.ts`, `shopView.ts`)

Crowns buy chests; a chest holds stones and gear. The shop has a **stock a day** (it restocks at the next date, `Meta.shop`) and the
**price rises with the heroes owned** (`PRICE_GROW` 0.6 of the base for each pullable hero beyond the starter's three, to the nearest 50).
Why both: crown income grows about fifty-fold from day 1 to month 4, so a flat price gates nothing late (the old note says the same of the
flat pull price); the stock caps what crowns can buy and the rising price keeps the early game cheap.

| Chest | Base price | A day | Stones | Gear |
| --- | --- | --- | --- | --- |
| Bronze | 400 | 3 | 3 | 35% a bronze piece |
| Silver | 1,500 | 1 | 5 | always a silver-grade piece |
| Gold | 6,000 | 1 | 8 | always a gold-grade piece, a few levels higher |

At most 22 stones a day from the shop. Gear rolls with `rollEquipment` from a side stream of the seed and `Meta.shopBuys` (so reloading
cannot reroll it), at the item level of the furthest army cleared. The opening is the stash's own (`showChest`), with a stones line.
The shop opens from a "Chest shop" button on the Recruit tab.

## The pace (`npm run unlock-pace`)

The model now buys the dearest chest its crown budget reaches (stock permitting), opens every chest, and uses every stone. Pullable
heroes owned (the starter's three count), day reached, median of 30 seeds; `--shop "400:3:3,1500:1:5,6000:1:8"` tries another shop and
`--noshop 1` plays with free stones only (3,500 a year: the 5th pullable hero on day 3, the 10th on day 58, the 35th on day 312), which is why the shop exists.

| Pullable heroes | Before | After | Slower by |
| --- | --- | --- | --- |
| 4th (first after the starter) | day 1 | day 1 | |
| 5th | day 1 | day 1 | |
| 6th | day 1 | day 3 | 3x |
| 10th | day 12 | day 25 | 2.1x |
| 15th | day 26 | day 66 | 2.5x |
| 20th | day 44 | day 97 | 2.2x |
| 30th | day 90 | day 167 | 1.9x |
| 35th (the last pullable) | day 125 | day 201 | 1.6x |

Heroes owned on day 1 / 7 / 30 / 90 / 180: 5, 7, 12, 24, 40 (was 6, 8, 18, 36, 44). All 45 on day 201 (was 186: the Tyrant's tower
floors set the end, as before). The late stretch is the least slowed because the lucky roll alone gives a hero about every hundred stones;
making it slower means fewer stones late, not a higher `NEED_LAST` (the model shows no change from 100 to 180). `unlockNeed` is unchanged.

## Old saves (`loadMeta`)

A save with no `stones` field that has made its starter pick gets `STONES_GIFT` (10, about the first session's worth) once, and a
toast says so (`Meta.stoneGift`, taken by the page). Crowns it holds stay crowns, `pulls`, `unlockDry`, `unlock` and every hero are kept.
A save still waiting for its starter pick, and a new one, start with none.

## Where it shows

- Top bar: a stone chip (the Mana crystal of the Crystal Caves tileset, `ic-stone.png`, credited in `CREDITS.md`) beside the crowns.
- Recruit tab: "Use 1 stone" and "Use 10 stones" (with the stones held), "1 in 100 stones is a lucky summon", the "Chest shop" button.
  The reveal page keeps the card reveal; a lucky card has a permanent gold frame and one burst of light when it turns (played once,
  no loop; none under reduced motion).
- Shop: three cards with the stock left, the price now and Buy; the chest opens with the usual reveal.
- Calamity victory: a Stones group instead of Hero shards. Wording changed: the crowns tip, the loading tip (`new-lines.json` and
  `quipData.ts` together), the Recruiter achievement, the daily's prize line, the roster and lock lines, the ascension reward line.

## Tests

`test/summon-stones.test.ts`: a stone is one shard; determinism; the lucky odds (about 1 in 100) and its side stream; the lucky hero is
never owned or content, and rank shards once all are owned; no `giveShards` outside the stone draw; the shop's prices, stock, contents and
gear; the shop record read; the old-save grant; the first session reaches five heroes. Changed to the new rules: `meta`, `hero-shards`,
`armyStars`, `daily`, `calMapRewards`, `awaken`, `shards` (the shard-rule tests pass `{ lucky: false }`).

## For the owner to decide

- The gift for old saves (10 stones), and that unspent crowns are left as crowns (they now buy chests: about 3 stones for 1,600 crowns
  at 8 heroes, so a saver is set back; a bigger gift or a one-time conversion would soften it).
- Whether bigger chests should hold more stones for the crown (today a bronze chest is the best stones for the crown; silver and gold
  are bought for their gear and sold once a day).
- The shop's daily stock and rising price: the alternative is a flat price with a lower stone count.
- Codex and achievements pay crowns only; they could pay a stone or two.
