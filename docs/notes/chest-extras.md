# Chest extras: XP tomes and Open all (CHEST-001)

The owner's two asks: "XP boosts as an item from the chests" (the owner chose XP tomes for one hero) and "an Open all for the
chests". Branch `claude/chest-extras`, from main 0.174.0.

## XP tomes (`src/sim/tomes.ts`)

Three sizes, each a fixed amount of XP given to one hero the player chooses (`TOMES`), sized on the level curve (`levels.ts`):

| Tome | XP | Why |
| --- | --- | --- |
| Small | 250 | About one ordinary fight at mid levels: a mid army's wave pays a hero about 190 XP on Normal and 300 on Hard (`npm run level-pace`'s run table, over 15 waves) |
| Medium | 5,000 | About a level at level 20: level 21 costs 4,800 over level 20 |
| Large | 20,000 | Several levels at level 30: the last three up to it (27 to 30 cost 20,160), or about one past it (level 31 costs 20,800) |

"Several levels at level 30" was read as the levels leading to 30: three levels past 30 would cost about 131,000 XP, and a gold shop
chest a day would then hand out more XP than the favourite earns. That reading is the owner's to confirm.

**Where they drop** (`TOME_DROPS`, `rollTomes`). Every chest that goes through the stash's loot roll (`lootOf` in `armyStars.ts`) holds
tomes, on top of its crowns, stones and gear: the army star chests, the first-clear chests, the daily chest, and the Last Stand's and
the spire's chests (they are stash chests too). The shop's three chests hold the same as an army chest of their size. The Calamity's
clear does not use the chest roll (`calReward.ts`), so it pays no tomes.

