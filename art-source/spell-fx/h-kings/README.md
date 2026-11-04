# King's spells paintings — Session H

Fourteen original painted effect sheets and fourteen round spell-card emblems,
made with OpenAI image generation for this game. Source art only; the game does
not load this session yet.

Owner: Codex art task. Branch: `art/spell-fx-kings`, based on `main`.
Scope: additions under `art-source/spell-fx/h-kings/` only. Completion: all fourteen
named sheets and icons, format checks, visual review and a pull request; no import.

The sheets follow [the brief](../BRIEF.md) and [packing conventions](../README.md):
256 × 256 px square cells, eight columns, transparent backgrounds and corners,
21 px clear margins (at least 8%), and a 3/4 isometric view. Ground rings and
sigils use flattened 2:1 ellipses. Rows run left to right in this order:

| Part | Frames | Playback |
| --- | --- | --- |
| `cast` | 8 | once, gathering and dispersing to faint wisps |
| `impact` | 8 | once, burst and dissolution to faint wisps |
| `stand` (walls only) | 6 | loop, constant visible wall with subtle movement |

`wallOfFire`, `iceWall` and `boneWall` have the third row; its final two cells are
empty. The remaining sheets have two rows. There are 242 used cells in total.
The explicit boneWall stand-loop request is included alongside the two elemental
walls. Every `icons/<key>.png` is 256 × 256 px, with a round gold-rimmed emblem
and transparent corners.

| Key | Painting |
| --- | --- |
| `wallOfFire` | Roaring flame line rising, burning and dispersing |
| `iceWall` | Jagged blue crystal wall, frost glints and shattering shards |
| `shatter` | Empty frozen shell bursting into blue shards |
| `gale` | Sweeping teal wind, leaves and curved streaks |
| `thunderclap` | Overhead thunder burst and flattened shockwave ring |
| `thornSnare` | Dark thorny vines erupting and wrapping an empty space |
| `charm` | Pink-violet hearts and swirling glamour |
| `foresight` | Golden third eye with a soft violet veil |
| `sunbeam` | Golden sunlight shaft and spreading radiance |
| `venomFang` | Spectral green serpent fangs striking |
| `mirage` | Wavering coloured heat-haze after-images |
| `drainLife` | Crimson life ribbon drawn left |
| `boneWall` | Ivory bones and skulls rising through violet mist |
| `raiseDead` | Flattened necromantic sigil and a rising skeletal hand |

## Sources and reproduction

`originals/` retains the unmodified image-tool paintings, including the icon
contact sheet. The references were the existing `a-toolkit/wall-fire.png` and
`g-spells/charm.png`; the current `src/spellIcons.ts` uses elemental pixel frames
from `src/art/fx/pack/atlas.png`. The new emblems keep those bold elemental colours
while following the requested round painted spell-card treatment.

`pack.py` cuts the generated uniform grids, removes low-alpha matte, feathers crop
edges and packs the paintings with a single scale per row. It does not draw new
spell shapes. A shared opacity tail on the two one-shot rows completes their
painted dissipation; stand rows receive no opacity animation. Icons are cut from
their generated contact sheet and scaled with clear padding. `layout.json`
records source rectangles. Pillow is required:

```sh
python3 art-source/spell-fx/h-kings/pack.py
```

This reproduces all final sheets, icons, [preview](preview.jpg), layout and
`checks.json`. Checks cover geometry, contiguous frame counts, transparent
corners, clear margins, nonempty used cells, faint one-shot endings and no
stand-loop blackout. Visual review covered the contact sheet and wall strips.
These checks do not establish runtime animation timing or seamless loop playback.

Handoff: art is ready for review. The current importer manifest has no `h-kings`
session; the existing importer's `check` function was also run directly against
these explicit row specifications. Adding manifest entries, runtime icon wiring,
atlas import, credits outside this folder and live-fight/reduced-motion checks
remain integration work. No application source changed, so app tests, typecheck
and web build were not run.
