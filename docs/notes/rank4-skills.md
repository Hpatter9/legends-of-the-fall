# Rank 4 skills: a fourth tier skill for every hero

The owner's ask, with heroes going to four ranks (two of a kind merge, 3+3 makes 4; `claude/merge-two`): "A new rank-4 skill each". Every hero
now has a tier 4 skill with a name of its own, the hero's best form, as tiers 2 and 3 have. The game calls these "tiers" (Tier 2, Tier 3), and
"rank" is already a hero's stars, so the new one is "Tier 4" everywhere.

## What it does

- `src/sim/tierSkills.ts`: `TIER_SKILLS` holds three entries a hero (`[tier 2, tier 3, tier 4]`). A tier 4 entry is the whole of tier 4 (it
  replaces tier 3's, as tier 3 replaces tier 2's): every modifier at least tier 3's, every rider of tier 3 kept, and more besides, most with
  one new twist: a second echo (Samurai, Kunoichi, Gunslinger, Mercenary, Dragoon), the whole skill falling a second time (Archer, Wizard,
  Dread Pirate, Siege Bot, Tyrant), a ward (Knight, Peasant, Paladin, Mummy, Juggernaut, Druid, Karasu, Buccaneer), a cleanse (Wanderer,
  Cleric, High Priestess), a held ring of force, haste for the party...
- **The hook:** `tierSkillOf(kind, grade)` reads the grade itself: grade 2 is tier 2, grade 3 tier 3, grade 4 **or higher** tier 4
  (`TOP_TIER = 4`). It does not read `MAX_GRADE`, so it works with main's top grade of 3 (no hero reaches tier 4 yet) and the merge branch's
  4 alike. `promoteUnit` takes a hero up to `TOP_TIER`. Grade 3 is untouched: the same fights, event for event (below).
- **One new rider, `cleanse`:** every ally within `reach` (and the caster) is freed of its ailments (`ailments.ts`' `cleanse`, as a cleansing
  potion). Pure and deterministic, no draw from any stream.
- **The ward, mend and haste riders at reach 0** are the caster alone: a tier 4 uses them for "he is warded", "he is mended", because the
  `castShield`, `castHeal` and `castHaste` modifiers do not fire on a kitted hero's skill 1 (see For the owner).
- **The page:** the hero card's Skills tab and the codex list "Tier 4 · <name>" after Tier 3 (`menuHeroes.ts`, `codexView.ts`). The promotion
  banner already says "Tier N" with the skill's name, so a grade-4 promotion names its tier 4 skill; its look is the merge branch's.

## The tier 4 skills

