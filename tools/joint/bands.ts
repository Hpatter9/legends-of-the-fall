// The starting five at level 1 against each field band (`test/foes.test.ts`'s fights), over seeds 1 to N (200): the share won.
import './off';
import { fight, place, playOut, startBattle } from '../../src/sim/battle';
import { DEPLOY_ROWS, standable, tileAt } from '../../src/sim/board';
import { FIELD_BANDS } from '../../src/sim/foes';
import { HEROES } from '../../src/sim/units';

const N = Number(process.argv[2] ?? 200);
const from = Number(process.argv[3] ?? 1);
for (const band of FIELD_BANDS) {
  let w = 0;
  for (let seed = from; seed < from + N; seed++) {
    const b = startBattle(seed, band);
    const spots: [number, number][] = [];
    for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
    HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
    fight(b);
    if (playOut(b).phase === 'won') w++;
  }
  console.log(`${band}: ${w} of ${N} (${Math.round((100 * w) / N)}%)`);
}
