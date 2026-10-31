# ALTAR-CLEAR: the Calamity's altar made clear

The owner: "The altar isn't clear enough in how it works in the game." Branch `claude/altar-clear` (from `claude/calamity-hub`, with main merged in). No rule changed: every fight, reward and save plays out as before.

## What was unclear (played as a new player)

- The room said "Dormant altar" and "Starter evolution 0 / 3" with nothing on what wakes it or what an evolution is.
- The altar card led with "Corruption 0: enemies gain 0% health…" before anything had been corrupted.
- "Each evolution adds 15%" never said that an evolution is an altar step, nor what the pulse would be later.
- Consecrate said nothing; Corrupt's gains appeared only after picking, and its costs were a running total, not what this one choice adds. Nothing said corruption lasts the run.
- Nothing said when the next step comes, that a choice guarantees a starter level, or why the rift will not open.
- "Altar pulses" in the commandments did not say it means the patron's pulse, nor what it makes of it.
- Once chosen, nothing showed which steps were corrupted, and in a fight nothing showed the pulse at all, apart from a passing "Ember altar" call.

## What the page does now

- **The numbers come from the rules.** The altar's constants moved out of `riftBattle.ts`, `rift.ts` and `tower.ts` into `src/sim/altarRules.ts` (`PULSE`, `PATRON_PULSE`, `EVOLUTION`, `OFFERING_MULT`, `COMMAND_MULT`, `CORRUPT`); the values are identical, and the existing rift tests and replays pass unchanged. `src/sim/altarWords.ts` (pure) builds every line from them: `patronLine`, `patronGrowth`, `offeringLine`, `commandmentLine` (with what it makes of your patron: "Ember: 75% becomes 113%"), `evolutionLine`, `corruptionLines`, `sealChoices` (consecrate against corrupt), `nextLine`, `BLOCKED_LINE`, `HOW_ALTAR_WORKS`, `altarSummary`, `stepLabel` ("Altar 2 of 3 · Offering"), `untilPulse`. The old `PATRONS` / `OFFERINGS` / `COMMANDMENTS` / `corruptionText` words are built from the same constants and read as before.
- **Each altar choice** (`TowerView.altarCard`): the eyebrow names the step ("Altar 1 of 3 · Patron"); a line says what the step decides and what the evolution gives (+15% health, +20% attack each, and the guaranteed level); each option gives its pulse in numbers at the evolution it will have and how it grows; Consecrate and Corrupt sit side by side with gains (+) and costs (−) for this one choice; corruption so far is shown only when there is some; then what comes next and why the rift stays shut. Reforging says it spends the campfire and keeps evolutions and corruption.
- **ⓘ How the altar works**: five lines, on every altar card; shown by itself the first time the altar is met (`legends.altarHelp` in localStorage). `src/altarHelp.ts`.
- **Your altar** (the room's altar button, the Altar menu button, the old map's header): the starter's level, tier and evolution; each step chosen, with its words and a consecrated / corrupted badge, or when it comes; what the corruption does in total.
- **On the map**: the altar button says "Altar · wakes after your first victory", "Altar 1 of 3 · choose now" (glowing) or "Ember · 2 of 3 altar steps"; the line beside it is "Starter Lv 6 · Tier 1 · Evolution 1 of 3"; a crossing that would wake a step says so ("A win here wakes Altar 1 of 3 · Patron", "Beating the guardian wakes Altar 2 of 3 · Offering"); the enter button reads "Choose at the altar first" while one is due, and the altar button glows (steadily: the no-flicker test forbids a looping glow).
- **In a fight** (`src/altarHud.ts`, one call in `main.ts`'s frame): a chip under the spell bar names the pulse and its size now ("Ember altar · 45% atk burn", ✓ when the commandment's formation holds), fills to the next pulse and glows as it fires; a corrupted guardian's pulse has its own red countdown and size. It moves below the guardian's health bar when that shows. Tap it for the full words. It only reads the battle.
- **Kept per step**: `Rift.corrupted?: AltarStep[]` (optional) records which steps were corrupted, so the summary can say so. Older saves have only the count: the badge reads "sealed" when it cannot be told.

Styles: `src/altarClear.css` (added to `build.mjs`). Tests: `test/altar-words.test.ts` (the words carry the constants' numbers; Ember's burn, Bastion's shield, Echo's charge, a commandment and corruption's costs in a real fight equal what the words say; the summary and old-save seals). Screenshots: `docs/samples/altar-clear-*.png` (every screen at 393x852; the explainer, each choice, the summary, the fights and the fresh room at 360x780 and 412x915), from `node tools/altar-clear/shots.mjs` after `npm run web`.

## Suggested rule changes for clarity (not made)

1. **Corruption scales the whole run, not the step.** Each point is a flat, permanent tax; tying a cost to the step it came from (e.g. the corrupted patron's own boss pulse) would be easier to read.
2. **"Evolution" means "number of altar steps chosen".** The pulse, health and attack all grow with it; naming it "altar rank" everywhere, or growing the pulse with the starter's tier instead, would remove a second meaning of "evolution" next to the hero's tier.
3. **Ember is not a pulse round the starter.** It hits only the nearest foe at any range, while Bastion and Echo work within 2 tiles. A 2-tile burst for Ember (or a range for all three) would make "pulse" mean one thing.
4. **The commandment multiplies only the patron's pulse**, not the offering or corruption; "Altar pulses" in its old words suggested more. Its two multipliers (×1.5 / ×1.75) are close enough that the choice is mostly about formation; a larger gap or a different reward for Walk Alone would make it a clearer decision.
5. **The guardian's Calamity pulse uses the first foe in the list** as the "boss"; in a guardian fight with escorts it is the guardian in practice, but a rule tied to the guardian's identity would be safer and clearer.
6. **The guardian room's "Region unlocked · evolution"** line is shown for the final guardian too, where no altar step follows.
7. **Consecrate gives nothing extra.** A small consecration reward (or calling it "Accept") would make the choice read less like "safe or nothing".

## Checks

- `npm run typecheck`: passed. `npm run web`: built.
- Affected tests (`npm test -- calamity rift tower sanctuary altar`): 110 of 110 passed, the 13 existing rift tests unchanged.
- Full suite: 1823 of 1824 passed on the first run; the one failure was this branch's looping glow on the altar button (`no-flicker`), now a steady glow, and `npm test -- no-flicker altar` passes.
- Browser: `node tools/altar-clear/shots.mjs` passed at 393x852, 360x780 and 412x915: no horizontal overflow, the Consecrate and Corrupt buttons on screen, no page errors, the explainer shown once only.
