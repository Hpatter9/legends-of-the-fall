# A new player's first hour (FIRST-HOUR)

A fresh save (storage cleared, no Developer grants) played by hand in a browser at 393x852, with the changed screens checked again
at 360x780 and 412x915. The log below is in the order it was played; every step has a screenshot in `docs/samples/first-hour/`.
The fixes are small (words, tips, lock reasons, clipped screens, bugs); anything that is design, balance or pace is in the open list
for the director, with the evidence.

## How it was played

- One browser kept open for the whole session, so the save and the page carried on as a player's would. Taps and drags were touch
  events; nothing was set through `window.__game`.
- The opening, the starter pick, the first run, the home tabs, the tavern, quests, the shop, achievements, the first summons and the
  daily were played by hand. From the third army run on, a small script played each wave the way I had been playing (hire while the
  gold allows, drag each bench hero to a tile, merge a copy on its twin, take the first choice of an event), so that several runs
  could be watched for tips, notices and the pace. It is a clumsy player, not a clever one: that is the point.
- The Last Stand and the Calamity were not played (hidden, `src/sim/hiddenModes.ts`); every place that still names them is listed.
- Pace was backed with the tools: `npm run unlock-pace`, and a new one, `node tools/first-hour/pace.mjs`, because the balance tools
  start from `startedMeta` (five heroes owned) and a real new save has the three of its starter pack.

## The walk-through

