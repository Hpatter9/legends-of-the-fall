// The joint rebalance's switches (`JOINT` in `src/sim/stats.ts`, docs/notes/joint-rebalance.md), for measuring one at a time from the tools:
// `JOINT_OFF=tierProf,families` turns those off for this run (and its child processes, which import this too). Nothing is written.
import { JOINT } from '../../src/sim/stats';

for (const k of (process.env.JOINT_OFF ?? '').split(',').filter(Boolean)) {
  if (!(k in JOINT)) throw new Error(`no joint switch "${k}" (${Object.keys(JOINT).join(', ')})`);
  (JOINT as Record<string, boolean>)[k] = false;
}
