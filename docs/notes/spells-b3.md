# RPG spells, batch 3: the tanks and supports

This is the fourth batch of the approved design v2 ([rpg-spells-design.md](rpg-spells-design.md), sections 4.1 and 4.6), after the keys
and toolkit ([spells-b01.md](spells-b01.md)) and the healers ([spells-b2.md](spells-b2.md)). It reworks four tanks (the Knight, the
Paladin, the Peasant and the Juggernaut) and three supports (the Samurai Commander, the Wolf Bard and the Tyrant). Nothing outside these
seven heroes plays differently (the proof is below).

## The seven kits

A renamed skill keeps its old **key**, so its look, sound, ailment rider and skill-2 check carry on. A move that is new has a key of its
own, and borrows a look (`kitLooks.ts`) until its painting arrives. The new moves are in `src/sim/kits/tanks.ts`, and they are built on
the movement toolkit.

| Hero | Skill 1 | Skill 2 | Ultimate |
| --- | --- | --- | --- |
| Knight | **Shield Wall** (kept) | **Shield Rush** (new; it was Shield Bash): a line charge of up to 3 tiles. The foe is bashed (×1.2, stunned 1 s) and driven 2 tiles back; a slam into a wall or a fighter hurts it again. 40 stamina, 8 s. In the Last Stand he charges only as far as his post's leash. | **Indomitable** (key Last Bastion): as before, plus the allies within 2 of him take a fifth less for 6 s (an aura) |
| Paladin | **Divine Smite** (key Holy Challenge): a radiant blow on the foe beside him (×1.2; half as much again on the undead and the fiends, `smiteBane`). Then, as before, the foes within 3 must attack him for 3 s, and the allies beside him are healed. | **Aura of Protection** (new; it was Martyr's Vow): for 8 s, the allies within **3** of him take **30%** less and heal 1% of their health a second, and each shrugs off its next ailment. 60 mana, 9 s. | **Holy Nova** (key Divine Aegis): renamed |
| Peasant | **Phalanx** (key Hold the Line): renamed | **Spear Wall** (new; it was Brace Spears): a thorn wall of sharpened stakes, 3 tiles across his front, for 6 s. Foes cannot walk through it, and one beside a stake is pricked and bleeds. 40 stamina, 9 s. | **Call to Arms** (key Mass Muster): as before, plus he leads a charge of up to 3 tiles at the nearest foe (×1.5) |
| Juggernaut | **Seismic Slam** (key Earthquake): the foes beside him are **launched** 2 tiles; every foe within 3 is hurt (×0.8) and held 0.8 s | **Tunnel Strike** (new; it was Raise Rampart): he burrows to the foe within 6 with most foes round it and erupts under it. It takes ×1.6 times the skill's strength and is launched 2 tiles; the foes beside it take ×0.6 and are shoved a tile. Not when two foes are already beside him. 45 stamina, 10 s. | **Fissure** (key Cataclysm): as before, plus three rock spires (stone walls, the choke rule's line) for 6 s |
| Samurai Commander | **War Banner** (kept) | **Plant the Standard** (kept) | **Rallying Cry** (key Rally Cry): as before, plus every melee ally within 4 charges up to 2 tiles at its nearest foe (×1.2). Only the hero's copy changed: a foe that borrows the old one keeps it. |
| Wolf Bard | **Vicious Mockery** (key Dirge): renamed | **Bardic Inspiration** (key Change the Tune): renamed | **Battle Hymn** (kept): its opening chord now shoves the foes within 2 tiles 2 tiles back |
| Tyrant | **Judgement** (kept) | **Bane** (key Condemn): iron chains drag the toughest foe within 6 up to 3 tiles towards him before the mark. As before, the mark is 6 s, every hero goes for it and deals 20% more, and the mark weakens it. Now the two foes nearest it are weakened 4 s too. | **Reign of Terror** (kept) |

**Tier skills, renamed:**
- the Paladin: Searing Smite, Blinding Smite, Banishing Smite;
- the Peasant: Tight Phalanx, Shield Phalanx, Uprising;
- the Juggernaut: Heavier Slam, Seismic Wave, Earthshatter;
- the Wolf Bard: Cutting Mockery, Chorus, Moonlit Chorus.

The talents and the deep talent rows that name these skills use the new names. The Tyrant's mark now reads "Bane" on the board.

**Changes from the design's numbers, found by tuning:**
- **Aura of Protection:** 30% within 3 every 9 s (the design said 15% within 2). Martyr's Vow had carried the Last Stand: with the
  design's aura, its party of eight fell 1.3 to 1.6 waves sooner. I checked this by putting the Vow back for one run.
- **Seismic Slam:** its strength (`TUNE1`) is 0.65 (it was 0.52 as Earthquake). Its hold is shorter and its hit lighter than the
  Earthquake's, and at 0.52 the Juggernaut was −2.9 at level 1.
- **Tunnel Strike:** the eruption comes after the cast, so it carries the cast's strength (`castPower`) into the blow.

## The page

