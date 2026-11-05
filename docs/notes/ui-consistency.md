# UI consistency: the ornate Keep & Kingdom look, checked screen by screen

The owner's ask: "Double check all of the UI to make sure it's consistent with the plan we put forth. Ornate and exciting."
The plan is the ornate Keep & Kingdom restyle (0.349.0, `src/ornateMenus.css` over `src/keepKingdom.css`; `docs/notes/int-325.md`,
`docs/notes/complete-ui-overhaul.md`), with the UX audit's rules kept (`docs/notes/ux-fixes.md`): taps of 44 px, text of 11 px, full pages
"‹ Back" and cards and pop-ups "Close", one lane for toasts, nothing over the top bar. Branch `claude/ui-consistency`, from 0.366.0.

## How it was checked

`tools/ui-consistency/shots.mjs` plays the built game (`out/web`) in Chromium with one well-on save (25 heroes at level 32 to 36, every
castle building up with its rooms, nine armies cleared, the Calamity and the Last Stand open, crowns and stones) and opens 70 screens: the
five home tabs, the castle's rooms and building cards, the spellbook, the roster and the hero sheet's tabs, Upgrades, Quests, the Pact
Gallery, Codex, Achievements, Settings, the army picker, the War Council, the march card, every tab of Hester's Stall, a summon of one and of
ten, the deploy board with its trait chips, Formation sheet and pack (runes and remedies), the fight HUD, a won wave, a lost run and its
recap, the daily card, the Calamity's pick, map, battle and campfire, the Last Stand's pick, the Battle overlook, the trophy wall, bonds and
retiring on the hero sheet. Each is shot at 393x852 (`docs/samples/ui-consistency/before-<screen>-393.png`) and measured: tap targets under
44 px and text under 11 px in view (`before-audit.json`). Screens a batch changed are shot again at 393x852, 360x780 and 412x915
(`after-<screen>-<width>.png`, with the matching `before-` shots at 360 and 412).

    npm run web && node tools/ui-consistency/shots.mjs <label> [screen ...]     # SIZES=393,360,412 for all three sizes

The style it is judged against: `ornateMenus.css`'s card (`--ornate-border-double`, the radial-and-slate gradient over `ui/page.png`,
`--ornate-shadow`), its rows (`#6b5c40` rim on the `#292d22` to `#1a1d15` gradient), its gilded choice (`#f2dc9f` rim, `#444c38` to
`#293021`, a soft brass glow), its wells (`#0f130ecc`, `--ornate-well`), the brass display headings and the gilded green primary.

## The gaps, most visible first

