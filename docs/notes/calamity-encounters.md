# Calamity and Spire: Creative Encounters and Gambits

New narrative mystery encounters, ascension chaos mutators, and mobile stone card layout enhancements for Calamity and Spire modes in Legends of the Last Keep.

---

## 1. Novel Mystery Encounters (`src/sim/mystery.ts`, `src/sim/events.ts`)

Four new narrative dilemmas join the mystery pool (`MYSTERY_KINDS` in `events.ts`). All choices, odds, costs, and random outcomes are pre-rolled when the card is generated from the run's deterministic side stream (`mixSeed(run.seed, 0xe7e47, stage)`), preserving full seed determinism across saves and replays.

### Encounters

1. **The Wandering Bard (`bard`)**
   - **Narrative**: A flamboyant minstrel in a feathered cap plucks a violently out-of-tune lute in the middle of the road, offering his 80-verse epic, *The Ballad of Sir Reginald's Blistered Toes*.
   - **Choice A (Endure the awful ballad)**: Free. Suffer through the dreadful racket; all heroes gain the temporary **"Earworm"** buff (+25% move speed for 2 floors) as they march double-time to escape the song.
   - **Choice B (Pay him to stop playing)**: Pay 20–35 gold (scaled by stage). The bard pockets the coin and departs with a soothing herbal tonic that heals the party by 20% max HP.
   - **Choice C (Leave)**: Cover your ears and walk away.

2. **The Goblin Gambler Forge (`goblinForge`)**
   - **Narrative**: A manic goblin smith juggles glowing hammers over a roaring forge, offering high-stakes gambits on your weaponry.
   - **Choice A (Gamble Weapon)**: 60% chance to upgrade the weapon with **+20% attack** (e.g. `Dark Edge (+20%)`). 40% chance the gamble goes awry in a cloud of greasy smoke, transforming the weapon into a humorous **"Rusted Spoon"** (tier 1 weapon, +1% attack, sentimentally bent).
   - **Choice B (Buy Goblin Whetstone)**: Pay gold (25 + 3 * stage) for a safe, modest sharpening (+6% attack on the chosen weapon, labeled `Honed`).
   - **Fallback (No weapon in inventory/squad)**: Buy an experimental scrap blade for coin or leave.
   - **Choice C (Leave)**: Decline the gamble.

3. **The Cursed Mirror (`cursedMirror`)**
   - **Narrative**: A monolithic obsidian mirror stands in the void mist. In the silvered reflection, a mirror image of one of your heroes smirks back, rolling its eyes at your squad.
   - **Choice A (Summon Inverted Hero)**: Free. The mirror ripples and an inverted clone of the hero steps out to join your squad for **2 floors**, fighting alongside you with heightened fervor and snarky commentary. After 2 floors are cleared, the reflection shatters and departs.
   - **Choice B (Smash the Mirror)**: Shatter the glass for +35–65 gold in silvered shards, but flying splinters deal 10% damage to all heroes.
   - **Choice C (Leave)**: Walk past the dark glass.

4. **The Whispering Void Well (`voidWell`)**
   - **Narrative**: A bottomless well carved from star-stone hums with dark planar energy, whispering promises of forbidden power.
   - **Choice A (Drink the void essence)**: Gain +20% party attack for 2 floors, but the corrupting void liquid inflicts a 15% HP wound to all heroes.
   - **Choice B (Toss a gold tribute)**: Spend 30–50 gold into the dark depths; the waters bubble up and dredge a drowned piece of ancient gear.
   - **Choice C (Leave)**: Step back from the brink.

---

## 2. Temporary Buffs & Doppelgangers (`src/sim/run.ts`, `src/sim/tower.ts`, `src/quipData.ts`)

