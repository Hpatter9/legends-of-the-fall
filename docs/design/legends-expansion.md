# The Legends Expansion: the Nemesis War, Dynasties, and the Calamity Rises

A design for approval. Nothing in the game changes on this branch. The owner picked three ideas to build as one connected expansion:

1. **The Nemesis War**: the enemy remembers you.
2. **Dynasties**: heroes who age, love and pass on.
3. **The Calamity Rises**: a second campaign, played as the monsters.

This document fits all three onto what the game already has: the armies and tiers, the bonds and Sworn pairs, the Hall of Legends
(`legacy.ts`), the War Horn and the Eidolons, the tavern's fixed seats, the named elites (`eliteFoes.ts`), the boss phases, the Last Stand's
keep and its AI (`standAi.ts`), the Calamity's map engine, the wounds, the guest hero and the save's readers. Most of the expansion is
rules and words. It needs about **55 new images**, about half of one day's image budget (section 6).

---

## 0. A night in the war

> The Undead Legion again, wave 9, on Hard. The wave card turns over and does not show the usual skeletons. It shows a face.
>
> **Morrow the Unburnt**, Captain of the Dark Council. Three weeks ago he was a nameless bone marksman. Then he put an arrow through
> Ravi, your Wizard, in the Barrow Downs, and the War remembered him. Ravi's fire caught him twice that night and he walked out of it, so now
> he is *Fireproof*. Two council turns later he knifed his own captain at a feast and took the seat. Tonight he wears Ravi's charred staff
> across his back, a trophy, drawn small above his name plate.
>
> The cut-in plays: Morrow's portrait slides in from the left, scarred frame and all. *"Your little flame-wielder is a candle now, Kwame.
> Did you bring another?"* Kwame, your Knight, answers from the right: *"I brought his daughter."*
>
> Because Ravi is gone from the field, if not from the story. He passed the mantle last season. He sits at the Elders' table in the
> tavern with a pipe and a codex of stories, and his heir **Asha** carries his staff, his level, his talents and his books, plus a
> birthright from his Sworn partner, Rhys the Wanderer: *Long Road*. Asha also carries a *Blood Grudge* against Morrow: +15% against him.
>
> Morrow calls Asha out to single combat. A duel wave: one hero, one nemesis, a small ring of stones in the middle of the board. You accept.
> Asha cannot burn him, so she freezes him and pours the rest into his scars. He falls, and the wave breaks and runs. The War News scrolls:
> *"Morrow the Unburnt is slain by Asha, daughter of Ravi. The staff comes home. The Council's seat is empty. Gash the Lieutenant and
> Vey of the Thorns both want it."*
>
> Later that night you open the black rift in the Rift Sanctuary and play the other side. **The Calamity Rises**, Act II. You command a host
> of orcs and wights against a hero party the AI built from your own roster. Leading your host as general is Gash, the same Gash the War
> News named an hour ago. The party holding the Dawn Temple is led by **Kofi, the Knight Who Was Passed Over**, the twin the Mantle went
> past when Kwame named his heir. He has your Knight's kit, and he is very angry.

The three systems feed each other:

- **The War writes the stories.** Nemeses are born from what happened in the battle log.
- **Dynasties give the heroes stakes.** Heirs inherit grudges, the fallen become Shades, and the Mantle keeps every level the player earned.
- **The Calamity Rises lets you play the villains you made.** Your nemeses become your generals, and your dynasty's passed-over lines and
  what-if parties become your enemies.

---

## 1. The three in one line each, and how they feed each other

| System | Fantasy | Core loop |
|---|---|---|
| **The Nemesis War** | "That orc remembers me, and I remember him." | Fight an army → foes who slew, maimed or escaped are named, scarred and given traits from the battle log → the Dark Council churns between runs (feuds, betrayals, promotions) → hunt them, duel them, take back your trophies → the seats refill with new faces. |
| **Dynasties** | "My Knight grew old, and his daughter carries his shield." | Heroes age by seasons fought → Sworn pairs name an heir → the elder passes the mantle and takes an honour (mentor, tavern regular, Shade) → the heir keeps every level and adds a birthright, an heirloom and a grudge → the family tree grows. Legend Oath runs add true death. |
| **The Calamity Rises** | "Now I am the darkness at the edge of the map." | Raise a host from the foes you have beaten → corrupt the realm region by region against AI parties built from your own roster → lead your own nemeses as generals → storm strongholds held by your dynasty's rival lines and what-if parties → take the Last Keep. |

```
            births, traits, grudges                    heirs carry Blood Grudges
  BATTLE LOG ───────────────────▶ NEMESIS WAR ◀────────────────────────── DYNASTIES
      ▲                              │   ▲                                   │
      │                 slayings make │   │ Shades strike their slayer         │ cadet lines, ancestors,
      │                Legend deaths  ▼   │ at double                          ▼ fallen "what-ifs"
      │                         (Oath runs)                             AI HERO PARTIES
      │                                                                      │
      └──────── generals = your Council members ── THE CALAMITY RISES ◀──────┘
                 (commanding one reveals its traits)
```