- The toolkit's painted art from session A shows these moves:
  - the Shield Rush and the charges show its dash;
  - the slams, launches and shoves show its painted impacts;
  - the Tunnel Strike shows its burrow (dig, mound and eruption);
  - the Spear Wall and the Fissure's spires show its thorn and stone walls.
- The Aura of Protection and Indomitable draw as the toolkit's aura rings until session B, the auras, is painted.
- A skill's own lead look is its old one, kept by its key. The new skill 2s borrow their old skill 2's look.

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights, as the parity tests play them; "main" is 0.249.0 in a clean checkout):

| Level | The seven, main → this batch | Every hero |
| --- | --- | --- |
| 1 (stage 5) | Knight +3.9 → +4.1, Paladin −0.5 → +0.5, Peasant +0.2 → +0.2, Juggernaut +0.4 → −1.5, Commander +4.9 → +5.4, Bard +0.1 → +0.4, Tyrant 0.0 → −0.7 | none beyond 6 (beyond 4: the Commander, the Knight, the Illusionist −4.4, the Arc Blade +4.1) |
| 10 (stage 24) | Knight +0.6 → +0.9, Paladin −0.5 → +1.9, Peasant 0.0 → +1.1, Juggernaut −2.1 → −2.3, Commander −1.2 → −1.5, Bard +4.9 → +5.0, Tyrant −2.5 → −1.2 | none beyond 6 (the Lightning Mage +5.9, +5.7 on main) |
| 30 (stage 78) | Knight −0.6 → +1.0, Paladin +1.4 → +2.2, Peasant −1.1 → +0.4, Juggernaut −1.3 → −1.5, Commander +0.4 → +2.6, Bard +0.8 → +3.4, Tyrant +1.1 → +3.5 | none beyond 4; spread 7.0 (6.6 on main) |

Two of the seven are above 4: the Samurai Commander at level 1 (+5.4) and the Wolf Bard at level 10 (+5.0). Both were there on main
(+4.9 each), and neither number comes from a skill this batch changed. The Commander's War Banner and the Bard's level-10 kit are as
they were, so I left them alone.

**The modes:**

| Mode | This batch | Main |
| --- | --- | --- |
| Last Stand (party of eight with the Knight and Paladin; 30 greedy runs; mean, median at L10, L20, L30, L60, L100) | 9.1 (9), 10.4 (10), 14.7 (15), 17.9 (19), 23.1 (22) | 9.2 (9), 10.5 (10), 15.0 (15), 18.4 (18), 24.7 (24) |
| Armies on Normal (the recruits with the Knight and Paladin; mean tries) | undead L8 6.1, beasts L15 2.0, wildwood L22 3.3, labyrinth L35 17.7 | undead L8 7.6, beasts L15 2.3, wildwood L22 3.3, labyrinth L35 19.8 |
| Calamity (150 greedy runs; mean maps cleared) | 1.44 (map shares 99/43/1/0/0/0, as main) | 1.43 |
| Daily | unchanged: the starting five are at level 1, where only the Knight's skill 1 (Shield Wall, kept) is open, so its fights hash as on main | — |

The Last Stand's targets (9, 10, 14, 20, 25) and main's means are the bar. This batch is within half a wave of main at levels 10 to 60,
and 1.6 waves short at level 100. There, a run lives or dies on a boss wave, and the medians sit on those walls.

## The proof that nothing else changed

The five `...Others` scenarios in `tools/spells/identity.ts` now leave this batch's seven heroes out of every team. I re-recorded them on
main's code before the batch (commit ee71113), and they did not move.

These scenarios changed, and each holds one of the seven:
- `field1` and `heroes1`: at level 1, where Divine Smite and Seismic Slam are skill 1;
- `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `army`, `stand`, `heroes10` and `heroes30`.

`daily`, `tower` and `calamity` did not move. `test/fixtures/ailment-logs.json` (the STATUS-FX proof) moved for the same eight it has;
both test files say why.

## Tests

- `test/tanks.test.ts` (10 tests):
  - the names and keys of all seven kits, and the foes' borrowed War Banner left alone;
  - Shield Rush;
  - Divine Smite, with its bane rule (the undead and fiends, not golems or plain orcs);
  - Aura of Protection, and none when the Paladin is alone;
  - Spear Wall's stakes and their bleed;
  - Seismic Slam's launch and hold;
  - Tunnel Strike, and its refusal when beset;
  - Bane's drag, mark and spread;
  - each ultimate's addition: the aura, the Peasant's charge, the spires, the Commander's charges and the thunderclap;
  - each new skill 2 firing in a fight from level 10.
- `test/hero-kits.test.ts`: skill 2 is now Shield Rush, and the ultimates are found by key.
- `test/spells-identity.test.ts` and `test/ailments-identical.test.ts`, as above.

## Screenshots

`node tools/spells/tank-shots.mjs` (port 8890) stages two signature moves in a real Undead fight, each with the hero's pool filled:
- the Juggernaut's Tunnel Strike, held while his mound runs under the ground;
- the Paladin's Aura of Protection.

The screenshots are `docs/samples/spells-b3-tunnel-*.png` and `docs/samples/spells-b3-aura-*.png`, at 393x852, 360x780 and 412x915.
