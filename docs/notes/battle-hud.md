## BATTLE-HUD: the fight's hero rows and spell orbs, and ULT-CUTIN: an ultimate's moment

The owner picked from the three mock-ups (branch `claude/battle-hud`, behind `?hud=a|b|c`): **layout B's hero rows with layout C's spell
orbs**. This is now the fight screen in every fight (army waves, the daily, the spire, the Calamity and the Last Stand); the old hero bar
(`heroBar.ts`, its CSS in `battleUi.css`, `battleCommand.css` and `stand.css`) is gone, and so are the mock-ups and their `?hud=` flag. The deploy
screen is unchanged. On top of it, the owner's ask for an ultimate that "really feels special": the fight pauses for a slash cut-in of the hero's
art and the ultimate's name, the board dims round the caster, and a setting shortens it.

### The hero rows (`src/fightHud.ts`, `src/fightHud.css`, rules in `src/fightHudRules.ts`)

- **One row a hero** in the party's order: portrait, name, health and pool bars with their numbers ("1419/1978", "48/60 SP", "100/100 MP"), and its
  two skills as wide chips: the skill's pack icon (a frame of its element's strip in the Pixel Effects atlas), its name, its cost ("30 SP", a blood
  cost as "25 SP +10%HP"), the cooldown left while it cools ("· 2.4s") with a sweep across the chip, and a thin line filling towards the cost.
  A chip greys while the pool cannot pay, reads "Lv 10" while skill 2 is locked, and a healer's skill 2 shows its revive face (name, cost and
  30 s clock) while a friend lies fallen and the revive is ready.
- **Everything is read from the kit data** (`heroKitOf`, `costOf`, `slot.gap`, `slot.hpCost`, `RES`, `reviveCost`, `REVIVE`, `TIER_SKILLS`,
  `ultimateOf`, `ultTune`), so the RPG spells rework's names, costs and gaps show as they are: `chipOf`, `chipLine`, `ultOf`, `barNumbers`,
  `sheetOf`, `whichCast`, `hudLayout` in `fightHudRules.ts` (no DOM; `test/fight-hud.test.ts` checks all 45 heroes and the MP casters, a
  blood-cost hero, a monster hero, a summoner and a healer's revive).
- **The ultimate**: a pearlescent glow (pink, cyan, lilac, gold, mint) fills along the row with the meter, its colours drifting; full, the row
  brightens, a sheen crosses it and the portrait says TAP. A tap on the row fires it (`orderUltimate`, as before); a refused tap nudges the row.
  A hero below level 30 shows no glow. The cast lights the row in the skill's element with its name over it, and the chip that went off; a skill's
  cut-in banner (portrait, hero, skill) shows by the caster, as in layout B (an ultimate's has the full moment instead, below).
- **The skill's sheet**: a tap on a chip opens it, with tabs for Skill 1, Skill 2 and the Ultimate (a long press on a row opens the ultimate's).
  It shows what the move does, its cost (and blood), cooldown, strength, cast time, the revive face, and the tier lines (the skill a tier
  improves lists its tiers, the reached ones lit and the current one marked "now"; the other: "Tier 3 and up: costs 15% less"). The ultimate's
  sheet gives its meter, how it fires (TAP, or "Auto is on") and its cast time, or "Opens at level 30". **The fight is held while a
  sheet is open** ("Fight paused · tap outside to resume", kept in view at the sheet's foot): `hud.holding`, read beside `sceneHold` in
  `main.ts` and beside `hold`/`paused` in `standView.ts`.
- **A party over five** (the Last Stand's eight, a Calamity's ten): two columns of compact rows filling downwards, each with the portrait, name,
  both bars and numbers, and the two skills as small chips (icon and cost, "Lv10" while locked; their names are on the sheet). Ten heroes take
  the same height as five full rows.
- **Sizes**: rows are 38 px (three 12 px lines: the name and the two bars), text 12 px throughout.

### The king's spells as orbs (layout C)

- `#spells` moved out of the panel into `#hudSpells` (`index.html`), a row under the top bar over the board's sky: the mana box (MANA, bar,
  "3/10"), a round orb per equipped spell with its cost badge (`data-cost`), and the **Auto switch** at the row's right end (`hud.autoEl`). The
  armed spell's hint shows under the row. `main.ts`'s `layout()` puts the row under the top bar (or the twist banner) and the boss's bar and the
  combo bar under it (`ORBS_ROW`); the board's fit is reckoned as before.
- Drag-to-cast works from the orbs as from the cards; letting go back over the orbs' row cancels (`spellTile`).
- The Last Stand: its spells and the Auto switch moved the same way into `.stOrbs` under its top bar (its countdown and notes sit lower to make
  room); the Stand's spells stay tap-to-arm. Each row keeps its hero's colour along its foot.

### Board room (the visible board: top bar's bottom to the panel's top, an army fight with five)

| Size | Before | Mock-up B | Now |
| --- | --- | --- | --- |
| 393x852 | 559 | 534 (-25) | 550 (-9) |
| 360x780 | 487 | | 478 (-9) |
| 412x915 | 622 | | 613 (-9) |

The orbs moving off the bottom freed the spell cards' room; the rows were tightened to 38 px (B's were 42) to win back most of B's cost. A
Calamity fight with ten gains room (628 to 640 at 393x852), and the Last Stand's bottom bar is about as tall as before. The camera's fit scale
is unchanged (it is set from the deploy screen's panel).

### ULT-CUTIN: an ultimate's moment (`src/ultMoment.ts`, rules in `src/ultMomentRules.ts`)

- **Full (the default)**: when a hero's ultimate fires (a TAP or Auto), the page stops stepping the battle (the sim is never changed; it simply
  is not stepped). A white streak cuts across, then a diagonal band sweeps in carrying the hero's painted art (`heroes/awakened-<kind>.webp`
  once awakened, else `heroes/<kind>-portrait.webp`: all 45 have both, already cached offline and warmed as the fight begins) and the
  ultimate's name pops up in big type, the hero's name over it. The screen darkens (`.umDim`) except a pool of light round the caster, where its
  effect plays. The effects are frozen through the opening (1.15 s), so the cast plays once the name has shown.