| # | Step | What a new player meets | Shot |
|---|---|---|---|
| 1 | First open | The opening scene; the loading tip named the Last Stand and the Calamity (fixed). | `01-first-open` |
| 2 | Starter pick | Two packs of three; clear. The chips (SHIELD, SWORD, BOW, SAMURAI) are not explained, but nothing depends on them yet. | `02-starter-pick` |
| 3 | Straight into wave 1 of the Orc Warband | No home screen first. The first tip said "Drag your heroes onto the blue tiles" with no hero owned, and its bubble pointed beside the tiles; the hint under it said "your five are the pool" on a save with three heroes (all fixed). | `03-first-deploy-no-heroes` |
| 4 | First hire, first hero placed | "Press Fight!" came as soon as one hero stood, with the gold for the second hire unspent (fixed: it waits). The rune pull bar's word was cut to "IES" when the bench was empty (fixed). | `04-fight-tip-one-hero`, `05-two-placed` |
| 5 | First fight | Spell tip, then the skill tip. Lost in 17 seconds with a samurai and an archer placed plainly and one spell cast. | `06-first-fight-mana-tip`, `07-wave1-lost` |
| 6 | The heart | "A heart burns, the party rises": the wave replays by itself with bonus gold and is won. Good recovery, well told. The "First Blood" toast sat on the result's gold, crowns and stars (fixed: toasts wait for the result card). | `08-wave1-won-toast-covers` |
| 7 | Wave 2 | The Hire and merge tip. A rune arrived with no word, and the bench that holds it is shut (fixed: a one-time tip). | `09-wave2-deploy` |
| 8 | Road event | "A mystery chest": clear, quick, a nice beat. Its "A relic, gear or gold" paid a rune (see open list, words). | `10-mystery-chest` |
| 9 | Wave 3, run over | Second heart gone, run ends at wave 3 of 15 after 1:10 of fighting. A first-defeat scene, then a kind recap ("How to come back stronger", levels kept). | `11-wave3-deploy`, `12-run-lost-wave3`, `13-defeat-recap` |
| 10 | Home, first time | The camp, five tabs, Daily, the trophy with a badge. Tips: "Choose your battle", then crowns. | `14-home-first-time` |
| 11 | Spells tab | Locked: "Build the Chapel in the Castle", but the Castle is itself shut (fixed: the reason names the Castle's stars). | `15-spells-locked` |
| 12 | Castle tab | "The castle is shut · Opens at 10 stars", and under it a gold button, "Open Castle Gate (Preview)", that opened the gate and gave 3000 crowns and six buildings (removed; see fixes). | `16-castle-tab-fresh` |
| 13 | Heroes tab (the Tavern) | Handsome. "Tavern services" opened a panel whose buttons were under the tab bar, labels hidden (fixed: a tapped tab scrolls its panel into view). | `17-heroes-tab-fresh`, `18-tavern-services-cut-off`, `19-tavern-services-scrolled` |
| 14 | Quests | Four on the board, three can be taken. Clear. | `20-quests-first`, `21-quest-board`, `22-quests-active` |
| 15 | Hester's Stall | Seven tabs; the cheapest thing is 60 crowns (a bandage), the first chest 600, with 31 crowns in hand. "1 summoning stones" (fixed). "Standing 2" is not explained anywhere on the page. | `23-shop` |
| 16 | Achievements | Three to claim: 30 crowns and 6 stones. The first real reward, and it is two taps off the home screen. | `24-achievements` |
| 17 | Recruit, six stones | Two new heroes (Ravi, Selam), then four single shards of four different heroes. The reveal is the best moment of the hour. The card's numerals were wrong ("XLXVII" for 67; fixed) and a new hero's name ran into its title ("RaviKindler of Pyres"; fixed). "How summoning works" named the hidden modes (fixed). | `25-recruit-tab`, `26-first-summon`, `27-summon-result`, `28-summon-shard-card` |
| 18 | A hero's sheet | Deep (scores, bonds, the House, talents, equipment, skills). Names in the company strip were cut ("Kwa…"; fixed). The ultimate opens at level 30. | `29-hero-sheet` |
| 19 | The Daily | Open from the start, with the day's own five heroes. The Recycle tip came here, pointing at an empty bench and naming a Recycle that is not on the screen until a card is dragged (fixed). Lost at the wave 5 mid-boss, +44 crowns. | `30-daily-card`, `31-daily-wave1`, `32-daily-lost-wave5` |
| 20 | Choose your battle | The army card: tiers, stars, chests at 3, 5, 10 and 11 stars, "Recommended: Lv 1". The next army reads "Recommended: Lv 8". | `33-choose-battle` |
| 21 | War Council | With five heroes owned a party screen appears for the first time, with no tip; "2 more heroes needed" and Auto-pick make it clear enough. | `34-party-pick`, `35-party-auto-picked` |
| 22 | Runs 2 to 5 | See "The runs" below. | `36-run2-lost-wave7` |

### The runs

| Run | How it was played | Ended | Crowns after |
|---|---|---|---|
| 1, Orc Warband | By hand: two heroes fielded, one spell cast | Lost on wave 3 (one heart on wave 1, one on wave 3) | 31 |
| Daily | The day's five, hires, no spells | Lost on the wave 5 mid-boss | 105 (61 after the achievements, +44) |
| 2, Orc Warband | Three heroes fielded, no spells | Lost on wave 7 | 169 |
| 3, Orc Warband | Three fielded, no spells; the first choice of "A crown in the reeds" cost a heart | Lost on the wave 8 mid-boss | 207 |
| 4, Orc Warband | SPELL Auto on; five fielded from the middle of the run | Lost on wave 15, the Warlord, with 413 gold unspent: the bench was full of copies that could not merge | 390 |
| 5, Orc Warband | SPELL Auto on | **Cleared**, three stars, 5:20 of fighting; heroes level 7 to 11 | 588, and two bronze chests |

That is about an hour of play: five tries at the first army and one daily. The clear's screens are `39-army-defeated`,
`40-clear-recap`, `41-after-clear-1`, `42-home-after-clear` and `43-first-chest`; run 4's end is `37-run4-lost-wave15`.

What the runs say:

- **The king's spells decide the early game, and nothing but one line of tip says so.** `node tools/first-hour/pace.mjs`
  (a new save, three-hero pack, ideal placing every wave):

  | Orc Warband, Normal | Mean tries to clear | First try ends on wave | Top hero level at the clear |
  |---|---|---|---|
  | Sword and Shield, spells cast | 1.9 | 14.2 | 12 |
  | Blade and Spell, spells cast | 1.6 | 13.8 | 11 |
  | Sword and Shield, no spells (`BOT_SPELLS=0`) | 6.3 (19 of 20 saves within 10) | 5.7 | 17 |

  By hand, casting one spell in the first fight and none after, my runs ended on waves 3, 7 and 8; with the SPELL Auto switch on,
  the same clumsy placing reached the Warlord on the next try and cleared the army on the one after.
- **A new save fields three heroes, not five.** One of each hero on the field and a pack of three means "3 of 5 placed" for the
  whole first session; every later hire is a copy to merge. The fourth and fifth heroes came from the six stones of the first
  three achievements, which a player has to find behind the trophy button.
- **Crowns come slowly against the prices until the first clear.** About 30 to 60 crowns a lost run (more the further it gets) and
  30 from the first achievements: 207 crowns after three runs and a daily, 390 after four, against 600 for the first chest. The
  clear then pays well (+157, a first-clear purse, two bronze chests with 170 crowns and a stone in the one I opened). Before it,
  nothing in the shop is in reach but a 60 crown bandage, and the stones that mattered came from achievements, not crowns.
- **The end of the hour is good.** "Army defeated!", three new stars, the chests on the cart with their tip, the Undead Legion on
  the overlook. The hour before it is five losses.

## What was fixed

| Fix | Where |
|---|---|
| The Castle tab's "Open Castle Gate (Preview)" button is gone. It was a testing door on every new player's shut Castle page (gate open, 3000 crowns, six buildings at level 2, the Chapel). It came in with 0.403.0 and is in no note. Settings › Developer › Build Town now opens the gate too, so testing loses nothing. | `src/home.ts`, `src/sim/devGrant.ts` |
| The first tips come in order: "Drag your heroes" waits for the first hire; "Press Fight!" waits on wave 1 while there is gold for the second hire. | `src/tips.ts`, `src/main.ts` |
| The hire hint counts the party ("your three are the pool"). | `src/tips.ts` (`hireHintWords`), `src/main.ts` |
| A tip's box follows the deploy zoom: the bubble sits on the tiles (and on a hero for the skill tip), not beside them. | `src/main.ts` (`deployBox`, `spriteBox`) |
| The spell tip says spells win fights and names the SPELL switch. | `src/tips.ts` |
| The Recycle tip says a Recycle spot appears when a hero is dragged, and only shows when a hero is really on the bench. | `src/tips.ts`, `src/systemTips.ts` |
| A new one-time tip for the first rune, pointing at the Runes pull bar. | `src/tips.ts`, `src/systemTips.ts` |
| The rune pull bar is no longer cut ("IES") when the bench is empty or every hero is on the field. | `src/runeBench.css` |
| An achievement (or any) toast waits while a wave's result card is up. | `src/achievementsView.ts` |
| The Spells lock says the Castle opens at 10 stars, with the stars so far. | `src/library.ts` |
| Tapping "Tavern services" or "Your heroes" scrolls the panel into view. | `src/paintedTavern.ts` |
| Summon card numerals are real Roman numerals (67 is LXVII). | `src/sim/roman.ts`, `src/summonTarot.ts` |
| A new hero's name and title are stacked on the summon result. | `src/summonTarot.ts` |
| Names fit in the hero sheet's company strip. | `src/paintedButtons.css` |
| "1 summoning stone" on the bronze chest. | `src/shopView.ts` |
| Hidden modes no longer named in: the loading tips (five of them), "How summoning works", the ore note on a hero's Awakening, the codex's "Where it is met", the codex's Scenes list (unseen Calamity, Last Stand, elite and Ascension scenes), and the spellbook's line for Bulwark (it shows the chest scroll instead). | `src/sim/hiddenModes.ts` (`namesHiddenMode`), `src/main.ts`, `src/gacha.ts`, `src/awakenView.ts`, `src/sim/codex.ts`, `src/sim/sceneRules.ts`, `src/spellbook.ts` |

Tests: `test/first-hour.test.ts` (the numerals, the loading tips, Build Town and the gate, the Scenes list, where a foe is met, the
hint and the tips' words); `test/tips.test.ts` knows the new tip. After-shots: `docs/samples/first-hour/fix-*.png` (393, and the
strips at 360 and 412).

## Open list for the director

Each with my recommendation. None of these is changed.

### Pace and difficulty

1. **Spells are the difference between two tries and six on the first army, and SPELL Auto starts off.** Recommend SPELL Auto on by
   default for a new save (the switch stays), or a first-fight beat that makes the player cast once. Evidence: the table above.
2. **Three heroes for the first session.** Recommend the first three achievements' stones be handed over at the first win (or the
   trophy button's badge be pointed at by a tip), so the fourth and fifth heroes arrive in the first ten minutes for everyone.
   Or give a starter pack four heroes.
3. **Crowns: nothing to spend on until the first clear.** 390 crowns after four runs and a daily; the first chest is 600, and the
   Castle is shut until 10 stars. Recommend a purse at the first loss big enough for one bronze chest, or a cheaper first chest.
4. **The Castle and Spells tabs are shut for a long time.** Ten stars is, at two stars an army, five armies; the second army is
   "Recommended: Lv 8" and the fifth "Lv 35". Two of the five tabs are locked pages for the whole first evening. Recommend opening
   the Castle earlier (4 stars?) or opening the Chapel apart from the Castle.
5. **The balance tools do not play a new save.** `startedMeta` owns five heroes; `unlock-pace` still counts Spire and Calamity
   stones (425 of its 2779 a year, 16%) and shows every milestone hero as never joining. Recommend the tools take the starter pack
   and the hidden flag. `tools/first-hour/pace.mjs` is a start.
6. **The "+1% attack" first tier of Samurai** (and its like) reads as nothing on the first synergy a player wakes.

6a. **After the first clear the army page comes up with Hard chosen** ("Fight again · Hard": foes x1.75 hp, x1.45 attack), not the
    next army, which has just opened and is "Recommended: Lv 8" for heroes of level 7 to 11 (`41-after-clear-1`). Recommend it
    opens on the new army, or says which is the easier next step. I did not see an "army unlocked" notice (my script may have
    tapped past it): worth a look by hand.
6b. **The bench fills with copies that cannot merge** (a grade 1 copy of a grade 2 hero on the field). Hire then reads "Bench full"
    and the gold piles up: 413 unspent at the Warlord in run 4. The Recycle tip is the only help. Recommend the "Bench full" line
    names Recycle, or copies that cannot merge are flagged on their cards.

### Hidden modes: things the page offers that only a hidden mode gives

7. **Achievements "Twenty Waves" and "Thirty Waves"** ask for wave 20 and 30 of one run; every army is 15 waves and the daily 10.
   Recommend adding `stage20` and `stage30` to `HIDDEN_MODE_ACHIEVEMENTS` (I tried it: `test/achievements.test.ts` uses `stage30`
   as its example of a big milestone, so it needs your say).
8. **Vaelkhar, the sixth Eidolon**: his chain "opens with the Calamity cleared once" and every part is a Calamity goal
   (`src/sim/eidolonChainData.ts:819`, shown by `src/eidolonChainView.ts:241, 335`).
9. **Six Legendary pieces** in the codex's Legends tab "wait in" the spire, the Calamity, Last Stand wave 40 or a hidden quest
   (`src/sim/legendBases.ts:50, 56, 77, 93, 104, 109`, shown at `src/codexView.ts:318`).
10. **The Bestiary**: 18 of 73 entries are only met in the modes (12 elites, 6 heralds), so its 100% reward cannot be had, and the
    75% milestone (and the Nyxara chain that needs it) needs every other entry with none to spare.
11. **The Trophy wall** (Tavern services › Trophies) is all Calamity heralds and Spire champions: "Calamity Heralds (6)",
    "Spire Champions (12)", "Calamity Void", "Deep Spire" (`src/trophyWall.ts:277, 291, 292, 371`). Recommend hiding its doors
    while the modes are hidden.
12. **Relic words**: the Sentry's Cloak says "(in the Last Stand, ...)" (`src/sim/relics.ts:166`); a great relic is named "The
    Calamity's Eye" (lore, probably fine). The quests `musterStandard` and `keepOneRun` can never be offered (their
    prerequisites are hidden; `src/sim/questData/royalnew.ts:279, 619`). The ores are still "Rift ores" and the "Rift Cache".
