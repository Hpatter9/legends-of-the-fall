# RPG spells, batch 7: the monster heroes

The last hero batch of the approved design v2 ([rpg-spells-design.md](rpg-spells-design.md), section 4.8), after the casters
([spells-b6.md](spells-b6.md)). It reworks ten heroes: the Kitsune, the Karasu Tengu, the Yamabushi Tengu, the Werewolf, the Minotaur, the
Satyr, the Gorgon, the Shambler, the Mummy and the Kraken Mate. Every renamed move keeps its old key, so its look, sound, ailment rider and
skill-2 check carry on. What the moves newly do is built on the movement toolkit, in `src/sim/kits/monsters.ts`. The wrap-up of all seven
batches is [rpg-spells.md](rpg-spells.md).

## The ten kits

| Hero | Skill 1 | Skill 2 | Ultimate |
| --- | --- | --- | --- |
| Kitsune | **Charm Monster** (Fox Charm), renamed | **Alter Self** (Fox Guise): she first **blinks** in fox-fire beside the strongest foe in sight within 7, then takes its shape | **Mass Polymorph** (Nine-Tailed Dream): the three strongest foes in sight within 7 become little foxes for 4 s (a fifth of their attack, silenced, slowed); a boss keeps its shape and is only weakened and silenced, for half the time |
| Karasu Tengu | **Swoop** (Dive): **blinks behind** a shooter (else the weakest foe) within 6 and strikes for double | Pilfer: now also silences its mark 1.5 s | **Cloud of Daggers** (Feather Storm): a cloud on the thickest knot of foes for 4 s (an aura, reach 1): a foe in it takes 0.8 of his attack a second and bleeds |
| Yamabushi Tengu | **Gust of Wind** (Wind Gust): the foes within 2 are **shoved 2 tiles** (was 1) | **Wind Wall** (Turning Wind): a wall of wind 3 tiles long in front of the friend a shooter aims at, for 4 s | **Tempest**: every foe within 4 is hurt, stunned 1.5 s and **launched 2 tiles** |
| Werewolf | **Pounce** (Ravage): with no foe in reach, he first **leaps** (up to 4) beside the weakest foe | **Shapechange** (Shift), renamed | Full Moon: and a **howl**: the foes within 3 are frightened 1.5 s |
| Minotaur | Gore Charge: the foe is **launched 2 tiles** (was knocked back 1) | Bull Rush (kept) | Stampede: each foe struck is **launched 2 tiles** |
| Satyr | Pipes of Pan (kept) | **Irresistible Dance** (Pied Piper), renamed | Bacchanal (kept) |
| Gorgon | Petrifying Gaze (kept) | **Flesh to Stone** (Stone Garden), renamed | **Gaze of Medusa** (Stone Curse), renamed |
| Shambler | **Contagion** (Rotting Touch): a cloud of rot round him for 6 s (an aura, reach 2): each second the foes inside are hurt and cursed, and he drinks half the harm | Devour (kept) | Plague Tide: he **burrows** to the thickest crowd within 6 and bursts out (the foe there **launched 2 tiles**), then the wave of rot curses every foe within 5 |
| Mummy | **Hold Person** (Binding Wraps): the hardest-hitting foe the wraps lash is also held still 1.5 s | **Dominate Monster** (Puppet Strings), renamed | Curse of the Pharaoh: a sand-wind first **drags** every foe within 5 a tile towards him |
| Kraken Mate | **Grasping Tentacles** (Undertow): the farthest shooter caught is **dragged all the way** to him | **Tidal Wave** (Flood): a wave down the three-wide lane with most foes (two or more) hurts each and **shoves** it 2 tiles; past them it freezes into a **Wall of Ice** 3 tiles across, for 6 s | Maelstrom: the whirlpool now **drags up to 2 tiles** (a tile more first) |

**Foes keep the old moves:** the hero's new skill 1s and ultimates go on the heroes' own kits only (`monsterKits`, called by `abilities.ts`
after the foes that borrow these kits took their own copies). That covers the wolf packs, the maze minotaurs and gorgons, the Gorgon Queen,
the grove satyrs, the yokai and the Nine-Tailed Fox. `chargeAt` has a new `launch` option for the hero's gore.

