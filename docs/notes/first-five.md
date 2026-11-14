# The first five minutes (FIRST-FIVE)

The director's follow-up to the release audit of the art ([release-audit-art.md](release-audit-art.md)): its findings 1 to 7 and 11, the
ones that need no new art, plus three tap targets. Each is its own commit. Before and after photographs, at 393 x 852, 360 x 780 and
412 x 915, are in [docs/samples/first-five/](../samples/first-five/).

| # | What | How |
| --- | --- | --- |
| 1 | The starter pick was a hand-styled page | The standard ornate menu, the sheet kind (`starter.ts`): "The Last Keep" over "Choose your first heroes", each pack a gilded choice, the primary button in the footer. The Battle Overlook painting (`art/camp/overlook.png`) stands behind it until prompt A1's backdrop lands. Escape is held: the pick has no way out but a pack. |
| 2 | The speech bubble was the old pale pixel box, laid over anything | An ornate stand-in in CSS until prompt A2 (`quipView.ts`): dark slate, a brass rim and tail, the speaker's name in brass; Duchess's stays cream. Placement: it keeps clear of the starter's head, each pack's name and chips, the bench, the home screen's tabs, battle button and plates, as well as the fight HUD it already kept clear of. A speaker hidden under an open layer (a card, a sheet, the codex, Settings, the Sanctum, the War Council, a wave's card) is not heard at all. A bubble never lies over a hero's row or card on a list (the starter's packs, the War Council's company and pool, the hero list, the Houses, the codex), so the starter has no hello bubble at all (the director's call). |
| 3 | The first deploy showed empty sky and water past the near edge | `deployFit` (`render/deployCam.ts`): the deploy view stands back a little (`DEPLOY_COMFORT`, 0.92), then slides towards the board's middle as far as it can with every placement tile still inside the room. Tested in `test/deployCam.test.ts`. |
| 4 | The status line ran into the HUD crest's sword tips | The crest is a little smaller (140 x 47) and the top bar keeps a band at its foot for the tips (`battleCommand.css`). |
| 5 | Three looks for the main button | The gold plate everywhere: the Sanctum's Continue and Use 10 stones (which had no frame), March to battle, Run recap and Next stage, and the run recap's Continue (`paintedButtons.css`). |
| 6 | Toasts covered titles and Back buttons | The toasts already queued one at a time. Now each one's lane also starts under every page head showing (`PAGE_HEADS`, `toastFloor` in `hudClear.ts`): the top bar, the Formation plate, the War Council's, a sub-page's, the Sanctum's and Settings' headers, the quest log's and the Pact Gallery's. |
| 7 | A lost wave's card hid the board and the HUD | Behind the card a light veil now, darker only round the card, with no blur. The top bar stays over it (`battleReports.css`). |
| 11 | The quest log was a plain sheet | The standard ornate menu, the sheet kind (`home.ts` `openQuests`, `questLog.ts` with `framed`): "The tavern board" over "Quests", its tabs as gilded choices, Back in the footer. Its rows are unchanged. The art labs still call it unframed. |
| Taps | The codex's Claim (32 px) and tabs (30 px), the rune bench's Merge all, Auto runes and Satchel (30 px) | 44 px tall (`paintedButtons.css`). |

## Still open

- A toast can still sit over a section heading inside a page, such as the codex's "Bestiary 0/55". It no longer covers a page's title or
  its Back.
- On the board the photographs used (seed 7, the first army), the deploy camera's change is small. That board already framed well.
  The audit's first-deploy board was a wider one (14 x 18). The tests cover that case.
- The art for prompts A1 (the starter's backdrop) and A2 (the bubble) is still to come. Both stand-ins are marked in their files.

## Checks

- `npm run typecheck` passes.
- These tests pass: ui-standard, painted-buttons, achievements, codex, deployCam, fight-hud, first-hour, quips, rune-bench, starter,
  summon-art, summon-stones, jrpg-recap, party, quest and settings.
- `npm run web` builds.
- The photographs were taken in the pre-installed Chromium on a fresh save (seed 7) and a late save, the same steps on the build before
  and the build after.
- The Developer page is left to the store builder.
