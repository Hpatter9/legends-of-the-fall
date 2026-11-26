# In-app purchases (IAP): the design

The owner's decisions, final: sell summoning stones, a one-time starter pack and value bundles, cosmetics, and crowns. Summoning stays as it
is, with a clear odds table on the summon screen. Payments go through RevenueCat on top of Google Play Billing
(`@revenuecat/purchases-capacitor`). Free earn rates stay exactly as they are: buying only speeds things up, and the game stays fully
playable for free.

This note is stage 1 (the design). The director may change any price or content below; every number is a constant in `src/iapRules.ts`
once the shop is built, so a change is one line.

## The products (the owner's prices)

The owner chose "pricier" (about a third more a unit than the first draft, at the standard .99 points), a $2.99 starter, and dearer
cosmetics. Play product IDs are lowercase letters, digits and underscores, and are permanent once made in Play Console. Prices are USD
tiers; Play converts them, and the Shop shows the local price RevenueCat reports, never a price typed into the game. Every number is a
constant in `PRODUCTS` (`src/iapRules.ts`); `test/iap.test.ts` holds them to this table.

"Bonus" is against the smallest pack's rate (9 stones for $0.99; 6,000 crowns for $1.99), worked out by `bonusOf` and shown on the card.

### Summoning stones (consumable)

| Play product ID | Name | Stones | Bonus | USD | Cents a stone |
| --- | --- | --- | --- | --- | --- |
| `stones_pouch` | Pouch of stones | 9 | — | 0.99 | 11.0 |
| `stones_satchel` | Satchel of stones | 50 | +10% | 4.99 | 10.0 |
| `stones_coffer` | Coffer of stones | 108 | +19% | 9.99 | 9.3 |
| `stones_hoard` | Hoard of stones | 608 | +34% | 49.99 | 8.2 |

### Crowns (consumable)

| Play product ID | Name | Crowns | Bonus | USD |
| --- | --- | --- | --- | --- |
| `crowns_purse` | Purse of crowns | 6,000 | — | 1.99 |
| `crowns_chest` | Chest of crowns | 19,000 | +26% | 4.99 |
| `crowns_vault` | Vault of crowns | 45,000 | +49% | 9.99 |

Crowns are worth most early: a new save earns about 400 on day one, a daily player 15,000 to 20,000 a day by month four. Crowns cannot
buy stones without limit: the chest shop's daily stock caps it at 12 stones a day (three bronze chests of 1, a silver of 3, a gold of 6),
and its price rises with the heroes owned.

### The starter pack (one per account)

| Play product ID | Type | Contents | USD |
| --- | --- | --- | --- |
| `starter_pack` | non-consumable (Play sells it once per Google account) | 100 stones, 20,000 crowns, 2 large XP tomes | 2.99 |

