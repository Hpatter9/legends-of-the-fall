# Settings menus: the ruler picker and the developer stones

Two of the owner's Settings asks: "The rulers in the settings menu should be a menu that opens up after clicking on it." and
"I also want the developer menu to have stones as an option too."

## The ruler picker

The eight rulers (KING-ART, [king-artwork.md](king-artwork.md)) are no longer laid out inline at the top of Settings. Settings
now has one compact **Ruler** row: the current ruler's name and title (in their colour) and a **Change ▾** button with their
portrait. The button opens a sheet in the brass style of the trophy wall ("Choose your ruler"), listing all eight in the old
two-column grid of portraits, names and titles, the current one marked. Picking one saves it to the same `ruler` setting
(`legends.settings`), closes the sheet and redraws the row.

The sheet always closes: on a pick, on the ✕, on a tap on the dimmed backdrop, on Escape, and when Settings itself closes
(`closeSettings` calls `closePicker`). Focus goes back to the row's button. The overlay is hidden with the `hidden` attribute,
and `.spOverlay[hidden] { display: none; }` keeps its own `display: flex` from beating it (the trophy wall's bug).

**Duchess's costume** uses the same sheet: the row shows the costume she wears with a **Change ▾** button, and the sheet lists
the four with their descriptions; locked ones are dimmed, say how to unlock them, and do nothing when tapped.

- `src/settingsPicker.ts`: the sheet (`openPicker(host, spec, opener)`, `closePicker`, `pickerOpen`), DOM only, generic.
- `src/settings.ts`: `rulerRow`, `rulerPortrait`, `duchessHatRow`; `closeSettings` closes the sheet.
- `src/keepKingdom.css`: `.rulerRow`, `.rulerOpen`, `.spOverlay`, `.spCard`, `.spList`, `.costumeChoice`; the old
  `.rulerSetting` styles went, `.rulerChoice`/`.rulerChoices`/`.rulerPortrait` are kept for the sheet.

## Stones in the developer row

`devGrant(m, 'stones', n)` (`src/sim/devGrant.ts`, `DevGift` now `'crowns' | 'shards' | 'stones'`) adds `n` summoning stones to
`Meta.stones` (an old save without the field starts from 0). The Developer row now has six buttons in two columns (+100, +1000)
and three rows (crowns, shards, stones), which fit at 360 wide. The page's handler in `main.ts` is unchanged: it saves, and the
home screen's stones chip updates. Test: `test/dev-grant.test.ts`.

## Checks

`tools/settings-menus/shots.mjs [WxH]` (port 8240): at 393x852, 360x780 and 412x915 the eight are not in the page, the sheet
opens with eight, a pick saves and closes it, the ✕, backdrop, Escape and Settings' Close each close it, the costume sheet
lists four and a locked one does not pick, the six developer buttons fit and +1000 stones adds 1000. Screenshots:
`docs/samples/settings-menus-{closed,rulers,costume,dev,devpage}-<size>.png`.

`tools/rulers/check.mjs` (KING-ART's check) now opens the sheet before each ruler choice and closes it before Settings' Close.
