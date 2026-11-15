# NEMESIS-DEPTH: making the Nemesis War more interesting (stage 1, design)

The owner's ask: "We should add more depth to the nemesis system. Make it more interesting." This note is the critique of the War as it
plays today (main 0.604.0) and the proposals. Nothing here is built yet; it waits for the owner's choice.

Out of bounds, by the director's word: anything that leans on the Dynasties (heirs, the Houses, the Legend Oath, the Shades, the Blood
Grudge, heirlooms), which are being removed on `claude/remove-dynasty`, and anything in which a hero dies for good.

## 1. How it plays today

What I ran:

- `npm run war-sim` (120 days, three army runs a day, seed 1, the greedy bot).
- The phase 3 screens, taken afresh on the current build (`tools/nemesis/shots3.mjs` into a scratch folder): the Council, a captain's card,
  the taunt and duel cut-ins, the plate in the fight.
- A read of the code (`nemesis*.ts`, `council.ts`, `revenge.ts`, `duel.ts`, `muster.ts`, `nemesisLines.ts`, `assault/garrison.ts`,
  `warAnswer.ts`, `gateDuel.ts`, `lastHold.ts`) and of `nemesis-1.md` to `nemesis-4.md` and `assault-0.md` to `assault-5.md`.

The war simulator's numbers, the ones that matter here:

