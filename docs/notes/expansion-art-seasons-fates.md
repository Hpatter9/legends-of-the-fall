# Seasons and fates source art

Owner: Codex. Branch: `art/expansion`.

Added `art-source/expansion/seasons-fates.png`: one warm painted sheet in muted gold and parchment, 1152×256 RGBA. Nine 128×256 cells, each icon centred in its upper 128×128 square. Order: Spring, Summer, Autumn, Winter, Mentor, Tavern regular, Shade, Fallen, Legend. Only the four seasons have brass rings.

Generated artwork, corrected transparency, then fitted the icons to the exact cell geometry. Checked the rendered sheet visually and verified dimensions, alpha bounds, all nine cell centres and a fully transparent lower half with Pillow assertions. No runtime code or integration changed; runtime tests and builds were not run. No version bump.

Ready for review in Expansion art. Future integration may crop each cell's top 128×128. No known blockers.
