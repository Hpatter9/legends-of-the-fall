# No Developer page in the Play build, and one way back (STORE-DEV)

From the art audit, for the store: the Developer page and its row were in every build. That page gives free crowns, hero shards and
summoning stones, and holds Build Town and Try an Assault. A Play reviewer could find free currency two taps from the camp.

## What changed

- **`settingsPages(store)`** (`src/settings.ts`) is the list Settings shows. In a store's build (`__STORE__`, `node build.mjs --store
  play`, `npm run web:play`), the Developer page and its row are left out. `devToolsOn(store)` is the rule: on only with no store, so
  the page stays on the web and in the GitHub release's app, where the owner tests. Diagnostics stays in every build.
  `pageRows('dev')` draws nothing in a store's build, so the page can't be reached any other way.
- **One way back on each screen.** A sub-page had two "‹ Back" buttons: the header's, which leaves Settings, and the page's own, which
  goes back to the list. `draw()` already hid the header's on a sub-page, but the painted glyph's `display: flex` overrode `hidden`.
  `settingsMenu.css` now keeps it hidden (`#settingsClose[hidden] { display: none !important }`), so a sub-page shows only its own
  "‹ Back". While the Credits sheet is open, the header's "‹ Back" is hidden under it too, and comes back when the sheet closes.
- URL switches (`?bench=assault`, `?duchess=`) are untouched: the installed app opens a fixed address, so a player can't type them.

## Test

`test/store-dev.test.ts`:

- the Play build's list has no Developer page but keeps Diagnostics, About, Credits, Updates and Save and data;
- the web build's list (and the tests' own, with no store) has the Developer page;
- the header's "‹ Back" stays hidden on a sub-page (the CSS rule, and `draw()` hiding it).

## Checked

- `npm run typecheck`, `npm test -- store-dev settings store-credits ui-standard back` (41 pass), `npm run web`, and
  `node build.mjs --store play --out out/web-play`.
- `node tools/store-ready/dev-shots.mjs` drives both builds at 393 x 852, 360 x 780 and 412 x 915, and fails if the web build lacks the
  Developer row, if the Play build has it, or if a sub-page shows more than one Back.
  - The web build lists sound … data, dev, diag … credits; the Play build lists the same without dev.
  - A sub-page shows one visible Back in both builds at every size.
  - There were no page errors.
- Pictures are in `docs/samples/store-dev/`: `web-settings`, `play-settings`, `web-subpage` (Developer) and `play-subpage` (Diagnostics),
  at each size.
