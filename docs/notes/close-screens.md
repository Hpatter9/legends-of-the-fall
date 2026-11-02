# Closing the screens the player leaves

The owner: "When a screen goes away, it should be closed. I just got a chest, and the previous battle recap was in the background."
Branch `claude/close-screens`.

## Cause

Once a run is over, its last fight stays ended (won or lost) until the next run starts, and `refresh()` in `main.ts` worked out
whether the fight's result card (`#result`: the results banner, each hero's XP, the spoils; the "battle recap" of the owner's words)
was up from that alone: `result.hidden = !ready || ...`. Leaving the card hid it, but anything that refreshed the game afterwards
(closing the summoning screen, a pull, a party change, ...) put it straight back up, under the home screen and under whatever opened
next. The chest's opening hides the screens it covers (`pixel.css`, MENU-GLITCH), but not the result card, so the card showed through
its 94% backdrop. The card was never emptied either: its text, the wave notes and the stats stayed in the DOM.

More generally, many screens closed by `hidden = true` only (see the map), and the menu notes' rules (`menu-glitch.md`,
`hero-sheet-glitch.md`) keep screens hidden and undrawn under a full-screen one, which is right for a place the player comes back to,
but not for a step of a flow that is over.

## The rule, and the helper

`src/screens.ts` (its rules, pure and tested, in `src/screenRules.ts`; `test/close-screens.test.ts`) keeps the stack of open
full-screen screens. A screen registers as it opens, with the function that closes it for good (element removed or emptied, its
timers, loops and listeners stopped), and gets back the closer its own Continue or Close calls; each closes once, however it is
reached. Three kinds:

- **Flow screens**, steps the player moves through and does not come back to: the fight's result card, the run's recap, a chest
  opening (one chest or Open all), the auto-replay summary, the spire's and Calamity's summary. A flow screen opening closes the flow
  screens it lands on first (the recap closes the result card; a chest closes a recap or result card still open), and going back to a
  place (`closeFinished`, from `Home.open`) closes every one still open.
- **Moments**, laid over whatever is up and closing nothing: a hero's first reveal, an earned hero riding in, an unlock card, a
  rank-up, the Eidolon binding. A film's unlock card can come over a result card the player still has to leave, so a moment must not
  close what is under it; it is the player's to dismiss. They are in the stack only so it shows what is up.
- **Places**, where the player comes back to (the home screen and its tabs, the party under a hero sheet, the stall under its chest,
  the spire's map): not in the stack, they stay hidden and undrawn under what opens over them, as before.

`window.__screens()` lists the stack (for the checks).

## The map

| Screen | Where | Kind | How it closed before | Now |
| --- | --- | --- | --- | --- |
| Result card `#result` (wave cards in `#waveNotes`) | `main.ts` `refresh` | flow | hidden, contents kept; put back by any later `refresh` while the fight stayed ended | `closeResult`: hidden, emptied, count-ups stopped (`stopResults`), and shut until the next fight ends (`resultDone`); closed as the recap opens, by `afterResult`, the home screen and each new fight |
| Run recap `#recap` | `recapView.ts` | flow | hidden and emptied, count-ups stopped | the same, through the stack; it closes the result card as it opens |
| Auto-replay summary `#autoSum` | `main.ts` | flow | hidden, rows kept | hidden, rows and finds removed |
| Chest, Open all `.chestShow` | `chestStash.ts` | flow | removed, timers cleared | the same, through the stack; a finished screen under it closes as it opens |
| Spire / Calamity summary | `towerView.ts` `showSummary` | flow | emptied by `close()` | the same, through the stack |
| Last Stand end card | `standView.ts` | flow (inside the Stand) | left filled under the hidden Stand, its count-ups running, and its 900 ms timer could show it over a new Stand | `closeEnd` on leaving and on standing again: timer cleared, count-ups stopped, emptied |
| Hero's first reveal `.tarotReveal` | `summonTarot.ts` | moment | removed, timers and sprite loop stopped | the same, in the stack |
| Earned hero's arrival | `earnedArrival.ts` | moment | removed, loops stopped | the same, in the stack |
| Unlock / end card `.rvCard` | `revealCard.ts` | moment | removed; one replaced by another was taken away without finishing: its key listener stayed (eating the next Escape, Enter or Space) and its wait never ended | a card already up is finished first; in the stack |
| Rank-up `.ruBack` | `rankUpView.ts` | moment | removed, its tick cleared | the same, in the stack |
| Eidolon binding `.ebLayer` | `eidolonBinding.ts` | moment | faded out and removed | the same, in the stack |
| Hero sheet, quest log, building card `#hmSheet` | `home.ts` | place's sheet | hidden, contents kept | hidden and emptied (`#hmSheetBox`); its sheet loop stopped as before |
| Armies, codex, achievements `#hmSub` | `home.ts` | place's page | hidden, contents kept (a codex entry's sheet too) | hidden and emptied, the codex's sheet removed, its timers stopped as before |
| Party's hero sheet `#ptSheet` | `party.ts` | place's sheet | hidden, contents kept | hidden and emptied; the party under it stays |
| Settings `#settings` | `settings.ts` | place | hidden, contents kept | hidden and emptied (drawn afresh on each opening, as before) |
| Summoning `#gacha` | `gacha.ts` | place | hidden, the pull's cards kept | hidden, the cards removed |
| Full artwork `dialog.heroArtViewer` | `heroArtwork.ts` | moment over a sheet | removed on close | unchanged |
| Stall `#stall`, old shop `#shop` | `stallView.ts`, `shopView.ts` | place | removed | unchanged (a chest bought there opens over it; the stall stays) |
| Cinematics `#cutscene` | `render/sceneView.ts` | moment | each film's Pixi app destroyed, its listeners removed; the one shared HUD kept, hidden | unchanged: the HUD is the player's, reused by every film |
| Event cards `#events` | `events.ts` | flow over the board | hidden and emptied | unchanged |
| Calamity hero pick, daily card, starter pick, tome sheet, spellbook, talents, pact gallery, piece card | their views | moments | removed | unchanged |
| Home `#home`, party `#party`, Last Stand `#stand`, spire map `#towerMap` | | places | hidden (the home kept drawn under a screen fading in over it, `handOff`) | unchanged |

