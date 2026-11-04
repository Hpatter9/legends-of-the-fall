# Complete UI Overhaul: Ornate Menus, Popups, and Prompts

Owner: Codex. Branch: `feat/complete-ui-overhaul`. Worktree: `/complete_ui_overhaul/legends-of-the-fall`.

## Overview
A complete visual overhaul across every menu, modal, popup, and prompt in *Legends of the Last Keep*. Many screens and prompts previously used generic, flat 1px borders, default rounded corners, and simple plain boxes that felt AI-generated and out of place in a dark-fantasy medieval tactical RPG. 

This overhaul unifies the entire game's chrome under the owner-chosen **Keep & Kingdom** gothic aesthetic: deep slate stonework, aged double-beveled brass filigree, heraldic crossed-swords/lion crests, Cinzel Decorative serif typography, engraved recessed wells, and tactile embossed velvet buttons.

---

## Overhauled Components

### 1. Popups, Prompts & Dialogs
- **Hero Recycle & Dismissal Prompt (`#ask`, `.askCard`)**:
  - Replaced the bare flat `.asumCard` text box with a royal dismissal dispatch.
  - Crowned with the official crossed-sword/lion battle crest (`ui/battle-crest.png`).
  - Ornate golden header: "ROYAL DISPATCH" eyebrow with Cinzel Decorative "Dismiss from Ranks" title.
  - Embedded in an engraved slate well with gold filigree divider.
  - Ornate dual buttons: "Retain Hero" (burnished iron & brass) and "Recycle for Gold" (gilded crimson velvet).
- **Auto-Battle Summary Dialog (`#autoSum`, `.autoSumCard`)**:
  - Replaced bare summary box with an ornate "Campaign Dispatch" scroll of honor.
  - Battle crest crown, Cinzel title, and dark recessed slate wells with tabular gold numbers.
  - Ornate primary "Return to Armies" button.
- **Royal Advisor Tooltip Popup (`#tip`)**:
  - Replaced generic web popover with an ornate parchment & brass advisor scroll.
  - Brass filigree frame with corner rivets, amber advisor header (`✦ ROYAL COUNSEL ✦`), high-contrast typography, ornate "Got it" button, and discreet dismiss action.
  - Tail arrow shaded with matching aged brass gradient.
- **Device Orientation Prompt (`#turnUp`)**:
  - Replaced bare black screen with an ornate gothic seal medallion.
  - Rotating brass compass/device emblem with a smooth glowing pulse, Cinzel Decorative title ("Stand Upright"), and subtext ("Legends of the Last Keep demands portrait orientation").
- **Army Unlocked Celebration Modal (`.unlock`)**:
  - Deep dramatic dark backdrop with radial sunburst.
  - Boss portrait framed within a double brass bezel with drop-shadow.
  - Cinzel title ("A NEW FOE GATHERS"), boss name in gold embossed lettering, description in dark stone well, large ornate "To the Armies" primary button.
- **Royal Proclamation Toasts (`.toast`)**:
  - Sliding ornate plaque from top center with gilded double brass rim, dark velvet background with gold flecks, Cinzel typography, and heraldic star jewels (`✦`).

### 2. Hero Dossier & Sub-Modals
- **Hero Ascension & Rank-Up Modal (`.ruBack`, `.ruCard`)**:
  - Deep astral backdrop with blur.
  - Double brass rimmed card (`border: 3px double #bda16c`), Cinzel Decorative title ("HEROIC ASCENSION"), portrait in an ornate brass frame.
  - High-contrast stat progression columns with glowing emerald delta numbers (`+450 HP`).
  - Ornate glowing "Ascend Hero" button with pulsing amber rim.
- **Talents Constellation Modal (`.tModal`, `.tBox`)**:
  - Ornate grimoire folio box with brass filigree corners, large talent glyph icon, Cinzel ability name, point cost badge in gold, stat bonuses in vibrant green, ornate "Learn Talent" action.
