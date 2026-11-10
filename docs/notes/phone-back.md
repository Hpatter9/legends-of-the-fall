# Phone back: Back never leaves the game

The owner: "The back buttons or actions on a phone shouldn't close the app or back out of it. Just back out of the current menu. Or back to
the battle tab if they're on the main tabs."

This covers Android's back button and back gesture, in the browser, the installed app (PWA) and the Android app, and Escape on a desktop.

## What Back does

| Where | Back |
| --- | --- |
| Anything open on top: a card, sheet, ornate menu, full page, the hero sheet, Settings, the war table, a result or recap card, a tip, a picker | closes the topmost one, as its own Close or "‹ Back" would; the page presses that button, so any confirm it has comes too |
| A cinematic or cut-in: a film, a nemesis's taunt, an ultimate's moment, the Eidolon's call, a duel's walk-in, the boss's card, a summoning, a hero's arrival or reveal | skips it, as a tap does |
| The Recruit, Heroes, Castle or Spells tab, nothing open | goes to the Battle tab |
| The Battle tab, nothing open | nothing: the game stays |
| A deploy | what its Home button does: back to the camp, the run kept for Continue |
| A fight | Settings, the fight's one menu (the fight goes on, as when Settings is tapped); with it open, Back closes it |
| An Assault | its pause card; with it open, Back closes it and the assault goes on |

Back never drops a run.

## How it is built