Left open on purpose: the places (home, its tabs, the party, the stall, the spire's map, the Last Stand's page) and the one cinematic
HUD, which the player comes back to; the trophy wall (`trophyWall.ts`), a place's panel rebuilt on each opening. `#ask` (one line of
text) is left as it was.

## Reproduced, before and after

`tools/close-screens/probe.mjs` (Playwright, Chromium, pixel ratio 3, touch) loses a run of the Orc Warband with no heart left, opens
the run recap, presses Continue, dismisses the unlock card the run brought, opens and shuts the summoning screen (its close refreshes
the game, as many things do), puts a chest on the cart and taps it. Then it tours the other screens, back to the home screen after
each, twice: Open all, the stall, the codex, settings, a hero's sheet, the armies; it counts the drawing layers (CDP `LayerTree`, the
layers that draw content, as in `hero-sheet-glitch.md`) and the page's elements after each.

| | before (0.331.0) | after |
| --- | --- | --- |
| Result card once the recap is left and the summoning shut | up again, drawn under the home screen | hidden, emptied |
| Under the chest | the result card through the backdrop: its panel and "Run recap" (`close-screens-chest-before-after.png`, left) | nothing (right) |
| Drawing layers with the chest up (393x852) | 31 | 27 |
| Drawing layers on the home screen, after every screen of the tour | 10 | 6 |
| The page's elements on the home screen through the tour | 1521, growing to 3052 (the sheet, codex page, settings and the armies kept) | 1567 to 1565: flat |
| Sheets and pages left filled under the home screen | hero sheet 9, settings 8, the armies or codex page | none |
| The screen stack after each return home | (none) | empty |
| Page errors | 0 | 0 |

The same after run at 360x780 and 412x915: the result card shut, 27-28 layers under the chest, 6 on the home screen and the elements
flat through the tour, no errors (`close-screens-chest-sizes.png`: the chest at 393x852, 360x780 and 412x915).

## Checks

- `npm run typecheck`: passed. `npm test` (the full suite): 2267 tests, 2267 passed (with the new `test/close-screens.test.ts`).
- `npm run web`: built.
- The probe above, on the build before (0.331.0) at 393x852 and after at 393x852, 360x780 and 412x915.

## Files

`src/screens.ts`, `src/screenRules.ts` (new); `src/main.ts` (the result card's close, the auto summary, `window.__screens`);
`src/recapView.ts`, `src/chestStash.ts`, `src/towerView.ts`, `src/standView.ts` (flow screens); `src/summonTarot.ts`,
`src/earnedArrival.ts`, `src/revealCard.ts`, `src/rankUpView.ts`, `src/eidolonBinding.ts` (moments); `src/home.ts`, `src/party.ts`,
`src/settings.ts`, `src/gacha.ts` (closed places' sheets emptied); `test/close-screens.test.ts`; `tools/close-screens/probe.mjs`;
`docs/samples/close-screens-*`.
