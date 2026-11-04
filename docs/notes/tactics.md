# Tactics

The party's tactics, built from the owner-approved design ([tactics-design.md](tactics-design.md)). The owner's answers (through the
director): Advance together the default for every save; the foes strengthened to keep the pace targets; a Charge! call once a fight; small
formation bonuses each with a weak point; tactics from the first fight, formations with Auto place (army 3); Hunt the casters and the foes'
own tactics later; every mode the player sets out but the Last Stand; the pick remembered per army and mode.

## Batch 1: tactics in the sim

All of it is in `src/sim/tactics.ts` (pure), hooked into `decide` (`battle.ts`), the hero kits' casting (`heroKits.ts`) and the orders
(`orders.ts`).

- **`setTactic(b, 'advance' | 'charge' | 'hold')`**, before `fight`. A fight with none takes `TACTICS.fallback`, which is still `charge`
  in this batch, so every fight, pinned record and balance figure plays out exactly as before. Batch 2 turns the fallback to Advance and
  retunes the foes.
- **Advance together.** At `fight` the front-liners (`roleOf`, `suggest.ts`) are the line and the other heroes placed are held. A held hero:
  - casts any skill but an **opener** (`OPENERS`: the skills that carry their caster into the foe, read from seeded fights by
    `tools/tactics/openers.ts`: Shadow Step, Pilfer, Ravage, Voltage Blink, Iaido, Stillness Palm, Fox Guise, Bounty Hunt, and the Lancer's
    and Queen Dragoon's diving ultimates); escapes and the front-liners' own charges are never held;
  - strikes or shoots whatever is already in its reach;
  - otherwise walks toward the foe, but never past the row behind the foremost front-liner (`heldStep`), or waits.

  The line **meets the foe** when a front-liner swings its first blow or is struck (then a `lineMet` event, once), and after 6 s at the
  latest (`ADVANCE_CAP`). A held hero is let go on its own when a foe comes beside it, or when it is taunted or charmed. A party with no
  front-liner holds nobody.
- **Hold the line.** Every hero is held on the deploy rows (a front-liner may step one row out) until a foe comes within 2 tiles of any of
  them, or 10 s pass (`HOLD_CAP`).
- **Charge!** (`orderCharge`, `canCharge`): the player's call, once a fight, queued and applied at the start of the next tick like every
  tap, and kept in the fight's log, so a fight replays (`replayLog`).
- **No dice.** Nothing here rolls; who is held, and when, is read from where the fighters stand. The Last Stand takes no tactic.

### First measurements (`node tools/tactics/run.mjs --tactic ...`, 1,000 field fights a cell, random teams placed sensibly)

| | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 90 |
|---|---|---|---|
| Won: Charge (as before) | 62.1% | 48.2% | 70.1% |
| Won: Advance together | 64.4% (+2.3) | 50.7% (+2.5) | 73.3% (+3.2) |
| Won: Hold the line | | 49.0% (+0.8) | 70.8% (+0.7) |
| Strikers' lead on the front line (median), Charge / Advance | 1.3 s / 0.5 s | 1.5 s / 0.3 s | 1.4 s / 0.4 s |
| Strikers' health lost before the line meets the foe, Charge / Advance | 11% / 3% | 17% / 2% | 23% / 5% |

Hold the line by band (level 10, about 110 fights a band, noisy): minotaurs 66 to 68, mixed 53 to 62, ogres 54 to 60; gorgons 43 to 35.
It pays against those who come to it and costs against those who shoot.

An early cut released a held hero when a foe came within 3 tiles and met the line when a front-liner came within 2: the strikers still
came to blows first a third of the time (they walked up to the line, came within 3 of a foe and blinked in). Holding them until the foe is
beside them, and meeting the line on the front-liner's first blow, gives the figures above.

### Tests

`test/tactics.test.ts` (new, 9): Charge plays a fight exactly as no tactic; under Advance the held stay behind the Knight's row and cast no
opener until the line meets the foe, by the Knight's blow or the cap; a party with no front-liner holds nobody; Hold keeps everyone on the
deploy rows until a foe comes up or the cap; a foe beside a held hero lets it go; the Charge! once a fight, at the next tick, replayed from
the log; the same seed and tactic give the same fight; the Last Stand takes none; the openers are the heroes' real skills, and the escapes
and the front-liners' charges are not.

### Tools

- `tools/tactics/measure.ts` (`node tools/tactics/run.mjs`): the seeded measurement; `--tactic`, `--level`, `--stage`, `--placed`,
  `--diag` (how the early strikers came to blows).
- `tools/tactics/openers.ts` (`node tools/tactics/run.mjs --openers`): the skills that carry their caster nearer the foe, read from seeded fights.