| # | Where | What is off | Shot | Batch |
|---|-------|-------------|------|-------|
| 1 | Every screen while a run waits on its deploy board: all five home tabs, the hero sheet, roster, Quests, Codex, Achievements, building cards, the army picker, the Last Stand pick | The Formation button (0.365) floats over them all, top right: over the Summoning Sanctum's title, the tavern's Quests button (hidden under it), the roster's fifth portrait, the Codex's Claim bar, the first achievement, the Quests tabs, the dimmed backdrop of every card. It came after `#home` in the page at the same z-index (4). It was also a plain grey button. | `before-home-recruit-393.png`, `before-home-heroes-393.png`, `before-quests-393.png`, `before-card-hall-393.png` | 1 (fixed) |
| 2 | The "Unlocked" end card (a mode, building, hero or Pact opened after a film or a wave) and the new-army card | The old pixel ribbon, slate blue with orange edges, and a cream square frame: the one card of the flow not in the restyle | `before-result-393.png` | 1 (fixed) |
| 3 | Castle building cards (Hall of Legends, Barracks, Smithy, Watchtower, Chapel and the levelled buildings) | A single thin rim where the other cards have the double brass one; the Barracks' Sparring Yard uses the browser's own drop-downs and its Spar button runs off the card ("Spa 5 bon poi"); the small print is 10 px | `before-card-hall-393.png`, `before-card-barracks-393.png`, `before-card-smithy-393.png` | 1 (fixed) |
| 4 | The Formation sheet on the deploy board (0.365) | The old wood panel; the chosen shape is the old ember orange | `before-deploy-formations-393.png` | 1 (fixed) |
| 5 | Hester's Stall header | Its Back is a 30 px glyph, twice every other page's | `before-stall-books-393.png` | 1 (fixed) |
| 6 | The Last Stand's pick | The chosen eight are flat bright orange tiles | `before-stand-393.png` | 1 (fixed) |
| 7 | Quests, Upgrades, the Pact Gallery, the trophy wall | Full pages closed by "×" / "✕", against the rule (pages "‹ Back"); headings in plain serif with no rule under them | `before-quests-393.png`, `before-upgrades-393.png`, `before-gallery-393.png`, `before-trophies-393.png` | 2 (fixed) |
| 8 | Deploy board's trait chips | Flat coloured chips (orange, blue) in the old style, under the ornate HUD | `before-deploy-393.png` | 2 (fixed) |
| 9 | Hester's Stall body (every tab) and Quests filters | A flat brown page with no wells; the filter pills (All, Common, Rare...; Easiest first, Short, Long...) are round default pills | `before-stall-sell-393.png`, `before-quests-tab2-393.png` | 2 (fixed) |
| 10 | Calamity campfire (oaths, scars, travellers, provisions) | The traveller's choices and Rest are plain left-aligned buttons; the oath has no gilded mark; the hero tiles are bare | `before-calamity-camp-393.png` | 2 (fixed) |
| 11 | Summon result's folds ("How summoning works", "Hero collection") | Navy-violet bars. On a second look this is the plan's own: section 7 gives the Sanctum an arcane violet tint. Left as it is. | `before-summon-10-393.png` | — |
| 12 | The daily card's chest panel, the hero sheet's Awakening steps | Purple boxes with a purple rim. The daily's chest plate is the daily chest's own violet (`daily.css`, its rays are the same colour), and the Awakening steps take the rift's violet: both kept. The theme block above the boss, which had a plain cream rim, now has the double brass rim. | `before-daily-393.png`, `before-hero-progression-393.png` | 3 (theme block fixed; see question 2) |
| 13 | The march card | Plain heading and tiles, no rim; a long page with no frame | `before-march-393.png`, `before-march-foot-393.png` | 3 (fixed) |
| 14 | The pack (relics, runes, remedies) | Already a rimmed card; its "The bag" and "Remedies" labels are 11 px plain text where the rest of the game heads a section in brass | `before-pack-393.png` | 3 (fixed) |
| 15 | The hero sheet's foot | "‹ Back" is the big green primary there, where every other Back is the plain secondary button | `before-bonds-sheet-393.png` | 3 (fixed) |
| 16 | Small text and taps the measure found | "No runes" 10 px (rune tray), the War Council's "THE LAST KEEP" 9 px and its "i" 9 px, "Rift ores" 10 px (army picker), the hero sheet's "Next upgrade" and "Use tome" 36 px tall | `before-audit.json` | 3 (fixed) |
| 16b | The version line (top right) | On a full-screen layer inside the home screen (the trophy wall, the Calamity's cards) it sits over the layer's own top right; on the trophy wall it covered the new Back | `after-trophies-393.png` | 2 (the trophy wall's Back moved clear; the line itself stays, the owner's ask) |
| 17 | The spellbook | Matches the plan: its cool slate-blue is section 15's own arcane tint. Left as it is. | `before-spellbook-393.png` | — |
| 18 | The fight HUD (rows, chips, orbs, the tactic button) | Matches: the HUD has its own battle skin (`fightHud.css`), already checked by the UX fixes; the tactic button is gilded | `before-fight-393.png` | — |

## Questions for the owner

1. **Cinzel headings.** The restyle's note says Cinzel Decorative for the titles, and the brief says Cinzel headings, but every heading
   renders in Georgia: `keepKingdom.css` sets `--display` to Georgia after `index.html` sets it to Cinzel Decorative, and the restyle's
   sheet uses `var(--display)`. Cinzel Decorative is already in the build (the trophy wall uses it). *Recommendation:* use it for the large
   titles only (page and card titles, 20 px and up), and keep Georgia for the small headings, where Cinzel Decorative's swashes are hard to
   read on a phone. Not changed until the owner says.
2. **Violet panels.** The Summoning Sanctum's folds, the daily chest's plate and the hero sheet's Awakening steps are violet: the restyle
   (and the features) chose it for the arcane things. *Recommendation:* keep them; they read as a deliberate accent, not a leftover.
   Say if they should go brass too.

## Batch 1 (the most visible)

- The Formation button sits under every layer laid over the board (z-index 3), so it shows on the deploy board only; gilded like the HUD's
  buttons, its label 11 px.
- The Formation sheet: the ornate card, the chosen shape gilded.
- The "Unlocked" card and the new-army card: a gilded banner with the crest stars and a brass bezel round the art; the "Where" line 13 px.
- The building cards: the double brass rim, rooms and seats in slate wells, the Sparring Yard's two pickers drawn as the game's fields
  (44 px, brass arrow) with Spar on a row of its own; the small print 11 px.
- Hester's Stall's Back the size of every other page's.
- The Last Stand's chosen eight gilded.

All CSS, at the end of `ornateMenus.css` (section 23), with its own tokens; no rules, no sim. Shots: `after-<screen>-<width>.png` for
home-recruit, home-heroes, deploy, deploy-formations, card-hall, card-barracks, card-smithy, stall-books, stand and result.

## Batch 2

- Quests, Upgrades, the Pact Gallery and the trophy wall are full pages: their "×" / "✕" is now "‹ Back" (the plain secondary, 44 px),
  under a brass heading with a filigree rule. The trophy wall's Back sits at the foot of its heading, clear of the version line.
- The filter chips (Quests' sort and length, the Stall's Sell filter) are the sheet's rows, the chosen one gilded, 44 px tall (they were
  36 px round pills).
