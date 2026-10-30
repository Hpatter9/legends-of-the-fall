# RPG spells: the wrap-up

Design v2 ([rpg-spells-design.md](rpg-spells-design.md)) gave every one of the 45 heroes RPG-style spells and battlefield moves. It was built in
seven batches. The paintings and sounds (batch 8) and a full rebalance (batch 9) are still to come.

| Batch | What | Release | Notes |
| --- | --- | --- | --- |
| 0 and 1 | Fixed skill keys; the movement toolkit (charge, blink, teleport slash, pull, shove, launch, burrow, walls, auras, swap) | 0.243.0 | [spells-b01.md](spells-b01.md) |
| 2 | The healers and the revive | 0.249.0 | [spells-b2.md](spells-b2.md) |
| 3 | The tanks and supports | 0.250.0 | [spells-b3.md](spells-b3.md) |
| 4 | The melee heroes | 0.251.0 | [spells-b4.md](spells-b4.md) |
| 5 | The ranged heroes and summoners | 0.252.0 | [spells-b5.md](spells-b5.md) |
| 6 | The casters | 0.253.0 | [spells-b6.md](spells-b6.md) |
| 7 | The monster heroes | (this branch) | [spells-b7.md](spells-b7.md) |

**Each renamed move keeps its old name as its key.** That key is what its look, sound, ailment rider and skill-2 check go by.

**The foes that borrow a hero's move keep the old one**, through their own copies:
- the yokai;
- the wolf packs;
- the maze minotaurs and gorgons;
- the Gorgon Queen;
- the grove satyrs;
- the Nine-Tailed Fox;
- the Yokai Witch;
- the Magma Golem.

The fight-hash proof (`test/spells-identity.test.ts`) showed, batch by batch, that nothing outside a batch's heroes changed.

## All 45 kits, and the final parity

Each hero's lift over the roster average in win rate, in points, with every batch in. It comes from `node tools/kits/tune.mjs`: 12,000
fights at level 1 (stage 5), level 10 (stage 24) and level 30 (stage 78). The bar is 6 points; every batch aimed for 4.

| Hero | Batch | Skill 1 | Skill 2 | Ultimate | L1 | L10 | L30 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Knight | 3 | Shield Wall | Shield Rush | Indomitable | +5.0 | 0.0 | +0.2 |
| Samurai | 4 | Iaido | Riposte | Issen | −0.1 | −3.1 | +0.3 |
| Kunoichi | 4 | Sneak Attack | Smoke Bomb | Assassinate | +1.2 | −1.1 | +0.8 |
| Archer | 5 | Volley | Aimed Shot | Hail of Arrows | −1.1 | +0.6 | −0.7 |
| Fire Wizard | 6 | Fireball | Wall of Fire | Meteor Swarm | −1.4 | +2.2 | −1.9 |
| Peasant | 3 | Phalanx | Spear Wall | Call to Arms | −0.7 | +0.5 | −0.6 |
| Ninja Monk | 4 | Flurry of Blows | Quivering Palm | Hundred-Hand Strike | −1.6 | −2.8 | −0.7 |
| Wanderer | 2 | Healing Draught | Healing Mist | Panacea | −1.0 | +1.4 | −3.9 |
| Lightning Mage | 6 | Chain Lightning | Storm Surge | Call Lightning | −0.7 | +3.4 | −2.4 |
| Kitsune | 7 | Charm Monster | Alter Self | Mass Polymorph | −2.9 | +1.6 | +1.1 |
| Karasu Tengu | 7 | Swoop | Pilfer | Cloud of Daggers | +1.7 | +0.6 | +0.7 |
| Yamabushi Tengu | 7 | Gust of Wind | Wind Wall | Tempest | +0.2 | −2.3 | −1.5 |
| Werewolf | 7 | Pounce | Shapechange | Full Moon | −1.5 | −2.8 | +3.3 |
| Minotaur | 7 | Gore Charge | Bull Rush | Stampede | −1.4 | −5.5 | −2.8 |
| Satyr | 7 | Pipes of Pan | Irresistible Dance | Bacchanal | +1.7 | +4.6 | +0.8 |
| Gorgon | 7 | Petrifying Gaze | Flesh to Stone | Gaze of Medusa | −1.1 | −2.7 | −1.5 |
| Samurai Commander | 3 | War Banner | Plant the Standard | Rallying Cry | +4.6 | −2.3 | +2.9 |
| Paladin | 3 | Divine Smite | Aura of Protection | Holy Nova | +0.7 | +0.7 | +0.4 |
| Cleric | 2 | Guiding Bolt | Prayer of Healing | Spirit Guardians | +0.8 | −1.0 | +4.2 |
| Druid | 2 | Conjure Treant | Wild Shape | Wall of Thorns | +0.1 | +3.9 | +0.3 |
| Barbarian | 4 | Whirlwind | Rage | Berserker Leap | −0.4 | +2.1 | +1.4 |
| Ranger | 5 | Snare | Spike Growth | Entangle | −0.1 | +2.3 | −2.8 |
| Warlock | 6 | Eldritch Blast | Drain Life | Circle of Death | +0.4 | +2.4 | +0.3 |
| Illusionist | 6 | Mirror Image | Transposition | Hall of Mirrors | −4.6 | +3.4 | −2.5 |
| Gunslinger | 5 | Piercing Shot | Fan the Hammer | High Noon | −1.1 | −0.3 | +1.7 |
| Shambler | 7 | Contagion | Devour | Plague Tide | −1.1 | +2.3 | +2.2 |
| Rifle Bot | 5 | Rapid Shot | Suppressing Fire | Overclock | +0.8 | +0.9 | +1.4 |
| Mercenary | 4 | Ambush | Hunter's Mark | Killing Spree | +0.8 | −5.5 | +0.9 |
| Mummy | 7 | Hold Person | Dominate Monster | Curse of the Pharaoh | +1.0 | +2.1 | +2.6 |
| Buccaneer | 4 | Grappling Hook | Loaded Dice | Keelhaul | −1.4 | −3.4 | −2.6 |
| Wolf Bard | 3 | Vicious Mockery | Bardic Inspiration | Battle Hymn | 0.0 | +5.9 | +1.0 |
| Beastmaster | 5 | Summon Beast | Pack Tactics | Conjure Animals | −0.9 | +1.4 | −3.1 |
| Kraken Mate | 7 | Grasping Tentacles | Tidal Wave | Maelstrom | +2.6 | −0.5 | −3.3 |
| Lancer | 4 | Charge | Disengage | Cavalry Charge | −0.9 | −1.4 | +0.5 |
| Reaper | 5 | Reap | Animate Dead | Harvest of Souls | −0.7 | +0.8 | +1.5 |
| Time Witch | 6 | Slow | Rewind | Time Stop | +1.3 | +2.5 | −0.6 |
| Arc Blade | 4 | Thunder Step | Thunderwave | Lightning Storm | +3.1 | +0.8 | +0.1 |
| Dread Pirate | 5 | Cannonade | Powder Keg | Ghost Fleet | −0.8 | −1.3 | −2.0 |
| Siege Bot | 5 | Bombard | Siege Mode | Orbital Strike | +2.4 | −2.0 | −2.1 |
| High Priestess | 2 | Cure Wounds | Death Ward | Mass Resurrection | −0.9 | +4.3 | +1.4 |
| Queen Dragoon | 4 | Dragon Breath | Dragon Dive | Inferno Breath | +0.1 | −3.8 | +0.3 |
| Juggernaut | 3 | Seismic Slam | Tunnel Strike | Fissure | −1.9 | −1.1 | +0.7 |
| Great Sage | 6 | Magic Missile | Font of Magic | Arcane Surge | −0.2 | −1.2 | +0.4 |
| Demon Swordsman | 4 | Cleave | Blood Pact | Metamorphosis | +1.7 | −4.5 | +0.6 |
| Tyrant | 3 | Judgement | Bane | Reign of Terror | −1.6 | −2.2 | +2.9 |