| Chest | Tomes |
| --- | --- |
| Bronze (3★, the shop's bronze, the Last Stand's and spire's bronze) | 1 small, and a 30% chance of a second |
| Daily | 1 small, one more for each bonus star, and a 10% chance of a medium |
| Silver (5★, Hard and Elite first clears, the shop's silver) | 2 small, and a 40% chance of a medium |
| Gold (10★, Legendary and Mythic first clears, the shop's gold) | 2 small and 1 medium, and a 25% chance of a large |
| Mythic (11★) | 3 small, 1 medium and 1 large |

The tomes are drawn from a side stream of the chest's own seed (`mixSeed(seed, TOME_SALT)`; a shop chest's seed is its gear seed), so
every chest's crowns, stones and gear roll exactly as before, and a chest always holds the same tomes, peeked or opened, in any order.
Shop prices and stock are unchanged.

**Holding them.** `Meta.tomes?` is a count per size (optional; a save from before has none, `readTomes` drops anything else).

**Using them** (`useTome`, `src/tomeView.ts`). On a hero's page (the dossier, `menuHeroes.ts`), under the XP bar, a line shows the tomes
held by size and a "Use tome" button (only when any are held). It opens a sheet with the hero's face, level badge and XP bar and a button
for each size with its count. A tap reads one tome: the bar fills, and a new level plays the after-fight level-up (the "Level up!" stamp,
or "+N levels!", the badge ticking over, the HP and attack gains, "Ultimate unlocked" at 30, the sweep of light, the sparks and the
chime; once, nothing loops; none of the motion under reduced motion). The sheet stays open for more; Done redraws the page.

**The level cap.** A tome cannot take a hero past `MAX_LEVEL` (100): the hero stops at the cap and the rest of the tome's XP is lost.
The button says so before the tap ("+1,000 XP, 19k lost at the cap"), the sheet's note after it, and a hero already at the cap cannot read
one ("Use tome" is disabled). Owner's call whether the overflow should instead be refused.

**The bag.** The game has no bag or inventory screen; the tome counts show on the Heroes roster under its heading ("XP tomes: 31 small,
9 medium, 2 large · Open a hero to use one") and on each hero's page.

**Art.** `src/art/ui/tome-small.png`, `tome-medium.png`, `tome-large.png`: 16x16 DawnLike Book tiles (a brown book, a blue tome, the
gold book with its sparkle), cut by `tools/tome-icons.py` and credited in `CREDITS.md`; bundled into game.js, so nothing new to cache
offline. They show in the chest reveals, the Open all summary, the tome sheet and the roster.

## Open all (`openAll`, `sumLoot` in `armyStars.ts`; `showChestSummary` in `chestStash.ts`)

When more than one chest waits on the camp's cart, an "Open all" button sits over the pile. It opens every chest in the order a tap on
the cart would open them one by one (the best waiting first, `bestChest`), so each chest pays exactly what it would have, from its own
seed, and the gear takes its ids in the same order (a test checks the metas and loot lists are identical). The summary plays one burst of
the best chest of the pile, then shows everything at once: tiles for the crowns, stones and each size of tome, then the gear won, the best
first (rarity, then level). No chest-by-chest animation; a tap hurries the burst. A single chest keeps its own reveal. The shop's
chests open as they are bought (they never queue), so the shop has no Open all. Chests no longer give hero shards (summoning stones
stand for them), so the summary has no shards line.

## Pace (`npm run unlock-pace`, `npm run level-pace -- --tomes ...`)

`unlock-pace` now prints the tome XP the modelled player collects (the real chests, opened, and the shop buys), median of 10 seeds:
8,000 by day 7, 62,000 by day 30, 188,500 by day 60, 412,000 by day 90. `level-pace` takes that line (`--tomes "7:8000,30:62000,..."`)
and reads every tome to the favourite or, as a second case, to the benched hero (10 seeds, 90 days):

| | Without tomes | With tomes |
| --- | --- | --- |
| Favourite, level 30 / 40 / 50 / 60 | day 4 / 26 / 52 / 72 | day 4 / 26 / 50 / 70 |
| Favourite's XP by day 30 | 1,552,000 | 1,614,000 (+4%) |
| Benched hero, level 10 / 20 / 30 | day 2 / 6 / 21 | day 1 / 4 / 16 |

In a typical first 30 days the tomes are worth about 4% of what the favourite earns in fights: they hardly move a hero that fights every
day, and they are a catch-up tool for a new or benched hero (62,000 XP takes a fresh hero from level 1 to level 28). The roster pace is
unchanged (tomes touch no stones or crowns).

## Tests

`test/chest-extras.test.ts`: the tome sizes against the curve; tome drops deterministic and bigger chests worth more; every chest still
pays its crowns and gear as `rollChest` rolls them, with tomes on top, and a peek changes nothing; shop chests (peek equals buy); Open
all equals opening one by one (identical metas and loots), and the totals match opening oldest first; the summary's sums and gear order;
a tome's XP, spending and level-up report; the cap (overflow lost, no use at the cap); saves (round trip, an old save with none, junk
dropped). Affected suites run: `chest summon-stones levels meta armyStars daily stand tower modes equipment hero-shards calMapRewards
progression awaken shards unlock achievements codex` (252 tests) and `armies battle-flow calamity elites equip-best gear-sets mystery
recycle no-flicker` (134), all passed.

## Screenshots (393x852; `node tools/ui/chest-extras-shots.mjs [w h]` after `npm run web`)

- The cart with Open all: `docs/samples/chest-extras-cart.png`; after: `chest-extras-cart-after.png`.
- A chest showing its tomes: `docs/samples/chest-extras-chest-tome.png`.
- Open all: `docs/samples/chest-extras-open-all-burst.png`, `docs/samples/chest-extras-open-all.png`.
- The roster's tome line: `docs/samples/chest-extras-roster.png`.
- The hero page's tome line: `docs/samples/chest-extras-dossier.png`; the sheet: `chest-extras-tome-sheet.png`; a medium tome read
  with its level-up: `chest-extras-tome-level-up.png`; the page after: `chest-extras-dossier-after.png`.

Also checked at 360x780 and 412x915 (not kept), with no page errors at any size.

## For the owner to decide

- The large tome's size (20,000 XP, read as "the levels up to 30"); a bigger one (about 60,000, two deep levels past 30) is a one-line change.
- Overflow at the level cap is lost (with a warning on the button); the alternative is to refuse a tome that would overflow.
- The drop table, especially the shop's gold chest (a medium every time, a large one in four).
