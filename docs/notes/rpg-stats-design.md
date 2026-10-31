# Six ability scores for the heroes, D&D style (design)

> **A design for the owner to approve.** No game code has changed. The numbers are a first tuning that follows the rules below; each is
> measured and moved in the build (section 10). The open questions are at the end, each with a recommended answer.

The owner's asks:

1. "I want the heroes to have more stats than just damage and health. I want RPG stats that actually impact their strengths, weaknesses
   and play, and level up in a way that makes sense."
2. "Think D&D for stats."

So this design gives every hero the **six D&D ability scores** (Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma), with
D&D's shape: scores of 8 to 17 to start, set by the hero's calling; a **modifier** from each score that drives the fight's numbers; a
**proficiency bonus** that grows with level; **Armour Class**, attack rolls and **saving throws**; and growth by **ability score
improvements** at set levels, with bigger steps from ranks and awakening. All of it is adapted to a real-time auto-battler that runs to
level 100.

## In short

- **Six scores, one modifier each.** The modifier is D&D's: (score − 10) ÷ 2, rounded down, so 8 is −1, 10 is +0, 17 is +3, 20 is +5
  and 24 is +7. Every effect below is "so much per point of modifier" ([section 2](#2-the-six-scores-and-the-modifier)).
- **Each score changes how a hero plays** ([section 3](#3-what-each-score-does-in-a-fight)): STR hits harder in melee, shoves further,
  resists shoves and climbs higher; DEX hits harder at range and with light blades, raises Armour Class, acts first, swings faster and
  crits more; CON adds health and stamina and resists poison, bleeding, burning and stuns; INT powers arcane spells and makes every skill
  come round sooner; WIS powers divine and nature magic (most healing), sees through cover and smoke, and resists fear and charms; CHA
  powers bards, warlocks, sorcerers and paladins, the summons and banners they call, and fills the ultimate faster.
- **Blows roll a d20 against Armour Class** ([section 3.2](#32-the-blow-a-d20-against-armour-class)): a hit, a *glancing* blow (half),
  a miss, or a natural 20's crit. Armour (today's `def`) still soaks, so the tanks keep their shape.
- **Ailments and blasts allow a saving throw** ([section 3.3](#33-saving-throws)): d20 + the save against the caster's skill DC; a save
  halves it. The bosses' hard-control ladder becomes their **Legendary Resistance**.
- **All 45 heroes get a profile** ([section 4](#4-every-heros-profile)): the D&D standard array (15, 14, 13, 12, 10, 8) plus +2 and +1
  from their calling, so every hero's scores add up to the same 75: **no hero is richer than another**, they differ in shape. A mage is
  clever and frail; a tank is tough and slow; a rogue is quick and shoved about.
- **Levelling like D&D** ([section 5](#5-levelling)): an ability score improvement (+2) at levels 4, 8, 12, 16 and 20, and an epic boon
  (+1, past 20) at level 30 and at each deep milestone (40 to 100). Growth follows the calling, fixed, with no random variance. Ranks,
  grades, awakening, talents and gear add score points too ([section 6](#6-ranks-awakening-talents-gear-traits-and-the-rest)).
- **Today's numbers are each hero's level 1.** The scores are fitted so that every hero's health, attack, defence and speed at level 1,
  rank 1, are exactly what they are now. What is new is what the scores add as heroes grow, and the new rules (AC, saves, crits,
  initiative, pools).
- **Skills scale with an ability** ([section 7](#7-skills-and-stats)): weapon skills with the hero's blow ability (STR or DEX), spells,
  heals, summons and songs with its casting ability, breath and bile with CON. It fits the skills overhaul's classes and levels.
- **Shown on the hero sheet, the unit card, the level-up recap and the gear compare** ([section 8](#8-where-the-player-sees-them)).
- **Built after the skills overhaul's batches 2 to 5, before its full rebalance**, so one rebalance covers both
  ([section 11](#11-order-with-the-skills-overhaul)). No save version bump: scores are worked out from what a save already holds.

Contents:

1. [What the game does now](#1-what-the-game-does-now)
2. [The six scores and the modifier](#2-the-six-scores-and-the-modifier)
3. [What each score does in a fight](#3-what-each-score-does-in-a-fight)
4. [Every hero's profile](#4-every-heros-profile)
5. [Levelling](#5-levelling)
6. [Ranks, awakening, talents, gear, traits and the rest](#6-ranks-awakening-talents-gear-traits-and-the-rest)
7. [Skills and stats](#7-skills-and-stats)
8. [Where the player sees them](#8-where-the-player-sees-them)
9. [Foes](#9-foes)
10. [The balance plan](#10-the-balance-plan)
11. [Order with the skills overhaul](#11-order-with-the-skills-overhaul)
12. [Saves and determinism](#12-saves-and-determinism)
13. [What each part touches](#13-what-each-part-touches)
14. [Build plan](#14-build-plan)
15. [Open questions](#15-open-questions)

---

## 1. What the game does now

- **A hero kind** (`UnitDef` in `src/sim/units.ts`) has `hp`, `atk`, `def`, `range`, `moveMs` (a step), `atkMs` (between blows), `jump`
  (steps it can climb), and `shot`, `splash` or `flies`. The 45 heroes run from 135 to 350 health, 11 to 40 attack and 2 to 10 defence.
- **A blow** (`swing` in `src/sim/battle.ts`): attack minus the target's defence (at least 1), times the height and angle (`blowMult`:
  +15% a level above, x1.25 from the side, x1.5 from behind), the footing (`guardMult`), a crit and a roll of 0.9 to 1.1. Every blow lands
  unless a dodge share (a kit passive, a trait, gear, tall grass's 12%) turns it aside. Crits come only from kit passives, traits and
  gear (`rollCrit`).
- **Levels** (`src/sim/levels.ts`; [levels.md](levels.md), [level-100.md](level-100.md)) multiply hp and attack only: x3.0 and x2.6 at
  level 10, x4.9 and x4.2 at 30, x7.9 and x6.7 at 100 (`lastingBoost`). A run's own levels (the spire, the Calamity) stop at 30. The
  JRPG recap's "level up" shows HP and ATK, old and new ([jrpg-recap.md](jrpg-recap.md)).
- **Ranks** (shards, `RANK_MULT` 1.08 a rank, `src/sim/meta.ts`), **grades** (merging in a run, `GRADE_BOOST`, to become x1.35, x1.75,
  x2.65 under the skills overhaul; [merge-two.md](merge-two.md)) and **awakening** (`AWAKEN_MULT` 1.08 a step, and a passive) multiply hp
  and attack too.
- **Talents** ([talents.md](talents.md)): four tier-1 "stat nodes" a hero (+hp, +attack, +1 defence, crit, dodge, speed, skill charge,
  regen), then skill changes and capstones. **Gear** ([shop-books-gear.md](shop-books-gear.md)): three pieces, main stats as shares
  (attack, hp, defence, speeds, crit, dodge, charge, regen, resist), an ability from Epic up; gear wears and breaks. **Traits**
  ([synergies.md](synergies.md)): team bonuses (attack, hp, guard, dodge, crit, speed, charge).
- **Ailments** ([status-fx.md](status-fx.md)): eleven of them; resistance is by kind only (`resistOf`: fire things shrug off burning,
  the undead and machines poison, bleeding and fear), and the bosses have a hard-control ladder.
- **Pools** ([hero-kits.md](hero-kits.md)): stamina (60) or mana (100), the same for every hero of that pool; the Barbarian and the Demon
  Swordsman also pay health.
- **The cards** show Attack, Defence, Range, Blows, Walk, Climb, and Crit and Dodge where a hero has them (`statRows` in
  `src/unitInfoRules.ts`); the hero sheet shows HP, Attack, Defence and Range (`src/menuHeroes.ts`).

So a hero today is two numbers that grow (health and attack) and a handful that never do. Two heroes of the same role differ only in
size, and a level makes every hero more of the same.

---

## 2. The six scores and the modifier

### The scores

| Score | Short | In a word | What it is in this game |
| --- | --- | --- | --- |
| **Strength** | STR | Might | Melee power, shoving and holding, climbing |
| **Dexterity** | DEX | Finesse | Ranged and light-blade power, Armour Class, acting first, swinging fast, crits |
| **Constitution** | CON | Toughness | Health, stamina, shrugging off poison, bleeding, burning and stuns |
| **Intelligence** | INT | Wits | Arcane spells, skills that come round sooner, seeing through illusions |
| **Wisdom** | WIS | Insight | Divine and nature magic (most healing), seeing through cover and smoke, a strong will |
| **Charisma** | CHA | Presence | Bards, warlocks, sorcerers and paladins; summons, banners and songs; a faster ultimate |

### The modifier

As in D&D: **modifier = (score − 10) ÷ 2, rounded down.** Every rule below reads the modifier, never the score, so an odd score is half a
step towards the next.

| Score | 6–7 | 8–9 | 10–11 | 12–13 | 14–15 | 16–17 | 18–19 | 20–21 | 22–23 | 24–25 | 26–27 | 28–29 | 30 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Modifier | −2 | −1 | +0 | +1 | +2 | +3 | +4 | +5 | +6 | +7 | +8 | +9 | +10 |

A hero starts with scores of 8 to 17. Levels lift its best scores to 20 by level 20 and its primary to 24 by level 100; ranks, awakening,
talents and gear add a few more. **30 is the most any score can be.**

### The proficiency bonus

D&D's proficiency bonus grows with level and is added to attack rolls, skill DCs and the saves a calling is trained in. Stretched over
100 levels:

| Hero level | 1–9 | 10–19 | 20–29 | 30–49 | 50–79 | 80–100 |
| --- | --- | --- | --- | --- | --- | --- |
| Proficiency | +2 | +3 | +4 | +5 | +6 | +7 |

The steps sit on the moments that already matter: skill 2 at 10, skill 3 at 20, the ultimate at 30, and the deep milestones. A run's own
level (the spire and the Calamity, to 30) uses the same table. Foes take theirs from the army's tier ([section 9](#9-foes)).

### Today's numbers are each hero's level 1

The heroes have been balanced for months, and their numbers already read like scores (the Knight's 300 health is a CON 17 body; the
Gunslinger's 40 attack a DEX 17 eye). So the build **fits** each hero's hidden body numbers to its scores, so that at level 1, rank 1,
with nothing worn, its health, attack, defence, blow time and step time come out exactly as now:

- **Body attack** = today's `atk` ÷ (1 + 5% × its blow ability's level-1 modifier); **body health** = today's `hp` ÷ (1 + 5% × its
  level-1 CON modifier); the blow time likewise from DEX.
- In a fight, attack = body attack × the level curve × the rank and grade × (1 + 5% × the modifier it has now) × gear. At level 1 that is
  today's number; from there each point of modifier the hero gains shows.

What *is* new at level 1 is what today's game has no number for: Armour Class, the to-hit roll, saves, the crit from DEX, initiative, and
pools that differ by hero. Those are measured and tuned in section 10.

---

## 3. What each score does in a fight

### 3.1 Each score, in numbers

"Its power" means: its blows if it is the hero's **blow ability**, and its skills if it is the skill's ability (section 7). Each line is
per point of modifier (+1), and the same rule loses the same for a −1.

| Score | Power (when it is the ability) | What every hero gets from it | How it changes play |
| --- | --- | --- | --- |
| **STR** | +5% blow and skill damage | **Shove and hold:** a shove or pull moves a foe one tile further when the shover's STR modifier is 2 or more above the target's, and one tile less (to none) when 2 or more below; holds and binds (the Mummy's strings, the Kraken's drag, Thorn Whip) are STR saves. **Athletics:** at STR +4 or more it climbs one step higher (`jump` +1), so it can reach and strike a foe one level further up. | The brutes shove foes off ledges and into walls and are not shoved themselves; at STR 18 the Werewolf and Minotaur climb to archers they could not reach before. A STR 8 Kunoichi is thrown about. |
| **DEX** | +5% blow and skill damage | **Armour Class** + DEX (capped by armour, 3.2). **Initiative:** d20 + DEX at the fight's start sets who acts first (up to about 0.6 s apart). **Quick hands:** blows 2% faster. **Keen:** +1% crit chance (from +1 up; a natural 20 always crits). **DEX saves** against blasts, breath, kegs, traps and caltrops halve them. | Quick heroes strike first, swing more often and crit more; they are hard to hit in light armour and duck half a fireball. DEX 8 tanks are slow to act and caught by every blast. |
| **CON** | +5% for body skills (a breath, bile) | **Health** +5%. **Stamina** (stamina heroes): +3 SP to the pool's top and 4% faster refill. **CON saves** against poison, bleeding, burning, rot, chill, freezing, shock and stuns. | The tough stay up, keep casting their stamina skills and shake off damage over time; frail casters burn and bleed for the full time. |
| **INT** | +5% arcane spell damage (and an INT caster's heals and wards) | **Quick wits:** every skill's cooldown 2% shorter (at most 10% either way). **Mana** (an INT caster): +5 MP to the top and 4% faster refill. **INT saves** against illusions (being fooled by a decoy, Phantasmal Blade's wild swing, a swap), and silence. | The clever cast more often; a dim brute's skills come round a little slower. A sharp foe is not fooled by the Illusionist's decoys for long. |
| **WIS** | +5% divine and nature spells, so most healing (the Cleric, the High Priestess, the Druid, the Mummy) | **Perception:** the misses it suffers from cover (tall grass), smoke, ink and sand are 10% less likely a point (so WIS +3 sees through 30% of them). **Mana** (a WIS caster) as INT's. **WIS saves** against fear, charm, slow and blinding misses. | The wise heal more, are not panicked or charmed for long, and are not fooled by a Kunoichi's smoke. The WIS 8 Satyr is easily frightened. |
| **CHA** | +5% for CHA casters: bards, warlocks, sorcerers, paladins; and for every summon, banner, song and aura (their strength, and a summon's health and attack) | **Inspiration:** the ultimate's meter fills 3% faster. **Mana** (a CHA caster) as INT's. **CHA saves** against curses and drains (a stolen meter, a siphoned pool, the Tyrant's condemnation). | The leaders' standards, songs and wolves hit harder and their ultimates come sooner; a CHA 8 hero waits longest for its ultimate. |

**What stays a body stat, not a score** (as in D&D, where speed and size belong to the creature): walking speed (`moveMs`), range, flying,
size, and **elemental resistances** (fire things shrug off burning, the undead and machines poison and bleeding: `resistOf`, unchanged).
Speed was never an ability score in D&D, so DEX makes a hero quick to act and to swing, not to walk.

**Not added, and why:** *Luck* (D&D has no Luck score; the natural 20 is its luck), and *threat* (D&D has no threat stat; the taunts stay
skills, and a high AC is what makes a tank live under the blows it draws).

### 3.2 The blow: a d20 against Armour Class

Every ordinary blow rolls **d20 + to hit** against the target's **Armour Class**:

- **To hit** = proficiency + the blow ability's modifier (+4 or +5 for most heroes at level 1, +11 to +14 for most at level 100).
- **Armour Class (AC)** by the armour the calling wears:

| Armour | AC | Who wears it |
| --- | --- | --- |
| Heavy (plate, plating) | 16, no DEX | Knight, Minotaur, Samurai Commander, Paladin, Lancer, Siege Bot, Queen Dragoon, Juggernaut, Tyrant |
| Medium (mail, lamellar, wraps) | 13 + DEX (at most +2) | Samurai, Peasant, Cleric, Rifle Bot, Mummy, Kraken Mate, Arc Blade, Dread Pirate, High Priestess, Demon Swordsman |
| Light (leathers) | 11 + DEX | the rogues, rangers, shooters, the Druid, Satyr, Gorgon, Kitsune, Wolf Bard, Beastmaster, Reaper |
| Robes | 10 + DEX | Fire Wizard, Lightning Mage, Warlock, Illusionist, Time Witch, Great Sage |
| Unarmoured, monk | 10 + DEX + WIS | Ninja Monk, Yamabushi Tengu |
| Unarmoured, brute | 10 + DEX + CON | Werewolf, Barbarian, Shambler |

  Gear, talents and traits add to it (section 6). Height counts as cover: a target on higher ground has +1 AC a level (to three; this
  replaces `guardMult`'s 3% a level).

- **The result** (adapted so a real-time fight does not stall on misses):

| The d20 + to hit | Result |
| --- | --- |
| A natural 20 | **Crit** (it always hits): x1.5, or the hero's own crit size |
| Meets or beats the AC | **Hit**: full damage (and a DEX crit chance on top) |
| Misses by 1 to 5 | **Glancing blow**: half damage |
| Misses by 6 or more, or a natural 1 | **Miss** (the "Dodge" pop) |

What it means in odds, for the number the d20 needs (AC − to hit):

| Needs | 6 (a sure hand) | 8 (a fair match) | 10 | 12 | 14 (a wall) |
| --- | --- | --- | --- | --- | --- |
| Hit / glance / miss | 75 / 20 / 5% | 65 / 25 / 10% | 55 / 25 / 20% | 45 / 25 / 30% | 35 / 25 / 40% |
| Damage on average | 85% | 78% | 68% | 58% | 48% |

A level-1 hero (+5) against an ordinary foe (AC 13) needs 8; an ordinary foe (+5) needs 11 against the Knight (AC 16) and 7 against the
Fire Wizard (AC 12). One global knob (`BLOW_SCALE`, about x1.28) puts the average blow back where it is now, so fights keep their length.

- **Armour still soaks.** Today's defence stays as **Armour** (`def`, now called Armour on the cards): it comes off every blow that lands,
  as now. AC decides whether a blow lands; Armour how much of it gets through. That keeps the tanks' shape at low levels, and AC keeps
  them standing at high levels, where today's flat defence fades to nothing against x6 attack.
- **What does not roll.** Skills never miss (they are paid for in pool and cooldown); their riders and blasts allow saves instead
  (3.3). Damage over time, terrain and the Eidolons' strike do not roll. The old dodge shares (a kit's, a trait's, gear's) become AC: each
  5% is +1 AC. Tall grass is cover: +2 AC (in place of its 12% dodge).

### 3.3 Saving throws

When a skill lays an ailment, a hold or a shove, or a blast lands on an area, the target makes a **saving throw**: d20 + the save's
modifier (+ proficiency if its calling is trained in that save) against the caster's **skill DC** = 8 + proficiency + the skill's ability
modifier. A DC is 11 to 13 at level 1, 19 to 22 at level 100.

| Save | Against |
| --- | --- |
| **STR** | shoves, pulls and drags; holds, binds and grapples; being weakened |
| **DEX** | blasts and areas (Wall of Fire, meteors, kegs, breath, splash), traps and caltrops |
| **CON** | poison, bleeding, burning, rot, chill and freezing, shock, stuns |
| **INT** | illusions (decoys, Phantasmal Blade, swaps), silence |
| **WIS** | fear, charm, slow, blinding (the misses of Dirty Trick, Ink Cloud, Sacred Flame) |
| **CHA** | curses, drains of meter or pool, condemnation and marks |

- **A save halves it**: half the damage of a blast, half the time of an ailment or hold, a shove one tile shorter. The pop shows
  **"Saved"** (and "Immune" stays for a real immunity, `resistOf`). Halving keeps control in the kits (a held foe is still held, for less
  long), as D&D's "half on a save" does.
- **Each calling is trained in two saves** (the hero tables), as D&D's classes are: the Knight in STR and CON, the Wizard in INT and WIS.
- **The bosses' ladder is their Legendary Resistance.** The boss rules stay as they are (a boss takes hard control for a share of the
  time and grows immune with each one in a window, `AIL.BOSS_SHARE`, `hardGate`), named so on the unit card: "Legendary Resistance: hard
  control fades faster, and three in a row it shrugs off".
- **Heroes save too**, against the foes' and bosses' ailments (the foes' DCs in section 9): a CON 20 Knight shakes off a skeleton's poison
  most of the time; a CON 12 Wizard rarely does.

### 3.4 The derived numbers a hero has

What the hero sheet and the unit card show (section 8), worked out from the scores, the level and what the hero wears:

| Number | From |
| --- | --- |
| Health | body health × level × rank and grade × (1 + 5% × CON mod) × gear |
| Attack | body attack × level × rank and grade × (1 + 5% × blow ability mod) × gear |
| Skill power | the same, with the skill's ability (section 7) |
| Armour (soak) | today's defence, plus gear and talents |
| Armour Class | by armour and DEX (3.2), plus gear, talents, traits |
| To hit | proficiency + blow ability mod |
| Skill DC | 8 + proficiency + casting ability mod |
| Crit | 5% (a natural 20) + DEX mod % + kit, trait and gear crit |
| Blows | `atkMs`, 2% faster a DEX mod (fitted to today at level 1) |
| Initiative | DEX mod (the d20 is rolled at the fight's start) |
| Saves | each mod, + proficiency in the calling's two |
| Pool | SP 60 + 3 × CON mod, or MP 100 + 5 × casting mod; refill 4% a point faster |
| Ultimate fill | 3% a CHA mod faster |
| Skill cooldowns | 2% a INT mod shorter |

---

## 4. Every hero's profile

### How the profiles were made

- **The D&D standard array plus a calling bonus.** Every hero has the scores **17, 15, 13, 12, 10 and 8**: the standard array (15, 14,
  13, 12, 10, 8) with +2 on its primary and +1 on its second, as a D&D character's background gives. So every hero's scores add up to
  **75**. No hero is better off; each is shaped differently. (A test checks all 45 are that set.)
- **The calling picks the order**, after the D&D class the hero most resembles. The rpg-spells design already drew its spells from D&D
  ([rpg-spells-design.md](rpg-spells-design.md)), so most callings were plain: the Wizard is an evoker, the Cleric a war cleric, the
  Ranger a ranger, the Warlock a warlock, the Demon Swordsman a hexblade (who strikes with CHA). The rest take the nearest: the Kitsune
  and the Gorgon are sorcerers, the machines constructs, the Shambler a ghoul, the Dragoon a dragon knight (her breath on CON, as a
  dragon's is in D&D).
- **The blow ability** is what its blows use: STR for heavy weapons, DEX for bows, guns and light blades (D&D's finesse), and the casting
  ability for heroes whose blows are spells (a wizard's Fire Bolt is an INT cantrip). **The casting ability** powers its spells, heals,
  summons and songs.
- **The weakness is a real 8.** Every hero has an 8 its levels never raise (section 5), so the weakness stays: the Wizard's STR, the
  Knight's DEX, the Satyr's WIS.
- **Balance is not done by moving scores.** The profiles are identity. Where a hero ends up too strong or weak, its skills' strength
  (`tune`) and its fitted body answer it (section 10).

In both tables, the primary (17) is in bold and the weakness (8) in italics.

### The scores at level 1

| Hero | Calling (nearest D&D class) | STR | DEX | CON | INT | WIS | CHA | Blows / casting | Armour | Saves trained |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Knight | Fighter (defender) | 15 | *8* | **17** | 10 | 13 | 12 | STR / STR | heavy | STR CON |
| Samurai | Fighter (kensei) | 15 | **17** | 13 | 10 | 12 | *8* | DEX / DEX | medium | DEX WIS |
| Kunoichi | Rogue (shadow) | *8* | **17** | 12 | 13 | 10 | 15 | DEX / DEX | light | DEX INT |
| Archer | Fighter (archer) | 12 | **17** | 13 | 10 | 15 | *8* | DEX / DEX | light | STR DEX |
| Fire Wizard | Wizard (evoker) | *8* | 15 | 12 | **17** | 13 | 10 | INT / INT | robes | INT WIS |
| Peasant | Fighter (militia) | 15 | 12 | **17** | *8* | 13 | 10 | STR / STR | medium | STR CON |
| Ninja Monk | Monk | 12 | **17** | 13 | 10 | 15 | *8* | DEX / WIS | monk | STR DEX |
| Wanderer | Artificer (alchemist) | *8* | 15 | 13 | **17** | 12 | 10 | INT / INT | light | CON INT |
| Lightning Mage | Sorcerer (storm) | *8* | 13 | 12 | 10 | 15 | **17** | CHA / CHA | robes | CON CHA |
| Kitsune | Sorcerer (fey) | *8* | 15 | 10 | 12 | 13 | **17** | CHA / CHA | light | DEX CHA |
| Karasu Tengu | Rogue (thief) | 12 | **17** | 13 | 15 | 10 | *8* | DEX / DEX | light | DEX INT |
| Yamabushi Tengu | Monk (mountain) | 13 | 12 | 15 | 10 | **17** | *8* | STR / WIS | monk | STR WIS |
| Werewolf | Barbarian (beast) | **17** | 13 | 15 | *8* | 12 | 10 | STR / STR | brute | STR CON |
| Minotaur | Barbarian (bull) | **17** | 10 | 15 | *8* | 12 | 13 | STR / STR | heavy | STR CON |
| Satyr | Bard (pipes) | 12 | 15 | 13 | 10 | *8* | **17** | DEX / CHA | light | DEX CHA |
| Gorgon | Sorcerer (gaze) | *8* | 15 | 13 | 10 | 12 | **17** | DEX / CHA | light | CON CHA |
| Samurai Commander | Fighter (banneret) | 15 | 10 | 13 | *8* | 12 | **17** | STR / CHA | heavy | STR CHA |
| Paladin | Paladin | 15 | *8* | 13 | 10 | 12 | **17** | STR / CHA | heavy | WIS CHA |
| Cleric | Cleric (war) | 13 | 10 | 15 | *8* | **17** | 12 | STR / WIS | medium | WIS CHA |
| Druid | Druid | *8* | 13 | 15 | 12 | **17** | 10 | WIS / WIS | light | INT WIS |
| Barbarian | Barbarian (berserker) | **17** | 13 | 15 | *8* | 12 | 10 | STR / STR | brute | STR CON |
| Ranger | Ranger (trapper) | 10 | **17** | 13 | 12 | 15 | *8* | DEX / WIS | light | STR DEX |
| Warlock | Warlock | *8* | 13 | 15 | 12 | 10 | **17** | CHA / CHA | robes | WIS CHA |
| Illusionist | Wizard (illusionist) | *8* | 15 | 12 | **17** | 10 | 13 | DEX / INT | robes | INT WIS |
| Gunslinger | Fighter (gunslinger) | *8* | **17** | 12 | 10 | 15 | 13 | DEX / DEX | light | DEX WIS |
| Shambler | Ghoul (corpse-eater) | 15 | 10 | **17** | *8* | 13 | 12 | STR / CON | brute | CON WIS |
| Rifle Bot | Construct (gunner) | 10 | **17** | 15 | 13 | 12 | *8* | DEX / DEX | medium | DEX CON |
| Mercenary | Rogue (bounty hunter) | 12 | **17** | 13 | 10 | 15 | *8* | DEX / DEX | light | DEX WIS |
| Mummy | Mummy lord (cleric) | 13 | *8* | 15 | 10 | **17** | 12 | STR / WIS | medium | CON WIS |
| Buccaneer | Rogue (swashbuckler) | 12 | **17** | 13 | *8* | 10 | 15 | DEX / DEX | light | DEX CHA |
| Wolf Bard | Bard (lore) | *8* | 13 | 15 | 10 | 12 | **17** | CHA / CHA | light | DEX CHA |
| Beastmaster | Ranger (beast master) | 10 | 13 | 12 | *8* | 15 | **17** | STR / CHA | light | STR WIS |
| Kraken Mate | Druid (tide), bulwark | 15 | 10 | **17** | *8* | 13 | 12 | STR / WIS | medium | STR CON |
| Lancer | Fighter (cavalier) | **17** | 15 | 13 | *8* | 10 | 12 | STR / STR | heavy | STR CON |
| Reaper | Warlock (reaper) | *8* | **17** | 12 | 10 | 13 | 15 | DEX / CHA | light | DEX CHA |
| Time Witch | Wizard (chronurgist) | *8* | 13 | 12 | **17** | 15 | 10 | INT / INT | robes | INT WIS |
| Arc Blade | Construct (blade) | 12 | **17** | 15 | 13 | 10 | *8* | DEX / DEX | medium | DEX CON |
| Dread Pirate | Fighter (bombardier) | 15 | 13 | **17** | 10 | *8* | 12 | STR / DEX | medium | STR CON |
| Siege Bot | Construct (siege) | 13 | 15 | **17** | 12 | 10 | *8* | DEX / DEX | heavy | STR CON |
| High Priestess | Cleric (life) | *8* | 10 | 13 | 12 | **17** | 15 | WIS / WIS | medium | WIS CHA |
| Queen Dragoon | Dragoon (dragon knight) | **17** | 13 | 15 | *8* | 10 | 12 | STR / CON | heavy | DEX CON |
| Juggernaut | Construct (bulwark) | 15 | *8* | **17** | 12 | 13 | 10 | STR / STR | heavy | STR CON |
| Great Sage | Wizard (sage) | *8* | 10 | 12 | **17** | 15 | 13 | INT / INT | robes | INT WIS |
| Demon Swordsman | Warlock (hexblade) | 13 | 12 | 15 | *8* | 10 | **17** | CHA / CHA | medium | WIS CHA |
| Tyrant | Warlock (tyrant) | 13 | *8* | 15 | 12 | 10 | **17** | STR / CHA | heavy | WIS CHA |

### What the scores make of them, and how they grow

"At 20" and "at 100" are the six scores (STR DEX CON INT WIS CHA) at that level from levels alone (section 5), before ranks, talents and
gear. To hit and DC are at level 1, then at level 100.

| Hero | AC | To hit | Skill DC | Crit | At 20 | At 100 | To hit / DC at 100 | In a fight |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Knight | 16 | +4 | 12 | 5% | 18 8 20 10 16 13 | 20 8 24 10 18 13 | +12 / 20 | Hard to hit (AC 16) and shrugs off poison and stuns; slow, and every DEX save (fire, blasts) goes badly |
| Samurai | 15 | +5 | 13 | 8% | 18 20 16 10 13 8 | 20 24 18 10 13 8 | +14 / 22 | Strikes first and often; a fine all-rounder whose low CHA charges his ultimate slowly |
| Kunoichi | 14 | +5 | 13 | 8% | 8 20 13 16 10 18 | 8 24 13 18 10 20 | +14 / 22 | Quick, crits, slips blows; STR 8 means she is shoved about and climbs no better |
| Archer | 14 | +5 | 13 | 8% | 13 20 16 10 18 8 | 13 24 18 10 20 8 | +14 / 22 | Sharp eyes (WIS) see through smoke and cover; nothing up close |
| Fire Wizard | 12 | +5 | 13 | 7% | 8 18 13 20 16 10 | 8 20 13 24 18 10 | +14 / 22 | Big spell DC: burns land and stick; frail, AC 12, and a poor STR save |
| Peasant | 14 | +4 | 12 | 6% | 18 13 20 8 16 10 | 20 13 24 8 18 10 | +12 / 20 | Tough and steady, saves well against poison and bleeding; INT 8: his skills come round a little slower |
| Ninja Monk | 15 | +5 | 12 | 8% | 13 20 16 10 18 8 | 13 24 18 10 20 8 | +14 / 20 | Unarmoured AC 15 from DEX and WIS; quick hands; WIS saves shrug off fear |
| Wanderer | 13 | +5 | 13 | 7% | 8 18 16 20 13 10 | 8 20 18 24 13 10 | +14 / 22 | Clever (INT): skills come round faster, draughts strong; frail in melee |
| Lightning Mage | 11 | +5 | 13 | 6% | 8 16 13 10 18 20 | 8 18 13 10 20 24 | +14 / 22 | Storm-born (CHA): high DC, fast ultimate; frail (AC 11), no armour |
| Kitsune | 13 | +5 | 13 | 7% | 8 18 10 13 16 20 | 8 20 10 13 18 24 | +14 / 22 | Charms stick (CHA DC); CON 10: poison and stuns take hold easily |
| Karasu Tengu | 14 | +5 | 13 | 8% | 13 20 16 18 10 8 | 13 24 18 20 10 8 | +14 / 22 | Fast, high crit, quick-witted thief; low CHA, slow ultimate |
| Yamabushi Tengu | 14 | +3 | 13 | 6% | 16 13 18 10 20 8 | 18 13 20 10 24 8 | +11 / 22 | Wise and hardy: resists fear and charms, wind skills on WIS; clumsy with DEX saves |
| Werewolf | 13 | +5 | 13 | 6% | 20 16 18 8 13 10 | 24 18 20 8 13 10 | +14 / 22 | Raw STR: climbs higher and shoves further as he grows; INT 8 |
| Minotaur | 16 | +5 | 13 | 5% | 20 10 18 8 13 16 | 24 10 20 8 13 18 | +14 / 22 | The strongest shove in the game; dim (INT 8), slow skills |
| Satyr | 13 | +4 | 13 | 7% | 13 18 16 10 8 20 | 13 20 18 10 8 24 | +12 / 22 | Songs and lures on CHA; WIS 8: easily frightened and charmed |
| Gorgon | 13 | +4 | 13 | 7% | 8 18 16 10 13 20 | 8 20 18 10 13 24 | +12 / 22 | Petrifying gaze on CHA (a high DC); frail up close |
| Samurai Commander | 16 | +4 | 13 | 5% | 18 10 16 8 13 20 | 20 10 18 8 13 24 | +12 / 22 | Banner and command on CHA (a strong standard); DEX 10 in heavy armour |
| Paladin | 16 | +4 | 13 | 5% | 18 8 16 10 13 20 | 20 8 18 10 13 24 | +12 / 22 | Heals and shields on CHA; heavy armour; DEX 8: blasts hurt him |
| Cleric | 13 | +3 | 13 | 5% | 16 10 18 8 20 13 | 18 10 20 8 24 13 | +11 / 22 | Healing and smites on WIS; solid saves; INT 8 |
| Druid | 12 | +5 | 13 | 6% | 8 16 18 13 20 10 | 8 18 20 13 24 10 | +14 / 22 | Nature on WIS: strong heals and treant growth; STR 8 |
| Barbarian | 13 | +5 | 13 | 6% | 20 16 18 8 13 10 | 24 18 20 8 13 10 | +14 / 22 | Unarmoured (DEX + CON); big STR blows; poor INT, slower skills |
| Ranger | 14 | +5 | 12 | 8% | 10 20 16 13 18 8 | 10 24 18 13 20 8 | +14 / 20 | Fast shots, traps on WIS (good DC); STR 10 |
| Warlock | 11 | +5 | 13 | 6% | 8 16 18 13 10 20 | 8 18 20 13 10 24 | +14 / 22 | Curses and drains on CHA; frail, robes (AC 11) |
| Illusionist | 12 | +4 | 13 | 7% | 8 18 13 20 10 16 | 8 20 13 24 10 18 | +12 / 22 | Clever (INT): quick skills, hard to fool; STR 8 |
| Gunslinger | 14 | +5 | 13 | 8% | 8 20 13 10 18 16 | 8 24 13 10 20 18 | +14 / 22 | Deadly aim and crits; CON 12: the lowest health of the shooters |
| Shambler | 13 | +4 | 13 | 5% | 18 10 20 8 16 13 | 20 10 24 8 18 13 | +12 / 22 | Tough as a corpse (CON 17), bile DC on CON; slow and dim |
| Rifle Bot | 15 | +5 | 13 | 8% | 10 20 18 16 13 8 | 10 24 20 18 13 8 | +14 / 22 | Steady aim, sturdy plating; CHA 8: a slow ultimate |
| Mercenary | 14 | +5 | 13 | 8% | 13 20 16 10 18 8 | 13 24 18 10 20 8 | +14 / 22 | Sharp-eyed hunter (WIS 15): cover and smoke fool him less; CHA 8 |
| Mummy | 12 | +3 | 13 | 5% | 16 8 18 10 20 13 | 18 8 20 10 24 13 | +11 / 22 | Curses and binds on WIS; DEX 8: slow and easy to hit |
| Buccaneer | 14 | +5 | 13 | 8% | 13 20 16 8 10 18 | 13 24 18 8 10 20 | +14 / 22 | Swashbuckler: quick and flashy; INT 8 |
| Wolf Bard | 12 | +5 | 13 | 6% | 8 16 18 10 13 20 | 8 18 20 10 13 24 | +14 / 22 | Songs on CHA (stronger auras, fast ultimate); STR 8 |
| Beastmaster | 12 | +2 | 13 | 6% | 10 16 13 8 18 20 | 10 18 13 8 20 24 | +7 / 22 | Her wolves fight on her CHA (command); her own blows are weak |
| Kraken Mate | 13 | +4 | 11 | 5% | 18 10 20 8 16 13 | 20 10 24 8 18 13 | +12 / 19 | A wall of a body (CON 17) and tides on WIS; DEX 10 |
| Lancer | 16 | +5 | 13 | 7% | 20 18 16 8 10 13 | 24 20 18 8 10 13 | +14 / 22 | STR and DEX both: shoves and climbs; heavy armour |
| Reaper | 14 | +5 | 12 | 8% | 8 20 13 10 16 18 | 8 24 13 10 18 20 | +14 / 20 | Quick, crits, raises wraiths on CHA; STR 8, shoved about |
| Time Witch | 11 | +5 | 13 | 6% | 8 16 13 20 18 10 | 8 18 13 24 20 10 | +14 / 22 | Clever (INT): her skills come round fastest; frail |
| Arc Blade | 15 | +5 | 13 | 8% | 13 20 18 16 10 8 | 13 24 20 18 10 8 | +14 / 22 | Quick and hardy for an assassin; CHA 8 |
| Dread Pirate | 14 | +4 | 11 | 6% | 18 16 20 10 8 13 | 20 18 24 10 8 13 | +12 / 19 | Tough (CON 17), kegs on DEX; WIS 8: easily frightened |
| Siege Bot | 16 | +4 | 12 | 7% | 16 18 20 13 10 8 | 18 20 24 13 10 8 | +12 / 20 | Heavy plating, sturdy; slow and dim |
| High Priestess | 13 | +5 | 13 | 5% | 8 10 16 13 20 18 | 8 10 18 13 24 20 | +14 / 22 | The best healer's WIS; CHA too, fast ultimate; STR 8 |
| Queen Dragoon | 16 | +5 | 12 | 6% | 20 16 18 8 10 13 | 24 18 20 8 10 13 | +14 / 20 | STR and a breath on CON; heavy armour |
| Juggernaut | 16 | +4 | 12 | 5% | 18 8 20 13 16 10 | 20 8 24 13 18 10 | +12 / 20 | The toughest body (CON 17, AC 16); DEX 8: slowest to act |
| Great Sage | 10 | +5 | 13 | 5% | 8 10 13 20 18 16 | 8 10 13 24 20 18 | +14 / 22 | The deepest mana (INT 17); the frailest (AC 10) |
| Demon Swordsman | 14 | +5 | 13 | 6% | 16 13 18 8 10 20 | 18 13 20 8 10 24 | +14 / 22 | Blows on CHA (a hexblade): blood and might in one; INT 8 |
| Tyrant | 16 | +3 | 13 | 5% | 16 8 18 13 10 20 | 18 8 20 13 10 24 | +11 / 22 | Condemns on CHA (high DC); DEX 8 in heavy armour |

What the spread looks like across the 45:

| | Count |
| --- | --- |
| Primary score | DEX 12, CHA 11, CON 7, STR 5, INT 5, WIS 5 |
| Blows on | STR 18, DEX 16, CHA 5, INT 4, WIS 2 |
| Casting on | CHA 12, DEX 11, WIS 8, STR 7, INT 5, CON 2 |
| Armour | light 15, medium 10, heavy 9, robes 6, unarmoured 5 |
| AC at level 1 | 10 (the Great Sage) to 16 (the heavy armour) |

---

## 5. Levelling

### Ability score improvements, as in D&D

| Level | What it gives | Where it goes |
| --- | --- | --- |
| 4, 8, 12, 16, 20 | **An ability score improvement: +2** (D&D's five) | the primary to 20, then the second to 18, the third to 16, the fourth to 14 |
| 30, 40, 50, 60, 70, 80, 90, 100 | **An epic boon: +1**, which may pass 20 | the primary to 24, then the second to 20, the third to 18 |

So a hero is at its best in its own things by level 8 to 12 (primary 20, +5), and its later levels make it more of what it already is.
Its two lowest scores never grow from levels: a wizard does not turn tough by levelling. Worked through for the Knight (STR DEX CON INT
WIS CHA):

| Level | 1 | 4 | 8 | 12 | 16 | 20 | 30 | 60 | 100 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Scores | 15 8 17 10 13 12 | 15 8 **19** 10 13 12 | **16** 8 **20** 10 13 12 | **18** 8 20 10 13 12 | 18 8 20 10 **15** 12 | 18 8 20 10 **16 13** | 18 8 **21** 10 16 13 | 18 8 **24** 10 16 13 | **20** 8 24 10 **18** 13 |
| Proficiency | +2 | +2 | +2 | +3 | +3 | +4 | +5 | +6 | +7 |
| To hit | +4 | +4 | +5 | +7 | +7 | +8 | +9 | +10 | +12 |

### Fixed, not rolled

**Recommended: fixed growth by calling, with no seeded variance.** Each player has one of each hero kind, kept for good, so a random roll
would make one player's Knight weaker than another's forever, with nothing to do about it; and fixed growth can be measured and balanced.
D&D's ability score improvements are chosen, never rolled. The player's choices come from the talents (section 6), which spend points on
scores. (Whether the player should choose the improvements themselves is open question 1.)

### The level curve, and diminishing returns

The level curve (`lastingBoost`, `levelBoost`) stays the backbone: most of a hero's growth in health and attack is still its level. The
scores add to it: the primary's +2 modifier by level 8 is +10% to its blows, and +4 by level 100 is +20%; CON adds the same to the tough.
So the curve **gives back what the scores add on average**: `LEVEL_HP`, `LEVEL_ATK`, the late shares and the milestones are trimmed
so that the mean hero's power at every level (`powerOf`, and the sweeps) is where it is now, within 1%. The diminishing returns stay
as they are (`DIM_SHARE` past 12, `LATE_SHARE` past 20, `DEEP_SHARE` past 30), and the scores follow the same shape: four improvements by
level 16, then one point every ten levels.

The proficiency bonus (+2 to +7) grows the to-hit and the DCs with level on both sides; the foes' rises with the army's tier, so a hero at
the level an army is meant for meets it on even terms (section 9).

### The spire and the Calamity

Their in-run levels (1 to 30) give improvements by the same table, as they give hp and attack now. What a hero brings from outside the
run (rank, awakening, talents, gear) applies as it does now. (The skills overhaul's skill levels do not apply there, by the owner's
answer; nothing here changes that.)

---

## 6. Ranks, awakening, talents, gear, traits and the rest

| Source | What it gives now | What it gives with the scores |
| --- | --- | --- |
| **Rank** (lasting, shards; 1 to 4) | hp and attack x1.08 a rank | **+1 to the primary and +1 to the second** a rank (a bigger stat step; they may pass the level caps, by up to 1 a rank), and hp and attack x1.05 a rank (from 1.08, to keep the total). A rank 4 Knight: CON +3, STR +3. |
| **Grade** (merging in a run; 2 to 4) | hp and attack (x1.35, x1.75, x2.65 under the skills overhaul) | the same multipliers, and **+1 to the primary and the second** a grade, shown on the merge banner ("Rank 3 · CON +2, STR +2 · health and attack x1.75"). `GRADE_BOOST` is retuned to keep each grade's targets. |
| **Awakening** (rank 5 and 6) | hp and attack x1.08, a passive | the passive, x1.05, and **an epic boon: +2 to the primary**, which raises its cap by 2 (to 26, then 28) |
| **Talents**, tier-1 stat nodes | +4% hp, +3% attack, +1 defence, 3% crit, 3% dodge, 6% walk, 4% blows, 10% charge, regen | a node that gave **hp becomes CON +2**, **attack becomes the blow ability +2**, **crit or dodge becomes DEX +2**, **charge becomes the casting ability +2**; defence (+1 Armour), walk, blows and regen stay as they are. The nodes keep their names and ids ("Tempered Steel: CON +2"). |
| **Gear** | main stats as shares; an ability from Epic | the same, and **a score on each base** by what it is: a claymore or maul STR, a katana, dagger, bow or gun DEX, plate CON, a staff or tome INT, a holy symbol or totem WIS, a lyre or charm CHA. **+1 at Rare and Epic, +2 at Legendary and Mythic.** It is fixed by the base (no new roll), so old pieces have it at once. A worn piece keeps it until it breaks, as its main stats do; a broken one gives nothing. An armour piece's defence adds to Armour; its dodge to AC (5% = +1). |
| **Traits** (team bonuses) | attack, hp, guard, dodge, crit, speed, charge | unchanged, but a dodge share becomes AC (5% = +1) |
| **Guest heroes** | an owned guest brings its level, rank, talents and gear; an unowned one the party's mean level and rank | the same: its scores are worked out from what it brings, by the same rules |
| **Summons** (wolves, the treant, wraiths, the standard, decoys) | their own numbers, grown with the caller | **their own small stat block** (a wolf: STR 12, DEX 15, CON 12, INT 3, WIS 12, CHA 6), the caller's proficiency, and their health and attack **+5% a point of the summoning skill's ability**: CHA for the Beastmaster's wolves, the Reaper's wraiths and the Commander's standard, WIS for the Druid's treant, INT for the Illusionist's decoys. |
| **Duchess and the King** | fixed numbers | fixed stat blocks of their own (Duchess, as befits Her Grace, has CHA 20) |
| **Eidolons** | a fixed strike, the same share for all six, and a rider | **the strike stays fixed** (the owner's rule that all six are equal); the **rider lasts 5% longer a point of the highest CHA modifier on the field** (the herald who blows the horn) |

---

## 7. Skills and stats

### Which ability powers a skill

Every skill takes one ability (`Slot.stat`), by a rule, so the 135 skills need no list of their own beyond a few named exceptions:

| The skill | Its ability | Examples |
| --- | --- | --- |
| A weapon skill: a cut, a thrust, a shot, a charge, a jump | the hero's **blow ability** (STR or DEX) | Kesa Cut, Double Shot, Jump, Bull Rush |
| A spell: fire, frost, lightning, a curse, a ward | the **casting ability** (INT, WIS or CHA) | Fire Bolt, Chain Lightning, Curse of Weakness |
| A heal or a raising of the fallen | the **casting ability** | Healing Word (WIS), the Paladin's Aura of Protection (CHA), the Wanderer's draughts (INT) |
| A summon, a banner, a song, an aura | the **casting ability** (CHA for most callers) | Summon Beast, Plant the Standard, Bardic Inspiration, Aura of Protection |
| A body skill: a breath, bile, a blood price | **CON** | the Dragoon's breath, the Shambler's Bile Spit and Contagion |
| The ultimate | the hero's casting ability | as its skills |

### What the ability does to a skill

- **Strength:** the skill's damage, healing or shield, and a summon's health and attack, **+5% a point of modifier**, fitted at level 1 as
  the blows are (so a level-1 skill is as strong as now). It multiplies with the skill's own `tune` and, under the skills overhaul, its
  skill level (Level 5: +30%). The two are separate: the skill level is how practised the hero is with that skill; the score is the hero.
- **Its DC:** 8 + proficiency + the ability's modifier, for every save its riders allow (section 3.3).
- **Its cooldown:** INT's quick wits, 2% a point, at most 10%. This sits under the skills overhaul's classes (a jab stays a jab).
- **Its cost:** unchanged. The pool's size and refill follow CON (stamina) or the casting ability (mana), so a hero's own pool income
  differs by a few percent from another's.

### How the AI uses the scores

The scores feed small, fixed rules in the fight's choices (no new randomness):

- **Flanking.** A melee hero with DEX +3 or more, choosing among tiles it could strike its target from, prefers one at the target's side
  or back (`blowMult`'s x1.25 and x1.5). The quick heroes go round; the brutes go through.
- **Kiting.** A shooter with DEX +3 or more with a melee foe beside it steps one tile back when a tile out of that foe's reach is free and
  it can still shoot from there (at most once in 3 s). Archers keep their distance; the Siege Bot (DEX 15) holds its ground.
- **Saves-aware control.** A skill that lays an ailment, choosing among targets it would value the same, picks the one with the weakest
  save against it: the Gorgon turns the brute to stone, not the golem; the Kitsune charms the dim orc, not the shaman.
- **Picking a blow's target** stays "the weakest it can reach", with ties broken by the likelier hit (the lower AC).
- **Shoving** heroes (STR) prefer, among equal targets, a foe they out-muscle by 2 or more (it goes a tile further).

---

## 8. Where the player sees them

All at 393 x 852, 360 x 780 and 412 x 915, in the pixel style the menus already use.

### The hero sheet: a Stats panel

A new panel above the Skills tab (`src/menuHeroes.ts`), in place of the four HP, Attack, Defence and Range cells:

```
┌──────────────────────────────────────────┐
│ STR 18  +4 │ DEX 8  −1 │ CON 20  +5      │   six tiles, two rows of three;
│ INT 10  +0 │ WIS 16 +3 │ CHA 13  +1      │   the primary has a gold rim, the 8 a dim one
├──────────────────────────────────────────┤
│ Health 1,478   Attack 50   Armour 10      │
│ AC 16   To hit +8   Skill DC 16           │
│ Crit 5%   Blows 1.10 s   Initiative −1    │
│ SP 75 (+20% refill)   Ultimate +3%        │
│ Saves  STR +8●  DEX −1  CON +9●           │   ● = trained
│        INT +0   WIS +3  CHA +1            │
├──────────────────────────────────────────┤
│ Next: Level 30 · CON +1                   │
└──────────────────────────────────────────┘
```

A tap on a score opens a short sheet of what it does **for this hero**, in numbers: "STR 18 (+4): blows +10% since level 1 (STR +2) · shoves a tile further than
most · climbs a step higher (Athletics) · STR save +8". A tap on AC, To hit or Skill DC explains it in one line ("A foe needs 11 on a d20
to hit him fully").

### The unit card (hold a unit between waves)

The card ([unit-info.md](unit-info.md)) gains a row of the six scores (the modifiers, small) above the rows it has; "Defence" becomes
"Armour", and AC, To hit, Skill DC and Initiative join Blows and Walk. A foe's card shows its block the same way (section 9), and a boss's
its Legendary Resistance.

### The level-up recap

The JRPG results screen (`src/sim/jrpgRecap.ts`, `src/jrpgRecapView.ts`) shows HP and ATK, old to new. It gains the lines that changed,
in the same count-up, only on the levels that change them:

```
Knight          Lv 7 → 8
HP     812 → 873     ▲61
ATK     27 → 29      ▲2
STR     15 → 16      ▲1     (an ability score improvement)
CON     19 → 20      ▲1     CON +5: health +5%
```

and on a proficiency step (levels 10, 20, 30, 50, 80): "To hit +5 → +6", "Skill DC 13 → 14". The run's own recap (`standGrowth`, the
spire, the Calamity) does the same for in-run levels.

### Gear: the compare

The gear card's compare (`compareRows` in `src/equipView.ts`, green better, red worse) adds the score ("+1 STR") and what it changes:
"STR 19 → 20 (+4 → +5): blows +5%, to hit +1". A score that would not change the modifier says so ("STR 18 → 19, +4 still"), so an odd
point is not mistaken for nothing: it is half way to the next.

### In the fight

- **"Glance"**: a glancing blow's number is smaller and grey.
- **"Miss"**: the existing dodge pop.
- **"Saved"**: a save that halved an ailment or a blast (the "Immune" pop's look, a different word).
- A natural 20 shows as the crit it is now.

---

## 9. Foes

**Recommended: foes use the same rules** (AC, to hit, saves, DCs), so a fight is one system, but **from stat blocks by family**, not one
hand-written block for each of the 300 foes. A foe's health and attack stay its own numbers (as a D&D monster's hit points are written,
not worked out); its scores give it AC, saves, its DCs, crit and initiative.

| Family (`familyOf`) | STR | DEX | CON | INT | WIS | CHA | AC | Saves trained | Examples |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Brute | 16 | 10 | 16 | 7 | 10 | 8 | 12 | STR CON | orcs, ogres, minotaurs, satyrs, forest brutes |
| Skirmisher | 12 | 16 | 12 | 6 | 12 | 8 | 14 | DEX | wolves, imps, werewolves |
| Shooter | 10 | 16 | 12 | 10 | 13 | 8 | 13 | DEX WIS | skeleton archers, gorgons |
| Caster | 8 | 12 | 12 | 16 | 13 | 14 | 12 | INT WIS | shamans, devils |
| Armoured | 15 | 10 | 16 | 6 | 8 | 5 | 15 | STR CON | skeletons, golems |
| Flyer | 16 | 14 | 14 | 10 | 10 | 14 | 14 | DEX CHA | demons |

- **Proficiency by the army's tier:** Normal +2, Hard +3, Elite +4, Legendary +5, Mythic +6 (the tiers are set for hero levels,
  [difficulty.md](difficulty.md), so this tracks the heroes' own); the spire and the Calamity by their depth, +2 to +8.
- **Bosses:** +2 proficiency, +2 to two scores, +2 AC, all six saves trained, and **Legendary Resistance** (their existing ladder).
  The elites and the Calamity's guardians get blocks of their own (about 30), with the immunities they have now.
- **No foe levels or takes improvements.** A harder tier already raises a foe's numbers; its proficiency is the only new step.

---

## 10. The balance plan

### Measure before anything moves

On main, with the game's own seeded tools, recorded in the first batch's note (the same table as the skills overhaul's, so the two can be
compared):

| What | Tool |
| --- | --- |
| Parity at levels 1, 10, 20, 30 | `node tools/kits/tune.mjs`; `test/hero-balance.test.ts` (every hero within 6 points of the roster average) |
| Parity at 60 and 100 | `npm run stand-balance -- --levels 60,100 --attempts 60`, and a new `--hero-level 60/100` sweep |
| Each grade | `npm run balance -- --heroes-only --hero-grade 2/3/4 --hero-stage S` |
| The armies, the daily, the Calamity, the Last Stand, the spire | the cells the skills overhaul lists (curve, `daily-rate`, `--calamity`, `stand-balance`, merge-two's spire cells) |
| Fight length, sim speed | the sweeps' mean fight time; time per fight |
| Each hero's power by level | `powerOf` at levels 1 to 100 (new `tools/stats/budget.mjs`) |

New tools: `tools/stats/fit.mjs` (fits each hero's body to today's level-1 numbers and prints its derived numbers), and a `--stats off`
switch for the balance tools, so every sweep can be run with and without the scores side by side.

### The targets

- **Every hero within 6 points of the roster average** (aim for 4) at levels 1, 10, 20, 30, 60 and 100. **No rarity:** every hero has
  the same scores in a different order and the same growth, so no hero is meant to be stronger overall.
- **Level 1 unchanged in its numbers:** each hero's health, attack, Armour, blow time and step time at level 1, rank 1 equal today's (a
  test).
- **The mean hero's power at each level within 1% of now** (the curve trim, section 5).
- **The modes where they are now:** each army's tries within a step, the daily 66 to 75%, the Calamity's map shares, the Last Stand's
  waves at each level, the spire's median floor. **Fight length within 10%**, and the sim no more than 5% slower a fight.

### What moves, and what answers it

1. **Hit, glance and miss** lower every side's average blow: `BLOW_SCALE` (about x1.28) puts it back; the foes' AC by family and tier
   is the second knob.
2. **AC against Armour:** the heavy heroes get harder to hit as well as soaking; if the tanks come out too strong, heavy AC 15 (from 16).
3. **Saves** shorten control: the skills' durations (`dur`) and the save's effect answer it (halving, as recommended).
4. **The scores' growth** lifts the heroes with their power in their primary (most) more than those with it second (the Knight, the
   Paladin, the Beastmaster): each hero's skill `tune` and body fit answer it, never its scores.
5. **New universal effects** (DEX crit and speed, INT cooldowns, CHA ultimates, pools by score): measured one at a time, each with its
   own per-point share as the knob (5%, 2%, 1%, 3%...).

**What to tune first:** a hero's skill strengths; then its fitted body; then the per-point shares; the global knobs (`BLOW_SCALE`, the
foes' AC, the curve trim) last. Never by loosening a test.

### The identity fixtures

`test/spells-identity.test.ts` holds every mode and hero at levels 1, 10 and 30 to a recorded hash. The scores-as-data batch must change
no fight. Each later batch re-records the scenarios it moves and says which in the test's header, as the RPG-SPELLS and skills batches do.

---

## 11. Order with the skills overhaul

The skills overhaul ([its design](https://github.com/hpatter9/legends-of-the-fall/blob/claude/skills-design/docs/notes/skills-overhaul-design.md))
is being built: batch 1 (the rules as data) is on its branch, batch 6 (summon and shape timers) is merged; batches 2 to 5 (cooldowns by
class, ranks no longer upgrading skills, the third skills, skill levels by use), 7 (the page) and 8 (the full rebalance) are to come.

**Recommended order:**

1. **Stats batch 1** (the scores as data, no fight changed) can go in **any time**, beside the skills work: it touches no fight code.
2. **The skills overhaul's batches 2 to 5** next, as planned: they set each skill's class, cost, cooldown and level, which the stats
   then scale.
3. **Stats batches 2 to 6** (the fight rules) after them, so each skill is scaled once, by its final shape.
4. **One joint rebalance** (the skills overhaul's batch 8 and the stats' batch 7 together), so the armies, the daily and the Calamity are
   retuned once, not twice.
5. **The page:** the skills' batch 7 and the stats' panel share the hero sheet and the unit card; whoever comes second builds on the
   first.

**Where the two meet:**

- **Ranks:** the owner chose "a rank gives hp and attack only, with the larger step". This design adds +1 to two scores a rank and a
  grade. That is still a body, not a skill, but it is a change to that answer: open question 5.
- **Pool income:** the skills' rule tests (a jab costs less than the pool's income; a kit's demand between 1.4 and 3.5) read a reference
  income. With pools by score, each hero's income differs by a few percent: the test reads each hero's own income at level 20.
- **Skill levels and scores multiply**, and do different jobs: a skill level is practice with that skill (by use), a score is the hero
  (by level). The skill sheet shows both: "Fire Bolt · Level 3 · INT +5".
- **Cooldowns:** INT's 2% a point applies after the class's cooldown and its skill level's cut, and never moves a skill out of its
  class's range.

---

## 12. Saves and determinism

### Saves (`legends.*`; no new required field; the save version is not bumped)

- **Nothing new is stored** with fixed growth: a hero's scores are worked out from what the save already holds (its kind, lasting level,
  rank, awakening, talents and gear). Old saves have scores at once, the right ones for their level.
- Talent nodes keep their ids; only what a stat node gives changes (data). Gear keeps its fields; its score comes from its base and
  rarity.
- A run saved mid-way loads as it is: its heroes' in-run levels and grades give their scores.
- If the owner chooses player-picked improvements (open question 1): `Meta.asi?: Record<string, string[]>`, the score chosen at each
  improvement, optional; a missing choice takes the calling's default.

### Determinism

- The scores, modifiers, proficiency and every derived number are pure functions of the save and the fight's start, worked out once when
  a fighter is placed (`addUnit`), in whole numbers where D&D has them.
- **The d20s do not draw from the fight's streams.** A blow's d20 and a save's d20 are hashes of the moment, as tall grass's cover is now
  (`mixSeed(b.seed, STATS_SALT, at, by.id, to.id)`), and the initiative d20 a hash of the seed and the fighter
  (`mixSeed(b.seed, INIT_SALT, id)`). So `b.rng` and `b.skillRng` draw exactly what they did, a fight still replays from its seed, its
  placing and its orders, and nothing about the d20s needs saving.
- The AI's new rules (flank, kite, the weakest save) are fixed orders over the fight's state, ties broken by tile and id.

---

## 13. What each part touches

| Part | New files | Hooks in shared files |
| --- | --- | --- |
| The scores as data | `src/sim/stats.ts` (scores, modifiers, proficiency, growth, the 45 profiles, the foe families, derived numbers), `test/stats.test.ts`, `tools/stats/fit.mjs`, `tools/stats/budget.mjs` | `units.ts` (`UnitDef` unchanged; the profiles sit beside it) |
| Power and growth | | `battle.ts` (`addUnit`: `Boost.stats`; `atkOf`), `run.ts` (`boostOf`), `levels.ts` (the curve trim), `meta.ts` (`RANK_MULT`), `awakenRules.ts`, `talents.ts` (the stat nodes' data), `equipBases.ts` (a score per base), `equipment.ts` (`EquipStats.scores`), `guest.ts`, `power.ts`, the summons' numbers in `abilities.ts` and `kits/callers.ts` |
| AC and the blow | | `battle.ts` (`swing`, `settle`: the d20, glance and miss; `guardMult` becomes cover), `abilities.ts` (`rollCrit`, `onStrike`'s dodge to AC), `traits.ts` (dodge to AC), `board.ts` (tall grass as cover) |
| Saves | | `ailments.ts` (`gate`: the save after `resistOf`), the toolkit's shove and pull, `landArea` (DEX saves on blasts), `hazards.ts` (traps) |
| The rest | | `heroKits.ts` (pools by score, cooldowns by INT), the ultimate's fill (CHA), `eidolons.ts` (the rider's length), `battle.ts` (initiative, the AI's flank and kite), `kits/when.ts` (the weakest save) |
| The page | | `src/menuHeroes.ts` (the Stats panel), `src/unitInfoRules.ts` (`statRows`), `src/sim/jrpgRecap.ts` and `src/jrpgRecapView.ts`, `src/equipView.ts` (`compareRows`), `src/render/fx.ts` (Glance, Saved), `src/codexView.ts` |
| Records | `docs/notes/stats-*.md` (a note a batch) | `docs/TASKS.md` |

---

## 14. Build plan

Each batch is a branch of its own, measured and noted before the next; each runs `npm run typecheck`, the affected tests and
`npm run web`; the page batches check 393 x 852, 360 x 780 and 412 x 915.

0. **Measure main** (no code): section 10's table, into the first batch's note.
1. **The scores as data, no fight changed:** `stats.ts` with the 45 profiles, the foe families, the modifier, proficiency, the growth
   table and the derived numbers; each hero's body fitted. *Tests: every profile is 17, 15, 13, 12, 10, 8; growth by level, the caps,
   proficiency; each hero's derived level-1 numbers equal today's; the identity fixtures do not move.*
2. **Power and growth:** blows and skills scale with their ability, health with CON, the improvements and epic boons live, the curve
   trimmed; ranks, grades, awakening, talents' stat nodes and gear's scores. *Tests: a level-8 Barbarian's blows are +10% for STR 20; a
   rank 4 Knight has CON and STR +3; the mean power by level within 1% of main; parity.*
3. **The page:** the hero sheet's Stats panel, the unit card's rows, the recap's score lines, the gear compare. (After batch 2, so what it
   shows is true; later batches add their rows.) *Shots at three sizes.*
4. **AC and the blow:** the d20, glance and miss, crits on a natural 20 and DEX, initiative, blow speed by DEX, dodge and tall grass as
   AC, height as cover, the foes' blocks, `BLOW_SCALE`. *Tests: the odds table above over 10,000 hashed rolls; a fight replays; fight
   length within 10%.*
5. **Saves:** DCs, the six saves, halving, "Saved", the shoves' contest, Legendary Resistance named. *Tests: a CON 20 hero shakes off
   poison more often than a CON 12; a saved shove is a tile shorter; bosses as before.*
6. **The rest:** pools by score, INT's cooldowns, WIS's perception, CHA's ultimate fill and the Eidolons' rider, STR's Athletics, the AI's
   flank, kite and weakest save; the skills overhaul's rule tests read each hero's own income. *Tests: each rule; the AI picks.*
7. **The joint rebalance** with the skills overhaul's batch 8: every mode against batch 0; the global knobs last.

---

## 15. Open questions

1. **Who chooses the improvements?** *Recommended: they follow the calling, fixed* (section 5), and the player's choice comes through the
   talents' stat nodes. The other way, D&D's own, is to let the player pick +2 (or +1 and +1) at levels 4, 8, 12, 16 and 20; it is more to
   decide for 45 heroes, harder to balance, and needs a saved choice. Either way, **no random variance**.
2. **Do ordinary blows roll to hit against AC?** *Recommended: yes, with glancing blows* (a miss by 1 to 5 is half damage), so the d20 is
   felt without fights stalling on misses, and AC makes DEX and armour matter at every level. The smaller step would be to keep every blow
   landing and use AC only as a dodge share.
3. **What does a successful save do?** *Recommended: halve it* (time, damage, tiles), D&D's "half on a save", so the control kits keep
   working. The other way, a save that shrugs it off entirely, would make control unreliable against tough foes.
4. **Do foes use the same rules?** *Recommended: yes, from family stat blocks* (section 9) with proficiency by the army's tier, and
   Legendary Resistance for the bosses, rather than 300 hand-made blocks or foes outside the system.
5. **Ranks and grades: a score step as well?** *Recommended: yes, +1 to the primary and the second a rank and a grade*, with the hp and
   attack multipliers trimmed to keep the total. This adds to the skills overhaul's approved "a rank gives hp and attack only": still a
   body, never a skill.
6. **How are the numbers shown?** *Recommended: as D&D does, the score with its modifier* ("STR 18 +4"), with the effect in plain
   numbers a tap away ("blows +20%"), so the D&D feel and the plain meaning are both there.

---

## Checks for this design

Documentation only: no game code changed, so no tests or builds were run. The links were checked. The two hero tables were generated by a
script from the profiles in this note: every profile was checked to be the set 17, 15, 13, 12, 10, 8 (so each adds up to 75), and the AC,
to hit, DC, crit and the scores at 20 and 100 were worked out by the rules in sections 2, 3 and 5. The heroes' current numbers, pools and
traits were read from `src/sim/units.ts`, `src/sim/kits/table.ts` and `src/sim/traits.ts` at 0.289.0; the level curve from
`src/sim/levels.ts`.