| Hero | Tier 4 | What it does |
|---|---|---|
| Knight | Unbreakable Bastion | Shield Wall reaches two tiles further and lasts a little longer; he is shielded, the ground round him shakes and holds the foes near, and the allies beside him are warded |
| Samurai | Sword Saint | Dashes two tiles further and cuts far harder; two more cuts follow, one after the other |
| Kunoichi | Night Without End | Backstabs much harder, hastens her, and slips behind two more foes, one after the other |
| Archer | Sky Darkened | The rain of arrows falls over a far wider patch and hits much harder, and the whole of it comes down a second time |
| Fire Wizard | Cataclysm | The meteors hit far harder and the ground burns much longer, and the whole shower falls a second time |
| Peasant | Uprising | The line holds much longer, a tile wider; his allies are mended well, hastened and warded |
| Ninja Monk | Hundred Fists | Five more strikes, each far harder, a long stun, and a great burst of force round him that holds the foes near |
| Wanderer | Pilgrim's Dawn | Heals far more, hastens the allies near him for longer, and frees them of every ailment |
| Lightning Mage | Thunder Throne | The bolt jumps through four more foes, holds each longer and hits harder, and a thunderclap bursts round her |
| Kitsune | Nine-Tailed Inferno | The charm lasts far longer and reaches a tile further, and a great ring of fox fire burns and holds the foes near |
| Karasu Tengu | Tengu King's Descent | Strikes far harder; a great gale bursts where he lands, holds the foes near and wraps him in a shield of wind, and two more dives follow |
| Yamabushi Tengu | Wrath of the Mountain | The gust reaches three tiles further, hits far harder and stuns far longer; a whirlwind bursts round him, and a second gust follows |
| Werewolf | Alpha's Howl | Bites far harder and bites again, heals him greatly, and his howl hastens him and the allies near |
| Minotaur | Lord of the Labyrinth | Charges three tiles further, hits far harder and charges again as hard; he lands with a stamp that holds the foes near |
| Satyr | Bacchanal | The pipes last far longer and reach three tiles further; his friends' skill meters jump by 30, and they are hastened |
| Gorgon | Gorgon Queen's Gaze | The gaze reaches three tiles further, holds far longer and hits far harder, and every foe near her is turned almost to stone |
| Samurai Commander | Shogun's Standard | The banner flies far longer, three tiles further; his allies are mended greatly and warded |
| Paladin | Holy Vanguard | The challenge reaches three tiles further and lasts much longer; he and his allies near are mended well and warded |
| Cleric | Saint's Grace | Heals greatly, for far longer; every ally is shielded more and freed of every ailment |
| Druid | World Tree | Her treants hit harder, and every ally near her is healed well and warded when one rises |
| Barbarian | Worldbreaker | The whirl cuts a tile wider, a second, stronger whirl follows, and he is mended |
| Ranger | Hunter's Maze | Lays four more traps, what they hold is held far longer, and they bite much harder |
| Warlock | Abyssal Doom | The curse burns far longer and deeper, and the dark force that bursts round him holds the foes it strikes |
| Illusionist | Infinite Reflections | The decoys last far longer, three more appear, she is hastened greatly, and her friends' skill meters jump by 15 |
| Gunslinger | High Noon | The slug carries three tiles further and hits far harder, and two more slugs follow, one after the other |
| Shambler | Black Death | The rot lasts far longer and reaches two tiles further; a great wave of it bursts round him, and he is mended |
| Rifle Bot | Bullet Storm | Three more rounds, each hitting harder, and 30 charge comes back |
| Mercenary | King's Ransom | Cuts far harder, and two more cuts follow, one after the other |
| Mummy | Eternal Tomb | The wraps last far longer and reach two tiles further, and he is warded |
| Buccaneer | Sack of the Coast | The hook reaches three tiles further and cuts far harder; he lands warded, with a great burst of force that holds the foes near, and hooks again as hard |
| Wolf Bard | Moonlit Chorus | The dirge reaches two tiles further and lasts much longer; his friends' skill meters jump by 18, and they are hastened |
| Beastmaster | Lord of the Wild Hunt | Two great dire wolves can run beside him with up to three wolves; each call brings a dire wolf beside the wolf |
| Kraken Mate | Abyssal Maw | The undertow reaches three tiles further, hits much harder, slows and holds each foe longer |
| Lancer | Thunder of Hooves | Charges three tiles further, hits far harder, charges again, and the riders near him are hastened |
| Reaper | Harvest of Souls | The scythe cuts harder, two tiles further, heals him, and reaps again a moment later |
| Time Witch | Eternity | The surge lasts far longer, two tiles further; her friends' skill meters jump by 30, and they are hastened |
| Arc Blade | Tempest Blade | The discharge hits much harder and holds long; he blinks and discharges again, and lightning crackles round him |
| Dread Pirate | The Drowned Fleet | Two more broadsides follow and each hits harder, as at tier 3; then a ghostly volley fires again, and he is warded |
| Siege Bot | Siege Breaker | The shell hits harder and a second, smaller shell follows it, as at tier 3; then a light shell falls again after the barrage |
| High Priestess | Celestial Choir | Heals greatly; every ally is shielded more, mended well and freed of every ailment |
| Queen Dragoon | Wyrmqueen's Breath | The breath carries three tiles further and hits far harder, and two more breaths follow |
| Juggernaut | Earthshatter | The quake reaches three tiles further, hits harder and holds far longer; the ground splits round him, and he and the allies beside him are warded |
| Great Sage | Heavens Unbound | Three more stars fall, each a little harder, and every ally's skill meter jumps by 25 |
| Demon Swordsman | Hellblade | The sweep reaches two tiles further, cuts far harder, heals him well, and sweeps again with most of its strength |
| Tyrant | The Iron Throne | The judgements fall two tiles wider and harder, a wave of dread holds the foes near, and the whole verdict falls again |
## Balance

