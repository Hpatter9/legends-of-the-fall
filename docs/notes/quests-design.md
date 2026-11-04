# Quests 3: star ratings, harder quests and dearer summons (design)

> **A design for the owner to approve.** No game code has been changed. The numbers are measured where it says so and a first
> tuning everywhere else. The questions are at the end, each with a recommendation.

The owner's asks:

- "Add more quests. And let's implement a star rating system for difficulty. Then let's make sure to have quests of varying
  difficulties and lengths."
- "The summons should be so much harder to get. These quests are incredibly easy. Up the difficulty/complexity substantially."

In short, the design proposes:

1. **Stars from 1 to 5 on every quest**, each star tied to a measured win rate at the level where the quest opens, plus a separate
   **length tag** (Short, Long, Chain, Campaign).
2. **Harder goals**: several objectives in one quest, everything in one run, no hearts spent, real-day time limits and streaks, and
   restrictions (no ultimates, no hires, a level cap, your best hero benched). Quest battles get rules of their own: protect, survive,
   race and spare.
3. **Summons cost far more.** Year one drops from about **7,300** stones to about **3,000**. The 35th pullable hero comes on about
   **day 300**, not day 155. The cut falls mostly on the chest shop and the spire, because quests pay only a tenth of today's stones.
4. **Quest pay set by stars**: ★1 and ★2 quests pay no stones at all; the stones go to ★3 to ★5.
5. **85 new quests**, sketched by theme, plus a retune of the 149 one-off quests that already exist, to reach a planned spread of
   stars and lengths.
6. **"Take me there"**: every goal maps to a place through a pure `questPlace`, so the other worker's button has one source to read.

---

## 1. What I measured

### Where stones come from today

This is the unlock-pace model (`tools/unlockPace.ts`, 10 seeds, a typical daily player) with a per-source ledger added in a scratch
copy. The model leaves quests out, so I modelled them from the quest data (next table) at about 2.4 stones a day until day 200 and 1 a
day after that. Codex entries are set to zero, since they are being cut to milestones only. Mean stones per save:

| Source | Day 1 | Days 2-7 | 8-30 | 31-90 | 91-180 | 181-365 | Year | Share |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Chest shop | 7 | 11 | 108 | 412 | 770 | 1,772 | 3,080 | 42% |
| Spire chests (a climb a day) | 0 | 0 | 19 | 136 | 434 | 1,436 | 2,025 | 28% |
| Daily chest | 2 | 15 | 46 | 122 | 184 | 395 | 762 | 10% |
| Quests (all kinds, modelled) | 2 | 14 | 56 | 144 | 216 | 213 | 645 | 9% |
| Calamity clear and chest | 0 | 0 | 0 | 27 | 141 | 504 | 672 | 9% |
| Achievements and codex milestones | 0 | 2 | 9 | 24 | 24 | 0 | 59 | 1% |
| Army first-clear and star chests | 2 | 2 | 10 | 19 | 11 | 1 | 45 | 1% |
| **All** | **13** | **44** | **248** | **884** | **1,780** | **4,321** | **~7,290** | |
| *(codex entries, being cut)* | 8 | 10 | 18 | 23 | 19 | 0 | 78 | |
| *(army drops: hero shards, not stones)* | 1 | 4 | 11 | 24 | 38 | 85 | 162 | |

On that model the 10th pullable hero comes on day 16 to 18, the 20th on day 77 to 82, and the 35th (the last) on day 154 to 157.

**Quests are not where the stones come from.** The chest shop and the spire give 70% of them. Re-pricing quests alone would barely
slow summons down.

### What quests pay today (from `QUESTS` and `CHAINS`)

| Kind | Count | Stones (chests counted at their stones) | Hero shards | Crowns |
| --- | --- | --- | --- | --- |
| Unique quests (batch 1b) | 100 | 157 | 25 | 34,960 |
| Battle quests (batch 2) | 11 | 19 | 2 | 4,420 |
| Hero tale parts | 26 | 41 (and 10 heroes) | 0 | 7,950 |
| Lost techniques | 12 | 26 (and 4 books) | 0 | 11,700 |
| Eidolon chain parts and bindings | 18 + 6 | 36 (bronze chests, gold on binding) | 0 | 0 |
| Repeatables | 30 | 20 for one of each (0.67 a hand-in) | 0 | 2,780 |

Together that is about 280 stones once, plus about 1 to 2 a day from repeatables.

### How hard and how long the current quests are

These are the 149 one-off quests (uniques, battles, tales, lost techniques), sized in army waves using rough rates: about 8 foes a
wave, two bosses in a 15-wave run, and a run taking about 10 minutes.

