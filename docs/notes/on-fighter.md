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

## Not yet under the rule (the honest list)

These still lie over a fighter and are next, worst first by eye, since they are not rendered clips and are not measured yet:

- the **painted skill effects** (`signatures.ts`, `MOVE_PAINT`, `HEALER_PAINT`, the spell sheets and the pack strips): they are
  thinned to six tenths over a fighter (FX-CLEAR, `OVER_FIGHTER_ALPHA`), which is far above the ceiling;
- the **king's spells' rendered clips on a unit** (`bfxOnce`: the same six tenths) and the standing loops `aura-spirits` and
  `aura-eclipse` (drawn over the fighters; the spirits circle the body, the black sun hangs above it);
- the **guard's ring** (`unitView.ts`, the earth shield at 0.65 over the body while a guard is raised) and the **ailments' front
  layers** (`ailmentLayer.ts`, at half strength);
- a showcase's beats on the caster (`beat-*`).
