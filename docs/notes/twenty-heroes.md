# Twenty New Heroes & The 3-Skill Engine Expansion

## Overview

This expansion introduces **20 new heroes** to *Legends of the Last Keep*, expanding the playable roster from 45 to **65 heroes**:
- **15 heroes** round out the 12 existing Origins (`samurai`, `knightly`, `mystic`, `yokai`, `wild`, `arcane`, `frontier`, `undead`, `machine`, `royal`, `holy`, `pirate`) so that each has **5 heroes**.
- **5 all-new heroes** introduce the **Vampire** Origin (`vampire`), also providing a full 5-hero team.
- The 13 Classes (`blade`, `trickster`, `marksman`, `guardian`, `caster`, `beast`, `warden`, `assassin`, `vanguard`, `support`, `gunner`, `arcanist`, `bulwark`) now contain **5 heroes each** (13 Origins × 5 = 65 heroes; 13 Classes × 5 = 65 heroes).

## The Roster

| Hero ID | Name & Epithet | Origin | Class | Pool | Signature Moves |
|---|---|---|---|---|---|
| `vampireLord` | Vladislav, Lord of Sanguis | Vampire | Blade | Stamina | Crimson Lunge, Blood Tithe, Bat Swarm, Red Eclipse |
| `hemomancer` | Carmilla, Mistress of Veins | Vampire | Caster | Mana | Blood Lance, Transfusion, Sanguine Barrier, Crimson Torrent |
| `nightstalker` | Morbius, Stalker of the Crypt | Vampire | Assassin | Stamina | Shadow Step, Exsanguinating Slash, Mist Form, Blood Hunt |
| `bloodGargoyle` | Malakor, Crimson Perch | Vampire | Bulwark | Stamina | Stone Dive, Sanguine Shell, Gargoyle's Roar, Crimson Bastion |
| `dhampir` | Alistair, The Twilight Walker | Vampire | Trickster | Stamina | Silver & Blood, Cursed Stakes, Midnight Riposte, Judgement of Dusk |
| `warDrummer` | Kaelen, Thunder of the March | Wild | Support | Stamina | War Cadence, Resonant Pulse, Thunderous Roar, Battle Hymn of the Wilds |
| `banneret` | Sir Valerius, The High Standard | Knightly | Vanguard | Stamina | Standard Charge, Rampart Drop, Stand Fast, Banner of Unbroken Light |
| `geomancer` | Toren, Shaper of the Crags | Arcane | Bulwark | Mana | Tectonic Pillar, Earth Surge, Stone Shield, Cataclysmic Tremor |
| `bellWarden` | Domina Lyra, Keeper of Tolls | Holy | Warden | Mana | Toll of Cleansing, Resonant Ward, Chime of Judgment, The Seventh Toll |
| `falconer` | Corvus, Eye of the Moor | Frontier | Marksman | Stamina | Raptor Strike, Hunter's Whistle, Snare & Talon, Storm of Talons |
| `astralSphinx` | Khepri, Eternal Riddler | Mystic | Arcanist | Mana | Stellar Spiral, Cosmic Riddle, Starfall Ward, Celestial Alignment |
| `mirageDancer` | Zahra, Silk of the Dune | Frontier | Trickster | Stamina | Shifting Sands, Dervish Whirl, Dune Phantasm, Dance of a Thousand Veils |
| `plagueDoctor` | Corvus Thorne, The Black Mask | Undead | Support | Mana | Miasma Flask, Leech Therapy, Quarantine Cloud, Contagion Ward |
| `bombardier` | Ignis Cog, The Iron Bombardier | Machine | Gunner | Stamina | Concussion Mortar, Blast Leap, Blast Shielding, Rolling Thunder Artillery |
| `astrologer` | Celeste, Reader of the Heavens | Arcane | Caster | Mana | Retrograde Orbit, Moonfall Blessing, Zodiac Seal, Supernova Conjunction |
| `inquisitor` | Brand of Sunwatch | Holy | Assassin | Stamina | Censure Dash, Heretic's Brand, Blinding Pyre, Absolute Inquest |
| `seraph` | Auriel, Blade of Dawn | Royal | Blade | Mana | Radiant Thrust, Wings of Dawn, Pillar of Glory, Heaven's Descent |
| `corsairSurgeon` | 'Sawbones' Jack | Pirate | Warden | Stamina | Sawbones Cut, Grappling Extraction, Scurvy Draught, Crimson Dispensary |
| `harpooner` | Finnian the Iron Hook | Pirate | Marksman | Stamina | Harpoon & Drag, Anchor Slam, Net Toss, Leviathan's Grapple |
| `seaReaver` | Bartholomew, Scourge of Tides | Pirate | Vanguard | Stamina | Tidal Cleave, Boarding Vault, Iron Grog, Kraken's Fury |

