
## Portrait and heirloom frames

Repainted `art-source/expansion/frames.png` as one 1280×256 RGBA sheet: three matching brass portrait frames with one, two and three crimson-backed claw scars; an aged-gold filigree heirloom frame with tree crest and three empty bottom notches; and a red-stone gold signet ring at 60% cell width. Generated against the existing frame reference, then cropped and packed with nearest-neighbour sizing and hard alpha edges.

Visually reviewed all five cells. Verified dimensions, binary alpha, transparent padding and empty portrait centres (the heirloom crest extends into the top opening). Runtime tests/build not run: source art only. Handoff: existing Expansion art 2 PR #464; ready for owner review, no runtime integration or version bump.

## Cavern council backdrop

Repainted `art-source/expansion/council-backdrop.png` as one opaque 1024×1536 upright painterly pixel-art menu backdrop. Empty torchlit cavern council hall, long black table and dim unlabelled war map, horned throne, thirteen high-backed chairs, and orc/undead/beast wall banners in violet and ember light. The centre and outer edges are subdued for menu text. No people or lettering.

Visually reviewed the generated artwork; PNG header verified exact dimensions and RGB colour. Added to Expansion art 2 PR #464 on `art/expansion-2`. Runtime tests/build not run: source artwork and records only; no runtime integration or version bump. Ready for owner review.

## Elders' tavern table

Repainted `art-source/expansion/elders-table.png` to match the tavern prop references: 320×112 transparent oak table with six empty high-backed chairs, three candles and a clay pipe. Native-size visual review, RGBA, exact dimensions, binary alpha and transparent margins checked. [Handoff](expansion-2-elders-table.md). Source art only; no runtime tests/build.
