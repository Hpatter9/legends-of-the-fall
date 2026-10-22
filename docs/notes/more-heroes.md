> Hero rarity was removed later (see `no-rarity.md`): where this note gives a hero a tier, rarity frame or tier bonus, that no longer applies.

# More heroes (the second wave)

Twenty heroes join the 25 (`ALL_HEROES` in `units.ts` is now 45; `HEROES` stays the five, and their numbers did not change).
They are spread 5 Common, 5 Rare, 4 Epic, 3 Legendary and 3 Mythic, each with a kit in `abilities.ts` (`KITS`), a talent tree
in `talents.ts` (eight nodes, the same shape as the others), traits in `traits.ts`, a spot in the tavern, art and a place in
the recruiting pool at its rarity (the odds, the pity and the saves are untouched: an old save loads and the new heroes start
locked). Tests: `test/more-heroes.test.ts`.

## The roster

| Hero | Rarity | Role | Traits | Skill | Passive | Art |
| --- | --- | --- | --- | --- | --- | --- |
| Shambler | Common | Regenerating tank | Undead, Warden | Rotting Touch: foes within 2 tiles rot for 4s, he drinks part of it | Undying Flesh: heals 2% hp a second | Himeko zombies, three looks (bare, plain, brute) |
| Rifle Bot | Common | Shooter | Machine, Gunner | Burst Fire: three rapid shots at the weakest foe | Targeting Array: +30% to foes 4+ tiles away | Craftpix robot Infantryman |
| Mercenary | Common | Assassin | Frontier, Assassin | Bounty Hunt: blinks beside the strongest foe and cuts it for x1.9 | Hired Blade: 20% crits (x1.7) that bleed | Pixel Champions Oratio |
| Mummy | Common | Slowing tank | Undead, Warden | Binding Wraps: foes within 2 tiles hurt and slowed 3s | Dry Husk: front blows lose a fifth | Himeko mummy |
| Buccaneer | Common | Hook duelist | Pirate, Assassin | Grappling Hook: yanks the nearest shooter in, cuts and holds it 1s | Sea Legs: slips 12%, climbs free | Craftpix Pirate Leader |
| Wolf Bard | Rare | Support | Wild, Support | Dirge: foes within 4 tiles hurt and slowed 4s | Catchy Tune: every 3.5s the ally with least charge gains 16 | Pixel Champions Ouzo |
| Beastmaster | Rare | Summoner | Frontier, Support | Call of the Wild: two dire wolves at a time | Whip Crack: blows slow the foe 1.5s | Pixel Champions Ley (wolves: Red Werewolf sheet) |
| Kraken Mate | Rare | Crowd control tank | Pirate, Bulwark | Undertow: foes within 4 hurt, slowed 2s and dragged a tile closer | Barnacled Hide: front blows lose a fifth | Craftpix Squidman |
| Lancer | Rare | Charger | Royal, Vanguard | Lance Charge: 5 tiles at a foe for x2.2, then hasted 3s | Couched Lance: +40% to shooters | Craftpix horse rider |
| Reaper | Rare | Flying finisher | Undead, Assassin | Reap: every foe within 3 tiles; under 30% health takes x2.8 | Wraith Form: slips 20% | Himeko ghost (flies) |
| Time Witch | Epic | Controller | Arcane, Arcanist | Temporal Surge: friends within 3 hasted, foes within 4 slowed, 4s | Stutter: slips 20% | Pixel Champions Hex |
| Arc Blade | Epic | Assassin | Machine, Assassin | Voltage Blink: blinks to the thickest crowd, the 3x3 is hurt and held 1s | Static Discharge: 25% of blows arc | Craftpix robot Swordsman |
| Dread Pirate | Epic | Artillery bruiser | Undead, Vanguard | Broadside: a 3x3 shelled a moment after the call | Deathless: once a fight rises at 35% | Craftpix Pirate Zombie |
| Siege Bot | Epic | Artillery | Machine, Gunner | Shell Barrage: a heavy shell on the thickest crowd within 7 | Reinforced Chassis: block a fifth, cannot be shoved | Craftpix robot Destroyer |
| High Priestess | Legendary | Healer | Holy, Support | Holy Light: heals the worst hurt ally and cleanses it, half on those near | Halo: allies within 2 (and she) take 8% less | Pixel Champions Linail |
| Queen Dragoon | Legendary | Flying lancer | Royal, Vanguard | Dragon Breath: fire down the line holding most foes, burning each | Dragon Scales: a quarter less from shots | Pixel Champions Wyvera |
| Juggernaut | Legendary | Wall | Machine, Bulwark | Earthquake: every foe within 3 hurt and held 1.2s | Living Rampart: block a third, cannot be shoved | Himeko juggernaut |
| Great Sage | Mythic | Artillery support | Mystic, Arcanist | Starfall: stars on up to three separate crowds. Ultimate Astral Convergence: every ally +50 charge and a starlit shield | Arcane Insight: blows ignore 4 defence | Pixel Champions Prime |
| Demon Swordsman | Mythic | Bruiser | Royal, Vanguard | Hellblade Sweep: every foe within 2, he drinks a quarter. Ultimate Demon Form: x1.5 attack 7s, heals a fifth | Soul Pact: leech 8%, rage up to 25% | Pixel Champions Glenys |
| Tyrant | Mythic | Judge and rallier | Royal, Caster | Judgement: a delayed x2.4 blast on the toughest foe's 3x3. Ultimate Reign of Terror: foes within 6 hurt and slowed 5s, allies rallied (+25% attack 7s) | Iron Throne: block a quarter, cannot be shoved | Himeko tyrant |