13. **The Assault** opens when one army reaches ten stars, and nothing on the page says so before then: the army card reads
    "chests at 3, 5, 10, 11 stars". Recommend a line on the star track ("10 stars: storm the hold").

### Confusion and words

14. **Star, rank, grade**: a merged hero is "star" in the tip and achievements, "Rank 2" over the hero on the board, "grade 1" in
    road events. Recommend one word.
15. **"A relic, gear or gold"** on the mystery chest pays a rune, which the page calls a rune everywhere else.
16. **"Standing 2"** on the shop's shut wares, and "A known face · 4000 to the next", are never explained.
17. **ULT Auto** is on the fight bar from the first fight; no hero has an ultimate before level 30. Recommend it shows shut, with
    "Ultimates open at level 30", until one is learned.
18. **The Hearts tip** did not show when the first heart burned (the wave restarts too quickly); it came at the next run's deploy.
19. **The Heroes tab's "!"** stays on from the first minute (a quest waits); **the Castle tab wears a badge** while shut (the codex
    has a reward). Both pull the player to pages that then say little.
20. **The recap's Skip button** sits on the last letter of "DEFEAT" while the tally counts up (`13-defeat-recap`).
21. **Achievement jokes** say "stages" ("Ten stages cleared!") where the game now says waves.
22. **"A bronze chest was added to your stash on the Battle tab!"** is printed twice on the first clear's result (two chests: say
    "Two bronze chests"). The version line sits on that result's banner, and "Battle Overlook" is cut by the top bar on the home
    screen after the clear (`39-army-defeated`, `42-home-after-clear`).
