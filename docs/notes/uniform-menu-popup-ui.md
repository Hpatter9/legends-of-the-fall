# Uniform Menu & Popup UI Pass (Fortress Gothic Aesthetic)

- **Owner:** Claude worker / Antigravity
- **Branch:** `uniform_menu_popup_ui`
- **Scope:** `src/autoAsk.ts`, `src/talentView.ts`, `src/unitInfo.ts`, `src/ornateMenus.css`, `docs/TASKS.md`, `docs/notes/uniform-menu-popup-ui.md`

## Summary

Completed an exhaustive visual and ergonomic uniformity pass across every remaining modal, sheet, dialog, and popup in *Legend of the Last Keep*. All components now strictly adhere to the unified Keep & Kingdom fortress aesthetic:
- **Atmospheric Palette & Materials:** Weathered chiseled slate/granite card gradients, aged brass filigree double borders (`--ornate-border-double`), forged iron corner brackets, and square pyramid castle bolts.
- **Recessed Inner Wells:** Dark velvet recessed card wells (`--ornate-well`) providing clear depth layering against the mountain siege background.
- **Tactile Velvet Buttons:** Standardized primary and secondary buttons with minimum 44px tap target heights, aged brass trim, and tactile click states.
- **UX & Navigation Contracts:** Standardized dismiss actions: popups, modals, and sheets use `"Close"`, while full-screen views preserve `"‹ Back"`. All typography maintains a strict minimum 11px font size.
- **Accessibility:** Full preservation of `@media (prefers-reduced-motion: reduce)` across all styling rules (static glows, no animations).

## Overhauled Components (10 Menus & Popups)

1. **Auto-Fight Selector Card (`src/autoAsk.ts`, `.autoAskCard`)**
   - Converted to double brass border frame with chiseled slate backdrop and forged iron brackets.
   - Changed dismiss button text from `'‹ Back'` to `'Close'`.
2. **Talent Tree Modal (`src/talentView.ts`, `.talentModal`)**
   - Unified frame with battlement headers and recessed skill tree wells.
   - Changed dismiss button text from `'Back'` to `'Close'`.
3. **Unit Info Inspector (`src/unitInfo.ts`, `.unitInfoCard`)**
   - Replaced plain `'×'` glyph with an explicit, accessible `'Close'` button with 44px tap target.
   - Added ornate brass border and darkened slate background well.
4. **XP Tome Shelf / Reader (`.xpTomeModal`)**
   - Styled parchment reader with aged brass brackets and uniform velvet dismiss buttons.
5. **Relic Details Card (`.relicCardModal`)**
   - Formatted lore descriptions inside recessed velvet wells with gold filigree headers.
6. **Hester's Stall Bottom Sheet / Drawer (`.stallDrawer`)**
   - Styled bottom drawer handle and item trays with fortress battlement trim and brass borders.
7. **Altar Explainer Popup (`.altarExplainer`)**
   - Integrated double brass borders and readable slate parchment styling.
8. **Castle Built Milestone Card (`.castleBuiltCard`)**
   - High-impact milestone celebration card with forged iron brackets and gold filigree banner.
9. **Upgrades Confirmation Modal (`.upgradeConfirmModal`)**
   - Recessed confirmation well with standardized 44px accept/cancel action buttons.
10. **Full Artwork Viewer (`.artworkViewer`)**
    - High-contrast modal overlay with uniform floating Close action.

## Validation Results

- **TypeScript Typecheck:** `npm run typecheck` passed cleanly (0 errors).
- **Web Build:** `npm run web` succeeded (v0.368.0 bundled cleanly to `out/web`).
- **Ergonomics & Layout:** Inspected responsive mobile views at portrait dimensions (390×844 and 412×915), verifying all touch targets exceed 44px and all text remains >= 11px.
- **No Sim / Determinism Changes:** Purely visual and button dismiss label updates. No simulation, balance, or save key modifications.
