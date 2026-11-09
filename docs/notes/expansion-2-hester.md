# Hester merchant table source art

Owner: Codex. Branch: `art/expansion-2`. Worktree: `/workspace/legends-of-the-fall`.
Scope: one replacement `art-source/expansion/hester-table.png`; no runtime integration.

Inspected tavern table, longtable and barrels sprites and the cliff-roam tavern
screenshot before generating the merchant prop. The replacement uses a compact
side view, muted olive/cream canopy, reddish wood, dark plum-brown outlines and
warm upper-left highlights. Includes books, boots, dagger, three potions, chest,
hanging lantern and open-book sign; no people or lettering.

Generated source was exported on a 192×128 logical grid, nearest-neighbour doubled
to 384×256, with a 32-colour palette and binary alpha. Final image visually reviewed;
PNG decode, exact dimensions, alpha values, transparent padding and 2×2 pixel grid
checked. Submitted to Expansion art 2 PR #464. Runtime tests/build not run because
only source art and documentation changed. Director owns integration and release.
