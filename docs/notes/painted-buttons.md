# Painted buttons: the inventory (plan only, no game code changed)

The owner's note: "The code drawn and created ones just don't look good. Buttons for settings, achievements, seasons, council, daily,
auto, tactics and formations, etc." This is step 1: every button and icon-button that is not yet a painted piece, where it lives, what it
shows now and what it needs. Step 2 is [painted-buttons-prompts.md](painted-buttons-prompts.md) (the image prompts that paint them).

Branch: `claude/painted-buttons-plan`. Art branch for the sheets: `art/painted-buttons`, files under `art-source/ui/buttons/`.

## How this was made (and what to trust)

Read from the source (`src/index.html`, `home.ts`, `camp.ts`, `castle.ts`, `fightHud.ts`, `tacticsView.ts`, `paintedTavern.ts`, `ornateMenu.ts`,
`settings.ts`, `housesView.ts`, `eidolonCall.ts` and the CSS that styles them: `pixel.css`, `keepKingdom.css`, `fightHud.css`, `tactics.css`,
`campPlaces.css`, `ornateMenus.css`, `paintedTavern.css`). It was not walked screen by screen in a browser, so a button that only exists
deep in one sheet may be missing: those are caught by the **sweep rule** at the foot (every `<button>` the new skin does not name falls
back to the stretchy plates, so nothing is left unpainted, only plain).

"Pixel" below means the 16 px and 32 px pixel-art pieces in `src/art/ui/` (`btn*.png`, `chip.png`, `tab-*.png`, `ic-*.png`): these are code-era
art, not the painted look, so they count as needing a repaint.

## The style reference

- **The tactic icons** (`art-source/ui/tactics/advance.png`, `charge.png`, `hold.png`, 256 x 256, shown at 96 px): a round **medallion**, a
  gold ring with small studs, a dark enamel field (green for Advance), a painted emblem with a soft shadow, a clear background.
- **The painted medallions on main**: the council badge (`COUNCIL_BADGE`), the combat orb (`ui/combat-orb.png`), the battle crest, the combat
  panel (`ui/combat-panel.png`, `combat-skill.png`) and the ornate menus' brass (`--ornate-brass #dbc18b`, `-hi #f5e4ba`, `-mid #9c8454`,
  `-lo #5c4e33`, the double rim `3px double #bda16c`, slate and parchment).
- Everything below is to match these: **brass and lacquer**, the same light from the top left, the same stud ring.

## Summary

| Group | Entries | What it needs |
|---|---|---|
| A. Top bars and chips | 10 | medallions, chip plate |
| B. Bottom tabs | 6 | tab icons (lit and unlit), tab plate, badges |
| C. The camp | 11 | place plaques and medallions, portal chips, primary and link plates |
| D. Deploy and the party screen | 9 | text-button plates, small icons |
| E. The fight HUD | 12 | auto, tactic, formation, orb rings, horn, chip frames |
| F. Menus (standard ornate) | 10 | the nine-slice plates, glyphs, switches |
| G. The tavern and other sheets | 9 | button plates, icons, tab plates |
| H. Result, ask and summon dialogs | 6 | plates (danger variant) |
| **Total** | **73** | |

(Entries that share one plate set are counted once per place they live in; the prompts turn the 73 into **9 sheets** because many reuse the
same medallion or plate.)

Legend for "now": **glyph** = a text character or emoji; **CSS** = drawn with borders, gradients or `border-radius`; **pixel** = the
old pixel pieces; **painted** = already done, no change.

## A. Top bars and chips

Two bars: the fight's `#top` (index.html:840) and the home screen's `#hmTop` (index.html:885).

| # | Button | Where (file, selector) | Shows now | Needs |
|---|---|---|---|---|
| A1 | Settings (home) | `index.html` `#hmGear.round`; click in `home.ts` | glyph `⚙` on `.round` (pixel `btn-s.png`, `pixel.css:65`) | **medallion**: settings cog |
| A2 | Settings (fight bar) | `index.html` `#gear`; `keepKingdom.css:26` | glyph `⚙`, pixel `btn-s.png` | same medallion, small size |
| A3 | Achievements | `index.html` `#hmTrophy.round`; `home.ts` `openAchievements` | emoji `🏆` | **medallion**: trophy / laurel cup |
| A4 | Season chip | `housesView.ts:120` `.chip.hsSeasonChip`; `houses.css:40` | pixel `SEASON_ICON` (`dynastyArt.ts`, 4 seasons) on pixel `chip.png` | **4 season medallions** + chip plate |
| A5 | Crowns chip | `index.html` `#hmCrowns.chip`; `menuArt.ts` `ic-crown.png` | pixel crown, pixel `chip.png` | crown medallion + chip plate |
| A6 | Stones chip | `#hmStones.chip`; `ic-stone.png` | pixel stone, pixel chip | summoning-stone medallion + chip plate |
| A7 | Gold chip | `#gold` in `#top`; `ic-gold.png` | pixel coin, pixel chip | gold medallion + chip plate |
| A8 | Mute | `#mute`; `render/sound.ts:150` `bindMute` (face by CSS from `data-off`) | pixel `ic-sound.png` / `ic-mute.png` on pixel button | **2 medallions**: sound on, sound off |
| A9 | Speed | `#speed`; `main.ts:2340` | glyph text `×1` `×2` `×3` on pixel button | **3 medallions** (speed 1, 2, 3, as chevron stacks, no text) |
| A10 | Status chips: lives, clock, best (`#lives`, `#clock`, `#hmBest`) | `index.html:840,892`; `home.ts:645` | text plus `★` glyph in pixel chip | chip plate; lives heart and clock medallions |

