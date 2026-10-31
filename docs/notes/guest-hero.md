# The guest hero (GUEST-HERO), and talent points marked in the tavern (TALENT-ARROWS)

## The guest hero

The owner's ask: "Sometimes you can hire a new hero from the store you randomly come by. That hero should be allowed as a guest hero and be
allowed as the 6th on the field, making them quite valuable." The owner's rules: the guest stays for that run only (it is never added to
the roster for good), it is an extra sixth hero on the field beyond the usual five, and one guest at a time.

### Where it is offered

"The store you randomly come by" is the **passing cart** (MID-EVENTS, `src/sim/market.ts`): the market card that turns up between an army's
or the daily's waves. It already sells a sellsword (a grade-1 hero of the party, for the bench). Now, on 60% of its visits (`GUEST_CHANCE`)
while the run has no guest, it also has a **guest** (`src/sim/guest.ts`, `drawGuest`):

- a hero from outside the run's party and roster (`guestKinds`): most are heroes the player does not own, so it is a chance to field one;
- drawn on its own side stream (`mixSeed(seed, 0x6e5e7, stage)`), so the cart's other wares, and every other draw of the run, are as they
  were (a test checks the wares come out the same);
- priced at the owner's "higher end": two and a half sellswords (`GUEST_HIRES` x (the next Hire + 10), to the nearest 5), never under
  120 gold (`GUEST_FLOOR`): 120 at a run's start (the floor; 2.5 sellswords would be 100), 175 after six hires, 250 after twelve. The cart's
  dearest ware, a buy saved up for. It counts as one of the cart's three buys, and a rummage leaves it where it is.

The cart comes at most once a run (the road never repeats a kind), so in the measured saves a run met a guest about one time in four (10% to
27% by army). Not offered: the Calamity (it hires from all 45 already and fields ten), quest battles, and an ordinary endless run (it has no
cart). The spire is gone, so its shop is not a place for it.

### What a guest is (`src/sim/guest.ts`, `Owned.guest` in `src/sim/run.ts`)

- **A sixth place.** `canJoin` counts the squad's places without the guest (`squadUsed`), and a guest always has room: five of the party's
  own plus the guest stand on the field. A sixth hero of the party's own is still refused. `takeGuest` refuses a second guest.
- **One of each still holds.** A guest is drawn from kinds the run does not have, and `canJoin` and `placeBlock` refuse a twin as for any
  hero (a test builds a guest of a fielded kind by hand and checks both refuse it).
- **Its strength.** It joins at the fielded heroes' mean grade (rounded down; `guestGrade`) and keeps it. Then (the owner's call):
  - a guest the player **owns** (`guestOwned`) brings its own lasting level, rank, talents, equipment and awakening, exactly as one of the
    player's own heroes of that kind would (`guestBoost`; its info card reads them too);
  - a guest the player does **not** own fights at the party's mean lasting level and rank, read live (`guestStanding`), so it keeps pace as
    they level, with no talents, equipment or awakening.
  Either way it may wear the run's gear like anyone.
- **Nothing lasting.** Its share of a fight's XP is taken out before the lasting XP is paid and kept on the guest itself (`splitGuestXp`,
  `Owned.xp`): the kind's level does not move, even for a guest the player owns (it is a visitor this run). It does not level in the run. It earns no bench XP. It never merges (`mergeable` in `merge.ts`) and is never recycled
  (`recycle` in `run.ts`).
