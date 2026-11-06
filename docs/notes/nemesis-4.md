# The Nemesis War, phase 4: duel waves

Phase 4 of the expansion in `docs/design/legends-expansion.md` (section 9, "Phase 4: Duel waves"), built to sections 2.8, 2.10 and 2.11 of
the design on top of phases 1 to 3 (`docs/notes/nemesis-1.md`, `nemesis-2.md`, `nemesis-3.md`). Phase 4's list: the challenge on the wave,
Accept or Refuse, the one-on-one in the middle ring, the rout on a win, and the `--duel` tool. With it comes the other half of *Vain*
(`VAIN_DUEL`, left by phase 3): a Vain nemesis always challenges, and takes 10% more in a duel.

## What it plays as

### The challenge (`src/sim/duel.ts`, `duelOffer`)

- **When.** A wave of an army run may open with a challenge, when a nemesis standing in it has a score to settle with the squad:
  1. it is **Vengeful** against a hero in the squad;
  2. a hero in the squad bears a **Grudge** on it (the deepest Grudge first);
  3. its **Dread** is in the squad.

  A **Vain** nemesis always challenges: by name if one of those holds, else openly ("Hask calls out your champion"). The first nemesis of
  the wave (in its order) that has a reason makes the challenge.
- **At most one a run.** The run's one challenge is kept as `Run.duel`, whatever became of it: accepted, refused, or left part-way.
- **Never** under auto-replay, in the daily, the Last Stand, the Muster, a quest or the Calamity. A guest or a mirror's clone is never a
  champion.
- **The offer reads only the run** (its frozen snapshot and its squad), so it is the same every time.

### On the page (`src/main.ts`, `src/duelRules.ts`, `src/duelView.ts`)

- **The cut-in.** As the deploy opens, after the wave's taunts (phase 3), the taunt cut-in plays once more. The nemesis calls its hero out in
  its army's voice ("Natsu. Come into the circle. Let us end this, you and I."), and the hero it names answers with its personal reply.
  - The lines are in `src/sim/duelLines.ts`: two a voice, named and open, nine voices.
  - It follows Settings, Nemesis cut-ins, but plays in full unless they are off.
  - Reduced motion: the bands fade in, held still, as the taunts do.
- **The card** (a standard ornate card, `openDuelCard`):
  - the eyebrow "Single combat · The Nemesis War" and the title "Hask challenges Natsu", with why ("It swore vengeance on Natsu");
  - the two faces, nemesis and champion, with "vs" between them;
  - what a duel is: alone in the ring for sixty seconds, the escorts and the king's spells out of it;
  - for an open challenge, **Your champion**: a one-row strip of the squad (`menuPick`), the first of it picked to start;
  - **What it means**: Win, Lose, Time and Refuse, in one line each;
  - the footer: **Refuse** (the way out) and **Accept**.

  Tapping Fight while a challenge waits opens its card instead. The card closed any other way counts as Refuse.
