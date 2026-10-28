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

- **Multi-Fight Buff Duration**: `Buff.duration` and `Buff.speed` in `src/sim/run.ts` allow temporary speed and combat boosts across multiple battles. `startStage` in `run.ts` multiplies the castle's own pace (`moveRate`) by the speed. Each fight spends one (`spendBuff`, from `finish` and `finishTower`); the quiet floors between do not (see Fix at merge).
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

---

## Fix at merge

With main merged in, the bot's Calamity runs left the starting hero lower than on main (`test/calamity.test.ts`, "well past level 20", ended
at 25, 30, 20). The causes, and what changed:

- **The chaos twists rolled on every fight, at every ascension.** `rollTwist` (`twists.ts`) picked from `TWIST_IDS`, which now held
  `rollingGales` and `hotCoals`, so they turned up on ordinary floors at ascension 0, and every other twist roll moved too (a pick over 16
  instead of 14). This was the largest cause. It now picks from `PLAIN_TWIST_IDS` (all but `CHAOS_TWISTS`), so ordinary maps roll exactly as
  on main; the chaos twists are laid only by `calamityOnce` under `AscRules.chaosMutators`. (Nothing yet passes `{ chaosMutators: true }`
  to `ascRules`, so the owner has still to say at which ascension they begin.)
- **An event's buff was lost before its fight.** `clearNode` spent `run.buff` on the mystery floor itself, so a shrine's blessing, a cursed
  path's prize or the void well's attack never reached the next fight. A buff is now spent by fights only: `spendBuff` (`run.ts`), called by
  `finish` and `finishTower`, keeps a buff with `duration` left for the next fight (its hp, attack and speed; gold, gear and the foes'
  multiplier are one fight's) and drops any other.
- **The bard's speed was doubled and replaced the castle's.** `fightSpec` put the speed into `stage.move` and `startStage` then used
  `base.move` in place of `moveRate(castle)` and multiplied by the speed again (1.5625 instead of 1.25). `fightSpec` no longer touches the
  buff (`startStage` already applies hp, attack and speed at the fight), and `startStage` uses `moveRate(run.castle) * speed`.
- **The mirror's clone shared an id with the next hire.** `drawMystery` set `run.nextId` to the clone's id while drawing the card (taken
  or not), so the next hire got the same id; when the clone left, `clearNode` removed both, a real hero with it. The clone now takes
  `run.nextId++` when it steps out. It is a guest (`isClone`, `ownHeroes` in `run.ts`): it does not count for `hasRoom` (so it never costs a
  hire) or for `hireXp`; a hire into a full squad takes the clone's place (`hireHero`), and when it goes a benched hero of the party's own
  takes the place back.
- **The goblin forge charged twice.** The whetstone and the fresh blade took their price in `applyMystery` on top of the option's cost that
  `chooseOption` pays. They no longer do.
- **The new kinds thinned the older mysteries.** With the four in `TOWER_EVENT_KINDS`, every older kind (the trainer, the tome, the prisoner
  and the rest, which give XP and heroes) came up 19/23 as often. `drawEvent` now draws the older kinds just as on main (`kindOf`, the
  creative encounters left out of the pick), and then a creative encounter (`CREATIVE_KINDS`), on its own side stream
  (`mixSeed(seed, 0xc4ea7, stage)`), takes `CREATIVE_SHARE` (0.4) of the plainer floors (the five usual events and the three about health):
  about one mystery floor in six, as an even share would be. A card asked for one kind (`drawEvent(run, stage, ['bard'])`) is as before.

The bot's starter, seeds 1 to 12 (* cleared): main 24, 22, 30, 26, 7, 26, 30, 29, 20, 14, 30*, 30*; the PR before 21, 10, 25, 23, 18,
25*, 30, 28, 30, 18, 30*, 20; after 24, 22, 30*, 24, 7, 26, 30, 30, 20, 14, 30*, 30*. Over 200 seeds the mean end level was 22.4 on main
(32 clears), 20.8 before (15) and 22.0 after (26).

Tests: `test/calamity.test.ts` (an event's blessing waits for its fight; the clone a guest; the whetstone paid once; no chaos twist on an
ordinary fight; the creative encounters' share; the bard's speed applied once and spent by fights), `test/twists.test.ts` (every twist but
the chaos ones turns up on ordinary maps).