- **Equipment Armory & Comparison Picker (`.eqRow`, `.eqBtns`)**:
  - Worn item highlighted in gilded brass frame with "EQUIPPED" royal wax seal badge.
  - Spare inventory in beveled slate trays with green `+` stat improvements and red `-` stat diffs.
  - Ornate "Equip / Swap" and "Salvage" buttons.
- **Hero Full-Artwork Viewer (`dialog.heroArtViewer`)**:
  - Grand full-screen museum frame with double gold filigree bezel, subtle corner brackets, and sleek close button.

### 3. Full Menus & Submenus
- **Settings Screen (`#settings`, `.setMenu`, `.spOverlay`, `.spCard`)**:
  - Settings header with royal battle crest, Cinzel Decorative title, and gold filigree trim.
  - Submenu rows: ornate beveled dark stone/brass cards with embossed title, subtitle description, gleaming brass chevron `›`, glowing "NEW" jewel pill.
  - Toggles: ornate sliding brass switch with runic toggle indicator (`ON` emerald green with brass border, `OFF` deep iron).
  - Sliders: custom ornate brass-inlaid track with embossed gold coin/shield slider thumb.
  - "Start over" / Save data row: ornate royal wax seal danger plate with crimson warning border, clear heraldic warning.
  - Ruler & Duchess picker (`.spOverlay`, `.spCard`): ornate royal gallery modal with double brass bezel, velvet backing, ornate ruler portraits in gilded frames with title and crest.
- **The Summoning Sanctum (`#gacha`)**:
  - Celestial archway header, glowing crowns & summoning stones reliquary counters.
  - Accordions (`#summonRules`, `#collectionPanel`): ornate collapsible gilded tablets with custom brass expanders (`✦ SACRED SUMMONING RITES`, `✦ HEROIC ROSTER & MEMORIAL`).
  - Single & Decuple summon tablets with glowing gem costs and brass filigree frames.
- **Castle Tab (`.hmBuild`, building cards)**:
  - Weathered castle stone cards with brass corner brackets, level badge plates, ornate build/upgrade buttons.
- **Spells Library (`#spellbook`, `.sbMeter`, `.sbSlots`, `.sbCard`)**:
  - Sacred Chapel grimoire styling: power budget meter with sapphire mana fill and gold power fill, rune slots with glowing filigree, spell cards in beveled slate trays.
- **Party / War Council (`#party`, `#ptBonds`, `#ptSlots`)**:
  - Pennants with rich crimson & gold crossed blades, sunken slate search input with brass rim, ornate bonds accordion tablet.
- **Daily Challenge Briefing (`.dayCard`, `.dayFacts`, `.dayPrize`)**:
  - Royal Bounty Warrant pinned to weathered keep timber/slate with brass rivets, bounty boss face in a gilded portrait frame, embossed modifier badges, and ornate "Accept Royal Challenge" button.
- **Bestiary & Codex Archive (`.cxProg`, `.cxPips`, `.cxTabs`, `.cxCard`, `.cxSheet`)**:
  - Ancient leather & brass bestiary folio with milestone pips, category tabs, and ornate inspect dossier sheets.
- **Hall of Feats & Achievements (`.ach`, `.claimAll`)**:
  - Royal Hall of Feats header, ornate "Claim All" banner with glowing crown and stone totals, achievement cards with ornate progress gauges, glowing "Claim" buttons.
- **Spire / Tower & Calamity Nodes (`.rtCard`, `.cvBox`, `.cvCard`, `#shop`)**:
  - The Campfire, The Treasure, Relic Pick, Chest Shop, and Surrender / Abandon confirmation dialogs all follow the ornate brass & stone framing.
- **Combat Results & Encounters (`#result`, `#bossCard`, `#phaseBanner`, `#twistBanner`)**:
  - Heraldic victory/defeat banners, After-Action Report parchment with gold filigree dividers, hero level cards in ornate brass portrait frames, and march button.

---

## Verification & Build
- `npm run web`: clean build with `src/ornateMenus.css` inlined into `out/web/index.html`.
- `npm run typecheck`: clean TypeScript type checking with zero errors.
- `npm test`: all unit tests passing, deterministic simulation logic and DOM IDs preserved.
