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
- priced at one and a half sellswords (`GUEST_HIRES` x (the next Hire + 10), to the nearest 5): 60 gold at a run's start, 105 after six hires,
  150 after twelve; dear (the cart's dearest ware), but within reach of a party that kept a wave's pay back. It counts as one of the cart's
  three buys, and a rummage leaves it where it is.

The cart comes at most once a run (the road never repeats a kind), so in the measured saves a run met a guest about one time in four (10% to
27% by army). Not offered: the Calamity (it hires from all 45 already and fields ten), quest battles, and an ordinary endless run (it has no
cart). The spire is gone, so its shop is not a place for it.

### What a guest is (`src/sim/guest.ts`, `Owned.guest` in `src/sim/run.ts`)

- **A sixth place.** `canJoin` counts the squad's places without the guest (`squadUsed`), and a guest always has room: five of the party's
  own plus the guest stand on the field. A sixth hero of the party's own is still refused. `takeGuest` refuses a second guest.
- **One of each still holds.** A guest is drawn from kinds the run does not have, and `canJoin` and `placeBlock` refuse a twin as for any
  hero (a test builds a guest of a fielded kind by hand and checks both refuse it).
- **Its strength is the party's.** It joins at the fielded heroes' mean grade (rounded down; `guestGrade`) and fights at their mean lasting
  level and rank, read live (`guestStanding`, `guestBoost`), so it keeps pace as they level. None of its kind's lasting equipment, talents or
  awakening count (those are the player's own heroes'). It may wear the run's gear like anyone.
- **Nothing lasting.** Its share of a fight's XP is taken out before the lasting XP is paid and kept on the guest itself (`splitGuestXp`,
  `Owned.xp`): the kind's level does not move. It earns no bench XP. It never merges (`mergeable` in `merge.ts`) and is never recycled
  (`recycle` in `run.ts`).
- **It leaves.** When the run ends, won or lost, `finish` puts its farewell on the last card's lines (`guestFarewell`, one of three by its
  kind: "Kerem the guest takes the road home: ..."). The run, and the guest with it, is then gone as every run's roster is.
- The greedy player (`pickSquad`) fields its five strongest and the guest besides; it never buys one (its event pick takes only free things),
  so every balance table is as it was.

Save: one optional field, `Owned.guest`. The `'guest'` event effect is new; an older save never has one.

### The page

- The cart's option shows the hero's portrait, "Guest: Kerem the Juggernaut", "fights as a sixth hero beside your five, at your party's
  level, for this run only", a teal **GUEST** badge and its price (`src/events.ts`). Bought, the line says "... joins you as a guest: a sixth
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
| Orcs at level 1 | 6% (met 15% of 13) | 6% (met 15%; 5 bought) | 10% (met 31%) | 15% |
| Orcs at level 5 | 50% (met 46% of 13) | 56% (met 69%; 5 bought) | 60% (met 85%) | 75% |
| Undead at 22 | 25% (met 15% of 13) | 25% (met 15%; 5 bought) | 35% (met 54%) | 38% |
| Beasts at 20 | 19% (met 40% of 5) | 19% (met 40%; 2 bought) | 25% (met 100%) | 71% |

What it means: a guest is worth a lot. In the runs that meet one, taking it roughly doubles the clear rate (15% to 31%, 46% to 85%, 15% to
54%, 40% to 100%), and a guest from the first wave lifts Beasts at 20 from 19% to 71%. Over all runs the lift is smaller (+4 to +10 points)
because only about a quarter of runs meet the cart's guest. The bot, which spends every coin on hires, can afford the guest only about two
times in five when it comes; a player who keeps some gold back will do better.

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
`ownHeroes`, `recycle`, `finish`), `src/sim/events.ts` (the `guest` effect, the rummage), `src/sim/market.ts` (`guestOption`),
`src/sim/merge.ts`, `src/sim/autoplay.ts`, `src/sim/upgradesReady.ts`, `src/main.ts`, `src/events.ts`, `src/unitInfo.ts`, `src/home.ts`,
`src/tavern.ts`, `src/party.ts`, `src/menuHeroes.ts`, `src/talentView.ts`, `src/rankUpList.ts`, `build.mjs` (the CSS).

Screenshots: `docs/samples/guest-*.png` (the cart, the line after buying, the field of six, the info card, the farewell) and
`docs/samples/talent-arrow-*.png` (the tavern, the list, the tree), at 393x852, 360x780 and 412x915.

## Questions for the owner

1. Price: one and a half sellswords (60 to 150 gold). Dearer, or a fixed price?
2. Should the Calamity's shop (or its recruit spots) offer guests too? The Calamity fields ten and hires from all 45 already, so it was left
   out.
3. The guest fights at the party's mean level and rank, without its kind's own talents or equipment. Should a guest the player owns bring its
   own level, talents and gear instead?
4. Should the greedy player (Auto, auto-replay) buy a guest when it can? It does not now, so the balance tables are unchanged.
5. The guest's run XP is kept on the guest, but it changes nothing (its level is the party's). Should it level within the run instead, and
   should the run's end results list it?
