# RELEASE-FIXES-2: the release audit's next fixes

The director's list after the release audit (`docs/notes/release-audit-code.md`), on `claude/release-fixes-2` from `main` at 0.597.0,
one commit each. The Developer page (hidden in the Play build since 0.594.0) and the pictures moving out of `game.js` (the size job,
0.596.0 and 0.597.0) were left alone, as asked. Looks and the fights' outcomes do not change.

## 1. Guarded saves (`docs/notes/guarded-saves.md`)

Every saver goes through `sim/saveGuard.ts`: a write the storage refuses returns false, never a throw; the game plays on from memory and
tries again at every save; the player is told once a session ("Your phone's storage is full: progress can't be saved until space is
freed", a standard ornate card, `saveNotice.ts`). A save that cannot be read is kept under `legends.meta.unreadable` and the player told
before the Keep begins afresh. A plain bug under `src/sim/`: the throw stopped the game's own flow.

| Storage full (`tools/release-audit/robust.mjs --only full`) | Before | After |
|---|---|---|
| Beginning a run | `QuotaExceededError`: no run | the run begins, its wave is fought to the result card |
| The player | told nothing | told once |
| A cut-off save (`--only corrupt`) | replaced, its text gone | kept aside, the player told, then a fresh save |

## 2. Duchess's taps, and the camp's haystack treat

`sim/duchessTaps.ts`: the four places she is tapped count on the game's own meta and save it. They read the save from storage, added
one and wrote it back behind the meta, which the game's next save then wrote over (so "Her Grace" and the Tiny Tin Crown could be
missed). The camp's haystack treat had the same fault with real stakes: its stones or crowns went into such a copy, and the next save
took them back. The courtyard's treat already paid into the game's meta; it now saves it guarded as well. `test/duchess-taps.test.ts`
shows a tap surviving the next save (and the old way losing it), and that nothing in the page writes the save behind the meta.

## 3. Rest when nothing is seen

- **Duchess by the fight's panel** (`duchess.ts`): her loop ran every frame of every fight, hiding her each frame in the three fights in
  four she does not visit. It now sleeps until she wanders in (`untilVisit` in `render/duchessRules.ts`), stops for a fight she is not
  visiting, and wakes for the next fight.
- **The portraits' warm-up** (`render/sheets.ts` `warmPortraits`): it read sheets' pixels in idle time even with the tab hidden; it now
  waits until the page is seen.

`test/background-rest.test.ts`.

## 4. The service worker: a version's own files cache first

Built by `build.mjs`. The files a version is made of (the `FILES` list, and the page) are served from that version's cache; a missing
copy is fetched and kept. A new version is found as before: the browser checks `sw.js`, the new worker fetches the new files past the
browser's own cache (`cache: 'reload'`), takes over and clears the old cache. Anything outside a version is network first, the cache when
offline, as before. `tools/release-audit/sw-update.mjs` checks it end to end (a second version made from the first by renaming it):

| | Before (main's worker) | After |
|---|---|---|
| An online start, same version | `game.js` fetched again, 21 requests | nothing fetched |
| A new version published | shown on the start that finds it | the start that finds it is still the old one (from the phone); the new worker installs; **the next start is the new version** |
| Offline after the update | the new version starts | the new version starts |

The one change a player could notice: a new version shows one start later than it did. Showing it at once would mean reloading the page
under the player once the new worker takes over; that is the owner's call (a "new version ready" card, or a reload on the home screen).

## 5. `Fx.immune`

The last Pixi "addChild: Only Containers" deprecation: the "Immune" label's crossed-out chip was the Text's child. It is now a sibling just
over the word, following its place, scale and fade each frame. Measured in the browser for every ailment, the old label's width with its
chip was the word's own (45.17 x 16): a Text's width never counted its child, so later labels are still placed by the word alone.

## Numbers

`tools/release-audit/profile.mjs --sites --waves 10 --secs 8`, `main` at 0.597.0 (`out/plain-before`) against this branch (`out/plain`),
a 393x852 page in headless Chromium with software rendering, the CPU throttled 4x (for comparing, not a phone's frame rate):

| Screen | Before: main thread busy (style), frames asked a second | After |
|---|---|---|
| **Home, tab hidden** (the warm-up's first minute) | **16.8% (script 7.7%)** | **7.5% (script 0.1%)** |
| **Deploy** | **54.8% (2.1%), 76.9; Duchess's loop 14 of them** | **44.0% (1.6%), 54.6; hers gone** |
| A fight at x1 | 64.7% (29.5%), 24.6; Duchess's loop 4.5 of them | 71.9% (33.1%), 20.9; hers gone |
| Home | 96.0% | 95.9% |
| Recruit / Heroes / Castle / Spells tab | 26.2 / 40.4 / 56.0 / 29.2% | 26.2 / 40.8 / 47.8 / 24.9% |
| Settings / Armies page over home | 12.2 / 13.7% | 12.8 / 13.9% |
| A fight, tab hidden | 33.3% | 35.5% |
| Home after the run / hidden | 51.4 / 33.8% | 44.8 / 46.9% |
| Heap MB, waves 1 to 10 | 46, 48, 51, 52, 55, 56, 58, 59, 61, 58 | 49, 51, 53, 55, 58, 59, 61, 61, 63, 62 |
| Pixi textures, waves 1 to 10 | 524, 737, 577, 646, 671, 686, 679, 602, 659, 602 | 524, 740, 574, 675, 675, 649, 688, 590, 615, 603 |
| Twenty openings of the menus | no growth (heap 71 to 62 MB, DOM 1,891, 79 listeners, 26 observers, 5 intervals) | no growth (the same, 80 listeners: the cover watch's) |
| Console warnings and errors (a menu sweep, ten waves) | 0 | 0 |

Reading it: the two rows in bold are the fixes' own; the rest move by a few points either way between two runs of the same screen (the
fight's frames are SwiftShader's, at 4 a second, and its row swings by ten points run to run; the hidden rows after the run are not
script, 0.7 and 0.8% both). The heap and textures over ten waves are the same: no leak before, none after. (The heap is now ~50 MB,
not ~450: the size job took the pictures out of `game.js` in 0.596.0 and 0.597.0.)

The service worker's and the saves' numbers are in their sections above.

## Proof

- `npm run typecheck`: clean.
- `npm test`, the full suite, run alone on the branch's last code commit: 3,429 tests, 3,429 pass, 0 fail (new: `guarded-saves`,
  `duchess-taps`, `background-rest`).
- `npm run web`: builds.
- In the built game: `tools/release-audit/robust.mjs --only full` and `--only corrupt` (above); `tools/release-audit/sw-update.mjs`, all
  five steps pass on this branch (and two fail on `main`'s worker, as the table says); the profiles above.
- Not run: a real phone; the soaks.
