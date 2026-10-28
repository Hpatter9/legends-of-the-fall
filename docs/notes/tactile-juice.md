# Tactile & Visual "Juice" (Game Feel)

Improvements to combat feel, victory fanfare celebrations, and trophy presentation in *Legends of the Last Keep*, respecting simulation determinism, portrait viewports, and reduced-motion accessibility.

---

## 1. Impact Feel (Hit-stop & Screen Shake)

### The Ask
- Add subtle 2-frame hit-stop and localized camera micro-thud on:
  - Lethal backstabs
  - Critical hits
  - The King's Meteor impact
- Strictly respect reduced-motion settings (no motion sickness, no screen shaking when calm/reduced motion is set).
- Keep sim logic completely untouched to preserve deterministic replay and test fidelity.

### Architecture & Implementation
1. **2-Frame Hit-Stop (`src/render/fxRules.ts` & `src/render/fx.ts`)**:
   - At 60 FPS, 2 frames is ~33.3ms (standardized as `34ms`).
   - `hitStopMs(heavy, share, killed, calm, backstab, crit, meteor)` calculates the appropriate pause.
   - For critical hits (`crit: true`), lethal backstabs (`backstab && killed`), and King's Meteor impact (`meteor: true`), a subtle 34ms hit-stop is triggered via `this.stopLeft`.
   - When `this.calm()` or reduced-motion is active, hit-stop resolves to `0ms`.
   - Backwards compatibility is preserved with default parameters.

2. **Localized Camera Micro-Thud (`src/render/fx.ts`)**:
   - Implemented `microThud(x, y, strength, dirX, dirY)` in `Fx`.
   - Generates snappy directional impulse offsets (`thudX`, `thudY`) that spring back rapidly over ~2-4 frames (~55ms) using a sinusoidal kick curve (`Math.sin(p * Math.PI)`).
   - Applied directly to camera world positioning (`this.shakeX = ... + this.thudX`, `this.shakeY = ... + this.thudY`) in `src/main.ts` and `src/standView.ts`.
   - **King's Meteor impact**: Directional downward micro-thud (`0, 1.2`) on landing, simulating the kinetic weight of celestial artillery crashing into the earth.
   - **Lethal backstabs & Critical hits**: Micro-thud aligned along the angle of the strike vector (`Math.cos(wayAngle)`, `Math.sin(wayAngle) * 0.6`), paired with a dark strike / gold burst visual cue and heavy impact audio cues (`cue: 'deathThud'`, `cue: 'crit'`).

---

## 2. End-of-Battle Victory Fanfare & Dynamic Poses

### The Ask
- When victory fanfare plays at the end of battle, surviving heroes strike dynamic victory poses or animations instead of instantly idling.
- Specific hero characterizations:
  - **Knight**: salutes / plants shield firmly.
  - **Peasant**: collapses in exhausted relief.
  - **Wizard**: adjusts hat with a confident flourish.
  - **Duchess**: hops onto a rock / performs celebratory hops with quips.
  - Other surviving heroes: dynamic thematic victory flourishes and cheers.

### Implementation
1. **Surviving Hero Poses (`src/render/unitView.ts`)**:
   - `UnitSprite.update(b, t, fighting, victory, victoryMs)` checks if the battle is won (`isWon && u.alive && u.side === 'hero'`).
   - When idle during the 2000ms victory fanfare window (`END_WAIT_MS` in `src/main.ts`), heroes assume expressive victory stances:
     - **Knight**: holds `'defend'` row pose planting his shield into the turf, or raises shield aloft with a gleaming glint.
     - **Peasant**: slumps to the ground/knees (`lift = -7` with heavy exhausted breathing bobbing and sweat relief).
     - **Wizard**: tips hat brim with a stylish tilt (`rot = 0.08`, hat adjustment pose).
     - **Samurai & Commander**: performs a formal respectful victory bow while sheathing katana (`rot = -0.06`, `lift = -3`).
     - **Archer & Ranger**: raises bow/quiver high in triumph (`row = 'attack'`, `lift = 3`).
     - **Cleric & Priestess**: bows head in quiet prayer of thanksgiving.
     - **Kunoichi**: folds arms in a disciplined ninja shadow stance.
     - **Barbarian & Brawler**: raises weapons high in celebratory victory roar.
     - **Other Heroes**: cheerful rhythmic victory hops (`Math.sin((victoryMs + u.id * 120) / 160) * 5`).
   - When `prefers-reduced-motion` is active, animations settle into still victory postures without bouncing.

2. **Duchess Mascot Celebration (`src/duchess.ts` & `src/quipData.ts`)**:
   - Added `PageGoat.victory()` triggered on `e.kind === 'end' && e.won`.
   - Duchess takes a celebratory hop (`tapGoat`), bleating with new victorious quips:
     - *"Mehh! (Victory is delicious.)"*
     - *"Meh-heh! (I planned the whole battle.)"*
     - *"MEHH! (Top of the rock!)"*