## 3-Skill Engine & Level Gates

Fighters now command 3 Active Skills alongside their Ultimate:
1. **Skill 1 (`s1`)**: Unlocked at level 1. Core ability defining role and basic cadence.
2. **Skill 2 (`s2`)**: Unlocked at level 10 (`SKILL2_LEVEL = 10`). Deepens tactical versatility.
3. **Skill 3 (`s3`)**: Unlocked at level 20 (`SKILL3_LEVEL = 20`). Advanced positioning, displacement, or crowd control.
4. **Ultimate (`ult`)**: Unlocked at level 30 (`ULT_LEVEL = 30`). High-impact turning point.

### Cast Order & AI Priority
When readiness triggers (`charge >= cost`), heroes evaluate ready skills in priority order `[3, 2, 1]`, with specific smart targeting overrides (e.g. prioritizing ally-saving heals or displacement walls when team-mates are under threat).

### HUD Integration
- **Combat Screen (`src/fightHud.ts`)**: Renders a 3-chip cooldown layout (`.fhChips.three`) displaying current recovery progress and cost readiness for each slot.
- **Hero Dossier & Codex (`src/fightHud.ts`, `src/codexView.ts`, `src/menuHeroes.ts`)**: 4-tab panel (`.fsTabs.four`) showcasing Skill 1, Skill 2, Skill 3, and Ultimate descriptions with unlock level cues.

## Movement Mechanics (`src/sim/kits/twentyNew.ts`)

Every kit leverages the deterministic tactical movement toolkit:
- **Charges & Dashes**: `standardCharge`, `censureDash` propel heroes directly along walkable paths to impact distant targets and disrupt formations.
- **Leaps & Vaults**: `stoneDive`, `rampartDrop`, `blastLeap`, `boardingVault` bypass terrain and obstacles to reposition fighters.
- **Blinks & Teleports**: `shadowStep`, `shiftingSands` instantly reposition without path traversal.
- **Swaps & Extractions**: `grapplingExtraction` swaps places with an ally at risk and leaves an anchoring snare behind.
- **Tethers & Harpoons**: `harpoonDrag`, `anchorSlam` pull distant targets to the hero or fling foes into obstacles.
- **Walls & Zones**: `sanguineBarrier`, `rampartDrop`, `tectonicPillar`, `quarantineCloud` dynamically shape the battlefield.

## Vampire Origin & Trait Bonuses

- **Origin Trait (`vampire`)**:
  - **(2) Vampire**: Blows leech 6% of damage dealt as health.
  - **(4) Vampire**: Blows leech 12% of damage dealt, +6% attack.
  - **(5) Vampire**: Blows leech 18% of damage dealt, +14% attack, and a Vampire brought low bursts into a swarm of bats (`vampireSwarm`) to mend once per fight.
- **5-Hero Tiers across all Traits**:
  Every Origin and Class now features a powerful 5-piece bonus tier (`need: 5`).
- **Last Oath Combo: The Crimson Court (`bloodCourt`)**:
  Assembling 4 or more Vampire heroes activates the 9th Last Oath combo. When charged, a blood moon eclipses the board: foes take massive damage and bleed for 4 seconds, while allies recover 25% max health and gain 4 seconds of haste.

## Art Assets

All imagery was produced and packed into production-grade atlases with no code-drawn art:
- **Battle Sprites (`src/art/units/`)**: 20 pairs of front and rear sprite sheets (`hero_res_<id>.png` and `hero_res_<id>_back.png`, 592×707), featuring complete 8-frame walk cycles, idle, attack, hurt, and death frames.
- **Awakened Battle Sprites (`src/art/awakened/`)**: 20 pairs of awakened equipment front and rear battle sheets (`awakened_<id>.png` and `awakened_<id>_back.png`, 608×812).
- **Hero Illustrations & Cutouts (`src/art/heroes/`)**: 20 full-body WebP illustrations (1024×1536), 20 portrait cutouts (640×960), and 20 awakened equipment icons (596×560).
- **Painted FX Atlases (`src/art/fx/abilities/`)**: `atlas-8.png`, `atlas-9.png`, and `atlas-10.png` (768×768) with 169 registered entries in `catalogue.json`.
- **Vampire Spell FX Atlas (`src/art/fx/spells/v-vampire.webp`)**: 16-part spell animation atlas (1536×768) registered in `tools/spell-fx/spell-parts.json`.
