// The heroes' wins against each field band on `test/foes.test.ts`'s own fights (`readyBattle`, seeds 1 to 40; the test asks 8 to 32 of 40),
// and on seeds from N on for a wider read.
import './knobs';
import { fight, playOut } from '../../src/sim/battle';
import { FIELD_BANDS } from '../../src/sim/foes';
import { readyBattle } from '../../test/helpers';

const N = Number(process.argv[2] ?? 40);
for (const band of FIELD_BANDS) {
  let w = 0;
  for (let seed = 1; seed <= N; seed++) {
    const b = readyBattle(seed, band);
    fight(b);
    if (playOut(b).phase === 'won') w++;
  }
  console.log(`${band}: ${w} of ${N}`);
}