**Offered for 72 hours from the moment the second army is first cleared** (`noteStarter`: `clearedCount(meta) >= 2`; the clock is the
page's, kept in the save as `Meta.purchases.starterFrom`). A save already past two armies when the Shop arrives gets its 72 hours from the
first look (the home screen's, or the Shop's). The Shop's medallion wears the red pip while it is on offer, and its card counts the hours
left. Once bought it is never offered again on any phone (the entitlement `starter`). Its contents are granted once, on the purchase, like
any consumable (below).

### Bundles (consumable, buy any number)

| Play product ID | Name | Contents | USD |
| --- | --- | --- | --- |
| `bundle_recruit` | Recruit's bundle | 45 stones, 7,500 crowns | 4.99 |
| `bundle_warlord` | Warlord's bundle | 210 stones, 37,500 crowns, 4 large XP tomes | 19.99 |

### Cosmetics (non-consumable; entitlements)

Read from the game: the eight rulers (`src/rulerRules.ts`: Iron Stag, Sun Viper, Frost Witch, Ash Empress, Rose Duchess, Moon Oracle,
Storm Corsair, Gilded Necromancer) are all free picks, and Duchess has four costumes (`DUCHESS_COSMETICS` in `src/render/duchessRules.ts`:
none, Tiny Tin Crown, Wizard Hat, Archery Quiver), each earned in play. **All of these stay free.** Only new things are sold:

| Play product ID | Entitlement | What it is | USD |
| --- | --- | --- | --- |
| `look_duchess_regalia` | `duchess_regalia` | Duchess's Royal Regalia: an ermine cape and a jewelled crown | 1.99 |
| `look_duchess_knight` | `duchess_knight` | Duchess's Little Knight: a plumed steel helm | 1.99 |
| `look_duchess_lantern` | `duchess_lantern` | Duchess's Lantern: a little lantern on her horns with a ghost-light | 1.99 |
| `bundle_wardrobe` | all three above | Duchess's wardrobe | 3.99 |
| `ruler_ember` | `ruler_ember` | A ninth ruler, the Ember Sovereign (male): blackened gold armour, a mantle of embers | 6.99 |
| `ruler_starlit` | `ruler_starlit` | A tenth ruler, the Starlit Empress (female): night-blue robes sewn with stars | 6.99 |
| `look_starfall` | `starfall_summons` | Starfall summons: the summoning's card back and burst in violet and gold | 3.99 |

Each needs art the packs do not have. The director wrote the prompts into one ChatGPT batch on `art/round-2` (`art-source/round2/`): `shop_stones_1..4`, `shop_crowns_1..3`, `shop_starter`, `shop_bundle_recruit`, `shop_bundle_warlord`, `ruler_ember`, `ruler_starlit`, `costume_regalia`, `costume_knight`, `costume_lantern`, `starfall_cardback`, `starfall_burst`; each product names its picture (`art` in `PRODUCTS`). The owner chose to make both rulers. **A cosmetic is
only on sale once its art is in the game**: until then the Shop shows it as "Coming soon" with no price and no Buy (`ready: false`). When
one lands: set `ready: true`, let the picker that wears it (Settings, Ruler and Duchess; the summoning for Starfall) read the entitlement
(`ownedNow()` in `iapView.ts`), and show it there as "In the Shop" while not owned.

## What a paid summon costs, against free

The free rate is from `npm run unlock-pace -- --seeds 10` on 0.600.0 (a daily player of 30 to 45 minutes, the model's own pace): **about
2,860 stones in the first year, about 8 a day**, from quests (28%), the daily chest (27%), the chest shop with earned crowns (20%), the
Assault (22%) and the rest. Without the chest shop it is 2,290.

| | Stones | USD | Free, about |
| --- | --- | --- | --- |
| One summon (a stone) | 1 | 0.08 to 0.11 | 3 hours of a daily player's income |
| A ten-summon | 10 | 0.82 to 1.10 | a day and a quarter |
| Pouch | 9 | 0.99 | a day |
| Satchel | 50 | 4.99 | 6 days |
| Coffer | 108 | 9.99 | 14 days |
| Hoard | 608 | 49.99 | about 78 days |
| Starter pack | 100 (and 20,000 crowns) | 2.99 | 13 days |

What a stone buys changes as the roster grows (a pull is one shard of one of the 55 pullable heroes, each equally likely; the shards a hero
needs to join rise from 1 to 100): free, the 20th hero comes on about day 80 and the 30th on day 170, so the 20th to the 30th take about
70 stones each, **about $6.50 to $7.70 a hero** in the middle of the game at pack rates, more late. One stone in a hundred is a whole hero
outright.

## The odds table (from the sim's real rates)

A stone (`pullOnce`, `src/sim/meta.ts`; `drawKind`, `src/sim/unlock.ts`; the numbers in `src/sim/unlockRules.ts`):

| Outcome | Chance |
| --- | --- |
| A lucky summon: a whole hero you do not own joins at once, each such hero equally likely | 1 in `LUCKY_ODDS` = **1%** (each of N heroes not owned: 1% / N) |
| (every pullable hero owned) the lucky summon is 10 rank shards of one hero instead | 1% |
| One shard of one hero: any pullable hero, or a content hero you own (not a Mythic), each equally likely | **99%** (each of the P heroes in the pool: 99% / P) |
| The pity: after `pityAt(owned)` stones in a row with no new-hero shard, the shard is the hero closest to joining | replaces the even draw for that one stone |

For a new save with five heroes the pool is 55: each hero's shard is 1.8%, and each of the 50 not owned has a 0.02% lucky summon. The
odds sheet computes this for the player's own save (their pool, who they own, whether the pity is due), from the same functions the
draw uses, and lists every outcome with its chance; the rows sum to 100%.

**The chest shop's chests are paid random items too** once crowns can be bought (Play counts items bought with a currency that can be
bought). So the odds sheet also lists each chest's contents (`SHOP` in `chestShop.ts`, `TOME_DROPS` in `tomes.ts`, `CHEST_BOOK_ODDS` in
`books.ts`, `QUALITY_WEIGHTS` in `equipment.ts`):

