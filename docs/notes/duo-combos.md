# Duo-Combos and Trait Resonance

Duo-Combos and Trait Resonances introduce pair-specific ultimate synergies and emergent passive trait milestones to *Legends of the Last Keep*. All simulation mechanics live under `src/sim/` and adhere strictly to deterministic execution (seeded pseudo-random streams with `b.rng` or `roll(b)`, integer timestamps, and zero DOM or non-deterministic dependencies).

---

## 1. Architecture & Core Mechanics

The system expands upon the combat loop (`src/sim/battle.ts`), hero traits (`src/sim/traits.ts`), and ultimates (`src/sim/ultimates.ts` / `src/sim/heroKits.ts`).

- **Duo State Tracking (`src/sim/duoCombos.ts`)**:
  When a battle begins (`fight(b)`), `startDuoCombos(b)` scans the fielded hero roster and registers active complementary pairings in `b.duoCombos`.
- **Ultimate Activation Hook (`src/sim/abilities.ts` & `src/sim/heroKits.ts`)**:
  When a hero executes their ultimate (`began(..., 'ult')`), `triggerDuoComboOnUlt(b, caster, out)` is invoked.
- **The window (`DUO_WINDOW_MS = 3000`, `HARMONIC_MS = 1500`)**:
  - **Duo**: the combo fires on the second of the pair's ultimates, when the partner's landed within 3 seconds (both alive). Each pair of ultimates fires it once.
  - **Harmonic Resonance**: within 1.5 seconds, the effect is supercharged into a Harmonic Resonance with amplified bonuses, additional battlefield crowd control, and distinctive banner/floating text feedback.
  - (Until the retune below, a duo fired on every ultimate of either partner, with a 10 second harmonic window.)

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

Emergent passive triggers for under-represented traits, each the trait's second tier, at three of its heroes (see the retune below):

1. **Trickster Milestone (`tricksterLog`)**:
   - When a blow leaves a Trickster hero alive under 25% max HP, they substitute with a **Decoy Log** (`addUnit(b, 'decoy', ...)`, 30% of their health, 3s).
   - The Trickster slips to the safest adjacent standable tile, and foes within 2 tiles turn on the decoy log for 2s (once per fight). A fatal blow is fatal, and there is no healing.
2. **Yokai Milestone (`yokaiWisp`)**:
   - When a Yokai hero slips/dodges a blow (via `onStrike` or tall grass dodge), they leave a **Spirit Wisp** trap on that tile (10s, 1.2x attack; one live wisp per Yokai).
   - The next enemy stepping onto that tile triggers the spirit wisp, taking magic damage and being rooted/slowed for 0.8s.
3. **Guardian Milestone (`guardianShield`)**:
   - When an ally falls below 30% HP, an emergency Aegis shield (15% max HP for 5s) immediately deploys to protect them (once per hero per fight).

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
- `Duo-Combos: a pair fires only when both ultimates land together, harmonic when closer still`
- `Archer + Lightning Mage Duo: electrified arrows chain lightning to nearby foes`
- `Trait Milestones come at three of a trait: Tricksters slip a low blow with a decoy log, Yokai leave spirit wisps, Guardians shield`
- `Duo-Combos and Trait Resonance battles execute strictly deterministically`

All tests pass deterministically and typecheck cleanly (`npm run typecheck`).

---

## 6. Retune for the parity band

As first written, the PR pushed several heroes out of the hero parity band (`test/hero-balance.test.ts` at stage 5, and
`test/hero-balance-ultimates.test.ts` at level 30, stage 39: every hero within 6 points of the roster average). Measured
with the same seeded sweep (12000 fights each), lifts in points from the average:

| Hero | main, base / L30 | PR as merged, base / L30 | after the retune, base / L30 |
|---|---|---|---|
| Karasu | 0.7 / -2.3 | **6.6** / in band | 0.8 / -2.2 |
| Knight | 4.7 / 1.7 | **6.4** / 5.5 | 4.8 / 2.2 |
| Kunoichi | 0.0 / 2.1 | **6.3** / **7.6** | 0.2 / 2.3 |
| Kitsune | -2.3 / 2.2 | 4.0 / **7.6** | -2.1 / 2.3 |
| Illusionist | -5.4 / 4.8 | in band / **9.9** | -5.2 / 4.8 |
| Peasant | 0.6 / 1.7 | 3.8 / 4.7 | 0.9 / 2.2 |
| Minotaur | -0.8 / -5.3 | in band / **-6.6** | -0.9 / -5.3 |
| Demon Swordsman | -0.5 / -5.6 | in band / **-6.2** | -0.6 / -5.7 |

(The PR's numbers are with the Guardian shield already cut to 15%; "in band" is a number not taken down. After the retune the widest lifts are 5.2 at base and 5.7 at level 30, against 5.4 and 5.6 on main.) What lifted whom, found by switching each rule off in turn:

- **The trait milestones, not the duos, made almost all of it.** The base table has no ultimates, yet the Tricksters (Kunoichi,
  Kitsune, Karasu, Illusionist) and the Guardians (Knight, Peasant) rose there. Any team-wide bonus lifts the members of its
  trait, since they are the ones most often in a team that has it. The Trickster log as written was a free second life (a
  fatal blow left the Trickster at 30% health); even cut to a one-tile slip with a small decoy and no taunt, it still lifted
  each Trickster by about 2 points, and the Guardian shield, even at 10% and only near a Guardian, about 1 to 2 for the Knight
  (who already stood at +4.7 on main). Weakened at two of a trait, they either still broke the band or did next to nothing.
- **So each milestone is now the trait's second tier, at three of its heroes** (`TRAITS` in `src/sim/traits.ts`: Trickster,
  Yokai and Guardian each have four heroes). The first tier, at two, is the old bonus alone. This fits the name: a milestone is
  a deeper step of the trait, as Beast and Caster already have. Random five-hero teams seldom hold three of one trait, so the
  parity sweep barely meets them, and a player builds for them on purpose.
- At three, the milestones keep moderate strengths: the Trickster log fires on a blow that leaves it alive under 25% (a fatal
  blow is fatal, no healing), the decoy has 30% of its health for 3s and draws foes within 2 tiles for 2s; the Yokai wisp is
  1.2x attack for 10s, one live wisp a Yokai at a time; the Guardian Aegis is 15% of health for 5s.
- **Duos fire only when both partners' ultimates land within `DUO_WINDOW_MS` (3s)**, on the second of the two, and once per pair;
  within `HARMONIC_MS` (1.5s, the owner's first pitch) they fire as a Harmonic Resonance. Before, a duo fired its full effect
  on every ultimate of either partner. This changed the sweep little (ultimates come about once a long fight), but it is the
  owner's idea of the duo, and it stops a duo being a free rider on each ultimate. 3s rather than 1.5s for the plain duo, so
  it still turns up now and then.

`test/traits.test.ts` covers the window (a lone ultimate does nothing, a partner's within 1.5s is harmonic, within 3s plain,
further apart nothing, a spent pair does not fire twice), and each milestone at three heroes and not at two.
