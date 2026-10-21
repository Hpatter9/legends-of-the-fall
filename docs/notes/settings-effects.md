# Settings and the magic effects

Two things: a settings page, and richer effects for the skills, the king's spells and the big hits.

## Settings (`src/settings.ts`)

- **Where it opens**: a Settings button on the home screen, and a gear (⚙) in the top bar during a run. It is an
  overlay (`#settings` in `src/index.html`) over whatever is showing; the fight carries on underneath.
- **What it holds** (`localStorage` key `legends.settings`, read by `parseSettings`, which is pure and tested):
  - Music and Effects volume (0 to 100, in steps of 10). `src/render/sound.ts` scales its levels by them and applies a
    change to the music now playing at once. The mute button in the top bar still works and keeps its own key.
  - Fight speed (×1 or ×2): the speed a new fight starts at. The ×2 button in the top bar still toggles during a fight.
  - Screen shake: off stops the shake and the white flash (`src/render/fx.ts`).
  - Damage numbers: off hides the numbers that pop up when a fighter is hit (heal numbers stay).
  - Battery saver: caps the Pixi ticker at 30 frames a second (`maxFPS`), set by `onSettings` in `src/main.ts`.
  - Keep screen awake: `src/render/awake.ts` asks for the wake lock only when this is on.
  - The version line (`__GAME_VERSION__`, the same as the page's).
- **Layering**: the settings page sits above the tip bubble (z-index 7 over 6), so a tip never covers it.
- **Reset tips**: a row that calls `tips.reset()` (`src/tips.ts`), so the first-run tips show again. The Castle page
  keeps its own Reset tips button.
- **Listening**: `settings()` reads the current values; `onSettings(fn)` calls `fn` now and on each change;
  `setSetting` saves and tells the listeners. The page has no sim state, so nothing in `src/sim/` changed.

## Effects (`src/render/skillFx.ts`, `src/render/fx.ts`)

- **Skills**: each skill in `KITS` has a `SKILL_FX` entry: a `cast` sheet played on the caster as it goes off, and a
  `hit` sheet on each foe it strikes (a blow with `src: 'skill'` looks up its attacker's skill by name). For example
  Shield Wall gets an earth shield on the knight, Chain Lightning a lightning burst and strikes on each jump, Meteor and
  Hellfire a fire circle and an explosion. A skill with no `hit` keeps the usual sparks.
- **Spells**: Heal sends a gold light gather up each hero in the 3x3, Haste a gold wind vortex. The king's Meteor (and a
  wizard's) lands as a fire explosion instead of the old blast.
- **Crits and big kills**: a heavy blow (`heavy` from the sim: a crit, or a blow from height) gets a gold burst, a
  quick white flash and extra shake. A foe with 400 health or more that dies gets a blood explosion, a stronger flash
  and a hard shake. Both respect the screen shake setting.
- **The sheets**: 22 of the Pixel Effects pack's 32px strips (six frames each), copied unchanged into `src/art/fx/magic/`
  and credited in `CREDITS.md`. The Craftpix magic slash and Holy VFX packs were not used.
- **Not changed**: the sim (no event was added; a crit is read from `heavy`, which the sim already sets), the sound.

## Tests

- `test/settings.test.ts`: the defaults, a saved choice, the volume range, bad values and text that is not JSON.
- `test/skill-fx.test.ts`: every skill in `KITS` has an effect, and no effect names an unknown skill.
