# Unblocking the publish after 0.177.0 (FIX-177)

The winding battle maps (0.177.0) left four tests failing, and the "Publish the phone version" workflow runs every test
before it builds, so 0.177.0 and 0.178.0 never reached the phone. The owner asked for the smallest fix that keeps their
earlier rule, **one land for an army's one long battle**.

- **One land per attempt** (`src/sim/scenario.ts`, `src/sim/run.ts`): `planScenario` takes an optional `land`; an army run
  passes the land its seed picked (`landOf`), so the winding map, its route, landmarks and scenery stay, but every section
  of the attempt is on that one land. Each army's two lands are the two its theme walks through (`areaOfWave`), so both
  still appear, an attempt at a time. The opt-in non-army scenarios (necropolis, temple, mountain) still walk by phase.
- **Tests that assumed the old 8x11 army board** (`test/armies.test.ts` "a whole fight against the Lich King",
  `test/starter.test.ts` "the first run works with any pack") now place heroes on the deploy rows of the actual board
  (army maps are 14x18 since 0.177.0). The game itself already used the board's real depth (`isDeployTile(v, board.d)`).
- **`test/world-001-scenario.test.ts`** asked each army's map to cross two or more lands; it now asks for the owner's
  rule: one land, one of the army's own.
- **The Undead Legion's Normal `start`** 1.41 to **1.52** (`src/sim/armies.ts`): on one land a level-1 party could grind it
  within 25 tries again. At 1.52 it cannot (curve tool: never in 25), level 8 takes 3.5 tries (the band is 2 to 3.5), and
  the starting five still clear it at level 20 often enough ("each army needs more levels" test).

Checks: typecheck, the full suite 1220 of 1220, web build, fresh and old saves with no page errors, Last Stand smoke.