| Size | Quests | With any rider |
| --- | --- | --- |
| 3 waves or fewer | 60 | 22 |
| 4 to 8 waves | 53 | 29 |
| 9 to 15 waves (one army run) | 19 | 10 |
| 16 to 45 waves (2 to 3 runs) | 15 | 2 |
| More | 2 | 0 |

**76% of quests finish inside half an army run, and most of them inside fights the player already wins.** A quest opens when a
milestone has passed (an army cleared, level 30) and then asks for that army's waves again on Normal. The commonest goals are "win 3
waves", "fell a boss again" and "fell 40 foes". Only about 40% carry a rider such as flawless, quick, with a hero or only a trait.
Since the player is past the level the quest was written for, the ordinary quests win close to 100% of the time. That matches the
owner's "incredibly easy".

**The Eidolon chains** (the great summons) are just as light. In every chain, part 1 is "beat this army's boss again", and part 3 is
one easy tally ("5 waves with no spell", "6 ultimates", "take 25,000 damage"). Only the quest battle and the trial are real fights.
The trials were measured at 22% to 49% where they open, and the chain battles at 62% to 83% (the chain notes).

**Quest battles, measured again today** (`npm run quest-rate`, 10 tries each, the tool's greedy party with no talents or gear):

| Battle | At its army's level | Five levels above | Measured at batch 2 (five above) |
| --- | --- | --- | --- |
| Two Blades on the Bridge | 0% | 10% | 45% |
| Salt and Cannon | 0% | 20% | 60% |
| The Kiln Road | 0% | 0% | 55% |
| The Frozen Meadow | 0% | 10% | 60% |
| Under the Courtyard | 0% | 0% | 45% |
| What Knocks Below | 0% | 10% | 55% |
| The Swept Floor | 20% | 30% | 60% |
| The Audit | 0% | 0% | 65% |
| The Midnight Recital | 10% | 20% | 50% |
| Karnok's Door | 10% | 20% | 40% |
| Eidolon trials (Nivra to Vaelkhar), army level | 0 to 80% | | |
| Hero tale and lost-technique battles, army level | 0% | | (30 to 55% where they open) |

The probe's party has fallen behind the game: heroes, talents and foes have all changed since batch 2. Its numbers are now far below
both the old table and what players see (the owner finds quests easy, since real saves bring talents, gear, relics and many more
levels). **Stars must not be calibrated on this probe.** Batch Q1 builds a save-like probe first (section 9).

---

## 2. The star rating

### What a star means

A quest's stars measure **difficulty only**. Length is a separate tag (below), so a short quest can be hard and a long one easy. The
stars are measured against **the opening level**: the hero level a typical save has on the day the quest's need first holds (taken
from the army-pace days, for example the Orcs cleared at about level 6 and the Labyrinth at about 35).

| Stars | Name | Win rate of its hardest fight, at the opening level | Level to be comfortable | What it asks |
| --- | --- | --- | --- | --- |
| ★ | Errand | 90% or more | the opening level | fights you already win; no rider, or one soft one ("with Kwame") |
| ★★ | Task | 70 to 90% | the opening level | one real rider (a tier up, only one trait, at most 3 heroes) or a bigger count |
| ★★★ | Trial | 45 to 70% | +5 levels | a hard rider (a boss flawless, no spells, quick), or two objectives at once |
| ★★★★ | Ordeal | 25 to 45% | +10 levels, or a tier up | one-run goals, no hearts, a level cap, quest battles with rules |
| ★★★★★ | Legend | 10 to 25% | +15 levels, the top tiers, deep Last Stand or Calamity | several hard objectives at once, campaign finales, Eidolon trials |

A quest with no single fight (a tally, a streak) is rated by its riders and by the fight it is most likely to be lost in. For example,
"take 25,000 damage in one fight without a heal" is rated by that fight.

### Length (shown beside the stars)

| Tag | Means | Rough play time |
| --- | --- | --- |
| **Short** | one sitting, one army run or less | 5 to 15 minutes |
| **Long** | 2 to 6 runs, may span days (a big count, a streak, a time limit) | 1 to 4 sittings |
| **Chain** | 2 to 4 parts in order, each with its own story beat | 2 days to a week |
| **Campaign** | 5 to 8 parts, a story with a finale battle, usually rising in stars | 1 to 3 weeks |

### How a quest gets its stars

- **Authored, then checked.** Each quest's data carries `stars` and `length`. A pure `starEstimate(q)` adds up weights: the goal's size
  measured against the opening level, each rider's weight (flawless +1, one run +1, no hearts +1, level cap +1 to +2, several
  objectives +1 each beyond the first, a tier above the opening tier +1 a tier), and for a battle quest its measured win rate. A test
  keeps every authored star within one of the estimate.