## B. Bottom tabs

`#hmTabs` (`index.html:894`); built in `home.ts:253-266` from `TABS`; CSS `pixel.css:215-230`, `keepKingdom.css:54-61`.

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| B1 | Recruit tab | `.hmTab` `hm-recruit`; `ui/tab-recruit.png` (32 px pixel) | pixel icon, flat dark bar, brass top line when on | tab icon, **unlit and lit** |
| B2 | Heroes tab | `ui/tab-heroes.png` | same | tab icon, unlit and lit |
| B3 | Battle tab (the big `.hero` one) | `ui/tab-battle.png`; `pixel.css:220` gold `btn-gold` border | pixel icon on pixel gold | tab icon, unlit and lit (the centre, larger) |
| B4 | Castle tab | `ui/tab-castle.png` | same | tab icon, unlit and lit |
| B5 | Spells tab | `ui/tab-spells.png` | same | tab icon, unlit and lit |
| B6 | Tab badges | `i.badge` (`pixel.css:211,574`), `i.qbadge` (`quests.css:5`), `i.sbadge` (Hester's coin) | CSS circles with text or `!` | painted badge dot, quest "!" seal, coin badge |
| (all) | The tab plate itself | `#hmTabs`, `.hmTab.on` | CSS gradient plus inset line | **tab plate**, unlit and lit (nine-slice) |

## C. The camp (the Battle tab)

Built in `home.ts` (`place()` at line 833, `hmBattle` at 798), styled in `campPlaces.css` and `pixel.css`.

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| C1 | Choose your battle | `#hmBattle`; `home.ts:798`; `pixel.css` gold primary | pixel gold button, text, code shine | **primary gold plate** (wide) |
| C2 | Continue | `.hmLink.hmSide.hmCont`; `home.ts:807`; `pixel.css:237` | pixel `chip.png` plate | secondary plate (small), hero medallion optional |
| C3 | Daily plaque | `.cpDailySlot .cpPlace`; `campPlaces.css:124-129` | CSS plaque with a 34 px CSS circle behind its icon | **plaque plate** + daily medallion (calendar / chest) |
| C4 | Last Stand watchtower | `.cpTowerSlot .cpPlace` | CSS plaque, pack icon | plaque plate + watchtower medallion |
| C5 | Council | `.cpCouncilSlot .cpPlace`; `home.ts:886` `COUNCIL_BADGE`, `.cpCount` | CSS plaque, the council badge is painted | plaque plate (the badge stays), count seal |
| C6 | Calamity landmark | `.cpPortalSlot .cpPlace` | CSS plaque, pack icon | plaque plate + calamity medallion |
| C7 | War table plate (March orders, party) | `.cpPlate`; `campPlaces.css:54-60` | CSS box with `◆` glyph corners | **plaque plate** (wide, no glyph corners) |
| C8 | Tracked quest chip | `.hmQ` / `hmQStars`; `home.ts:825` | pixel chip, `★` glyph | chip plate, star glyph |
| C9 | Sub-page Back | `#hmSubBack`; `index.html:897` | text `‹ Back` on pixel button | secondary plate with chevron glyph |
| C10 | Castle shortcut chips (Tavern, Spells, March, Trophies) | `.ctPortalChip` ×4; `castle.ts:398-410` | emoji `🍺 📖 ⚔️ 🏆` plus text | **4 medallions** + small plate |
| C11 | Castle bonus rows / pennants | `castle.ts:599-601` (`🪙 ⚔️ ❤️`), `ctPennant ⚔️` (`castle.ts:382`) | emoji | 3 stat glyph medallions (gold, attack, health); the pennant is scenery, leave |

## D. Deploy (placing heroes) and the party screen

`index.html:852-853` and `903-916`; `pixel.css:50-53`, `keepKingdom.css:26`.

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| D1 | Hire | `#summon` in `#buttons` | text on pixel `btn-s.png` | secondary plate + hire icon |
| D2 | Pack | `#pack` | text, pixel | secondary plate + pack icon |
| D3 | Auto (place for me) | `#auto` | text, pixel | secondary plate + auto-place icon |
| D4 | Home | `#homeBtn` | text, pixel | secondary plate + home icon |
| D5 | Fight! | `#fight.primary` | text on pixel gold, CSS shine | **primary gold plate** (pressed, disabled) |
| D6 | Auto merge | `#mergeAll` | text, pixel | secondary plate + merge icon (the painted `combat-icon-merge` exists) |
| D7 | Formation button | `#formBtn`; `tactics.css:36` | CSS box with two text lines | **formation medallion** (4 shapes, see E4) |
| D8 | Party: Back, Auto-pick, March to battle | `#ptBack`, `#ptSuggest`, `#ptGo.primary`; `index.html:903-916` | text, pixel and gold | secondary and primary plates |
| D9 | Recycle zone | `#recycleZone`; `index.html:852` | painted recycle icon in a CSS drop box | drop-zone frame (rest done) |

## E. The fight HUD

`fightHud.ts`, `fightHud.css`, `tactics.css`, `paintedCombat.css`, `eidolons.css`.

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| E1 | Auto (cast) switch | `.fhAuto` (`fightHud.ts:81-85`): `<span>AUTO</span><i class="sw">` | CSS pill with a CSS knob | **auto medallion**, on and off (no text) |
| E2 | Tactic button | `#panel .fhTactic`; `tactics.css:15-17`; `tacticsView.ts:118` | painted icons (advance, charge, hold at 96 px) inside a CSS gradient box with a 1 px border | keep the icons; **drop the CSS box**: the medallion rim is the button; add a pressed ring (there are three tactics, all painted) |
| E3 | Tactic sheet rows and Close | `#tacticSheet .tacForm`, `.tacClose`; `tactics.css:3-12` | hand-made wood card, not the standard menu (it is a Not-on-it-yet case in `ui-standard.md`) | moves to `ornateMenu` when touched; rows use the choice plates; Close = secondary plate |
| E4 | Formation icons (Shield Wall, Spearhead, Hollow Square, Skirmish) | `tacticsView.ts:151`, `tacForm` rows | text only | **4 formation medallions** (the same set serves D7) |
| E5 | Spell orbs' frames | `#hudSpells #spellCards .spell`; `fightHud.css:118-122` | 44 px CSS circle (`border-radius: 50%`), spell icon `zoom .55` | **orb rings**: ready, cooling, armed, short on mana |
| E6 | Mana well | `#hudSpells #mana`; `fightHud.css:112-116` | CSS box, text, 6 px bar | mana well frame (nine-slice, small) |
| E7 | War Horn | `.ehHorn`; `eidolonCall.ts:156`; `eidolons.css:6` | CSS button with fill bar and words | **horn medallion**: empty and full (blown) |
| E8 | Skill chips | `.fhChip`; `fightHud.css:36-40` | CSS gradient, 3 px coloured left edge | chip plate (nine-slice), element edge kept as a tint |
| E9 | Ultimate plate "TAP" | `.fhPlate` (`fightHud.ts:237`) | CSS gold label | ult seal medallion |
| E10 | Fight sheet Close, tabs | `.fsClose`, `.fsHead` tabs (`fightHud.ts:275-280`) | text buttons | secondary plate; tab plate |
| E11 | Advance (Next stage, Leave) | `#next.primary`, `#qbLeave`; `index.html:868` | text on pixel gold / pixel | primary and secondary plates |
| E12 | Auto-play bar Stop | `#autoStop`; `index.html:843` | text pixel | secondary plate (danger tint) |

## F. Menus (the standard ornate menu)

`ornateMenu.ts`, section 24 of `ornateMenus.css` (`2166-2177`).

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| F1 | Back / Close | `.omBack`; `ornateMenu.ts:177`; `ornateMenus.css:2175` | text, 1 px brass border, CSS | **secondary plate** (nine-slice); the word stays text |
| F2 | Primary | `.omPrimary`; `ornateMenu.ts:184`; `ornateMenus.css:2176` | text, CSS gold | **primary gold plate** (pressed, disabled) |
| F3 | Danger primary | `.btnDanger` (`index.html:871`) | CSS red | **danger plate** (crimson) |
| F4 | Choice rows | `.omChoice` / `.on`; `ornateMenu.ts:120` | CSS gilded rows | choice-row plate (nine-slice), unchosen and chosen |
| F5 | Settings rows' switches | `toggleRow` (`settings.ts:202-205`) | CSS switch | switch: off, on, disabled |
| F6 | Settings chevron and Back | `settings.ts:254` `›`, `:265` `‹ Back`; `#settingsClose` | glyphs | chevron glyphs, secondary plate |
| F7 | Count buttons | `settings.ts:468` `×${n}`; the Auto card's four counts | text | small choice plate |
| F8 | Quantity steppers, plus, minus | `stallView.ts`, `menuHeroes.ts` | text `+` `−` | round stepper medallions |
| F9 | Section-head and lock marks | `.omLock`, `🔒` (`settings.ts:573`, `pixel.css:577` content) | emoji | lock glyph medallion |
| F10 | Star marks | `★` `☆` (`main.ts:2777,3032,3358`, `home.ts:645`) | text glyphs | star filled and empty glyphs |

## G. The tavern and the other sheets

`paintedTavern.ts:51-117`, `paintedTavern.css:7-46`; `stallView.ts:48`; `menuHeroes.ts:385`.

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| G1 | Tavern action buttons (All heroes, Talk to Gwen, Upgrades, Quests, Hester's shop, Elders' table, Quest board, Trophies) | `.ptButton`; 23 px painted combat icons on `combat-skill.png` border-image | small icons on the shared skill plate | **8 larger medallions** (48 px) + a button plate |
| G2 | Tavern section tabs | `.ptSectionTab` (`paintedTavern.ts:116`); `paintedTavern.css:45` | flat dark tab, brass underline | tab plate, unlit and lit |
| G3 | Hester's Stall tabs | `stallView.ts:48` `TAB_NAMES` (Books, Gear, Tomes, Chests, Sell, Repair, Enchant, caravan, gloaming) | text tabs | tab plate; 9 tab icons are optional (text stays) |
| G4 | Hero sheet tabs | `menuHeroes.ts` `DETAIL_TABS` | text tabs | tab plate |
| G5 | Gwen / quest card buttons | `questCard.ts`, `questLog.ts` | text, pixel and CSS | plates |
| G6 | Gacha: Return, 1 pull, 10 pulls | `#gachaClose`, `#pull1`, `#pull10.primary`; `index.html:882` | text pixel, gold | plates; the stone icon (A6) in the label |
| G7 | Hall and library buttons | `hall.ts`, `library.ts`, `spellbook.ts` | text pixel | plates |
| G8 | Item icons that are not painted | `src/art/items/*.png` (used by `castle.ts`, `events.ts`, `menuArt.ts`, `questArt.ts`): 60 old pieces (the `weapon1-3`, `armour1-3`, `charm1-3` ones are generic stand-ins) | pixel-era item art | **out of scope for the buttons sheets**: a later item-icon pass (`docs/notes/gear-icons.md`); listed so it is not lost |
| G9 | Stand, tower, calamity, sanctuary, trophy and chain views' buttons | `standView.ts` (25), `towerView.ts` (34), `eidolonChainView.ts` (13), `sanctuaryView.ts`, `trophyWall.ts` | text pixel and CSS | the sweep rule (plates) |

## H. Result, ask and summon dialogs

| # | Button | Where | Shows now | Needs |
|---|---|---|---|---|
| H1 | Ask: Retain Hero / Recycle for Gold | `#askNo`, `#askYes.btnDanger`; `index.html:871` | text | secondary and danger plates |
| H2 | Auto summary: Return to Armies | `#asumOk.primary`; `index.html:872` | text gold | primary plate |
| H3 | Reveal all | `#revealAll`; `index.html:876` | text | secondary plate |
| H4 | Tips: Skip tutorial, Got it | `#tipSkip`, `#tipGot.primary`; `index.html:923` | text | plates |
| H5 | Rank-up, reveal, awaken, earned arrival cards | `rankUpList.ts` (9), `revealCard.ts`, `awakenView.ts`, `earnedArrival.ts` | text pixel and CSS | the sweep rule |
| H6 | Fight reports and popups | `paintedBattlePopups.css`, `paintedBattleReports.css` | already painted panels, text buttons inside | plates for the buttons only |

## The sweep rule (so nothing is left unpainted)

Every `<button>` the skin does not name, in a menu or a page, gets one of three plates by its class: `primary` is the gold plate, `.btnDanger` the
danger plate, anything else the secondary (dark) plate. Tabs (`role="tab"`, `.hmTab`, `.ptSectionTab`) get the tab plate. This is a CSS rule
with `border-image` (the nine-slice margins are in the prompts file), so 100+ buttons across 40 files follow without touching each one. The
glyph and emoji buttons named above are the ones that need an **icon** on top of a plate.

## Suggested order for the build pass (a later task)

1. Plates and the sweep rule (one CSS block, `src/paintedButtons.css`), so every text button changes at once.
2. Top bars (A) and the tabs (B): the most seen.
3. The camp places (C) and the fight HUD (E).
4. Menus' glyphs (F), then the tavern (G).

Reduced motion, 44 px touch targets, upright phone sizes (393x852, 360x780, 412x915), offline cache (`build.mjs` `UI_FILES`) and credits
(`CREDITS.md`) apply as for any new art.
