# Twenty heroes: bringing the owner's branch onto main

The owner's branch `feat/twenty-heroes-vampire` adds twenty heroes (five of a new Vampire origin, fifteen across the old origins), Vampire
traits and a ninth Last Oath. It was cut from 0.262.0, so it is not merged: it is read from, and each piece is rebuilt on main's systems in
batches. The audit and the director's decisions are in [twenty-heroes-audit.md](twenty-heroes-audit.md); the prompts for the art the heroes
still need, and the battle-frame packer (`tools/heroes-20/pack-sheets.py`), in [twenty-heroes-art-prompts.md](twenty-heroes-art-prompts.md).

## Coming heroes: in the fights, not yet in the roster

A batch may land with its kits tested while its heroes wait for their battle sheets (the director's decision 5). Such a hero is a **coming
hero**: a fight can field it, but the roster, the page, the unlocks and the roster's own rules do not see it yet. Each table a fight reads has
a coming twin, looked up after the roster's:

| What | The roster's | The coming twin | Read through |
| --- | --- | --- | --- |
| The hero list | `ALL_HEROES` | `COMING_HEROES` (`units.ts`) | (the unit defs are in `UNITS` already) |
| Origin and class | `HERO_TRAITS`, `TRAITS` | `COMING_HERO_TRAITS`, `COMING_TRAITS` (`traits.ts`) | `traitsOf`, `traitById`, `countTraits` |
| Last Oaths | `COMBOS` | `COMING_COMBOS` (`combos.ts`) | `comboOf`, `comboById`, `readCombosSeen` |
| Skill 1, passive, ultimate | `KITS` | `comingKits()` (`kits/coming.ts`) | `kitOf` |
| The three slots | `HERO_KITS()` | `comingHeroKits()` (`kits/coming.ts`) | `heroKitOf`, `poolNumbers` |
| D&D scores | `STAT_PROFILES` | `COMING_ROWS` (`stats.ts`) | `profileOf` |

So the roster's rules (every trait two to four heroes, five to eight Last Oaths, every combo hero in `ALL_HEROES`, every skill painted,
45 kits) stay exactly as they are, and no test was changed. When a hero's sheets arrive it **joins**: its rows move from the coming tables
into the roster's, it goes into `ALL_HEROES`, and the counts the roster's tests hold move with it as an owner-approved change (the Vampire
origin's five members, the ninth Oath, 50 heroes, and so on), together with everything the page needs (names, lore, quips, the codex, the
tavern, the shop, books and talents).

## Batch 0: the Vampire origin and the Crimson Court