- **Measured where it can be.** A new `npm run quest-stars` plays the hardest fight of each quest (quest battles, boss waves with their
  riders) with a save-like party at the opening level, and prints the band each one falls in. The battles' `ease` is tuned to the
  middle of their band.

### Where the stars show

- The board's rows: the stars (gold, the unfilled ones dim) and the length tag under the title, as in "★★★☆☆ · Chain, 3 parts ·
  Level 34+". The board can be sorted by stars (easiest first by default) and filtered by length.
- The giver's card and the hand-in: the stars beside the title, and the reward under them, so the player sees that a hard quest pays
  better.
- The Active tab and the tracked chip: the stars, small. A timed quest shows its days left ("2 days left").
- A quest above the player's comfortable level warns once on Take: "This is a ★★★★★ quest: most heroes will want level 60 or more."
  The player can still take it.

---

## 3. A planned spread of difficulty and length

The target for all one-off quests once the retune and the 85 new ones are in (about 234):

| | Short | Long | Chain (parts) | Campaign (parts) | All | Share |
| --- | --- | --- | --- | --- | --- | --- |
| ★ | 30 | 10 | 0 | 0 | 40 | 17% |
| ★★ | 30 | 22 | 8 | 0 | 60 | 26% |
| ★★★ | 22 | 22 | 20 | 6 | 70 | 30% |
| ★★★★ | 10 | 10 | 14 | 10 | 44 | 19% |
| ★★★★★ | 4 | 2 | 4 | 10 | 20 | 8% |

- ★1 quests sit almost all in the first two weeks (the Orcs to the Beast Packs) and teach the system. Late in the game the board is
  mostly ★3 to ★5.
- Every stage of a save (each army cleared, each tier) has open quests of at least three star counts and at least two lengths
  (tested).
- **The repeatables** become ★1 and ★2 (crowns, tomes, ores, no stones), except for **weekly contracts**: four ★3 repeatables that
  come back every 7 days, one at a time, each paying 2 stones.

### Retuning the 149 quests that exist

Their stories and ids stay; their goals get bigger and gain riders. A dozen of the earliest stay ★1 as the tutorial: The Carter's
Wheels, A Round for the House, Fresh Bread, Kwame's shield practice and the patrons' first quests. Examples:

