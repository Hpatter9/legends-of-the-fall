# RPG spells, batch 6: the casters

The seventh batch of the approved design v2 (rpg-spells-design.md, section 4.4; the design note is on the `claude/rpg-spells` branch), after the
ranged heroes and summoners ([spells-b5.md](spells-b5.md)). It reworks six heroes: the Fire Wizard, the Lightning Mage, the Warlock, the Great
Sage, the Time Witch and the Illusionist. Every renamed move keeps its old key, so its look, sound, ailment rider and skill-2 check carry on.
What the moves newly do is built on the movement toolkit, in `src/sim/kits/mages.ts`. Nothing outside these six heroes plays differently (the
proof is below).

## The six kits

| Hero | Skill 1 | Skill 2 | Ultimate |
| --- | --- | --- | --- |
| Fire Wizard | **Fireball** (Meteor), renamed | **Wall of Fire** (Wildfire): 4 tiles of fire across the lane the most foes are walking, for 6 s; a foe in it or crossing it burns (`wallOfFire`, `fireLane`) | **Meteor Swarm** (Armageddon): each meteor now **launches** the foe at its heart a tile (`SWARM_THROWS`) |
| Lightning Mage | Chain Lightning (kept) | **Storm Surge** (Overload): with a foe beside her she first **blinks** to the safest tile within 3 (`stormSurge`) | **Call Lightning** (Thunderstorm): a storm cloud over her for 6 s; a bolt at once and then each second on the toughest foe within 6 (×1.4, stunned 0.8 s, Charged) (`callLightning`, `stormBolt`). It was six bolts at once. |
| Warlock | **Eldritch Blast** (Hex): each foe the hex strikes is **shoved** a tile back (`blastShoves`) | **Drain Life** (Soul Siphon), renamed | **Circle of Death** (Soul Harvest): a ring of death also holds round him for 6 s (an aura): a foe within 2 takes 0.3 of his attack a second, and he drinks a third of it (`circleOfDeath`) |
| Great Sage | **Magic Missile** (Starfall), renamed | **Font of Magic** (Font of Wisdom): a font on his tile for 8 s (an aura); friends within 3 of it gain mana or stamina each second (`fontOfMagic`) | **Arcane Surge** (Astral Convergence), renamed |
| Time Witch | **Slow** (Temporal Surge), renamed | Rewind (kept) | Time Stop (kept) |
| Illusionist | Mirror Image (kept) | **Transposition** (Trade Places): she and the friend in most trouble within 5 **swap** places; a decoy springs up beside the friend, and the foes that were striking the friend turn on her for 3 s (`transposition`) | Hall of Mirrors (kept) |

**When the AI lays the Wall of Fire:** a foe is within 7 and two or more foes are within 2 tiles of the lane line (`FIRE_WALL`). The wall is laid
on tiles with foes standing in them too, so they burn at once (`raiseWall`'s new `onFighters`, for walls that block no one). Without these rules
the Wizard held his mana for a wall that rarely mattered, and the bot's Calamity runs lost the one seed that cleared on main.

**The toolkit:**
- a fire wall burns as hard as the skill that laid it (`Wall.pow`, `raiseWall(..., { pow })`);
- an aura can heal its caster for a share of the harm it does (`foe.drink`).

**The Yokai Witch**, which borrowed the Warlock's Hex, keeps the old Hex (no shove). **The Magma Golem's** Magma Burst, a copy of the Wizard's
skill, keeps its own key.

**Tier skills, renamed:**
- the Fire Wizard: Greater Fireball, Delayed Blast Fireball, Fireball Barrage;
- the Warlock: Agonising Blast, Eldritch Barrage, Abyssal Blast;
- the Time Witch: Mass Slow (Time Loop and Eternity kept);
- the Great Sage: Empowered Missile, Twinned Missile, Missile Storm.

The Lightning Mage's and the Illusionist's tiers already had the design's names. The talents and the deep talent rows that name these skills use
the new names.

**The tunes:**

| Knob | Now | Was | Why |
| --- | --- | --- | --- |
| Fire Wizard, skill 2 | 8 | 2.26 | the Wall of Fire's burn |
| Fire Wizard, ultimate power | 1.6 | 1.44 | the swarm carries the lighter skill 2 at level 30 |
| Lightning Mage, skill 1 | 0.75 | 0.93 | she was +5.5 at level 10 on main, +5.9 with Storm Surge |
| Warlock, skill 1 | 0.5 | 0.59 | the shove made him +3.3 at level 1 |
| Warlock, ultimate power | 0.95 | 1.07 | the ring made it +6.3 at level 30 |
| Great Sage, skill 2 | 0.8 | 1.13 | at 0.8 Font of Magic gives about the 25 mana that Font of Wisdom gave at once |

The Circle of Death's ring does 0.3 a second where the design said 0.4. At 0.4, the level-100 party in `test/difficulty.test.ts` cleared the
Mythic Golem Forge at the first try.

## The page

- Session A's painted toolkit art shows the moves:
  - the Wall of Fire stands in its painted fire wall;
  - the blinks show its blink;
  - the shoves show its shove;
  - the launches show its launch;
  - Transposition shows its swap.
- The auras use the placeholder rings by name. Their sheets (storm cloud, mana font) are for later sessions and are not painted yet: the storm
  cloud is a blue ring, the font a violet one, the circle of death a dark one.
- A skill's lead look is its old one, kept by its key.

**Screenshots** (`tools/spells/caster-shots.mjs`, port 8920):
- `docs/samples/spells-b6-wall-*`: the Wall of Fire across the lane;
- `docs/samples/spells-b6-meteor-*`: the Meteor Swarm's first meteor, as it throws the foe at its heart.

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights; "main" is 0.252.0 in a clean checkout):

