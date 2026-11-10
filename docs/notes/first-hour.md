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