23. **The first board** was a grass land: the deploy tiles are pale under tall grass, not "blue" as the tip says. The daily's dungeon
    tiles are plainly blue.

## Tools added

- `node tools/first-hour/pace.mjs [--saves 40] [--tries 12]`: a new save's tries at the Orc Warband, per starter pack
  (`BOT_SPELLS=0` for no spells).

## Round 2: the director's calls (after 0.456.0)

The open list above is as it stood after the first pass. These items of it are now settled; the crowns pace, three heroes all
session and the bench filling with copies that cannot merge are with the owner and untouched.

| Call | What changed | Where |
|---|---|---|
| SPELL Auto on for a new save | `newMeta` starts with `spellAuto: true`. A save made before has no such key and reads as it did (`spellAutoSaved`); one that chose off stays off. The spell tip now says the switch casts them and how to cast one by hand. | `src/sim/meta.ts`, `src/tips.ts` |
| After a first clear, the new army's card | The armies screen opens on the army the clear has opened; with none opened, on the cleared army when it earned a chest, as before. | `src/screenRules.ts` (`armiesFocusAfterClear`), `src/main.ts` |
| ULT Auto only with an ultimate | The button is hidden until a hero on the field has an ultimate (level 30). | `src/sim/heroKits.ts` (`anyUltimate`), `src/fightHud.ts`, `src/main.ts` |
| Hidden-mode things not offered | All through `src/sim/hiddenModes.ts` or the flag, so lifting it brings each back; no data is deleted. See below. | |
| Ten stars and the Assault | Every open army's card says "10 stars on this army open its Assault · storm <hold>" from the start (it showed only once the mode was open). | `src/armiesView.ts` |
| One word: **grade** | A hero's merge level in a run is "grade" in the Hire tip, the banner over a merged hero, the bench card's label and the Three-Star Hero achievement's text. | `src/tips.ts`, `src/render/fx.ts`, `src/main.ts`, `src/sim/achievements.ts` |
| The mystery chest | "A relic, a rune or gold." in a rune run (it pays a rune there). | `src/sim/events.ts` |
| Standing | The stall's head reads "Standing 1 · spend 4000 for 2" (it was "A known face · 4000 to the next"); a shut ware reads "Needs standing 2". | `src/stallView.ts` |
| Tools | `--new-save` (and `--pack 0|1`) starts the balance climbs from a real new save (`climbMeta`, `newSaveMeta` in `tools/autoplay.ts`). `unlock-pace` no longer plays the spire or the Calamity, nor counts their achievements and quests, while they are hidden (`--with-modes 1` plays them as before). | `tools/autoplay.ts`, `tools/balance.ts`, `tools/unlockPace.ts`, `tools/first-hour/pace.ts` |

