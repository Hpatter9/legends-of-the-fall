# Release audit: the art (RELEASE-AUDIT-ART)

What a player sees, checked before the store release on 0.590.0 (`d0ffa3a1`). Ranked by how soon a new player meets it in the first
hour. Crops are in [docs/samples/release-audit-art/](../samples/release-audit-art/). The prompts for the art to redo are in
[release-audit-art-prompts.md](release-audit-art-prompts.md). Another auditor covers code and background work; a third covers store
readiness.

The walk was on 0.590.0. The branch was then rebased on 0.592.0, which changes none of the screens below, except that the Developer
page (finding 15) now also offers "Try an Assault".

## How it was checked

- `npm run web`, served over plain http on 127.0.0.1 (so the service worker stayed out of the walk), in the pre-installed Chromium with
  SwiftShader. Two saves:
  - a fresh one (the first-run flow from the starter pick to wave 2);
  - a late one: all 70 heroes at level 32, six armies cleared, the castle built and every mode open.
- Walked at 393 x 852 and spot-checked at 360 x 780 and 412 x 915. Screens walked:
  - the five tabs;
  - the Armies (War Room), the Dark Council (all four tabs), the Houses, the quest log, the Pact Gallery and the codex;
  - Settings and every sub-page: Sound, Display, Gameplay, Ruler, Save, Developer, Diagnostics, Updates and About;
  - Achievements, a single summon and a draw of ten;
  - the hero page (all of it), the War Council, a deploy and a fight;
  - a wave won, a wave lost and the run's recap;
  - the Daily;
  - the Assault: scouts' report, war table, field, pause and retreat.
- Not reached: a full army victory (only the defeat recap was seen), the Calamity, the Last Stand and the Muster. Nor a cutscene or an
  Eidolon call: cinematics are off in the late save, and no Eidolon is bound. Owner-built tools such as `tools/jrpg-recap/shots.mjs`
  and `tools/cinematics/` cover those.
- **Every hero and foe in the codex:**
  - all 70 heroes and all 55 bestiary entries (94 foe kinds) drew a portrait in the grid, with no broken image;
  - every hero's detail sheet animated when sampled over six frames 150 ms apart;
  - the foes were sampled twice, 700 ms apart. 45 of 55 moved. The ten that seemed still were the orc, imp, demon and ogre sheets,
    whose idle is a slow breath (`enemyMotion.ts`: four frames over 1.2 s), so a 700 ms gap can land on the same frame. The Orc
    Grunt, sampled eight times 160 ms apart, moved, and the others share its clock. They were not each sampled again.
- **Offline:**
  - all 1,451 files in `out/web` (bar the maps and `sw.js`) are in the service worker's `FILES`;
  - all 239 files the page fetched during the walk are in it too, the area backdrops among them;
  - the large paintings are bundled into `game.js` as data URLs;
  - no request failed and no page error was thrown in the walk.
- **Fonts:** the bundled fonts are Latin-only subsets. Every symbol beyond Latin falls back to the phone's own fonts (see 20).

The page itself is in good shape. The home screen, the tabs, the War Room, the Council, the Houses, the Spellbook, the castle and the
Assault's menus are painted, ornate and consistent. The worst of what is left is in the first ten minutes: the starter pick, the
speech bubbles and the first deploy's framing.

## Fixed on this branch (one commit each)

| # | Fault | Fix |
| --- | --- | --- |
| 13 | The Houses' filter words (All, With heirs, Veterans, Elders, The fallen) sat in each plate's top-left corner, over its scroll | Centred (`houses.css`) |
| 12 | The Pact Gallery's "‹ Back" was a flat dark box, the one plain Back left | The painted plate and chevron, as the quest log's (`eidolonChainView.ts`, `paintedButtons.css`) |
| 14 | The hero page's tabs: "Progression" and "Equipment" ran over the plate's side rails at 393 and 360 | A size smaller, a touch tighter (`paintedButtons.css`) |
| 15 | Settings, Gameplay, Nemesis cut-ins: the three choices squeezed the words to one or two a line | The choices sit under the words (`settings.ts`, `index.html`) |
| 16 | War Council at 360: "Auto-pick" broke over two lines | One line (`keepKingdom.css`) |

Before and after crops: `12-*`, `13-*`, `14-*`, `15-settings-cutins-*`, `16-*`.

## The ranked list

**Seen in the first five minutes**

1. **The starter pick is the first screen, and the plainest in the game** (`01-starter-pick.png`).
   - It is a hand-styled page (`starter.ts`, CSS of its own): flat slate cards with pale blue-grey borders on a bare dark gradient.
   - The heroes are small pixel figures in black squares, with a wide empty band above the button.
   - It is not built with the ornate menu, and nothing of the keep's painted look shows until the board. A store reviewer sees this
     first.
   - Recommended: rebuild it on `ornateMenu`, with `menuPick` for the two packs, plus a painted backdrop (prompt A1).
