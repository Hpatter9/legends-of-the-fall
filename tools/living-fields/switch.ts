// LIVING-FIELDS: the balance tools' switch for the battlefield's traps and hazards (`src/sim/fieldTraps.ts`), so a table can be played
// with and without them:
//   FIELD_HAZARDS=0 npm run balance -- ...      none laid (as before the set)
//   FIELD_HAZARDS=2 npm run balance -- --heroes-only   the hero table's fights laid at level 2 (0 to 3)
// Unset: a run's fights as the game lays them (`hazardLevel`, by wave and tier). The hero value table plays fights made outside a run,
// which have none of their own: `sweepLevel` is the level it lays them at (1 when the set is on, or the number given).
import { FIELD_HAZARDS } from '../../src/sim/fieldTraps';

const raw = process.env.FIELD_HAZARDS;
if (raw === '0') FIELD_HAZARDS.on = false;
/** The level the hero sweep's fights are laid at. */
export const sweepLevel = (): number => (!FIELD_HAZARDS.on ? 0 : raw !== undefined && Number(raw) > 0 ? Number(raw) : 1);