### What waits with the hidden modes

| Thing | Rule | Kept for |
|---|---|---|
| Achievements "Twenty Waves", "Thirty Waves" | `HIDDEN_MODE_ACHIEVEMENTS` | a save that earned one |
| Bestiary: the 12 elites and 6 heralds | `entryOfHiddenMode`, `shownEntries` in `codex.ts`: not listed or counted, so the total is 55 and the 100% reward can be reached. The quests that ask for a share of the bestiary count the same 55. | the save's record of what it met |
| Trophy wall: the six heralds' plaques | `trophyShown`. The other twelve are the armies' bosses (the wall only called them "Spire Champions"), so the wall stays, without its chips; a plaque not yet won reads "An army's boss" and says to beat it in its army. | a herald's trophy already won |
| Vaelkhar's chain | `chainListed`, `listedChains` in `eidolonChains.ts`: the Eidolons tab and the Pact Gallery list five. | a save that had begun or bound it |
| Seven Legendary pieces | `HIDDEN_MODE_LEGENDS`, `legendShown`: the six in the open list and the Wyrmhide, whose source is Vaelkhar's heart. | one already found |
| `musterStandard`, `keepOneRun` | No change needed: `canOffer` already refuses a quest whose `after` is not done, and their first steps are hidden. A save that did the first step before can still be offered the second, which asks for nothing hidden. A test now says so. | |