| Chest | Stones | XP tomes | Rare skill book | Gear | Gear rarity (Common / Rare / Epic / Legendary / Mythic) |
| --- | --- | --- | --- | --- | --- |
| Bronze | 1 | 1 small, 30% a second | none | 15% | 70 / 25 / 5 / 0 / 0 |
| Silver | 3 | 2 small, 40% a medium | 5% | 60% | 30 / 42 / 23 / 5 / 0 |
| Gold | 6 | 2 small, 1 medium, 25% a large | 15% | always | 5 / 28 / 48 / 16 / 3 |

Every product sold for money has fixed contents: nothing sold for money is itself random.

## The odds sheet (built, stage 2)

An **Odds** button sits in the Summoning Sanctum's corner, between the chest shop and the Pact Gallery, in every build (the odds are worth
knowing whether or not stones can be bought). It opens a standard ornate sheet (`oddsView.ts`):

- **A summoning stone**: the lucky summon and the shard, and "In all" 100%, with a sentence each on what they mean.
- **Each hero**: every hero a stone can land on with its shard chance and its lucky-summon chance, for this save (heroes owned ticked).
  When the pity is due the sheet says so, and every shard goes to the hero closest to joining.
- **Chest shop chests**: each chest's contents with their chances, and its gear's rarity table.

The numbers are `summonOdds.ts`, which calls the draw's own functions (`drawPool`, `pityDue`, `closestTied`, newly exported from
`sim/unlock.ts` with `drawKind` rewritten to use them, so the draw itself is unchanged: the same stream, the same picks) and reads
`LUCKY_ODDS`, `SHOP`, `TOME_DROPS`, `CHEST_BOOK_ODDS` and `QUALITY_WEIGHTS`. `test/summon-odds.test.ts` checks the table sums to 100%, that
it equals the sim's rates (20,000 real first stones across 20,000 saves land within a few standard deviations of each listed chance, and on
no hero it does not list), the pity case, the every-hero-owned case, and the chests against their tables.

## The Shop (built, stage 3)

- **Where**: a coin medallion beside the trophy on the home screen's top row (`#hmShop`), in a build with a provider only. It opens
  `openTreasury` (`iapView.ts`): a standard ornate sheet, "The Treasury" over "Shop", with four sections (Summoning stones, Crowns, Bundles
  and starter, Cosmetics). Each item shows a picture (a plain stand-in from the menu icons until its art (`art`, from `art/round-2`) is copied in), its contents, its bonus,
  and the local price from the store. The foot has "‹ Back" and **Restore purchases**. A line at the end says everything has fixed
  contents, where the odds are, and that the game is whole without buying.