| Level | The six, main → this batch | Every hero |
| --- | --- | --- |
| 1 (stage 5) | Wizard −0.8 → −0.8, **Lightning Mage +0.4 → −0.5**, Warlock −0.5 → +0.6, Sage −0.7 → −0.8, Time Witch +1.0 → +1.1, Illusionist −4.3 → −4.2 | none beyond 6 (beyond 4: the Knight, Samurai Commander and Illusionist, as on main) |
| 10 (stage 24) | Wizard +0.3 → +2.7, **Lightning Mage +5.5 → +3.5**, Warlock +1.6 → +0.9, Sage −0.9 → −1.3, Time Witch +3.3 → +3.3, Illusionist +3.7 → +3.9 | none beyond 6 (seven beyond 4, none of the six; seven on main) |
| 30 (stage 78) | Wizard −2.3 → −1.5, Lightning Mage +2.2 → −2.1, Warlock +0.9 → 0.0, Sage +1.3 → +0.5, Time Witch −1.7 → −1.5, Illusionist −2.6 → −2.4 | none beyond 4; spread 7.2 (7.4 on main) |

**The modes:**

| Mode | This batch | Main |
| --- | --- | --- |
| Last Stand (party of eight with the Wizard; 30 greedy runs; mean, median at L10, L20, L30, L60, L100) | 8.9 (9), 10.6 (11), 14.9 (15), 18.9 (20), 22.8 (23) | 8.9 (9), 10.2 (10), 14.3 (14), 18.5 (19), 22.7 (22) |
| Calamity (150 greedy runs; mean maps cleared) | 1.41 (99/40/1/0/0/0) | 1.47 (99/46/1/0/0/0) |
| Daily (60 days) | 80% cleared | 80% (the same: the starting fives at level 1 have their old skill 1s, bar the Warlock's shove) |
| Armies on Normal (`tools/curve/run.mjs`, 24 saves; tries) | undead L8 6.7, beasts L15 2.0, wildwood L22 2.8, labyrinth L35 18.4 | 6.1, 2.1, 3.1, 17.7 |

## The proof that nothing else changed

`REWORKED` in `tools/spells/identity.ts` names the six. The five `...Others` scenarios now leave them out of every team. I recorded them on
main's code before the batch (commit 6050395), and they did not move.

These scenarios changed:
- `field1`, `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `army`, `stand`, `heroes1`, `heroes10` and `heroes30`. Each has one of the six;
  the level-1 ones have the Warlock, whose Eldritch Blast (skill 1) now shoves.

These did not move: `daily`, `tower` and `calamity`.

`ailment-logs.json` moved for `field1`, `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `army` and `stand`. Both test files say why.

Tests: `test/mages.test.ts`.
