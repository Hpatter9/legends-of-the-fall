# Hero shards: unlocking heroes is much harder

The owner's ask: "make it harder to unlock units. Much harder." Chosen: shards to unlock, ten heroes earned by content,
and about six months or more for a daily player to own all 45.

## The rules

- **Starter heroes** are owned outright (the three of the pack). A pack never offers a hero earned by content.
- **A pull is one shard of one hero** (`pullOnce`, `unlock.ts`), at the flat price of 100 crowns (900 for ten). A hero **not owned**
  gets an *unlock shard* (`Meta.unlock`, kept apart from the rank shards in `Meta.shards`); it joins at rank 0 when it has
  `unlockNeed` of them. A hero **owned** gets a rank shard, exactly as a repeat did (then awakening, talents, then `OVERFLOW_CROWNS`).
- **Shards needed rise with the heroes owned** (`unlockNeed(owned)`, owned = pullable heroes, the starter's three count): `NEED_FIRST`
  2 for the first, `NEED_LAST` 100 for the last, on a curve (`t^1.6`). The bar shows the need now, so it can grow when another hero joins.
- **The odds fade** (`drawKind`, `ownedWeight`): each hero owned beyond the starter's three makes every hero owned likelier to be drawn
  (weight `1 + OWNED_BOOST x (owned-3)^OWNED_POW`, 2 and 2.2). So new heroes turn up less and less as the roster grows, and most late
  pulls are rank shards: crowns stay useful for ranks, awakening and talents. Why not a price: crown income is about 400 on day 1
  and 15-20k a day by month 4 (the armies' replays pay by tier), so any flat price gates nothing late; the odds do. The price is
  never touched, so the castle, gear, spells and talents are not slowed (they cost about 13k crowns in all).
- **Begun heroes are likelier** (`STICKY` 6: weight `1 + 6 x shards held`), so bars fill instead of 30 bars creeping.
- **The pity** (`PITY_PULLS` 3, `PITY_GROW` 6): after `3 + 6 x (owned-3)` pulls in a row that gave no unlock shards, the next one is
  shards of the hero closest to joining (most shards; a tie by a side stream, `PITY_SALT`). Early it is 3 pulls, so the first heroes
  come fast; late it is long, so it is only a floor. It replaces `NEW_PITY`. `Meta.unlockDry` counts it (the old `sinceNew` is kept in the
  save but no longer used).
- **Chests** (`armyStars.ts`, `lootOf`): the shards a chest rolls and its hero draw are unlock shards for a hero not owned (a plain
  draw `CHEST_HERO_SHARDS` 2, a gold chest's prize `CHEST_PRIZE_SHARDS` 5), rank shards for one owned (2, as before). No chest
  recruits a whole hero any more. `rollChest` is unchanged (so every chest rolls what it did); a content hero it lands on that is not
  owned is swapped for a pullable one by a side stream of the chest's seed (`swapContent`).
- **Saves**: `Meta.unlock` and `Meta.unlockDry` are optional. Heroes owned stay owned and nothing is taken away; an old save plays on
  under the new rules for the heroes it lacks. On load a content hero whose milestone the save has already reached joins
  (`grantContent`), and one already owned stays.

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

A model of a daily player of 30 to 45 minutes: the daily challenge (300 crowns), 13 army runs a day (10 auto and 3 by hand) on the best
tier cleared, one tower climb a day (6 floors growing to 45), the first-clear and star chests (opened with the real `openChest`), a
calamity a week from day 70 (a level higher every 4 weeks), about 900 crowns of achievements and codex, and the milestones at a plausible
pace (Normal clears on days 1, 4, 8, 13, 19, 26, 34, 43, 53; Hard clears from day 12 to 112, Elite from day 40 to 190). It plays the real
rules on a real Meta. Pulls use 90% of the crowns once the castle is paid (30% of income goes to it while it is unbuilt, 13k in all).
Every number is a constant in the tool. (An earlier version of the tool charged each pull twice; the numbers here are from the fixed one.)

Day reached, median of 30 seeds. Typical is 13 army runs a day; light is 6, heavy is 20.

| Heroes | Typical | Light | Heavy |
| --- | --- | --- | --- |
| 5 | 1 (the first session) | 1 | 1 |
| 10 | 10 (8 to 14) | 13 | 8 |
| 20 | 40 | 46 | 35 |
| 30 | 75 | 84 | 70 |
| 40 | 125 | 141 | 112 |
| 45 | 186 | 186 | 186 |

Heroes owned on day 1 / 3 / 7 / 14 / 30 / 60 / 90 / 120 / 150 / 180 (typical): 5, 6, 7, 11, 17, 26, 34, 39, 42, 44 (all 45 on day 186).
Light: 5, -, 7, -, 14, 23, 31. Heavy: 6, -, 8, -, 18, 27, 35. Every pullable hero (35) is owned by day 144 for a typical player (165 light,
130 heavy); the last content hero (the Tyrant, tower floor 40) comes on day 186 in the model, so the content milestones set the end
and the shards the middle.

Thresholds and base odds by roster size (the odds are those of a pull being an unowned hero's shard before the begun-hero and pity
effects, which lift them early):

| Pullable owned | Shards for the next | Base odds of a new-hero shard |
| --- | --- | --- |
| 3 | 2 | 91% |
| 5 | 3 | 37% |
| 6 | 4 | 17% |
| 8 | 7 | 4.6% |
| 10 | 11 | 1.7% |
| 14 | 21 | 0.4% |
| 18 | 33 | 0.1% |

Late pulls are almost all rank shards, so the pity (every 3 + 6 x (owned-3) dry pulls) and the begun-hero weight carry the last
heroes. A typical player makes a great many pulls late in the model (hundreds a day): crowns are plentiful, and the odds, not the
crowns, are the gate.

The first session: a new save has about 900 crowns of the first clear, the daily and the chests; with `STICKY` 6 the first two heroes
(2 shards each) come in a median of 7 pulls (90% within 10), so five heroes are there in the first session.

## Tests (`test/hero-shards.test.ts`)

Thresholds; a bar filling and the hero joining at rank 0; pulls (unlock shards or rank shards, never a content hero, a first session
reaching five); the flat price; the fading odds and the growing pity; the content milestones, each once; chest shards and the content
swap; an old save keeping its heroes (and mending a bad `unlock`); determinism; the lock line.

Tests changed because they encoded the old "a pull unlocks a hero at once / `NEW_PITY`" rule: `meta.test.ts` (the "fair helper" and
"a new kind unlocks" tests are replaced by `hero-shards.test.ts`), `shards.test.ts` (a pull of a hero not owned gives unlock shards; and
a hero at the shard cap pays crowns, which the fading odds now make common), `awaken.test.ts` ("a repeat always has a use" skips unlock
pulls by `p.unlock`, not `p.isNew`), `armyStars.test.ts` (a chest's hero draw gives shards, not a whole hero), `starter.test.ts` (packs
offer every pullable hero and no content hero).

## Open points

- Content heroes get rank shards (not unlock shards) from pulls and chests once owned, or they could never rank up.
- With a flat price and fading odds, a late player can pull hundreds of times a day (the model does); the recruit page has only ×1 and ×10.
- The pace model's milestone days and the income are guesses; change the constants in `tools/unlockPace.ts`.
- The owner chose this rule (fading odds, flat price) over a rising price and a daily limit.

> **Daily chest (`docs/notes/daily-goal.md`):** a cleared daily adds a chest (3 shards, now and then a hero draw). The model now plays the daily at a 70% clear rate with that chest; the 45th hero stays at day 186, the middle heroes come a little earlier (10 heroes day 8, 20 on day 36, 30 on day 70, 40 on day 112).