**Tier skills, renamed:**
- the Karasu: Swift Swoop, Storm Swoop (Tengu King's Descent kept);
- the Werewolf: Savage Pounce;
- the Satyr: Pan's Revel (it was "Bacchanal", the same as his ultimate);
- the Kraken Mate: Longer Tentacles (Maelstrom Tide, Abyssal Maw kept).

The other tiers already had the design's names. The talents and the deep talent rows that name these skills use the new names.

**The tunes:**

| Knob | Now | Was | Why |
| --- | --- | --- | --- |
| Karasu, skill 1 | 0.33 | 0.4 | Swoop from behind was +4 at level 1 |
| Minotaur, skill 1 | 0.5 | 0.45 | he was −5.7 at level 10 on main |
| Shambler, skill 1 | 1.8 | 0.78 | Contagion was −10 at level 1 |
| Kitsune, ultimate | rate 0.8, power 3 | 0.6, 0.71 | the polymorph is a much lighter hold than the old charm (−10.7 at level 30 untuned) |
| Karasu, ultimate power | 6 | 3.07 | the cloud cuts a second at a time (−8.6 untuned) |
| Werewolf, ultimate power | 2.3 | 3.05 | the howl (+16.7 untuned with a fear that grew with the power; it is now 1.5 s flat) |
| Shambler, ultimate power | 0.75 | 0.9 | the burrow and its launch |

## The page

- Session A's painted toolkit art shows the moves:
  - the blinks show its blink;
  - the leaps and the launches show its launch;
  - the shoves and drags show its shove and pull;
  - the burrow shows its burrow;
  - the Wind Wall and the Wall of Ice show its wind and ice walls.
- The cloud of daggers and the cloud of rot use the placeholder rings by name. Their sheets (`cloud-of-daggers`, `aura-rot`) are session B's.
- Polymorphed foes take the Kitsune's sheet for the time.

**Screenshots** (`tools/spells/monster-shots.mjs`, port 8930):
- `docs/samples/spells-b7-polymorph-*`: Mass Polymorph;
- `docs/samples/spells-b7-maelstrom-*`: the Kraken Mate's Maelstrom dragging the foes in.

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights; "main" is 0.253.0 in a clean checkout):

| Level | The ten, main → this batch | Every hero |
| --- | --- | --- |
| 1 (stage 5) | Kitsune −3.0 → −2.9, Karasu −0.3 → +1.7, Yamabushi −1.5 → +0.2, Werewolf −1.3 → −1.5, Minotaur −1.4 → −1.4, Satyr +1.0 → +1.7, Gorgon −0.7 → −1.1, Shambler −0.2 → −1.1, Mummy −0.6 → +1.0, Kraken +2.2 → +2.6 | none beyond 6 (beyond 4: the Knight, Samurai Commander and Illusionist, as on main) |
| 10 (stage 24) | Kitsune +1.7 → +1.6, Karasu −1.8 → +0.6, Yamabushi −3.2 → −2.3, Werewolf −1.8 → −2.8, Minotaur −5.7 → −5.5, Satyr +3.5 → +4.6, Gorgon −1.8 → −2.7, Shambler −0.4 → +2.3, Mummy +0.7 → +2.1, Kraken −2.4 → −0.5 | none beyond 6 (six beyond 4; seven on main) |
| 30 (stage 78) | Kitsune +2.3 → +1.1, Karasu −2.2 → +0.7, Yamabushi −0.4 → −1.5, Werewolf −0.4 → +3.3, Minotaur −2.8 → −2.8, Satyr −0.3 → +0.8, Gorgon +0.1 → −1.5, Shambler +1.2 → +2.2, Mummy −0.3 → +2.6, Kraken −3.2 → −3.3 | none beyond 4 but the Cleric (+4.2); spread 8.0 (7.2 on main) |

**The modes are as main:** the Last Stand, the Calamity, the daily and the armies' curve each came out the same to the decimal. Their parties
hold none of the ten, and their fights hash as on main.

## The proof that nothing else changed

`REWORKED` in `tools/spells/identity.ts` names the ten. The five `...Others` scenarios leave them out. I recorded them on main's code before
the batch, and they did not move.

These scenarios changed:
- `field1`, `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `army`, `heroes1`, `heroes10` and `heroes30`.

These did not move: `daily`, `tower`, `stand` and `calamity`.

`ailment-logs.json` moved for `field1`, `field30`, `bosses`, `armyFoes`, `spells`, `lands` and `army`.

**Tests:**
- new: `test/monsters.test.ts`;
- updated for the approved rework:
  - Rotting Touch's test is now Contagion's;
  - the Nine-Tailed Dream's is now Mass Polymorph's (the Nine-Tailed Fox's copy is checked to keep the charm);
  - Feather Storm's is now the Cloud of Daggers';
  - the gore now launches 2;
  - Swoop reaches 6.