2. **The speech bubble (`#quip`) is the old pixel UI** (`02-quip-bubble-*.png`).
   - It is a pale grey box with a dark 2 px border, half-transparent while it fades, in a different type and palette from everything
     round it.
   - It lands over the starter's pack headers, the bench, the home scene and even the codex grid ("Duchess: Mehh. (Distinctly
     edible.)" over the hero list).
   - Recommended: a painted parchment or brass bubble (prompt A2). Keep it off open sheets: only the home scene and the board.
3. **The first deploy's camera** (`03-first-deploy-camera.png`).
   - On the first board, about two fifths of the screen is sky and water on the left. The board runs off the right edge, and the
     player's own placing tiles sit near that edge.
   - The same shows on the late save's deploys (the board pushed to the top right, an empty band of water below).
   - Not art: the deploy framing (`deployFrame`). It is worth a look before release.
4. **The status line runs under the HUD crest** (`04-status-under-crest.png`). "Wave 1/15 · drag heroes onto the blue tiles" and "…:
   hire two" reach the crossed swords' tips of the crest under the top bar, and run further into them at 360.
5. **Three looks for the main button** (`05-button-styles-*.png`). Most primary actions are the gold painted plate, but:
   - "Run recap", the Sanctum's "Continue" and the War Council's "March to battle" are a flat green box with a thin border;
   - the run recap's "Continue" is a brown wooden bar;
   - in the Sanctum, "Use 1 stone" has the brass frame and "Use 10 stones" beside it has none.

   Recommended: the gold plate (`button.primary`) for all of them. This is CSS, not new art.
6. **Achievement toasts cover the page head** (`06-achievement-toast.png`).
   - A late save fires a toast for each first (First Blood, Not a Scratch, Hardened Champion…), one after another.
   - Each sits over the War Council's title and Back button, or over the deploy's Formation plate, for a few seconds.
   - A new player gets one every few waves. Move them clear of the header, or fold several into one.
7. **A lost wave's card floats over nothing** (`07-wave-lost-blank.png`). The board and the top bar vanish, and "Wave 2 of 15 lost"
   with its "Run recap" button sits on a bare dark teal screen. It reads as a crash for a moment.
8. **The summon card's face is a big chunky glyph** (`08-tarot-face.png`).
   - The single draw shows a 32 px Pixel-Effects glyph scaled about six times (`tarotFace`, `strip(... '72cqw')`) over the hero's
     solid black silhouette, which reads as a blob.
   - The card's frame round it is fine filigree. The two do not sit together.
   - Prompt A3: a painted sigil for each of the 13 classes.
9. **The fight HUD's hero rows** (`09-fight-hud-rows.png`).
   - The panel behind each name and its bars is a flat lavender-grey, the one cool flat colour in the warm brown HUD.
   - The HP and SP numbers are a small pixel font, outlined and soft.
   - The skill buttons beside them are painted wood. Prompt A4 (a painted row backing). The numbers want the body font, a CSS change.
10. **The codex: unmet entries are solid black squares** (`10-codex-unmet-black.png`).
    - "??? not met" under a pure black tile reads as an image that failed to load.
    - The codex's reward rows and grid are plain flat boxes beside the ornate pages round them.
    - Recommended: the foe's silhouette, as the Pact Gallery does, or a painted "unknown" tile (prompt B1).

**Seen in the first hour**

11. **The quest log is a plain sheet** (`11-quest-log-plain.png`).
    - Grey pill tabs (Active, Board, Eidolons, Done), a grey "Quests" heading and a mostly empty page.
    - Only its Back is painted. It is `questLog.ts`, outside `ornateMenu`.
12. *Fixed:* the Pact Gallery's Back (above). Its heading bar is still a plain dark panel.
13. *Fixed:* the Houses' filters (above).
14. *Fixed:* the hero page's tabs (above).
15. **Settings:**
    - *Fixed:* Nemesis cut-ins (above).
    - **Two Backs on every sub-page** (`15-settings-double-back.png`). The header's "‹ Back" closes Settings; a second "‹ Back" under
      it goes up to the list. Same word, different places. The header's could say "Close" in a sub-page, or be hidden.
    - **The Developer page ships** (`15-settings-developer.png`): "+1000 crowns", "+1000 shards", "+1000 stones" and "Build Town",
      captioned "For testing". So does Diagnostics, a monospace log of the device's stops. A store reviewer will find the free
      currency in two taps. Hide both behind a flag for the store build (flagged to the store auditor too).
