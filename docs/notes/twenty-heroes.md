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
| Skill 1, passive, ultimate | `KITS` | `comingKits()` (`kits/vampires.ts`) | `kitOf` |
| The three slots | `HERO_KITS()` | `comingHeroKits()` (`kits/vampires.ts`) | `heroKitOf`, `poolNumbers` |
| D&D scores | `STAT_PROFILES` | `COMING_ROWS` (`stats.ts`) | `profileOf` |

So the roster's rules (every trait two to four heroes, five to eight Last Oaths, every combo hero in `ALL_HEROES`, every skill painted,
45 kits) stay exactly as they are, and no test was changed. When a hero's sheets arrive it **joins**: its rows move from the coming tables
into the roster's, it goes into `ALL_HEROES`, and the counts the roster's tests hold move with it as an owner-approved change (the Vampire
origin's five members, the ninth Oath, 50 heroes, and so on), together with everything the page needs (names, lore, quips, the codex, the
tavern, the shop, books and talents).

## Batch 0: the Vampire origin and the Crimson Court

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

`src/sim/kits/vampires.ts` holds the five's casts, brought from the branch's `kits/twentyNew.ts` (they compiled against main's toolkit and
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
- **Not yet tuned.** The slots' strengths are the roster's defaults (`VAMPIRE_TUNE`: 0.5 or 0.7, 1 and 0.8) and the ultimates' knobs are
  the branch's. The hero sweep and its tuner (`tools/kits/tune.ts`, `test/hero-balance*.test.ts`) read `ALL_HEROES`, so the five are tuned
  when they join, in the same change.
- `test/vampire-kits.test.ts` holds the roster's rules on the five: the class ranges, heavy dearest and jab cheapest, demand 1.4 to 3.5 of
  each one's own income, a jab under its income; every skill and ultimate cast in a scene; a guard cast only in its case; the slots opening
  at 1, 10, 20 and 30; and four long fights of the five where every skill and ultimate comes round, the first played twice the same.

## Still to do for the Vampires to join

Their art (the prompts), then in one change: the rows into the roster's tables and `ALL_HEROES`, the tuning, the page's words (names and
titles from `heroNames.ts` as the canon, lore, quips, codex, tavern spots, starter classes), books, talents, looks borrowed until their
painted move icons arrive, and the roster tests' counts.