| Quest | Now | Retuned | Stars, length |
| --- | --- | --- | --- |
| The Bone Collector | fell 60 skeletons | fell 300 skeletons, 100 of them on Hard | ★★ Long |
| Quiet Hands | a boss wave flawless | the Lich King, flawless, on Hard | ★★★ Short |
| Two's Company | a boss with at most 2 heroes | the Gorgon Queen with at most 2 heroes, no ultimates | ★★★★ Short |
| Gwen's Ledger | clear an army on Hard | clear an army on Hard in one run, no heart spent | ★★★★ Long |
| The Census | a tally of 300 | three objectives: 300 kills, 50,000 healed, 3 duo combos, within 5 days | ★★★ Long |
| By My Word: the Last Keep | a boss on Elite | the Golem Forge's last boss on Elite, flawless | ★★★★★ Short |
| The Rift's Last | a guardian, a hero on low health | the sixth guardian at ascension 2, with a hero on low health | ★★★★★ Short |
| The quest battles | 35 to 60% where they open | each tuned to its star band (most ★3, Karnok's Door ★4) | |
| The hero tales | 30 to 50% (the owner's call) | stay as they are: ★4 Chain | |

Old saves: a quest already taken keeps the goal it was taken with until it is handed in or dropped, so nothing in progress changes
under the player. Quests already done stay done and are not paid again.

---

## 4. Harder, more complex goals

Every new rule is counted in the sim from what a settled fight or run already knows, plus one new fact for each rule (listed). Each
rule gets its own tests (section 9).

| Rule | Example | New fact the sim needs |
| --- | --- | --- |
| **Several objectives** (`goals: Goal[]`): every one must be done, in any order, each with its own bar; shown as a checklist | "Fell the Warlord, win 5 waves with no spell, and have Kwame deal 30,000" | none (each goal counts as today) |
| **In order** (`ordered: true`): the objectives one after another | "First the Chieftain, then the Warlord, the same day" | none |
| **One run** (`oneRun: true`): every count must come in one army run; the run ending without the quest done resets it | "Clear the Undead on Hard in one run" | the run's id, already on the run |
| **No hearts** (`noHeart: true`): the fight, or the whole run with `oneRun`, without burning a heart | "The Wildwood, all 15 waves, no heart spent" | hearts burnt in the run (`Run`) |
| **Time limit** (`within: days`): done within N days of taking it, else it fails and leaves the log (back on the board after its cooldown; no penalty) | "Three bosses within 2 days" | the date of taking it (already saved as `took`) |
| **Streak** (`streak: n`): one count a day on n days running | "Clear the daily 4 days running" | the date of each settle (passed in, never `Date.now`) |
| **No ultimates** (`noUlts`) | "The Oni King with no ultimate fired" | the fight's ultimates (already counted for `ultsIn`) |
| **No hires** (`noHires`): the run's gold is not spent on summoning foot-soldiers | "Win 8 waves with no hires" | hires in the run (already on `Run`) |
| **Level cap** (`levelCap: n`): every hero fielded at level n or lower | "The Labyrinth's Minotaur with heroes of level 30 or lower" | fielded heroes' levels |
| **Your best benched** (`benchBest`): the player's highest-level hero may not fight | "Prove the rest of your company" | the save's levels |
| **Named heroes barred** (`without: [...]`) | "Without Kwame: he is nursing a cold" | heroes fielded |
| **A party count** (`exactly: n`, beside the old `most`) | "Exactly four heroes" | heroes fielded |

**New rules for quest battles** (quest battles only; armies, the daily, the spire and the Calamity are untouched):

- **Protect** (`protect: kind`): a guest fights on your side under the AI (a carter, a pilgrim, a goat), and the fight is lost if
  it falls.
- **Survive** (`survive: s`): no boss; the fight is won when the clock runs out with any hero standing.
- **Race** (`race: s`): the boss must fall within s seconds, or the fight is lost.
- **Spare** (`spare: kind`): one foe must not fall; the fight is won when every other foe has fallen (the Wrong Cat's mother).
- **Mutators** (`mutate`): foes hasted by a share, no healing, a smaller start purse, no hearts (`hearts: 0`).

Each is a small check inside `stepBattle`'s end test, or a start setting. Every existing fight leaves them unset, so it plays out the
same; a test proves an army run is identical, tick for tick, before and after.

**"Take me there"** reads `questPlace(q, m)`, a pure function in `src/sim/`. It returns the place for the first unfinished objective:
an army on a tier (for a goal open to any army, the best army cleared that meets the tier), the daily, the Last Stand, the Calamity, or
a quest battle's party screen with the cast locked. It also returns the rule to show on the party screen ("No ultimates in this
fight", "Level 30 or lower"), and Auto-pick respects it. A test checks that every quest has a place at every point of a save where it is
open. The new rules are written so that each one points at one place.

---

## 5. Summons much harder to get

### The target

**About 3,000 stones in year one** (8 a day on average), down from about 7,300 (20 a day), which is 59% fewer. In the model:

| Pullable heroes owned | Today (codex entries cut, quests modelled) | Proposed | Slower by |
| --- | --- | --- | --- |
| 5th | day 1 | day 1 (the first session still gets five heroes) | |
| 6th | day 1 | day 3 | |
| 10th | day 18 | day 24 | 1.3x |
| 15th | day 48 | day 83 | 1.7x |
| 20th | day 82 | day 134 | 1.6x |
| 30th | day 131 | day 238 | 1.8x |
| 35th (the last pullable) | day 157 | day 302 | 1.9x |

The proposed stones per window are 7 on day 1, 26 on days 2 to 7, 126 on days 8 to 30, 414 on days 31 to 90, 779 on days 91 to 180
and 1,603 on days 181 to 365.

### The cuts that reach it

| Source | Now | Proposed | Year one, from → to |
| --- | --- | --- | --- |
| Chest shop | bronze 3, silver 8, gold 15 stones | bronze 1, silver 3, gold 6 (same prices and stock; the gear unchanged) | 3,080 → ~1,460 |
| Spire chests | every climb's chests hold stones | stones only in the chests of a **new best** floor; re-climbs pay crowns and gear | 2,025 → ~300 |
| Daily chest | 2 + a stone a bonus star | 1 + a stone a bonus star | 762 → ~460 |
| Calamity clear | 3 stones a draw | 1 a draw; its chest halved | 672 → ~255 |
| Quests | ~645 (mostly ★1-like quests) | priced by stars (below) | 645 → ~370 to 420 |
| Codex entries | 1 a discovery | cut (the other worker's change) | 78 → 0 |
| Achievements, first-clear and star chests, army drops | | unchanged | |

**Why these:** the shop and the spire are where the stones are, and the spire's daily re-climb is the least effortful source in the
game. Quest stones are a small share, and they are the place where effort should pay, so their share of a smaller total rises from
9% to about 13%. The 1-in-100 lucky roll is left alone (question 3).

### Quest pay by stars

**Stones** (one-off quests; a chain or campaign splits its total across its parts, with the most on the finale):

| | Short | Long | Chain (total) | Campaign (total) |
| --- | --- | --- | --- | --- |
| ★ | 0 | 0 | | |
| ★★ | 0 | 0 | 1 | |
| ★★★ | 1 | 2 | 3 | 5 |
| ★★★★ | 3 | 4 | 6 | 10 |
| ★★★★★ | 6 | 8 | 12 | 20 |

**Crowns** grow with the stars: about 150, 300, 600, 1,000 and 1,600 for a Short quest, times 1.5 for a Long one, 2 for a Chain and 3
for a Campaign. ★1 and ★2 quests pay crowns, XP tomes, rift ores and keepsakes. Chests from quests count at their stones within the
table above, and hero shards from quests are kept to ★4 and ★5 only.

Over the planned 234 one-off quests that comes to about 320 stones across the whole game, close to today's 280 but moved onto the
hard quests. The four weekly contracts add about 100 a year.

### The great summons (the Eidolons)

If "the summons" means the Eidolons too (question 1), each chain becomes a ★4 to ★5 Campaign of 5 or 6 parts in place of 3 easy ones:

- Part 1 stops being "beat the boss again". It becomes that boss on Hard, with a rider (Askel's: "the Warlord on Hard, no hero
  falling").
- A new **one-run part**: the chain's army cleared in one run, no heart spent.
- The tally part gets a time limit and a second objective (Nivra's: "5 waves without a spell **and** without an ultimate, within 3
  days").
- The chain battle moves to ★4 (30 to 40% where it opens), and **the trial moves to ★5** (15 to 25% where it opens; Askel, who has no
  trial, gets a ★4 finale battle).
- Pay: the chain's parts pay crowns and stones from the Campaign row, and the binding stays the prize.

Eidolons already bound stay bound. A chain in progress keeps its current part, and the new parts slot in after it.

---

## 6. The 85 new quests

These are sketched by theme. ★ is the stars; S, L, C and K are Short, Long, Chain and Campaign (parts in brackets). The opening is
when it may be offered.

### The Keep's Proving Grounds: pure challenges, a new giver, the Drillmaster Oswy Carne at the tavern's back table (12)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| Two Will Do | Orcs | the Chieftain with at most 2 heroes | ★★ | S |
| Hands Off the Horn | Undead | win 10 waves, no ultimate and no spell | ★★★ | L |
| Shoestring | Beasts | 8 waves with no hires | ★★★ | S |
| The Green Company | Wildwood | the Wildwood's last boss with heroes of level 20 or lower | ★★★★ | S |
| Without the Captain | 3 armies | win 5 boss waves with your best hero benched | ★★★ | L |
| Iron Discipline | Labyrinth | clear the Labyrinth in one run, no heart spent | ★★★★ | L |
| One of Each | 4 armies | win a boss wave with five heroes of five different traits, flawless | ★★★ | S |
| The Long Drill | Ogres | three objectives within 3 days: 20 waves, 3 bosses flawless, 5 duo combos | ★★★★ | L |
| Bare Knuckles | Infernal | the Demon Lord with no ultimate, no spell and no hire | ★★★★★ | S |
| The Thin Line | Hard tier | clear any army on Hard with exactly three heroes | ★★★★ | L |
| Oswy's Graduation | Elite tier | the Golem Forge's last boss on Elite, level cap 70, flawless | ★★★★★ | S |
| Drill Every Morning | any | the daily cleared 5 days running | ★★★ | L |

### Wanted posters: bounties with conditions, the board (10)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| Wanted: the Chieftain, Quickly | Orcs | the Chieftain within 40 seconds | ★★ | S |
| Wanted: the Bone Captain, Twice | Undead | the Bone Captain on Normal, then on Hard, in order | ★★★ | C (2) |
| Wanted: the Alpha, Alive Enough | Beasts | the Alpha Werewolf with a hero left on low health, no hearts | ★★★ | S |
| Wanted: the Thorn Warden, Unburnt | Wildwood | the Wildwood's three bosses without Ravi (the grove is dry) | ★★ | L |
| Wanted: the Gorgon, Blindfolded | Labyrinth | the Gorgon Queen with no ranged hero | ★★★ | S |
| Wanted: the Ogre Pair | Ogres | both Ogre Clans bosses within one day | ★★★ | L |
| Wanted: the Devil Leader, Dead or Paid | Infernal | the Devil Leader on Hard within 30 seconds | ★★★★ | S |
| Wanted: the Fox, Not the Tails | Yokai | the Nine-Tailed Fox with no hero falling | ★★★★ | S |
| Wanted: the Colossus, by Tuesday | Golems | the Sapphire Colossus within 2 days of taking it, on Hard | ★★★★ | L |
| The Big Board | Elite tier | three Elite bosses within 5 days | ★★★★★ | L |

### The road: passersby (8)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| A Lame Mule | any | win 5 waves with Kwame or any Guardian | ★ | S |
| The Tinker's Toll | Orcs | 60 Orc kills | ★ | S |
| The Pilgrim's Escort | Wildwood | quest battle: protect the pilgrim through 3 waves | ★★★ | S |
| Salt for the Pass | Beasts | 3 Beast Packs bosses within 3 days | ★★ | L |
| The Messenger's Relay | 3 armies | win a wave in the army, the daily and the Last Stand, the same day | ★★ | L |
| The Hunter's Last Arrow | Beasts on Hard | the Boar King on Hard with only Marksman heroes | ★★★★ | S |
| A Cart in the River | Labyrinth | quest battle: survive 90 seconds while the cart is hauled out | ★★★ | S |
| The Long Way Round | 5 armies | 3-part chain: a wave in each of 5 armies, a boss flawless, a quest battle (race the flood) | ★★★ | C (3) |

### The patrons: the heroes' own (12)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| Kwame: the Weight of the Shield | Kwame, Undead | Kwame takes 40,000 in one run, no heart spent | ★★★ | L |
| Kenji and Natsu: Who Is Faster | both owned | each is MVP of 3 wins, within 3 days | ★★ | L |
| Ayame: No One Saw | Ayame, Wildwood | 3 boss waves won with Ayame and no hero falling | ★★★ | L |
| Ravi: The Banked Fire | Ravi lvl 30 | a boss with Ravi's ultimate the only ultimate fired | ★★★ | S |
| Selam: Lanterns for Every Grave | Selam | heal 100,000 across fights with only Selam healing | ★★ | L |
| Tiago and Harrow: The Unpaid Crew | both, after The Captain's Wager | quest battle: protect the drunk bosun | ★★★★ | S |
| Hideo: The Old Kata | Hideo, Yokai | the Oni King with Hideo, level cap 60 | ★★★★ | S |
| Zofia: The Second Audit | Zofia, after The Audit | only casters, 3 objectives: 2 bosses, 20 spells, no hearts | ★★★★ | L |
| Hobb: The Patient Dead | Hobb | win 10 waves with only Undead heroes on the field | ★★★ | L |
| Maeve: Six Shots, Six Bosses | Maeve | 6 bosses with Maeve as MVP | ★★★ | L |
| Rook-7: Calibration Error | Rook-7 lvl 30 | Rook-7's ultimate 10 times, no ally's ultimate | ★★ | L |
| Edmund: The Final Verdict | Edmund, Elite | campaign of 5: trials of each hero class, a quest battle where Edmund must not fall | ★★★★★ | K (5) |

### The Crown's campaigns: Royal charges (6)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| The Border Survey | 3 armies | campaign of 5: a boss in three lands, a one-run clear, a survive battle at the border fort | ★★★ | K (5) |
| The Tax Road | 4 armies | chain of 3: no-hire waves, a race battle against bandits, Hard boss | ★★★ | C (3) |
| The Winter Muster | Hard tier | campaign of 6: three Hard clears, a streak of 3 dailies, Last Stand wave 20, the finale (protect the standard) | ★★★★ | K (6) |
| The Embassy | 6 armies | chain of 4: escort the envoy (protect), a spare battle (the envoy's guard must live), two flawless bosses | ★★★★ | C (4) |
| The Second Coronation | Elite tier | campaign of 7 across the whole game's armies on Elite; the finale is a race against the usurper | ★★★★★ | K (7) |
| The Last Keep Holds | Mythic tier | campaign of 8: the Mythic armies, the Calamity at ascension 3 and the Last Stand's throne room, no hearts | ★★★★★ | K (8) |

### The Last Stand (6)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| The Courtyard Watch | Last Stand | reach the library | ★ | S |
| Hold Twice | Last Stand | hold the line twice in one run | ★★★ | S |
| No Candle Wasted | Last Stand | the chapel with no spell cast | ★★★★ | S |
| Thirty and Still Standing | Last Stand | wave 30 | ★★★★ | S |
| The Throne Room, Unbent | Last Stand | the throne room having held every line | ★★★★★ | S |
| The Night Rota | Last Stand | wave 15 on 3 days within a week | ★★★ | L |

### The Calamity (6)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| A Rift Is a Door | Calamity | the first guardian | ★★ | S |
| Through the Crossings | Calamity | 4 crossings won with no hero falling | ★★★ | L |
| The Deep Maps | Calamity | the fifth guardian | ★★★★ | S |
| Ascend | Calamity cleared | a clear at ascension 1 | ★★★★ | L |
| The Rift Choir | Ascension 1 | three objectives: 2 guardians, 10 duo combos, 1 five-hero combo | ★★★★ | L |
| What Waits Under | Ascension 3 | campaign of 5 ending in a quest battle against a rift-born boss, no hearts | ★★★★★ | K (5) |

### The daily (4)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| Fresh Bread Again | any | the daily, 2 days running | ★ | L |
| The Baker's Week | any | the daily on 5 of 7 days | ★★ | L |
| Three Stars Every Time | 3 armies | three dailies with every bonus star | ★★★★ | L |
| The Hard Bread | Hard tier | the daily flawless, no hearts | ★★★★ | S |

### Duchess (4)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| Duchess Wants a Bell | Duchess met | fell 3 bosses (she wants their bells) | ★ | L |
| Hay Inspection | Duchess met | quest battle: protect Duchess (she is the guest) for 3 waves | ★★★ | S |
| The Goat Is Not for Sale | Duchess, 5 armies | quest battle: spare Duchess, who has joined the enemy for snacks | ★★★★ | S |
| The Grand Goat Tour | Duchess, Hard tier | campaign of 5: a hat from every land | ★★★★ | K (5) |

### Spoils (5)

| Quest | Opens | Goal | ★ | Len |
| --- | --- | --- | --- | --- |
| A Map with a Hole | any boss | the next army's wave 10 within 2 days | ★★ | S |
| The Captive Talks | Undead boss | chain of 2: a race battle to the hideout, then its boss flawless | ★★★ | C (2) |
| The Warlord's Seal | Orc Warlord on Hard | the Orcs on Elite in one run | ★★★★ | L |
| A Box That Ticks | Golem boss | survive battle: 2 minutes as the box winds down | ★★★★ | S |
| The Demon's Receipt | Demon Lord | three objectives: the Demon Lord on Hard, 100 Infernal kills, no spells | ★★★★ | L |

### Long campaigns, new givers (12)

These are twelve campaigns of 5 to 8 parts each (their parts count as quests in the spread above).

| Campaign | Giver | Opens | Arc | ★ (rising) | Parts |
| --- | --- | --- | --- | --- | --- |
| The Drowned Bell | a fisherwife, Mother Teal | Undead | the bell under the lake, the dead who ring it; finale: survive the tide | ★★ → ★★★★ | 5 |
| The Cartographer's Folly | Pim Ashby, mapmaker | 3 armies | a map of every land, with one wrong on purpose | ★★ → ★★★ | 6 |
| The Thirteen Keys | the gaoler Brannock again | Labyrinth | a key from each boss; finale: protect the prisoner | ★★★ → ★★★★ | 6 |
| Red Harvest | a farmer's widow | Beasts on Hard | the wolves that took the farm; finale: spare the cub | ★★★ → ★★★★ | 5 |
| The Glass Orchard | an alchemist, Sorrel Vane | Wildwood on Hard | fruits that grow only on battlefields | ★★★ → ★★★★ | 5 |
| The Iron Choir | the forge-hand Edda again | Golems | the singing golems; finale: race the furnace | ★★★★ | 6 |
| A Wedding at the Keep | Gwen | 5 armies | the guests, the cake, the ogre who was not invited | ★★ → ★★★★ | 7 |
| The Night Market | Kiku | Yokai | the parade's market, one stall a night (streak parts) | ★★★ → ★★★★★ | 6 |
| The Unfinished Map of the Rift | Ivy Penhallow | Calamity | every crossing charted; finale: the sixth guardian, no hearts | ★★★★ → ★★★★★ | 6 |
| The Long Winter | the frost-bitten hunter | Elite tier | a winter that will not end, told across the snow lands | ★★★★ → ★★★★★ | 7 |
| The Siege That Never Ended | Master Fenwick | Last Stand wave 30 | the keep's oldest siege, replayed | ★★★★★ | 6 |
| The Ninth King | the Crown | Mythic tier | the king before the first king | ★★★★★ | 8 |

That is 12 + 10 + 8 + 12 + 6 + 6 + 6 + 4 + 4 + 5 = **73 quests**, plus **12 campaigns**: **85 new entries** in all, about 140 new parts
counted singly. Every one goes through the owner's rule (no quest is offered until the heroes it needs are owned), and the starter
packs see quests from both packs.

---

## 7. Saves and determinism

- New optional fields on `QuestDef` (`stars`, `length`, `goals`, `ordered`, `oneRun`, `noHeart`, `within`, `streak` and the new
  `Cond` riders) and on `Meta.quests` (`QuestState.objectives` progress, `runId` for one-run quests, `streakDay`, `failed` with its
  date). Each is read safely by `readQuests`. No version bump.
- A quest taken before the retune keeps its old goal (its definition is looked up by id plus a `goalVer`; an old save has none, so it
  reads the old goal until hand-in).
- Nothing new draws from a fight's stream. The days come from the date the page passes in (`todayKey()`), never `Date.now()` in
  `src/sim/`. The guest units of protect battles come from the quest battle's own seed.
- Stones already held are kept; nothing is clawed back.

## 8. Screens (upright phone, 393x852 first)

- **Board row**: title; a line of stars, the length tag and the level ("★★★★☆ · Long · Lv 45+"); the giver; the reward with its
  stones in gold.
- **Checklist** (several objectives): up to three lines under the goal, each with a tick or a small bar.
- **Time limit**: an amber chip with the days left; red on the last day. A failed quest shows as struck through in Done, as "Failed:
  back on the board in 3 days".
- **Take me there**: on the Active row beside Track; the party screen shows the rule ("No ultimates in this fight") in the hint line.
- Checked at 393x852, 360x780 and 412x915.

## 9. Build plan (batches, each with its tests)

| Batch | What | Tests |
| --- | --- | --- |
| **Q1. Stars and the probe** | `stars`, `length` on every quest; `starEstimate`; a save-like probe (talents, gear and relics from the level-pace saves, the opening level by need) for `npm run quest-stars`; stars and tags on the board, card, log and chip; sort and filter | every quest has stars 1-5 and a length; authored stars within one of the estimate; the spread at every save stage; screenshots |
| **Q2. The stone cut** | the shop, the spire's new-best rule, the daily chest, the Calamity's draws; `questPay(stars, length)` re-prices every quest; the pace tool gains the per-source ledger and quests | shop contents; spire stones only on a new best (a re-climb pays none); daily and Calamity stones; quest pay matches the table; pace bands (the 5th hero in the first session; the 35th not before day 250); `summon-stones` tests updated to the owner-approved numbers |
| **Q3. The new goal rules** | `goals`, `ordered`, `oneRun`, `noHeart`, `within`, `streak`, `noUlts`, `noHires`, `levelCap`, `benchBest`, `without`, `exactly`; failing and returning; `questPlace` | each rule counts and refuses correctly; a one-run quest resets when its run ends; a time-limited quest fails on day N+1 and returns after its cooldown; streak breaks; old saves keep their goals; every quest has a place |
| **Q4. Retune the 149** | new goals and riders, stories kept; the battles' `ease` to their bands; the tales untouched | spread targets met; old-save goal version; the quest-content tests updated (shape cap, spread) |
| **Q5. Quest battle rules** | protect (guest units), survive, race, spare, mutators | each rule's win and loss; army runs identical tick for tick with the rules unset |
| **Q6 to Q8. The 85 new quests** | Q6 the short ones and the bounties (about 30), Q7 the chains and patrons (about 30), Q8 the campaigns and their finale battles (about 25) | the data whole, British spelling, words not repeated, the owner's rule, stars within the estimate, every battle rated in its band |
| **Q9. The Eidolon chains** (if the owner says so) | 5 to 6 parts each, the trials to ★5 | every chain still completable from both starter packs; trial rates in band |

Every batch runs `npm run typecheck`, the quest tests and `npm run web`. The page batches also get screenshots at the three phone sizes,
and each batch gets a note in `docs/notes/`.

---

## 10. Questions for the owner

1. **Does "the summons" mean the summoning stones, the Eidolons, or both?** *Recommendation: both.* The stones get the cut in section
   5, and the Eidolon chains become ★4 to ★5 campaigns with ★5 trials.
2. **Is about 3,000 stones in year one the right target?** That puts the last pullable hero near day 300, not day 155 (1.6x to 1.9x
   slower from the 15th hero on), while the first session still gives five heroes. *Recommendation: yes.* It can be pushed further
   later by the shop alone.
3. **Should most of the cut fall on the chest shop and the spire's re-climbs, as proposed, leaving the 1-in-100 lucky roll alone?**
   *Recommendation: yes.* They are 70% of the stones today, and the lucky roll is the game's moment of delight. If more is wanted,
   halve the lucky odds to 1 in 200 rather than cutting quests further.
4. **Should the stars measure difficulty only, with length as its own tag?** *Recommendation: yes.* "Short and brutal" and "long but
   gentle" are both worth having, and one number cannot say both.
5. **Should ★1 and ★2 quests pay no stones?** *Recommendation: yes.* Stones become the prize for the hard quests. Easy quests pay
   crowns, tomes, ores and keepsakes.
6. **Should the 149 existing quests be retuned harder (stories kept), with quests already taken keeping their old goals?**
   *Recommendation: yes.* Otherwise the board stays full of the "incredibly easy" ones.
7. **Should quests be allowed to fail (real-day time limits)?** *Recommendation: yes, on ★3 and up only.* A failed quest returns to
   the board after its cooldown and costs nothing but the progress.
8. **Should campaigns have their own slot in the log, so the active limit becomes 3 quests plus 1 campaign?** *Recommendation: yes.*
   A three-week campaign should not block three short quests.
9. **Should the army drops' hero shards (about 160 a year) be left alone?** *Recommendation: leave them.* They are earned by fighting
   and are small next to the stones.