- **It leaves.** When the run ends, won or lost, the last card says its farewell as a line of its own (`farewellOf`, `guestFarewell`: one
  of three by its kind, "Kerem the guest bows and leaves the party: ..."; the card's new `guest` line in `waveCard.ts`, marked ⚑). The run,
  and the guest with it, is then gone as every run's roster is.
- The greedy player (`pickSquad`) fields its five strongest and the guest besides; it never buys one (its event pick takes only free things),
  so every balance table is as it was.

Save: one optional field, `Owned.guest`. The `'guest'` event effect is new; an older save never has one.

### The page

- The cart's option shows the hero's portrait, "Guest: Kerem the Juggernaut", "fights as a sixth hero beside your five, for
  this run only", a teal **GUEST** badge and its price (`src/events.ts`). Bought, the line says "... joins you as a guest: a sixth
  hero on the field, for this run only."
- Closing the card puts the guest straight on the board beside the five (`afterEvent` in `src/main.ts`). The deploy line says "5 of 5 placed
  + guest" (`placedWords`).
- Its bench card has a teal edge and a **GUEST** badge, and no Recycle button; its info card has the tag "Guest · this run only" and reads
  none of the kind's lasting talents or gear (`src/unitInfo.ts`). Styles in the new `src/guest.css` (no animation).

### How much a guest lifts a run (measured)

`node tools/guest-hero/run.mjs orcs:1 orcs:5 undead:22 beasts:20` (48 saves a cell, single tries on Normal, the starting five, no castle, gear
or talents; the same seeds each way). "Met" is the clear rate over the runs that met a guest at the cart (how many in brackets).

| Cell | No guest (the bot as ever) | Bot buys it when the gold allows | Guest taken whenever offered | A guest from wave 1, free |
| --- | --- | --- | --- | --- |
| Orcs at level 1 | 6% (met 15% of 13) | 6% (met 15%; 0 bought) | 10% (met 31%) | 15% |
| Orcs at level 5 | 50% (met 46% of 13) | 50% (met 46%; 0 bought) | 60% (met 85%) | 75% |
| Undead at 22 | 25% (met 15% of 13) | 25% (met 15%; 0 bought) | 35% (met 54%) | 38% |
| Beasts at 20 | 19% (met 40% of 5) | 19% (met 40%; 0 bought) | 25% (met 100%) | 71% |

What it means: a guest is worth a lot. In the runs that meet one, taking it roughly doubles the clear rate (15% to 31%, 46% to 85%, 15% to
54%, 40% to 100%), and a guest from the first wave lifts Beasts at 20 from 19% to 71%. Over all runs the lift is smaller (+4 to +10 points)
because only about a quarter of runs meet the cart's guest. The table is at the owner's higher price (2.5 sellswords, at least 120): the
"taken" and "free" columns do not depend on the price and are as they were; the bot, which spends every coin on hires, now never has the
gold when the guest comes (at 1.5 sellswords it bought 17 of 44: Orcs at 5 then cleared 56%). A guest is a buy a player saves up for.

## Talent points marked in the tavern (TALENT-ARROWS)

The owner's ask: the tavern's gold upgrade chevron (TAVERN-RANKUP) marks heroes who can rank up or awaken; mark heroes with **unspent talent
points** too.

- `src/sim/upgradesReady.ts`: `talentPointsReady(m, kind)` is a hero's free talent points when they can learn a node of its tree now, else 0
  (a point that buys nothing yet, say one point with the next row costing two, is not marked, so the mark never sticks on a hero with
  nothing to do). `markReady` is a rank or awakening ready (`upgradeReady`, unchanged) or talent points. `talentList` gives the list's rows.
  `nextUpgradeKind` ("Next upgrade ›" on the hero sheet) now stops at a hero with talent points too.
- The chevron: the tavern's heroes, its Upgrades button and count, the hero sheet's strip, the party cards and the All heroes cards (tagged
  "Talents" when that is all) use `markReady`. A tap on a chevron of a hero with only talent points opens their sheet on the talent tree; a
  rank or awakening still opens the Rank up card (`src/home.ts`).
- The Upgrades list (`src/rankUpList.ts`): after the ranks and awakenings, a row for each hero with points: "Talent points: 2 to spend",
  "A choice: pick the talents yourself", and a **Spend** button (a tap on the picture too) that closes the list and opens the hero's sheet on
  the Progression tab with the talent tree already open (`drawTalents(..., open)` in `src/talentView.ts`). The header counts "1 ready · 1
  with talents". **Upgrade all** does not spend talents (they are choices); a test checks it leaves them alone.

## Files

New: `src/sim/guest.ts`, `src/guest.css`, `test/guest-hero.test.ts`, `test/talent-arrows.test.ts`, `tools/guest-hero/` (`pace.ts` and
`run.mjs` for the numbers, `card.ts` and `shots.mjs` for the screenshots). Changed: `src/sim/run.ts` (`Owned.guest`, `squadUsed`, `canJoin`,
`ownHeroes`, `recycle`), `src/sim/events.ts` (the `guest` effect, the rummage), `src/sim/market.ts` (`guestOption`),
`src/sim/merge.ts`, `src/sim/autoplay.ts`, `src/sim/upgradesReady.ts`, `src/sim/waveCard.ts` (the farewell line), `src/waveCardView.ts`, `src/jrpgRecapView.ts`, `src/main.ts`, `src/events.ts`, `src/unitInfo.ts`, `src/home.ts`,
`src/tavern.ts`, `src/party.ts`, `src/menuHeroes.ts`, `src/talentView.ts`, `src/rankUpList.ts`, `build.mjs` (the CSS).

Screenshots: `docs/samples/guest-*.png` (the cart, the line after buying, the field of six, the info card, the bench after a loss with its GUEST badge, the farewell on the last card) and
`docs/samples/talent-arrow-*.png` (the tavern, the list, the tree), at 393x852, 360x780 and 412x915.

## The owner's answers (applied)

1. Price: "higher end": 2.5 sellswords with a floor of 120 (above).
2. The Calamity: no guests there (as built).
3. A guest the player owns brings its own lasting level, talents, gear and awakening; one not owned keeps the party's level and rank. Its XP
   never reaches its lasting level.
4. Auto and auto-replay never buy a guest (as built).
5. No levelling within the run (as built).