Measured with a forced grade-4 party: `npm run balance -- --heroes-only --hero-grade 4 --hero-stage N [--hero-level 30]` (`gradeBoost(4)`: hp and
attack x1.6 a grade above the first, today's `GRADE_MULT`), four runs of 4,000 random five-hero teams on different seeds (`--seed-offset 0,
100000, 200000, 300000`, 16,000 fights, about 1.2 points of noise a hero). `--tier-cap 3` (new, `tools/rank4/cap.ts`) plays the same grade-4
heroes casting their tier 3 skill instead, as main does today. Two settings, since the two disagree a lot: **level 1, stage 43** (the tables'
usual level; skill 2 and the ultimate shut, and the Cleric's and Wanderer's tier skill, on their skill 2, never casts) and **level 30, stage
440** (every skill open). The lift is a hero's win rate in the teams that had it, against the roster's average (points; parity is within 6).

- **Tier 4 is a clear step for the party:** the average win rate goes from 25.3% (tier 3) to 47.9% (tier 4) at level 1, and from 35.7% to
  49.1% at level 30, on the same fights.
- **Each hero's own step** (`node tools/rank4/run.mjs --stage N --games 400 [--level 30]`, new): 400 fights with the hero and four random
  others, played twice, the hero at tier 4 and then at tier 3 (the other four at tier 4 both times). Its own damage rises in almost every case
  (up to +60% for the Buccaneer at level 1); the wins rise by 4.7 points on average at level 1 and 2.2 at level 30. A support's or a tank's step
  (a longer banner, a ward, more meter) barely shows in the wins of 400 fights (about 2 points of noise), and the test holds that no tier 4
  modifier is below tier 3's and no rider is lost.
- **Parity:** taking the two settings together (the mean of the two lifts), every hero's tier 4 is within 6 points of the rest except the
  Knight (+6.5): his lift at level 1 is +12.1, and it was +12.8 casting tier 3 (his stats at grade 4, not his skill: his tier 4 is the
  smallest step there is). Within each setting alone, the heroes beyond 6 were beyond it at tier 3 too, or flip between the two: at level 30 the
  Dread Pirate +9.5 (+11.8 at tier 3), the Karasu -7.3 (-7.2) and the Siege Bot +6.2 (+12.2); at level 1 the Knight +12.1 (+12.8), the
  Beastmaster +11.9 (+15.6), the Karasu +11.5, the Demon Swordsman +8.0, the Peasant +7.7 (+8.4), the Wolf Bard +7.4 (+8.6), the Samurai
  +6.9, the Kunoichi +6.4, the Sage -7.6, the Dread Pirate -6.7 and the Kitsune -6.6. The Karasu and the Demon Swordsman's skill 1 carries
  much at level 1 and little at level 30, so no one strength suits both; they sit in the middle (mean +2.1 and +2.9).

| Hero | Tier 4 | L1 tier 3 | L1 tier 4 | L30 tier 3 | L30 tier 4 | Mean tier 4 | Step L1 (wins, own damage) | Step L30 (wins, own damage) |
|---|---|---|---|---|---|---|---|---|
| Lightning Mage | Thunder Throne | -0.7 | -5.8 | -3.7 | -3.2 | -4.5 | +1.0, +4% | +3.8, +13% |
| Lancer | Thunder of Hooves | -1.4 | -4.1 | -3.0 | -4.3 | -4.2 | +2.2, +12% | +1.5, +9% |
| Minotaur | Lord of the Labyrinth | -4.6 | -2.5 | -5.9 | -4.4 | -3.4 | +5.2, +51% | +3.0, +18% |
| Kitsune | Nine-Tailed Inferno | -2.8 | -6.6 | +1.2 | +0.4 | -3.1 | +1.5, +2% | +0.8, +4% |
| Illusionist | Infinite Reflections | +0.2 | -3.3 | -1.6 | -2.6 | -2.9 | +0.8, -2% | -0.8, +2% |
| Wanderer | Pilgrim's Dawn | -0.1 | -3.3 | -0.0 | -2.3 | -2.8 | +1.8, +0% | +3.0, +3% |
| Yamabushi Tengu | Wrath of the Mountain | -5.0 | -2.1 | -4.1 | -3.4 | -2.8 | +10.8, +48% | +4.0, +17% |
| Ninja Monk | Hundred Fists | -3.5 | -0.5 | -5.0 | -5.0 | -2.7 | +11.2, +42% | +7.0, +24% |
| Shambler | Black Death | -2.1 | -2.3 | -2.8 | -2.5 | -2.4 | +4.5, +19% | +2.8, +15% |
| Mercenary | King's Ransom | -6.1 | -0.5 | -6.9 | -3.7 | -2.1 | +12.2, +42% | +6.5, +16% |
| Druid | World Tree | -0.3 | -6.0 | +2.5 | +1.8 | -2.1 | +0.5, +0% | +0.8, -1% |
| Queen Dragoon | Wyrmqueen's Breath | -4.2 | +0.8 | -3.6 | -4.9 | -2.0 | +6.0, +35% | +0.0, +9% |
| High Priestess | Celestial Choir | +0.9 | -4.2 | -1.3 | +0.2 | -2.0 | +1.0, +1% | +2.8, -0% |
| Fire Wizard | Cataclysm | -5.3 | -5.2 | +5.9 | +2.8 | -1.2 | +4.0, +21% | +3.0, +7% |
| Ranger | Hunter's Maze | +0.3 | -4.2 | +0.3 | +1.9 | -1.1 | +0.8, +5% | +3.8, +19% |
| Kraken Mate | Abyssal Maw | +1.4 | +0.5 | -2.6 | -2.8 | -1.1 | +2.5, +4% | -0.5, +5% |
| Great Sage | Heavens Unbound | -3.1 | -7.6 | +4.7 | +5.6 | -1.0 | +0.5, +1% | +0.8, +3% |
| Buccaneer | Sack of the Coast | -4.2 | +2.7 | -6.1 | -4.4 | -0.9 | +7.8, +60% | -0.2, +24% |
| Cleric | Saint's Grace | +1.0 | -3.5 | +1.5 | +1.8 | -0.9 | +0.5, +1% | +4.5, +8% |
| Warlock | Abyssal Doom | +0.2 | -1.3 | +0.7 | -0.1 | -0.7 | +3.0, +8% | +1.2, +7% |
| Barbarian | Worldbreaker | +1.9 | -1.5 | +2.7 | +0.3 | -0.6 | +0.2, +2% | +0.5, +1% |
| Juggernaut | Earthshatter | -3.1 | -2.4 | -2.0 | +1.4 | -0.5 | +7.2, +24% | +6.0, +17% |
| Mummy | Eternal Tomb | -0.3 | -5.1 | +6.0 | +4.3 | -0.4 | +0.5, +1% | +1.5, +1% |
| Gorgon | Gorgon Queen's Gaze | -1.0 | -2.8 | -0.1 | +2.1 | -0.3 | +2.2, +5% | +0.5, +8% |
| Tyrant | The Iron Throne | -1.7 | -1.0 | +0.5 | +0.6 | -0.2 | +7.2, +22% | +0.8, +8% |
| Satyr | Bacchanal | -0.8 | -1.9 | +3.5 | +1.7 | -0.1 | +3.2, -1% | +1.0, +2% |
| Werewolf | Alpha's Howl | -5.8 | +1.8 | -5.9 | -1.2 | +0.3 | +16.8, +56% | +4.5, +29% |
| Archer | Sky Darkened | -0.6 | -3.4 | +6.3 | +4.6 | +0.6 | +3.8, +17% | +4.8, +9% |
| Siege Bot | Siege Breaker | -0.9 | -4.7 | +12.2 | +6.2 | +0.7 | +2.0, +9% | +0.0, +1% |
| Kunoichi | Night Without End | -2.4 | +6.4 | -5.6 | -4.7 | +0.8 | +10.0, +30% | +1.5, +11% |
| Gunslinger | High Noon | +0.1 | +5.7 | -2.8 | -3.1 | +1.3 | +15.0, +42% | +2.8, +10% |
| Samurai Commander | Shogun's Standard | -0.0 | +2.5 | -0.2 | +0.4 | +1.4 | +7.8, +3% | -0.2, +4% |
| Dread Pirate | The Drowned Fleet | -3.3 | -6.7 | +11.8 | +9.5 | +1.4 | +3.0, +9% | +0.5, +0% |
| Paladin | Holy Vanguard | -2.0 | -2.0 | +6.4 | +5.2 | +1.6 | +3.8, -1% | +5.5, +5% |
| Rifle Bot | Bullet Storm | +3.2 | +2.6 | -0.7 | +0.8 | +1.7 | +5.5, +13% | +3.2, +13% |
| Arc Blade | Tempest Blade | +5.8 | +5.1 | +0.5 | -1.5 | +1.8 | +0.2, +2% | +0.0, +2% |
| Reaper | Harvest of Souls | -3.0 | -1.9 | +3.7 | +5.4 | +1.8 | +3.0, +21% | +2.8, +17% |
| Karasu Tengu | Tengu King's Descent | -0.3 | +11.5 | -7.2 | -7.3 | +2.1 | +16.5, +54% | +0.5, +17% |
| Demon Swordsman | Hellblade | +0.7 | +8.0 | -2.8 | -2.2 | +2.9 | +13.5, +39% | +2.2, +16% |
| Samurai | Sword Saint | +3.9 | +6.9 | +0.5 | +0.3 | +3.6 | +7.0, +21% | +3.0, +9% |
| Wolf Bard | Moonlit Chorus | +8.6 | +7.4 | +0.5 | -0.1 | +3.7 | -0.5, +0% | +1.8, +0% |
| Time Witch | Eternity | +3.8 | +2.7 | +3.6 | +4.6 | +3.7 | +2.0, -1% | +3.8, -1% |
| Peasant | Uprising | +8.4 | +7.7 | +1.1 | +2.1 | +4.9 | +2.0, +2% | +0.8, -0% |
| Beastmaster | Lord of the Wild Hunt | +15.6 | +11.9 | -4.2 | -0.7 | +5.6 | +0.5, -1% | +5.0, +3% |
| Knight | Unbreakable Bastion | +12.8 | +12.1 | +2.1 | +1.0 | +6.5 | +1.0, +2% | +0.0, +0% |

(Lifts in points against the roster's average; "tier 3" plays the same grade-4 heroes with `--tier-cap 3`. Steps: wins with tier 4 minus wins
with tier 3, and the hero's own damage, 400 paired fights each.)

A grade 3 fight is unchanged: the hash of every event of nine fights at grade 3 (level 1 and 30) and at grade 2 was the same on main and on
this branch (checked by hand), and a test holds that a grade 3 fight is the same whatever the tier 4 entries say.

## Tests and tools

`test/tier-skills.test.ts`: every hero has three named tier skills (the tier 4 names all different); every tier 4 modifier is a talent key and
every rider sound; tier 4 a step past tier 3 (no modifier lower, no rider lost, something more); grade 4 and 5 take tier 4 (its talents are
the tier 4 skill's); a grade-4 Samurai's cut echoes twice where grade 3's echoes once; a tier 4 cleanse frees an ally, tier 3 does not; a grade
3 fight unchanged whatever tier 4 says. Tools: `tools/rank4/cap.ts` (`capTiers`, `uncapTiers`), `tools/rank4/step.ts` + `run.mjs` (each
hero's step), `npm run balance -- --tier-cap 3`, `tools/rank4/shots.mjs` (the screenshots, `docs/samples/rank4-skills-card-*.png`).
`tools/fxlab/audit.ts` has a Tier 4 column.

## For the owner

- **Names.** Every tier 4 name is in the table above; say if any should change (one line each in `TIER_SKILLS`).
- **Cast effects on skill 1.** Since the hero kits (COMBAT-002), the `castShield`, `castHeal` and `castHaste` modifiers of the tier skills
  fire on a hero's skill 2 and ultimate, not on the skill 1 the tier skill improves (`began` in `abilities.ts`), so several tier 2 and 3 lines
  ("he is shielded", "heals him") promise a little more than they do. Tier 4 says these things with riders that do fire. Say if the old
  modifiers should fire on skill 1 too (it would change grade 2 and 3 fights).
- **A second volley or meteor.** `extra` above 1 adds nothing for the Archer, Fire Wizard, Dread Pirate, Siege Bot and Tyrant (`followUp`
  makes one follow-up), so tier 3's "two more volleys" is one. Their tier 4 brings the whole skill down a second time (an echo) instead.
- **The grade-4 outliers** (the Knight and Beastmaster at level 1, the Dread Pirate and Siege Bot at level 30) are strong at grade 4 at tier 3
  already: their stats at that grade, for the merge branch's retune rather than their skills.
