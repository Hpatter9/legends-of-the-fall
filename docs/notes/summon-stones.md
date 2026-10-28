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
| Codex milestones (`CODEX_STONES`) | 1 each, beside the crowns: 8 in all |
| Codex entries (`ENTRY_STONES`, `claimEntries`) | 1 for each foe, boss or hero entry the first time it is discovered: 108 in all (63 bestiary, 45 heroes) |
| Achievements (`ACHIEVEMENT_STONES`, `stonesOfAchievement`) | 2 each, beside the crowns; `BIG_STONES` (3) for Thirtieth Stage, Legend in the Making (level 50), Full Roster, Boss Slayer and Last Stand (wave 20); `CENTURION_STONES` (5) for Centurion (level 100): 50 in all |
| Old saves, once | 10 (`STONES_GIFT`) |

**The codex and achievements** (the owner's call: "a stone or two") pay their stones when their crowns are claimed (`claimCodex`,
`claimAchievement`), so a save that claimed them before is not paid again: the claims are kept in `Meta.codexClaimed` and `Meta.claimed`,
and an older save's achievements already load as claimed. The reward text shows both: "Win stage 30. · 40 crowns, 3 stones", the
Claim button ("Claim +40 · 3 stones"), Claim all, the toast, and the codex's reward rows ("+60 crowns, +1 stone") and its "Paid ... of
... crowns and ... of ... summoning stones" line.

**Each codex entry** (the owner's later call) also pays a stone the first time it is discovered: a foe or boss entry when it is first met
(`isMet`: the codex's foes met, or the bosses beaten), a hero entry when the hero is first owned. The codex pays by claims, so the entry
stones are claimed too: the entries discovered and not yet paid (`entriesWaiting`) are taken with the codex's "Claim rewards" button
(`claimEntries`, through `ENTRIES_CLAIM` in `codexView.ts`), above which a line says "3 new entries discovered: +3 summoning stones to
claim"; the Codex chip on the home screen shows its badge while any wait (`codexAnyWaiting`). The entries paid are kept in
`Meta.codexPaid` (`foe:<entry>`, `hero:<kind>`), so none pays twice. A save from before has no `codexPaid`: `readCodexPaid` counts every
entry it had already discovered as paid when it loads, so it is paid only for the entries it discovers from now on. A new save's
starter heroes are discovered entries, so it has 3 stones waiting in the codex from the start. Nothing is paid where a fight settles;
`noteFoes` is unchanged. Every chest's crowns and gear roll exactly as before (`rollChest`
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
| Silver | 1,500 | 1 | 8 | always a silver-grade piece |
| Gold | 6,000 | 1 | 15 | always a gold-grade piece, a few levels higher |

At most 32 stones a day from the shop (the owner raised silver from 5 to 8 and gold from 8 to 15; bronze stays 3, and the daily
stock and rising price stay). Gear rolls with `rollEquipment` from a side stream of the seed and `Meta.shopBuys` (so reloading
cannot reroll it), at the item level of the furthest army cleared. The opening is the stash's own (`showChest`), with a stones line.
The shop opens from a "Chest shop" button on the Recruit tab.

## The pace (`npm run unlock-pace`)

The model now buys the dearest chest its crown budget reaches (stock permitting), opens every chest, and uses every stone. Pullable
heroes owned (the starter's three count), day reached, median of 30 seeds; `--shop "400:3:3,1500:1:8,6000:1:15"` tries another shop, `--nobadges 1` leaves out the achievements' and codex milestones' stones (the model
pays 54 of their 58 over the first 150 days, the same share as their crowns), `--noentries 1` leaves out the codex entries' stones (the
model claims them each day: about 88 a year, as it meets only the armies' foes on their Normal clears), and
`--noshop 1` plays with free stones only (3,500 a year: the 5th pullable hero on day 3, the 10th on day 58, the 35th on day 312), which is why the shop exists.

"Before stones" is the game before this branch; "First cut" is the first stones version (silver 5, gold 8, no badge stones); "Bigger
chests" is silver 8 and gold 15 alone; "Badges" adds the achievements' and codex milestones' stones; "Now" adds the codex entries' stones.
"Slower by" is Now against Before stones.

| Pullable heroes | Before stones | First cut | Bigger chests | Badges | Now | Slower by |
| --- | --- | --- | --- | --- | --- | --- |
| 4th (first after the starter) | day 1 | day 1 | day 1 | day 1 | day 1 | |
| 5th | day 1 | day 1 | day 1 | day 1 | day 1 | |
| 6th | day 1 | day 3 | day 3 | day 3 | day 1 | |
| 10th | day 12 | day 25 | day 25 | day 24 | day 21 | 1.75x |
| 15th | day 26 | day 66 | day 62 | day 61 | day 58 | 2.2x |
| 20th | day 44 | day 97 | day 88 | day 89 | day 85 | 1.9x |
| 30th | day 90 | day 167 | day 154 | day 153 | day 149 | 1.7x |
| 35th (the last pullable) | day 125 | day 201 | day 188 | day 184 | day 182 | 1.5x |

Heroes owned on day 1 / 7 / 30 / 90 / 180: now 6, 7, 13, 27, 44 (badges 5, 7, 13, 26, 44; first cut 5, 7, 12, 24, 40; before stones 6, 8,
18, 36, 44). All 45 on day 186 (first cut 201; before stones 186: the Tyrant's tower floors set the end, as before). The bigger chests
move the middle and late game (the 20th to the 35th pullable hero come 9 to 13 days sooner, about 8% faster) and leave the early game
alone, where the budget buys bronze chests; the badge stones (54 over 150 days) move it by a day or so. The entry stones (about 88 a year,
most of them early: the starter's three heroes on day 1, then each army's foes) move it 2 to 4 days more: the 6th pullable hero now comes
on day 1, as before stones, and the 10th three days sooner. The roster still grows about half as fast to the 20th pullable hero, and the
late stretch is less slowed (1.5x to 1.7x). The late stretch is the least slowed because the lucky roll alone gives a hero about every hundred stones;
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
`armyStars`, `daily`, `calMapRewards`, `awaken`, `shards` (the shard-rule tests pass `{ lucky: false }`). `achievements` and `codex`: each
pays its stones on the claim, once, and an older save's claims pay nothing again; a codex entry pays its stone once, an old save is not
back-paid for the entries it had, and the same discoveries pay the same in any order.

## The owner's decisions

Decided by the owner: the old-save gift stays 10 stones; the daily stock and rising price stay; silver chests hold 8 stones and gold
15; the codex's milestones pay 1 stone and achievements 2 (a few more for the big ones); every codex entry pays 1 stone the first time it
is discovered (old saves are paid only for entries discovered from now on); and the late game being 1.5x to 1.7x slower rather than 2x
is fine as it is.
