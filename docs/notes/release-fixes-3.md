# RELEASE-FIXES-3: a new version offered at once, and a damaged run kept

The director's follow-up to `docs/notes/release-fixes-2.md`, on `claude/release-fixes-3` from `main` at 0.599.0.

## UPDATE-READY: "A new version is ready"

The service worker serves a version from the phone, so a new version's worker installs in the background and the game stays the old
one until the page is loaded again (0.599.0: the start after the one that finds it). So the owner never waits a start for it: once a new
version's worker has taken over from an old one, the home screen shows a small standard card, "A new version is ready", with **Reload**
and **Later** (`src/updateReady.ts`, the rules in `src/updateReadyRules.ts`):

- only on the home screen: never in a fight (under the home screen too), an assault, or under another card or screen; the page asks on its
  home screen's quarter-second tick, which does nothing until a new version has taken over;
- once a session: Later puts it away, and the next cold start is the new version anyway;
- the first visit's worker taking charge is no new version: no card;
- nothing reloads by itself: only the player's tap on Reload.

The web build only: the store app has no service worker.

## A damaged run save kept aside

As the meta's (`docs/notes/guarded-saves.md`): a `legends.run` that is not JSON, or not a run, is kept under `legends.run.unreadable`
and the player told ("Your run could not be read ... Your heroes, crowns and castle are safe", Carry on) before the Keep goes on without
it. A run that reads but cannot go on here (`runFits`) is dropped quietly, as before.

## Checked

- `test/update-ready.test.ts` (the rules, the words, Reload by tap only), `test/guarded-saves.test.ts` (the run's two new tests).
- `tools/release-audit/sw-update.mjs` on the built game, all six steps: the first visit (no card), an online start (nothing fetched), the
  next version found, **the home screen's card and its Reload: the new version at once, nothing fetched**, the next start, and offline.
- `tools/release-audit/robust.mjs --only run` (the run kept, the player told, the meta's 500 crowns untouched), `--only corrupt`,
  `--only full`.
- Not checked end to end: the card held back through a fight (the rules' test covers it; the update tool has no third version to bring
  in mid-fight).