## Art (`tools/more-heroes/build_sheets.py`)

- **Pixel Champions v3** (eight characters, three colour looks, so three grades): the 1x battler sheets are RPG Maker motion
  grids (9x6 cells of 32 px). The script rebuilds them as the game's rows (walk, attack, idle, hurt, dead, attack2, defend),
  crops every frame to one window (feet on the bottom) and doubles by whole pixels, nothing resampled; they face left
  (`facesRight: false`). Doubled, a figure stands about 52 px, like the Craftpix ones, so every screen (tavern, hall, party)
  sizes them alike, and they are drawn at **scale 1**. The Mercenary and the Sage have attack rows chosen by weapon (swing,
  stab, spell); the K/O row is the lying death.
- Craftpix robots, pirates and the horse rider, and the Himeko juggernaut, tyrant, mummy, ghost and zombies, are Chronos
  Settlement's cut sheets (`packs/`), copied as they are. Their death rows end kneeling or standing in the seven Himeko sheets, so the
  script adds the same last lying frame as `tools/pixellab/lie.py` (the idle figure turned exactly 90 degrees).
- Only these sheets are copied (`src/art/units/`, 1.3 MB), bundled into `game.js` as data URLs like the rest, so nothing new
  has to go in the service worker's `FILES`. Credits are in `CREDITS.md`. No PixelLab.
- Not used, and why: the Tiny RPG soldier, orc, demon and blood monster (figures of about 20 px with baked slash effects: too
  small and plain next to the rest), the three Tiny Hero imps (28 px), the rats and the horde turret (not heroes), the slimes
  (one frame of idle and hurt, and five colours of the same blob), and the paper-doll layers.

## Traits

`HERO_TRAITS` gives every hero an origin and a class; every trait still has two to four heroes (the test in `traits.test.ts`
is unchanged), so 20 more heroes needed new traits.

- **New origins:** Undead (Shambler, Mummy, Reaper, Dread Pirate; 2: +6% hp, 4: +14%), Machine (Rifle Bot, Arc Blade, Siege Bot,
  Juggernaut; 2: +3% attack, 4: +10% attack and 3% less damage), Royal (Lancer, Queen Dragoon, Demon Swordsman, Tyrant; 2: +2% attack
  and +3% hp, 4: +6% and +6%), Pirate (Buccaneer, Kraken Mate; +5% crit and 3% dodge).
