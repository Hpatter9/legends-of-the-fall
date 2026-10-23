import { test } from 'node:test';
import { fight, place, startBattle, stepBattle } from '../src/sim/battle';
import { standable, tileAt } from '../src/sim/board';
test('bench', () => {
  const kinds = ['knight', 'samurai', 'archer', 'fireWizard', 'kunoichi'];
  let ticks = 0;
  const t0 = performance.now();
  for (let seed = 1; seed <= 300; seed++) {
    const b = startBattle(seed, 'mixed');
    let n = 0;
    for (const k of kinds) {
      for (let u = 0; u < b.board.w && n < 5; u++) {
        const v = b.board.d - 1 - (n % 2);
        if (standable(tileAt(b.board, u, v)) && place(b, k, u, v)) { n++; break; }
      }
    }
    if (!fight(b)) continue;
    while (b.phase === 'fight' && b.t < 120000) { stepBattle(b); ticks++; }
  }
  const ms = performance.now() - t0;
  console.log('BENCH ticks', ticks, 'ms', ms.toFixed(0), 'us/tick', ((ms * 1000) / ticks).toFixed(1));
});