16. *Fixed:* War Council's Auto-pick at 360.
17. **The Daily's card** (`17-daily-card.png`) is drawn by hand (`dailyView.ts`, still on the before-the-standard list).
    - A flat purple panel holds a chunky, cartoon-proportioned treasure chest with bright lime grass blobs: a pack piece in a
      different pixel scale and palette from everything else on the page.
    - The class badge is a bare two letters in a circle ("Ho").
    - Prompt B2 (a painted daily chest).
18. **Achievements is a plain list** (`18-achievements-list.png`). Flat dark rows with "☆" text stars, nothing painted, under a plain
    "Achievements" title.
19. **Bosses wear their soldiers' sprites** (`19-codex-foes.png`). Several named bosses and champions draw the same sheet as a common
    foe of their army (some with a tint), so the boss wave looks like any other:

    | Boss or champion | Same sheet as |
    | --- | --- |
    | Orc Chieftain (the first army's mid-boss) | Orc Brute (`hk_orc_brute`) |
    | Alpha Werewolf | The werewolves |
    | Minotaur Champion | Minotaur |
    | Gorgon Queen | Gorgon |
    | Bone Captain | Skeleton (`skeleton_warrior`) |
    | Fox Spirit, Fox Witch, Nine-Tailed Fox | One another |
    | Crow Seer | Karasu Tengu |
    | Grove Satyr | Satyr |
    | Skeleton Marksman | Skeleton Archer |

    The Orc Chieftain is met in the first army. Prompts C1 to C4 are the four most seen.
20. **Symbols drawn as text where art is wanted** (`20-assault-glyphs.png`):
    - The Assault uses bare white text symbols as its menu icons: ● ◔ ⚑ ⚔, and ⌇ ≈ ▬ ▲ ⁘ 🪜 on the plan.
    - The trophy wall's badges are emoji pairs (🧌🪵, 🥀🪵, 👺🪓).
    - The Nemesis board's sworn-brother mark is ⚭; the hero art button says "View full artwork ⤢"; the altar help is ⓘ.
    - None of these is in the bundled fonts, which are Latin-only. On older phones some will show as empty boxes ("tofu"):
      - 🧌 is Emoji 14 (iOS 15.4, Android 12L);
      - 🪵, 🪜 and 🪓 are Emoji 12 and 13;
      - ⌇, ⁘ and ⚭ are absent from some Android system fonts.
    - Prompt B3 is a small painted icon sheet for the Assault. Swap ⚭, ⤢ and the trophy emoji for the existing painted glyphs
      (`ui/buttons/g-*.webp`) or plain words.

**Seen later, or a matter of taste**

21. **The loading poster** (`21-loading-poster.png`) is a flat, screen-print style poster (red banners, gold crowns, white mountains).
    It is handsome, but it is the one piece in the game in that flat graphic style, and the first thing every launch shows. The
    owner's call whether to keep it. The page also reloaded itself once in this walk, mid-deploy at 360 x 780. That was most likely
    the picture loop's watchdog under SwiftShader, not the art; noted for the code auditor.
22. **The War Council's hero cards carry two-letter trait chips** (`22-council-trait-chips.png`): "Kn", "Gu", "Sa", "Bl" in coloured
    circles. The bench already has small painted trait icons; the cards could use them.
23. **The Assault field opens on a dark void** (`23-assault-field-void.png`): the lower third of the screen is the dark off-map below
    the field until the camera moves.
24. **The hero list repeats the name** (`24-hero-list-names.png`): "Vael", then "Vael · Eclipse Sovereign · Level 32" under it.
25. **The Council's empty seats** (`25-council-vacant.png`): "Vacant / the strongest will rise" squeezed into three cramped lines in
    the small captain and lieutenant cells.
26. **The defeat recap** (`26-recap-defeat.png`) is good. Its grey lines on the red head ("The party fell in a heap…") are low in
    contrast.

## Tap targets

Measured at 393 x 852, under 44 px one way or both:

| Control | Size (px) | Where |
| --- | --- | --- |
| Merge all, Auto runes | 81 x 30, 88 x 30 | The deploy's rune bench |
| Satchel | 38 x 30 | The deploy's rune bench |
| Rune slots | 39 x 40 | The deploy's rune bench |
| The bench's "‹ Runes" grip | 28 x 96 | The deploy |
| Claim | 72 x 32 | The codex's rewards |
| Codex tabs (Bestiary, Heroes, …) | 115 x 30 | The codex |

The codex's Claim and its tabs, and the rune bench's three buttons, would take 44 px of height without changing the layout much: a
CSS change of a few lines each. They are left for the owner because each changes a tested layout (the rune bench has its own checks,
`tools/rune-bench/`). The Houses' filters and the War Council's plates now measure 42 to 48 px tall, which is fine.

## What is not in this audit

- **The music and sound.**
- **Real phones:** emoji, notches and real GPU memory were not tried on a device. A walk on an iPhone and a mid-range Android
  before submission would catch the glyphs in 20.
