# Expansion tavern art

Owner: Codex art chat. Branch: `art/expansion`. Worktree: `/workspace/expansion-art`.
Scope: two source PNGs requested by the owner; no runtime integration.
Completion: inspect tavern references, paint both props, verify sizes and transparency,
and submit through the Expansion art PR.

- `art-source/expansion/hester-table.png`: 384×256, merchant trestle table,
  green-and-cream canopy, books, boots, dagger, potions, chest, lantern and book sign.
- `art-source/expansion/elders-table.png`: 320×112, long oak table with six empty
  high-backed chairs, three candles and a clay pipe.

Original generated pixel artwork, guided by `src/art/tavern/table.png`,
`longtable.png`, `barrels.png` and `docs/samples/cliff-roam/tavern-393.png`.
Final exports use nearest-neighbour sizing and binary alpha for crisp edges.
Both images were visually inspected; dimensions, binary transparency and clear
corners were checked. No people or lettering. Runtime tests/build were not run:
these source assets are not loaded by the game yet. The director handles integration,
runtime scaling, credits and any release changes. No merge or deployment performed.
