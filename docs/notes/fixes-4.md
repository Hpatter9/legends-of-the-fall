# FIXES-4 — marks under the heroes, the summon screen's empty box, each unlock told once, talent auto-spend

Branch: `claude/fixes-4` (from `claude/sanctum-tidy`, merged with main 0.293.0). Four owner asks.

## 1. "The tile highlights for a skill should be under the heroes so you can see who is going to be hit"

**What was wrong.** The fight's effects (`render/fx.ts`) are one layer drawn over the whole board (`Fx.root`, z-index 1e7), and the
tile marks were laid there: a boss's signature windup (`bossFx.ts`), a land hazard's tell, burning ground, caltrops, a snare, an
aura's reach, a kit's flood. So every mark was drawn over the fighters standing in it, the very ones it warned. The board's own marks
(deploy, hover, the spell aim's 3x3, `BoardView.mark`) were already in each tile's column, under the fighters, and are unchanged.

**The fix: a ground layer per tile.** Each tile's container (`BoardView.section`) now holds, after its column and its mark and before
its props, an empty `ground` container (`BoardView.groundAt(u, v)`). The board is drawn a diagonal row at a time (`depthIn`: a row's
tiles at `depth`, whoever stands on them at `depth + 5`, the next row's tiles at `depth + 10`), so anything in a tile's ground lies on
its top, under its props and under every fighter, and the nearer rows' columns still cover it. `Fx.groundOf(u, v)` gives the layer:
the tile's ground, else `Fx.ground` where the page shows it (the Last Stand's baked hall puts it at z-index -4.5e5, over the floor
and the posts' marks, under the fighters), else the effects' own layer.

Laid on the ground now (`groundMarks.ts`):
- **A boss's signature windup**: each tile a dark red tint with the red fill growing from its middle as before, now a faint line
  round each tile and a bold red rim round the whole patch (`patchTile`, `patchRims`).
- **A land hazard's tell**: its colour's tint and rim, the same way.
- **An aura's reach, drawn** (no painting for it): the reach's tiles tinted with a rim, laid again as its caster moves. (It also
  fades out now when the aura ends; before, its breathing reset its alpha each frame, so it never did.)
- **Painted ground loops** (the painted auras, the Wolf Bard's song, the fields, Spike Growth, the snare, a spell's ground under
  those it struck): a painting is one sprite across many tiles, so it is drawn once per diagonal row it covers, each copy cut (one
  mask) to that row's tile tops and put in a layer just over the row (`BoardView.groundRow(depth)`, z-index `depth + 1`):
  `GroundPaint`. A reach-3 aura is seven pieces. The storm cloud, which hangs over its caster, stays over everything.
- **Burning ground's flames, caltrops' runes, a drawn snare**: each on its own tile's ground.
- **A kit's flood, walls and statues**: on their tile's ground, so the walls sort with the fighters by depth as their comment always
  meant (they were drawn over everyone).

A mark over many tiles is a `GroundSet`: one handle that fades and drops its pieces. A board rebuilt under a mark takes its pieces
with its tiles; `Fx.step` drops an effect whose view is gone. The rim's rule is pure (`render/groundRules.ts`, tested in
`test/ground-marks.test.ts`): a tile's edge is rimmed when no tile of the patch at its height lies beyond it on the screen.

Left as they were: the meteor's scorch, the moments, numbers, bursts and the stands over a fighter (states such as a stun), which are
effects rather than area marks.

**Pictures:** `node tools/fixes-4/marks.mjs <tag>` (after `npm run web`) starts an Orc fight, stops it, and lays a boss windup, a
hazard tell, a burning ground, caltrops, a snare and the spell aim's 3x3 round the heroes (`<tag>` with `aura` adds a painted
Healing Mist and a drawn ring). Before and after: `docs/samples/fixes4-marks-before-393.png`, `-after-393.png`, and the close crops
`fixes4-marks-{before,after,after-aura}-{393,360,412}-zoom.png`.

## 2. "Remove the text box that's now empty on the summoning tab"

Since SANCTUM-TIDY the shards' scroll is folded to its row ("Hero shards · the nearest hero · 0 / 4 ▾") with the progress bar under
it: a bordered strip the width of the panel, empty while the nearest hero has no shards, which is most of the time. The row's count
says the same thing, so the bar now lives in the opened part of the scroll only (`hall.ts`, `update`), with the hint and the odds;
folded, the scroll is the one row. The scroll's foot padding is trimmed with it. Before and after:
`docs/samples/sanctum-fixes4-{before,after}-{bound,going,fresh}[-360|-412].png` (`node tools/sanctum-tidy/shots.mjs <port> <tag>`).

## 3. "It said 'unlocked' twice. Remove the old ones in favour of the new ones"

Each unlock is now told by exactly one announcer, and every unlock a film reveals is told by the film's end card only. The table of
unlock kind to announcer is `src/sim/unlockTell.ts`, tested by `test/unlock-tell.test.ts`; the full list, before and after, is in
[unlock-once.md](unlock-once.md). In short: the "A new army marches" banner, the "Ascension N is open" lines, the first awakening's
"Awakened" word and the "X joins you" toast are gone; the end card shows on its own when the film does not play (cinematics off), once
per session per unlock.

## 4. "We need an auto-spend for a hero's talent points"

`src/sim/talentAuto.ts` (`autoPlan`) plans a hero's free points by its calling, through `talents.ts`'s own `learn`; an "Auto" button
on the talent tree and "Auto all talents" in the Upgrades list, each with a preview to confirm. Details in
[talent-auto.md](talent-auto.md); tests in `test/talent-auto.test.ts`.
