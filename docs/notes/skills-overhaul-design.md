# Three skills, skills that grow by use, and cooldowns (design)

> **A design for the owner to approve.** No game code has changed. The numbers are a first tuning, set to follow the rules below; each
> is measured and moved in the build (section 8). The open questions are at the end, each with a recommended answer.

The owner's three asks:

1. **Three skills and the ultimate.** "I think we need to give everyone three skills with the ultimate. And when the units rank up in
   the waves (2 star, 3 star, 4 star) they don't need upgraded skills. We'll let the only way skills level up be through use; this came
   in the skill book upgrade we did, where usage of the character and skills makes them level up."
2. **Cooldowns.** "Skills have a cooldown too, not just MP cost. Where it makes sense they can be cheap and fast. This should be a varied
   thing that makes sense and follows rules for these skills."
3. **Summons and shapeshifts on a timer.** "The hero summons should be on a timer so they last more than one round. Same with the
   shapeshift." (Another worker may build this one; section 6 sets the rules it should follow so it fits the rest.)

This design reads ask 1 as **three skills, plus the ultimate** (four moves a hero), since every hero already has two skills and an
ultimate. It also reverses one of the skill books decisions ([books-shop-gear-design.md](https://github.com/hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md#the-owners-decisions),
decision 1, "only learned skills earn mastery"): now **every** skill levels by use, the hero's own and the learned ones alike.

## In short

- **A third skill for all 45 heroes, open from level 20** (skill 1 from level 1, skill 2 from 10, the ultimate from 30). Most are the
  cheap, fast move the kits lacked (32 jabs); ten are guards (an escape, a ward, a save) and three are utilities. The table is in
  [section 2](#2-the-third-skill-for-all-45).
- **Every skill has a class, and the class sets its cost, cooldown and cast time**: Jab, Strike, Heavy, Utility and Guard
  ([section 3](#3-cooldowns-as-a-real-rule)). Cheap and fast where it makes sense, slow and dear where it is big. All 135 skills are
  given a class, a cost and a cooldown.
- **Ranks (the stars from merging in a run) no longer change skills.** The tier 2, 3 and 4 skills and the tier 3 discount go; a rank
  gives hp and attack only, and that step is raised to make up for it ([section 4](#4-ranks-no-longer-upgrade-skills)).
- **Skills level up only by use**: five skill levels, earned by casting the skill and by fielding the hero, kept for each hero kind
  for good. Each level makes the skill stronger; the higher ones also cheaper, quicker and longer-lasting
  ([section 5](#5-skill-levels-by-use)). Learned skills from books use the same levels.
- **Summons and shapes last more than one wave**: a timer of fighting time (a wolf or a treant 60 s, a wraith 20 s, a shape 15 to 40 s)
  that carries from wave to wave ([section 6](#6-summons-and-shapeshifts-on-a-timer)).
- **The fight's hero rows show three skill chips**, with a compact three-high strip for the parties over five
  ([section 7](#7-the-hud-the-skill-sheet-and-the-unit-card)).

Contents:

1. [What the game does now](#1-what-the-game-does-now)
2. [The third skill for all 45](#2-the-third-skill-for-all-45)
3. [Cooldowns as a real rule](#3-cooldowns-as-a-real-rule) (the classes, the pool and the cooldown, how the AI chooses, every skill's numbers)
4. [Ranks no longer upgrade skills](#4-ranks-no-longer-upgrade-skills)
5. [Skill levels by use](#5-skill-levels-by-use)
6. [Summons and shapeshifts on a timer](#6-summons-and-shapeshifts-on-a-timer)
7. [The HUD, the skill sheet and the unit card](#7-the-hud-the-skill-sheet-and-the-unit-card)
8. [The balance plan](#8-the-balance-plan)
9. [Saves and determinism](#9-saves-and-determinism)
10. [What each part touches](#10-what-each-part-touches)
11. [Build plan](#11-build-plan)
12. [Open questions](#12-open-questions)

---

## 1. What the game does now

- **Kits** (`src/sim/heroKits.ts`, `src/sim/kits/table.ts`; [hero-kits.md](hero-kits.md)): every hero has one pool, stamina (SP, out of
  60) or mana (MP, out of 100), and two skills that cost it: skill 1 from level 1 and skill 2 from `SKILL2_LEVEL` (10). The ultimate opens
  at `ULT_LEVEL` (30) on its own meter ([ultimates.md](ultimates.md), [ult-charge.md](ult-charge.md)). The 45 kits as they now stand are
  in [rpg-spells.md](rpg-spells.md).
- **Cooldowns exist, but rarely decide anything.** Each slot has a `gap` (the shortest time between two casts); unset, it is the pool's
  own (`RES.GAP_STAM_MS` 3 s, `RES.GAP_MANA_MS` 5 s). Only 23 of the 90 skills have a gap of their own (8 to 15 s). With costs of 25 to 45
  SP and 40 to 70 MP, the pool is nearly always what holds a skill back: a 30 SP skill waits about 10 s for its points, long after its
  3 s gap has run.
- **The AI** (`castHero`): a queued ultimate, a healer's revive, an emergency, the ultimate on Auto; then skill 2 before skill 1, with
  skill 1 held back while skill 2 is nearly affordable (`holding`), and a mana healer keeping its heal's cost back (`reserve`).
- **Ranks change skills** (`src/sim/tierSkills.ts`; [hero-skills.md](hero-skills.md), [rank4-skills.md](rank4-skills.md),
  [tier-promises.md](tier-promises.md)): a hero merged to grade 2, 3 or 4 in a run casts a named, better version of its skill 1 (the
  Cleric's and Wanderer's improve skill 2): talent-style modifiers (`pow`, `dur`, `reach`, `extra`...) and riders (`nova`, `ward`,
  `echo`, `summon`...). From grade 3 its other skill costs 15% less (`TIER3_DISCOUNT`). Grades also lift hp and attack
  (`GRADE_BOOST` [1, 1.3, 1.6, 2.4], [merge-two.md](merge-two.md)).
- **Skill books** are designed and approved, not built ([the design](https://github.com/hpatter9/legends-of-the-fall/blob/claude/shop-books-design/docs/notes/books-shop-gear-design.md)):
  a book teaches a skill that can sit in either slot, and learned skills earn mastery ranks 1 to 3 by casts (rank 2 at 30, rank 3 at 100).
- **Summons and shapes end with the wave.** Treants and wolves have no timer but are gone when the wave ends (each army wave is a new
  fight); a wraith lasts 8 s, the standard 10 s, the decoys 3 to 5 s. The Werewolf's form holds for the rest of the wave, Wild Shape 6 s,
  Alter Self 5 s, Full Moon and Metamorphosis 7 s. Only the Last Stand, whose waves are one long fight, lets them run on.
- **The fight HUD** (`src/fightHud.ts`, `src/fightHudRules.ts`, `src/fightHud.css`; [battle-hud.md](battle-hud.md)): one row a hero with
  two wide skill chips; a party over five takes two columns of compact rows, each with two small chips stacked. The skill sheet has
  Skill 1, Skill 2 and Ultimate tabs and lists the tier lines. The unit info card ([unit-info.md](unit-info.md)) reads the same sheet.

---

## 2. The third skill for all 45

### When each move opens

| Move | Opens at | Why |
| --- | --- | --- |
| Skill 1 | level 1 | as now |
| Skill 2 | level 10 | as now |
| **Skill 3** | **level 20** (`SKILL3_LEVEL`) | halfway between skill 2 and the ultimate. The spire's and the Calamity's in-run levels stop at 30, so a run's heroes reach it too. |
| Ultimate | level 30 | as now |

A hero below 20 shows skill 3 locked ("Lv 20"), as skill 2 is shown below 10. Opening skill 3 also deepens the pool a little (as skill 2
does now, `SKILL2_PACE_*`): `SKILL3_PACE` about 1.1 for both pools, measured in the build so a level-20 hero can feed three skills.

### How the third skills were chosen

- **Fill the gap in the kit.** Once every skill has a class (section 3), most kits are a Strike and a Heavy, or a Strike and a Utility:
  nothing cheap and quick. So most third skills (32) are **jabs**: a quick, cheap move used between the big ones, which keeps the hero
  doing something its own while the pool fills. Where the hero's fantasy is to hold on or to save a friend, the third skill is a
  **guard** (10): an escape, a ward, a heal at the brink. Three are **utilities**, where a jab would not fit the hero (the Juggernaut's
  wall, the Warlock's curse, the Minotaur's bellow).
- **Draw on the rpg-spells design's unused moves** ([rpg-spells-design.md](rpg-spells-design.md) section 5): **Warding Bond** (the
  Paladin's v1 skill 2), **Wall of Stone** (the Juggernaut's v1 skill 2), **Rend** (the Werewolf's v1 skill 1), **Second Wind** (the
  Knight's v1 skill 2, renamed **Hold Fast**, since "Second Wind" is now a talent's and a gear ability's name) and **Step of the Wind**
  (the leap named in the design's Quivering Palm). The rest are classic RPG moves that fit the hero, with names that no other skill,
  talent or foe uses (checked against the code), and with keys of their own (`Skill.key`, as the RPG-SPELLS batch 0 rule asks).
- **Use what the game already has.** Every third skill is built from the movement toolkit (shove, pull, blink, the stone wall), the
  ailments (bleed, burn, slow, weaken, curse, the Charged mark, the miss of Smoke Bomb) and the cast helpers the tier skills used
  (`castHeal`, `castShield`, `cleanse`). No new engine is needed; the "Drawn from" column says what each reuses.
- **Effects:** simple effects first, as the owner chose for the hero kits: each reuses or recolours an existing painting or signature
  (a jab's slash, a shot, a bolt). A list of the ones that want their own painting comes with the build (section 11, batch 4).

### The table

"x0.8" is the strength against the caster's attack while it casts (its `tune`, the balance knob); the build tunes it. A **Guard** casts at
once when its trigger holds (the slot's `emergency`); the trigger is in the words.

| Hero | Skill 3 | Class | What it does | Cost | Cooldown | Cast | Drawn from |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Knight | **Hold Fast** | Guard | When he falls under 40% with a foe beside him, he plants his feet: a fifth of his health comes back and he shakes off one ailment | 15 SP | 20 s | 0.4 s | v1's Second Wind (its name is now a talent's, so it is renamed); `castHeal` and `cleanse` on himself |
| Paladin | **Warding Bond** | Guard | The ally in most trouble within 4 is bound to him for 6 s: it takes 10% less, and half of every blow on it comes to him instead. At once when an ally falls under 35% | 30 MP | 18 s | 0.4 s | v1's Warding Bond, dropped for Aura of Protection; a new share-the-blow rule |
| Peasant | **Pitchfork Jab** | Jab | A quick thrust at the foe before him (x0.8) that shoves it a tile back [Shove] | 9 SP | 3 s | 0.35 s | new; the toolkit's shove |
| Juggernaut | **Wall of Stone** | Utility | Three tiles of stone wall rise across the nearest foes' way to his back line, for 6 s [Wall: stone] | 26 SP | 16 s | 0.6 s | v1's Wall of Stone (it became Tunnel Strike); the toolkit's stone wall and choke rule |
| Samurai | **Kesa Cut** | Jab | A fast diagonal cut on the foe before him (x0.9); it bleeds 3 s | 9 SP | 3 s | 0.3 s | new; an ordinary blow with the bleed rider |
| Kunoichi | **Shuriken Fan** | Jab | Three shuriken at the three nearest foes within 4 (x0.4 each); each is slowed 1 s | 9 SP | 3 s | 0.35 s | new; three shots, as Rapid Shot's |
| Ninja Monk | **Step of the Wind** | Guard | With two or more foes on him, he steps up to 3 tiles to the safest tile and slips every blow for 1.5 s; his next blow builds two Flow [Blink] | 14 SP | 15 s | 0.3 s | the leap's name in the design's Quivering Palm; the toolkit's blink, Smoke Bomb's untargetable |
| Barbarian | **Reckless Swing** | Jab | A wild overhead blow on one foe (x1.2); he takes 10% more for 2 s | 10 SP | 3 s | 0.4 s | new |
| Mercenary | **Dirty Trick** | Jab | Sand in the eyes of the foe before him (x0.6): it misses half its blows for 2 s | 9 SP | 4 s | 0.3 s | new; Smoke Bomb's miss rule on one foe |
| Lancer | **Lance Sweep** | Jab | A sweep of the lance at the foes beside him (x0.6), each shoved a tile; it gives a little Momentum [Shove] | 9 SP | 3 s | 0.4 s | new; the toolkit's shove |
| Arc Blade | **Static Edge** | Jab | A crackling cut on the foe before him (x0.7); it is shocked, and a tenth of the cut is stored for Thunderwave | 8 SP | 2.5 s | 0.3 s | new; his stored-damage rule |
| Demon Swordsman | **Infernal Brand** | Jab | Brands the foe before him (x0.6, burns 3 s); his next Cleave drinks double from a branded foe | 9 SP | 3 s | 0.35 s | new; the burn rider |
| Buccaneer | **Pistol Shot** | Jab | A flintlock shot at the nearest foe within 4 (x0.8); a shooter it hits is staggered 0.5 s | 9 SP | 3 s | 0.35 s | new; a shot, as the Gunslinger's |
| Queen Dragoon | **Scale Ward** | Guard | When she falls under 50%, her scales harden: she takes 30% less for 4 s, and whoever strikes her burns | 15 SP | 18 s | 0.4 s | new; a guard with a burn-back, as Riposte answers |
| Archer | **Double Shot** | Jab | Two fast arrows at the nearest foe (x0.5 each) | 8 SP | 3 s | 0.3 s | new; two shots |
| Ranger | **Barbed Arrow** | Jab | An arrow at the nearest foe (x0.7) that bleeds 3 s; a foe held by a snare or standing in caltrops takes double | 8 SP | 3 s | 0.3 s | new |
| Gunslinger | **Skip Shot** | Jab | A shot that skips off the nearest foe to a second within 2 (x0.6 each) | 9 SP | 3 s | 0.35 s | new; the chain rule, two links |
| Rifle Bot | **Barrier Drone** | Guard | A drone shields it and the nearest ally for 5 s (a fifth of each one's health). At once when either falls under 40% | 15 SP | 18 s | 0.5 s | new; `castShield` on two |
| Siege Bot | **Flak Burst** | Guard | With a foe beside it: a point-blank charge hurts the foes within 1 (x0.6) and shoves them 2 tiles back [Shove] | 12 SP | 10 s | 0.4 s | new; the toolkit's shove |
| Dread Pirate | **Grapeshot** | Jab | A blast of grapeshot over the three tiles before him (x0.5 each); each foe hit is slowed 1 s | 9 SP | 3 s | 0.4 s | new |
| Fire Wizard | **Fire Bolt** | Jab | A quick bolt at the nearest foe (x0.8); a burning foe takes half as much again | 12 MP | 3 s | 0.35 s | new; a bolt, as Guiding Bolt's |
| Lightning Mage | **Spark** | Jab | A spark at the nearest foe (x0.6), which is Charged (so Storm Surge can set it off) | 10 MP | 2.5 s | 0.3 s | new; Chain Lightning's Charged mark on one foe |
| Warlock | **Curse of Weakness** | Utility | The three strongest foes within 6 are weakened for 6 s (they deal a quarter less), and his blasts drink double from them | 36 MP | 16 s | 0.6 s | new; the weaken ailment |
| Great Sage | **Arcane Ward** | Guard | The ally in most trouble within 5 is warded for 5 s (a fifth of its health). At once when an ally falls under 35% | 28 MP | 15 s | 0.4 s | new; `castShield`, as the tier wards did |
| Time Witch | **Hourglass Bolt** | Jab | A bolt of sand at the nearest foe (x0.7): slowed 1.5 s, and its skill meter loses a tenth | 12 MP | 3 s | 0.35 s | new; Slow on one foe, Pilfer's meter drain |
| Illusionist | **Phantasmal Blade** | Jab | A blade of illusion at the nearest foe (x0.6, past its defence); it strikes at random for 1 s (the nearest fighter, friend or foe) | 12 MP | 3 s | 0.35 s | new; Charm Monster's turn-coat rule, for a moment |
| Cleric | **Healing Word** | Jab | A quick word of healing: the most hurt ally in sight heals 8% of its health | 14 MP | 4 s | 0.3 s | new; the cheap fast heal the healers lacked |
| High Priestess | **Sacred Flame** | Jab | A pillar of light on the nearest foe (x0.7; undead and fiends take half again); it misses its next blow | 12 MP | 3 s | 0.35 s | new; Divine Smite's undead rule |
| Wanderer | **Acid Flask** | Jab | A flask of acid at the nearest foe (x0.5); its defence drops by a third for 4 s | 12 MP | 3 s | 0.35 s | new; Alchemist's Fire's flask |
| Druid | **Thorn Whip** | Jab | A whip of thorns at the nearest foe within 4 (x0.6) drags it a tile towards her treant [Pull] | 12 MP | 3 s | 0.4 s | new; the toolkit's pull |
| Samurai Commander | **Command Strike** | Jab | He and the ally nearest him each strike the foe before them at once (x0.6) | 9 SP | 4 s | 0.3 s | new; two ordinary blows |
| Wolf Bard | **Countercharm** | Guard | Every ally within 3 is freed of its ailments and shrugs off new ones for 3 s. At once when two allies near him carry an ailment | 28 MP | 16 s | 0.5 s | new; the `cleanse` rider |
| Tyrant | **Scourge** | Jab | A lash of his chain at the nearest foe within 3 (x0.7); it is weakened 2 s | 12 MP | 3 s | 0.35 s | new; the weaken ailment |
| Beastmaster | **Mend the Pack** | Guard | Every wolf of hers heals a third and is warded 3 s; with none, she heals a tenth. At once when a wolf falls under 30% | 14 SP | 15 s | 0.4 s | new; `castHeal` and `castShield` on her summons |
| Reaper | **Soul Snare** | Jab | A spectral hook drags the weakest foe within 4 a tile towards him and cuts it (x0.6); a foe under 30% is dragged into his reach [Pull] | 9 SP | 3 s | 0.35 s | new; the toolkit's pull |
| Kitsune | **Fox Wisps** | Jab | Three wisps of fox fire at the three nearest foes (x0.4 each, burning 2 s) | 12 MP | 3 s | 0.35 s | new (named apart from the Foxfire talent) |
| Karasu Tengu | **Feather Darts** | Jab | Razor feathers at the two nearest foes (x0.5 each); each bleeds 2 s | 8 SP | 2.5 s | 0.3 s | new |
| Yamabushi Tengu | **Ringing Staff** | Jab | A blow of his ringed staff on the foe before him (x0.8); it is stunned 0.5 s | 9 SP | 3 s | 0.35 s | new |
| Werewolf | **Rend** | Jab | Claws rake the foe before him (x0.6) and it bleeds 4 s; in the Hunter form he rakes twice | 8 SP | 2.5 s | 0.3 s | v1's Rend (it became Pounce) |
| Minotaur | **Bellow** | Utility | A bellow: every foe within 3 is frightened for 2 s (it runs from him), and takes 15% more from him for 5 s | 20 SP | 16 s | 0.5 s | new; the fright of Full Moon's howl |
| Satyr | **Butting Horns** | Jab | Butts the foe before him (x0.7) and shoves it a tile [Shove] | 12 MP | 3 s | 0.35 s | new; the toolkit's shove |
| Gorgon | **Serpent Bite** | Jab | Her serpent hair bites the nearest foe within 2 (x0.6): poisoned 3 s and slowed 1 s (so Flesh to Stone can take it) | 12 MP | 3 s | 0.3 s | new |
| Shambler | **Bile Spit** | Jab | Spits bile at the nearest foe within 3 (x0.6); it rots 3 s | 8 SP | 3 s | 0.35 s | new; Contagion's rot on one foe |
| Mummy | **Tomb Rot** | Jab | A touch of grave-rot on the foe before him (x0.7); it is cursed 3 s (it heals less) | 12 MP | 3 s | 0.35 s | new; the curse ailment |
| Kraken Mate | **Ink Cloud** | Guard | When foes crowd him, a cloud of ink: the foes within 2 miss half their blows for 3 s, and he slips a tile back | 15 SP | 15 s | 0.35 s | new; Smoke Bomb's miss rule |

---

## 3. Cooldowns as a real rule

### The five classes

Every skill belongs to one class (`Slot.cls`), and the class sets the range its cost, cooldown and cast time sit in. A skill's worth is
paid for in one of two ways: **its pool cost** (how much of the shared well it drinks) or **its cooldown** (how long before it can come
again). Cheap, quick things are held back by their cooldown; big things by their cost.

| Class | What it is | Stamina cost (of 60) | Mana cost (of 100) | Cooldown | Cast time | What holds it back |
| --- | --- | --- | --- | --- | --- | --- |
| **Jab** | A quick hit or poke on one or two foes, with a small rider (a bleed, a slow, a shove) | 8 to 12 | 10 to 15 | 2.5 to 4 s | 0.3 to 0.4 s | its cooldown: a hero can jab whenever it is off cooldown and still keep its pool |
| **Strike** | The hero's bread and butter: a solid hit, a small area, a dash or blink in | 20 to 28 | 30 to 40 | 5 to 9 s | 0.45 to 0.8 s | both: about one in every two or three cooldowns is paid for |
| **Heavy** | A big area, a launch, a burrow, a wall, a multi-hit, a strong hold on a foe | 28 to 36 | 42 to 50 | 9 to 14 s | 0.5 to 1.0 s (a channel up to 2 s) | its cost: it is saved for |
| **Utility** | A lasting aura, banner, field or buff; a summon; a shapeshift; a long control | 16 to 30 | 30 to 50 | 12 to 20 s | 0.4 to 0.8 s | its cooldown: it is always affordable when it comes round, if the AI saved for it |
| **Guard** | An escape, a ward, a heal at the brink, a parry: cast at once when its trigger holds | 12 to 20 | 25 to 45 | 10 to 20 s | 0.3 to 0.5 s | its cooldown and its trigger |
| (Revive face) | A healer's skill 2 raising the fallen | its skill 2 cost + 20 | | 30 s | as now | unchanged ([spells-b2.md](spells-b2.md)) |
| (Ultimate) | | its meter | | none | as now | unchanged |

**The rules a kit follows** (a test checks them for all 45, `test/skill-rules.test.ts`):

1. **Every skill sits in its class's ranges** above.
2. **A jab never empties the pool on its own:** its cost divided by its cooldown is below the pool's income (the reference income at level
   20: about **3.5 SP a second** for a stamina hero and **4.5 MP a second** for a mana hero, from the refill and the gains from blows;
   `tools/skills/income.mjs` measures it and the test reads the measured number).
3. **The kit's demand** (each skill's cost divided by its cooldown, added up, against the income) is **between 1.4 and 3.5**: no kit can
   cast everything its cooldowns allow, so the AI's choices matter, and no kit starves. Where a kit falls follows its role:
   - **Tanks, supports and summoners** (kits of utilities and guards) are **cooldown-bound**: demand 1.4 to 2.2. Their pool is rarely
     empty; they cast when their cooldowns come round. (The Commander 1.5, the Beastmaster 1.5, the Knight 1.7.)
   - **Damage dealers** (strikes and heavies) are **pool-bound**: demand 2.2 to 3.5. They could cast more than they can pay for, so the
     pool decides. (The Lightning Mage 3.2, the Fire Wizard 3.0, the Gunslinger 2.9.)
4. **A heavier class costs more of the pool, never less**, within a kit: a hero's jab is its cheapest skill, its heavy its dearest.
5. **One gap between any two of a hero's skills** (the "breath", `RES.BREATH_MS`, about 0.8 s after a cast ends): a jab cannot follow a
   strike in the same instant, so heroes still strike and walk between casts and three skills do not turn into a blur. The ultimate and
   a guard's emergency ignore it.
6. **The pool's own default gap goes** (`RES.GAP_MANA_MS`, `RES.GAP_STAM_MS`): every slot has a cooldown of its own, from its class.

### How the cooldown and the pool work together

- **The cooldown starts when the cast begins** and runs in fight time. A skill that looked and found nothing to do starts no cooldown and
  costs nothing (as now: `idle2` becomes one `idle` time for each slot).
- **The cost is paid at the cast.** A stamina hero emptied by a cast is winded (as now). Refunds (a talent's "charge back") are as now.
- **The chip shows both:** the dark sweep is the cooldown, the coloured line under it how much of the cost the pool holds (as now).
- **A skill's level** (section 5) can make it cheaper and quicker, but never out of its class's ranges by more than its Level 5 cut
  (15%): a Level 5 jab can be cheaper than the cheapest Level 1 jab, and that is the reward.
- **Talents and gear that act on "skill 2"** act on whatever skill is in slot 2, as the books design already says; none name skill 3.
  Equipment's `charge` (faster refill) and the talent `refund` reach all three skills.

### How the AI chooses

`castHero` is rewritten for any number of slots (`HeroKit.slots: Slot[]`, with `s1` and `s2` kept as names for the first two so the
foes' and the old code's reads stay valid). Each time a hero is free to act:

1. **A queued ultimate** (the player's tap), then **a healer's revive face** (as now).
2. **Emergencies:** any open skill whose trigger holds and can be paid, guards first, then by slot order.
3. **The ultimate on Auto** (as now).
4. **The best ready skill:** open, affordable, off cooldown, past the breath, and with something to do (its `when` look, `kits/when.ts`,
   which gains entries for skill 3). Among those, **Heavy, then Utility, then Strike, then Jab**; ties by slot number, the higher first
   (so skill 3, then 2, then 1, as skill 2 goes before skill 1 now).
5. **Saving for the bigger skill:** a cheaper skill is passed over when paying for it would leave a heavier one, whose cooldown ends
   within the hold (`RES.HOLD_STAM_MS` 1.5 s, `RES.HOLD_MANA_MS` 3 s), short of its cost then. This is today's `holding` rule, made
   general: today it holds skill 1 for skill 2; now any lighter class holds for any heavier one. **A jab is never held** while its own
   demand is under the income (rule 2), so a hero with nothing big coming keeps jabbing.
6. **Taking turns:** the skill cast last goes last among equals, so a kit with two strikes alternates them (today's rule for skill 1
   and 2).
7. **A mana healer keeps its heal's cost back** while a friend is badly hurt (`reserve`, as now), for any of its three skills.

All of it is a fixed order over the fight's state: no draw from any stream.

### Every skill's class, cost and cooldown

Starting numbers, before the tuning pass; "was" is the cost and the gap today (the pool's 3 s or 5 s where the skill had none of its own).
"Demand" is rule 3's ratio. Cast times of skills 1 and 2 stay as they are (`Skill.castMs`, matched to their looks). Most already sit in their class's range;
the few outside it keep theirs: Drain Life (a 2 s channel) and Fan the Hammer (1.9 s, the shots are fired during it); Rewind, Death Ward
and Devour (0.6 to 0.7 s, a little slow for a guard); Dragon Dive, Loaded Dice and Thunderwave (0.4 to 0.45 s, a little quick for a
heavy).

| Hero | Pool | Skill 1 | Skill 2 | Skill 3 (new) | Demand |
| --- | --- | --- | --- | --- | --- |
| Knight | Stamina | Shield Wall: **Utility**, 24 SP, 14 s (was 30, 11 s) | Shield Rush: **Heavy**, 32 SP, 9 s (was 40, 8 s) | Hold Fast: **Guard**, 15 SP, 20 s | 1.7 |
| Paladin | Mana | Divine Smite: **Strike**, 36 MP, 6 s (was 40, 5 s) | Aura of Protection: **Utility**, 48 MP, 16 s (was 60, 9 s) | Warding Bond: **Guard**, 30 MP, 18 s | 2.4 |
| Peasant | Stamina | Phalanx: **Utility**, 22 SP, 12 s (was 30, 3 s) | Spear Wall: **Heavy**, 32 SP, 11 s (was 40, 9 s) | Pitchfork Jab: **Jab**, 9 SP, 3 s | 2.2 |
| Juggernaut | Stamina | Seismic Slam: **Strike**, 26 SP, 7 s (was 30, 3 s) | Tunnel Strike: **Heavy**, 36 SP, 12 s (was 45, 10 s) | Wall of Stone: **Utility**, 26 SP, 16 s | 2.4 |
| Samurai | Stamina | Iaido: **Strike**, 24 SP, 6 s (was 30, 3 s) | Riposte: **Guard**, 20 SP, 12 s (was 40, 3 s) | Kesa Cut: **Jab**, 9 SP, 3 s | 2.5 |
| Kunoichi | Stamina | Sneak Attack: **Strike**, 22 SP, 6 s (was 25, 3 s) | Smoke Bomb: **Guard**, 18 SP, 16 s (was 40, 3 s) | Shuriken Fan: **Jab**, 9 SP, 3 s | 2.2 |
| Ninja Monk | Stamina | Flurry of Blows: **Strike**, 22 SP, 6 s (was 25, 3 s) | Quivering Palm: **Heavy**, 32 SP, 10 s (was 40, 3 s) | Step of the Wind: **Guard**, 14 SP, 15 s | 2.2 |
| Barbarian | Stamina | Whirlwind: **Strike**, 24 SP, 6 s (was 30, 3 s) | Rage: **Utility**, 18 SP +10% health, 16 s (was 25, 14 s) | Reckless Swing: **Jab**, 10 SP, 3 s | 2.4 |
| Mercenary | Stamina | Ambush: **Strike**, 24 SP, 7 s (was 30, 3 s) | Hunter's Mark: **Utility**, 26 SP, 14 s (was 40, 3 s) | Dirty Trick: **Jab**, 9 SP, 4 s | 2.2 |
| Lancer | Stamina | Charge: **Strike**, 24 SP, 7 s (was 30, 3 s) | Disengage: **Guard**, 16 SP, 12 s (was 40, 3 s) | Lance Sweep: **Jab**, 9 SP, 3 s | 2.2 |
| Arc Blade | Stamina | Thunder Step: **Strike**, 24 SP, 7 s (was 30, 3 s) | Thunderwave: **Heavy**, 30 SP, 10 s (was 40, 3 s) | Static Edge: **Jab**, 8 SP, 2.5 s | 2.8 |
| Demon Swordsman | Stamina | Cleave: **Strike**, 24 SP, 6 s (was 30, 3 s) | Blood Pact: **Utility**, 16 SP +10% health, 12 s (was 25, 6 s) | Infernal Brand: **Jab**, 9 SP, 3 s | 2.4 |
| Buccaneer | Stamina | Grappling Hook: **Strike**, 24 SP, 9 s (was 30, 10 s) | Loaded Dice: **Heavy**, 30 SP, 10 s (was 40, 3 s) | Pistol Shot: **Jab**, 9 SP, 3 s | 2.5 |
| Queen Dragoon | Stamina | Dragon Breath: **Strike**, 26 SP, 7 s (was 35, 3 s) | Dragon Dive: **Heavy**, 34 SP, 11 s (was 45, 3 s) | Scale Ward: **Guard**, 15 SP, 18 s | 2.2 |
| Archer | Stamina | Volley: **Strike**, 24 SP, 6 s (was 30, 3 s) | Aimed Shot: **Heavy**, 30 SP, 10 s (was 40, 3 s) | Double Shot: **Jab**, 8 SP, 3 s | 2.8 |
| Ranger | Stamina | Snare: **Strike**, 22 SP, 9 s (was 30, 9 s) | Spike Growth: **Heavy**, 32 SP, 12 s (was 45, 3 s) | Barbed Arrow: **Jab**, 8 SP, 3 s | 2.2 |
| Gunslinger | Stamina | Piercing Shot: **Strike**, 26 SP, 6 s (was 35, 3 s) | Fan the Hammer: **Heavy**, 32 SP, 11 s (was 45, 3 s) | Skip Shot: **Jab**, 9 SP, 3 s | 2.9 |
| Rifle Bot | Stamina | Rapid Shot: **Strike**, 22 SP, 5 s (was 30, 3 s) | Suppressing Fire: **Heavy**, 32 SP, 11 s (was 45, 3 s) | Barrier Drone: **Guard**, 15 SP, 18 s | 2.3 |
| Siege Bot | Stamina | Bombard: **Strike**, 26 SP, 7 s (was 35, 3 s) | Siege Mode: **Utility**, 26 SP, 18 s (was 40, 3 s) | Flak Burst: **Guard**, 12 SP, 10 s | 1.8 |
| Dread Pirate | Stamina | Cannonade: **Strike**, 26 SP, 7 s (was 35, 3 s) | Powder Keg: **Heavy**, 34 SP, 12 s (was 45, 3 s) | Grapeshot: **Jab**, 9 SP, 3 s | 2.7 |
| Fire Wizard | Mana | Fireball: **Strike**, 38 MP, 7 s (was 50, 7 s) | Wall of Fire: **Heavy**, 48 MP, 12 s (was 55, 5 s) | Fire Bolt: **Jab**, 12 MP, 3 s | 3.0 |
| Lightning Mage | Mana | Chain Lightning: **Strike**, 36 MP, 6 s (was 45, 5 s) | Storm Surge: **Heavy**, 44 MP, 10 s (was 55, 5 s) | Spark: **Jab**, 10 MP, 2.5 s | 3.2 |
| Warlock | Mana | Eldritch Blast: **Strike**, 36 MP, 6 s (was 45, 5 s) | Drain Life: **Heavy**, 46 MP, 12 s (was 60, 5 s) | Curse of Weakness: **Utility**, 36 MP, 16 s | 2.7 |
| Great Sage | Mana | Magic Missile: **Strike**, 38 MP, 7 s (was 50, 5 s) | Font of Magic: **Utility**, 42 MP, 18 s (was 55, 8 s) | Arcane Ward: **Guard**, 28 MP, 15 s | 2.1 |
| Time Witch | Mana | Slow: **Utility**, 38 MP, 14 s (was 45, 9 s) | Rewind: **Guard**, 42 MP, 14 s (was 60, 10 s) | Hourglass Bolt: **Jab**, 12 MP, 3 s | 2.2 |
| Illusionist | Mana | Mirror Image: **Guard**, 32 MP, 16 s (was 50, 14 s) | Transposition: **Utility**, 42 MP, 18 s (was 70, 15 s) | Phantasmal Blade: **Jab**, 12 MP, 3 s | 1.9 |
| Cleric | Mana | Guiding Bolt: **Strike**, 32 MP, 6 s (was 40, 5 s) | Prayer of Healing: **Utility**, 46 MP, 14 s (was 60, 5 s) | Healing Word: **Jab**, 14 MP, 4 s | 2.7 |
| High Priestess | Mana | Cure Wounds: **Strike**, 36 MP, 6 s (was 45, 5 s) | Death Ward: **Guard**, 38 MP, 14 s (was 55, 12 s) | Sacred Flame: **Jab**, 12 MP, 3 s | 2.8 |
| Wanderer | Mana | Healing Draught: **Strike**, 32 MP, 7 s (was 40, 7 s) | Healing Mist: **Utility**, 46 MP, 15 s (was 60, 5 s) | Acid Flask: **Jab**, 12 MP, 3 s | 2.6 |
| Druid | Mana | Conjure Treant: **Utility**, 42 MP, 16 s (was 50, 5 s) | Wild Shape: **Utility**, 42 MP, 20 s (was 55, 12 s) | Thorn Whip: **Jab**, 12 MP, 3 s | 1.9 |
| Samurai Commander | Stamina | War Banner: **Utility**, 22 SP, 14 s (was 30, 11 s) | Plant the Standard: **Utility**, 28 SP, 20 s (was 45, 3 s) | Command Strike: **Jab**, 9 SP, 4 s | 1.5 |
| Wolf Bard | Mana | Vicious Mockery: **Strike**, 32 MP, 7 s (was 40, 5 s) | Bardic Inspiration: **Utility**, 38 MP, 14 s (was 55, 5 s) | Countercharm: **Guard**, 28 MP, 16 s | 2.0 |
| Tyrant | Mana | Judgement: **Strike**, 36 MP, 7 s (was 45, 5 s) | Bane: **Heavy**, 46 MP, 12 s (was 60, 10 s) | Scourge: **Jab**, 12 MP, 3 s | 2.9 |
| Beastmaster | Stamina | Summon Beast: **Utility**, 24 SP, 14 s (was 35, 9 s) | Pack Tactics: **Strike**, 24 SP, 9 s (was 40, 3 s) | Mend the Pack: **Guard**, 14 SP, 15 s | 1.5 |
| Reaper | Stamina | Reap: **Strike**, 24 SP, 6 s (was 30, 3 s) | Animate Dead: **Utility**, 24 SP, 16 s (was 40, 3 s) | Soul Snare: **Jab**, 9 SP, 3 s | 2.4 |
| Kitsune | Mana | Charm Monster: **Utility**, 38 MP, 14 s (was 45, 5 s) | Alter Self: **Utility**, 42 MP, 20 s (was 60, 12 s) | Fox Wisps: **Jab**, 12 MP, 3 s | 2.0 |
| Karasu Tengu | Stamina | Swoop: **Strike**, 22 SP, 6 s (was 30, 3 s) | Pilfer: **Utility**, 22 SP, 12 s (was 40, 3 s) | Feather Darts: **Jab**, 8 SP, 2.5 s | 2.5 |
| Yamabushi Tengu | Stamina | Gust of Wind: **Strike**, 22 SP, 6 s (was 30, 3 s) | Wind Wall: **Utility**, 24 SP, 14 s (was 40, 3 s) | Ringing Staff: **Jab**, 9 SP, 3 s | 2.4 |
| Werewolf | Stamina | Pounce: **Strike**, 20 SP, 6 s (was 25, 3 s) | Shapechange: **Utility**, 22 SP, 16 s (was 40, 3 s) | Rend: **Jab**, 8 SP, 2.5 s | 2.3 |
| Minotaur | Stamina | Gore Charge: **Strike**, 26 SP, 7 s (was 35, 3 s) | Bull Rush: **Heavy**, 32 SP, 10 s (was 45, 3 s) | Bellow: **Utility**, 20 SP, 16 s | 2.3 |
| Satyr | Mana | Pipes of Pan: **Utility**, 30 MP, 14 s (was 40, 9 s) | Irresistible Dance: **Heavy**, 46 MP, 12 s (was 60, 5 s) | Butting Horns: **Jab**, 12 MP, 3 s | 2.2 |
| Gorgon | Mana | Petrifying Gaze: **Strike**, 36 MP, 7 s (was 45, 5 s) | Flesh to Stone: **Heavy**, 46 MP, 12 s (was 60, 5 s) | Serpent Bite: **Jab**, 12 MP, 3 s | 2.9 |
| Shambler | Stamina | Contagion: **Utility**, 24 SP, 14 s (was 30, 3 s) | Devour: **Guard**, 18 SP, 10 s (was 40, 3 s) | Bile Spit: **Jab**, 8 SP, 3 s | 1.8 |
| Mummy | Mana | Hold Person: **Strike**, 32 MP, 7 s (was 40, 5 s) | Dominate Monster: **Heavy**, 46 MP, 14 s (was 60, 5 s) | Tomb Rot: **Jab**, 12 MP, 3 s | 2.6 |
| Kraken Mate | Stamina | Grasping Tentacles: **Strike**, 22 SP, 6 s (was 30, 3 s) | Tidal Wave: **Heavy**, 34 SP, 11 s (was 45, 3 s) | Ink Cloud: **Guard**, 15 SP, 15 s | 2.2 |

---

## 4. Ranks no longer upgrade skills

### What goes

- **The tier 2, 3 and 4 skills** (`TIER_SKILLS`, `tierSkillOf`, `applyTierMods`, `runRiders` and the tier echoes): a merged hero casts
  the same skills as an unmerged one. `promoteUnit` keeps the mid-fight promotion's stats and look and stops swapping a skill.
- **The tier 3 discount** (`TIER3_DISCOUNT` in `costOf`).
- **The tier lines** on the skill sheet, the hero sheet's Skills tab and the codex ("Tier 2 · Iron Wall: ..."). The promotion banner says
  "Rank 3" and the step it brings ("Health and attack x1.75"), not a skill's name.
- `src/sim/tierSkills.ts` is deleted once nothing reads it; its 135 names become free for later skills (a few were used here).

### What stays

The merge itself, the stars, the rank 4 violet look and halo, the merge moment and its chime, the Auto merge button, the forms a grade
draws (`formOf`, including the treant's three looks) and every hp and attack step. In the Calamity, where heroes rise a tier by level
(`promoteByLevel`), the tier is stats only too.

### What replaces their power: stats only

The owner's words are that ranks "don't need upgraded skills", and skills now grow by use (section 5), so a rank is **a bigger body and
nothing else**. The tier skills were worth something, so the stat step grows to make up for it:

| | Grade 1 | Grade 2 | Grade 3 | Grade 4 |
| --- | --- | --- | --- | --- |
| `GRADE_BOOST` now (hp and attack) | x1 | x1.3 | x1.6 | x2.4 |
| **Starting point** | x1 | **x1.35** | **x1.75** | **x2.65** |

Why about that much: the tier skills' measured worth was 2 to 6 points of a party's wins at level 1 and about 2 at level 30
([tier-promises.md](tier-promises.md), [rank4-skills.md](rank4-skills.md)); about 5% more hp and attack a grade buys back that much in
the hero table. The build measures it (section 8) and sets `GRADE_BOOST` so a party of each grade wins what it wins now, within 2 points.

**Who moves most.** The heroes whose tier skill was the big step lose most at grades 3 and 4, before the retune: the Werewolf, Gunslinger,
Mercenary, Ninja Monk, Yamabushi Tengu, Kunoichi and Buccaneer (each +8 to +17 points of wins from tier 3 to tier 4 at level 1). The
outliers the tier skills made (the Knight and the Tyrant at grade 4, level 1) come back into line. Two summons the tiers gave move to skill
levels: the Beastmaster's dire wolf (tier 3, Pack Leader) and the Druid's second treant (tier 2, Grove), at Summon Beast's and Conjure
Treant's Level 5 (section 5).

---

## 5. Skill levels by use

### What counts as use

Every skill a hero has (its own three, a learned one in a slot, and the ultimate: see open question 2) earns **use points**:

- **A cast:** points equal to the skill's cooldown in whole seconds (a 3 s jab 3, a 16 s utility 16; the ultimate 30; a revive face 30,
  counted for skill 2). So a skill used whenever it is ready earns about the same in a minute of fighting whatever its class, and a quick
  jab does not race ahead of a big utility.
- **Fielding the hero:** every wave the hero fights in (placed when the wave settles, won or lost) gives each of its **open** skills 2
  points, cast or not. A guard that rarely fires still grows, and so does a skill held back by a teammate's (the owner's "usage of the
  character").
- **Auto-replay** counts half, as the books design's wear does; every other mode counts in full: the armies, the daily, the Last Stand,
  the spire, the Calamity, quest battles.
- It is counted when the wave settles, from the fight's `skill` events and its placed heroes, in the same step as XP and study. The
  renderer never writes it.

A skill used whenever it is ready earns about 20 points a wave of 25 s (with the 2 for fielding).

### The levels

| Level | Use points | Strength | Cost | Cooldown | Durations | About (waves fought with it) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | | | | | |
| 2 | 200 | +8% | | | | 10 (an army run) |
| 3 | 600 | +15% | 10% less | | | 30 (three runs) |
| 4 | 1,500 | +22% | 10% less | 10% shorter | +15% | 75 (eight runs) |
| 5 | 3,500 | +30% | 15% less | 15% shorter | +25%, and its **Level 5 step** | 175 (eighteen runs) |

- **Strength** is the skill's `tune` (its damage, healing and what it calls up). **Durations** are its holds, stuns, slows, shields,
  hastes, walls, auras, and its summons' and shapes' timers (section 6): what `durOf` already lengthens for the `dur` talent.
- **The Level 5 step**, one per skill (`Slot.lv5`), by a rule rather than 135 new designs: a skill that makes several things makes **one
  more** (a volley, a shot, a trap, a wisp, a jump, a wolf: the `extra` the tier skills used); a skill that reaches makes **a tile more
  reach**; any other lasts **15% longer again**. Two are named: **Summon Beast** at Level 3 lets three wolves stand (two now), and at
  Level 5 a dire wolf answers each call beside the wolf (the tier 3 Pack Leader, moved here); **Conjure Treant** at Level 5 lets a second
  treant stand (the tier 2 Grove, moved here).
- **The ultimate** (if it levels, open question 2): the strength column, and its meter fills 5% faster at Level 4 and 10% at Level 5. It
  has no cost or cooldown to cut.
- **The top is Level 5.** Points stop counting there (kept at 3,500) and the skill shows "Mastered".

### In a fight

The levels reach the fight the way talents do, but for one skill: when a wave's fighters are built, each slot's level comes in with the
hero's boost (`Boost.skillLv`, read from `Meta` as the hero's lasting level is), and the slot is built with its strength, cost, cooldown and
Level 5 step. While that skill is being cast, its duration and `extra` bonuses sit on top of the hero's talents (`castMods`, cleared when
the cast ends), so the engines that read `tal(me, 'dur')` and `tal(me, 'extra')` need no change. A level gained during a run takes effect
from the next wave, as XP does.

### Where it shows

- **The fight's chips:** the icon's rim is bronze at Level 3, silver at 4 and gold at 5 (no extra text on a small chip).
- **The skill sheet and the unit card:** "Level 3 · 212 of 600 to Level 4", and a short "Skill level" list of the five levels, the
  current one marked, in place of the tier lines. The books' painted mastery stars (`study/mastery-1..3`) are the badges for 3, 4 and 5.
- **The hero sheet's Skills tab:** each skill with its level and a thin bar to the next.
- **The wave card and the end recap:** "Iaido reached Level 3" (one line each, after the level-ups, as the study lines are in the books
  design).

### Skill books share it

The books design's mastery (ranks 1 to 3 at 30 and 100 casts, for learned skills only) is **replaced** by these levels, for every skill:

- A learned skill levels exactly as an own skill does, kept per hero kind under the skill's key: a Barbarian's Whirlwind and a Samurai's
  learned Whirlwind each have their own level.
- The loadout gets three slots (`Meta.loadout[kind] = [slot1, slot2, slot3]`; the books are not built yet, so it is three from the start).
  Any known skill can sit in any open slot; slot 3 opens at level 20. A skill keeps its level when it moves between slots.
- A skill keeps its class wherever it sits (Whirlwind is a Strike in any slot), so the class rules hold for every loadout.
- The revive face stays tied to the healer's own skill 2, as the books design says.
- The books' balance rule stands: a book skill at Level 1 sits in the band; a lost technique up to 2 points above.

---

## 6. Summons and shapeshifts on a timer

### The rules

- **A summon or a shape has a timer of fighting time.** It runs while a fight runs and **pauses between waves** (the deploy phase, the
  wave card, events and the market). In the Last Stand, whose waves are one long fight, it simply runs on.
- **It carries from wave to wave** with what is left of its timer and its health (a share), kept on the run's hero (`Owned.summons`,
  `Owned.form`). At the next wave's start, before the first tick, a summon stands on the free tile beside its caller nearest the foes (the
  `callSummon` tile rule), and a shape is put back on its hero (look, stats, rules).
- **What ends it:** the timer running out; a summon falling; its hero falling (a shape ends at once; a summon fights on to the wave's end
  but does not carry); its caller not fielded in the next wave (benched, recycled or merged away: its summons and shape are dismissed); the
  run's end. A revived hero rises in its own shape.
- **A merge:** the hero that stays (the target) keeps its own summons and shape; the one merged into it brings none.
- **Its skill and its timer:** summon and shape skills are Utilities, so their cooldowns (14 to 20 s) are shorter than their timers. The
  AI does not cast one again while its summons are at their cap and each has more than a quarter of its time left, or while the shape has
  more than a quarter left (the Werewolf may still switch forms, as now). Casting again renews the timer.
- **Skill levels lengthen it:** +15% at Level 4, +25% at Level 5 (section 5), and the `dur` talent as now.

### The timers

| Who | What | Now | **New** | Carries? |
| --- | --- | --- | --- | --- |
| Druid, Conjure Treant | a treant (one at a time) | the wave | **60 s** | yes |
| Druid, Wall of Thorns (ultimate) | two treants | the wave | **30 s** | yes |
| Beastmaster, Summon Beast | a wolf (two at most) | the wave | **60 s** | yes |
| Beastmaster, Pack Tactics with no wolf | a wolf | the wave | **60 s** | yes |
| Beastmaster, Conjure Animals (ultimate) | four wolves | the wave | **30 s** | yes |
| Reaper, Animate Dead | a wraith | 8 s | **20 s** | yes |
| Reaper, Harvest of Souls (ultimate) | wraiths | 5 s | **12 s** | yes |
| Samurai Commander, Plant the Standard | the standard | 10 s | **30 s** | yes (planted again beside him) |
| Illusionist, the decoys | decoys | 3 to 5 s | unchanged | no (open question 5) |
| Werewolf, Shapechange | the Hunter or the Brute | the wave | **40 s** | yes |
| Druid, Wild Shape | the treant form | 6 s | **20 s** | yes |
| Kitsune, Alter Self | a foe's shape | 5 s | **15 s** | yes (the borrowed looks, reach and attack stay, even if that foe is gone) |
| Werewolf, Full Moon (ultimate) | both forms | 7 s | **15 s** | yes |
| Demon Swordsman, Metamorphosis (ultimate) | the demon form | 7 s | **15 s** | yes |

A typical army wave is 20 to 30 s, so a wolf or a treant lasts about two to three waves, a wraith and the shapes most of one wave and into
the next. The ultimates' longer forms are paid for in the retune (their `power`), so an ultimate stays as strong as it is now overall.

**If another worker builds this first**, its numbers stand and this design adopts them; what matters here is that summon and shape
skills are Utilities with cooldowns shorter than their timers, that levels lengthen the timers, and that the AI waits while a summon or
shape has most of its time left.

---

## 7. The HUD, the skill sheet and the unit card

### A full row (a party of five or fewer), at 393 px

The panel is 377 px inside its padding. Today a row is the portrait (34 px), the name and bars (0.92 parts) and two chips (2.08 parts).
With three chips:

```
| portrait | Kenji          | [icon Iaido ] [icon Riposte] [icon Kesa   ] |
|   34px   | 1419/1978 (hp) [  24 SP     ] [  20 SP      ] [  9 SP     ] |
|          | 48/60 SP       |  (each chip about 79 px; the sweep and the pay line as now)  |
```

- **Columns:** 34 px, then 0.8 parts for the name and bars (about 88 px at 393, 78 at 360: "1978/1978" and "48/100 MP" fit), then 2.2
  parts for **three chips** with 3 px gaps (about 79 px each at 393, 71 at 360, 82 at 412).
- **A chip:** the element edge, a **14 px** icon (18 now), the skill's **chip name** over its cost ("24 SP"; "+10% HP" moves to the
  sheet). The cooldown's seconds leave the chip's text (the sweep shows it; the sheet gives the number). A locked chip says "Lv 20".
- **Chip names:** a chip has room for about 8 letters at 360 px, so every skill gets a short `chip` name, one word and unique within its
  kit: Shield Wall "Wall", Shield Rush "Rush", Hold Fast "Hold"; Aura of Protection "Aura"; Irresistible Dance "Dance"; Plant the Standard
  "Standard". Short names (Iaido, Volley) stay whole. A test checks every chip name is at most 8 letters and unique in its kit.
- The row's height (38 px), the ultimate's pearl, the portrait's TAP and the cast banner are as now.

### Compact rows (a party over five: the Last Stand's eight, a Calamity's ten)

Two columns of rows, as now (about 187 px each at 393). The chips' column widens from 40 to **44 px** and holds **three chips stacked,
each 12 px high** with 1 px between (36 of the row's 38 px): the element edge and the cost number (12 px text, the game's smallest), the
cooldown sweep across it, the number red while the pool cannot pay. The icon goes in compact (it is in the sheet). A locked chip says "L20".
The name and bars keep about 107 px.

### The skill sheet (a tap on a chip) and the unit card (hold a unit between waves)

- **Four tabs:** Skill 1, Skill 2, Skill 3, Ultimate (about 90 px each at 393).
- **Rows:** Class ("Jab: cheap and quick"), Cost, Cooldown, Strength, Cast time, **Level** ("Level 3 · 212 of 600 to Level 4"), and the
  revive face as now. The tier lines are replaced by the **Skill level** list (section 5).
- **The unit card** ([unit-info.md](unit-info.md)) reads the same sheets: Skill 3 is listed, locked below level 20 ("Opens at level 20").
- **The hero sheet and the codex** list three skills and the ultimate; the "Tier 2, 3, 4" lines go.
- Every screen is checked at 393x852, 360x780 and 412x915, with the Last Stand's eight and a Calamity's ten for the compact rows.

---

## 8. The balance plan

### Measure before anything moves

On main, with the game's own seeded tools, recorded in the build's note:

| What | Tool |
| --- | --- |
| Parity at levels 1, 10, 20 (new) and 30 | `node tools/kits/tune.mjs` (12,000 fights a level; all 45 heroes); `npm run balance -- --heroes-only --hero-level 20 --hero-stage S` to find a stage for 20 where a team wins about half |
| Each grade | `npm run balance -- --heroes-only --hero-grade 2/3/4 --hero-stage S [--hero-level 30]` at tier-promises' stages |
| The armies | `SAVES=32 node tools/curve/run.mjs cell ...`, `node tools/merge-two/run.mjs` cells and `tools/army-pace` |
| The daily | `npm run daily-rate` |
| The Calamity | `node tools/balance.mjs --no-tables --calamity --attempts 150` |
| The Last Stand | `npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 60` |
| The spire | merge-two's `spire:none` and `spire:max` cells |
| Fight length, sim speed | the sweep's mean fight time; time per fight |
| Pool income | `tools/skills/income.mjs` (new): each hero's SP or MP a second at levels 10, 20 and 30 |

New switches for the tools: `--skill-level N` (every skill at level N), `--mastery auto` (each hero's skills at the level expected for its
hero level: about Level 1 at hero level 1 to 10, 2 at 20 to 30, 3 at 60, 4 at 100, from the pace in section 5) and `--no-skill3`.

### The targets

- **Every hero within 6 points of the roster average** (the current band; aim for 4) at levels 1, 10, 20 and 30, with every skill at
  Level 1, and again at level 30 with every skill at Level 5. Parity is about the kits; skill levels lift every hero alike.
- **Each grade:** a party of grade 2, 3 and 4 wins within 2 points of what it wins now at the same stages (`GRADE_BOOST` answers it).
- **The modes** where they are now: each army's tries at its level within a step; the daily in 66 to 75%; the Calamity's map shares; the
  Last Stand's mean wave at each level; the spire's median floor and first boss.
- **Fight length within 10%** of now, and the sim no more than 5% slower a fight.

### How the balance moves, and what answers it

1. **Cooldowns by class** change each hero's cadence: the stamina heroes' strikes come less often (3 s gaps become 5 to 9 s) but cost less,
   and their kits' demand is set by rule 3. Answer: each skill's `tune` (`TUNE1`, `TUNE2`), then the pool's `PACE`.
2. **No tier skills:** grade 2 to 4 parties lose the skill step. Answer: `GRADE_BOOST`, then the heroes whose step was biggest.
3. **The third skill** adds a move from level 20. Answer: `TUNE3`, starting low (jabs x0.5 to x0.9), and `SKILL3_PACE`; if the roster as a
   whole has moved, the armies' `start`, `CAL_SCALE` and `DAILY_START` (as COMBAT-002 did), last.
4. **Skill levels** add up to +30% skill strength over many runs, in place of the tier skills' in-run lift. The armies' later tiers were
   tuned with tier skills in play; `--mastery auto` measures them with the levels a player of that hero level would have, and the armies'
   knobs answer any gap.
5. **Summon and shape timers** make the summoners and shapeshifters stronger in runs (a wolf carried into the next wave). Answer: the
   summon skills' `tune` and the ultimates' `power`.

**What to tune first** (the RPG-SPELLS order, never by loosening a test): a skill's strength; then its cost and cooldown, within its class;
then its times and reach; the global knobs last.

### The identity fixtures

`test/spells-identity.test.ts` holds every mode and every hero at levels 1, 10 and 30 to a recorded hash. Batch 1 (below) must change no
fight. Each later batch re-records the scenarios it moves and says which in the test's header, as the RPG-SPELLS batches did.

---

## 9. Saves and determinism

### Saves (`legends.*`; every new field optional; the save version is not bumped)

- `Meta.skillUse?: Record<string, Record<string, number>>`: use points for each hero kind, under each skill's fixed key (so a renamed skill
  keeps its level).
- `Meta.loadout?` (the books design's, three slots from the start).
- On a run's hero: `Owned.summons?: { kind: string; hp: number; left: number }[]` (health share, ms of timer left) and `Owned.form?: { key:
  string; left: number; look?: string; borrowed?: { range: number; atk: number } }`.
- **Old saves:** no lasting tier progress exists (grades belong to runs), so nothing converts from tiers. A run saved mid-way loads as it
  is: its merged heroes keep their grades and fight with the new stat steps and no tier skill. A run saved before this has no summons or
  forms carried.
- **A veteran's head start** (open question 4): on the first load, each hero kind gets 10 use points a lasting level for each skill open
  at that level, at most 600 (Level 3). A level-30 hero starts its three skills at Level 2; a level-60 hero at Level 3. Nothing else is
  back-paid.
- Read functions drop nonsense: an unknown kind or key, points below 0 or above 3,500, a summon of an unknown kind, a timer below 0.

### Determinism

- Nothing here draws from any stream: the classes, cooldowns, the AI's order (a fixed order over the fight's state, ties by slot), skill
  levels (pure data from `Meta`), the timers and the carry (pure state on the run). The third skills' rolls, if any, use the battle's skill
  stream as every skill does; none of the 45 rolls.
- Use points are counted by a pure function of the settled fight (its placed heroes and `skill` events) and the mode (auto-replay half).
- The summons placed at a wave's start are placed by `callSummon`'s fixed tile order before the first tick.

---

## 10. What each part touches

| Part | New files | Hooks in shared files |
| --- | --- | --- |
| Classes and cooldowns | `src/sim/skillRules.ts` (the classes, the ranges, the breath, kit demand), `test/skill-rules.test.ts`, `tools/skills/income.mjs` | `heroKits.ts` (`Slot.cls`, `Slot.cd`, `HeroKit.slots`, `castHero` for N slots, `holding` made general, `RES.BREATH_MS`, the pool gaps gone), `kits/table.ts` (every slot's class, cost, cooldown), `kits/when.ts` |
| No tier skills | | `tierSkills.ts` (removed), `abilities.ts` (`began` no longer runs riders), `battle.ts` (`addUnit` no `applyTierMods`), `heroKits.ts` (`costOf` no discount), `run.ts` (`GRADE_BOOST`), `calamity.ts` (`CAL_TIER`), `render/fx.ts` (the banner's words), `menuHeroes.ts`, `codexView.ts`, `tools/balance.ts` (`--tier-cap` goes), `tools/rank4` |
| The third skills | `src/sim/kits/third.ts` (the 45 casts), `test/skill3.test.ts` | `kits/table.ts` (`TUNE3`, slot 3), `heroKits.ts` (`SKILL3_LEVEL`, `skill3Open`, `SKILL3_PACE`), the FX and sound tables keyed by skill (`signatures.ts`, `skillFx.ts`, `soundRules.ts`), `spellIcons.ts` |
| Skill levels | `src/sim/skillLevels.ts` (points, levels, the table, the head start), `test/skill-levels.test.ts` | `meta.ts` (`skillUse`), the settle functions (`modes.ts`, the Stand's, the Calamity's, the daily's, auto-replay, quest battles), `run.ts` (`boostOf`: `skillLv`), `battle.ts` (slots built with their level, `castMods`), `recapView.ts`, the books' `books.ts` when built |
| Timers and carry | `src/sim/carry.ts` (save and restore summons and shapes between waves), `test/summon-timers.test.ts` | `abilities.ts` (`callSummon` timers), `kits/blades.ts` (`shift`, `boundSoul`), `kits/casters.ts` (`treeform`), `kits/monsters.ts` (`alterSelf`), `kits/callers.ts`, `ultimates.ts`, `run.ts` (`Owned.summons`, `Owned.form`), `battle.ts` (placing them at a wave's start) |
| The page | | `fightHud.ts`, `fightHudRules.ts` (`chipOf` for 3, `sheetOf` with Skill 3, Class and Level), `fightHud.css`, `unitInfoRules.ts`, `menuHeroes.ts`, `codexView.ts`, `recapView.ts` |
| Records | `docs/notes/skills-*.md` (a note a batch) | `updates.ts` (the director's entry), `docs/TASKS.md` |

---

## 11. Build plan

Each batch is a branch of its own, measured and noted before the next; each runs `npm run typecheck`, the affected tests, the full
`npm test` and `npm run web`, and the page batches check 393x852, 360x780 and 412x915.

0. **Measure main** (no code): every row of section 8's table, into the first batch's note.
1. **The rules as data, no fight changed:** `Slot.cls`, `Slot.cd` set to today's gaps, `HeroKit.slots`, `castHero` for N slots with
   today's order kept, the breath at 0. The identity fixtures must not move. *Tests: identity; the AI picks as before.*
2. **Cooldowns and costs by class** (skills 1 and 2), the breath, the general holding rule; `TUNE1` and `TUNE2` re-tuned into the band at
   levels 1, 10 and 30; `PACE` if needed. *Tests: `skill-rules.test.ts`; parity.*
3. **Ranks stop upgrading skills:** tier skills and the discount off, `GRADE_BOOST` and `CAL_TIER` re-tuned to the grade targets, the
   banner, sheet and codex words. `tier-skills.test.ts` and the rank 4 tests are retired and replaced by "a grade changes hp and attack
   only" (the owner's new rule changes them; the note says so). *Tests: grade parity; the armies' late cells.*
4. **The third skills**, in three groups as RPG-SPELLS did (the tanks, melee and supports; the ranged, casters and healers; the summoners
   and monsters): `SKILL3_LEVEL`, the 45 casts, `TUNE3`, `SKILL3_PACE`, the `when` entries, effects and sounds reused, the list of
   paintings wanted. *Tests: each skill does what its row says; the AI casts it in its case; parity at 20 and 30.*
5. **Skill levels by use:** `Meta.skillUse`, counting at every settle, the levels in the fight, the Level 5 steps, the head start, the
   wave card and recap lines, the tools' `--skill-level` and `--mastery auto`. *Tests: counting by mode, auto half, levels, the head
   start, a Level 1 fight hashes as batch 4.*
6. **Summon and shape timers and the carry** (or adopt another worker's build): the timers, `Owned.summons` and `Owned.form`, placing at a
   wave's start, the ends. *Tests: a wolf carried into wave 2 with its health and time; benched callers' summons dismissed; the Stand runs
   on.*
7. **The page:** three chips, the compact strip, chip names, the sheet's tabs and rows, the unit card, hero sheet, codex. *Shots at three
   sizes, fives and eights and tens.*
8. **The full rebalance:** every mode measured together against batch 0; the global knobs last.
9. **The books** (when they are built): three slots and these levels in place of their mastery.

---

## 12. Open questions

1. **Skill 3 at level 20?** *Recommended: yes*, halfway between skill 2 (10) and the ultimate (30), and inside the runs' level cap of 30.
2. **Does the ultimate level by use too?** *Recommended: yes*, the same five levels (30 points a cast and 2 a wave), stronger and its meter
   a little faster, so all four moves grow the same way.
3. **What a rank gives now.** *Recommended: hp and attack only, with `GRADE_BOOST` raised to about [1, 1.35, 1.75, 2.65]* and measured.
   The other way would be a small rank perk that is not a skill (say, a fuller pool at the start of each wave), which blurs the line
   between ranks and skills the owner drew.
4. **A veteran's head start.** *Recommended: yes, 10 use points a lasting level for each open skill, up to Level 3*, so a level-60 hero
   does not start at Level 1 beside a fresh one. Without it every save starts every skill at Level 1.
5. **The Illusionist's decoys.** *Recommended: they stay short and do not carry*: they are a dodge, not a fighter, and a decoy lasting a
   minute would make her the best tank in the game.
6. **Skill levels in the spire and the Calamity**, whose hero levels reset each run. *Recommended: the lasting skill levels apply there
   too*, as talents and gear do; the modes' scales answer it in the rebalance.

---

## Checks for this design

Documentation only: no game code changed, so no tests or builds were run. The links were checked, the 135 skills' starting numbers were
checked against section 3's rules by a script (each in its class's ranges, every jab under its pool's income, every kit's demand between
1.4 and 3.5), and the third skills' names against the skill keys, talents, gear abilities and foes in the code.
