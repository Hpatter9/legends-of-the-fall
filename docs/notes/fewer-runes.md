# Fewer, far stronger runes (FEWER-RUNES)

The owner's words: "There are too many runes. I want fewer to show up, but make them far more powerful."

Runes are the run's only gear (`src/sim/runes.ts`, [gear-runes-design.md](gear-runes-design.md) section 7, [rune-bench.md](rune-bench.md)).
This change gives the player about a third as many, each about four times as strong, and puts a small ability of its kind on every
rune, not only on level V.

## The rule

**Fewer.**

- **A won wave gives a rune every fourth wave and on the last** (`waveGivesRune`, `RUNE_EVERY` = 4). It was every won wave. An army of
  fifteen waves now gives its wave runes on waves 4, 8, 12 and 15; the daily on 4, 8 and 10; a quest battle on its last wave (and on 4
  if it is that long). A boss still gives its own rune (level II) as before, so a boss wave is still the richest.
- **The Calamity's fight finds are kept as runes one time in three** (`keepsFind`, `FIND_KEEP.share`): a plain fight's find, an elite's,
  a detour's, and a chest on the map (which then holds its gold alone). A boss's find is always kept, and so is a mimic's
  great chest, a gamble the party chose (as the cursed path is). The Calamity has no waves, so its runes all came from finds.
- What is bought or chosen on the road (the merchant, the passing cart, the shop, the chest event, the cursed path, the mysteries) is as
  it was: the player sees the rune before taking it, and these are under one rune in ten of a run. The rune's price is doubled
  (`RUNE_PRICE`: level I 50 gold, II 120, then 120 more a level), as the rune is four times what it was.
