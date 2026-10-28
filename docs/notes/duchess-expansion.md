# Duchess Interactive Mascot Expansion

## Overview

Duchess the goat is the official mascot and town goat of *Legends of the Last Keep*, appearing across the camp, castle throne room, tavern hall, and during battle encounters. This expansion deepens her playful interactive presence with gameplay utility, daily delight, unlockable cosmetics, and accessible state machines.

---

## 1. In-Battle "Lucky Bleat"

- **Preserved Behaviour**: Tapping Duchess in battle continues to trigger her iconic hop arc and signature `"Mehh."` bleat.
- **Tactical Effect (Once Per Battle)**: During active combat (`phase === 'fight'`), the first tap Duchess receives in each battle triggers a playful tactical effect:
  - **Startle Foes**: Startles the nearest foe (`"Startled by livestock"`), stunning them and preventing actions for `0.4s` (400ms).
  - **Lucky Cabbage**: Kicks a fresh cabbage onto an adjacent standable tile near Duchess. The first unit (friend or foe) to step onto the tile eats the cabbage and is healed for `10% max HP`, consuming the cabbage.
- **State Machine**:
  - Managed via pure rules in `src/render/duchessRules.ts` (`newDuchessBattleState`, `triggerLuckyBleat`, `resetDuchessBattle`).
  - `luckyBleatUsed` flag prevents multiple tactical triggers in the same battle while allowing Duchess to continue hopping and bleating on repeated taps.
  - Reset cleanly on every new battle via `PageGoat.newFight()`.

---

## 2. Camp & Castle Haystack Trinket

- **Nesting Behaviour**: In both the Camp and Castle screens, Duchess occasionally nests contentedly on a small pile of hay (`g.mode === 'nest'`).
- **Nudge Interaction**: Tapping Duchess while she nests gently nudges her off the hay with a hop (`tapNudgeGoat`), moving her to adjacent ground and uncovering the hay mound.
- **Daily Minor Treat**:
  - Once per day (tracked by date `yyyymmdd`), nudging Duchess off her hay reveals a minor treat:
    - **Summoning Stones**: 1 to 2 summoning stones.
    - **Gold Crowns**: 15 to 35 gold shiny crowns.
    - **Humorous Lore Snippets**: Secret snippets from Duchess's personal memoirs and court gossip.
  - If already claimed for the day, Duchess still hops off her hay with a friendly bleat noting that only bits of straw remain.

---

## 3. Unlockable Hats & Costumes

Three unlockable cosmetic accessories are available for Duchess, selectable in both **Settings** and the **Tavern**:

1. **Tiny Tin Crown**:
   - A charming, slightly crooked silver coronet perched proudly between Duchess's horns.
   - *Unlock Milestone*: Tap Duchess 5 times ("Her Grace" achievement).
2. **Wizard Hat**:
   - A whimsical midnight-blue conical hat with golden star embroidery.
   - *Unlock Milestone*: Trigger Duchess's Lucky Bleat in battle ("Livestock Tactician" achievement).
3. **Archery Quiver**:
   - A miniature leather quiver with green fletched arrows slung across Duchess's back.
   - *Unlock Milestone*: Uncover Duchess's daily haystack treat ("Haystack Forager" achievement).

### Wardrobe Selection

- **Settings Screen**: A dedicated row in `#settingsBody` with buttons for each cosmetic, lock hints, and active toggles.
- **Tavern Hall**: Tapping Duchess in the hearth hall hops, bleats, and cycles through her unlocked costumes with contextual speech feedback.

### Rendering Architecture

- Cosmetic rendering is centralized in `drawDuchessCosmetic()` (`src/render/duchessRules.ts`).
- Fully adapts to:
  - Facing direction (`face: 1 | -1`).
  - Scale factor (standard 48px, 0.5x tavern 24px, 2x castle 96px).
  - Hop elevation (`hopLift`).
  - Chewing bob (`chewBob`).

---

## 4. Accessibility & Layout Preservation

- **Reduced Motion Support**:
  - Under `prefers-reduced-motion: reduce`, Duchess maintains stationary grazing without rapid frame cycling or chewing bobs.
  - Hop animation remains an arc without jarring screen displacement.
- **No Flashing or Strobing**: All palette selections and transitions use warm, soft hues without flashing effects.
- **Upright Phone Layouts**: All HUD elements, coordinates, and speech bubble anchors respect narrow mobile aspect ratios (360–400px width).

---

## 5. Testing & Verification

- `test/duchess.test.ts` updated to cover:
  - Battle Lucky Bleat state machine and once-per-battle enforcement.
  - Haystack nesting mode transitions and nudge mechanics.
  - Daily treat generator distribution and ranges.
  - Cosmetic unlock requirements and milestone validators.
  - Board cabbage placement and unit walking heal trigger.
- Verified with:
  - `npm run typecheck`: clean TypeScript validation with zero errors.
  - `npm test -- duchess`: all 15 tests passing.
