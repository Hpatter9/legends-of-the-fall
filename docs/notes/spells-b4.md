# RPG spells, batch 4: the melee heroes

The fifth batch of the approved design v2 ([rpg-spells-design.md](rpg-spells-design.md), section 4.2), after the healers
([spells-b2.md](spells-b2.md)) and the tanks and supports ([spells-b3.md](spells-b3.md)). It reworks ten heroes: the Samurai, the
Kunoichi, the Ninja Monk, the Barbarian, the Mercenary, the Lancer, the Arc Blade, the Demon Swordsman, the Buccaneer and the Queen
Dragoon. Every renamed move keeps its old key, so its look, sound, ailment rider and skill-2 check carry on. What the moves newly do is
built on the movement toolkit, in `src/sim/kits/melee.ts`. Nothing outside these ten heroes plays differently (the proof is below).

## The ten kits

| Hero | Skill 1 | Skill 2 | Ultimate |
| --- | --- | --- | --- |
| Samurai | Iaido (kept) | **Riposte** (Parry Stance), renamed | **Issen** (Heaven-Splitting Cut), renamed |
| Kunoichi | **Sneak Attack** (Shadow Step), renamed | **Smoke Bomb**: after the smoke she **blinks** clear, to the safest free tile within 3 (the toolkit's `safeTile`) | **Assassinate** (Shadow Dance): a teleport slash behind the four weakest foes, renamed |
| Ninja Monk | **Flurry of Blows** (Thousand Fists), renamed | **Quivering Palm** (Stillness Palm): with nobody in reach he **leaps** (Step of the Wind, up to 4 tiles) beside the foe with the fullest skill meter, and the palm falls on it | **Hundred-Hand Strike** (Hundred Fists): the last blow on each foe **launches** it 2 tiles |
| Barbarian | Whirlwind (kept) | **Rage** (Blood Fury), renamed | **Berserker Leap** (Bloodlust): he **leaps** up to 4 tiles beside the foe with most foes round it, strikes the 3x3 (×3.0), **shoves** its foes a tile out, drinks a third and runs fast for 5 s. He stays where he is when the crowd beside him is already the thickest. |
| Mercenary | **Ambush** (Bounty Hunt), renamed | **Hunter's Mark** (Mark for Coin), renamed; strength 4.0 (was 3.06) | **Killing Spree** (Contract Killer), renamed |
| Lancer | **Charge** (Lance Charge), renamed | **Disengage** (Wheel About), renamed | **Cavalry Charge** (Charge of the Knights): he rides up to 7 tiles in a line **through** every foe on it (×2.4 each), each **thrown a tile aside**; he and the riders near him gallop faster for 4 s. It was one long charge at one foe. |
| Arc Blade | **Thunder Step** (Voltage Blink), renamed | **Thunderwave** (Grounding): the wave now **shoves** the foes within 2 two tiles back, and goes off once he has stored 0.8 of his attack (was 1.2) | **Lightning Storm** (Thunder Cascade): a **teleport slash** through up to six foes within 6 (×1.9 each), each shocked and stunned 1.4 s, then back where he started |
| Demon Swordsman | **Cleave** (Hellblade Sweep), renamed | **Blood Pact** (Blood Price), renamed; it costs a tenth of his health every 6 s (was 15% every 8 s) | **Metamorphosis** (Demon Form): chains of hellfire **pull** the three nearest foes within 4 to him first (the hero's copy only) |
| Buccaneer | Grappling Hook (kept) | **Loaded Dice** (Roll the Bones), renamed | Keelhaul (kept) |
| Queen Dragoon | Dragon Breath (kept) | **Dragon Dive** (Jump): the 3x3 round her landing is now **thrown a tile outward** (the foe at its heart stays) and held 0.6 s | Inferno Breath (kept): the line she breathes down **stays alight** for 4 s (a fire wall) |

**Tier skills, renamed:**
- the Ninja Monk: Swift Flurry, Flurry of the Tiger, Endless Flurry;
- the Mercenary: Deadly Ambush, Ambush from the Shadows, King's Ransom;
- the Arc Blade: Thunder Stride, Storm Step, Tempest Step;
- the Demon Swordsman: Great Cleave, Infernal Cleave, Hellblade.

The talents and the deep talent rows that name these skills use the new names. The toolkit has a new helper, `leapTo` (an arc to a tile),
which the leaps use.

**The ultimates' tunes:**
- the Lancer: rate 2.3 (was 1.61). The line charge was −7 at level 30.
- the Arc Blade: power 1.8 (was 2.42). The teleport slash with its stuns was +6.2.
- the Demon Swordsman: rate 1.8 (was 2.06). The chains made Metamorphosis +4.8.

## The page

- Session A's painted toolkit art shows the moves:
  - the blinks and the teleport slashes show its blink and teleport-slash streaks;
  - the leaps and the launches show its launch art;
  - the shoves show its shove;
  - the Inferno Breath's line shows its fire wall.
- A skill's lead look is its old one, kept by its key.

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights; "main" is 0.250.0 in a clean checkout):

| Level | The ten, main → this batch | Every hero |
| --- | --- | --- |
| 1 (stage 5) | unchanged: their skill 1s are as they were, so these fights hash as on main | none beyond 6 (the Arc Blade +4.2, as on main) |
| 10 (stage 24) | Samurai −3.8 → −3.6, Kunoichi 0.0 → −0.5, Ninja Monk −2.3 → −2.2, Barbarian +1.7 → +1.7, **Mercenary −5.3 → −4.7**, Lancer −1.0 → −1.1, Arc Blade +0.5 → +1.0, **Demon Swordsman −5.4 → −4.9**, Buccaneer −2.6 → −3.0, Dragoon −3.0 → −2.9 | none beyond 6 (the Lightning Mage +5.9, as on main) |
| 30 (stage 78) | Samurai −0.5 → −0.1, Kunoichi +0.2 → −0.8, Ninja Monk −1.7 → −1.0, Barbarian −0.9 → +3.1, Mercenary −0.4 → −1.1, Lancer −1.0 → −0.5, Arc Blade +0.2 → +0.4, Demon Swordsman −0.5 → +1.8, Buccaneer −0.5 → −1.3, Dragoon +1.6 → +1.8 | none beyond 4; spread 7.0 (7.0 on main) |

The Mercenary and the Demon Swordsman were the weakest at level 10 on main (beyond 5). The batch's level-10 changes (Hunter's Mark at
4.0, Blood Pact's lighter, quicker price) bring both under 5.

**The modes:**

| Mode | This batch | Main |
| --- | --- | --- |
| Last Stand (party of eight with the Samurai and Kunoichi; 30 greedy runs; mean, median at L10, L20, L30, L60, L100) | 8.9 (9), 10.3 (10), 14.5 (14), 18.6 (19), 23.2 (22) | 9.1 (9), 10.4 (10), 14.7 (15), 17.9 (19), 23.1 (22) |
| Calamity (150 greedy runs; mean maps cleared) | 1.44 (99/43/1/0/0/0) | 1.44 (the same) |
| Daily | unchanged: the starting five at level 1 have their old skill 1s, and the fights hash as on main | — |
| Armies on Normal (`tools/curve/run.mjs`) | unchanged: its recruits (Knight, Paladin, Archer, Warlock, Cleric) hold none of the ten | — |

## The proof that nothing else changed

The five `...Others` scenarios now leave the ten out of every team. I recorded them on main's code before the batch (commit 47fe03d),
and they did not move.

These scenarios changed:
- `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `stand`, `heroes10` and `heroes30`. Each has one of the ten at level 10 or more.

These did not move: `field1`, `heroes1`, `army`, `daily`, `tower` and `calamity`.

`ailment-logs.json` moved for the same six of its eight scenarios. Both test files say why.

## Tests

- `test/melee.test.ts` (6 tests):
  - the names and keys of all ten kits;
  - Smoke Bomb's blink;
  - Quivering Palm's leap to the foe with the fullest meter;
  - Thunderwave's shove at its store;
  - Dragon Dive's ring thrown outward, with its mark left in place;
  - each ultimate's addition: the throws, the Berserker Leap, the Cavalry Charge's line, the Lightning Storm's hops and home, the chains,
    the burning line.
- `hero-kits-all`'s "most heroes cast both skills" still holds at 35 or more. Thunderwave's lower store keeps the Arc Blade's team (now
  quicker to win with its Lightning Storm) casting both.

## Screenshots

`node tools/spells/melee-shots.mjs` (port 8900) stages two moves in a real Undead fight:
- the Kunoichi's Assassinate, held just after her slashes: `docs/samples/spells-b4-assassinate-*.png`;
- the Queen Dragoon's Dragon Dive, held as the foes round her landing are thrown: `docs/samples/spells-b4-dive-*.png`.

Both are taken at 393x852, 360x780 and 412x915.
