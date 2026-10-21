# Menu (King God Castle style)

- `src/home.ts` is now a shell: a top bar (crowns, gold during a run, best stage and stars, trophy and settings
  buttons; the version stays from `#version`), five pages that slide behind a bottom tab bar (a left rail sideways):
  Recruit, Heroes, Battle (middle, raised and glowing), Castle, Spells.
- **Battle** is the hub (`src/menuScene.ts`): the land's parallax layers (`backdropFiles` in `render/backdrop.ts`)
  drifting, the five strongest heroes idling in front (`sprite` in `render/sheets.ts`), a stage banner
  ("Stage 7 · Snowfields"; the best stage when no run is saved), one big Battle! button (Continue run, or New run, with a
  small "Start a new run" link beside a saved run), and Daily and Tower cards (Tower greyed until stage 10).
- **Recruit** shows the summoning hall and opens the existing gacha screen. **Heroes** (`src/menuHeroes.ts`) is a card
  grid with rank stars, level, XP bar and rarity frame; a tap opens a sheet with stats (level and rank applied), skill,
  passive, shards to the next rank. Gear is per run, so it is not shown. **Castle** holds the upgrades with icons plus
  Achievements and Settings. **Spells** shows "Coming soon" until `HomeHooks.onSpells` is passed (then the tab opens the
  spellbook instead).
- Badges: the Battle tab while today's daily is unplayed, Recruit when a pull is affordable, Castle when an upgrade is
  or an achievement is new, the trophy for new achievements (seen count in localStorage `lotf-achievements-seen`).
- Icons are small sprites from the item pack already in `src/art/items` (the assets repo was not reachable); the menu
  pictures are bundled, so nothing new needs adding to the service worker. Game rules are unchanged.