- **The wave card** before it: a won wave whose next wave will open with a challenge says so ("Ahead: Hask, Pincushion will call Natsu out
  to single combat"). It is a forecast from the squad as it stands then.
- **The duel's fight.** Accepted, the wave's board is set again with only the two on it, in the **ring**: the middle 5x5, its edge's tiles
  outlined in brass over a light gilt (`BoardView.ring`, steady, kept through the fight). Then:
  - the fight begins at once;
  - the boss's bar is the nemesis's, with the seconds left ("Hask, Pincushion · 0:58");
  - the king's spell row, his Decree and the War Horn are put away (`body.inDuel`), and none of them can be cast;
  - the champion keeps its own skills, ultimate and gear.
- **After it.**
  - A duel won is settled as the wave won: its result card, its pay, its stars.
  - A duel lost or run out of time is settled on its own (`endDuel`), its lines as toasts; then the wave's own deploy opens.
  - The battle music plays on into the wave.

### The duel's rules (`src/sim/duelRing.ts`, `startDuel`, `battle.ts`)

- **`Battle.duel`** marks a duel's fight: who fights, the ring, and how it ended. Every hook it adds is behind it:
  - **placing.** None: the two are set by `startDuel`, the champion at the ring's near side, the nemesis at its far side.
  - **the ring.** No step leaves the ring, whatever chose it. The walks fence it off (`fenceRing`), and `stepTo` refuses a step out. Ice
    does not slide in a duel.
  - **the end.** The nemesis down is a win; the champion down is a loss; sixty seconds with both standing is a timeout (`duelEnd`).
  - **no flight.** A nemesis does not flee a duel: its timeout is its escape.
  - **no heart.** A heart never fights a lost duel again (`reviveParty`).
  - **the king stays out.** `castSpell`, `autoCast`, `castDecree` and `autoDecree` refuse.
  - **Vain** takes 10% more (`VAIN_DUEL`, in `hurt`).
- **The ring** (`ringFor`) is the boss arena's middle when the board has one, else the board's own. It is moved a tile or two when needed so
  that the two can stand at its far sides and walk to one another.
- **The fight** is the wave's own board and nemesis (`startStage`), its escorts taken off, and the fight's two streams moved onto the War's
  side stream (`DUEL_SALT`). The Chapel's rites and Duchess stay out of it.
- **The nemesis's share.** It fights at a share of its wave health and attack (a wall is built for five heroes), tuned with `--duel` (below):

  | | Health | Attack |
  |---|---|---|
  | The plain share (`DUEL_SHARE`) | 18% | 45% |
  | A boss nemesis, on top (`DUEL_BOSS`) | x0.15 | x0.4 |
  | A striker champion (`DUEL_ROLE`) | x1.15 | x1.05 |
  | A support champion | x0.85 | x0.9 |
  | A front-liner or a back-liner | x1 | x1 |
  | Each army, both (`DUEL_ARMY`) | Orc Warband x0.6, Undead Legion x1, Beast Packs x1.35, the Wildwood x1.35, the Labyrinth x0.95, the Ogre Clans x0.78 | |

  The last three armies keep x1, unmeasured (below).

### The outcomes (`settleDuelRun` for the run, `noteWar` for the War)

- **Won.** The nemesis is slain for good:
  - it cannot cheat death;
  - it pays **double**, crowns and War Trophies (doubled once, with a trophy brought home or Vengeance, as phase 3 doubles);
  - the Fallen says "slain by Natsu in single combat" (`FallenNemesis.how: 'duel'`), and the News has a line of its own kind, "Single
    combat";
  - its wave breaks and runs, and counts as won, with its pay ("Hask, Pincushion falls in single combat: the wave breaks and runs");
  - **every hero heals 20%**: each wounded hero stands a fifth nearer whole (`duelHeal`, in `settleWounds`);
  - the heroes who stood out of the duel keep their skills' charge and their summons for the next wave.

  A **warchief** beaten in a duel is not slain. His fall is struck, and he is humiliated (phase 3) and flees to his Muster: he sits out one
  to three runs, comes back Vengeful against the champion with a trophy, and his captains lose loyalty.
- **Lost.** The champion falls and **stands again at half** for the wave (`Run.wounds`). The nemesis gains a Might, by its deed (it slew
  the champion, +1 a run at most), and in the run's snapshot (`mightier`, so it fights the wave a Might stronger). It fights the wave at full
  strength with its escorts. The champion bears a Grudge on it, as any hero it slays does.
- **Time.** The nemesis **escaped**: a Might more by the same rule, and it may learn Elusive. It is **humiliated** if it was under 25% health
  (`DUEL_SHAMED`). It leaves the wave, which is fought without it (its escort's place is the escort's again).
- **Refused.** The wave is fought as usual, and the nemesis is **Mocking** for the rest of the run: +5% attack (`MOCKING_ATK`, in
  `nemStats`, on `NemSnap.mocking`). The deploy is made again with it.

### Vain

Phase 3 gave Vain its cut-in in full. Phase 4 gives it the rest of the design's line: it **always challenges** (openly when it has no score
with the squad), and it **takes 10% more in a duel**. Its card's words say so.

## Saved