- **Providers** (`purchases.ts`): one interface (`start`, `products`, `buy`, `restore`, `customer`), two makers.
  - `revenueCatProvider`: `@revenuecat/purchases-capacitor` 11.3.3 (the last line for Capacitor 7; 12 and on need Capacitor 8),
    `configure` with the build's key, `getProducts` (one-time products), `purchaseStoreProduct`, `restorePurchases`, `getCustomerInfo`
    (active entitlements, and the one-time transactions). The plugin is imported only in the Play build: in every other build the branch is
    folded away before bundling (checked: the web build's `game.js` has none of it).
  - `fakeProvider`: prices from the catalogue in dollars, every purchase succeeds unless told to fail or be cancelled, non-consumables
    become entitlements and are sold once, its record kept under `legends.fakeStore` so a reload or "Start over" can be restored from.
- **Who gets a Shop** (`providerFor`): the Play build inside the app (RevenueCat); the web build with `?shop=fake` (the fake store). No
  one else: not the web page, not the GitHub release's app, not the Play build in a browser. The medallion starts `hidden` in the page.
- **Granting** (`iapRules.ts`, the page layer): `grantPurchase` adds stones, crowns and tomes to the meta and marks the transaction in
  `Meta.purchases.granted`; a transaction already there grants nothing. The page saves at once with `saveMeta` (the guarded save: a full
  storage returns false and the game plays on from memory; the next save keeps it). Nothing under `src/sim` imports the Shop (a test
  scans it); fights are untouched.
- **A purchase left half done** (the app closed between Google's payment and the grant): on each start (online) the store's record is
  read and `recoverMissed` grants any transaction made since this save first met the store (`Meta.purchases.since`) and not yet granted,
  with a card saying it arrived. Older ones are never granted again, so a new save or a new phone is not paid twice for consumables.
- **Entitlements** (cosmetics, the starter's mark) are what RevenueCat says, read on each start, after a purchase and by Restore, and
  cached on the device under `legends.purchases` (`OWNED_KEY`), which is not one of "Start over"'s `SAVE_KEYS`: so they survive a save
  reset, and come back on a new phone or a reinstall through Restore (Google account to RevenueCat's anonymous user, by its restore).
- **Offline**: the Shop says "The Shop needs a connection. Everything else in the game plays offline as ever", with Restore greyed; it
  redraws itself when the connection comes or goes. Nothing else changes offline.
- **The key**: `build.mjs` defines `__RC_KEY__` from `REVENUECAT_ANDROID_KEY` for `--store play` alone (empty in every other build).
  `android.yml`'s Play bundle step passes it from the secret `REVENUECAT_ANDROID_KEY`. Without it the Play build fails safe: it has no Shop at all
  (`providerFor` asks for a non-empty key; tested), no crash. Nothing is committed.
- **Android**: `npx cap sync android` added the plugin's Gradle module (`capacitor.settings.gradle`, `capacitor.build.gradle`). The plugin
  brings Play Billing, which adds the `com.android.vending.BILLING` permission to the merged manifest.

### Tests

`test/iap.test.ts`: the products are the owner's (ids, contents, prices; cosmetics not ready; Play's id rules); a transaction is granted
exactly once (again by the same id, or by recovery, gives nothing); the grant survives a save and a reload and is not granted again; the
save-guard path (a full storage refuses without a throw, the grant stays in memory, the next save keeps it); a half-done purchase is
recovered but a new save is never paid for an old one; restore (cosmetics back on a new save, consumables not; the cache is not a save key);
a cancelled or failed purchase grants nothing; the starter's 72 hours from the second army, and bought on any phone; the Shop only in the
Play app or with `?shop=fake`; nothing under `src/sim` imports it. `test/summon-odds.test.ts`: the odds (above).

### Pictures

`node tools/iap/shots.mjs` (after `npm run web`) takes every screen at 393 x 852, 360 x 780 and 412 x 915 into `docs/samples/iap/`: the
Sanctum with its Odds button, the odds sheet (top, heroes, chests), the home screen's Shop medallion, the Shop (stones, crowns, bundles,
cosmetics), a purchase's card (and checks the stones arrived in the save), the Shop offline, and a save with two armies cleared (the
medallion's pip and the starter pack with its hours left). It fails if the web build without `?shop=fake` shows a Shop.

## The owner's answers

1. Prices: pricier, as above. 2. The starter's window: 72 hours from the second army. 3. Rulers: yes, both, with ChatGPT art; each
cosmetic "Coming soon" until its art lands. 4. Belgium: excluded in Play's country targeting; the Netherlands worth checking (see
`docs/notes/store-readiness.md`).

## Release round (IAP-2, `claude/iap-2`, on 0.613)

The owner chose to sell this week. The shop was brought onto 0.613 (merged from `claude/iap`; the conflicts were `build.mjs`'s CSS list and
the lockfile, re-made by `npm install`).

- **The round-2 art is in.** `tools/iap/art.py` cuts `art-source/round2/` (PR #666) into `src/art/treasury/`: the four stone piles and three
  crown chests on their cards, the starter's and the bundles' banners across the top of a whole-row card with the words under it, and the
  costumes, the two rulers' first idle frames and the Starfall card back as the cosmetics' pictures. Each product names its picture (`art`).
- **The cosmetics stay "Coming soon"** (not on sale) this release: the pictures exist, but wearing them is not built yet. A new ruler also
  needs its Crown Terrace figure and domain (round 2 painted only the atlases), a costume needs laying on Duchess's frames, and Starfall
  its place in the summoning's show. Selling them before they can be worn is not on.
- **The web build hides the Shop** (no medallion, no Shop tutorial on the Tutorials page). The Play build in the app shows it.
- **A missing `REVENUECAT_ANDROID_KEY` fails safe**: no Shop at all in that Play build, nothing to crash.
- **The Shop's tutorial** (`tutorialRules.ts`, `shop`, a page tutorial told the first time the Shop opens): fixed contents, where the odds
  are, and Restore. `newer`, so a veteran save meets it once too; `shopOnly`, so builds without a Shop leave it off the Tutorials page.
- **The privacy policy's contact** is the owner's, as the release branch has it.
- The Gradle check (the director's `claude/iap-gradle-check`, the APK and the Play bundle with the plugin) passed on GitHub on 14 November;
  `claude/iap-2-gradle-check` repeats it for this branch.
