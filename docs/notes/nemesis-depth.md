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
