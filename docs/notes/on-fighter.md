# ON-FIGHTER: an effect on a fighter leaves the fighter seen

The owner, with a screenshot of four heroes at a wave's end, each inside a pale green column of vapour: "Effects like this still
hide the heroes. We need to change up how they look so it's not hiding them. Maybe it's a wispy smoke that circles around them."

## Which effect it was

The **heal over time's status loop** (`regen` in `STATUS_LOOKS`, the pack's `forest-status` strip), drawn by `unitView.ts`
`drawStatuses` over the fighter's body at 1.3 times its height and nine tenths strength for as long as the heal holds. The Cleric's
Prayer of Healing puts it on every ally for five seconds, and so do the other heals over time; it was still on them as the wave
ended. Reproduced with the Druid, the Warlock, the Cleric, the Knight and the Archer (`WATCH=1` on
`tools/blender-fx/ult-shots.mjs`: the party fights a wave on its own and is photographed through it). The other five statuses (a
shield, haste, a rally, a banner, a frenzy) were drawn the same way.

## The rule (`src/render/onFighterRules.ts`, `test/on-fighter.test.ts`)

1. The middle of a fighter's body (`BODY`: 0.6 of a tile wide, from 0.2 to 1.0 of a tile above the feet) stays readable. After a
   brief flash nothing may cover more than `BODY.CEILING` (15%) of it, counting how see-through it is drawn.
2. What stays on a fighter goes ROUND it: a pool on the ground at its feet, under the sprite; wisps of smoke that circle the
   body, drawn under the sprite for the back half of each turn and over it, small and faint, for the front half.
3. A clip that plays on a fighter is drawn twice: at full strength UNDER the fighter's body (a layer inside the fighter, just
   below its sprite: `UnitView.underLayer`), and over the fighter only as thinly as its measured cover of a body allows
   (`overAlpha`: the ceiling over the cover). So it is seen all round the body and behind it, and the body through it.

## What is built

- **The six statuses** are a pool and wisps (`STATUS_ROUND`, `ROUND`, `wispAt`, `wispsOf`): rendered loops `aura-pool-<el>` and
  `aura-wisp-<el>` in five elements (new scenes `pool` and `wisp`; energy and smoke, not things). Three wisps in all, shared out
  among the statuses on a fighter, so three statuses do not put three times the smoke in front of it; at most two are in front at
  once, each half size and two fifths strength there (`frontCover` is 14% of the body, under the ceiling; a test holds it).
  Reduced motion holds them still; the battery saver has two.
- **Every rendered clip an ultimate plays on a fighter** (a wind-up on its caster; a strike on each fighter it touches, on each
  friend, or round its caster; every aftermath) goes through the two layers. `tools/blender-fx/body_cover.py` measures each such
  clip's cover of the body's box, frame by frame after its first 150 ms, and writes `src/render/bodyCover.ts` (the build runs
  it); the renderer thins the over layer by it. A test holds that every on-fighter clip is measured and that its cover times its
  thinning is under the ceiling.

## Presence without cover (the director's second order)

`docs/samples/blender-fx/on-fighter-regen-393.png` (three rows: before, the first fix, now) and
`on-fighter-ultimates-2-393.jpg` (the Priestess, the Corsair Surgeon, the Knight, the Gorgon, the Harpooner and the Banneret, five
moments each from the wind-up on).

- **The smoke is seen.** Five wisps (three on the battery saver), each four fifths of the fighter's height across and at full
  strength while it is behind the body; in front, three tenths of that and faint. At most three are in front at once, and
  `frontCover` is still under the ceiling (a test). The pool is fainter: the smoke first, the pool second.
