# Duo-Combos and Trait Resonance

Duo-Combos and Trait Resonances introduce pair-specific ultimate synergies and emergent passive trait milestones to *Legends of the Last Keep*. All simulation mechanics live under `src/sim/` and adhere strictly to deterministic execution (seeded pseudo-random streams with `b.rng` or `roll(b)`, integer timestamps, and zero DOM or non-deterministic dependencies).

---

## 1. Architecture & Core Mechanics

The system expands upon the combat loop (`src/sim/battle.ts`), hero traits (`src/sim/traits.ts`), and ultimates (`src/sim/ultimates.ts` / `src/sim/heroKits.ts`).

- **Duo State Tracking (`src/sim/duoCombos.ts`)**:
  When a battle begins (`fight(b)`), `startDuoCombos(b)` scans the fielded hero roster and registers active complementary pairings in `b.duoCombos`.
- **Ultimate Activation Hook (`src/sim/abilities.ts` & `src/sim/heroKits.ts`)**:
  When a hero executes their ultimate (`began(..., 'ult')`), `triggerDuoComboOnUlt(b, caster, out)` is invoked.
- **Harmonic Resonance Window (`DUO_WINDOW_MS = 10000`)**:
  - **Fielded Synergy**: When either partner activates their ultimate while the other is alive on the field, the duo synergy triggers.
  - **Harmonic Resonance**: If both partners activate their ultimates in close succession (within 10 seconds), the effect is supercharged into a Harmonic Resonance with amplified bonuses, additional battlefield crowd control, and distinctive banner/floating text feedback.

---

## 2. Duo-Combo Pairings

| Pair | Title | Synergy Effect | Harmonic Resonance |
|---|---|---|---|
| **Knight + Peasant** | *Squire & Sovereign* | Peasant receives a Squire Shield (35% max HP) and 50% Guard; Knight receives Rally (attack +25%) and heals 20% max HP. | Shield reaches 60% max HP, Knight heals 35% max HP, and a shockwave knocks back and stuns nearby foes for 0.8s. |
| **Samurai + Kunoichi** | *Shadow & Steel* | Both gain Haste (5s); Samurai's next strikes cause deep bleeding; Kunoichi gains Shadow Shroud (+30% crit, +25% dodge). | Whirlwind flurry cuts all foes within 4 tiles for 1.5x attack damage and stuns them. |
| **Archer + Lightning Mage** | *Stormshot* | Archer's arrows become electrified for 8s, arcing chain lightning to 2 nearby foes for 50% bonus damage; Mage gains +2 height reach and +25 skill charge. | Lightning crashes on the 4 toughest foes for 1.8x attack damage and 0.8s stun. |
| **Wizard + Wanderer** | *Solar Eclipse* | Wanderer cleanses all allies and shields them (18% max HP); active fire/burning zones extend in duration. | Allies gain 30% max HP shields and +30 skill charge to both casters. |
| **Paladin + Cleric** | *Sanctified Aegis* | Holy aura heals allies within 4 tiles for 18% max HP, cleanses debuffs, and guards them for 4s. | Heal increases to 30% max HP and smites nearby foes with holy damage. |
| **Werewolf + Barbarian** | *Blood Moon Pack* | Both enter savage bloodlust: Haste and 30% lifesteal on landed damage for 6s; savage roar slows nearby foes. | Bloodlust extends to 9s with 1.0s stun roar on nearby foes. |
| **Rifle Bot + Siege Bot** | *Iron Vanguard* | Both receive Overclock Haste and explosive splash shots for 6s; auxiliary orbital shell strikes primary foe. | Extended duration to 8s and orbital shell hits for 2.2x attack damage. |
| **Kitsune + Karasu** | *Spirit Mirage* | Both gain stealth/untargetable (2.5s) and bonus dodge; leaves 2 spirit wisps on adjacent tiles. | Stealth increases to 4s, and 3 spirit wisps are spawned. |

---

## 3. Trait Milestones

Emergent passive triggers for under-represented traits:

1. **Trickster Milestone (`tricksterLog`)**:
   - When a Trickster hero receives a fatal or low-health blow (< 25% max HP), they substitute with a **Decoy Log** (`addUnit(b, 'decoy', ...)`).
   - The Trickster teleports to a safe adjacent standable tile, restores 30% health, and forces nearby foes to attack the decoy log (once per fight).
2. **Yokai Milestone (`yokaiWisp`)**:
   - When a Yokai hero slips/dodges a blow (via `onStrike` or tall grass dodge), they leave a **Spirit Wisp** trap on that tile.
   - The next enemy stepping onto that tile triggers the spirit wisp, taking magic damage and being rooted/slowed for 0.8s.
3. **Guardian Milestone (`guardianShield`)**:
   - When an ally falls below 30% HP, an emergency Aegis shield (25% max HP for 5s) immediately deploys to protect them.

---

## 4. UI & Visual Feedback

- **Unique Floating Text (`src/render/fx.ts`)**:
  - Displays `"Duo-Combo!"` or `"Harmonic Resonance!"` in gold/amber typography over the pair's centroid.
  - Floating labels identify the combo name and individual titles above each hero.
  - Sparkle aura emitters illuminate both partners.
  - Trickster decoy logs display `"Substitution Log!"` upon triggering.
  - Yokai spirit wisps display `"Spirit Wisp"` on the detonated tile.
- **Battle Banner Toast (`src/duoToast.ts`)**:
  - Subtle banner positioned at `top: 48px`, centered horizontally with fixed positioning.
  - Non-intrusive `pointer-events: none` ensuring zero obstruction of battle controls.
  - Responsive design across upright phone viewports:
    - 393x852 (iPhone standard)
    - 360x780 (compact Android)
    - 412x915 (Pixel / modern Android)
- **Synergies View (`src/synergyView.ts`)**:
  - Tapping the synergy column exposes active Duo Harmonies alongside origin/class traits.

---

## 5. Verification & Testing

Tests are located in `test/traits.test.ts`:
- `Duo-Combos: complementary hero pairs trigger synergies and harmonic resonances`
- `Archer + Lightning Mage Duo: electrified arrows chain lightning to nearby foes`
- `Trait Milestones: Tricksters leave decoy log on fatal blow; Yokai leave spirit wisps on dodge`
- `Duo-Combos and Trait Resonance battles execute strictly deterministically`

All tests pass deterministically and typecheck cleanly (`npm run typecheck`).