- **What follows depends on the ultimate's shape** (`ultShape`, from what its cast did on the tick it fired): **instant** (every blow, heal or
  burst landed on that tick) stays held 0.85 s while its effects play out on the held board, then the dim fades (0.45 s) as the fight resumes;
  **delayed** (a salvo or a strike from the sky still to land: its `shot`/`area` events' time, at most 1.5 s) runs on under the dim until it has
  landed; **lingering** (a zone, a trap, an aura, a wisp, a field of terrain, a song or a banner or a team haste of 1.5 s or more, fighters
  called up) resumes at once after the opening so the lingering part runs live, the dim fading. Of the 45 at level 30, 17 linger, 22 are
  instant and 6 delayed (`test/ult-moment.test.ts` fires each one). A whole moment is about 2.5 s.
- **Several at once queue** (`UltQueue`), each its own moment; a long frame never skips an opening. **A tap skips** the moment playing (to its
  fade). The times are real time (the page's frame time), so x2 and x3 change nothing. It runs in army fights, the daily, the spire, the Calamity
  and the Last Stand (`standView.ts`), and stands still while a scene or a sheet holds the fight.
- **Short (Settings, Gameplay, "Full ultimate scenes" off; `ultFull` in `legends.settings`, default on)**: no pause and no dim; the hero rows'
  cut-in banner shows the hero's painted face and the ultimate's name while the fight runs on.
- **No flashing, reduced motion**: every animation is one-shot (no-flicker test holds); the dim eases in and out. With reduced motion the slash
  does not sweep: the band, the art and the name fade in and out, held still, and the streak is not drawn.

### Files and checks

- New: `src/fightHud.ts`, `src/fightHud.css` (added to `build.mjs` after `battleCommand.css`), `src/fightHudRules.ts`, `src/ultMoment.ts`,
  `src/ultMomentRules.ts`, `test/fight-hud.test.ts`, `test/ult-moment.test.ts`, `tools/battle-hud/shots.mjs`. Changed: `src/main.ts` (the HUD,
  the orbs' placement, the drag cancel, the holds), `src/standView.ts`, `src/index.html`, `src/settings.ts` (`ultFull`), the three CSS files the
  old bar's rules left. Removed: `src/heroBar.ts`. (`tools/kits/shots.mjs` and `tools/herobar-lock/shots.mjs` drove the old bar and are left as
  they were, for their history.)
- Screenshots: `node tools/battle-hud/shots.mjs` writes `docs/samples/battle-hud-final-<scene>-<width>.png` (deploy, fight, sheet, ult, cast,
  spells, daily, calamity, stand, kits at 393, 360 and 412 wide); `node tools/battle-hud/shots.mjs ult-cutin slash name dim linger short`
  writes `docs/samples/ult-cutin-*.png`.