**The roster as a whole:**
- **Level 1:** average 54.1%, spread 9.6; none beyond 6. The Knight (+5.0), Samurai Commander (+4.6) and Illusionist (−4.6) are beyond 4, as
  they were before the rework.
- **Level 10:** average 35.9%, spread 11.4; none beyond 6. Six are beyond 4: the Minotaur, Satyr, Mercenary, Wolf Bard, High Priestess and
  Demon Swordsman. The Minotaur and Mercenary were beyond 5 before the rework too.
- **Level 30:** average 55.6%, spread 8.0; none beyond 4 but the Cleric (+4.2).

**The modes after batch 7:**
- **Last Stand** (the guard of eight, mean wave): 8.9, 10.6, 14.9, 18.9 and 22.8 at levels 10, 20, 30, 60 and 100.
- **Calamity:** 1.41 maps cleared on average.
- **Daily:** 80% cleared.
- **Armies' curve:** each a step or two of where it was before the rework.

Batch 9, the full rebalance, is where the roster's spread at level 10 and the global knobs get their look.

## What still waits on art

The moves draw the painted sheets that have landed. Until a sheet lands, its move plays its old FX-003 cell, a pack strip or a placeholder
ring (design section 6.2; the brief is [rpg-spells-art-prompt.md](rpg-spells-art-prompt.md)).

| Session | Sheets | Status | What waits on it |
| --- | --- | --- | --- |
| A. The toolkit | 15 | **in** (`src/art/fx/spells/`, `a-toolkit`) | none: dash, blink, teleport slash, pull, shove, launch, slam, burrow, swap and the six walls are painted |
| B. Auras and fields | 10 | waiting | Aura of Protection, Spirit Guardians, the Shambler's rot, the Lightning Mage's storm cloud, the Great Sage's mana font, Healing Mist, Cloud of Daggers, Slow, Spike Growth, the bard's notes: placeholder rings for now |
| C. Healers and revives | 10 | **in** (`c-healers`) | none |
| D. Casters' spells | 12 | waiting | Fireball, Meteor Swarm, Magic Missile, Eldritch Blast, Drain Life, Circle of Death, Thunderwave, Time Stop, Polymorph, Hunter's Mark, Bane, Mockery |
| E. Martial and monster moves | 15 | waiting | Issen, Sneak Attack, Flurry of Blows, Quivering Palm, Berserker Leap, Rage, Cleave, Riposte, Grappling Hook, Dragon Dive, Seismic Slam, Pounce, the tentacles, Tidal Wave, the keg blast |
| F. More martial and ranged moves | 30 | waiting | the tanks', blades' and shooters' other moves |
| G. More spells and monster moves | 39 | waiting | the casters', healers', callers' and monsters' other moves |

The sounds of design section 6.4 wait with the paintings (batch 8). The moves play their keyed sounds from before.
