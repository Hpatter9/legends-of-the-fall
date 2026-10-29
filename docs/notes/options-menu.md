# Options in submenus, and Updates and notes

The owner's asks: "Let's add an updates and notes section in the options. This will show what was changed in the last
updates so I can look back at what's new and what version they came out. Keep it summarised." and "We should probably
condense the options menu into more menus."

## The condensed Settings page (`src/settings.ts`, `src/settingsMenu.css`)

Settings now opens on a short list of eight rows; a tap opens that submenu, which has a "‹ Back" button at its top and
the submenu's name in the header (Close still shuts the whole page; opening Settings again starts at the list).

| Submenu | What is in it |
| --- | --- |
| Sound | Music and Effects volumes |
| Display and motion | Screen shake, Damage numbers, Battery saver, Keep screen awake |
| Gameplay | Fight speed, Hero quips, Cinematics, Reset tips |
| Ruler and Duchess | The ruler picker, Duchess's costume picker (both still open the pick-one sheet) |
| Save and data | Start over (two taps) |
| Developer | The +100 / +1000 crowns, shards and stones buttons |
| Updates and notes | The releases (below) |
| About | The game's name and full version line, and a short credits line |

Every setting is saved exactly as before (`legends.settings`, same fields), so old saves keep their choices; nothing
in `parseSettings` changed. The rows themselves are the old row builders, only grouped (`PAGES`, `pageRows`, `go`).
There is no reduced-motion switch, export or import in the game, so those groups the brief suggested are not invented.

The tools that opened the ruler sheet straight from Settings (`tools/rulers/check.mjs`, `tools/settings-menus/shots.mjs`,
`tools/stand/depth-shots.mjs`) now tap the Ruler and Duchess row first.

## Updates and notes (`src/updates.ts`)

Pure data: `UPDATES` (every release from 0.189.0, newest first: version, date, a few-word title and one to five plain
lines for the player) and `EARLIER` (one line a range: 0.160 to 0.188, 0.130 to 0.159, 0.100 to 0.129, 0.41 to 0.99,
0.1 to 0.40), written from main's squash commits and the notes. The page shows a card a release and folds the ranges
under "Earlier updates" (a `<details>`).

**A release adds its entry:** whoever bumps `package.json` adds an entry at the top of `UPDATES`;
`test/updates.test.ts` fails if the newest entry's version is not package.json's (also: newest first, no repeats,
short entries).

**The "New" dot:** `legends.updatesSeen` holds the release the page was last opened on (`releaseOf` drops the commit).
While it differs from the game's, the Updates row carries a gold "New" tag and both gears (`#gear`, `#hmGear`) a small
gold dot (`refreshUpdatesDot`, called once from `main.ts` and again when the page opens). It is not in `SAVE_KEYS`, so
Start over leaves it.

Pictures: `docs/samples/options-menu-*.png` (the list at 393x852, 360x780 and 412x915; each submenu, the updates and the
earlier ranges at 393x852).