- **New classes:** Assassin (Mercenary, Buccaneer, Reaper, Arc Blade; 2: +8% crit, 4: +16% crit and 3% speed), Vanguard (Lancer,
  Dread Pirate, Queen Dragoon, Demon Swordsman; 2: +4% speed, 4: +8% speed and 3% attack), Support (Wolf Bard, Beastmaster, High
  Priestess; +4% hp, skills charge 10% faster), Gunner (Rifle Bot, Siege Bot; +4% attack), Arcanist (Time Witch, Great Sage;
  mana 15% faster, charge 10% faster), Bulwark (Kraken Mate, Juggernaut; 4% less damage, +3% hp).
- **More members, so a 4-piece is reachable:** Frontier (+Beastmaster, Mercenary), Warden (+Shambler, Mummy), Caster (+Tyrant),
  Wild (+Wolf Bard), Arcane (+Time Witch) and Mystic (+Great Sage) now have four members, and each has a new 4-piece tier
  (Frontier +14% crit, Warden 10% less damage, Caster charge 50% faster, Wild +12% attack, Arcane charge 30% faster, Mystic mana
  60% faster). Holy gains the Priestess (three).

## Rules added (all through small hooks; no existing skill changed)

- `Passive` fields `slow` (blows slow the foe), `tune` (a charge to the ally with least), `halo` (allies within 2 take less) and
  `undying` (a once-a-fight rise); `Unit.tuneAt`, `Unit.form` (Demon Form's attack, reverted by `tickStatus`) and
  `Unit.undyingUsed`. `onStrike` reads the halo, `afterBlow` the slow, `hurt` the undying (after the equipment's revive).
- Refactors that keep the old skills exactly as they were: `blinkStrike` (Shadow Step and Bounty Hunt), `chargeAt` (Gore Charge and
  Lance Charge), `burstAround` (Shard Burst and Earthquake), `callSummon` (Call Treant and Call of the Wild), `lineFoes` (Dead Eye
  and Dragon Breath), plus `drag` and `slowFor` helpers.
- Talents use the existing keys (`pow`, `dur`, `reach`, `extra`, ...) and abilities; every tier-2 node changes its hero's skill and each
  Mythic capstone reaches its ultimate.
- Effects and elements for the 23 skills and ultimates are in `skillFx.ts` and `fxRules.ts` (Demon Form shows the frenzy aura);
  `soundRules.ts` has weapon weights for the new names. The Dire Wolf is a summon (`summon: true`), not a placed hero.
- No new randomness: every skill is deterministic (the ones that roll use the existing passives' skill stream).

## Balance

`npm run balance -- --heroes-only --games 20000 --hero-stage N` (new `--heroes-only` flag; table 1 now also prints each hero's lift
against the others of its rarity). At stage 5 the table is saturated (about 94%), so the heroes were tuned at stages 6 and 7 and
checked at 5 and 8. Win rate with the hero in random five-hero teams, points above or below the average of the 25 original heroes
of the same rarity (the peers):

| Hero | Stage 5 | Stage 6 | Stage 7 | Stage 8 |
| --- | --- | --- | --- | --- |
| **Common: the original peers' average** | 92.6% | 67.4% | 34.2% | 12.5% |
| Shambler | 92.6% (-0.0) | 67.1% (-0.3) | 35.3% (+1.1) | 10.9% (-1.6) |
| Rifle Bot | 91.9% (-0.7) | 66.6% (-0.8) | 34.2% (-0.0) | 11.5% (-1.0) |
| Mercenary | 94.4% (+1.8) | 70.8% (+3.4) | 36.7% (+2.5) | 12.3% (-0.2) |
| Mummy | 92.2% (-0.4) | 66.4% (-1.0) | 33.0% (-1.2) | 11.4% (-1.1) |
| Buccaneer | 91.5% (-1.1) | 66.6% (-0.8) | 31.3% (-2.9) | 10.1% (-2.4) |
| **Rare: the original peers' average** | 93.6% | 71.0% | 37.2% | 13.5% |
| Wolf Bard | 92.8% (-0.8) | 70.4% (-0.6) | 38.4% (+1.2) | 14.8% (+1.3) |
| Beastmaster | 95.2% (+1.6) | 74.2% (+3.2) | 41.0% (+3.8) | 16.5% (+3.0) |
| Kraken Mate | 95.2% (+1.6) | 72.0% (+1.0) | 38.6% (+1.4) | 14.4% (+0.9) |
| Lancer | 94.7% (+1.1) | 70.9% (-0.1) | 37.2% (-0.0) | 12.7% (-0.8) |
| Reaper | 92.9% (-0.7) | 68.0% (-3.0) | 35.5% (-1.7) | 11.0% (-2.5) |
| **Epic: the original peers' average** | 95.2% | 74.3% | 41.7% | 16.6% |
| Time Witch | 94.6% (-0.6) | 73.2% (-1.1) | 40.9% (-0.8) | 15.9% (-0.7) |
| Arc Blade | 96.1% (+0.9) | 75.3% (+1.0) | 39.1% (-2.6) | 12.8% (-3.8) |
| Dread Pirate | 96.1% (+0.9) | 76.7% (+2.4) | 44.0% (+2.3) | 16.6% (+0.0) |
| Siege Bot | 96.1% (+0.9) | 76.1% (+1.8) | 41.1% (-0.6) | 15.1% (-1.5) |
| **Legendary: the original peers' average** | 96.4% | 79.0% | 47.9% | 20.8% |
| High Priestess | 97.2% (+0.8) | 81.6% (+2.6) | 50.7% (+2.8) | 21.9% (+1.1) |
| Queen Dragoon | 98.0% (+1.6) | 81.7% (+2.7) | 47.2% (-0.7) | 17.8% (-3.0) |
| Juggernaut | 97.0% (+0.6) | 81.5% (+2.5) | 51.7% (+3.8) | 21.9% (+1.1) |
| **Mythic: the original peers' average** | 98.8% | 88.1% | 60.6% | 29.0% |
| Great Sage | 98.6% (-0.2) | 87.3% (-0.8) | 61.0% (+0.4) | 29.1% (+0.1) |
| Demon Swordsman | 99.4% (+0.6) | 90.0% (+1.9) | 60.8% (+0.2) | 26.2% (-2.8) |
| Tyrant | 99.1% (+0.3) | 88.4% (+0.3) | 61.7% (+1.1) | 28.4% (-0.6) |

All twenty are inside about 5 points of their peers at every stage. The first pass was far off (Demon Swordsman +28, Tyrant +16,
Arc Blade +22, Juggernaut +18, Queen Dragoon +14 at stage 7; Wolf Bard -9, Time Witch -6, Great Sage -7), and the stats and
the kits' numbers were tuned from there. The raw tables are in `docs/samples/more-heroes-balance.txt`.

**Talents** (`npm run talent-balance -- --games 1200`, `docs/samples/more-heroes-talent-balance.txt`): a full tree lifts the new
heroes' teams by +2 to +27 points at stage 13, level 3 (the originals: +2 to +24), and the first pass was brought down where it stood out
(Tyrant +31 to +21, Demon Swordsman +25 to +20 on average): the new trees sit in the existing range, the top ones being Demon Swordsman
(+20 to +27, against Kitsune +24 and Knight +23), Tyrant (+18 to +22) and High Priestess (+5 to +17, against Cleric +17); the weakest
are Buccaneer, Lancer and Arc Blade (+1 to +6), like the Lightning Mage, Kunoichi and Samurai.

**The rest of `npm run balance`** (`docs/samples/more-heroes-balance-full.txt`, 4000 games): the whole-run and the armies tables, which play
only the starting five, are byte-for-byte the same as on the commit this work started from (checked with `--runs-only --saves 80` on both);
the foe-band and stage-curve tables draw random teams from the whole roster, so they moved with it (the foe-band test's 20 to 80% range still holds). The new 4-piece trait tiers can only add to a team that holds four of
a trait, which the starting five never do.

## Samples

`docs/samples/new-heroes-contact.png` (all twenty, grades 1 and 3), `new-heroes-fight-<a-d><1-3>-<393x852|360x780>.png`
(four fights with five new heroes each: when the first skill goes off, a moment later and a few seconds in),
`new-heroes-tavern-*.png` (all 45 recruited) and `new-heroes-sheet-sage-*.png` (a hero sheet at 393x852, 360x780 and 412x915).
`node tools/more-heroes/shots.mjs` and `node tools/more-heroes/contact.mjs` make them.
