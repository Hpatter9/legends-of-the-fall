# HIT-SPARKS: where a blow lands, a rendered spark

The director's order after the skills survey: keep the 168 painted skill pictures, and start where rendered clips clearly gain.
First, the hit sparks.

## What plays

`hitSpark(kind, el, share)` in `src/render/blenderFxRules.ts` (pure; `test/hit-sparks.test.ts`):

| Landing | Clip | Element | Size | Lasts |
| --- | --- | --- | --- | --- |
| a plain blow | a small star of sparks (`hit-blow`) | light | 1.0 to 1.5 with the share of health taken | 200 ms |
| a shot's burst | the same star | the shot's own | 1.0 to 1.5 | 220 ms |
| a block (a raised guard) | the same star | ice (pale) | 1.1 | 220 ms |
| a killing backstab | two crossed strokes (`hit-cut`) | dark | 0.7 | 260 ms |
| a crit | two crossed strokes | light (gold) | 0.8 to 1.0 | 280 ms |

A crit's picture is the larger clip at the larger size, so the least crit is plainly bigger than the greatest plain blow (a test).
Every one is over in under 300 ms. `Fx.bfxHit` plays it; where its clip is not held the painted spark plays as before (the
fallback the king's spells have).

Over a fighter it follows ON-FIGHTER: its first frames, no longer than the rule's 150 ms flash, are drawn as they are (a new
`bare` option on a particle: no thinning, no copy under); the rest is thin over the body and whole behind it.

Not changed: a skill's own hit (its signature's painted steps), the dust or blood puff, the debris, the ailments' ticks, a big
foe's death burst, the swing's slash, the fan of sparkles that shows a blow's direction.

## Caught in a frame, and what that showed

`docs/samples/blender-fx/hit-sparks-caught-393.png`: a plain blow, a shot's burst, a block and a crit, each 16, 64 and 128 ms after
it lands, cut on the struck fighter at four times size (the Knight and the Archer against a wave; `CATCH=blow,burst,block,crit`
on the photographer steps the fight a frame at a time until each lands). The blow, the burst and the block are a small bright
star on the body, gone by 64 ms; the crit is a gold cross about as large as the fighter, gone by 128 ms.

Three things the first catches showed, each mended:

- **The clips opened on their weakest frames** (a spark gathering), and those were what played at full strength in the first
  moment; the strong frames came after, thinned. The clips now leave their first three frames out (`HIT_SKIP`), so each opens at
  its peak.
- **The crit was a thin pale cross, then, with thicker strokes, far too large** (it covered the whole fighter and its
  neighbours). Its strokes are bold and it is drawn at 0.8 to 1.0 of the clip, about one fighter across: more than twice a plain
  blow's star.
- **The photographer was not holding the fight still.** The game starts its own loop again when it finds it stopped
  (`watchLoop`), so real time passed between a step and its photograph and a 150 ms flash was over before the picture. The tool
  puts that watch to sleep. (Earlier photographs in this work that "missed" a quick effect may have been this.)

Honest: the block's star is pale yellow-white, not clearly blue; in a frame it is hard to tell from a plain blow, and it is the
word "Block" over it that says what it is.

## The clips, and what they cost

Twenty new clips, `hit-blow-<el>` and `hit-cut-<el>` in the ten elements (`HITS` in `tools/blender-fx/effects.py`: the `sparks` and
`cross` scenes, small). They lie in the atlases every fight holds (the core), so a fight asks for nothing more.

Memory, the same staged fight (the Samurai's party, 393x852) on main 0.559.0 and on this build:

| | Before | After |
| --- | --- | --- |
| Fight-loaded atlases, decoded | 40.07 MB | 40.07 MB |
| Fight-loaded atlases, on the graphics card | 10.17 MB | 10.17 MB |
| Core atlas 1 (pinned) | 2030 x 750 px, 5.8 MB | 2042 x 917 px, 7.1 MB |

So 1.3 MB more, fixed, in the core; nothing more loaded in a fight.

## Photographs

`docs/samples/blender-fx/hit-sparks-393.png`: the Knight, the Samurai, the Archer, the Wizard and the Kunoichi against the same
wave, cut close and doubled, 0.559.0 above and this build below, six moments. The rendered sparks are small bright stars at the
point of the blow (the second, fourth and fifth moments below); the fighters are not covered.

## A test changed to the order

`test/blender-fx.test.ts` held that every clip plays 400 ms or more. A blow's spark is ordered to land in under 300 ms, so
`hit-*` clips are held to 150 to 300 ms there and everything else to 400 ms and more, as before.

## The Shield's dome (ON-FIGHTER)

A king's spell's clip wider than a tile and a half lies over more fighters than the one it was measured on (a dome over a
party); its copy over the fighters is at the 15% ceiling itself. The copy under the bodies, with the rim and the ground ring, is
at full strength. `docs/samples/blender-fx/on-fighter-shield-393.png`: the dome is a faint wash over the party, who are plain inside it.

## `SKILL_FX` removed (the director's order)

`SKILL_FX` in `src/render/skillFx.ts` was a painted sheet for each of 158 skills' cast and hit. It could not play: every one of
its entries also has a signature (`signatures.ts`, or a borrowed one through `kitLooks.ts`), and the renderer read the table
only for a skill with none (counted with a throwaway test: 158 entries, none without a signature). Removed with it: the two
branches of `fx.ts` that read it and the `effect` method only they used. A skill with no signature still has the plain fallback
it had (the wind-up, the element's wave, the plain spark).

Tests, said plainly:

- `test/skill-fx.test.ts` checked the table itself ("every hero and foe skill has an effect of its own", "no effect names a skill
  that is not in the kits", and the table's sizes). It now checks what plays: that every hero and foe skill has a signature
  that shows something, that the table is gone and nothing reads it, and the king's Heal and Haste sheets' sizes as before. The
  assertion that no entry names a skill outside the kits went with the table.
- `test/class-heroes.test.ts`, `test/more-heroes.test.ts` and `test/ultimates.test.ts` each asserted a `SKILL_FX` entry for a
  hero's skill or ultimate; each now asserts its signature (for an ultimate, a signature with a cast).

Two tools read the table: `tools/fx-animate/lists.ts` (it only added the table's names to a list that has them from the
signatures) and `tools/fxlab/audit.ts` (the "before" column of an old audit, now empty; the table it wrote is kept in
`docs/notes/unique-spells-table.md`).