- **`src/backRules.ts`** (pure, tested in `test/phone-back.test.ts`):
  - `backAction` decides from what is on top (a cinematic, an overlay, or nothing), the place and the home screen's tab.
  - `BACK_LAYERS` is every layer the page can put up: the selector that finds it open, whether it is a cinematic or an overlay, the
    controls that close it (tried in order), and the file that builds it. It covers:
    - the standard ornate menu (its footer's way out);
    - the home screen's sheet and full page;
    - Settings and its picker;
    - the summoning collection and the party;
    - the result card, the recap, the auto-replay summary, the ask and the tip;
    - a skill's sheet and a unit's card;
    - the dialogs from before the standard (chests, the daily card, the quest card, the rank-up and its list, the reveal card, the shop,
      the stall, the Pact Gallery, the art viewer, the trophy wall, the event cards);
    - the cinematics and cut-ins.
  - `wayOut` picks a layer's button by its words when it names no control ("‹ Back", "Close", "Not now", "Skip", "Continue"...).
- **`src/phoneBack.ts`**: the one handler, `phoneBack()`.
  - **The topmost layer** is the one holding what is uppermost on the screen at a few points (`elementFromPoint`), so the stacking order
    decides whatever built it. A layer left under something that is not one (the Armies page under the Assault's field) is not on top.
  - **It closes the layer** by pressing its first named control that shows, else its button that reads as a way out, else its own close
    (an ornate menu's `omclose`), else a tap on it: the down, up and click a finger makes, which is what skips every cinematic here.
  - **With nothing on top** it does the place's part through `main.ts`'s hooks: the place, the tab, the Battle tab, and the pause (the
    Assault's Pause button, the deploy's Home, the fight's Settings).
  - `window.__backLog` records each Back, for the checks.
- **The browser and the installed app: a history guard.**
  - The page keeps one entry pushed over its own (`history.state.lotfBack`). Back pops it, the page hears `popstate`, handles it and pushes
    the guard again.
  - So there is always an entry to pop, the history never holds more than the page's two (three counting the blank tab before it), and
    the address is kept as it was (`?bench=assault` and the rest, and any hash).
  - Chrome skips, on Back, an entry pushed without a touch, so the guard is pushed again at the next touch or key too.
- **Escape** goes to the same handler, first (in the capture phase), so a menu's own Escape (the ornate menu's, the reveal card's, a film's)
  does not close a second thing.
- **The Android app (Capacitor 7).**
  - Capacitor's bridge leaves Back to the activity, which would finish and close the app. No `@capacitor/app` plugin is installed, so
    nothing else took it.
  - `MainActivity` now registers an `OnBackPressedCallback` that calls `window.__phoneBack()` in the web view and never finishes. This
    covers the button and the gesture, the predictive one included.
  - The app is left with the home button or the task list.

**The "Press back again to leave" toast** the director allowed for is not needed, so it is not built:

- the Android app never forces an exit, its own callback takes every Back;
- in the browser and the installed app the guard is always there to pop, so Back on the Battle tab is swallowed.

## The audit

`test/phone-back.test.ts` fails when a new overlay can't be closed by Back:

- **every dialog built by hand** (a file that sets `role="dialog"` and is not the ornate menu) must be in `BACK_LAYERS`;
- **every top-level element of `index.html`** must be in `BACK_LAYERS` or named in `NOT_A_LAYER` with why. Those are the banners, the
  bars, the board, the bench, the home screen (a place, whose tabs are the rule's own), the loading screen and the turn-upright notice;
- **every ornate menu**, whatever builds it, is one entry: its veil, its footer's way out, and its own `omclose` when it has none;
- every file the table names exists.

## Checks

- `npm run typecheck`: clean. `npm run web`: builds.
- The full `npm test`: **3,101 tests, all passing**. It includes `test/phone-back.test.ts` (6 tests): the rule, the way out's
  words, the guard, and the audit.
- **`node tools/phone-back/check.mjs`** (Playwright, 393 x 852), Back sent as `page.goBack()`, as `history.back()` and as Escape. All
  checks pass:
  - **The Battle tab, nothing open:** four Backs (`goBack`, `history.back`, `goBack`, Escape). Nothing happened each time.
  - **Recruit, Heroes, Castle and Spells:** Back went to the Battle tab.
  - **Three deep** (Settings, its Ruler page, the ruler's picker): Back closed the picker, then the page, then (by Escape) Settings, and
    then did nothing.
  - **The Armies page:** closed.
  - **A building card on the Castle tab:** closed, then Back went to the Battle tab.
  - **A deploy:** back to the camp with the run kept; Continue carried it on.
  - **A fight:** Settings opened and the fight went on; Back closed Settings.
  - **An ultimate's moment:** skipped to its fade.
  - **A bond scene's film:** skipped, and gone.
  - **The Assault:** the scouts' report and the muster closed without marching. Once marched, Back opened the pause card, and Back closed
    it with the assault still on.
  - **Every step:** the page never unloaded, the address stayed as it was, the history stayed at 3 entries, and there were no page errors.
- **`node tools/phone-back/reload.mjs`** (393 x 852, the service worker on), three times: a reload (as a new version's, or a pull to
  refresh), then a Back from the Castle tab went to Battle and a second Back stayed. The page never unloaded and the service worker was
  registered as before.

## Not verified without a real phone

- **The Android app.** The new `MainActivity` callback was not built here: there is no Android SDK in this container.
  - Read against Capacitor 7's source: `BridgeActivity` extends `AppCompatActivity` (so `getOnBackPressedDispatcher`), and
    `getBridge().getWebView()` is there. Capacitor itself registers no back handler.
  - The workflow (`.github/workflows/android.yml`) will compile it; then the button, the gesture and Android 13+'s predictive back want a
    try on a phone.
- **Chrome on Android's skipping of entries pushed without a touch.** Pressing Back many times in a row, with no touch between, in the
  browser or the installed PWA, may let Chrome skip the re-pushed guard and leave the page. The guard is re-pushed at every touch and key to
  narrow this, and Playwright's Back does not apply that skipping, so only a phone can tell. The Android app is not affected: its callback
  takes every Back.
- **The back gesture's own animation** (a swipe from the edge) in the PWA: it sends the same `popstate`, but how it looks is the phone's.

## Files

- New: `src/backRules.ts`, `src/phoneBack.ts`, `test/phone-back.test.ts`, `tools/phone-back/check.mjs`, `tools/phone-back/reload.mjs`.
- Changed: `src/main.ts` (the hooks), `src/home.ts` (`currentTab`),
  `android/app/src/main/java/com/hpatter9/lastkeep/MainActivity.java` (the back callback).
