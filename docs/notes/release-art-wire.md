# The release's art, wired in (RELEASE-ART)

The 13 pieces the owner made from [release-audit-art-prompts.md](release-audit-art-prompts.md) (PR #658, under `art-source/release/`) are
now in the game. Each was resized and converted only, never repainted. Photographs are in
[docs/samples/release-art-wire/](../samples/release-art-wire/), at 393 x 852; the starter, the bubble, the HUD and the poster are also at
360 x 780 and 412 x 915.

| Piece | Where it went | How it is shipped |
| --- | --- | --- |
| A1 Starter backdrop | Behind the starter pick (`starter.ts`), in place of the Overlook stand-in; the sheet is 84% tall so the gatehouse's arch and sky show above it | `src/art/release/starter-backdrop.webp`, 768 x 1536, 102 KB, bundled |
| A2 Speech bubble | `#quip` (`quipView.ts`): a nine-slice of the parchment, its 64 px corners kept at 16 css px; dark brown text, the speaker's name in brown capitals; the page's own tail in the rim's brass. The placement rules are kept, and the deploy's buttons are added (at 412 a bubble pushed below a tall bench sat on Fight!) | `ui/release/quip-bubble.webp`, by URL, offline |
| A3 Class sigils | The summon cards' faces (`summonTarot.ts` `sigil`, `SIGIL_ORDER` = `TRAIT_ELEMENT`'s order). The silhouette behind is fainter (0.3); the class's small icon is gone, as the sigil carries it | `src/art/release/class-sigils.webp`, bundled |
| A4 HUD hero row | Every fight HUD row (`paintedCombat.css`): a nine-slice, its brass-framed portrait inset kept whole at the left | `ui/release/hud-hero-row.webp`, by URL |
| B1 Codex unmet tile | Every codex entry not yet known (`codexView.ts` `card`), in place of the black square | `ui/release/codex-unknown.webp`, by URL |
| B2 Daily chest | The Daily's card (`dailyView.ts`). The chest that opens after a daily is still the pack's two-frame sprite, as the new painting has no open frame | `src/art/release/daily-chest.webp`, bundled |
| B3 12 icons | `releaseIcon` / `RELEASE_ICON` in `ornateMenu.ts`, and a choice row's new `art` option. Used for: the Assault's Full and Lite, Sound the retreat, Fill all the ranks, the bridge and the ford, the wall, wedge and loose formations, the ladder; the Nemesis board's blood oath (⚭); the hero page's "View full artwork" (⤢). The line formation keeps ━ (no icon was painted for it), as do the plan's ⛰, ↪ and ⛏ | `ui/release/assault-icons.webp`, by URL |
| B4 Achievement medal | Each row of the Achievements list (`achievementsView.ts`): lit once claimed, greyed until then, in place of ★ and ☆ | `ui/release/achievement-medal.webp`, by URL |
| C1–C4 Boss sheets | The Orc Chieftain, Bone Captain, Minotaur Champion and Gorgon Queen (`foes.ts`, `sheets.ts`, `sheets.json`), each on its soldier's grid | `src/art/units/*.png`, reduced to 256 colours (alpha exact): 41, 30, 71 and 82 KB |
| D1 Loading poster | The loading screen, embedded in `index.html` (`build.mjs` `LOADING_ART`). The old poster's crown mask and cloud layer were cut to its picture and are retired; the crowns' breathing light is moved onto the new crowns | `src/art/loading/release-poster.webp`, 80 KB; the page itself went from 1.7 MB to 1.0 MB |

## The bosses

- **Facing:** every boss faces right in every row, as its soldier does. The Minotaur Champion's walk row only looks left at a glance: its
  snout and axe point right on every frame, so it is not flipped.
- **Size:** each scale keeps the height on the board the boss had in its soldier's sheet. The painted figures are smaller in their
  frames, so the scales rose: 0.62 to 0.73, 0.86 to 0.82, 0.78 to 0.94 and 0.95 to 1.02.
- **Animation:** all four animate on the board (`c-bosses.png`).
- **Reach and gaze:** the reach table is regenerated (`tools/emit-points/reach.py`), and the Gorgon Queen's gaze leaves her eyes
  (`FOE_EMIT.gorgon_queen`, frame 10, the beam's frame).
- **Fights unchanged:** the simulation read a foe's look in three places: its family (the Bone Captain was armoured because his sheet
  was a skeleton's), its home army, and a quest's family of skeletons. `KIN_SHEET` / `kinSheet` in `sim/foes.ts` gives each of the four
  its soldier's look for those rules, so every recorded fight plays out the same (`test/ailments-identical.test.ts`). The new rule has
  `test/release-art.test.ts`.

## Credits

- CREDITS.md has one entry for all 13 pieces: original art made for the game, from the owner's PR #658.
- The Credits page's "Original art made for Legends of the Last Keep" now lists them for players.