- The deploy board's trait chips: the sheet's rows, an active trait gilded, their small line 11 px (it was 9).
- Hester's Stall's rows (Sell, Repair, Enchant): the sheet's rows. The shelf itself stays wood: it is Hester's shop, drawn as a place.
- The Calamity's cards (campfire, shop, treasure): the choices and the traveller's offers as rows with brass headings, the heroes to train
  in wells, the small print 11 px.

Text changes only in the render code (`questLog.ts`, `eidolonChainView.ts`, `rankUpList.ts`, `trophyWall.ts`: the button's word); the
rest is CSS. Shots: after-quests, -quests-tab2, -upgrades, -gallery, -trophies, -deploy, -stall-sell, -calamity-camp at the three sizes.

## Batch 3

- The march card (and the Spell Lectern and the Anvil, which share its frame): the ornate card, its orders as the sheet's rows with the
  gilded choice, the section heads in brass with a rule.
- The daily's theme block: the double brass rim; the day's heroes in brass frames.
- The pack: "The bag" and "Remedies" as brass headings; "No runes" 11 px (it was 10).
- The hero sheet's foot "‹ Back" is the plain secondary button (`heroFootBack`), as every other Back; it was the green primary.
- Taps and text: the hero sheet's Next upgrade and Use tome 44 px (they were 36); the War Council's eyebrow and info marks and the army
  picker's "Rift ores" 11 px.

Shots: after-march, -march-foot, -daily, -pack, -hero-overview, -hero-overview-foot, -party at the three sizes.

## Checks

Each batch: `npm run typecheck` clean, `npm test` 2527 pass, 0 fail, 0 skipped, `npm run web` built; every changed screen looked at in
the shots at 393x852, 360x780 and 412x915. Reduced motion: nothing here animates (no new animation, no glow that changes over time). The
shots are a script's, in headless Chromium, not a real phone.

## Batch 4: the camp's Battle overlook (the owner's three notes, after 0.367.0)

- **"The caravan word doesn't need to be on Hester's stall."** The visitor pill ("Caravan", "Dealer") is gone from the stall's picture. A
  trader in camp is now a small gilded mark on the stall's top-left corner: warm gold for the caravan, dusk violet for the Gloaming
  Dealer, steady (no pulse). The stall button's spoken label still names him. (`home.ts`, `campPlaces.css`)
- **"The army below thing can move down since there's room below it."** The "The enemy below" plate sat just under the party with about
  60 px of clear ground beneath it at all three sizes. It now sits 10 px above the scene's foot (never higher than its old spot), clear of
  the stash on the left and the Daily on the right. (`camp.ts` `layPlate`)
- **"The daily button needs a redo. The icon is cut off and the label feels wrong."** The old label's box (a camp plate rule, 48 px tall)
  covered the lower half of the 16 px pixel hourglass, and that sprite is a lopsided half-glass anyway. The Daily is now a gilded button
  with the double brass rim: the painted hourglass (the relic's own, `relics/hourglass.webp`, already served and cached) whole in a brass
  medallion, and "Daily" in brass on its own line. It is 58 x 66 px, with the red dot or the green check on its corner as before.

Shots: `camp-before-home-battle-dealer-<w>.png` and `camp-after-home-battle-dealer-<w>.png` (a save with the Dealer in camp), and
`camp-after-home-battle-<w>.png`, at 393, 360 and 412. Checks: `npm run typecheck` clean, `npm test` 2527 pass, 0 fail, 0 skipped,
`npm run web` built. Cinzel and the violet panels are untouched, still waiting on the owner.
- **"There is something behind the Choose your battle button. I think it's the current wave label."** It was the bar's banner line,
  "Wave 3/15 · ★ 8/11", drawn over the button whenever a run was saved (opening home from the deploy board or a fight). Nothing from the
  fight's HUD shows through: the probe found no layer of the battle over the button. The Continue button already says the wave, so the
  banner is now left out while a run is going; the one-time "Next army" line for a new army is kept. (`home.ts`) Shots:
  `camp-before-home-mid-run-<w>.png` and `camp-after-home-mid-run-<w>.png` at 393, 360 and 412; `npm test` 2527 pass, 0 fail.

## The Party button off the Battle page (after 0.370.0)

The owner: "The party button on the war camp screen doesn't need to be there since the party screen automatically comes up when starting
a run." The Battle page's bar now holds Choose your battle alone, with Continue centred under it while a run is saved. With no run, the
second row goes and the bar closes up, so the scene above it is about 47 px taller. The party is still one tap away: the War Council comes
up as an army is chosen, the war table's "The enemy below" plate opens it, and the run recap's "Party" pointer goes there through the
same hook. No tip or tutorial step names the button (`tips.ts`, `systemTips.ts` checked). Some older tool scripts still tap `#hmParty`
(`tools/menu-glitch/scan.mjs`); they now find nothing there. Shots: `np-before-<screen>-<w>.png` and `np-after-<screen>-<w>.png` for
home-battle and home-mid-run at 393, 360 and 412. (`home.ts`, `ornateMenus.css`)
