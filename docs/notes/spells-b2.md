# RPG spells, batch 2: the healers and the revive

This is the third batch of the approved design v2 ([rpg-spells-design.md](rpg-spells-design.md), sections 2 and 4.5), after the
fixed skill keys and the movement toolkit ([spells-b01.md](spells-b01.md)). The Cleric, the High Priestess, the Wanderer and the
Druid have their new kits, and each of them can now raise the fallen. Nothing outside these four heroes plays differently (the proof
is below).

## The four kits

Every renamed skill keeps its old **key** (`Skill.key`, batch 0), so its painting, element, sound, ailment rider and skill-2 check
carry on. The words on screen are the new names.

| Hero | Skill 1 | Skill 2 (and its revive face) | Ultimate |
| --- | --- | --- | --- |
| Cleric | **Guiding Bolt** (key Smite): renamed | **Prayer of Healing** (Benediction): renamed. Revive: **Revivify** | **Spirit Guardians** (key Divine Intervention, so the painted look carries on): an aura round her for **10 s**, reach **3** (`toolkit/auras.ts`). Foes inside take 0.35 of her attack, times the ultimate's strength, each second, and are slowed. Friends inside heal **8%** of their health, times the strength, each second. The friends inside as it rises are cleansed. It replaces Divine Intervention's heal of the whole team. The design said 8 s, reach 2 and 2%; it was tuned up for the Last Stand (below). |
| High Priestess | **Cure Wounds** (Holy Light): renamed | **Death Ward** (Guardian Angel): renamed; it now costs 55 mana (was 60). Revive: **Resurrection** | **Mass Resurrection** (Resurrection): up to **three** fallen (was two) rise at **40%** (was 50%), each once a wave. Every ally is healed and cleansed, and a **Wall of Light** (3 tiles, 5 s, the choke rule's line) rises between the foes and her friends. |
| Wanderer | **Healing Draught** (Flask Toss): renamed | **Healing Mist** (key Sanctuary): **reworked** into an aura round him for 5 s, reach 2. The friends in it are guarded (half damage) for 2 s at once, and heal 0.7 of his attack (as cast) each second. Sanctuary used to heal the whole field at once. Revive: **Elixir of Life** | **Panacea** (Dawn Light): renamed |
| Druid | **Conjure Treant** (Call Treant): renamed | **Wild Shape** (Treeform): renamed; it now costs 55 mana (was 60). Revive: **Reincarnate** | **Wall of Thorns** (Heart of the Grove): two treants and the heal as before, and a hedge of thorns 4 tiles long across the foes' way for 8 s. |

**Tier skills, renamed:**
- On Prayer of Healing: Greater Prayer, Prayer of Miracles, Saint's Prayer.
- On Healing Mist: Brighter Mist, Radiant Mist, Pilgrim's Dawn.
- On Cure Wounds: Greater Cure Wounds, Mass Cure Wounds, Celestial Choir.
- The Druid's are kept.

The talents and the deep talent rows that name these skills now use the new names.

## The revive (`src/sim/kits/revive.ts`, `heroKits.ts`)

Each healer's skill 2 has a revive face, `Slot.revive`, with the keys `Revive: Revivify`, `Revive: Resurrection`,
`Revive: Elixir of Life` and `Revive: Reincarnate`. `castHero` checks it before anything else except an ultimate the player has
queued. When `reviveReady` holds, the healer casts the revive instead of skill 2's usual effect. `reviveReady` needs all of these:
- the healer is alive, and skill 2 is open (level 10);
- it is not the Last Stand;
- the wave has fewer than two skill revives (`b.revives`);
- the healer's own 30 s (`ks.atRev`) have come round; it is ready at the start of a fight;
- the healer can pay skill 2's cost and 20 more (`reviveCost`): 80 mana for the Cleric and the Wanderer, 75 for the High Priestess
  and the Druid;
- a placed hero of its side lies fallen and has not been raised this wave (`fallenFor`).

`raiseFallen` raises the fallen hero nearest the healer (ties: the one that fell first, then the lower id):
- it rises at **30%** of its health, cleansed;
- its pool goes back to its fight-start amount and its ultimate meter is emptied;
- it cannot act or be targeted for 1 s while it gets up;
- it is added to `b.risen`, so it can be raised once a wave at most, by a revive or by Mass Resurrection.

The healing given back fills none of the healer's ultimate meter. Summons, decoys, the Standard, the Duchess and the king are never
raised. Things that stop a death (feathers, talents, Deathless, Death Ward) and a heart's revive are unchanged. The sim pushes
`revive` (`by`, `to`, `hp`) and a `heal`. No randomness.

## The page

- **A revive:** the risen hero gets up where it lay (`UnitSprite.getUp`, as with a heart), in a column of light with a burst at its
  feet, a thread of light from its healer, and the words "Revived!". The sound is the heal and a holy chime. These are pack strips
  until the painted revives arrive ([rpg-spells-art-prompt.md](rpg-spells-art-prompt.md), session C).
- **The hero bar:** skill 2's pip shows an ankh (☥, gold) while the revive is ready and a friend lies fallen.
- **Spirit Guardians and Healing Mist** draw as the toolkit's aura rings (gold for the guardians, green for the mist). The Wall of
  Light and the hedge of thorns draw as the toolkit's walls.
- **The revive faces' looks** borrow the Resurrection painting, tinted (`kitLooks.ts`; Reincarnate borrows Heart of the Grove's).

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights, as the parity tests play them; "main" was measured in a clean checkout of main):