| What | Today | The design's target |
|---|---|---|
| Seat changes a week (from week 3) | 27.0, 15.3 of them the Council's own turns | 3 to 5 |
| Recruits a week (strangers the heroes never fought) | about 20 to 30 in weeks 2 to 7 | none named |
| Named by the heroes' fights a week | 3 to 18 | |
| Might mean on day 60 | 1.9 | 3 to 5 |
| Warchiefs in 120 days | 17; most held the seat 2 to 4 days (the longest 22) | at least two weeks each |
| Duels | 104, **97% won** (captains 23 of 23, warchiefs 13 of 13) | |
| Trophies taken, Vengeances | 0 and 0 (the bot's saves have no Sworn pairs, so this cannot be judged) | |
| War Trophies at the end | 459 unspent | |

### What works

- **Births are earned.** A foe is named because it slew, maimed or outlived a hero, and the first trait is read from what actually happened.
  That is the heart of the thing and it is sound.
- **The Dread** is the best idea in the system: a weakness the player made, which they can see and use (the skull on the deploy bench).
- **The cut-in looks good.** The portrait band and the hero's answer read well at 393 px, and a hero answering by name is a real moment.
- **The card** is clear: Grudges and the Avenger, trophies, "Slay: 640 crowns, doubled for the trophy". The pyramid is handsome.
- **The Muster and the Last Hold** give the War an end to aim at.

### What is shallow, repetitive, invisible or forgettable

1. **Nobody lives long enough to be a nemesis.** Twenty-seven seat changes a week, about five times the target. Most seats turn over before
   the player meets their holder twice, and a warchief lasts two or three days. A nemesis needs a second and third meeting to become
   *your* nemesis, and it rarely gets them. Might stays near 2, so the "it grew because it kept beating me" arc barely shows.
2. **The Council fills with strangers.** Recruits (elites of opened armies) take most of the free seats. The board ends up holding a dozen
   names the player never fought, which makes the people they did fight harder to find. A Recruit is a nemesis with no grudge.
3. **The memory is a ledger, not a memory.** "Slew Kwame the Knight · Undead Legion · Hard · wave 15" is a database row. The log
   (`nemesisLog.ts`) already knows far more: the ultimate that nearly killed it, the river it was knocked into, the height it fought
   from, the 3% it was left on, the spell that missed. None of that comes back.
4. **Every orc talks alike.** The taunts are nine triggers by nine army voices, two lines a cell. After a dozen meetings the player hears
   repeats, and two orc captains are indistinguishable except by their traits. Traits are mostly immunities, so they are numbers, not
   character.
5. **The Council's politics are invisible and untouchable.** Feuds, betrayals and feasts happen between runs and are told as News lines
   that few will read. Rivalries vanish once a feud is settled. The player cannot lean on any of it.
6. **The player has no way to seek someone out.** "Hunt" opens the army and hopes. A member appears in a quarter of the waves, two at most a
   run, so meeting a particular captain is luck.
7. **Duels are a formality.** 97% won by the bot, and every warchief duel won. Refusing is never right, and accepting is never a risk.
8. **The War Trophies have little to buy.** One shard a week and scouts. The sim ends on 459 unspent.
9. **Looks don't change.** Scars are ✕ marks; a captain is its plain foe with a coloured rim. A nemesis that has beaten you three times
   looks exactly as it did the first time.
10. **It doesn't learn.** The traits come from what hurt it in the fight it was born in, then mostly stop. Nothing says "it has seen your
    Knight's shield bash before".

The theme of all ten: **the system makes many nemeses and remembers little about each**. Depth comes from the opposite: fewer of them,
living longer, remembering more, and each a different person.

## 2. The ideas

Each idea lists what the player sees, the rules and numbers, its ties, its cost and a rough priority. All randomness comes from side streams
of their own (named below); every fight hook stays behind `Unit.nem`, so `nemesis-regression`, `stand-regression` and
`ailments-identical` keep holding.

### Idea 1. Staying power: fewer nemeses who last (priority 1, cost S)

**Sees and feels:** the same five or six faces keep coming back. A captain is met three, four, five times before the end, grows, scars and
learns. The Council board is mostly people you have fought.

**Rules:**

- **Spared by fate in the first two meetings.** A member brought to 0 hp in its first or second meeting is always dragged off the field
  (cheating death at 100% instead of 15 to 35%), with a scar and humiliation as today. From the third meeting, today's chances. A duel lost
  and Vengeance still slay outright, so the player can always finish one on purpose.
- **Recruits only into the bottom seats, and fewer of them.** A Recruit is forced only while fewer than **three** members sit (as today), and
  otherwise weighs 1, down from 3. A Recruit joins as a lieutenant at Might 1 with the tag "Unblooded" and no Dread; its card says "You have
  never met". It is placed in its army's runs at double the lieutenant's chance until it is met, so strangers become acquaintances fast.
- **A warchief holds his seat for at least 10 war turns** before the Muster can open (about three or four days' play), and the Muster opens
  at **three** captains slain since the last one (from two).
- **The death-spiral guard** the design left to the owner (`nemesis-2.md`): a member that wins three meetings in a row feasts instead of
  growing, half the time. This keeps the longer-lived ones from running away.
- Target, measured by `npm run war-sim`: seat changes 4 to 7 a week, a mean of three or more meetings before a member falls, warchiefs
  lasting a week or more, Might mean 3 to 5 by day 60.

**Ties:** the Council's turns (`council.ts`), cheating death (`cheatDeath`), the Muster (`muster.ts`). It changes no fight's rules.

**Cost:** S. A handful of numbers in `council.ts` and `cheatDeath`, the war simulator's targets, and tests for the new rules. No art.

### Idea 2. Remembered fights: memories and taunts that name what happened (priority 1, cost M, writing heavy)

**Sees and feels:** "You threw me into the Redwater, Kwame. I learned to swim." "Your fire left me on a sliver of life at the Bonefire. I
stood up. You will not." A nemesis's card shows a short history in plain English, and its name changes with what it has been through.

**Rules:**

- **A memory is a scene, not a row.** At settle, `noteNemesis` keeps up to three **moments** from the fight's tally, picked by how striking they
  were, each a small record: what (`knockedInto` water/lava/pit, `nearDeath` with its health share, `ultimate` taken from a named hero,
  `spell` the king cast on it, `heights` it fell from, `fled`, `slewWith` the blow that killed, `weather`), the hero, the land and the wave.
  The log already counts all of these; it only needs to keep the strongest one of each kind.
- **Taunts read moments first.** Six new trigger kinds (`ult`, `water`, `lava`, `fall`, `nearDeath`, `kingSpell`) come before today's nine,
  so the most specific thing it has to say is what it says. Each cell gets four lines (about 216 new lines for the nine voices) and every
  hero gets a reply for the three commonest (about 135). Drafted in batches for the owner to read, as the bond scenes were.
- **No repeats.** A nemesis keeps the last three lines it spoke (`Nemesis.said`) and never repeats one while another fits.
- **Epithets that grow.** On a new deed the epithet may change once a rank, from a bank keyed by moment ("the Twice-Burnt", "Who Swam the
  Redwater", "Kwame's Shadow", "the Thrice-Spared"). Its old epithets go on its card's history ("Once called Pincushion").
- **The card's history** turns the memory lines into sentences in its army's voice, newest first, up to eight.

**Ties:** the taunt cut-ins (`nemesisLines.ts`, `tauntCut.ts`), the duel calls (`duelLines.ts`), the Assault's captains' taunts
(`warAnswer.ts`, which already uses the run's taunts), the News.

**Cost:** M. Code: small (the tally already exists; a record, a picker, the new triggers). Writing: the bulk, about 350 lines. No art.

### Idea 3. Temperaments: each nemesis a different person (priority 1, cost M)

**Sees and feels:** two orc captains now play and talk differently. One is a **Brute** who wades in and roars, one a **Schemer** who hangs back
behind his escorts and sneers. The card names it: "Temperament: Schemer. Waits for others to do the bleeding."

**Rules:** each nemesis is born with one of eight temperaments, drawn from its own stream (`TEMPER_SALT`), weighted by its deed and base
(a boss leans proud, a slayer leans brute). Each sets four things:

| Temperament | In the fight | On the Council | Duels and fleeing | Voice |
|---|---|---|---|---|
| Brute | goes for the nearest hero, +5% attack, -5% health | feuds weigh x2 | always accepts a challenge, never flees | blunt |
| Schemer | keeps two tiles behind its escorts until one falls | betrayals x3, loyalty drifts -2 a turn | never challenges; flees at 30% | sly |
| Glory-hound | targets the strongest hero | Trials x2 | always challenges (today's Vain) | boastful |
| Coward | stays at the back | deserts sooner (two losses) | flees at 35%, never challenges | whining |
| Zealot | fights to the end | loyalty never drops below 50 | never flees, never betrays | fanatical |
| Avenger | +10% against any hero with a Grudge on its brothers | blood-oaths x3 | challenges a Vengeful target | grim |
| Trickster | starts hasted 2 s, blinks one tile once at half health | plots (Idea 7) x2 | flees at 25% | mocking |
| Old Hand | -10% damage from the hero it met most | Feasts x2 | accepts, never challenges | weary |

- **The voice is a layer on the army's.** Each temperament has a short opening or closing phrase bank per army (about 8 x 9 x 3, 216 short
  phrases), added before or after the trigger's line, so an orc Schemer and an orc Brute say the same thing differently.
- **Vain and Craven** become two temperaments' marks rather than weaknesses drawn at Might 5, freeing that slot for the elemental fears.
  (An old save keeps its weaknesses; only newborns change.)

**Ties:** the AI (`battle.ts`, behind `Unit.nem`), `council.ts`'s weights, the duel offer and fleeing (`nemesisTraits.ts`), the taunts. The
temperament shows in the Assault too: a Schemer's post holds back, a Brute's charges.

**Cost:** M. A new field, the AI's four small leanings, the weights, about 216 phrases. No art beyond eight small icons (prompt in section 4).

### Idea 4. Hunts: go after one captain on purpose (priority 1, cost S to M)

**Sees and feels:** on a member's card, **Hunt** now offers "Set a hunt: Morrow will be in your next Undead Legion run, at wave 9. Bounty: 4
War Trophies". The army's run opens with a "The hunt is on" line, the wave is marked on the run's map, and killing him pays the bounty.
If he lives, he gloats.

**Rules:**

- One hunt at a time. Setting one costs **2 War Trophies** (a sink for the pile) and fixes its target into its army's next run: `planRun`
  places it at a set wave (a boss at its own wave; any other at the next third of the run), and reveals one secret.
- **Bounty:** the slay's pay plus `2 + Might / 2` War Trophies, and a **Hunter's mark** for the hero who struck the blow (a cosmetic badge
  on its card for that nemesis: "Hunted Morrow the Unburnt").
- **The quarry fights back.** A hunted nemesis knows it is hunted: it brings one escort more, and starts the wave with a 10% shield.
- **A hunt failed** (the run lost, or the quarry fled or cheated death): it gains a Might by the usual rule, the trophies are spent, and it
  taunts about it next time ("You came looking for me, Kwame. You found me.").
- The day's daily, the Last Stand and the Calamity are never touched.

**Ties:** `planRun`/`planNemeses` (placing is already there), the Spoils' trophies, the run's wave map, the taunts (a `hunted` trigger), the
News.

**Cost:** S to M. The card's button, a `War.hunt` field, placing, the bounty, one trigger's lines. No art (the run map's mark can reuse the
boss marker).

### Idea 5. It learns your tricks: studied counters (priority 2, cost M)

**Sees and feels:** "Morrow has studied Kwame: his Shield Bash no longer stuns it." The card gains a **Studied** row. The player who brings
the same squad every time finds the nemesis ready for it; changing a hero beats the lesson.

**Rules:**

- After any meeting it lives through, a nemesis studies **the hero that dealt it the most** (never its Dread: it fears that one too much).
  Two studies at most; a third replaces the oldest.
- A studied hero's attacks deal it **15% less**, and the **first** stun, knock-back or root from that hero in a fight fails ("Read it!").
- The Dread stays: a nemesis cannot study the hero it dreads, so the player's counter to a study is always to hand.
- A study shows as soon as it is learned (the player saw it happen), and the taunts have a `studied` trigger.

**Ties:** `nemHurt` and the ailments' gate (behind `Unit.nem`), the card, the taunts, the Assault's officers (who carry their snapshots).

**Cost:** M. Two hooks and their tests, the card's row, lines. No art (a small book icon from the item icons for now).

### Idea 6. Spare or slay: turning a captain (priority 2, cost M to L)

**Sees and feels:** a captain beaten in a duel, or brought under 20% while its loyalty is under 40, kneels. The player chooses: **Slay**
(today's pay) or **Spare**. A spared nemesis becomes an **Informant**, then perhaps a turncoat who fights for you once, then perhaps a
traitor who comes back.

**Rules:**

- **When.** At the end of a won duel, or a won wave in which a member under 40 loyalty fell below 20% and then fell (instead of cheating
  death, it yields). A card asks: Slay or Spare. Auto-replay always slays.
- **Spare.** It leaves the Council (its seat empties, its sworn lieutenants -20 loyalty) and becomes an Informant for **five runs**:
  - every secret of its old superior and its sworn brothers is revealed at once;
  - the run's map marks every wave that holds a nemesis;
  - once, it can be **called** as a guest in one of its own army's runs, fighting beside the five as the passing cart's guest does (never a
    champion);
  - in its army's Assault, its old post's gate opens at the start (the hold's post is left to a nameless officer and its ring).
- **Turncoat or traitor.** When the five runs end, it goes: half the time (its own stream) with thanks (a War Trophy and a farewell line),
  half the time back to the Council as a lieutenant with **Betrayer** (Vengeful against the hero who spared it, +1 Might). The odds move by
  how it was treated: called as a guest +15% faithful, its brothers slain while it informed -15%.
- Sparing pays no crowns and no War Trophies: intel and a friend are the price.

**Ties:** duels (`duel.ts`), the guest hire (`guest.ts`), the Assault's posts (`garrison.ts`, `councilPlaces`), the Council's seats and
loyalty, the run's map.

**Cost:** M to L. A new state for a nemesis, the choice card, the guest path, the Assault's open gate. Writing: a kneeling line, a farewell
and a return per voice. No new art (its portrait wears a white rim while it informs).

### Idea 7. The Council's politics in the open: rivals, plots and the player's hand (priority 2, cost M)

**Sees and feels:** the Council board draws the web: brass lines for sworn captains (as now), red for blood-oaths, a jagged violet line for a
**rivalry**. Tapping a line says what it is ("Throg and Morrow: rivals since the feud of turn 31"). Now and then the camp opens on a
**Council stirs** card: two portraits, one event told in their voices, sometimes with a choice.

**Rules:**

- **Rivalries** form after a feud, a trial or a betrayal that both live through, and last until one falls. A rival slain by the heroes
  gives the other +1 Might ("climbs over the body") and a line. Rivals never stand in the same wave. A rivalry is the Council's third bond,
  beside sworn and blood-oath.
- **Plots.** The Council's turns gain a fourth kind of event, the **Plot** (weight 1, more with a Schemer or Trickster): one member schemes
  against its superior or a rival, resolving in two turns. The News and the camp's card show it. The player may **spend 2 War Trophies**:
  - **Tip off** the target: the plot fails and the plotter is slain or cast down;
  - **Back** the plotter: it succeeds and the plotter rises a seat;
  - or do nothing, and the usual odds apply.

  Both choices have a reason: tip off a captain you want dead to rob it of a rival, back the weaker one to put a softer face on the seat.
- **Council stirs** shows at most once a day, for a betrayal, a coronation or a plot. It is a standard ornate card with two portraits and the
  line in voice; "Close" leaves the plot alone.

**Ties:** `council.ts` (the event, the weights from Idea 3), the board (`nemesisView.ts`), the camp (`home.ts`), the War Trophies.

**Cost:** M. The rivalry and the plot in the sim, the lines on the board (SVG over the pyramid, no art), the card, about 60 lines of writing.

### Idea 8. Spoils of the hunt: named relics from a nemesis's own traits (priority 3, cost M, art)

**Sees and feels:** "Morrow's Unburnt Crown: the bearer cannot be set alight. Taken from Morrow the Unburnt, captain of the Undead Legion,
in single combat." A charm whose power is the nemesis's trait and whose card tells the story.

**Rules:**

- A captain or warchief **met three times or more** drops its **relic** when slain (one each, never from a Recruit or an Informant).
- The relic is a **charm** (`gear.ts`'s charm slot) at the slain one's tier. Its power is one of its traits, scaled for a hero (no rarity, so
  each is a side-grade, tuned against the charms already there): Fireproof, immunity to burning; Arrow-catcher, 12% less from shots; Iron
  Skull, stuns half as long; Survivor, once a fight stand again at 10%; and so on for each trait.
- The relic's card keeps its story (who, when, how), and a hero wearing one into its old army's runs makes the nemeses there say so.
- Spending: the Spoils tab can **reforge** a relic into another of the same nemesis's traits for 3 War Trophies.

**Ties:** gear, the Spoils, the taunts (`relic` trigger), the codex.

**Cost:** M, and art: a relic icon per trait (about twenty, prompt in section 4) until then the trait's item icon stands in.

### Idea 9. Scars that show (priority 3, cost S code, M art)

**Sees and feels:** a nemesis that has cheated death twice wears a bandage and a darker cloak; one burnt carries a scorch; a warchief stands
larger with a banner on his back.

**Rules:** looks only. Up to three overlays on the fighter's sprite and portrait, chosen from its moments (Idea 2): burnt, frozen, slashed,
bandaged, one-eyed. A captain draws at 1.08 times, a warchief at 1.15, with his banner. Reduced motion is untouched (nothing moves).

**Ties:** `unitView.ts`, the portrait cuts, the taunt band.

**Cost:** S for the code, M for the art: one overlay sheet a body size (prompt in section 4). A tint and the ✕ marks stand in until then.

### Idea 10. Duels with stakes (priority 2, cost S)

**Sees and feels:** a challenge is a real choice. Winning is worth more; losing can happen.

**Rules:** the share is tuned up so the bot wins about **70%** (from 97%), a warchief's about 55%. A won duel pays triple (from double),
gives the champion a **Duellist's mark** against that nemesis, and is the only way to win a Glory-hound's relic (Idea 8). Refusing a
challenge no longer only adds +5%: the nemesis tells the camp, and every member of its army is **Mocking** for the run.

**Ties:** `duel.ts`, `DUEL_SHARE`, `npm run balance -- --duel`.

**Cost:** S: numbers, the measuring tool, a few words on the card.

## 3. Recommended first batch

These four make the existing War feel deeper without new systems the player must learn. Together they turn "lots of interchangeable names"
into "a few memorable enemies":

| # | Idea | Why first | Work | Art |
|---|---|---|---|---|
| 1 | Staying power | Nothing else can be memorable while seats churn five times too fast | S: rules, numbers, the war simulator's targets, tests | none |
| 2 | Remembered fights | The most direct answer to "more interesting": they talk about what happened | M: about 350 lines of writing drafted for the owner | none |
| 3 | Temperaments | Each nemesis a person, felt in the fight, the Council and the voice | M: AI leanings, weights, about 216 phrases | 8 small icons (stand-ins first) |
| 4 | Hunts | Gives the player a hand: a reason to open the board and a sink for War Trophies | S to M | none |

Together: about two medium builds. Each would be its own commit with its tests and the war simulator re-measured; the balance table (5g) is
re-run after Idea 1 and Idea 3, since longer-lived and temperamental nemeses change the fights.

The second batch I'd suggest: **Idea 10** (duels with stakes, small), **Idea 5** (studied counters), **Idea 7** (open politics), then
**Idea 6** (spare or slay), the biggest. Ideas 8 and 9 wait for their art.

## 4. Art (prompts, if chosen)

Ideas 1, 2, 4, 5, 7 and 10 need none. If Idea 3, 8 or 9 is chosen, their prompts go into `docs/notes/nemesis-depth-art-prompts.md`, each
for the repo `hpatter9/legends-of-the-fall`, branch `art/nemesis-depth`, under `art-source/nemesis-depth/`, on a transparent background in
the game's dark pixel-art style:

- **Temperament icons**: one sheet, eight 24 x 24 icons (a clenched fist, a hooded eye, a raised trophy, a running heel, a burning
  candle, a red oath-knot, a jester's mask, a worn helm).
- **Relic icons**: about twenty 32 x 32 charms, one per trait (an iron skull circlet, a feather-fletched ward, a stitched heart locket, and so on).
- **Scar overlays**: one sheet a body size (small, medium, large), five overlays each (burn, frost, slash, bandage, eyepatch), plus a
  warchief's banner.

## 5. Questions for the owner

1. Which ideas, and in what order? (Recommended: 1, 2, 3, 4.)
2. Idea 1: is "spared by fate in the first two meetings" acceptable? It makes the first kills non-final, which is the point, but the
   player may feel cheated. The alternative is only the Recruit and Muster changes, which roughly halve the churn.
3. Idea 3: may Vain and Craven move from weaknesses to temperaments for newborns (old saves keep theirs)?
4. Idea 6 (when it comes): may a spared nemesis come back as a traitor, or should sparing always be safe?

---

# Stage 2: the build (the owner chose ideas 1 to 4)

The owner's answers, through the director: build the first batch (1, 2, 3 and 4), and yes, a nemesis cannot die in its first two meetings.
The other open questions take this note's defaults; each one settled is listed under its idea.

## Idea 1, built: staying power

- **Fate spares it** (`FATE_MEETINGS = 2`, `nemesis.ts`; `cheatDeath` in `council.ts`). A member brought down in its first or second
  meeting is always dragged off the field. It cheats death as before: a scar, humiliation, a trophy taken, and it sits out one to three runs.
  The cheat's draw is still made, so the stream is as it was. Vengeance, the Muster and a hold's conquest still slay it outright.
- **Only an old foe calls a champion out** (`duelOffer`, `duel.ts`). Settled here: one met fewer than two times makes no challenge. In the
  first measure, duels were how the heroes slew most nemeses at their first meeting (104 duels, 96 won), straight past fate. A challenge
  is now between old foes, which is what a duel should be.
- **A Recruit weighs 1** (from 3) on the Council's turns (`EVENT_WEIGHT`). It is still forced while fewer than three lieutenants sit.
- **Strangers come looking** (`planNemeses`). A lieutenant never met is placed before the others, at twice the chance (`STRANGER_CHANCE`).
  Its card says "Unblooded: you have never met". One met once says "fate spares it at your next meeting".
- **The death-spiral guard** (`GUARD`): a member that has won three meetings in a row feasts instead of growing, half the time, on its
  own stream (`GUARD_SALT`). The wave card says "Gash feasts on its victories, and grows no stronger".
- **A warchief's tenure** (`CHIEF_TENURE = 10` war turns, `War.crowned`, `tenureLeft`): his Muster cannot open sooner, and it now needs
  **three** captains slain (`MUSTER_NEED`, from two). The board says "The Warchief is new to his seat: his Muster can be called in 4 more
  war turns". The turn that opens it says so in the News. A warchief crowned before this keeps no turn, so he has no tenure to serve.

### Measured (`npm run war-sim`, 120 days, seed 1)

Main (0.606.0) first, then with Idea 1. The war simulator now also reports the meetings a member had when the heroes slew it, the share of
seats held by strangers, and the share of newcomers who were recruited rather than named by a fight.

| | Main | Idea 1 | Target |
|---|---|---|---|
| Seat changes a week, from week 3 | 26 (the Council's own turns ~10 to 15) | 22.8 (the Council's own **5.5**) | the Council's own 3 to 5 |
| Slain by the heroes | 207, after **1.7** meetings on average (30 after three or more) | 85, after **3.0** (69 after three or more) | three or more |
| Strangers' share of the seats | 28% | **10%** | low |
| Newcomers recruited (not named by a fight) | 49% | **21%** | low |
| Warchiefs in 120 days | 20, most 1 to 4 days | 10, most 4 to 11 days (one 20) | a week or more |
| Duels | 106, 93% won | 55, 96% won (now only between old foes) | (Idea 10) |
| Might mean, days 53 to 67 | 1.7 | 1.7 | 3 to 5 |

What it has not done: the **Might** has not risen. Every member is spared by fate in its first meetings, so it is humiliated each time,
and it then sits out one to three runs (110 humiliations, up from 42). That keeps it alive, but it is met less often, so it grows less. The
total of seat changes is still high (22.8 a week) because new members are named by the fights at about ten a week, and a newborn
replaces a weak lieutenant. If the owner wants the Might up, the next lever is to have fate's sparing not humiliate (no runs sat out).
Duels are still won 96% of the time; that is Idea 10's job.

## Idea 2, built: remembered fights

- **Moments** (`src/sim/nemesisMoments.ts`). A nemesis that lives through a fight, or is dragged off it, keeps up to two of the fight's
  striking moments. It holds six at most, newest first, and one of a kind about the same hero replaces the older (`keepMoment`). The kinds:
  - **skill**: a hero's skill dealt it a quarter of its health ("Took Kwame’s Shield Bash in the highlands, wave 9, and lived");
  - **brink**: it lived on under 12% of its health;
  - **thrown**: it fell from a height, or a hero shoved or launched it;
  - **Eidolon**: an Eidolon's strike hit it;
  - **king's spell**: the king's spell hit it;
  - **element**: fire, frost, storm or venom ticks took 15% of its health.

  Each moment names the hero, the land and the wave.
- **The tally learns three things** (`nemesisLog.ts`, still no hook inside the fight): each hero's skill damage, credited to the skill it
  last cast (`FoeLog.skills`); who struck a foe last before it was shoved (`thrownBy`); and the most levels it fell at once (`drop`).
- **Taunts read moments** (`MOMENT_TAUNTS` in `nemesisLines.ts`: six moments, nine voices, four lines each, 216 new lines). They fill
  from `{hero}`, `{kind}`, `{what}` (the skill's name or the element) and `{land}` ("the highlands"). In `triggerOf`:
  - a moment about a hero on the board comes after a trophy and **before a humiliation**. I settled this here: every nemesis fate spares is
    humiliated, so with the humiliation first it would crowd the moments out;
  - a moment about no hero comes before an escape.
- **No repeats.** The line now turns with the nemesis's meetings (`met`), not the run's seed, so a nemesis never says the same line twice
  running while its cell has more than one. The old triggers keep their two lines a cell. **Settled here:** the heroes' replies stay as they
  are (each hero's personal reply answers a moment); the design's 135 new replies are left for a later batch.
- **Epithets grow** (`remembers`, `epithetFrom`, `EPITHET_SALT`). From its third meeting, once at each rank, an old foe's epithet changes
  to one from its newest moment's bank ("Who Would Not Die", "the Twice-Burnt", "Kwame’s Survivor", "of the Long Drop"). The old
  epithet is kept (`Nemesis.was`, three at most), the memory says "Now called …", and the wave card says "Hask, Pincushion is now called
  Hask, Who Would Not Die".
- **The card** has a **Remembered fights** section: each moment as a line of history, and "Once called Pincushion".
- Saved: `Nemesis.moments`, `was` and `epiAt` (read and capped by `readWar`; a bad moment is dropped), and `NemSnap.moments` (`decorate`).
  An old save reads as it was.

### Measured

The fights are unchanged (Idea 2 only reads them), so the war simulator's other numbers are Idea 1's. Its new taunt measure: each
member's taunt as it would open its next meeting, compared with its taunt before.

| | Main | Ideas 1 and 2 |
|---|---|---|
| The same taunt as last time | 8 of 43 (19%) | **0 of 103 (0%)** |
| Taunts by trigger | slew 152, dread 85, humiliated 42 | humiliated 108, slew 76, **thrown 36, skill 32**, dread 21, **brink 5** (before the moments were moved ahead of a humiliation) |

The bot's saves never cast the king's spells or call an Eidolon, and seldom burn a foe for 15% of its health, so those three moments do not
show in the simulator.

## Idea 3, built: temperaments

Every nemesis born from now on, named by a fight or recruited, has one of eight temperaments (`src/sim/nemesisTemper.ts`). It is drawn
at its birth from its own stream (`TEMPER_SALT`), weighted by what it did and what it is:
- a boss leans Glory-hound and is never a Coward;
- a slayer leans Brute, a maimer Schemer, one that escaped Coward or Trickster;
- a Recruit leans Schemer and is never an Old Hand.

A member from before has none, and plays exactly as it did. **Settled here:** old members are not given a temperament on load, so an old
save's Council plays exactly as it did; the Council's newcomers bring temperaments within a week or so of play.

| Temperament | In the fight | On the Council | Duels, fleeing |
|---|---|---|---|
| Brute | +8% to its blows and to the blows it takes | feuds weigh x2 | never runs |
| Schemer | goes for the weakest hero in reach | betrayals x3; its loyalty wears 2 a turn | never challenges; asked at 30% health, twice its rank's chance to run |
| Glory-hound | goes for the strongest hero in reach | Trials x2 | always challenges, taunts in full, +10% taken in a duel (Vain's whole line); a Glory-hound at the Iron Gate calls a champion out as a Vain captain does |
| Coward | | deserts after two losses in a row (from three) | never challenges; runs at 30% for certain (Craven's line) |
| Zealot | +10% to its blows under half health | never betrays; its loyalty never falls below 50 | never runs |
| Oathbound | +10% more to the hero it is Vengeful against | blood-oaths x3 | |
| Trickster | starts hasted for 2 s | betrayals x2; its loyalty wears 1 a turn | asked at 25% health, runs half the time |
| Old Hand | 10% less from every hero it remembers a fight with (its moments, Idea 2) | feasts x2 | |

- **The Council** (`eventWeight`, `council.ts`): an event weighs its design's weight times the most that any temperament among those who
  could act in it seeks it. A Council with no temperaments weighs exactly as it did, so its draws are unchanged.
- **Vain and Craven** are no longer drawn as a second weakness for a nemesis with a temperament (`secondWeakPool`). The Glory-hound
  and the Coward are those now. An old save's Vain and Craven keep theirs.
- **Its voice** (`TEMPER_TAGS`): a short tag of its temperament closes its taunt every other meeting ("… But I am in no hurry.", "… Catch
  me first."), four to each. **Settled here:** the design's 216 phrases by army and temperament became 32 tags written to fit any
  army's voice. Each army's voice still carries the line, and the tag gives the character.
- **On the board and the card**: a temperament's symbol on the seat's lower corner and in its name for a screen reader; a **Temperament**
  section on the card with its symbol, its name and its words. The symbols are stand-ins (`src/temperArt.ts`) until the eight painted
  ones land; their prompt is `docs/notes/nemesis-depth-art-prompts.md`.
- **Not done:** the Assault's field movement does not read a temperament ("a Schemer's post holds back"). A temperament reaches the
  Assault only through the fight's own hooks (its blows, whom it strikes, its flight) and the Iron Gate's duel.
- Every fight hook is behind `Unit.nem` (`temper` and `knows` on it), so `nemesis-regression`, `stand-regression` and
  `ailments-identical` hold.

### Measured

| | Idea 1 | Ideas 1 to 3 |
|---|---|---|
| Might mean, days 53 to 67 | 1.7 | **2.2** (3.0 by day 119) |
| The Council's own seat changes a week | 5.5 | 5.7 |
| Slain by the heroes, meetings | 85 after 3.0 | 86 after 2.9 |
| Duels | 55, 96% won | 52, 94% won |
| Temperaments on the Council at the end | | Brute 3, Schemer 2, Trickster 2, Glory-hound 2, Coward 2, Oathbound 1, Zealot 1 |
| Taunts by trigger | | thrown 86, slew 76, skill 59, humiliated 36, dread 21, brink 7; still 0 of 101 repeated |

## Idea 4, built: hunts

`src/sim/hunt.ts`. The player marks one member of the Council for **two War Trophies** (`HUNT.price`). One hunt at a time; setting
another calls the first off, with no refund.

- **Where it stands** (`planNemeses`, `huntWave`). In the next run of its army, wherever the draws fall:
  - a boss quarry at its own boss's waves, and the warchief at his army's last, as ever;
  - any other at the first ordinary wave a third of the way in (wave 5 of fifteen), and only there.

  The run notes the hunt (`War.hunt.run`, with the quarry's meetings then), and the snapshot marks it `hunted`.
- **On guard** (`nemStart`). A hunted quarry starts its fight with a shield of a tenth of its health (`HUNT_GUARD`). It knows it is
  hunted, so it runs at 25% health half the time, or its rank's chance if higher (`HUNTED_FLEE`). A Brute or a Zealot still never runs, and
  a Coward still runs at 30%.
  - **Settled here:** the design's extra escort became this flight. One more foe would change the wave's length, and the first measure
    showed hunts were a sure thing (17 of 18 run down) without a way for the quarry to get away.
- **Setting it** reveals one of its secrets, and the News says "You set a hunt on Morrow the Unburnt".
- **Not on** a member licking its wounds (it sits out its army's runs), nor once the War is over (`cannotHunt`).
- **Run down** (`noteWar`):
  - its pay, plus a **bounty** of `2 + Might / 2` War Trophies (`bountyOf`), paid beyond the day's cap of twelve;
  - **neither fate nor cheating death spares it**: the player chose to finish it, as Vengeance does;
  - the Fallen keeps it as hunted down (`FallenNemesis.hunted`);
  - the wave card says "The hunt is over: Morrow the Unburnt is run down · bounty 4 War Trophies".
- **Failed** (`endHunt`, from `settleRun` when the run is over): the quarry was met and lives (it fled, or the run was lost round it).
  - The trophies are spent, and the memory says "Outlived a hunt".
  - At the next meeting it taunts about it (`Nemesis.huntLived`). The wave card says "The hunt has failed: Morrow the Unburnt lives".
  - A run that ended before the quarry's wave leaves the hunt on for the next run.
- **Lapsed** (`lapseHunt`, each Council turn): a quarry the Council took (a feud, a betrayal, a desertion) ends the hunt, and its two
  trophies come back.
- **Taunts** (`HUNT_TAUNTS`, two a voice for each, 36 lines): the quarry, as its wave opens ("Heard you put a price on my head. Come and
  collect."), and one that outlived a hunt, at the next meeting ("Wasted your trophies on me, eh?"). These come before anything else.
- **On the page**:
  - **the card**: a section, The Hunt, says where the quarry will stand, its bounty, and what a hunt costs against the trophies held. Its
    button reads "Hunt · 2 War Trophies" (it sets the hunt, saves, and goes to the army), "Go to its army" for the quarry, or "Find its
    army" when a hunt cannot be set (as the old Hunt did);
  - **the Council**: the quarry's seat is ringed in blood red, and The Hunt's line sits above the Muster's;
  - **the wave card**: "Ahead: your quarry, Morrow the Unburnt, stands in the next wave";
  - **the News**: its own kind, `hunt`, shown with the duel's crossed blades until a symbol of its own is painted.
- **Not done**: the run's map does not mark the quarry's wave (the card and the wave card say it).
- Saved: `War.hunt` (kept only on a member who still sits), `Nemesis.huntLived`, `FallenNemesis.hunted`, `NemSnap.hunted` and
  `huntLived`, `UnitNem.hunted`.

### Measured (`npm run war-sim -- --hunts`: the bot sets a hunt on the mightiest member it can, whenever it has none and the trophies)

| | No hunts | The bot hunting |
|---|---|---|
| Hunts | | 24 set: 15 run down, 7 failed, 2 lapsed or still on |
| Slain by the heroes | 86, after 2.9 meetings | 95, after 3.2 |
| Might mean, days 53 to 67 | 2.2 | 1.6 (the bot keeps hunting the mightiest) |
| Duels | 52, 94% won | 47, 85% won |
| Strangers' share of the seats | 9% | 7% |

The default `npm run war-sim` sets no hunts, so its numbers stay comparable with the earlier tables.

## Checks (the whole first batch)

- `npm run typecheck` and `npm run web`.
- `npm test -- nemesis council revenge duel callout assault-war assault-duel assault-last ui-standard regression ailments-identical modes`:
  157 pass. Among them:
  - `test/nemesis-depth.test.ts` (25 tests: each rule of the four ideas);
  - the pinned fights: `nemesis-regression`, `stand-regression` and `ailments-identical` hold.
- Tests changed because the owner's approved rules changed them:
  - the Council's weights (a Recruit 1) and the Muster (three captains);
  - cheating death's odds measured on members past fate's two meetings;
  - the duel and callout tests' members met twice (only an old foe challenges);
  - the taunt test's "every line comes up" now steps through meetings instead of seeds.
- Screens at 393x852, 360x780 and 412x915 (`node tools/nemesis/shotsDepth.mjs`, saves in `tools/nemesis/savesDepth.ts`), in
  `docs/samples/nemesis-depth/`:
  - `council` and `council-foot`: every seat's temperament symbol, Morrow ringed as the quarry, The Hunt's line;
  - `card` and `card-mid`: Morrow's temperament, the hunt, his remembered fights and what he was once called;
  - `hunt`: Throg's card with the Hunt button and what it costs;
  - `taunt`: Hask remembering Natsu's Volley in the graveyard, closing with a Schemer's tag.

---

# The second batch (the owner chose ideas 10, 5, 7 and 6, in that order)

Built on 0.608.0 (the first batch released). The open questions take this note's defaults; each one settled is listed under its idea.

## Idea 10, built: duels with stakes

- **Won** (`settleRevenge`, `payTimes`):
  - the nemesis pays **three times over**, crowns and War Trophies (from double; Vengeance and a trophy brought home still double);
  - the champion bears a **Duellist's mark**: +10% against every other nemesis of the run (`DUELLIST_MARK`). It is laid as a Grudge's
    share on their snapshots, so the fight reads it where it reads a Grudge, and no new fight hook is needed;
  - since idea 6, an old foe beaten in a duel **kneels** for the player to slay or spare.
- **Lost** (`duelSettle`): the nemesis takes a **trophy** from the champion (the piece in its first filled slot, as a humiliation's
  trophy is; +5% attack while it carries it, two at most, brought home for double pay by slaying it).
- **Refused** (`refuseDuel`): it tells its army, and **every nemesis of the run is Mocking** (+5% attack), not the challenger alone.
- The challenge card says all of it.
- **Settled here: the odds are left as they are.** The doc proposed tuning the share so the bot wins about 70% (from 97%). Measured at
  each army's own level (`npm run balance -- --no-tables --duel --duel-kinds knight,archer,wizard,cleric,samurai,paladin --duel-seeds 4`,
  2,592 duels), duels are already hard:
  - 42.9% won over all nine armies;
  - 60% over the six armies the bot can reach (Orcs 55%, Undead 59%, Beasts 45%, Wildwood 65%, Labyrinth 80%, Ogres 56%);
  - 49% with the Dread.

  The design's band is 55 to 65%. The war simulator's 94 to 97% is its bot fighting armies far below its level. Making duels harder would
  punish the player at level, so the stakes come from what a duel pays and costs instead. Two levers are left for the owner: the share
  (`DUEL_SHARE`), and the infernal, yokai and golem armies, still at the plain share (15%, 9%, 2% at their own level).

## Idea 5, built: studied counters

- **Studying** (`study`, `nemesis.ts`). After any meeting it lives through (or is dragged off), a nemesis studies **the hero that dealt
  it the most**. Never its Dread: it fears that hero too much to study it. It knows two at most, and the oldest is forgotten. The wave card
  says "Morrow has studied Kwame: it takes less from Kwame, and reads its first hold".
- **In the fight**, behind `Unit.nem` (`UnitNem.studied`):
  - **15% less** from a studied hero (`STUDY.less`, in `nemHurt`);
  - that hero's **first stun, freeze, fear or silence** of the fight fails (`nemReads`, in the ailments' gate, shown as "Immune").
- **The answer** is to bring another hero, or its Dread.
- **On the page**: a **Studied** section on the card says so the moment it is learned (the player saw it happen).
- **Taunts**: `STUDY_TAUNTS`, two a voice; it taunts about it ("I been watching you, Kwame. I know your tricks now.") after a remembered
  moment, before a humiliation.
- Saved: `Nemesis.studied`, `NemSnap.studied`.

## Idea 7, built: open politics

`src/sim/politics.ts`.

- **Rivalries** (`makeRivals`, `Nemesis.rival`, both ways). Two members who fought it out between themselves and both lived become rivals
  until one falls: a feud, a Trial of Strength, or a betrayal that casts the captain down. One rival each.
  - A rival slain by the heroes lets the other **climb over the body** (+1 Might, never past 10; `climbOver`). The wave card and the News
    say so.
  - Rivals never stand in the same wave (`planNemeses`; the draw is made as ever, so the stream is unchanged).
  - The Council board lists the **Rivalries** in violet beside the blood-oaths, and a member's card names its rival.
- **Plots** (the Council's ninth event, `'plot'`, weight 0.5 (the owner's call, below); x2 while a Schemer or a Trickster could hatch one).
  - **Who and whom:** a lieutenant plots against its sworn captain, or any member but the warchief against its rival. The warchief is never
    a mark: only the heroes bring him down. Two plots at most.
  - **When:** a plot comes to a head two Council turns later (`resolvePlots`, on its own stream, `PLOT_SALT`).
  - **The player's hand, for 2 War Trophies:**
    - **Warn** the mark: the plotter is caught, and is slain or cast down;
    - **Back** the plotter: it takes its captain's seat (the captain cast down), or beats its rival (a Might less, slain half the time).
  - **Left alone**, a plot succeeds half the time; else the plotter is found out (a Might less, its loyalty down to 10).
  - A plot whose plotter or mark has gone, or whose seats no longer fit, fizzles.
- **On the page:**
  - the Council board has a section for each plot afoot, with its words ("Hask, Pincushion plots against its captain Morrow the Unburnt:
    it comes to a head in 2 turns") and the two hands;
  - a card names the plots it is in;
  - **"The Dark Council stirs"**: the camp opens a standard card for a newly hatched plot once (`freshPlot`), after any hero reveal, with
    the two faces, the plotter's temperament and the two hands.
- **Settled here:**
  - the web stays lists (rivalries and blood-oaths) and seat chips rather than lines drawn between the seats, which would cross the
    pyramid's rows on a 360 px screen;
  - the camp card shows plots only, not every betrayal or coronation, which already have the News;
  - the plot event's weight: at 1 it moved the Council's own seat changes from 5.7 to 7.3 a week. **The owner set it to 0.5**, which
    brings them to 5.4 (below).

## Idea 6, built: spare or slay

`src/sim/spare.ts`.

- **Who kneels** (`mayKneel`, in `noteWar`): an old foe (met past fate's two meetings), never the warchief, brought down **in single
  combat** or **with its loyalty under 30** (the betrayal line).
  - Never the hunt's quarry, Vengeance's mark, at the Muster or at a hold's conquest.
  - One at a time, and none while the player has an Informant.
  - Its pay (crowns and War Trophies, after any tripling or doubling) is **held back** (`War.kneel`), and its fallen line waits.
  - The wave card says "Greymaw kneels before Kwame and begs for its life: slay or spare it, on the Dark Council".
- **Slay** (`slayKneeler`): it falls for good and pays what was held back ("Greymaw begged for mercy, and Kwame gave none").
- **Spare** (`spareKneeler`): it leaves the Council and becomes the player's **Informant** for five of its army's runs (`War.informant`).
  No pay. In return:
  - every secret of its old captain and sworn brothers (and its blood-oath brother) is told at once;
  - its old captain's lieutenants lose 20 loyalty;
  - the scouts' report on its army's hold is given for nothing (`assault.scouted`);
  - the wave card names the nemeses in the next wave of every run of its army (`informantAhead`; "Your Informant: Hask stands in the
    next wave").
- **When its runs are done** (`endInformant`, its own stream `SPARE_SALT`):
  - half the time it leaves **with thanks** (a War Trophy);
  - else it **betrays** you: back on the Council as a lieutenant, a **Betrayer**, Vengeful against the hero who spared it, a Might
    stronger;
  - each of its old brothers the heroes slay meanwhile makes the betrayal 15 points likelier;
  - with no lieutenant's seat free, it slips away with thanks.
- **On the page:**
  - one kneeling is at the top of the Council tab (its face, its pay held back, Slay or Spare), and the camp opens the same as a card
    (before a plot's);
  - the Informant has its own section, with its runs left and how many of its brothers you have slain;
  - a Betrayer's card says so;
  - an **auto-replay never spares**: one kneeling is slain at once.
- **Settled here:**
  - **No guest fight and no open gate.** The doc's "once, it can be called as a guest" and "its old post's gate opens" are not built. A
    guest is a hero of the roster (`guest.ts`), and a foe in that place needs a fighter path of its own, which is too large for this batch.
    The free scouts' report is the Assault's tie instead.
  - **When it kneels:** below 30 loyalty (the doc said 40), the same line a betrayal uses. In the measure, kneels came almost all from
    duels anyway.
- Saved: `War.kneel` and `War.informant`, each holding the nemesis as a member is read (`readKneel`, `readInformant`), and
  `Nemesis.betrayer`.

## Measured (`npm run war-sim`, 120 days, seed 1)

The bot slays every nemesis that kneels by default; `--spare` has it spare them all.

| | First batch (0.608.0) | Second batch, the bot slaying | Second batch, the bot sparing |
|---|---|---|---|
| The Council's own seat changes a week | 5.7 | 7.3 | 5.6 |
| Slain by the heroes, meetings | 86, after 2.9 | 83, after 2.9 | 66, after 3.2 |
| Might mean, days 53 to 67 | 2.2 | 2.2 | 2.8 |
| Duels | 52, 94% won | 41, 95% won | 47, 83% won |
| Plots | | 19 hatched, 21 came to a head; 3 or 4 rivalries standing | 20 hatched |
| Spare or slay | | 43 knelt (39 of them from duels) | 6 knelt: 6 Informants, 2 left with thanks, 3 betrayed |
| Taunts by trigger | thrown 86, slew 76, skill 59 | thrown 89, slew 66, skill 55, **studied 40**, dread 25 | |
| The same taunt as last time | 0% | 0% | 1% |

### With the plot at 0.5 (the owner's call)

The same run, the bot slaying: the Council's own seat changes 5.4 a week (22.4 in all), the Might mean 2.1 for days 53 to 67, 72 slain by the
heroes after 3.1 meetings, 46 duels 89% won, 12 plots hatched and 10 come to a head, 2 or 3 rivalries standing, and 38 knelt.

## Checks (the second batch)

- `npm run typecheck` and `npm run web`.
- `npm test -- nemesis council revenge duel callout assault-war assault-duel assault-last ui-standard regression ailments modes`: all pass.
  Among them:
  - `test/nemesis-depth.test.ts` has 37 tests, 12 of them new for these four ideas;
  - the pinned fights hold: `nemesis-regression`, `stand-regression` and `ailments-identical`.
- Tests changed because the owner's approved rules changed them:
  - the duel test's won duel now kneels before it pays, three times over;
  - the duel card's words;
  - the Council's weights (a Plot 0.5).
- Screens at 393x852, 360x780 and 412x915 (`node tools/nemesis/shotsDepth2.mjs`, saves in `tools/nemesis/savesDepth2.ts`), in
  `docs/samples/nemesis-depth-2/`:
  - `kneel-card` and `council-kneel`: Greymaw kneeling, Slay or Spare;
  - `council-politics`: the rivalries, the plot afoot with its two hands;
  - `card-studied`: Morrow's studied heroes;
  - `plot-card`: the camp's "The Dark Council stirs";
  - `council-informant`: the Informant;
  - `duel-card`: the challenge's new stakes.