(As first brought over. Since the review the 5 tier is leech 15% and +10% attack, and the Oath is the Night Kin: see [The review's rework](#the-reviews-rework).)

- **The Vampire origin** (`COMING_TRAITS.vampire`), tiers at two, four and five (the director's decision 2; every other trait keeps its
  rules): blows leech 6%; 12% and +6% attack; 18%, +14% attack and the bat swarm. The leech is a team bonus, as every trait's is: every
  hero's blows drink it (`TraitEffects.leech`, read in `afterBlow`; a foe's do not).
- **The bat swarm** (`TraitEffects.vampireSwarm`, in `hurt()` beside the Trickster's log): a blow that leaves a Vampire under 30% health,
  not a fatal one, bursts it into bats once a fight: it mends 15% of its health and comes together on the free tile within 2 farthest from
  the foes (if one is farther than where it stood; ties by row, then column). No stream is drawn.
- **The Crimson Court** (`COMING_COMBOS`, decision 3), the five Vampires' Last Oath, *Eternal Eclipse*: every foe is struck (0.65 of the
  five's attack) and bleeds 4s, the five drink back a quarter of their health, every ally is hastened 4s. The tone is the Dread Court's
  (`dark`) until it has a look of its own.
- `test/vampires.test.ts`: the five wait outside the roster; the tiers; the leech for heroes and not foes; the swarm (once, not on a fatal
  blow, Vampires only, the same tile every time); the Court forms with all five, fills, lands, and the living foes bleed.

## Batch 1: the Vampires' kits

(The batch tables below are the kits as first brought over; the kits now are in [The review's rework](#the-reviews-rework).)

`src/sim/kits/vampires.ts` holds the five's casts and rows (`vampireRows`; `kits/comingRow.ts` is a row's shape, and `kits/coming.ts` builds every
batch's rows into kits), brought from the branch's `kits/twentyNew.ts` (they compiled against main's toolkit and
ailments unchanged), and their kits in main's skill system: a pool, three slots with a class, cost and cooldown in their class's range, and
an ultimate at level 30. The branch's own 3-skill engine is not used: main's is the owner-approved one.

| Hero | Pool | Skill 1 | Skill 2 | Skill 3 | Ultimate |
| --- | --- | --- | --- | --- | --- |
| Vampire Lord (Vladislav) | stamina | Crimson Lunge (strike 24, 7 s) | Impaling Thrust (heavy 30, 11 s) | Mist Step (jab 10, 4 s) | Red Eclipse |
| Hemomancer (Carmilla) | mana | Sanguine Lash (strike 36, 7 s) | Blood Chalice (utility 42, 14 s; a heal, waits for a friend under 40%) | Crimson Mist (guard 30, 15 s: she under 35% with a foe within 2) | Exsanguinate |
| Nightstalker (Sorin) | stamina | Dusk Dive (strike 24, 7 s) | Abduct (heavy 30, 11 s) | Echolocation (utility 22, 14 s) | Midnight Hunt |
| Blood Gargoyle (Gavril) | stamina | Gargoyle Crash (strike 26, 7 s) | Stone Slumber (utility 26, 16 s) | Wing Buffet (guard 16, 14 s: a friend within 3 under 40% with a foe beside it) | Cathedral Perch |
| Dhampir (Klara) | stamina | Silver Stake (strike 24, 7 s) | Grapple Vault (guard 16, 14 s: a foe within 2) | Consecrated Trap (utility 22, 16 s) | Judgement of Dusk |

- Each guard's cast checks its own trigger, as `kits/third.ts`'s do. The passives are the branch's (Noble Thirst, Chalice Overflow, Predator
  of the Crypt, Granite Hide, Half-Blood Hunter); the D&D rows are new (`COMING_ROWS`).
- **Not yet tuned.** The slots' strengths are the roster's defaults (`COMING_TUNE` in `kits/coming.ts`: 0.5 or 0.7, 1 and 0.8) and the ultimates' knobs are
  the branch's. The hero sweep and its tuner (`tools/kits/tune.ts`, `test/hero-balance*.test.ts`) read `ALL_HEROES`, so the five are tuned
  when they join, in the same change.
- `test/vampire-kits.test.ts` holds the roster's rules on the five (since batch 2 the checks are in `test/comingKits.ts`, run by each
  batch's test file with its five): the class ranges, heavy dearest and jab cheapest, demand 1.4 to 3.5 of
  each one's own income, a jab under its income; every skill and ultimate cast in a scene; a guard cast only in its case; the slots opening
  at 1, 10, 20 and 30; and four long fights of the five where every skill and ultimate comes round, the first played twice the same.

## Batch 2: the War Drummer, the Banneret, the Geomancer, the Bell Warden and the Falconer

`src/sim/kits/wave2.ts` holds their casts (from the branch, unchanged but for an event: Sanctuary Vault now shows its shield as the roster's
shields do, a heal of nothing on the friend) and their rows; their unit defs, traits (Samurai Support, Knightly Warden, Mystic Bulwark,
Yokai Bulwark, Wild Marksman: roster traits, which they count for in a fight but are not yet members of) and D&D rows wait beside the
Vampires'.

| Hero | Pool | Skill 1 | Skill 2 | Skill 3 | Ultimate |
| --- | --- | --- | --- | --- | --- |
| War Drummer (Raiden) | stamina | Thunder Beat (strike 24, 7 s) | Marching Cadence (utility 26, 16 s) | Resonant Leap (utility 22, 18 s) | Storm of Ten Thousand Drums |
| Banneret (Isolde) | stamina | Standard Charge (strike 24, 7 s) | Rampart Drop (guard 16, 14 s: a friend within 3 under 40% with a foe beside it) | Phalanx Sweep (heavy 30, 12 s) | Oriflamme of the Keep |
| Geomancer (Tenzin) | mana | Tectonic Shove (strike 36, 7 s) | Earthglide (heavy 46, 12 s) | Lodestone Pull (utility 36, 14 s) | Mountain's Embrace |
| Bell Warden (Kavi) | stamina | Bronze Slam (strike 26, 7 s) | Echoing Toll (heavy 30, 11 s) | Sanctuary Vault (guard 16, 14 s: a friend within 4 under 40% with a foe beside it) | Midnight Knell |
| Falconer (Aisling) | stamina | Falcon Stoop (strike 24, 6 s) | Gale Vault (guard 14, 12 s: she under 35% with a foe within 2) | Talon Snare (heavy 30, 11 s) | Sky Hunt |

Not yet tuned, as the Vampires. `test/wave2-kits.test.ts`: the roster's kit rules (`test/comingKits.ts`), and that the five wait outside
the roster while counting for their traits in a fight.

## Batch 3: the Astral Sphinx, the Mirage Dancer, the Plague Doctor, the Bombardier and the Astrologer

`src/sim/kits/wave3.ts`, as batch 2 (traits Arcane Beast, Frontier Trickster, Undead Arcanist, Machine Gunner, Royal Arcanist). Two
changes to the branch: Constellation Swap shows its shields as wards (a heal of nothing), as Sanctuary Vault does; and the Bombardier's
Blast Jump is his guard, not his skill 1. As a skill 1 it waited for a foe within 5, but he fights from range and leaps clear, so in four
long fights it never came round; its job is the escape, so it fires when a foe comes within 2, and Concussion Mortar is his skill 1. The
Astrologer is "Astrologer" (the branch's "Grand Astrologer"), the canon's Cyra; the Sphinx is the canon's Nenet, a lioness.

| Hero | Pool | Skill 1 | Skill 2 | Skill 3 | Ultimate |
| --- | --- | --- | --- | --- | --- |
| Astral Sphinx (Nenet) | mana | Rift Pounce (strike 36, 7 s) | Riddle of Repulsion (heavy 44, 11 s) | Constellation Swap (guard 30, 15 s: a friend within 5 under 40% with a foe beside it) | Celestial Convergence |
| Mirage Dancer (Zahara) | stamina | Whirling Veils (strike 24, 7 s) | Dune Swap (heavy 30, 11 s) | Sirocco Leap (utility 22, 16 s) | Dance of Seven Mirages |
| Plague Doctor (Corvus) | mana | Censer Swing (strike 36, 7 s) | Crow Step (utility 40, 14 s; a heal, waits for a friend under 40%) | Quarantine Line (utility 34, 16 s) | Black Miasma |
| Bombardier (Soren) | stamina | Concussion Mortar (strike 24, 7 s) | Blast Jump (guard 16, 12 s: a foe within 2) | Firebomb Line (utility 22, 16 s) | Carpet Bombardment |
| Astrologer (Cyra) | mana | Gravity Well (strike 36, 7 s) | Retrograde Orbit (guard 30, 14 s: she under 35% with a foe within 2) | Starlight Bridge (utility 40, 18 s) | Supernova Alignment |

**For the tuning when they join:** with the branch's knobs (rate 0.9) the Bombardier's Carpet Bombardment came round every 1.5 to 2.5 s in
a long fight at level 30 (its four shells refill his meter), starving his skills of the turn. Its rate must come down in the tuning pass.
`test/wave3-kits.test.ts`: the roster's kit rules, the five waiting, their traits in a fight, and the beasts still the roster's four.

## Batch 4: the Inquisitor, the Seraph, the Corsair Surgeon, the Harpooner and the Sea Reaver

`src/sim/kits/wave4.ts`, as the others (traits Holy Arcanist, Holy Guardian, Pirate Support, Pirate Gunner, Pirate Vanguard). With it all
twenty heroes wait as coming heroes. Changes to the branch:

- **The two new healers' revives sit on skill 2**, as main's do (`castRevive` reads skill 2's `revive` face): on the branch the Seraph's
  hung on Sanctuary Wings and the Corsair Surgeon's on his skill 3, where main would never cast it. So each one's heal is its skill 2
  (Mercy's Ascent, Sawbones Triage) with its face (Reliquary Grace, Smelling Salts, written as `kits/revive.ts` writes the four), and
  Sanctuary Wings is the Seraph's skill 3. The roster still has its four healers (`test/revive.test.ts`); these two join with their batch.
- **Grappling Extraction hooks a friend, never himself**: the branch picked the most at-risk fighter, which could be the Surgeon, and then
  did nothing. Its trigger and its target are now a friend within 4.
- The Seraph is "Seraph" (the branch's "Reliquary Seraph"), the canon's Gabriela.

| Hero | Pool | Skill 1 | Skill 2 | Skill 3 | Ultimate |
| --- | --- | --- | --- | --- | --- |
| Inquisitor (Soraya) | mana | Chains of Judgement (strike 36, 7 s) | Blazing Edict (utility 36, 16 s) | Purging Scales (guard 30, 15 s; a heal: a friend within 5 under 40%) | Solar Tribunal |
| Seraph (Gabriela) | mana | Halo Dive (strike 36, 7 s) | Mercy's Ascent (utility 42, 14 s; a heal; revive: Reliquary Grace) | Sanctuary Wings (utility 34, 16 s) | Descent of the Host |
| Corsair Surgeon (Tariq) | mana | Boarding Swing (strike 36, 7 s; mends) | Sawbones Triage (utility 40, 12 s; a heal; revive: Smelling Salts) | Grappling Extraction (guard 30, 15 s: a friend within 4 under 40% with a foe beside it) | Crimson Dispensary |
| Harpooner (Siku) | stamina | Barbed Harpoon (strike 24, 7 s) | Floe Slide (utility 22, 16 s) | Whaler's Reel (heavy 30, 11 s) | Leviathan Line |
| Sea Reaver (Nakoa) | stamina | Breaker Rush (strike 24, 7 s) | Anchor Slam (heavy 32, 12 s) | Riptide Undertow (utility 22, 16 s) | Wrath of the Reef |

`test/wave4-kits.test.ts`: the roster's kit rules, the five waiting (and all twenty), their traits in a fight, and both revives raising
the nearest fallen friend at 30% from level 10.

## The review's rework

The review ([twenty-heroes-review.md](twenty-heroes-review.md)) found the twenty stronger, faster and busier than the roster, short of
jabs, and repeating a few moves; the director asked for its fixes to be folded in. What changed:

- **Numbers inside their classes.** Each hero's health, attack, defence, walk, blow time and damage a second now sit inside the spread of
  the roster heroes of its class (`test/coming-stats.test.ts`). The shooters walk at 650 to 700 ms, not 580 to 680. The Blood Gargoyle and
  the Seraph walk (only the Strigoi and the Astral Sphinx keep their wings), the Geomancer holds the line in melee, and the Bell Warden is
  a Fighter in his heavy bronze, not a Monk.
- **One passive effect each, and none a roster passive over again** (the same test): the Gargoyle's front block 30%, the War Drummer's
  beat (`gang`: 6% harder for each friend beside his foe), the Bell Warden's ringing blows (`arc` 18%), the Falconer's talon bleed and the
  Inquisitor's searing shots (`rider`s, which grow with attack), the Astrologer's far reach 25%, the Seraph's mending grace (`regen`
  1.5%) and the Harpooner's chilling barbs (`slow` 1.2 s). A mechanic may be shared with a roster hero, as the roster's own blocks and
  dodges are, but not at the same numbers.
- **Slot 3 follows the roster's mix**: thirteen jabs (a x0.8 to x0.9 poke with one small rider), five guards and two utilities, and no
  heavy. The Banneret's, Falconer's and Harpooner's heavies moved to slot 2.
- **The repeats cut.** Rescue guards on one trigger, five to two (the Bell Warden's swap and taunt, the Corsair Surgeon's hook and trap);
  walls, eleven heroes to three (the Geomancer's stone, the Plague Doctor's thorns, the Bombardier's fire); teleport-slash ultimates, three
  to one (the Mirage Dancer's); pull-in ultimates, five to two (the Astrologer's gravity well and the Harpooner's line, one foe at a time);
  line-dash skill 1s, three to one (the Vampire Lord's). Ultimates keep one headline and at most one rider, and the Corsair Surgeon's fills
  at a roster healer's rate (0.4).
- **Three reworked heroes.** The *Strigoi* (the Nightstalker was a Dota 2 hero's name; his key stays `nightstalker` for the saves and the
  art) swoops on the back line, abducts, shrieks, and carries his prey off with Belfry Swoop. The *Seraph* is a guardian, not a healer: no
  revive and no heals; she dives, beats her wings and shields the line under the Host's Halo. The *Bell Warden* is sound and stillness
  (Bronze Peal silences, Echoing Toll shoves and wards, Midnight Knell stuns and slows), while the Blood Gargoyle stays the leaping granite
  sentinel.
- **Renames**: Banquet of Blood (Red Eclipse), Blood Tithe (Exsanguinate, a World of Warcraft talent), Belfry Swoop (Midnight Hunt, a
  Magic: The Gathering set), Silver Requiem (Judgement of Dusk), Ten Thousand Drums, The Last Riddle (Celestial Convergence), Shell Storm
  (Carpet Bombardment), Rum Ration (the Surgeon's Crimson Dispensary).
- **The Vampire origin's 5 tier** is leech 15% and +10% attack with the bat swarm (was 18% and +14%). **The Last Oath is the Night Kin**
  (was the Crimson Court), its move the Blood Moon: the five drink back a tenth (was a quarter), with a tone of its own (`blood`, red
  first) beside the Dread Court's dark.
- **Five heroes a trait (the owner's answer to the review's point 6)**: with the twenty joined every origin and class has five heroes,
  and that is allowed: the roster's rule is now two to five (`test/traits.test.ts`, an owner-approved change; `test/coming-stats.test.ts`
  holds it with the twenty counted). No trait gains a tier for its fifth; the Vampires keep their own 2/4/5. With more heroes to draw on,
  the top (4) tiers are easier to reach: when a batch joins, the balance pass trims them slightly if the sweep shows them too strong.

| Hero | Passive | Skill 1 | Skill 2 | Skill 3 | Ultimate |
| --- | --- | --- | --- | --- | --- |
| Vampire Lord (Vladislav) | Noble Thirst | Crimson Lunge (strike 24, 7 s) | Impaling Thrust (heavy 30, 11 s) | Mist Step (jab 10, 4 s) | Banquet of Blood |
| Hemomancer (Carmilla) | Chalice Overflow | Sanguine Lash (strike 36, 7 s) | Blood Chalice (utility 42, 14 s) | Crimson Mist (guard 30, 15 s) | Blood Tithe |
| Strigoi (Sorin) | Predator of the Crypt | Dusk Dive (strike 22, 6 s) | Abduct (heavy 30, 14 s) | Echolocation (jab 10, 4 s) | Belfry Swoop |
| Blood Gargoyle (Gavril) | Granite Hide | Gargoyle Crash (strike 26, 7 s) | Stone Slumber (utility 26, 18 s) | Granite Fist (jab 10, 3.5 s) | Cathedral Perch |
| Dhampir (Klara) | Half-Blood Hunter | Silver Stake (strike 24, 7 s) | Grapple Vault (guard 16, 14 s) | Silver Shot (jab 10, 3.5 s) | Silver Requiem |
| War Drummer (Raiden) | Rhythm of War | Thunder Beat (strike 24, 7 s) | Marching Cadence (utility 26, 16 s) | Drum Strike (jab 10, 3.5 s) | Ten Thousand Drums |
| Banneret (Isolde) | Shield-Sister | Standard Charge (strike 24, 7 s) | Phalanx Sweep (heavy 30, 12 s) | Banner Jab (jab 10, 3.5 s) | Oriflamme of the Keep |
| Geomancer (Tenzin) | Jagged Bedrock | Tectonic Shove (strike 36, 7 s) | Lodestone Pull (utility 40, 14 s) | Crag Staff (jab 12, 3.5 s) | Mountain's Embrace |
| Bell Warden (Kavi) | Temple Bronze | Bronze Peal (strike 24, 7 s) | Echoing Toll (heavy 30, 11 s) | Sanctuary Vault (guard 16, 14 s) | Midnight Knell |
| Falconer (Aisling) | Wind-Borne Talons | Falcon Stoop (strike 24, 6 s) | Talon Snare (heavy 30, 11 s) | Gale Vault (guard 14, 12 s) | Sky Hunt |
| Astral Sphinx (Nenet) | Starlit Wings | Rift Pounce (strike 36, 9 s) | Riddle of Repulsion (heavy 44, 14 s) | Riddling Glance (jab 14, 3.5 s) | The Last Riddle |
| Mirage Dancer (Zahara) | Desert Shimmer | Whirling Veils (strike 24, 7 s) | Dune Swap (heavy 30, 11 s) | Veil Flick (jab 10, 3.5 s) | Dance of Seven Mirages |
| Plague Doctor (Corvus) | Ash Apothecary | Censer Swing (strike 36, 7 s) | Crow Step (utility 40, 14 s) | Quarantine Line (utility 34, 16 s) | Black Miasma |
| Bombardier (Soren) | Shrapnel Shells | Concussion Mortar (strike 24, 7 s) | Blast Jump (guard 16, 12 s) | Firebomb Line (utility 22, 16 s) | Shell Storm |
| Astrologer (Cyra) | Chart of the Heavens | Gravity Well (strike 36, 7 s) | Retrograde Orbit (guard 30, 14 s) | Star Dart (jab 13, 3 s) | Supernova Alignment |
| Inquisitor (Soraya) | Sun-Forged Verdict | Chains of Judgement (strike 36, 7 s) | Blazing Edict (utility 36, 16 s) | Purging Scales (guard 30, 15 s) | Solar Tribunal |
| Seraph (Gabriela) | Grace of the Heights | Halo Dive (strike 36, 7 s) | Sanctuary Wings (heavy 44, 12 s) | Radiant Thrust (jab 13, 3.5 s) | Descent of the Host |
| Corsair Surgeon (Tariq) | Field Sawbones | Boarding Swing (strike 36, 7 s) | Sawbones Triage (utility 40, 12 s; revive) | Grappling Extraction (guard 30, 15 s) | Rum Ration |
| Harpooner (Siku) | Chill-Iron Barbs | Barbed Harpoon (strike 24, 7 s) | Whaler's Reel (heavy 30, 11 s) | Flensing Throw (jab 10, 3.5 s) | Leviathan Line |
| Sea Reaver (Nakoa) | Rising Tide | Breaker Rush (strike 24, 7 s) | Anchor Slam (heavy 32, 12 s) | Gaff Hook (jab 10, 3.5 s) | Wrath of the Reef |

## The page-side rows, ready to move

Each per-hero table that the roster's tests hold to `ALL_HEROES` (its keys exactly the roster's) has a coming twin beside it, with the
twenty's rows written to the same rules (`test/coming-page.test.ts` holds them to each roster test's rules):

| Table | Coming twin | From the branch, and what changed |
| --- | --- | --- |
| `HERO_NAMES` (`heroNames.ts`) | `COMING_NAMES` | the canon (`heroNames.ts` there) |
| `HERO_STORY` (`codexLore.ts`) | `COMING_STORY` | rewritten to the canon's names and sexes (the branch's said Lady Genevieve, "he" for the Sphinx, and so on) |
| `HERO_QUIPS` (`quipData.ts`) | `COMING_QUIPS` | as written: first-person lines, every one within 8 to 70 characters |
| `CLASS_OF` (`starter.ts`) | `COMING_CLASS_OF` | as written |
| `PERKS` (`legacy.ts`) | `COMING_PERKS` | new: legacy came after the branch |
| `DEEP_KITS` (`talentsDeep.ts`) | `COMING_DEEP_KITS` | the skill and ultimate names of the kits as built (the Bombardier's skill 1 is Concussion Mortar); `plain` (below) |
| `TREES` (`talents.ts`) | `COMING_TREES` | each tree names the hero's real skill 1 (the branch's named Blood Lance, Shadow Fang, Stone Dive and others that are not the kits' skills), and uses only effects the twenty's casts read |
| `PASSIVES` (`awaken.ts`) | `COMING_PASSIVES` | the Vampires' five take free abilities of the equipment (the branch added five new ones); the other fifteen as written |

- **Talent effects the twenty's casts read.** `reach` (through `reachOf`), `dur` (through `ms`), `pow`, and the cast's own heal, shield
  and haste. Not `extra`, `skillStun` or `skillSlow`, which only some roster skills read: the branch's nodes that used them now give
  haste, a shield or a heal. The deep rows' "one more of what it makes" (the archmage's Spellstorm, the marksman's Rain of Ruin) is
  `plain` for the twenty: 15% more strength instead, and the words say so.
- Not yet written (they want the battle sprites, or come with joining): tavern spots and activities (`SPOTS`, `LIFE`, placed by eye in
  the rooms), HUD face boxes (`HUD_FACES`), the recruit scenes (`sceneScripts.ts`), the looks (`HERO_LOOKS`: the new sprites are drawn in
  their own tones, so most need none), ultimate showcases, and the skill books (built from `HERO_KITS` when they join).

## Tuning: what the sweep found

The tuner can tune the coming heroes against the roster without touching the roster's knobs: `COMING=1` puts the twenty in the sweep's
teams (`SWEEP_POOL` in `tools/heroSweep.ts`), and `tools/kits/tune.ts` then measures them against the roster's average and steps only their
knobs (`COMING_TUNE`, `COMING_PASSIVE` and `COMING_ULT` in `kits/coming.ts`). Without it the sweep and the balance tests are as they were
(`test/coming-tune.test.ts`).

**Before the review**, as the branch wrote them, the twenty were far too strong (15 of 20 beyond 6 points at level 1, the Seraph +22.7),
mostly from passives that stacked team-wide; scaling the passives down alone could not bring the Seraph and the Sea Reaver in. That led
to the review and its rework (above).

**After the rework**, the knobs were tuned in cycles (`KEY=t1` at level 1 stage 5, `t2` at level 10 stage 24, `t3` at level 20 stage
30, `up` and `ur` at level 30 stage 92, and `p` at level 10; 12,000 fights a round). Where a knob reached the tuner's floor (0.05) and
the hero was still over the band, the excess was in what no knob scales, so the kit was trimmed instead: the Falconer's talon bleed (4%
of her attack a tick, not 12%), her Falcon Stoop's weakening (2 s) and Talon Snare's pin (1 s) and her walk (700 ms); the Seraph's Halo
Dive (a 0.8 s stun and a shield of 8% of her health); the Blood Gargoyle's Stone Slumber (3 s of half damage and a taunt on the foes
within 2, nothing more). Two kits needed their dearer skills' cooldowns lengthened so the cheap one came round at all (the AI saves for
a heavier skill that is nearly ready): the Strigoi's (Abduct 14 s, Echolocation's old utility 20 s) and the Astral Sphinx's (Rift Pounce
9 s, Riddle of Repulsion 14 s).

The result, 20,000 fights a level, the knobs as written (every one of the twenty within the band of 6):

| Level (stage) | Roster average | Widest of the twenty |
| --- | ---: | --- |
| 1 (5) | 58.7% | Sea Reaver +5.4, Falconer +4.8 |
| 10 (24) | 71.1% | Falconer +5.3 |
| 20 (30) | 92.6% | Bell Warden +2.7 |
| 30 (92) | 62.3% | Blood Gargoyle -2.5 |

- **The Bombardier's ultimate** (Shell Storm, once Carpet Bombardment) no longer runs away: its rate is 0.836 (was the branch's 0.9 that
  came round every 2 s at level 30) and he is -0.6 at level 30.
- **Ultimates with big power knobs**: the Strigoi's Belfry Swoop (7.76), the Seraph's Descent of the Host (5.75), the Sea Reaver's Wrath of
  the Reef (5.46), the Vampire Lord's Banquet of Blood (4.82) and the Astral Sphinx's The Last Riddle (4.16) sit at or above the roster's
  highest (5.63). Their casts are single-target or short (a carry-off, a crash, a drink), so the sweep needs a large multiplier for them to
  pull their weight; the power also lengthens their stuns (by its square root). A design pass could raise their base strikes instead.
- The heroes' skill 1 strengths run from the floor (0.05: the Falconer, the Sphinx, the Mirage Dancer, the Seraph, the Harpooner, the Sea
  Reaver, whose skill 1s carry fixed riders) to 2.7 (the Geomancer's Tectonic Shove, now she fights in melee).

## The art imported (PRs #344 to #349)

ChatGPT's six art PRs (from [twenty-heroes-art-prompts.md](twenty-heroes-art-prompts.md)) are merged into this branch as they are (PNGs under
`art-source/heroes-20/` only), and brought into the game's formats:

- **Scenes, cutouts and awakened figures**, all twenty: `node tools/anime-heroes/pack.cjs --from art-source/heroes-20` (its new `--from`
  mode) writes `src/art/heroes/<id>.webp` (the scene, 1024 x 1536), `<id>-portrait.webp` (the cutout, 640 x 960, as main's since 0.346.0)
  and `awakened-<id>.webp` (596 x 560), the cutouts' and figures' soft interior matting made solid (alpha 145 or more to 255) as 0.346.0
  cleaned the 45. The Vampire Lord's and the Hemomancer's scenes are the owner's own from the old branch, saved beside the others as PNG.
  About 16 MB in all, 0.8 MB a hero (the 45 average 0.7 MB).
- **Effects**: the eight cleaned sheets are the `v-vampire` session in `art-source/spell-fx/v-vampire/` (its rows in
  `tools/spell-fx/spell-parts.json`, as the old branch had them), packed by `tools/spell-fx/import-spell-art.py` into
  `src/art/fx/spells/v-vampire.webp`. The other atlases came out byte for byte
  the same. **Sanguine Lance** first came with 5 frames a row (the brief asks 6 to 8), so the importer held it back; ChatGPT repainted it at six (PR #352) and it is in (16 parts, 184 KB; the ten atlases 3.99 MB of the 5 MB cap). `test/spell-fx.test.ts` counts the brief's sheets
  and rows; the Vampires' eight sheets and sixteen rows move it from 158 and 302 to 166 and 318.
- **Wired already**: the page finds a hero's art by its id (`heroes/<id>.webp`, `heroes/<id>-portrait.webp`, `heroes/awakened-<id>.webp`,
  `heroArtwork.ts`, `heroFaceRules.ts`), and `build.mjs` copies every file in `src/art/heroes/` and `src/art/fx/spells/` and lists it in the
  service worker, so the files are cached for offline play now and shown as soon as a hero joins. The spell parts are registered from
  `index.json` (`spellLooks.ts`) and wait for the Vampires' looks to name them.
- **Checked** at 393x852, 360x780 and 412x915 by `node tools/heroes-20/art-check.mjs` (after `npm run web`): the page's own roster cards,
  awakened cards, dossier portrait and full artwork, pointed at the new files, each loading and fitting (`docs/samples/heroes-20/art-*.png`).
- `CREDITS.md` credits both sets.

## Still to do for a batch to join

Their art (the prompts), then in one change: the rows into the roster's tables and `ALL_HEROES`, the tuning, the page's words (names and
titles from `heroNames.ts` as the canon, lore, quips, codex, tavern spots, starter classes), books, talents, looks borrowed until their
painted move icons arrive, and the roster tests' counts.
