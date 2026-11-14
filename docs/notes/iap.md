# In-app purchases (IAP): the design

The owner's decisions, final: sell summoning stones, a one-time starter pack and value bundles, cosmetics, and crowns. Summoning stays as it
is, with a clear odds table on the summon screen. Payments go through RevenueCat on top of Google Play Billing
(`@revenuecat/purchases-capacitor`). Free earn rates stay exactly as they are: buying only speeds things up, and the game stays fully
playable for free.

This note is stage 1 (the design). The director may change any price or content below; every number is a constant in `src/iapRules.ts`
once the shop is built, so a change is one line.

## The products

Play product IDs are lowercase letters, digits and underscores, and are permanent once made in Play Console. Prices are suggested USD
tiers; Play converts them to local prices, and the shop shows the local price RevenueCat reports (never a price typed into the game).

"Bonus" is measured against the smallest stone pack's rate: 12 stones for $0.99.

### Summoning stones (consumable)

| Play product ID | Name | Stones | Bonus | USD | Cents a stone |
| --- | --- | --- | --- | --- | --- |
| `stones_pouch` | Pouch of stones | 12 | — | 0.99 | 8.3 |
| `stones_satchel` | Satchel of stones | 66 | +10% | 4.99 | 7.6 |
| `stones_coffer` | Coffer of stones | 144 | +20% | 9.99 | 6.9 |
| `stones_hoard` | Hoard of stones | 810 | +35% | 49.99 | 6.2 |

### Crowns (consumable)

| Play product ID | Name | Crowns | Bonus | USD |
| --- | --- | --- | --- | --- |
| `crowns_purse` | Purse of crowns | 8,000 | — | 1.99 |
| `crowns_chest` | Chest of crowns | 25,000 | +25% | 4.99 |
| `crowns_vault` | Vault of crowns | 60,000 | +50% | 9.99 |

Crowns are worth most early: a new save earns about 400 on day one, a daily player 15,000 to 20,000 a day by month four (the armies'
replays pay by tier). So crowns sell to newer players, and three packs are enough. Crowns cannot buy stones without limit: the chest shop's
daily stock caps it at 12 stones a day (three bronze chests of 1, a silver of 3, a gold of 6), and its price rises with the heroes owned.

### The starter pack (one per account)

| Play product ID | Type | Contents | USD |
| --- | --- | --- | --- |
| `starter_pack` | non-consumable (Play sells it once per Google account) | 100 stones, 20,000 crowns, 2 large XP tomes | 1.99 |

About four times the stone pouch's rate, plus crowns and tomes. **Offered for 72 hours from the moment the second army is first cleared**
(`clearedCount(meta) >= 2`, about the end of the first session or the second; the clock is the page's, kept in the save's purchase
record). A save already past that point when the shop arrives gets its 72 hours from the first time it opens the shop. Once bought it is
gone for good (the entitlement `starter` says so, and restores on a new phone, so it is not offered again). The contents are granted once,
on the purchase, like any consumable (below).

### Bundles (consumable, buy any number)

| Play product ID | Name | Contents | USD | Worth at pack rates |
| --- | --- | --- | --- | --- |
| `bundle_recruit` | Recruit's bundle | 60 stones, 10,000 crowns | 4.99 | about 7.50 (+50%) |
| `bundle_warlord` | Warlord's bundle | 280 stones, 50,000 crowns, 5 large XP tomes | 19.99 | about 31 (+55%) |

### Cosmetics (non-consumable; entitlements)

Read from the game: the eight rulers (`src/rulerRules.ts`: Iron Stag, Sun Viper, Frost Witch, Ash Empress, Rose Duchess, Moon Oracle,
Storm Corsair, Gilded Necromancer) are all free picks, and Duchess has four costumes (`DUCHESS_COSMETICS` in `src/render/duchessRules.ts`:
none, Tiny Tin Crown, Wizard Hat, Archery Quiver), each earned in play. **All of these stay free.** Only new things are sold:

| Play product ID | Entitlement | What it is | USD |
| --- | --- | --- | --- |
| `look_duchess_regalia` | `duchess_regalia` | Duchess's Royal Regalia: an ermine cape and a jewelled crown | 0.99 |
| `look_duchess_knight` | `duchess_knight` | Duchess's Little Knight: a plumed steel helm and a tabard | 0.99 |
| `look_duchess_lantern` | `duchess_lantern` | Duchess's Lantern: a little lantern on her horns with a ghost-light | 0.99 |
| `bundle_wardrobe` | all three above | Duchess's wardrobe | 1.99 |
| `ruler_ember` | `ruler_ember` | A ninth ruler, the Ember Sovereign (male): blackened gold armour, a mantle of embers | 4.99 |
| `ruler_starlit` | `ruler_starlit` | A tenth ruler, the Starlit Empress (female): night-blue robes sewn with stars | 4.99 |
| `look_starfall` | `starfall_summons` | Starfall summons: the summoning's card back and burst in violet and gold | 2.99 |

Each needs art the packs do not have (prompts: `docs/notes/iap-art-prompts.md`). **A cosmetic is only on sale once its art is in the game**:
until then the shop shows it as "Coming soon" with no Buy button (`ready: false` in the catalogue). A ruler is the largest job (the eight
painted rulers each have idle, walk, strike, cast, hurt, dead, seated and command frames and a portrait); a Duchess costume is one small
overlay sheet.

## What a paid summon costs, against free

The free rate is from `npm run unlock-pace -- --seeds 10` on 0.600.0 (a daily player of 30 to 45 minutes, the model's own pace): **about
2,860 stones in the first year, about 8 a day**, from quests (28%), the daily chest (27%), the chest shop with earned crowns (20%), the
Assault (22%) and the rest. Without the chest shop it is 2,290.

| | Stones | USD | Free, about |
| --- | --- | --- | --- |
| One summon (a stone) | 1 | 0.06 to 0.08 | 3 hours of a daily player's income |
| A ten-summon | 10 | 0.62 to 0.83 | a day and a quarter |
| Pouch | 12 | 0.99 | a day and a half |
| Satchel | 66 | 4.99 | 8 days |
| Coffer | 144 | 9.99 | 18 days |
| Hoard | 810 | 49.99 | about 100 days |
| Starter pack | 100 (and crowns) | 1.99 | 12 days |

What a stone buys changes as the roster grows (a pull is one shard of one of the 55 pullable heroes, each equally likely; the shards a hero
needs to join rise from 1 to 100): free, the 20th hero comes on about day 80 and the 30th on day 170, so the 20th to the 30th take about
70 stones each, **about $4.50 to $5.50 a hero** in the middle of the game at pack rates, more late. One stone in a hundred is a whole hero
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

## How it fits the game (stages 2 and 3)

- **Grants are in the page and meta layer** (`src/iapRules.ts`, pure; `src/purchases.ts`, the providers; `src/iapView.ts`, the page). The
  sim is not touched: a grant adds stones, crowns or tomes to the meta and saves it through the guarded save, like a chest. Fights play
  out exactly as before.
- **Each transaction is granted once**: its ID is kept in the meta (`Meta.purchases.granted`) and a purchase whose ID is there grants
  nothing. A purchase interrupted before its grant (the app killed) is picked up on the next start from RevenueCat's list of the
  account's transactions, but only one made after this save first met the store (`Meta.purchases.since`), so a new save or a new phone is
  never paid again for old consumables.
- **Non-consumables come from RevenueCat's entitlements** (the cosmetics, and the starter's "bought" mark), read on each start and by
  "Restore purchases". They are kept under their own key (`legends.purchases`), which "Start over" does not wipe, so they survive a save
  reset and come back on a new phone.
- **Only the Play build sells** (`__STORE__ === 'play'`). The web page and the GitHub release's app show no Shop. `?shop=fake` gives a fake
  provider on the web build for tests and pictures (no money, no network).
- **Offline**: the game plays on; the Shop says it needs a connection.
- **The key**: RevenueCat's public Android SDK key comes from `REVENUECAT_ANDROID_KEY` at build time (a GitHub secret passed to the Play
  bundle's step). Nothing is committed.

## For the owner to decide (the director's call)

1. The prices and contents above.
2. The starter pack's window (72 hours from the second army) and contents.
3. Whether the two new rulers (the largest art job) are worth making, or the cosmetics start with Duchess's three and Starfall.
4. Whether to leave out countries that restrict paid random items (Belgium, and the Netherlands' stance in flux): see the policy note
   (stage 5, `docs/notes/store-readiness.md`).
