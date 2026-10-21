## Playing offline

The game plays with no connection once it has been opened online once (the owner's ask: on a plane).

- `build.mjs` writes `out/web/sw.js`, a service worker that caches every file at install: the page, `game.js` (which
  carries the sprites as data URLs), the backdrops, the area backdrops, the music and the icons (`FILES`).
- Fetches go to the network first, so a new version shows as soon as there's a connection; a failed fetch, or one
  still hanging after 4 s (a plane's weak signal), is answered from the cache. Matching ignores the query string, so
  `?seed=` and `?band=` pages work offline too.
- Saves are in localStorage, so runs, heroes and the castle carry on offline.
- `src/main.ts` registers the worker on https (GitHub Pages) and on localhost (for testing).
- Checked with Playwright: load once, go offline, reload, start a fight.