---

## 3. Defeated Boss Trophy Wall

### The Ask
- In the Tavern or Castle Hall, add a decorative plaque or wooden trophy rack showcasing caricatures/tokens of defeated Calamity and Spire bosses that players can tap to see humorous defeat blurbs.

### Implementation (`src/trophyWall.ts`, `src/trophyWall.css`, `src/tavern.ts`, `src/castle.ts`)
1. **Boss Catalogue (`BOSS_TROPHIES`)**:
   - Features all 6 Calamity Heralds:
     - `calBoss1` (Gorvak the Ashen) — *"Lost his war-axe in a badger hole on retreat."*
     - `calBoss2` (The Thorn Warden) — *"Complained that hedge-clippers violated ancient woodland zoning."*
     - `calBoss3` (Malphas) — *"Disbanded the Infernal Legions over sulphur overtime vouchers."*
     - `calBoss4` (Hrungar the Mountain) — *"Claimed he was taking an unhurried tectonic power-nap."*
     - `calBoss5` (Vorgrath the Hellbringer) — *"Extinguished by a bucket of tavern dishwater."*
     - `calBoss6` (Karnok the Calamity) — *"Pacified with Duchess's spare cabbage after missing his charge."*
   - Features 12 Spire & Army Bosses:
     - `lichKing` (The Lich King) — *"Left his spare phylactery in his other winter robe."*
     - `oniKing` (The Oni King) — *"Challenging five armed strangers was overambitious on an empty stomach."*
     - `demonLord` (The Demon Lord) — *"Traumatized by paladin's 40-minute lecture on chivalric table manners."*
     - `sapphireColossus` (Sapphire Colossus) — *"Repurposed as an executive paperweight in royal accounting."*
     - `forgeTitan` (Forge Titan) — *"Now operating as the barracks waffle iron producing 60 waffles/hr."*
     - `gorgonQueen` (The Gorgon Queen) — *"Petrified her own serpentine hairdo in the knight's polished shield."*
     - `orcWarlord` (Orc Warlord) — *"Retired to pursue competitive giant turnip farming."*
     - `minotaurChampion` (Minotaur Champion) — *"Still trying to find his way out of the tavern pantry."*
     - `nineTails` (Nine-Tails Kitsune) — *"Tricked into trading a chicken for a raw potato painted white."*
     - `boneCaptain` (Bone Captain) — *"Argued salvage rights with a seagull over his lost peg-leg."*
     - `hornedOgre` (Horned Ogre) — *"Bonked skull on cave stalactite while trying to look menacing."*
     - `shamanKing` (Shaman King) — *"Ancestral spirits advised immediate surrender and hot mint tea."*

2. **Access Points**:
   - **Tavern**:
     - `🏆 Trophies` brass button pinned beside Roster in the top bar.
     - Tapping the wooden plaque mounted above the hearth in Hearth Hall.
   - **Castle Great Hall**:
     - `🏆 Trophies` portal chip in the sacred chambers header navigation.
     - Tapping the physical wooden trophy rack on the right wall of the Great Hall canvas (`x: 612..698, y: 208..292`).

3. **Presentation & Interactivity**:
   - Carved wooden rack frame with brass rivets and velvet alcoves.
   - Plaque cards with boss caricature tokens, boss names, titles, and defeat stamps (`MOUNTED` vs `STILL AT LARGE`).
   - Tapping opens an antique parchment report with quote block, aftermath lore, and incident reports.
   - Filter chips to view All, Calamity Heralds (6), or Spire Champions (12).
   - Fully accessible: supports touch hit targets (>= 44px), keyboard navigation (Enter/Space to view, Esc to close), and reduced-motion mode.
   - Responsive across portrait mobile viewports (360x780, 393x852, 412x915).

---

## 4. Testing & Verification

1. **Typecheck**:
   - `npm run typecheck` passes with zero errors (`tsc --noEmit`).
2. **Web Build**:
   - `npm run web` bundles `out/web/index.html` with inlined CSS (`trophyWall.css`), JS, and pixel assets.
3. **Unit Tests**:
   - `test/tactile-juice.test.ts`:
     - Verifies 2-frame hit-stop (`34ms`) on lethal backstabs, crits, and King's Meteor impact.
     - Verifies reduced motion / calm mode produces `0ms` hit-stop.
     - Verifies `isBackstab` directional detection.
     - Verifies `BOSS_TROPHIES` data completeness and humorous blurbs.
     - Verifies `isTrophyUnlocked` with meta tracking (`meta.bosses` and `meta.calamity`).
   - `npm test -- combat-fx`: 21/21 passed.
   - `npm test -- abilities`: 14/14 passed.
4. **Viewport Visual Verification**:
   - Verified upright portrait viewports (`360x780`, `393x852`, `412x915`) with headless Chrome render validation.