Tests: `test/first-hour.test.ts` (round 2's rules), and two updated for the changed requirement: `test/achievements.test.ts`
(Thirty Waves is checked with the modes shown, and checked to be absent while hidden) and `test/codex.test.ts` (the bestiary's
total). Shots: `docs/samples/first-hour/r2-01-at-393.png` (first fight of a new save, the armies card, the Trophy wall, the stall,
the codex) and `r2-02-at-360-and-412.png`.

### What the tools say now

- `CLIMB_ARMIES=2 npm run balance -- --no-tables --climb --saves 6 --new-save`: the Orc Warband in 2.0 tries with three heroes owned,
  the Undead Legion in 3.0 with five (a small sample: run it with more saves before quoting it).
- `npm run unlock-pace`, the hidden modes not played: 1991 stones a year (2779 with them), and the thirtieth hero on day 204
  (155 with them). Quests 40%, the chest shop 30%, the daily chest 26%.

### Words I was not sure of, left as they are

- The **star glyphs for a grade**: the unit card shows a grade as "★★", and the Recycle question says "Recycle the ★★ Knight". The
  hero sheet shows a hero's shard rank as stars too. Words now say grade; the glyphs still look like rank.
- The achievement is still **named** "Three-Star Hero" (its text says grade three).
- "**Rank**" stays for a hero's shard rank ("Rank up", "0/1 shards to rank 1") and a spell's rank.
- Road events' **"grade 1"** was already the word.
- The ores are still "**Rift ores**" and the "Rift Cache", and a great relic is "The Calamity's Eye": names, not directions.
- The Sentry's Cloak still explains its back row "in the Last Stand" (`src/sim/relics.ts:166`): it is one constant string of relic
  data; say if it should be cut.

## Round 3: the owner's answers (after 0.459.0, branch `claude/first-hour-3`)

One commit an item.

| # | The owner's answer | What changed | Where |
|---|---|---|---|
| 1 | "Found: Kwame stands again at half" reads oddly | A hero that fell in a won wave is no longer listed among the finds. The wave card has a short row of its own, headed **Back on their feet**, with one line for all of them: "Kwame, at half health", "Kwame and Selam, at half health". It reads `run.risen`; the rule (`wounds.ts`) is unchanged. A run saved before may still hold the old line in `run.found`: the card leaves it out of its finds. | `src/sim/run.ts`, `src/sim/wounds.ts` (`risenLine`, `RISEN_HEAD`, `isOldRisenLine`), `src/sim/waveCard.ts`, `src/waveCardView.ts`, `src/battleReports.css` |
| 2 | A new player reaches five heroes sooner | The first clear of the first army gives a fourth hero outright, and the first clear of the second a fifth (`src/sim/clearHero.ts`). A whole hero the save does not own, picked as a lucky summon picks one (any hero still to collect by shards, never a milestone hero) from a side stream of its own (`CLEAR_HERO_SALT`), so no pull or chest rolls differently. It joins the party while there is room and has the usual join reveal (the page's `earned` list). Once a save (`Meta.clearHeroes`), and only while the save owns fewer than four (or five) heroes, so a save that has its five gets nothing, then or later. The army's card says "First clear 339 · **a new hero joins** · Replay 52", and the clear's result "A new hero joins: Ravi!". | `src/sim/clearHero.ts`, `src/sim/armyStars.ts`, `src/sim/meta.ts`, `src/main.ts`, `src/armiesView.ts` |
| 3 | The Castle tab opens at 6 stars | `MODE_NEED.castle` is 6. The shut page reads "Opens at 6 stars · 0/6 stars". **Spells stay at 10:** the spellbook opens with the Chapel, which is a building of the Castle, so the Chapel now has its own number (`SPELLS_NEED` 10, `chapelOpen`): its card says "The Chapel can be raised at 10 stars · 6/10 stars" with Build shut, and the Spells tab's lock says the same. A save that had the castle open from before the stars, or whose Chapel stands or is being built, is not held back. The climb tool keeps the castle shut for three armies (it was five). | `src/sim/modeUnlock.ts`, `src/home.ts`, `src/library.ts`, `tools/balance.ts`, `docs/notes/menus-unlocks.md` |
| 4 | The bench filling with copies | Nothing changed. | |
| 5 | Move the hidden modes' stones | See below. | `src/sim/hiddenModes.ts`, `src/sim/armyStars.ts`, `tools/unlockPace.ts` |

On the army card the promise is on the first clear's own line: as a row of its own it pushed the Assault line under the tab bar at 360
wide (`r3-02-army-card-360-393-412.png`). The risen row is `r3-01-back-on-their-feet-360.png`.

### The moved stones

While a mode is hidden its stones are paid elsewhere (`MOVED_STONES` in `hiddenModes.ts`):

| Where | Its own stones | Added while both modes are hidden |
|---|---|---|
| A daily chest | 1, and 1 a bonus star | **+1** |
| A hold's first Conquest chest | 5 (a gold chest's 3, half again) | **+8** |
| A regrouped Warband's chest (the weekly re-storm) | 3 | **+1** |

`movedStones(where)` is the amount times `hiddenStoneShare()`: the Last Stand's part is 0.4 and the Calamity's 0.6 (the spire's chests
paid 158 stones a year and the Calamity's clears and chests 267). With both hidden the share is 1; with both shown it is 0 and nothing
is added anywhere; if one day one mode is shown and not the other, only its part goes (the two parts of each amount add up to the
whole). So the total does not double. Crowns are not touched. The daily chest and the Conquest chest read it when they are opened.

### unlock-pace, before and after

`npm run unlock-pace` (20 seeds, a year, a daily player). The model did not play the Assault at all before this round; it does now
(`--noassault 1` leaves it out), which matters for reading the numbers:

| | Stones a year | 10th hero | 20th | 30th | 40th | 45th |
|---|---|---|---|---|---|---|
| **Before the modes were hidden** (`--with-modes 1`, the Assault not modelled): the target | **2779** | day 12 | 73 | **155** | 264 | 340 |
| Modes hidden, round 2 (the Assault not modelled) | 1991 | 13 | 87 | 204 | >365 | >365 |
| Modes hidden, the Assault's own chests counted, nothing moved (`--nomoved 1`) | 2436 | 13 | 84 | 185 | 315 | >365 |
| **Modes hidden, the stones moved (now)** | **2855** | 12 | 75 | **162** | 269 | 336 |
| Modes shown again, the Assault counted (`--with-modes 1`): nothing is added | 3203 | 12 | 73 | 150 | 247 | 307 |

Stones by source, a year:

| Source | Before (target) | Hidden, round 2 | Hidden, nothing moved | **Hidden, moved (now)** | Modes shown again |
|---|---|---|---|---|---|
| Achievements and codex | 59 | 56 | 56 | 56 | 59 |
| Quests | 988 | 787 | 787 | 787 | 988 |
| Daily chest | 508 | 508 | 508 | **764** | 508 |
| Army first-clear and star chests | 45 | 45 | 45 | 45 | 45 |
| Chest shop | 753 | 595 | 606 | 567 | 744 |
| Spire chests | 158 | | | | 158 |
| Calamity clear and chest | 267 | | | | 267 |
| Assault: first conquests | not modelled | not modelled | 45 | **117** | 45 |
| Assault: a Warband beaten again | not modelled | not modelled | 389 | **519** | 389 |
| All | 2779 | 1991 | 2436 | **2855** | 3203 |

What to know about these numbers:

- **The year comes to 2855 against the target of 2779 (+3%), and the thirtieth hero to day 162 against 155.** I could not land both
  exactly: the modes' stones started on day 1 and the Assault's start on day 60, so matching the total with Assault stones leaves the
  middle of the year a week behind. Tried: (+1 daily, +10 conquest, +0 re-storm) gives 2746 and day 167; (+1, +20, +0) gives 2825 and
  day 157 but puts nothing on repeat conquests, which was asked for; (+1, +12, +1) gives 2887 and day 161. One more stone in the daily
  chest instead (+2) overshoots by about 250.
- **The Assault's days are assumptions**, the softest part of the model: a hold falls 20 days after its army's Elite clear (day 60 for the
  first, day 210 for the ninth), and from day 90 a daily player beats each regrouped Warband in half the weeks (`--restorm 0.5`). The
  re-storm is at Mythic, which `docs/notes/army-pace.md` calls the wall; if players win it less often, the year falls short by about
  10 stones for every point of that share. Worth measuring once the Assault has been played for a while.
- **The Assault's own chests were never in this model**, so the real gap after hiding the modes was smaller than 1991 against 2779
  suggested, and with the modes shown again the year is 3203, not 2779. The Spoils of the Hold and the daily tribute are crowns and are
  still not modelled, so the chest shop's stones are a little understated in every Assault column.
- The first-clear heroes (item 2) are in the model too: they move the fourth and fifth hero, not the later ones.

### Tests

`test/first-hour.test.ts`: the first-clear heroes (given once, only while short, the same hero for the same save, no pull used, old
saves nothing), the Castle at 6 and the Chapel at 10, the moved stones (the amounts, each chest, nothing added with the modes shown,
the parts adding up). `test/wounds.test.ts`: the risen row and the old line left out. Updated for the changed requirements:
`test/modes.test.ts` (the Castle's number), `test/daily.test.ts` and `test/quest-pay.test.ts` (the daily chest's stones).

### Not checked by hand

- The Chapel's card with the Castle open and fewer than 10 stars (it needs a save at 6 to 9 stars; the rule and its words are tested).
- A real first clear on the new build giving the hero: the rule is tested, and the card's line and the join reveal were each seen in
  the browser, but not the two in one played run.
- At 360x780 with a run under way, "Restart from wave 1" sits below the fold of the army card (the card scrolls); the round 2
  Assault line is what took its place.
