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

## Batch 2: Advance the default, and the rebalance

- **`TACTICS.fallback` is `advance`**: every fight the player (or a tool) does not set otherwise advances together. The Last Stand still
  takes none.
- **The foes' answer, `TACTICS.answer` 1.02**: every foe of a fight's band strikes 2% harder (`startBattle`'s band boost). Attack alone, so
  no health is rounded twice (an answer on health too moved the corruption's and the Fortified twist's stated +% by a point of rounding).
  The Last Stand's waves come by their own rules and are left as they were. Measured on random teams placed sensibly
  (`node tools/tactics/run.mjs`, 1,500 fights a cell, on main at 0.340.0):

  | Won | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 90 |
  |---|---|---|---|
  | Before the tactics (Charge, no answer) | 63.4% | 48.8% | 67.5% |
  | Advance together, answer 1.02 (the default now) | 63.3% | 47.6% | 68.6% |
  | Charge, answer 1.02 | | | 65.7% |

  So a sensibly placed party plays at the old pace with Advance, and Charge costs about 2 points on average (more against brutes, less or
  none against archers; batch 1's table by band).
- **Parity** (the hero sweep, `tools/heroSweep.ts`: random teams placed at random, 12,000 fights). Random placings put strikers in front of
  the line, so Advance lifts them more than it lifts a sensible party (the average rose 2 to 5 points), and it lifts most the heroes who
  gain from waiting: those whose self skill is cast before contact (the Werewolf's Shapechange), whose aura reaches a party standing
  together (the Samurai Commander's War Banner), and the front-liners the others now follow. Retuned by their own kits:
  - the Werewolf's Hunter back to its numbers before the joint rebalance (`HUNTER_QUICK` 1.35 to 1.25, `HUNTER_BLEED` 0.18 to 0.12);
  - the War Banner 6 s to 4 s (`BANNER_MS`; the Samurai Commander's alone);
  - the Karasu's Pounce (`TUNE1`) 0.24 to 0.36 (his opener is held, so he lost most);
  - the Siege Bot's Bombard (`TUNE1`) 0.27 to 0.38;
  - the Knight's Hold Fast (`TUNE3`) 1.166 to 0.8 (his ultimate's power was the first lever, but it cost the Last Stand's strong party its
    fourth room; Hold Fast does not);
  - the Shambler's ultimate (`tuned.power`) 0.933 to 0.84.

  | | Level 1, stage 5 | Level 10, stage 27 | Level 30, stage 92 |
  |---|---|---|---|
  | Average, spread | 58.5%, 10.7 | 44.4%, 13.5 | 62.2%, 10.4 |
  | Beyond 6 | none | Kitsune +7.9, Werewolf +6.8, Shambler +6.6 | none |

  The level-30 yardstick (`hero-balance-ultimates`) moved from stage 90 to 92, where the average team wins 62% as it did at 90 before (66%
  at 90 now); its band is the same 6. Level 10 has no test; its three above 6 are watch items for the end's re-measure (their skill 2 is
  a utility skill whose `tune` does nothing, and their timers barely moved them).
- **Records**: `spells-identity` and `ailments-identical` re-recorded (every scenario but the spells proof's `stand`), `stand-regression`
  re-pinned (the third fight now won, the seventh lost), the Calamity scenario back among those that play as recorded with the bosses'
  signatures on (its greedy run ends before that boss again), and two tests re-staged (`boss-big`'s dodge on a charging party, as its
  heroes packed behind the line left no tile to step to; the Vaelkhar trial on seed 2004, which shows his whole kit under Advance).
- **Tools**: `TACTICS_OFF=1` (`tools/tactics/off.ts`, imported by `tools/balance.ts`) measures as before the tactics; `run.mjs --answer`.