**Two rules hold throughout** (from the depth design, and still the owner's):

- **Options and stories, not raw power.** Every power reward is small, capped and measured with the tool that owns its number.
- **The simulation stays deterministic.** Anything that changes a fight is fixed at its start from a snapshot the run took (`Run.nemesis`,
  as `Run.bonds` is now). Each new random draw takes its own side stream: `NEMESIS_SALT` (births and fates at settle), `COUNCIL_SALT`
  (council turns), `FLEE_SALT` (a hash of the fight's seed and the moment, as the saving throws do, never drawn from `b.rng`), `HEIR_SALT`
  and `RISE_SALT`. A fight with no nemesis in it plays out exactly as it does today, and a pinned-outcome test holds that line (as
  `stand-regression.test.ts` does for the Last Stand).

---

## 2. The Nemesis War: the enemy remembers you

### 2.1 Who can become a nemesis

- **Bosses**: every army's mid-boss and final boss (`BOSS_IDS`), and the Calamity's six map bosses (`calBoss*`).
- **Named elites**: every fighter in `ELITE_FOES` (Gorrak, Ysolde, the Hollow Knight, Sethra and the rest).
- **Escorts, rarely**: an ordinary foe of an army wave that strikes the **killing blow on a hero** may be named a lieutenant (35%, only
  while a lieutenant seat is free or its holder has Might 1). Most nemeses still start as bosses and elites, as the owner asked, but a
  nobody with a lucky arrow is the best story the system can tell. Morrow above is one.
- **Never**: summons, adds a skill raised (`Unit.raised`), the Eidolons' trial beings, and the Last Stand's and the daily's foes. The daily
  is the same for every player, so it stays clean. The Last Stand comes in phase 10.

**When the War opens**: on the save's first Normal clear of the Undead Legion (army 2, about day 2). The first nemesis is guaranteed: the
first boss or elite to slay a hero after that is always named. A Normal-tier nemesis has half the effect of its Might (2.3), so a new player
meets the system without hitting a wall.

### 2.2 How a nemesis is born: what happened, read from the log

A fight's events are tallied as `fightStats.ts` tallies them now (`tallyNemesis(events)`, the same stream). This adds no hook inside the
fight. At settle (`noteNemesis(meta, run, battle, tally)`, called where `noteBonds` is), each eligible foe that did one of these is a
**candidate**:

| Deed | Read from the log as | Chance to be named (boss / elite / escort) |
|---|---|---|
| **Slew** | a `hit` with `killed: true`, `by` this foe, `to` a fielded hero (`fieldedHero`) | 100% / 100% / 35% |
| **Maimed** | dealt 50% or more of one hero's max hp in the fight without being slain itself, or put a hero under 15% hp who then lived | 60% / 60% / 0 |
| **Escaped** | alive when the fight ended in a loss, a timeout or an abandoned run; or fled the board (2.6) | 100% / 100% / 0 |

The draws come from `new Rng(mixSeed(run.seed, NEMESIS_SALT, wave))`. A foe already a nemesis is **promoted** instead (2.4).

A newborn nemesis gets:

- **A name and an epithet.** The name comes from its army's name bank (`nemesisNames.ts`: 9 armies × 40 names, in each army's voice:
  orc "Gash", "Throg"; undead "Morrow", "Sister Ash"; yokai "Kurenai-of-the-Lantern"). The epithet is earned from its first trait ("the
  Unburnt") or its deed ("Kwame's Bane"). A boss nemesis keeps its title as a surname: "Grashnak, the Orc Warlord".
- **Might 1** (of 10).
- **One trait** read from the log (2.3), and **one weakness** (2.3).
- **A rank**: lieutenant, or captain if it was born a boss (2.5).
- **A memory**: up to 8 lines it keeps ("Slew Ravi the Wizard · the Barrow Downs · Hard · wave 9"), the source of its taunts.

### 2.3 Traits: tied to what actually happened

A nemesis holds **at most 3 traits and 2 weaknesses**. A new trait past 3 replaces the oldest one, unless it is the trait that gave the
epithet. **At most 2 of its traits may be ailment immunities**, so no nemesis is immune to a whole party's plan. Each trait is fixed onto the
unit at fight start (`Unit.nem`), and small hooks read it where the existing rules already ask (`ailments.ts` immunity sets, the blow's
damage-taken step, `canStep` jump, the AI's target pick). This is the path `applyTraits` and the bonds already use.

**Traits from what it suffered** (it lived through it, or escaped):

| Trait | Earned when, in that fight | Effect |
|---|---|---|
| Fireproof (the Unburnt) | 3+ `hit`s on it with `ail: 'burn'`, or burn dealt 15%+ of its hp | immune to burn; fire skills and spells deal it 25% less |
| Rime-hardened | 2+ freezes or chills landed | immune to freeze and chill |
| Venom-blooded | poison dealt 15%+ of its hp | immune to poison |
| Thick-hided | bleed dealt 15%+ of its hp | immune to bleed |
| Grounded | 2+ shocks, or an `arc` through it | immune to shock; chain arcs skip it |
| Iron Skull | stunned 2+ times | stuns on it last half as long |
| Fearless | feared once | immune to fear |
| Arrow-catcher | half or more of the damage it took came from shots | takes 25% less from shots |
| Battle-scarred | half or more came from blows within reach 1 | takes 15% less from blows |
| Sure-footed | shoved, launched or fell (`shove`, `launch`, `fall`) | cannot be shoved, dragged or launched |
| Spell-scorned | struck by 2+ of the king's spells (`spellfx`) | the king's spells deal it 30% less |
| Horn-deaf | lived through an Eidolon's strike | the strike's share on it is 10 points lower (65% becomes 55%) |
| Survivor | escaped or cheated death under 20% hp | once a fight, at 0 hp it stands again at 20% |

**Traits from what it did**:

| Trait | Earned when | Effect |
|---|---|---|
| Bane of the *calling* | slew a hero of that calling (martial, arcane, devout or wild: `callingOf`) | +20% damage to heroes of that calling |
| Healer-hunter | slew a devout hero, or the hero who healed most in the fight | its AI picks healers first; +10% damage to them |
| Executioner | slew 2+ heroes in one fight | +30% damage to heroes under 30% hp |
| Ambusher | struck a hero within the fight's first 5 s | starts each fight hasted for 4 s |
| Elusive | escaped by timeout or by fleeing | +20% move speed; flees once at 20% hp (2.6) |
| Hill-king | 40%+ of its damage dealt from higher ground (`hit.high`) | +1 jump; +10% more from height (on `HEIGHT_BLOW`) |
| Lone Wolf | outlived all its escorts by 10 s or more | +25% attack while no ally is within 3 tiles |
| Legend-slayer | slew a hero sworn to the Legend Oath (3.6) | +2 Might at once; carries the bearer's name in its epithet |

**Weaknesses** (the counterplay, as the owner liked in "Bosses you learn"):

- **Dread of *hero*** (always the first weakness): set from the hero who dealt it the most damage in the fight it was born or humiliated in.
  It takes 25% more from that hero, and that hero's ultimate staggers it for 1 s. A hero with Dread of them carries a skull pip on the
  deploy bench, so the player sees the answer.
- **A second weakness at Might 5**, drawn from a pool weighted by its history: *Fears fire* or another element (+25% from it; never one it
  is immune to), *Craven* (flees at 30%), *Vain* (always accepts a duel and takes +10% in one), *Glutton* (gains Might from Feasts but is
  slow: −10% speed), *Hates heights* (−15% damage while lower than its target).

**Intel.** A trait or weakness shows as "?" until it is revealed. Each fight against the nemesis reveals one. The Watchtower's Far Sight
reveals one when the run starts. A slain lieutenant may give up its captain's next secret (50%). Commanding a nemesis in the Calamity
Rises reveals all of them (4.7). This reuses the shape of `Meta.weak` and the boss-clue cards, so the Codex's look carries over.

### 2.4 Promotion, Might and scars

Each deed by a living nemesis **promotes** it: +1 Might, a new trait read from that fight if one was earned, and a memory line. Might is
capped at **+1 a run** from deeds and **+1 a council turn** from events, so one bad evening cannot make a monster.

What Might adds. This is applied after the army's own wave strength and tier (`waveBoost`); the numbers are a start, tuned in phase 1:

| | Hp per Might | Attack per Might | At Might 10 |
|---|---|---|---|
| Lieutenant or captain (not a boss) | +6% | +3.5% | +60% hp, +35% attack |
| A boss nemesis (the wall of its wave) | +3% | +2% | +30% hp, +20% attack |
| On Normal | half of the above | half | |

A nemesis that is not a boss starts from its base foe's stats, raised to a named fighter's level: a lieutenant at ×2.0 hp and ×1.3 attack,
a captain at ×3.5 hp and ×1.5 attack. It takes an escort's place in the wave, so later waves do not simply grow longer.

**Scars.** A nemesis that cheats death (2.6) or is humiliated (2.8) gains a scar: 1 to 3, shown on its frame and its name plate. Each scar
gives +3% hp, and its *Survivor* chance rises.

### 2.5 The Dark Council: a living hierarchy

**Size**: thirteen seats, across all the armies.

| Seat | Count | Where you meet it |
|---|---|---|
| **Warchief** | 1 | The Warchief's Muster (below), and as the final boss of its own army's runs |
| **Captain** | 4 | The mid-boss wave of its army (as the mid-boss itself if it was born a boss, else at its side), or a duel wave |
| **Lieutenant** | 8 | One ordinary wave of its army's runs: from wave 3, 25% a wave, at most 2 waves a run |

Each lieutenant is **sworn to one captain**, drawn as a line on the board. Each member has a **loyalty** to its superior (0 to 100; starts
60). A seat's home army is the army of its base fighter, so an orc lieutenant turns up only in orc runs. Seats fill only from the armies the
player has opened.

**The Council takes a turn** each time an army run ends, win or lose (at most 4 counted a real day), plus one on the first visit each day.
The page passes in the day key; the sim reads no clock. Draws come from `mixSeed(meta.seed, COUNCIL_SALT, war.turn)`. A turn has no event
10% of the time, one event 60% and two events 30%:

| Event | Weight | What happens |
|---|---|---|
| **Recruit** | 3 (only if a lieutenant seat is free) | A new named foe at Might 1 or 2 takes the seat (an elite from an opened army, else a promoted escort) |
| **Promotion** | 4 (only if a seat above is free) | The highest-Might member below steps up; ties go to loyalty |
| **Feud** | 2 | Two members of the same rank fight: higher Might plus a d6 wins. The winner gets +1 Might; the loser −1, and is slain 30% of the time |
| **Betrayal** | 1 (a lieutenant with loyalty under 30, within 1 Might of its captain) | Succeeds 50%: they swap seats and the old captain is slain or demoted (half each). Fails: the traitor is slain |
| **Feast** | 1 | A captain and its lieutenants each gain +1 loyalty step (+15); a Glutton gains +1 Might |
| **Trial of Strength** | 1 | A lieutenant at Might 4+ challenges its captain: as a feud, but the winner takes the higher seat |
| **Blood-oath** | 0.5 | Two members swear brotherhood. When one falls to the heroes, the other gains *Vengeful* against the hero who did it |
| **Desertion** | 0.5 (a member at Might 1 who lost its last 3 meetings) | It leaves the War: "Gash has had enough." |

**Loyalty moves**: −20 when the superior is humiliated by the player, +10 when the superior wins a meeting, −10 when a sworn brother is
slain by a rival member.

**The Warchief.** When the seat is empty, the captain with the highest Might claims it after one turn, unless another captain challenges
(a Feud for the seat). The warchief is never slain by council events. Only the player can bring him down.

- **The Warchief's Muster** is a special battle on the Nemesis board. It opens once the player has slain 2 captains since the last Muster.
  It is three waves on the warchief's army's land: his lieutenants, then his captains' bodyguard, then the warchief with a phase change at
  half health (the `bossPhases.ts` engine, his kit's second form).
- A warchief's fall is the War's biggest moment: a long cut-in, the Council reshuffles (two Promotions at once), and a **Warchief's Head**
  trophy for the castle (one per warchief, kept on the trophy wall, `trophyWall.ts`).

**Churn targets** (measured by the war simulator, section 8): with daily play, about 3 to 5 seat changes a week, about 1 member lost to
infighting a week, and a warchief who lasts at least 2 weeks unless the player kills him. The Council never falls below 3 lieutenants once
the War is open: a Recruit is forced when it would.

### 2.6 Fleeing and cheating death

**Fleeing** (in the fight). A lieutenant or captain under 20% hp may break off and run for the far edge. This is decided by a hash of the
fight's seed and the moment (`FLEE_SALT`), not a draw from `b.rng`:

- Lieutenant 30%, captain 15%, warchief never.
- *Elusive* gives a flee at 20% for certain; *Craven*, at 30%.
- A fleeing unit walks to row 0 by the cheapest walk (`walkFrom`) and leaves with the existing `fade` event.
- The wave is won as usual when the rest fall. The nemesis is **escaped**: +1 Might, and it cannot be named from that fight's other deeds.

**Cheating death** (at settle). A nemesis brought to 0 hp in a won fight may turn out to have been dragged off the field: lieutenant 15%,
captain 25%, warchief 35%, +20% with *Survivor* or a scar. It comes back next time with +1 scar, the trait *Stitched* (the old *Survivor*
effect, once), and is **humiliated** (2.8). A nemesis slain in a duel, or by an avenger's killing blow (2.7), cannot cheat death.

### 2.7 Revenge: both ways

**The heroes' side**:

- **Grudge.** A hero slain by a nemesis gets +10% damage against it, +10% more each further time it is slain by it, up to +30%.
- **The Avenger.** The bonded partner of a slain hero (bond level 3, *Sworn*, or more) gets +15% attack and +10% skill charge against the
  slayer. If the avenger lands the killing blow, it is **Vengeance**: the slayer cannot cheat death, the pair gains +30 bond points, and a
  short Vengeance scene plays at the camp (written per kindred pair, `sceneKit`).
- **The Blood Grudge.** An heir whose parent was slain by a living nemesis carries +15% against it (3.4), and the nemesis's taunts know it.

**The foes' side**:

- **Vengeful.** A humiliated nemesis comes back *Vengeful* against the hero who humiliated it: +20% damage to that hero. While that hero is
  within 6 tiles, it is the nemesis's first target.
- **Trophies.** A humiliated nemesis takes a **trophy** from the hero who dealt the final blow. The trophy is that hero's equipped piece in
  the first filled slot of weapon, shield, helm or charm, drawn with the piece's own gear icon (`gearIcons.ts`). The hero keeps the piece:
  the trophy is a story and an overlay, not a theft. A nemesis carries at most 2 trophies. Each gives it +5% attack and gives the taunts a
  line ("I wear your shield as a breastplate, Kwame"). Slaying it **brings the trophy home**: the piece is named "Reclaimed" in its card, the
  hero earns a memory line, and the pay is doubled.

### 2.8 Humiliation

A nemesis is **humiliated** when one of these happens:

- it cheated death (2.6);
- it fled a fight in which no hero fell;
- a duel ended with it at under 25% hp and the time ran out.

A humiliated nemesis returns **1 to 3 runs later**: its seat is kept but it is "licking its wounds" and skips that many of its army's runs.
It comes back with a trophy, *Vengeful*, +1 scar and a promotion. This is the owner's "a humiliated boss comes back later carrying a trophy
from your hero".

### 2.9 Taunt cut-ins

Before the first wave in which a nemesis stands, the wave card names it and a **cut-in** plays, about 2.5 s; a tap skips it once 0.6 s
have played:

1. The nemesis's portrait (the sprite's own `portrait()` cut, in its tint) slides in from the left, in its rank's frame with its scars.
2. Its name, epithet, rank and Might.
3. One taunt line.
4. If the taunt names a hero who is on the board, that hero's portrait answers from the right with one line.

Taunts are **assembled from its memory**, not written per nemesis. `nemesisLines.ts` holds templates by trigger (first meeting, slew
*hero*, maimed *hero*, escaped, humiliated, trophy, Blood Grudge heir present, avenger present, its Dread present, warchief) × voice (one
voice per army: orc gruff, undead cold, beasts snarling, wildwood fey, labyrinth proud, ogre dim, infernal grand, yokai riddling, golem
formal). That is about 10 triggers × 9 voices × 4 lines, roughly 360 short lines, plus about 90 hero replies, two for each hero. The hero
replies sit in `quipData.ts`'s style. **Settings, Nemesis cut-ins**: full, short (the name plate only) or off. Reduced motion: the
portraits fade in held still. Each nemesis's first meeting always plays in full.

### 2.10 Duel waves

- **When a duel is offered.** A wave card may carry a challenge when that wave holds a nemesis that is *Vengeful* against a fielded hero,
  that has a Dread hero fielded, or that faces a Grudge holder. *Vain* nemeses always challenge. At most **one duel a run**.
- **The offer.** "Morrow challenges Asha to single combat." Buttons: **Accept** and **Refuse**. Some challenges are open ("Morrow calls out
  your champion"); then the player picks the hero from a one-row strip.
- **The duel itself.** One hero against the nemesis alone, on the board's middle 5×5 (the boss arena's middle, `Board.arenaMid`). Sixty
  seconds. The nemesis fights at **30% of its wave hp and 60% of its wave attack**, since a wall is built for five heroes. These are starting
  numbers, tuned so the challenged hero at the army's level wins **55 to 65%**, or about 70% with a Grudge or Dread. A new mode flag
  `Battle.duel` places the two and turns off the field's escorts and the king's spells. The hero keeps its own skills, ultimate and gear.
- **Win**: the nemesis is slain for good (no cheating death); a warchief is humiliated instead and flees to his Muster. The wave's foes
  break and rout: the wave counts as won, with its rewards. Every hero heals 20%, and the nemesis pays double.
- **Loss**: the champion falls and stands again at half for the next wave (`wounds.ts`). The nemesis gains +1 Might and fights the wave
  at full strength with its escorts.
- **Timeout**: the nemesis escaped (+1 Might, and humiliated if it was under 25%).
- **Refuse**: the wave is fought as usual, and the nemesis is *Mocking* (+5% attack) for the rest of the run.

### 2.11 Rewards

| What | Pay |
|---|---|
| A lieutenant slain | 40 crowns × Might, 1 War Trophy |
| A captain slain | 80 crowns × Might, 2 War Trophies |
| A warchief slain | 200 crowns × Might, 5 War Trophies, the Warchief's Head |
| Doubled by | a duel, a trophy brought home, Vengeance |

**War Trophies** are a new token, capped at 12 a day. They are spent at the Nemesis board's **Spoils** tab:

- unlock shards of a chosen hero not yet owned: 1 shard for 6 trophies, at most 2 a week, counted in `npm run unlock-pace` (section 8);
- a relic choice for the next army run (3 trophies);
- a scout (reveal one secret of a chosen member, 2 trophies);
- the nemesis name plates as cosmetics (the hero's own plate in a slain warchief's colours).

Slaying a recruit at Might 1 pays little, so the War cannot be farmed.

---

## 3. Dynasties: heroes who age, love and pass on

### 3.0 The promise to the player who loves their hero

These four rules are the design. Everything else bends to them:

1. **No power is ever lost.** All lasting progress is keyed by the hero's **kind** today: XP and level, ranks, awakening, talents,
   books, gear and skill use. The kind is the slot; the **bearer** is the person in it. An heir takes the slot whole.
2. **No hero is ever lost.** A retired elder can be fielded again at any time (3.5), at the kind's full power, in place of the heir. The
   twin rule still holds, so only one of a line takes the field at once.
3. **Nothing is forced outside the Oath.** No hero has to retire. Elders fight at full strength for ever. Passing the mantle is a choice,
   and it is rewarded.
4. **No rarity.** Heirs are not better or rarer than their parents: a birthright is one small perk, the same size for every line.
   Collecting by shards is unchanged: a kind joins the roster as now, and its first bearer is the hero as written today (Kwame, Ravi,
   Kenji).

### 3.1 Seasons and ages

- **A season is 14 real days**, from the day the Dynasties open for the save. The seasons turn Spring, Summer, Autumn, Winter; a **Year of
  the War** is 56 days. The page passes in the day key. The current season shows on the camp's top bar as a small icon and gives the War a
  flavour: in Winter, Feasts weigh double; in Spring, Recruits do. These are looks and churn only.
- **A bearer ages only by serving.** A season counts for a bearer if it fought **20 waves or more** in it (auto-replays count half, as
  `wavesFought` already counts). Heroes on the bench do not age: time passes only for those on the road. So collecting forty-five heroes
  never turns into watching forty-five clocks.
- **Life stages**, by seasons served. A season served is one year of story age, so "Kwame, 26" becomes "Kwame, 36" as he reaches Elder:

| Stage | Seasons served | What it means |
|---|---|---|
| Youth | 0 to 1 | — |
| Prime | 2 to 5 | — |
| Veteran | 6 to 9 | may name an heir (3.3); the look gains a veteran's touch (a re-toned streak of grey hair, or a dulled shell for non-humans) |
| Elder | 10 or more | grey (the re-tone tool); **Elder's Counsel**: +5% XP to the rest of the party while fielded; the farewell is offered, never required |

**The pace against the owner's numbers**: a favourite played daily is Veteran on about day 84 (about level 60, matching `LEGACY.RETIRE_LEVEL`
at about day 80) and Elder on about day 140 (about level 95, just before level 100 on day 164). So the first passing of the mantle lands
where the Hall of Legends already lands. **Ageless kinds** (the Kitsune, the Reaper, the Mummy, the bots, the Kraken) still serve seasons
and still pass on. Their words differ ("the Kitsune's ninth tail greys"; "Rook-7 writes its successor"), set per kind in `dynastyWords.ts`.

### 3.2 Bearers

The first bearer of each kind is its hero as written (`HERO_NAMES`): Kwame is Kwame. A bearer holds:

- a name;
- a generation (I, II, III ...);
- seasons served;
- parents (for an heir);
- a **birthright**;
- an **heirloom**;
- a **Blood Grudge**;
- a **fate** (when its time on the field is done);
- and up to 8 memory lines.

These are the family tree's nodes.

### 3.3 Heirs

- **Who can have one**: a Veteran or Elder bearer of kind level 60 or more who has a **kindred pair at bond level 3 (Sworn) or more**.
  All 45 heroes are in at least one of the 40 kindred pairs (`KINDRED`), so every line can continue. The partner may be at any stage.
- **Love, kin or calling.** The pair's own writing decides what the heir is: a child (Knight and Peasant's "Margaret" scene leads to a
  daughter), a ward, an apprentice, or a successor (the bots, the spirits). The game's word is always **heir**. Every kindred pair gets one
  "heir scene" at bond level 3 or more (40 scenes, in the bond scenes' style and voices).
- **Naming an heir** starts **7 real days of training**. The heir is a ward at the castle, a timer like study, shown on the hero sheet.
  At the end the player is shown **two candidates**, drawn from `HEIR_SALT`, each with:
  - a name, from a per-kind bank of 6 heir names in the kind's heritage (45 × 6 = 270 names);
  - a look: the parent's sheet re-toned by the heritage tool (`tools/heritage/recolour.py` with a new tone or hair row in `heroLooks.ts`).
    The other parent's tone is one of the options when both are people;
  - a **birthright**: the partner's legacy perk (`PERKS` in `legacy.ts`) at its first band, for this heir alone. For example, the heir of
    Kwame and Minh (the Knight and the Peasant) has *Harvest Hands*, +3% hp. The other candidate has the parent's own perk instead.
- **The passed-over candidate** becomes the **cadet line**. It does not vanish: it visits the tavern now and then, and it leads hero
  parties in the Calamity Rises (4.5).
- **Passing the Mantle** (the hero sheet's button once the heir is trained, with a confirm on the sheet):
  - The heir takes the field: same kind, same level, ranks, talents, books, gear and skills. **Nothing is reset.**
  - The heir's **birthright** applies wherever talents apply (the armies and the Last Stand), through the same `Boost` path.
  - **The heirloom**: the player picks one of the elder's equipped pieces. It gains a **generation mark**: +3% of its main stat for each
    generation it has passed through, up to 3 (+9%). Its card reads "Margaret, boar spear of the House of Minh". It is never sold or
    combined, as legends are not.
  - **The Blood Grudge**: if a living nemesis slew either parent, the heir has +15% against it, and the Nemesis board marks the pair.
  - **The Heir's Promise**: +25% XP for the heir's first season. It matters only below the level cap, so a favourite at 100 gains nothing.
  - A short **farewell and arrival scene** plays: the elder hands over the heirloom, in the backdrop of the elder's chosen honour.

### 3.4 The elder's honour (retirement as an honour, never a loss)

The elder chooses one honour. It can be changed later with a 7-day cooldown, as recall works now:

| Honour | Where they are | What they give |
|---|---|---|
| **Mentor** | a Hall of Legends seat (the existing `legacy.ts` rules, unchanged) | catch-up XP and the legacy perk to every hero of the calling; double the perk to a Sworn partner. **New: the kind stays in the party through the heir.** Today a mentor's kind leaves the party; with an heir it does not |
| **Tavern regular** | the **Elders' table**, a new fixture in the Hearth Hall with 6 seats; more elders take turns, one a day | once a day, a story: a Codex lore page and 50 crowns. Once a day, free, may join a run as the **guest** sixth hero (`guest.ts`) if their line's heir is not fielded |
| **Shade** (open to an elder at kind level 100, or to the fallen of the Oath) | the War Horn's card, beside the Eidolons | a horn call of their own (3.6) |

### 3.5 Fielding the elder ("my favourite is never gone")

Each line has a **banner** on the party picker: a small choice of bearer, the heir by default. Fielding the elder:

- the elder fights at the kind's full power, with their own birthright if they had one;
- their honour's effect lapses for that run (a mentor's perk stops, as on recall today, but no cooldown starts);
- the twin rule still holds: one bearer of a line on the field at a time.

### 3.6 Legend mode: the Oath

The **Legend Oath** is a toggle on the march card for army runs on **Hard or harder**. It opens with the save's first Passing of the
Mantle. It is **per run, not per save**:

- **Slain, not fallen.** In an Oath run, a hero who falls in a wave that is then lost, or who falls a second time in the run, is
  **slain**. The bearer dies. The run goes on as normal for the rest.
- **What dies is the person, not the progress.** If the line has a trained heir, the heir takes the mantle at once. If not, the line is in
  **mourning for 3 real days**: the kind cannot be fielded in army runs, and a candle burns at its tavern seat. Then a **foundling heir**
  (generation +1, no birthright) takes up the mantle with a Blood Grudge against the slayer. The kind's level, gear and talents are
  untouched.
- **The fallen become Shades.** A Shade is a lesser Eidolon, on the same War Horn: one call per fight, chosen on the horn's card. The strike
  is a set share of full health, as an Eidolon's is: ordinary foes take 60%, elites and mid-bosses 35%, last bosses 20%. **The Shade's
  slayer takes 60% and cannot cheat death that fight.** The rider comes from the calling: martial +20% party attack for 8 s; arcane every
  ultimate meter +25%; devout every hero healed 30% and cleansed; wild the party hasted for 6 s. **Auto never calls it**, as for the
  Eidolons. A Shade's look is the hero's own sprite with a spectral tint and a fade: an effect, not new art.
- **Ghosts at the tavern**: the fallen bearer's own seat shows them pale and translucent, at their old activity (`tavernLife.ts`), until
  the line's next bearer arrives. Then the ghost moves to a corner seat of the Hearth Hall.
- **The Oath pays**: ×1.5 crowns and XP, +1 War Trophy a wave (inside the daily cap), and **Legend renown** on each bearer. Three Oath
  clears give the bearer the **Legend** title and a gold frame on the family tree. The slayer of a Legend becomes *Legend-slayer* (+2 Might)
  and carries the bearer's name in its epithet ("Gash Ravi-Killer"), which makes the hunt personal.

### 3.7 The family tree

Every bearer is a node: their portrait, name, generation, stage, fate icon and heirloom. Parents are linked by a gold thread, the bond's own
look. The tree crosses lines, as kindred pairs do: Asha's node sits under Ravi, with a thread across to Kwame's line. Fallen Legends carry
a candle. Cadets hang off to the side in grey. Section 5.2 covers the screen.

---

## 4. The Calamity Rises: the reverse campaign

**The name.** The game already has a mode called the Calamity: the rift-map run whose last boss is Karnok the Calamity. The fiction ties
them together. In the Calamity Rises you **are** the Calamity: the will behind Karnok, raising the host before he takes form. It is told
as the **Chronicle of the Fall**, a what-if that the tavern's bard (Lovell) sings, so it never contradicts the main story. The black rift
in the Rift Sanctuary opens it. See Q1.

### 4.1 What it reuses

| Need | Reused from |
|---|---|
| The battle | `battle.ts` as it is: both sides already fight by AI. The player now places the **foe** side, on the far three rows, where foes already stand and face (no new sprite facings) |
| Placing foes | a new `placeFoe` / `unplaceFoe` beside `place` / `unplace` (the renderer still changes the battle only through the sim's functions), plus `Battle.reverse`, which flips one rule: a **timeout is the heroes' win** (they held) |
| The hero party's placement | the balance bot's deployment (`autoplay.ts`) and party pick (`suggest.ts`); talents from `talentAuto.ts`; spells cast as the bots cast them (`botSpells`) |
| Sieges | the **Last Stand engine as it is**: the AI heroes guard a ruler on the keep (`standAi.ts`'s leashed heroes), and the player's foes come in from the edges along the flow field to the ruler, which is exactly what `standAi` already does for foes. The player buys each wave instead of the Stand's wave table |
| Lands and maps | the seventeen lands, `layoutFor` / `applyLayout`, the weather; the Calamity's map engine (`run.tower`) for the region nodes |
| Foes | `FOES`, `FOE_BANDS`, `ELITE_FOES`, the bosses and their kits and phases |
| Generals | the Dark Council members (2.5), with their traits and Might |

### 4.2 The realm map

There are **twelve regions in three acts**, plus the **Dark Citadel** (the volcano land) as home. The fourth region of each act is a
**stronghold**: a siege.

| Act | Regions (land) | Stronghold |
|---|---|---|
| I · The Borderlands | Hearthvale (plains), the Greenwood March (forest), Ironcrag (highlands) | **Frostmere** (snow), held by the Lord-Commander's party |
| II · The Heartlands | Mirefen (swamp), Ambervale (autumn), the Sunspire Oasis (oasis) | **The Dawn Temple** (temple), held by a **cadet line** |
| III · The Crown | the Barrow Downs (graveyard), Glasswater (crystal), the Anvil (forge) | **The Last Keep** (ruins), held by **your own party** |

- **Each ordinary region holds 2 battles**:
  - **Raid**: a normal 8×11 battle with the heroes on their near rows.
  - **Ambush**: the heroes start in a column in the middle rows, marching, as a lost-battle layout. The player places on the far rows *and*
    on one flank strip of 2 columns.
- **Winning both captures the region.** Capture **corrupts the land**: in that region's later fights its weather turns to ash or blight
  (`weatherOf`, looks only), tall grass turns to dead grass, and one shrine becomes a blight pool that hurts heroes. These are terrain
  kinds the board has, re-skinned. The map shows the region in the Calamity's colours.
- **A stronghold opens** when its act's three regions are taken. It is a **siege** (4.1) of 6 waves on the Last Stand's 24×24 field,
  which the player buys and sends from up to 4 edges.

The campaign is about **30 battles**: two to three weeks of evenings. It is its own save slot (`legends.rise`), as the Calamity's run is.

### 4.3 The economy

| Resource | Earned | Spent on |
|---|---|---|
| **Dread** | a battle won: 80 + 20 × region number; each captured region adds 15 to every later win | recruiting into the Host |
| **Souls** | 1 per hero felled; a siege's ruler 5 | raising elites and bosses; the Citadel's upgrades |
| **Hope** (the heroes' meter, 0 to 100) | +15 per battle you lose, −5 per battle you win, +10 when a stronghold is opened | at 100, the heroes **Rally** (4.6) |

**Costs**:

| Unit | Dread | Souls |
|---|---|---|
| Common foe | 30 | — |
| Shooter or variant | 45 | — |
| Flier | 60 | — |
| Named elite | 150 | 1 |
| Boss | 300 | 5 |

**Command** (how many may be fielded) starts at 6 and rises by 1 per captured region, to 14. A boss counts 3; at most 1 boss on the field
in Acts I and II, and 2 in Act III.

**The Citadel's upgrades** (Souls): Command +1 (3 Souls each, ×3); the War Pit (recruit cost −10%, 5); the Bone Throne (fallen veterans are
wounded instead of lost, 8); the Black Banner (the general's aura +50%, 8).

### 4.4 The Host: the foe roster

- **At the start** the Host has two legions: the **Orc Warband** and the **Undead Legion** bands (their `FOE_BANDS` kinds and the army
  variants, `boneVolley` and the rest).
- **Each region captured opens one more legion**, in the armies' order: beasts, wildwood, labyrinth, ogres, infernal, yokai, golems. That is
  seven more over the campaign. Each legion's mid-boss and final boss become raisable.
- **Units persist** between battles and gain **Might** as nemeses do: +1 per 3 battles fought and lived through, up to 10. Each is named
  from Might 3. The same trait engine reads their battles from the log: *your* orc who survived the Wizard's fire becomes *Fireproof*. One
  system, both sides.
- **The fallen** are lost unless they are named (Might 3 or more). A named unit is wounded and sits out one battle; with the Bone Throne,
  none are lost.
- **Strength**: a unit's stats are its `foes.ts` stats × the act's scale (Act I 0.9, II 1.4, III 2.0; starting numbers) × its Might, using
  the same per-Might table as the nemeses.

### 4.5 The AI hero parties

- **Built from the player's own roster** (the owner's ask). Each party is five of the player's **owned** heroes: picked by `suggest.ts`
  from a side stream of the region's seed, with their kits, ultimates and talent picks (`talentAuto.ts`) and gear dressed as the balance
  tools dress it.
- **They fight at the act's band, not the player's levels**: Act I at levels 10 to 25, Act II 30 to 50, Act III 55 to 75. So a level-100
  roster makes no impossible campaign, and a newer save makes no trivial one.
- **The ruler's spells**: none in Act I. From Act II, the party's ruler casts one of the player's own equipped spells, as the bots do.
- **Who leads them**:
  - **Act I**: the realm's first defenders. The bearers are your heroes' **founders**, generation I.
  - **Act II**: the **cadet lines**, the heirs passed over at each Passing of the Mantle (3.3), such as "Kofi, the Knight Who Was Passed
    Over". Each cadet leads a party, has its line's birthright and **hates you** (the Calamity) with a +10% *Wronged* boost. A save with no
    cadets yet meets founders instead.
  - **Act III**: **what-if parties**: the fallen Legends as if they had lived, ancestors at their prime. The finale's **Last Keep** is held
    by the player's own current party (`meta.party`), led by the current bearers. These are "the Last Keep's Five", at the act's top band.

### 4.6 Winning and losing

- **A battle is won** when every hero falls (in a siege, when the ruler falls). **It is lost** when every unit of yours falls, or when the
  120 s run out (`Battle.reverse`: the heroes held).
- **Rally**: at Hope 100, the heroes march on your most recent captured region in a Rally battle: a Raid with the heroes at +20%.
  - Win it, and Hope falls to 40.
  - Lose it, and the region is freed (you must take it again) and Hope sits at 50.
- **There is no permanent loss.** A freed region costs time and Dread. The Citadel cannot be taken, so the campaign cannot end badly.
- **The campaign is won** when the Last Keep falls. It pays out, plays the bard's last verse, and opens **the Second Age**: a New Game+ with
  parties at +15 levels and the next generation of cadets.

### 4.7 Generals: your nemeses at your command

- **Who.** Any Dark Council member who has met the player 3 times, or has been slain, is available as a **general**. The fallen ones are
  raised from the Chronicle: in the bard's what-if they never fell.
- **One general a battle.** It is fielded as a unit (outside Command) at its Might and traits, and gives an **aura** by rank: lieutenant
  +8% attack to its legion within 3 tiles, captain +12%, warchief +15% to all, and its traits apply as in the main game.
- **Commanding a general reveals every one of its secrets** in the main game's Nemesis board. This is the Calamity Rises' main reward to
  the main game: you learn the enemy by being it.
- **Emboldening** (an opt-in toggle on the general's card): a general who wins 3 battles for you gains +1 Might in the main game, and its
  War Trophies pay double from then on. A self-chosen difficulty knob that pays. See Q6.

### 4.8 What the Calamity Rises pays back

- War Trophies for each stronghold taken: 5, 8 and 12, inside the daily cap on the day they are won;
- the act titles ("Scourge of the Borderlands");
- the Codex's **Chronicle of the Fall**: the bard's verses, one per region;
- a gold chest and a corrupted war banner for the castle (cosmetic) at the Last Keep;
- intel on generals (4.7).

**No hero XP, no shards beyond the trophies' own capped exchange, no gear.** The main game's balance is untouched unless the player turns
on Emboldening.

---

## 5. The UI and screens: upright phone, the standard ornate menu

Every card, sheet and page is built with `src/ornateMenu.ts` (`ornateMenu`, `menuSection`, `menuPick`, `menuWell`, `menuFoot`, `menuNote`)
and its classes in `ornateMenus.css`. Full pages say "‹ Back", cards say "Close". `test/ui-standard.test.ts` gains the new files. Each
screen is checked at 393×852, 360×780 and 412×915. Buttons are 48 px tall; nothing glows in a loop, and steady brightness and eased
reveals are allowed as the effects rule allows.

### 5.1 The Nemesis board (full page: "The Dark Council")

- **Way in**: the war camp's **war table**. Its figurine becomes the warchief's sprite in his tint once there is one, and its plate reads
  "The Dark Council · 9 seats filled". Also from a nemesis's wave card ("See the Council").
- **Header** (`ornateMenu`, kind page): eyebrow "The Nemesis War", title "The Dark Council", sub "Season of Frost · War turn 47".
- **Tabs** (`menuPick`, 4 across): **Council · News · Fallen · Spoils**.
- **Council** (the pyramid; one screen, no sideways scroll at 360 px):
  - The warchief: one large card across the top (96 px portrait, name plate, Might as 10 pips, crown insignia).
  - The 4 captains: a row of 4 cards, each 78 px wide (4 × 78 plus gaps fits 328 px).
  - The 8 lieutenants: 2 rows of 4 smaller cards.
  - Each lieutenant's sworn captain shows as a thin brass line up to it. Blood-oaths show as a red thread, and the Avenger and Grudge marks
    as a small hero portrait chip on the card's corner.
  - An empty seat is a dim plinth reading "Vacant: the strongest will rise".
- **The nemesis card** (a card, "Close"), opened by tapping a seat:
  - the portrait in its tint and scar frame; name, epithet, rank, Might, home army;
  - **Traits** and **Weaknesses** as `menuSection` rows with icons (unrevealed: "?" and "Meet it again to learn more");
  - **Trophies** (the hero's gear icon with "Kwame's shield");
  - **Memory** (a `menuWell` list of its lines);
  - **Grudges** (which heroes have a Grudge, Avenger or Blood Grudge on it);
  - **Pay**, in a reward line ("Slay: 280 crowns, 2 War Trophies");
  - footer: "Close" and **Hunt**, which opens its army's card with the tier where it waits, and the wave chance.
- **News**: a `menuWell` of the last 40 war turns ("Turn 47 · Feud · Gash beat Throg; Throg is slain"), newest first, each with its event
  icon.
- **Fallen**: the slain nemeses (the last 30), each with who slew it and how (duel, Vengeance, the Muster).
- **Spoils**: the War Trophy exchange (2.11): choice rows with prices in `.omPay`, the week's shard limit in `.omLock`.
- **The Muster**: when it is open, a gilded primary button in the footer: "Muster against the Warchief".
- **In the fight**: the nemesis's **name plate** above its health bar (the rank's colour, its name; a skull pip if a fielded hero is its
  Dread). Its **tint** (section 6). Its trophy icons beside the plate. Steady: no pulse.

### 5.2 The family tree (full page: "The Houses")

- **Way in**: the tavern's new **Elders' table** (tap the table), the hero sheet's new **Line** row ("Kwame's line · Gen II · 3
  bearers"), and the Codex.
- **Header**: eyebrow "Dynasties", title "The Houses", sub "Year 2 of the War · Autumn".
- **The line picker** (`menuSection`, 4 columns): every kind with a line, as its current bearer's portrait with a generation badge (I, II,
  III). Lines with a trained heir glow gold (steady). A filter (`menuPick`): All · With heirs · Elders · The fallen.
- **A line's page** (scrolls down: generations go top to bottom, which suits an upright phone):
  - Each bearer is a full-width row: portrait (64 px), name and generation, stage and age ("Elder · 37"), fate icon, heirloom chip.
  - Between generations, a centred connector holds the **partner** chip (the other parent's portrait and line name, tap to jump to that
    line), on a gold thread.
  - Cadets hang right in grey, as a small chip ("Kofi, passed over: leads in the Calamity Rises").
  - The fallen have a candle and the slayer's chip ("Slain by Gash Ravi-Killer · still living"; a tap opens the nemesis card).
  - A line deeper than 6 generations folds its oldest into "The founders (3)", which opens in a well.
- **A bearer's card** (a card, "Close"): portrait in its look, memory lines, birthright, heirloom, Blood Grudge, honour. For the current
  bearer: **Name an heir**, **Pass the Mantle**, or the training timer; the heir candidates' choice is two `menuChoice` rows with their
  look, name and birthright. For an elder: **Change honour** (with its cooldown in `.omLock`) and **Field this bearer**.
- **The Seasons**: a small season icon on the camp's top bar. Tapping it opens a card with the season, its days left, the War's flavour
  this season, and the heroes who will age at its turn ("Kwame has served 9 seasons: Elder at the next").

### 5.3 The Calamity Rises: the campaign map (full page)

- **Way in**: the black rift in the Rift Sanctuary (`sanctuaryView.ts`), as the Calamity's rifts are entered (the walk-in transition).
- **Top bar**: Dread · Souls · Hope (a meter in the heroes' gold that fills toward the Rally), and the act.
- **The map**: the painted realm map (upright, 2:3), with 12 region markers and the Citadel. Captured regions are tinted to the
  Calamity's colours by a steady colour wash on the painting, not a second map for each state. The act tabs sit across the top
  (`menuPick`: I · II · III; locked acts in `.omLock`). The map pans vertically only.
- **A region card** (a card, "Close"): the land's name, its backdrop thumbnail, the 2 battles (or the siege) as `menuChoice` rows with
  their state and pay, and the defenders ("Held by Kofi, the Knight Who Was Passed Over: Knight, Cleric, Ranger, Gorgon, Sage · Lv 34");
  footer "Close" and **March**.
- **The Host** (a page from the bottom bar): the units as a 4-column grid of portraits with Might pips; filters by legion; **Recruit**
  opens the War Pit (a sheet listing the legions' units with Dread and Souls costs).
- **The Citadel** (a card): the upgrades as `menuChoice` rows.
- **Generals** (a sheet): the available Council members, each with aura, traits and the Emboldening toggle.
- **Deploying**: the existing deploy screen, mirrored in meaning only. The player's bench holds Host units (the bench and drag code is
  unchanged; `placeFoe` is the target), the deploy zone is the far three rows, highlighted as the near rows are now, and the camera fit is
  unchanged. The AI's heroes are shown in their places before Fight, so the player can counter-place.

---

## 6. The art needed, counted exactly

Most of the look is **reuse**:

- **Tints**: a colour matrix per rank or Host legion, an effect in the renderer.
- **Re-tones**: the heritage tool, offline, from the existing sheets.
- **Trophies**: the existing gear icons.
- **Portraits**: `portrait()` cuts of the existing sprites.
- **Scenes**: the existing backdrops.
- **Shades and ghosts**: a spectral tint and fade of the hero's own sprite.

Pack sprites (the UI, frame and icon sheets in `hpatter9/chronos-assets`) are tried first for every row below. A row is only generated if
no pack sprite fits, so the count is a ceiling.

| # | For | Image | Count | Notes |
|---|---|---|---|---|
| 1 | Nemesis | Rank insignia (lieutenant, captain, warchief) | 3 | 32 px badges for plates and cards |
| 2 | Nemesis | Scarred portrait frames (scars 1, 2, 3) | 3 | Overlaid on the ornate portrait frame, so they fit every sprite |
| 3 | Nemesis | The Dark Council backdrop (the Nemesis board) | 1 | Upright painting, 2:3 |
| 4 | Nemesis | Taunt cut-in panel (torn banner and smoke) | 1 | Behind both portraits |
| 5 | Nemesis | Council event icons (recruit, promotion, feud, betrayal, feast, trial, blood-oath, desertion, fled, cheated death) | 10 | 24 px |
| 6 | Nemesis | Trait icons not covered by the status icons | 12 | The 7 ailment immunities reuse the status icons with a small shield overlay; the shield is item 7 |
| 7 | Nemesis | Immunity shield overlay | 1 | |
| 8 | Nemesis | Duel challenge banner (crossed blades) | 1 | Wave card and duel ring |
| 9 | Nemesis | War Trophy token | 1 | Currency icon |
| | | **Nemesis subtotal** | **33** | |
| 10 | Dynasties | Season icons (spring, summer, autumn, winter) | 4 | |
| 11 | Dynasties | The Houses backdrop (a tapestry tree) | 1 | Upright painting |
| 12 | Dynasties | Fate icons (mentor, regular, Shade, fallen, Legend) | 5 | |
| 13 | Dynasties | Heirloom frame for gear cards | 1 | |
| 14 | Dynasties | Heir and elder looks | **0** | The re-tone tool, offline, from the existing sheets |
| 15 | Dynasties | The Elders' table fixture | **0** | The tavern's own table and chairs |
| | | **Dynasties subtotal** | **11** | |
| 16 | The Calamity Rises | The realm map (upright painting) | 1 | Capture is a tint wash, not a second map |
| 17 | The Calamity Rises | Region markers (raid, ambush, stronghold, captured, Citadel) | 5 | |
| 18 | The Calamity Rises | Dread, Souls and Hope icons | 3 | |
| 19 | The Calamity Rises | The Citadel backdrop (cards, deploy hub) | 1 | |
| 20 | The Calamity Rises | The black rift (Sanctuary) | **0** | The existing rift frames, tinted |
| | | **Calamity Rises subtotal** | **10** | |
| | | **Total new images** | **54** | Allow about 20 retries: **about 75 generations, under one day's budget** |

**Optional, not counted**: painted heir portraits for the hero sheet's large art. Until an heir has one, the sheet shows the parent's
painting with the heir's name; the board and the bench already show the re-toned sprite. They can be added a few at a time if the owner
wants them.

Every new image is credited in `CREDITS.md`. Any image the page loads by URL instead of bundling (the three upright backdrops and the
realm map, if they are too big for data URLs) is added to the service worker's `FILES` in `build.mjs`, so the expansion plays offline.

---

## 7. Save data and migration

Every new field is **optional**, read by its own reader in `loadMeta`, as `readBonds` and `readMentors` are. A save from before plays on
and opens each system when its gate is met. No version bump to the save as a whole; each block carries its own `v`.

```ts
// Meta.war?: the Nemesis War (nemesis.ts, readWar)
interface War {
  v: 1;
  turn: number;                     // council turns taken (the COUNCIL_SALT counter)
  day?: { key: number; turns: number }; // turns counted today (the cap of 4 + 1)
  members: Nemesis[];               // at most 13, the seats
  away?: Record<number, number>;    // humiliated members licking their wounds: id -> runs left
  fallen: FallenNemesis[];          // the last 30
  news: WarNews[];                  // the last 40
  musterSince: number;              // captains slain since the last Muster
  trophies: number;                 // War Trophies held
  trophyDay?: { key: number; got: number }; // the daily cap
  shardWeek?: { key: number; got: number }; // the weekly shard cap
  nextId: number;
}
interface Nemesis {
  id: number; base: string; army: string; name: string; epithet: string;
  rank: 'warchief' | 'captain' | 'lieutenant'; sworn?: number; loyalty: number; might: number; scars: number;
  traits: string[]; weak: string[]; known: string[];          // revealed secrets
  trophies?: { kind: string; slot: string; item: number }[];  // at most 2
  vengeful?: string;                                         // hero kind
  oath?: number;                                             // blood-oath brother's id
  memory: string[];                                          // at most 8 short lines, already worded
  met: number; lost: number; born: number;                   // meetings, meetings lost, war turn of birth
}
// Meta.grudges?: Record<string, Record<number, number>>  hero kind -> nemesis id -> grudge steps (1..3)

// Meta.dynasty?: Dynasties (dynasty.ts, readDynasty)
interface Dynasty {
  v: 1;
  start: number;                    // the day key the seasons count from
  lines: Record<string, Line>;      // by hero kind
  served?: Record<string, { season: number; waves: number }>; // this season's waves for the current bearers
  regulars?: string[];              // the Elders' table's order
}
interface Line { bearers: Bearer[]; current: number; heir?: { doneAt: number; partner: string; picks?: [HeirPick, HeirPick] }; mourning?: number }
interface Bearer {
  name: string; gen: number; served: number; parents?: [string, string]; look?: string;
  birthright?: string; heirloom?: number; grudge?: number;
  fate?: 'mentor' | 'regular' | 'shade' | 'fallen'; slainBy?: number; legend?: number; cadet?: boolean;
  memory?: string[];
}

// Run.nemesis?: the members met this run, frozen at the run's start (stats, traits, the waves they stand in), as Run.bonds is
// Run.oath?: true; Run.slain?: number[] (roster ids slain under the Oath)
// The Calamity Rises: its own slot, localStorage 'legends.rise' (rise.ts, readRise), never inside Meta
```

**Migration**:

- **No war** until the Undead Legion's first Normal clear. A save already past it opens the War on its next load, with an empty Council and
  one forced Recruit, so the board is never blank.
- **The Dynasties seed lazily.** Each owned kind gets a line with one bearer, its `HERO_NAMES` hero. Seasons start counting from the day
  the system opens: **nobody is made old by an update**. Long-time favourites are credited with their past: `served = min(5,
  floor(wavesFought / 250))`. So a favourite of many months is Prime and reaches Veteran in about one season. It is never instantly
  Veteran.
- **Today's mentors**, retired under `Meta.mentors`, keep their seats and rules. Each becomes bearer I with fate 'mentor'. The player is
  told once that the Hall's mentors may now **name an heir**, which brings their kind back to the party with the mentor still seated.
  Recall works as it does now.
- **Readers**: they drop unknown ids, clamp numbers and cut lists to their caps, so a corrupted or hand-edited save cannot grow without
  bound.
- **Size**: about 13 × 0.6 KB for members, plus 70 short log lines, plus 45 lines × about 3 bearers. That is under 30 KB in all, against
  today's save.
- **Tests**: an old save fixture loads unchanged; each reader round-trips; a save with mentors migrates; the caps hold.

---

## 8. Balance risks and how to test them

| Risk | Why it is a risk | The guard | Measured with |
|---|---|---|---|
| **The death spiral** | losing makes nemeses stronger, which makes losing likelier | Might +1 a run at most from deeds; Grudges stack on the loser's side; Normal at half Might; a nemesis that wins 3 meetings in a row has a 50% chance of a Feast instead of a promotion (it grows fat and lazy) | `npm run balance -- --no-tables --deep --levels 1,10,20,30,45,60 --nemesis typical` and `--nemesis harsh` (a new flag that seeds a Council of the war simulator's day 30 and day 90 states). **The bar**: no army's mean tries at its level rises by more than 1 against no War |
| **Snowballing churn** | infighting stacks Might where the player never sees it | +1 Might a turn at most; Feuds take Might away from the loser; the war simulator watches mean Might | **`npm run war-sim`** (new, `tools/nemesis/warSim.mjs`): 120 simulated days of council turns with the bot's runs feeding births. Reports seat changes a week, mean and highest Might, the warchief's life, empty seats. **Targets**: section 2.5's churn; mean Might 3 to 5 at day 60; nobody at 10 before day 45 |
| **Immunity walls** | a nemesis immune to a one-element party | at most 2 immunities; the Dread weakness always gives an answer; intel shows them before the run | a test over a thousand generated nemeses; `--nemesis harsh` with the mono-fire party |
| **Farming the War** | killing weak recruits for trophies and shards | pay is × Might; 12 trophies a day; 2 shards a week | `npm run unlock-pace` with the trophies' shards added: the 45th hero must not come more than 2 weeks sooner than the six-month pace |
| **Duels too swingy** | a 1v1 is high variance | the 55 to 65% band; a lost duel costs a wound, not the run; one a run | `npm run balance -- --duel` (new): every hero kind at its army's level against each army's captain and boss nemesis at Might 1, 5 and 10. Kinds outside 40 to 75% have their duel multiplier set per role (front, striker, back, support) |
| **Heirs as power creep** | heirlooms and birthrights stack over generations | one birthright; the heirloom mark caps at +9% on one piece; the Promise only below the cap | `npm run level-pace` (the Promise must not move the favourite's level 100 day by more than 3 days); `npm run gear-balance` with a third-generation heirloom |
| **The Oath's pay against its risk** | ×1.5 might make the Oath the only way to play | it opens late, on Hard or harder only; mourning is three days | the army pace tool with the Oath's pay: crowns a day, Oath against no Oath, under 1.3× for the bot (which loses heroes) |
| **Shades too strong** | another horn call | the same horn, once a fight; weaker than any Eidolon; auto never calls | `--eidolon <wave>:shade` in the existing flag |
| **The reverse campaign's difficulty** | a new mode with a new bot | per-act scales | `npm run balance -- --rise` (new): a greedy host bot that buys the strongest units it can afford and places them by the arena rules. **Targets**: Act I raids won 70%, Act II 60%, Act III 55%; a siege 50% at the act's expected Command |
| **Leaks from the Calamity Rises** | its rewards reach the main game | trophies only, inside the cap; Emboldening is opt-in | the unlock-pace check above, with the stronghold trophies |
| **Determinism and old fights** | new hooks in the fight | every hook is a no-op without `Unit.nem`, `Battle.duel` or `Battle.reverse` | `test/nemesis-regression.test.ts`: twelve ordinary fights' outcomes pinned before the War's hooks land, as `stand-regression.test.ts` does |

Each phase that touches a fight or a reward re-runs the tool that owns the number and keeps it in its band, or reports the change to the
owner.

---

## 9. The phased build plan

Ten phases. **Each one ships on its own and is fun on its own. The Nemesis War comes first.** Sizes are rough: S is about 600 lines with
its tests; M about 1,500; L about 3,000. Every phase writes its note in `docs/notes/<topic>.md`, runs `npm run typecheck`, `npm run web`
and the tests it touches, and takes shots at 393×852, 360×780 and 412×915.

### Phase 1: Named and remembered (the Nemesis core) · L

- **Plays as**: bosses and elites who slay, maim or escape come back named, with Might, a trait from the battle log, a Dread weakness, a
  name plate and a tint. Slaying them pays. A simple list board.
- **Files**:
  - new in `src/sim/`: `nemesis.ts` (births, promotion, Might, pay, `noteNemesis`, `readWar`), `nemesisTraits.ts` (the trait and weakness
    tables and their hooks), `nemesisLog.ts` (`tallyNemesis`), `nemesisNames.ts`;
  - changed: hooks in `battle.ts` (`Unit.nem`, the damage-taken step), `ailments.ts` (immunities), `run.ts` (the `Run.nemesis` snapshot),
    `armies.ts` (placing a nemesis into a wave), `meta.ts` (the reader);
  - page: `src/nemesisView.ts`, `src/nemesis.css`; changed `render/unitView.ts` (the plate and tint) and `waveCardView.ts`.
- **Tests** (`test/nemesis.test.ts`): each deed names a foe from a hand-built event log; the chances use their own stream; each trait
  comes from its log condition; at most 2 immunities; the Might caps; Normal at half; the pinned old fights unchanged; save round-trip.
- **Balance**: `--nemesis typical` on the deep tool.

### Phase 2: The Dark Council · M

- **Plays as**: the 1-4-8 pyramid, sworn captains, loyalty, council turns with Recruit, Promotion, Feud, Betrayal, Feast, Trial and
  Desertion; War News; the Fallen tab; the Warchief's Muster.
- **Files**: `src/sim/council.ts`, `src/sim/muster.ts`; the board's Council, News and Fallen tabs; the camp's war-table figurine.
- **Tests**: the turn cap a day; the event weights and preconditions; the warchief never slain by events; at least 3 lieutenants; the
  Muster's opening; determinism by the turn counter.
- **Tool**: `tools/nemesis/warSim.mjs` (`npm run war-sim`).

### Phase 3: Revenge, trophies and taunts · M

- **Plays as**: Grudges, the Avenger, Vengeance scenes, Vengeful, trophies taken and brought home, fleeing, cheating death, humiliation's
  return, the taunt cut-ins.
- **Files**: `src/sim/revenge.ts`; flee in `battle.ts`'s AI (behind `Unit.nem`); `src/sim/nemesisLines.ts` (templates by trigger and
  voice); `src/tauntCut.ts`, its rules in `tauntCutRules.ts`; Settings, Nemesis cut-ins.
- **Tests**: Avenger only at Sworn or more; Vengeance blocks cheating death; trophies at most 2 and returned; flee decided by the hash
  (not `b.rng`); every taunt template fills from a real memory; reduced motion.

### Phase 4: Duel waves · M

- **Plays as**: the challenge on the wave card, accept or refuse, the 1v1 in the middle ring, rout on a win.
- **Files**: `Battle.duel` in `battle.ts`; `src/sim/duel.ts` (the offer, the multipliers, the outcome); `waveCardView.ts`; the duel ring
  marks in `render/boardView.ts`.
- **Tests**: at most one a run; refusing gives Mocking; a win counts the wave won with its pay; a loss wounds; a timeout is an escape.
- **Tool**: `--duel`.

### Phase 5: Seasons and the Houses (Dynasties, part 1) · M

- **Plays as**: the season clock and icon; bearers and ages; life stages; Elder's Counsel; the family tree with generation I; veteran and
  elder looks through the re-tone tool.
- **Files**: `src/sim/dynasty.ts` (seasons, served, stages, `readDynasty`, the lazy seeding), `src/sim/dynastyWords.ts`; `src/housesView.ts`;
  `heroLooks.ts` rows for the elder tones; the hero sheet's Line row.
- **Tests**: a season counts only at 20 waves; the bench never ages; the migration credit cap of 5; no one made old by the update.

### Phase 6: Heirs and the Mantle (Dynasties, part 2) · L

- **Plays as**: naming an heir from a Sworn pair, training, two candidates, Passing the Mantle with the birthright, heirloom, Blood Grudge
  and Promise; the elder's honour (mentor with the kind kept, tavern regular at the Elders' table, the guest); fielding the elder; cadets in
  the tavern; heir scenes, in batches of ten.
- **Files**: `src/sim/heirs.ts`; changes to `legacy.ts` (a mentor with an heir keeps the kind in the party), `guest.ts` (the regular as a
  guest), `run.ts` (the bearer's banner), `render/tavernLife.ts` and `tavernSpots.ts` (the Elders' table); heir names; scenes in
  `bondScenes.ts`'s style.
- **Tests**: **no lasting progress changes on passing** (level, ranks, talents, gear, books identical before and after); the heirloom cap;
  one birthright; the twin rule with the elder; old mentors migrate.
- **Balance**: `level-pace`, `gear-balance`.

### Phase 7: The Legend Oath and the Shades · M

- **Plays as**: the Oath toggle; slain bearers; mourning and foundlings; Shades on the War Horn; tavern ghosts; Legend renown and title;
  Legend-slayers.
- **Files**: `src/sim/oath.ts`; the Shade entries in `eidolons.ts` and `warHorn.ts`; `eidolonCall.ts` (a short call for Shades);
  `render/tavernLife.ts` ghosts.
- **Tests**: slain only under the Oath and only by its two rules; progress intact; the 3-day mourning; Shades once a fight, never on
  auto; Legend-slayer's +2.

### Phase 8: The Calamity Rises, Act I · L

- **Plays as**: the black rift, the realm map's Act I, the Host with two legions, Dread and Souls, recruiting, raids and ambushes against
  founders' parties, region capture and corruption, the generals.
- **Files**:
  - `src/sim/rise.ts` (the campaign, economy and slot);
  - `src/sim/riseParty.ts` (the AI party from the roster: `suggest.ts`, `talentAuto.ts`, `autoplay.ts` deploy);
  - `placeFoe` / `unplaceFoe` and `Battle.reverse` in `battle.ts`;
  - `src/riseView.ts`, `src/rise.css`.
- **Tests**: placing only on the far rows; a timeout is the heroes' win under `reverse` and unchanged elsewhere; parties use only owned
  kinds at the act's band; Command caps; the own slot round-trips.
- **Tool**: `--rise`.

### Phase 9: Sieges, Acts II and III, and the Last Keep · L

- **Plays as**: strongholds as reverse Last Stands (the player buys the waves, the AI heroes guard the ruler); Hope and the Rally; cadet
  lines in Act II; what-if parties and your own Five at the Last Keep; the Citadel's upgrades; the Chronicle; the Second Age.
- **Files**: `src/sim/riseSiege.ts` (an AI that buys heroes on the Stand's shop for the defenders; the player's wave purchases),
  `src/sim/riseActs.ts`; the Codex Chronicle tab.
- **Tests**: the siege ends on the ruler's fall; Rally rules; no permanent loss; cadets lead only where they exist; what the campaign
  pays back stays inside the trophy cap.
- **Tool**: `stand-balance` with `--rise-siege`.

### Phase 10: The War everywhere · S to M

- **Plays as**: nemeses in the Last Stand (a lieutenant as a wave's elite) and as the Calamity's named elite of a map; the Season's War
  flavour; the Warchief's Head on the trophy wall; the cosmetic name plates in the Spoils.
- **Files**: `stand.ts`, `calamity.ts`, `trophyWall.ts`.
- **Tests**: the Last Stand's pinned regression still holds without a nemesis; the Calamity's bot rates within 2 points of 84 / 83 / 65 /
  45 / 35 / 16.

**Writing**: about 360 taunts, 90 replies, 270 heir names, 40 heir scenes, 40 Vengeance scenes and 135 heirloom and farewell lines. A
worker drafts them in batches for the owner to read, as the bond scenes were drafted. The first phase of each system ships with a first
batch, and the rest follow.

---

## 10. Open questions for the owner

Each has a recommendation; the build plan assumes it.

1. **The reverse campaign's name.** The game already has "the Calamity" (the rift-map mode). *Recommendation:* **The Calamity Rises**,
   told as the bard's what-if *Chronicle of the Fall*, in which the player is the will behind Karnok. It ties the two and contradicts no
   story. The alternative is a new name, such as *The Black Banner*.
2. **Should the Nemesis War touch Normal?** *Recommendation:* yes, from the Undead Legion's first clear, at **half Might** on Normal, so
   new players meet named foes early (the War is the expansion's hook) without a wall. Full effect from Hard.
3. **Forced retirement?** *Recommendation:* **never outside the Oath**. Elders fight at full power for ever, and passing the mantle is a
   rewarded choice. A forced clock would punish exactly the players who love one hero.
4. **What is an heir: a child, or kin of the heart?** *Recommendation:* each kindred pair's writing decides (child, ward, apprentice,
   successor). The game always says "heir" and never needs a romance. This keeps the 40 pairs true to the voices they already have.
5. **The Legend Oath: per run, or a whole hardcore save?** *Recommendation:* **per run**, on Hard or harder. It gives permadeath's stakes
   to the person, never to the progress, and players can try it without starting over. A whole hardcore save would split the roster.
6. **May the Calamity Rises feed power back into the main game?** *Recommendation:* only through the opt-in **Emboldening** (a general
   who wins for you gains +1 Might at home, and pays double). Otherwise only capped War Trophies, intel and cosmetics.