| | The four healers | Every hero | Main, the same measure |
| --- | --- | --- | --- |
| Level 1 (stage 5) | unchanged (these fights hash as on main) | within 6 (knight +3.9, Samurai Commander +4.9, Illusionist −4.7) | the same |
| Level 10 (stage 24) | Cleric −1.6, Priestess +3.7, Wanderer +1.8, Druid +4.5 | **none beyond 6** (Lightning Mage +5.7, Minotaur −5.2) | Druid +6.1 (beyond 6), Priestess +5.4 |
| Level 30 (stage 78) | Cleric +4.3, Priestess −0.4, Wanderer −1.7, Druid +1.6 | none beyond 6; only the Cleric beyond 4; spread 6.6 | Cleric −3.4; spread 6.9 |

What was tuned:
- **Spirit Guardians**: 10 s, reach 3, 8% a second; the ultimate's `tuned` went from rate 0.58, power 1.12 to rate 1.0, power 1.0.
  With the design's first numbers and Divine Intervention's old tune, the Cleric was −15 at level 30. Tuned for parity alone, at
  power 2.2, she was within 2, but the Last Stand fell about two waves sooner.
- **Wild Shape and Death Ward**: they cost 55 (was 60), the bottom of the mana skill-2 band. That brought the Druid from +6.1 and
  the Priestess from +5.4 at level 10 into the band.

**The modes:**

| Mode | This batch | Main | Note |
| --- | --- | --- | --- |
| Last Stand (party of eight, with the Cleric; 30 greedy runs; mean, median) | L10 9.2 (9), L20 10.5 (10), L30 15.0 (15), L60 18.4 (18), L100 24.7 (24) | 9.2 (9), 10.5 (10), 15.9 (16), 19.2 (20), 25.8 (25) | Targets 9, 10, 14, 20, 25. No revives there: the gap is Divine Intervention's team heal against Spirit Guardians' ring, kept within a wave. |
| Calamity (150 greedy runs; mean maps cleared; map shares) | 1.43; 99/43/1/0/0/0 | 1.44; 99/43/1/0/0/0 | A healer joins a Calamity run only now and then. |
| Daily (60 dates; cleared with hearts / without) | 80% / 62% | the same | The daily plays the starting five at level 1, with no healer, so its fights hash as on main. Its rate sits outside 66–75% on main as well; this batch does not touch it. |
| Armies on Normal (`tools/curve/run.mjs`, the recruits with the Cleric, 24 saves; mean tries) | beasts 2.3, wildwood 3.3, labyrinth 22.3, ogres 26.0 (the cap) | 2.3, 3.3, 25.9, 26.0 | From the Labyrinth on, the late armies (LATE-RETUNE) are tuned for players who use hearts, so the curve tool, which uses none, hits its cap of 25 tries on main too. The Infernal, Yokai and Golems were 26.0 (the cap) on both. |

## The proof that nothing else changed

`tools/spells/identity.ts` has five more scenarios whose teams never hold the four healers: `field1Others`, `field30Others`,
`heroes1Others`, `heroes10Others` and `heroes30Others`. I recorded them on main's code before the batch (commit d96a54a), and they
are unchanged.

Of the old scenarios, these changed. Each has a healer at level 10 or more in it:
- `field30` (random teams at level 30);
- `bosses`, `armyFoes` and `spells` (random level-30 teams);
- `lands` (random level-10 teams);
- `stand` (the Last Stand's party of eight has the Cleric at level 30: her Spirit Guardians; no one is revived there). It moved only once
  main's new Last Stand, which falls back to the library after wave 5, was merged in;
- `army` (its parties hold the Cleric and the High Priestess);
- `heroes10` and `heroes30` (random teams).

These did not change, because they have no healer, or none at level 10 or more: `field1`, `daily`, `tower`, `calamity` and
`heroes1`. `test/fixtures/spells-identity.json` was re-recorded with only those nine changed hashes.

## Tests

- `test/revive.test.ts` (13 tests):
  - only the four healers have a revive face;
  - the revive's whole effect, with its cost of 80;
  - none below level 10, and none when the healer cannot pay;
  - the 30 s clock;
  - once per ally per wave, and two a wave across healers;
  - none in the Last Stand, and never a summon or decoy;
  - the revive is the first choice and fills no meter;
  - Mass Resurrection's three at 40%, the once-a-wave rule and its Wall of Light;
  - Spirit Guardians' heal and harm, only within its reach;
  - Healing Mist's guard and heal, only within 2;
  - Wall of Thorns' treants and thorns;
  - the same staged revive ending the same way every time.
- `test/skill-keys.test.ts`: the healers' renamed skills keep their old keys. The look tests (`signatures`, `hero-kits-looks`,
  `individual-ability-fx`) now look skills up by key.
- `test/spells-identity.test.ts`: as above.

## Screenshots

`node tools/spells/healer-shots.mjs` (port 8850) stages a revive (the knight falls; the Cleric, her pool full, raises him) and Spirit
Guardians (the Cleric's meter filled) in a real Undead fight:
- `docs/samples/spells-b2-revive-393x852.png`
- `docs/samples/spells-b2-guardians-393x852.png`

They are also taken at 360x780 and 412x915.