- `Run.duel` (`RunDuel`: the wave, the nemesis, the champion's kind and the outcome; `readRunDuel` in `loadRun`).
- `NemSnap.mocking`.
- `FallenNemesis.how` may be `'duel'`; `NewsKind` gains `'duel'` (`readWar` keeps both).
- A save from before reads as it was.

## Determinism and the old fights

- **Nothing new draws from `b.rng`.**
  - The offer is a rule on the run.
  - The duel's fight runs on its own side stream (`mixSeed(seed, DUEL_SALT)`).
  - The humiliation's runs away draw from phase 3's `REVENGE_SALT`.
- **Every fight hook is behind `Battle.duel`**, and every run change behind `Run.duel` or `NemSnap.mocking`, so a fight with no duel plays
  exactly as before.
- **The pinned fights hold:** `nemesis-regression`, `stand-regression` and `ailments-identical`.
- **The tools play as before unless they ask for duels** (`WAR_BOT.duels`).
  - With duels off, the war simulator gives phase 3's numbers to the decimal: seed 1, Might mean 1.6 at day 60, the first member at Might
    10 on day 65.
  - The balance tool's War table (`--nemesis`) and the war simulator take duels by default now. The bot accepts every challenge; its champion
    is the hero named, or else its strongest. `--duels off` (balance) and `--no-duels` (war-sim) turn them off.

## Where phase 4 reads the design narrowly

- **The duel's share is tuned far below the design's start.** The design's 30% health and 60% attack were "starting numbers, tuned so the
  challenged hero at the army's level wins 55 to 65%".
  - Measured, they gave **9%**: a lone hero at its army's level against the nemesis of a five-hero wave.
  - A **boss** nemesis was the worst by far: at the plain share the captains won 65% but the bosses 3%. So a boss takes its own cut on top
    (`DUEL_BOSS`).
  - The armies' walls also differ more than the champions' roles do: the Orcs won 32%, the Beast Packs 89%. So each army has a factor
    (`DUEL_ARMY`) as well as each role (`DUEL_ROLE`, the design's own lever).
- **One challenge a run, refused or not.** "At most one duel a run" is read as one challenge: refusing spends it, so the same nemesis cannot
  ask again at its next wave.
- **A timeout's wave.** The design says the nemesis escaped. It is read as gone from the wave too, and the wave is fought without it.
- **The challenge's card** is a card of its own over the deploy. The wave card tells of the challenge ahead. The design's `waveCardView.ts`
  change is that line: the challenge is answered on the board it will be fought on.
- **Army runs only.** The Muster is the warchief's last stand, so no duel is offered there. The Calamity has no Council of its own yet.
- **The bot accepts every challenge** in the measures below. That is the worst case for the death spiral: a player chooses.

## Images (none new yet)

Phase 4 uses existing art only:

- the taunt cut-in's band (`ui/ribbon.png`) and frames for the challenge's cut-in;
- the sprites' `portrait()` cuts in the Council's frames on the card;
- the ring as a gilt and brass line on the board's own tiles (the board's tile marks, not a new image);
- the third weapon icon (`items/weapon3.png`) for the News's "Single combat".

Nothing new is loaded by URL, so the service worker's list does not change. The images that would replace the placeholders, as prompts:

1. **The duel challenge banner, crossed blades** (the design's row 8, for the card's crest and the ring). "A small heraldic banner for a dark
   fantasy pixel-art game's single-combat challenge, 96x48 pixels, transparent background: two crossed swords, one black-iron and one
   brass, over a torn blood-red pennant with a gold trim, a faint ring of stones beneath, crisp pixel art, 1 px dark outline, muted gothic
   palette, no text."
2. **The ring of stones**, laid over the board's middle 5x5. "A square ring of low standing stones for an isometric pixel-art tactics
   board, seen at a 2:1 isometric angle, 5 by 5 tiles of 64x32 px, transparent everywhere but the stones on the ring's edge: weathered grey
   menhirs a quarter of a tile high, brass bands round a few, moss at their feet, no ground drawn, no text."
3. **The News's Single-combat icon, 24 px.** "A 24x24 pixel-art icon on a transparent background for a dark fantasy strategy game: two
   crossed swords inside a small ring of stones, 1 px dark outline, muted gothic palette with brass and blood-red accents, no text."

Each would be credited in `CREDITS.md` when made.

## The duels (`npm run balance -- --duel`)

Every hero kind alone at its army's own level on Normal, with its talents learned and a castle of the level's size. Each fights the six
measurable armies' captain (an escort risen to captain, at the mid-boss wave) and boss nemesis (the last boss), at Might 1, 5 and 10, 4
seeds a cell, 2,160 duels, plain and again with the hero the nemesis's Dread. `--duel-share`, `--duel-boss`, `--duel-army` and
`--duel-role` override the numbers for tuning.

| | Wins | With its Dread |
|---|---|---|
| **In all** | **59.2%** (the band: 55 to 65%) | **70.2%** (about 70%) |
| Front-liners / strikers / back-liners / support | 53.6% / 60.1% / 64.4% / 57.1% | 65.2% / 71.2% / 75.0% / 68.1% |
| Captains / boss nemeses | 68.0% / 50.3% | |
| Might 1 / 5 / 10 (on Normal, half Might) | 64.9% / 61.1% / 51.5% | |
| Orc Warband / Undead Legion / Beast Packs | 52.6% / 58.0% / 59.1% | |
| The Wildwood / the Labyrinth / Ogre Clans | 67.6% / 60.8% / 56.9% | |

How it was tuned, in four steps:

1. **The design's 30% and 60%:** 9% won.
2. **The plain share at 18% and 45%:** the captains came to 65%, but the bosses stayed at 3%.
3. **The boss's cut of x0.15 and x0.4:** 59% won in all. By role: front 55%, striker 66%, back 63%, support 46%.
4. **The role and army factors.** The roles moved support up and strikers down. The armies first measured from 32% (the Orcs) to 89% (the
   Beast Packs); their factors bring every army to 53 to 68%.

**Kinds still outside 40 to 75%** (the design's per-role lever does not reach a single kind):

- above: the Archer 90%, the Demon Swordsman 83%, the Lightning Mage 81%, the Gunslinger 78%, the Ninja Monk 78%, the Karasu 76%;
- below: the Wanderer 38%, the Kitsune 35%, the Samurai Commander 33%, the Illusionist 31%, the Paladin 30%, the Kraken 28%.

The slow front-liners run out of time often: the Knight in 38 of 72, the Illusionist in 54, the Juggernaut in 26, the Yamabushi in 22. A
timeout is an escape, not a loss: the champion stands whole and the wave is fought without the nemesis. A per-kind multiplier is the next
lever if the owner wants these in the band. The design names only the role's.

**Not measured:** the Infernal Host, the Yokai and the Golem Forge. They are out of the greedy bot's reach at their own level, so their
`DUEL_ARMY` stays x1.

## The balance (table 5g, `--nemesis typical|harsh|full`)

The same commands as phases 1 to 3, now with the bot taking every duel it is offered.

`npm run balance -- --no-tables --nemesis typical|harsh|full --talents --attempts 16 --war-runs 10 --only
orcs,undead,beasts,wildwood,labyrinth,ogres`, with `--might 3` for `full`. The Councils are grown by real fights with duels taken:

- typical: 13 members, Might mean 2.1;
- harsh: the same five Might up, mean 6.9;
- full: four to each army, Might 3.

| Army (Normal, its level) | no War | typical | harsh | full, Might 3 |
|---|---|---|---|---|
| Orc Warband (1) | 1.8 | 2.8 (+0.9) | 2.7 (+0.9) | 2.1 (+0.3) |
| Undead Legion (8) | 2.1 | 2.1 (+0.0) | 2.1 (+0.0) | 2.3 (+0.2) |
| Beast Packs (15) | 1.4 | 1.4 (+0.0) | 1.4 (+0.0) | 1.5 (+0.1) |
| The Wildwood (22) | 1.1 | 1.1 (+0.0) | 1.1 (+0.0) | 1.4 (+0.3) |
| The Labyrinth (35) | 3.3 | 2.6 (-0.8) | 3.3 (-0.1) | 2.9 (-0.4) |
| Ogre Clans (45) | 3.3 | 3.3 (+0.0) | 3.3 (+0.0) | 4.1 (+0.8) |
| **The largest rise** | | **+0.94** | **+0.88** | **+0.75** |

**Under the bar of +1, all three** (phase 3: +1.00, +0.94, +0.75).

- **Before the army factors**, the typical Council's Orc Warband rose **+1.19**. Its Might-7 Orc Warlord dreads the Warlock, so he
  challenged at the last wave. The level-1 champion lost the duel more often than not (the Orcs' duels were 32% at the plain share), and he
  fought the wave a Might stronger. The Orcs' factor (x0.6) brings that duel into the band, and the cell to +0.94.
- **The full test is phase 3's to the decimal.** Its nemeses all dread the Wizard, and the recruits' party has none, so no challenge is
  made there.

## The war simulator (`npm run war-sim`)

Two seeds, 120 days, 3 runs a day, the bot taking every duel; it now also prints the duels: why, and how they went.

| | phase 3 (seed 1 / seed 2) | **phase 4, duels taken** | Target |
|---|---|---|---|
| Duels (why) | | **106: Dread 88, Grudge 10, Vengeful 8 / 105: Dread 94, Grudge 6, Vengeful 5** | |
| ... won, lost, out of time | | **101, 3, 2 (95%) / 102, 3, 0 (97%)** | |
| Might mean at day 60 | 1.6 / 1.4 | **1.7 / 1.3** | 3 to 5 |
| ... days 53 to 67 | 2.3 / 1.5 | **1.6 / 1.3** | |
| Might mean at day 90 / 119 | 2.3 / 3.3, and 2.8 / 3.6 | **2.3 / 3.0, and 3.7 / 3.6** | |
| Lost to infighting a week, from week 3 | 0.8 / 0.8 | **0.8 / 0.4** | about 1 |
| The Council's own seat changes a week | 12.1 / 8.3 | **13.9 / 10.9** | 3 to 5 |
| First member at Might 10 | day 65 / day 102 | **day 117 / day 82** | not before day 45 |

**What the duels do to the War.**

- **Nearly every run brings a challenge.** A newborn's Dread is the hero who hurt it most, and the bot's five never change, so the Dread is
  almost always in the squad.
- **The bot wins 95 to 97% of its duels.** Its level grows ahead of the armies it plays (as phase 3's note says, it outclasses them to about
  week 12). The duels are tuned at each army's own level, where they sit at 59%.
- **So the duels slay more nemeses**, at double pay. The two weeks round day 60 fall (2.3 to 1.6 on seed 1); the first member at Might 10
  comes later on seed 1 and sooner on seed 2; by day 119 the means are about where phase 3's were.
- **The day-60 mean was already short of 3 to 5 in phase 3.** It stays short. A player who refuses some challenges, or who plays nearer
  the armies' levels, slays fewer.

**Duels off reproduces phase 3 exactly.** `npm run war-sim -- --no-duels` (seed 1) gives phase 3's numbers to the decimal: day 60 1.6,
days 53 to 67 2.3, day 119 3.3, Might 10 on day 65, 39 fled and 55 humiliated, 12.1 own seat changes a week.

```bash
npm run war-sim                       # 120 days, 3 runs a day, seed 1, duels taken
npm run war-sim -- --seed 2
npm run war-sim -- --no-duels         # as phase 3
npm run balance -- --no-tables --duel --duel-seeds 4 --only orcs,undead,beasts,wildwood,labyrinth,ogres
```

## Checks

- `npm run typecheck`: clean. `npm run web`: built.
- **The full `npm test`:** 2,608 tests, all passing.
  - `test/duel.test.ts` (18 tests):
    - **the challenge:** who challenges and whom (Vengeful, then the deepest Grudge, then the Dread, a Vain one openly); none without a
      score; the offer the same every time, only in its wave, only in an army run, never a guest.
    - **one a run:** accepting or refusing spends it.
    - **refusing:** Mocking's +5%.
    - **the duel's fight:** the two alone, in the ring all the way, sixty seconds, the nemesis at its share, no king's spell; it replays
      exactly on its side stream, and the wave's own fight is untouched by it; a ring always stands where the two can meet.
    - **Vain:** a tenth more in a duel, and only there.
    - **a win:** the wave won with its pay, double crowns and War Trophies, no cheating death over twelve saves, Fallen "duel", every hero
      healed a fifth.
    - **a warchief:** humiliated, not slain.
    - **a loss:** the champion at half, a Might more in the War and the snapshot, the wave still to fight with its escorts, the champion's
      Grudge; and no heart fights it again.
    - **a timeout:** an escape, humiliated under a quarter and not at half, the wave fought without it.
    - **the rest:** an open challenge's champion; the save's round trip and its reader; the challenge's lines in every voice; the card's
      words; the duel's bar; the wave card's line ahead; the bot's duels off by default.
  - No test was loosened or removed. Phase 1 to 3's tests pass unchanged.
- **The pinned fights:** `nemesis-regression`, `stand-regression` and `ailments-identical` hold.
- **The fight HUD** (`node tools/combat-hud/probe.mjs`):
  - it gains a **duel** case (`SCENES=duel` runs it alone): a nemesis Vengeful against a placed hero planned into the wave;
  - it is measured twice, the challenge's cut-in over the deploy, and the duel's fight in its ring with its bar;
  - the sizes are 393x852, 360x780, 412x915, 360x640 and 393x852 with a 24 px top inset;
  - **0 overlaps**, there and in every other case (PROBE_TOTAL);
  - shots in `docs/samples/combat-hud/nemesis4-*`.
- **Screens** at 393x852, 360x780 and 412x915: `docs/samples/nemesis-4/` (`node tools/nemesis/shots4.mjs`, saves in
  `tools/nemesis/saves4.ts`):
  - the challenge's cut-in (Hask calls Natsu out, Natsu answers), and the same under reduced motion;
  - the challenge's card and its foot, and an open challenge with the squad's strip;
  - the duel's fight in its ring with Hask's bar and seconds (his health raised for the shot, so the level-30 Archer does not end it first);
  - the wave card after the duel won;
  - the News and the Fallen telling of duels.
- **The balance and the tools:** `--nemesis typical|harsh|full` (above, under +1), `--duel` (above) and `npm run war-sim` on two seeds, and
  with `--no-duels` (above).
