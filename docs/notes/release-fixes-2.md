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

NUMBERS

## Proof

PROOF
