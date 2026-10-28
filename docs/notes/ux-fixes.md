# Home and loss fixes, menu flicker

UX-002, branch `claude/ux-fixes` (from main 0.170.0), owner Claude. Three asks from the owner.

## 1. The current army is not named on every launch

What showed on every launch was the Battle page's ribbon over the Battle! button ("Undead Legion · next · Lv 8", or the run's army and level). No intro card, splash or war-table opening plays on launch; the war table's own name plate in the camp scene stays as it was.

The ribbon now shows only when the army it names is new to the player: the first time an army becomes the one in front (an unlock, or the one before it cleared), or after a run against a different army. Once named, it stays up for the rest of that visit and is quiet on the next launches. What was last named is kept in localStorage under `lotf-army-shown` (`src/armyShown.ts`, `announceArmy`), and that key is in `SAVE_KEYS` (`src/settings.ts`), so Start over clears it. Blocked storage names the army every visit, as before. No Meta field and no save change.

## 2. "How to come back stronger" after a real defeat

When an army or daily run ends with no heart left, the run recap (the screen that already follows a lost run's result) leads with a short card of two to four pointers drawn from the save. Each has a button that closes the recap, goes home as before, then opens the right screen (`Home.goTo`). A heart that revives the party settles nothing, so no recap and no card. Auto-replay shows no recap, and the card is also gated on it. Tower and Calamity summaries are unchanged.

The pointers come from `comebackTips(meta, { army, tier, party })` in `src/sim/comeback.ts` (pure, deterministic, tested in `test/comeback.test.ts`). In order of use, at most one of each:

| id | When | Button |
| --- | --- | --- |
| train | the party's average lasting level is 2+ under what the army is meant for (`meantLevel`: Normal is `Army.level`; Hard to Mythic at least 25, 45, 65, 85 from `difficulty.md`) | Heroes |
| easier | with *train*: drop a tier, or farm the strongest open army the party is up to (a cleared one first) | Armies (on that card) |
| rank | a party hero has a rank-up or awakening waiting | Rank up (hero sheet, Progression) |
| talents | a party hero has unspent talent points and a talent it can learn | Talents (hero sheet, Progression) |
| gear | `bestFor` would change a party hero's gear from the bag | Gear (hero sheet, Equipment) |
| chests | unopened chests on the cart | Chests (Battle page) |
| castle | the castle is open, the builders are free and a building is affordable | Castle |
| summon | crowns for a summon | Summon |
| synergy | a trait one hero short of its next tier, with an owned hero on the bench who has it | Party |
| front | no front-liner in the party (`roleOf`) | Party |
| ground, again | plain advice to fill to two: tanks in front and shooters on high ground; heroes keep their levels | none |

The card's text is 12px and its heading 24px, never bold (`.rcAdvice` in `src/pixel.css`).

## 3. Menu and camp flicker

Measured with `tools/ux-fixes/flicker-probe.mjs` and `dropouts.py`. For each screen: 2.4 s of composited frames, about 80 ms apart, from a CDP screencast. Also frames while each screen opens, in-screen actions, a tab cycle and an overlay closing. A DOM log records pictures (`img`/`canvas`) replaced, nodes removed, `hidden` toggles and undecoded images. The screens: camp, tavern, roster, dossier (switch hero, Progression, Equipment), party council (and a tap), summoning sanctum, castle, spells, codex (and a tab), settings, achievements, armies (open, swipe, close). Full numbers for all three sizes are in `docs/samples/ux-fixes-flicker.json`. `tools/ux-fixes/evidence.mjs` makes the launch measurement and the slowed-slide stills.

| Where | What vanished or blinked | Fix | Before | After |
| --- | --- | --- | --- | --- |
| Switching tabs two or more apart (e.g. Recruit to Battle) | the hidden page in between slid across the view as an empty dark band | pages more than one tab away wait just off screen (`translateX` clamped to ±100%) | dark band mid-slide ([before](../samples/ux-fixes-flicker-slide-before-393x852.png)) | the two pages meet edge to edge ([after](../samples/ux-fixes-flicker-slide-after-393x852.png)) |
| Launch | the loading screen went before the camp's pictures had loaded: an empty field | the page waits for the camp's art (`campArtReady`, at most 2.5 s) and two frames before removing the loading screen | 3 frames, about 2.9 s, of empty camp (software renderer) | 0 frames |
| Heroes tab | the tavern never painted under the roster, so leaving the tab slid an empty page past | `Tavern.paintOnce()`: one still picture under the roster | empty canvas while the roster is up | painted (100% of the canvas, within 50 ms) |
| Every home refresh (each tab switch, claim, build) | the crowns chip's icon, the Battle bar, the chest cart and the three camp plates were rebuilt each time, new pictures and all | the crowns number is written only when it changes; the bar, cart and plates are swapped in only when their markup differs (`swapIn`; the cart is keyed by the stash) | 17 pictures and 76 nodes replaced per switch; tab cycle 120 and 465 | 16 and 69 (the 16 are the castle's, below); tab cycle 114 and 423 |
| Hero dossier, talents, gear, roster | plain `<img>`s that decode late on a rebuild (talent tiles after a pick, gear icons after an equip, class banners) | `decoding = 'sync'` and warmed as the page loads, like `menuArt.icon` | probe dropouts: Progression tab 28, Equipment tab 22 (393×852) | 2 and 2 (the hero's idle animation) |
| Steady screens | none found | none | 0 pictures replaced, 0 nodes removed, 0 undecoded on every screen at all three sizes | the same |

The pixel counts are an upper bound: idle animations (the army cards' figures, the dossier portrait, tavern patrons) count as well, and the software renderer sometimes delivers frames out of step. They vary between runs. The DOM counts and the stills are the firmer evidence.

**Castle tab (the other AI's area; reported, not changed).** `CastleScene.update` rebuilds all 14 chamber cards' pictures on every home refresh, even with the castle tab hidden. While the builders work, the builders' clock calls it every second, so the castle tab replaces about 11 pictures a second (56 images, 128 nodes in 5 s). `Home.drawCastle` also rebuilds the castle bar's two chip icons on each refresh. Both would want the same "only when changed" treatment.

**Also seen.** An intermittent page error, "Cannot read properties of undefined (reading 'frame')", appeared in 3 of about 10 full probe runs, on both the old and the new build, so it predates this work. It did not recur with stack capture on. A `.frame` read on an undefined Pixel Effects texture is the likely shape (`castle.ts` `drawVfx`, `partyScene.ts` `effect`), but the source is unconfirmed.

## Files

`src/armyShown.ts` (new), `src/sim/comeback.ts` (new), `src/home.ts`, `src/main.ts`, `src/recapView.ts`, `src/settings.ts` (one key), `src/camp.ts` (`campArtReady`), `src/tavern.ts` (`paintOnce`), `src/menuHeroes.ts`, `src/talentView.ts`, `src/equipView.ts`, `src/pixel.css`; tests `test/comeback.test.ts`, `test/army-shown.test.ts`; tools `tools/ux-fixes/`; screenshots `docs/samples/ux-fixes-*`.

## Validation

- `npm run typecheck`: passed.
- `npm test -- comeback army-shown settings no-flicker camp talents equip heart-revive tips party`: 11 files, 85 tests passed.
- `npm run web`: passed.
- `node tools/ux-fixes/shots.mjs <port>` at 393×852, 360×780 and 412×915, all passed with no page errors:
  - the ribbon shows on the first launch and not on the reopen;
  - a fall with a heart left revives, with no result, recap or card;
  - a real defeat reaches the recap card with 2–4 pointers and no sideways overflow;
  - Heroes goes to the Heroes tab.
  - Screenshots: `ux-fixes-home-first-*`, `ux-fixes-home-reopen-*`, `ux-fixes-loss-advice-*` and `ux-fixes-loss-to-heroes-*`.
- The flicker probe ran before and after at all three sizes; the summary is in the table above and the full numbers are in the JSON.

## Open

- The owner may also want the war table's name plate in the camp scene quietened, since it still names the army on every visit. It was left alone as part of the scene.
- Castle tab rebuilds, as reported above.
- The intermittent `frame` page error.