- **Multi-Floor Buff Duration**: `Buff.duration` and `Buff.speed` in `src/sim/run.ts` allow temporary speed and combat boosts across multiple battles. `fightSpec` in `tower.ts` and `startStage` in `run.ts` pass speed to `stage.move`, increasing hero movement speed on the battlefield. When each floor is cleared (`clearNode`), `run.buff.duration` decrements and expires when zero.
- **Inverted Mirror Clones**: Clones are tracked via `Owned.cloneFloors` and `Owned.inverted`. They participate in combat as full squad members with their original skills. When `clearNode` ticks down their remaining floors to zero, they shatter and are cleanly excised from the squad and roster.
- **Snarky Mirror Banter**: Added `INVERTED_HERO_QUIPS` in `src/quipData.ts` giving the inverted doppelgangers colorful quips:
  - *"Move over, original. Let someone with real talent handle this."*
  - *"Two more floors of your amateur leadership? Truly a fate worse than death."*
  - *"Nice swing. Did you practice missing, or is it pure natural incompetence?"*

---

## 3. Ascension Chaos Mutators (`src/sim/twists.ts`, `src/sim/board.ts`, `src/sim/battle.ts`, `src/sim/ascension.ts`)

Two new floor twists join the system, available in high-ascension Calamity runs and as optional chaos mutators (`CHAOS_TWISTS`):

| Mutator Twist | Tone | Effect | Engine Implementation |
|---|---|---|---|
| **Rolling Gales** (`rollingGales`) | mixed | Wild crosswinds: projectile paths shift by 1 tile | In `settle` (`battle.ts`), ranged projectiles (`def.shot`) have their target tile deflected horizontally by 1 tile. If another unit occupies the shifted tile, they suffer the impact; otherwise the shot deflects harmlessly into the ground (dodge). |
| **Hot Coal Ground** (`hotCoals`) | mixed | Smoldering ground: 4 middle tiles heat up and burn anyone standing on them | `twistBoard` cracks 4 standable middle-ground tiles into `'coals'`. Walkers ending a step on coals suffer `COALS_BURN` (5% max HP), and fighters standing on coals suffer `COALS_STAND` (3% max HP/sec). |

- **Ascension Integration**:
  - `AscRules.chaosMutators` in `src/sim/ascension.ts` enables chaos mutators at high ascension or via `{ chaosMutators: true }`.
  - In `src/sim/tower.ts`, `calamityMap` rolls from `CHAOS_TWISTS` on high-ascension fight and elite floors.
  - In `src/twistView.ts`, icons are mapped cleanly to the DawnLike sprite assets (`gale` and `lava`).

---

## 4. UI & Phone Layout (`src/stone.css`)

Styled specifically for mobile portrait viewports (393x852) adhering to the stone card aesthetic:
- **Card Framing**: `.evcard` constrained to `max-width: min(369px, calc(100vw - 24px))` and `max-height: min(780px, calc(100vh - 48px))` with slate stone background (`var(--panel-bg)`), iron border (`var(--s7)`), and subtle rim lighting.
- **Choice Options**: `.evcard .opt` provides minimum 48px touch targets, stone gradient backgrounds, high-contrast labels, and clear cost badges (`em`).
- **Typography & Flow**: High contrast golden headers (`var(--accent-hi)`), narrative lead paragraphs, and stone slate result callouts (`.note`).

---

## 5. Verification

- `npm run typecheck`: Passed with 0 errors.
- `npm test -- calamity`: All 39 unit tests pass, verifying:
  - Seed determinism for all creative encounters across seeds.
  - Choice resolution for The Wandering Bard (Earworm speed buff vs payment heal).
  - Choice resolution for The Goblin Gambler Forge (+20% weapon upgrade vs Rusted Spoon transform vs safe Honed sharpening).
  - Choice resolution for The Cursed Mirror (inverted clone 2-floor duration lifecycle, squad limit handling, smash silver shards).
  - Choice resolution for The Whispering Void Well (drink void essence attack buff vs coin tribute gear drop).
  - Chaos mutator functionality: Rolling Gales projectile shift and Hot Coal Ground burn damage.
- `npm test -- asc`, `npm test -- events`, `npm test -- mystery`, `npm test -- twists`: All passing.