- **An ultimate's clip on a fighter lands with force, none of it over the body** (`UNDER`): the layer under the body is drawn 15%
  larger than the clip and keeps its glow; a strike puts a bright ring of its element on the ground at the fighter's feet, under
  the fighter; and for its first 150 ms the clip is over the body at full strength (the rule's brief flash), then thin.
- **An under layer inside one fighter still draws over fighters standing farther back.** That is the painter's order (the effect
  stands where its fighter stands), and it is not cheap to change: a layer under ALL the fighters would also be under the nearer
  tiles' tops, which are drawn after the farther rows, so a pool at a near fighter's feet would be cut off by its own tile. What
  it would take: the board giving a layer for each diagonal row that sits over that row's tiles and under every fighter of that
  row and of the rows behind it, which means moving the farther rows' fighters above the nearer rows' ground in `boardView.ts`
  (the march-stays builder's file now). Not done.

## The painted effects and the king's spells (group 2)

`docs/samples/blender-fx/on-fighter-painted-393.png` (the Druid's party under the Prayer of Healing, before above, now below) and
`on-fighter-spells-393.jpg` (the king's Heal, Shield and Haste on a unit, four moments each).

- **Every painted bit** (a skill's cast and hit, a signature's steps, `MOVE_PAINT`, `HEALER_PAINT`, the spell sheets' parts, the
  pack's puffs and rings: all of them are the particles) that lies over a fighter's body is drawn over it at the ceiling itself
  (`PAINT_OVER`, 15%; it was 60%) and again at its full strength under a body (`Particles.under`). Where it lies over several
  fighters it goes under the one standing farthest BACK, so it is behind all of them and covers none.
- **A plain strip** (`anim`) and **a king's spell's rendered clip on a unit** (`bfxOnce`) over a fighter go under that body whole.
- A fighter's under layers are dropped when the fighter goes (`stepUnder`).

Still over a fighter at the old strength, and next: a painted beam's segments (`paintBeam`, six tenths where a segment crosses
a body), the `aura-spirits` and `aura-eclipse` loops, the ailments' front layers, a showcase's beats on the caster.

## The survey: rendered clips on a fighter, worst first

238 clips on a fighter; over 0.15: 235; over 0.5: 193 (before this change every one of them was drawn over the fighter at full strength).

| Clip | Most of the body covered | On average | Lasts |
| --- | --- | --- | --- |
| `ult-banneret-strike` | 100% | 83% | 1300 ms |
| `ult-bombardier-windup` | 100% | 87% | 2000 ms |
| `ult-corsairSurgeon-strike` | 100% | 64% | 1300 ms |
| `ult-corsairSurgeon-windup` | 100% | 100% | 1900 ms |
| `ult-gorgon-strike` | 100% | 71% | 1300 ms |
| `ult-harpooner-aftermath` | 100% | 87% | 1600 ms |
| `ult-harpooner-windup` | 100% | 85% | 1700 ms |
| `ult-inquisitor-aftermath` | 100% | 84% | 1800 ms |
| `ult-knight-strike` | 100% | 70% | 1300 ms |
| `ult-kraken-aftermath` | 100% | 86% | 1700 ms |
| `ult-kraken-strike` | 100% | 87% | 1300 ms |
| `ult-kraken-windup` | 100% | 72% | 1900 ms |
| `ult-paladin-aftermath` | 100% | 70% | 1700 ms |
| `ult-plagueDoctor-strike` | 100% | 70% | 1300 ms |
| `ult-priestess-strike` | 100% | 80% | 1300 ms |
| `ult-rifleBot-strike` | 100% | 59% | 1300 ms |
| `ult-samuraiCommander-strike` | 100% | 50% | 1300 ms |
| `ult-shambler-aftermath` | 100% | 87% | 1600 ms |
| `ult-yamabushi-windup` | 100% | 95% | 1900 ms |
| `ult-priestess-windup` | 100% | 88% | 2200 ms |
| `ult-vael-windup` | 100% | 85% | 1900 ms |
| `ult-knight-aftermath` | 100% | 69% | 1700 ms |
| `ult-wolfBard-strike` | 99% | 69% | 1300 ms |
| `ult-mummy-strike` | 99% | 64% | 1300 ms |
| `ult-dhampir-windup` | 99% | 87% | 2000 ms |

The whole table is `tools/blender-fx/body-cover.json` (238 clips).

## Photographs (393x852)

- `docs/samples/blender-fx/on-fighter-regen-393.png`: the owner's case, the Druid's party with the Prayer of Healing on it and at
  the wave's end, cut close and doubled. Before: a green column over each hero. After: a green pool under each hero and small
  wisps; every sprite is plainly seen.
- `docs/samples/blender-fx/on-fighter-ultimates-393.jpg`: the Priestess, the Corsair Surgeon and the Knight, before above and
  after below. The Priestess's pillar, the Surgeon's spout and the Knight's dome stand behind the heroes, who are in front of them.

## Not yet under the rule

See the end of the section on the painted effects, above.