- **Nothing else moves.** Every find is still drawn from its own stream exactly as before (the slot, the gear id, the rune's kind); only
  whether the rune is handed out changes, and that is decided from the rune side stream (`RUNE_SALT`; the keep's own salt `KEEP_SALT`). A
  won wave without a rune draws nothing. The identity fixtures show it: only `daily` and `calamity`, the scenarios whose heroes wear runes,
  were re-recorded; the army, tower, stand and field scenarios keep their hashes.

**Far stronger.** Level I's numbers are written into `RUNE_STATS` (the knob `RUNE_SCALE.k` is now 1); the levels still multiply them by
1, 2, 3.5, 5.5 and 8 (`RUNE_LEVEL`). Stats past the gear's caps (`CAPS`, e.g. 3% mending a second, 60% crit) are capped in the fight and
told at the cap.

| Rune | Level I before | Level I now | Level III now | Signature (every level) | Level V adds |
| --- | --- | --- | --- | --- | --- |
| Ember | +2.8% attack | **+14% attack** | +49% | **kindling**: a kill bursts in flame on the foes beside it (Ember Burst) | blows burn |
| Bulwark | +0.7 defence, +3.5% hp | **+3 defence, +14% hp** | +10.5, +49% | **brace**: every fourth blow taken, it braces (Parry) | a ward at the start |
| Arcana | +3.5% skill power | **+15% skill power** | +52.5% | **gather**: every fifth blow gathers skill charge (Inkwell) | the mind gathers charge |
| Gale | +2.8% attack and move speed | **+10% each** | +35% | **tailwind**: a kill brings a burst of haste (Quick Wind) | haste at the start |
| Hawk | +3.2% crit | **+12% crit** | +42% | **talon**: a crit makes the foe bleed (Keen Eye) | a crit feeds the skill |
| Wellspring | mends 0.21% hp a second | **mends 0.8% a second** | 2.8% | **spring**: mends once when badly hurt (Mending Knot) | mends every second |
| Warding | +3.5% resist | **+15% resist** | +52.5% | **mirror**: may turn a blow back on its striker (Mirror Flash) | shrugs off an ailment |

- **The signature** (`RUNE_SIGNATURE`) is an ability the gear already has (`equipBases.ts`), at a strength by the rune's level
  (`SIGNATURE_S`: 0.5 at I, 0.65, 0.8, 0.9, 1 at V; a found Epic piece's is 0.45 to 0.7). A hero wearing two runes of one kind has its
  signature once, at the stronger level.
- **The flourish** of level V is kept, now at strength 1 (`FLOURISH_S`; it was 0.7), on top of the signature.

**Merging, with fewer runes.**

- **Any two runes of one level merge** into the next level, of the kind of the rune dropped onto (`canMerge`, `mergeRunes`): drag a
  Hawk I onto an Ember I and it is an Ember II. Two of a kind still merge as before. A merge is worth what the two were (I + I is one II,
  twice I), so it never loses strength at II; it frees a socket and stacks the power on one hero, and lifts the signature.
- **The Keystone lifts any rune a level**, whatever its level (below V); it was a twin of its own level only. It comes one rune in ten
  (`KEYSTONE_ONE_IN`; it was one in fifteen).
- **Twins** (one kind and level, or a Keystone with a rune: `areTwins`) are still what the page rims, what Merge all, Auto and a full bag
  merge, and what a **tap** merges. Two kinds are merged only by a **drag**, a deliberate act: a tap on another rune still chooses it, and a
  tap onto a hero's other rune still swaps (`dropRune`'s `anyKind`, set by the bench's drag alone).

*Why this merge rule.* With about six runes a run of seven kinds, two of a kind rarely meet, so under the old rule the bench would have
had almost nothing to merge and level II would come only from a boss. Letting any two of a level merge keeps the bench a place of choices
(which kind to keep, which hero to stack) without a dice roll: the director's other idea, a random kind, would take the choice away. The
Keystone, which the new rule would have made a plain rune, becomes the one that lifts a rune of any level, the way to a high rune.

## Old saves

A run saved with the old runes loads as it is (`catalogueRun` reads the runes safely, `readRunes`): every rune keeps its kind and level
and simply gives the new numbers and its signature; an old Keystone of any level lifts any rune. A test loads one and plays on
(`test/runes.test.ts`).

## The page

- The rune's card (`runeBench.ts` `openRune`): its numbers and signature in words ("+14% attack, a kill bursts in flame on the foes beside
  it"), how it merges ("Drag any rune of level I onto it, or a Keystone, to make Ember II: the merged rune takes the kind of the one it
  lands on"), and what level V adds. The Keystone's card: "Drop it onto any rune below level V to lift that rune a level. Never worn."
- A hero's sockets and the satchel's lines list each rune's numbers and signature; a hero's total (`runeTotals`) names the signatures it
  carries ("+14% attack, kindling").
- The bench's hint, the refusal note, the empty bag's line and the first-rune tip say the new rule.
- Screenshots at 393x852, 360x780 and 412x915 (`node tools/fewer-runes/shots.mjs`, after `npm run web`), in
  [docs/samples/fewer-runes/](../samples/fewer-runes/): the bench, a Gale I dragged onto a Warding I and merged, the Ember I's card, the
  Keystone's card, and the wizard's three sockets (Arcana III, Warding I, Wellspring V). The tool checks the merge, the card's words and
  the sockets, and that there is no sideways scroll and no page error.

## The measurements

**Runes per run** (`node tools/fewer-runes/count.mjs --runs 30`: the greedy bot, Auto runes before every wave; armies with the recruits'
five at a level that goes deep, the daily at a fresh save's power, the first six quest battles at level 20, the Calamity from a fresh save).
"Worn" is the strength the heroes wear at the start of a fight, in old level-I runes, averaged over the run's fights (the signatures and
flourishes not counted).

| Run (30 a row) | runes before | runes now | share | where now | level-I worth before / now | worn before / now |
| --- | --- | --- | --- | --- | --- | --- |
| Orc Warband, Lv 12 (15 waves won) | 17.2 | 6.2 | 36% | waves 4.0, bosses 2.0, chest event 0.2 | 19.2 / 8.2 | 7.8 / 10.0 |
| Undead Legion, Lv 18 | 16.3 | 5.4 | 33% | waves 3.6, bosses 1.6, chest event 0.2 | 17.8 / 7.0 | 7.8 / 9.6 |
| The Wildwood, Lv 28 (three bosses) | 14.6 | 6.2 | 42% | waves 3.5, bosses 2.5, chest event 0.2 | 16.7 / 8.6 | 8.0 / 13.4 |
| The daily | 10.1 | 3.9 | 38% | waves 2.4, bosses 1.4 | 11.5 / 5.3 | 5.0 / 5.9 |
| A quest battle (1.8 waves won) | 2.2 | 0.9 | 40% | waves 0.4, bosses 0.4 | 2.6 / 1.3 | 0.9 / 0.0 |
| The Calamity (about 12 floors) | 5.6 | 3.1 | 55% | bosses 1.2, fights 1.0, shop 0.4, chests 0.4, mysteries 0.1 | 9.5 / 5.4 | (not tallied) |

Before, a won wave's rune was nearly all of it (15 of an army's 17); the road's runes were about one in twenty, and the bot buys few of
them (the cart offers about 0.7 a run). "Level-I worth" counts a level II find as two. A rune now being about four times as strong, the
power handed out over a run is about 1.6 to 2 times what it was, but what the heroes actually wear in a fight is 20% to 30% more on the
armies and the daily (two thirds more on the Wildwood, whose three bosses each give a rune), since the old runes were mostly merged
together into a few, and the first rune now comes at wave 4. The Calamity keeps more of its share (55%) because its bosses' runes, about
half of its runes, are all kept; its maps are as they were (below).

**Clear rates** (main 0.562.0 against this branch, the same seeds):

- **The realistic climb** (`CLIMB_ARMIES=4 npm run balance -- --no-tables --climb --saves 120`, Batch 8's yardstick): mean tries.

  | army | target | before | now |
  | --- | --- | --- | --- |
  | Orc Warband | 2.0 | 2.0 | 1.8 |
  | Undead Legion | 2.9 | 3.4 | 3.6 |
  | Beast Packs | 4.3 | 3.9 | 4.1 |
  | The Wildwood | 2.0 | 2.3 | 2.1 |

  Every save clears all four both ways (100%).

- **The daily** (`npm run daily-rate -- --days 120`): with the run's ten lives, as the page plays it, 98% before and 99% now; with no
  lives (the first lost wave ends it), 66% before and 72% now (Boar King 17% to 30%, Lich King 56% to 69%, Minotaur Champion 86% to 81%,
  Orc Warlord 77% to 81%).

- **The tiers** (`npm run balance -- --no-tables --deep --tiers-at 1 --levels 30,45 --attempts 6 --only orcs,undead,beasts,wildwood,labyrinth,ogres`,
  and `--tiers-at 2,3 --levels 65,85`; a maxed castle, the recruits' five, no talents, 6 saves a cell, so a cell is noisy): mean tries
  (clear %). The cells not shown are 1.0 (100%) both ways.

  | tier, level | army | before | now |
  | --- | --- | --- | --- |
  | Hard, 30 | Labyrinth | 1.5 | 1.0 |
  | Hard, 30 | Ogre Clans | 15.2 (67%) | 11.7 (83%) |
  | Hard, 45 | Labyrinth | 1.3 | 1.2 |
  | Hard, 45 | Ogre Clans | 7.5 | 9.8 |
  | Elite, 65 | Labyrinth | 15.5 (67%) | 7.2 |
  | Elite, 65 | Ogre Clans | 4.0 | 5.0 |
  | Elite, 85 | Labyrinth | 6.2 | 2.8 |
  | Elite, 85 | Ogre Clans | 1.5 | 2.0 |
  | Legendary, 65 | Orc Warband | 1.7 | 2.8 |
  | Legendary, 65 | Undead Legion | 3.7 | 3.2 |
  | Legendary, 65 | Beast Packs | 8.8 | 7.7 |
  | Legendary, 65 | The Wildwood | 14.3 (67%) | 7.7 |
  | Legendary, 65 | Labyrinth, Ogre Clans | 25 (0%) | 25 (0%) |
  | Legendary, 85 | Orc Warband | 1.0 | 1.2 |
  | Legendary, 85 | Undead Legion | 2.5 | 2.0 |
  | Legendary, 85 | Beast Packs | 3.8 | 3.2 |
  | Legendary, 85 | The Wildwood | 4.0 | 3.0 |
  | Legendary, 85 | Labyrinth | 22.7 (17%) | 18.3 (33%) |
  | Legendary, 85 | Ogre Clans | 6.0 | 5.5 |

  Summed over the cells that are not 1.0 both ways, about a fifth fewer tries now: a little easier at the top of a band, still several
  tries at its entry, never trivial. The late armies (Infernal Host, Yokai, Golem Forge) are a wall at these levels without talents both
  ways (25 tries). **A gap in the tool:** with `--talents` the deep table builds each hero's boost from the save alone (`heroStats`), so it
  never sees the run's runes; its Hard 45 and Elite 65 tables on the late armies came out identical before and after for that reason, and
  are not a measure of this change.

- **The Calamity** (`npm run balance -- --no-tables --calamity --attempts 30`): maps cleared, mean 1.67 before and 1.67 now (map 1 100%
  both; map 2 60% to 63%; map 3 7% to 3%; whole 7% to 3%, two runs to one).

- **The Last Stand** has no runes: its identity hash (`stand`) did not move, so it plays exactly as before.

**If the director would rather it a touch harder:** `RUNE_SCALE.k` is the one knob for every rune's numbers (1 now; 0.85 puts Ember I at
+12%); `RUNE_EVERY` (4) and `FIND_KEEP.share` (one in three) set how many.

## Checks

- `npm run typecheck`: clean.
- `npm test -- runes rune-bench run-gear` and the tests the change touches (`events`, `tips`, `calamity`, `calMapRewards`, `tower`,
  `mystery`, `recap-reveal`, `spells-identity`, `ailments-identical`): pass. The full suite (`npm test`): 3333 tests, all pass after the
  mimic fix below.
- Tests changed for the owner's new rule, and why: `runes.test.ts` (a Keystone one in ten; the wave rune every fourth wave and on the
  last; any two of a level merge, a Keystone lifts any rune; Merge all feeds the Keystone to the highest rune; the new numbers, the
  signatures and the stronger flourish; and new tests: the Calamity's keep, and an old run's runes loading at the new strengths);
  `runes-page.test.ts` (the drag's wider merge and the tap's twins; the totals name the signatures); `events.test.ts` and
  `recap-reveal.test.ts` (a won wave 1 or 5 no longer gives a rune of its own); `calMapRewards`, `calamity` and `tower` (what a detour,
  a mini-boss and a chest pay is tested with every find kept, `FIND_KEEP.share = 1`; the one-in-three is tested in `runes.test.ts`); the
  `daily` and `calamity` identity hashes, re-recorded in `spells-identity` and `ailment-logs` (the comment beside each says why).
- The full suite first failed on `mystery.test.ts` (a mimic's great chest paid no rune one time in three): a mimic is a gamble the party
  chose, so its rune is now always kept, as the cursed path's is.
- `npm run web`; `node tools/fewer-runes/shots.mjs` at 393x852, 360x780 and 412x915: the merge of two kinds made, the card's words there,
  the three sockets open, no sideways scroll, no page errors.
