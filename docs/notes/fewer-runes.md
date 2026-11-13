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
  a detour's, a mimic's chest and a chest on the map (which then holds its gold alone). A boss's find is always kept. The Calamity has no
  waves, so its runes all came from finds.
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

RESULTS_RUNES

**Clear rates** (main 0.562.0 against this branch, the same seeds):

RESULTS_BALANCE

## Checks

RESULTS_CHECKS
