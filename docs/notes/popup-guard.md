# Popup guard

The owner: "Don't let popups get skipped during a wave by tapping off of them. Sometimes I'm tapping pre-emptively to start the next
wave and a popup flashes by; I never get to see what it said."

A player taps quickly between waves (Fight!, Next wave, Continue, Onward). A popup that appeared at that moment was sent away by a tap
meant for something else: the tap landed on its backdrop, or on its button before it could be read, or the notice simply went by on its
timer.

## The rule

One guard for every popup the game raises: `src/popupGuardRules.ts` (pure, tested in `test/popup-guard.test.ts`) and
`src/popupGuard.ts` (the page's side). It is the page's first listener, ahead of the ghost-click guard (`tapGuard.ts`).

- **No tap outside closes it.** In a run, a tap on a guarded popup's backdrop does nothing. It closes by its own button, by the phone's
  Back (`backRules.ts`) or by Escape. Back and Escape are not a finger's events, so the guard never holds them.
- **A moment of deaf ears.** For `GUARD_MS` (500 ms) after a guarded popup appears, every tap is swallowed, wherever it lands. The
  popup's buttons are dimmed for that moment (`pgWait`), then light (`pgReady`, a quarter-second fade; at once with reduced motion).
- **A tap on its way does nothing.** A click whose finger went down before the popup appeared is swallowed too, however long the finger
  stayed down: it neither closes the popup nor presses what was beneath. (The finger's lift is let through, so a drag under way ends.)
  A tap begun in the deaf moment is dead to its end.
- **Timed notices stay to be read.** `readMs(text)`: 2.4 s at the least, about a quarter-second a word more, 7 s at the most. The toasts
  use it, and still wait in their one queue under an open card (0.449, 0.456). No tap elsewhere clears one.
- **Where it holds.** While a run is going: a deploy, a fight, between waves, a wave's result, a run's end, the Last Stand, an Assault
  (anywhere but the home screen). A few popups only the game raises are guarded everywhere (`always`).
- **What it leaves alone.** A menu the player opened by their own tap is marked `asked` (`ornateMenu({ asked: true })`: the Auto card, a
  relic's card, the Shades, a rune's card, an Assault's pause and orders) and behaves as before. Cinematics keep their tap to skip.
  An auto-replay shows none of these cards, so it flows as it did.

A new card built with `ornateMenu` is guarded unless it says `asked`. A legacy overlay joins by a line in `GUARDED`.

## What changed, popup by popup

- **The short card between waves** (`#result.passing`): it has no button and went by itself 1.4 s after the march. With lines to read
  (a level, a find, a fall, a quest) it now stays until they can be read, the march counted, 5 s at the most; a quiet wave's card goes as
  quickly as before. A tap on the card still goes on at once (after the deaf moment); taps at Fight! were never on it.
- **A full result card** (`#result`): a tap anywhere on it once pressed Next. Now only its button does (a tap still hurries the count-ups).
- **The revive line**: a tap anywhere sent it away. A tap still hurries the heart's burn; the line stays its time (up to 4 s).
- **Toasts**: 2.4 s flat before; now by length.
- **The Assault's lines** (`say`): each replaced the last. They now wait their turn (three at most, the same line once) and stay by length.
- **An Eidolon's piece card, and any ornate menu the game raises**: the backdrop no longer closes it in a run.
- **The boss's card, an act's intro, a duel's walk-in**: each went at the first tap, with no moment of its own (the taunt cut-in, the
  Eidolon's call and the hero's arrival already had one). They take the deaf moment; a tap skips them after it.
- **The run's recap** gains "News of the run": every line the run's toasts said (achievements, quests done or found, spells learnt,
  features unlocked, Auto's holds, bonds and clues), and each skill's new level, which the recap did not list.

## Every popup of a run

"Guard" says what the popup guard does to it: **G** guarded (deaf moment, no backdrop close), **g** deaf moment only (a cinematic that
went at the first tap), **A** asked for by the player (left alone), **-** nothing to guard (no tap touches it).

| Popup | Where | Closes today | Stays | Guard |
|---|---|---|---|---|
| Wave's short card | `#result.passing`, main.ts | a tap on the card; its timer | march + 1.4 s (3.2 s with no march), longer with lines, 5 s at most | G, timer by length |
| Wave's or run's full result card | `#result`, main.ts | Next / Run recap / Onward / Leave | until tapped | G; a tap elsewhere no longer presses Next |
| Run recap | `#recap`, recapView.ts | Continue (a tap hurries the count) | until tapped | G |
| Auto-replay's summary | `#autoSum`, main.ts | its one button | until tapped | G |
| Chest opening, chest summary | `.chestShow`, chestStash.ts | Collect (a tap hurries it) | until tapped | G |
| Film's end card, an unlock | `.rvCard`, revealCard.ts | Continue, its go button, Enter | until tapped | G |
| Hero's arrival (a hero joined) | `.earnedArrival` | first tap shows the name plate, second closes; 450 ms of its own guard | until tapped | - (own guard; the name stays on the plate, the wave card's chip and the recap's spoils) |
| Level-ups, ultimates, skill levels | lines on the wave card | with the card | with the card | on the card; levels in the recap's rows, skills now in its news |
| Drops: gear, shards, tomes, runes, chests, ore | chips and lines on the wave card | with the card | with the card | on the card, and the recap's spoils |
| "Back on their feet" row | a line on the wave card | with the card | with the card | on the card |
| Toasts: achievements, quests, spells, unlocks, Auto's holds, bonds, the council | `.toast`, achievementsView.ts | timer only; waits under a card | 2.4 to 7 s by length (was 2.4 s) | -, and listed in the recap |
| Quest complete | `#questComplete`, ornate | Close, its primary | until tapped | G |
| Eidolon's piece | `.ecnLayer` | Continue (was: or its backdrop) | until tapped | G |
| Road's event cards, the satchel | `#events`, events.ts | its option buttons, Continue, Close | until tapped | G |
| Nemesis duel's challenge | `#duelCard`, ornate | Refuse / Accept | until answered | G |
| Gate duel (Assault) | `#gateDuelCard`, ornate | Refuse / Accept | until answered | G |
| Spell Lectern, Field Anvil | `#marchOrders`, ornate | its buttons | until tapped | G |
| Tutorial tip | `#tip`, tips.ts | Got it / Skip tutorial | until tapped | G |
| Comeback advice | a section of the recap | with the recap | with the recap | G (the recap) |
| Boss's title card | `#bossCard` | a tap; timer | 2.4 s | g |
| Spire's or Calamity's act intro | `.rtIntro` | a tap; timer | 2 s | g |
| Duel's walk-in | `.dsVeil` | a tap; timer | about 2.8 s | g |
| Nemesis taunt cut-in | `.tcLayer` | a tap after 600 ms; timer | 1.3 or 2.5 s | - (own guard) |
| Eidolon's call | `.ecLayer` | a tap after 600 ms, never on a first call | 2.2 to 4 s | - (own guard) |
| Ultimate's moment | `.umLayer` | a tap; timer | about 3 s | - (pure cinematic, no words to miss) |
| Cut scenes | `#cutscene` | Skip, a held press | the scene | - |
| Boss's phase banner, signature band, cast banners | `#phaseBanner`, `.bmLayer`, `.fhCutIn` | timer only | 1.1 to 1.5 s | - |
| Twist and theme banner | `#twistBanner` | never: up all deploy and fight | the fight | - |
| Revive line | `.reviveLine` | timer (was: any tap) | by length, 2 to 4 s | - |
| Speech bubbles, Duchess's card, duo toast | `#quip`, `.dfCard`, `#duoToast` | timer only | 2.6 to 3.4 s | - (flavour) |
| Twin note, tactic word, horn note, shade call | by the finger | timer only | 1.6 to 3 s | - (an answer to the player's own tap) |
| Spire and Calamity cards (shop, camp, treasure, relic, recap, summary) | `.rtCardWrap` | own buttons only | until chosen | G |
| Last Stand: act-end choice, end card | `.stChoice`, `.stEnd` | own buttons | until chosen | G |
| Last Stand: gate, room title, wave banner, relic gain | `.sgVeil`, `.stTitle`, `.stBanner`, `.stGain` | a tap or timer (1 to 4.2 s) | as listed | - |
| Assault's lines | `.asToast` | timer only | 2.6 s or by length; queued (was: replaced) | - |
| Assault's captain taunt | `.asTaunt` | timer | 4.2 s | - |
| Assault's result, the scouts' report | ornate | its buttons | until tapped | G |
| Auto card, relic's card, Shades, rune cards, Assault's pause, orders and platoon, an oath | ornate, `asked` | Close | until tapped | A |
| Skill sheet, unit sheet, formation sheet, horn confirm, abandon confirm, recycle ask | player-opened sheets | Close or their backdrop | until tapped | A (not in the list) |

## Checks

- `test/popup-guard.test.ts`: the rule (deaf moment, a tap on its way, the backdrop, reading time), the list, and that it is wired in.
- `tools/popup-guard/check.mjs`: in a real run at 393x852, 360x780 and 412x915, a finger hammers where Fight! and Next are, and outside,
  as each popup appears (the short card, a toast, a raised ornate card, a piece's card, the run's last card, the recap); each must still
  be up and readable, and then close by its own button. `window.__popups` raises two of them for it; `window.__popupGuard` shows what the
  guard holds and what it swallowed.
- `tools/phone-back/check.mjs` still passes: Back closes a guarded popup at once.

## Unsure, for the director

- The short card now waits up to 5 s when it has lines and the player does not tap it. A player who taps the card is as quick as before.
- The boss's card, an act's intro and a duel's walk-in take the 500 ms moment, though the brief says cinematics keep their tap to skip
  (they still do, after it). One line each in `GUARDED` to take back.
- A tap on a full result card's body no longer presses Next (the brief's "closes by its own button"); it was a deliberate shortcut once.
- The auto-replay's summary does not list the run's news; the toasts still show as it plays.
- An ultimate's moment is left to skip at the first tap: it has no words to miss.
