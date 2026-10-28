// How much Duchess changes a fight: each army's waves 1, 5 and its last, at Normal, with level-1 heroes placed by the test helper,
// with and without her (the same seeds). Run: npx esbuild tools/duchess/swing.ts --bundle --platform=node --outfile=out/duchess-swing.mjs && node out/duchess-swing.mjs
import { fight, playOut, place, startBattle } from '../../src/sim/battle';
import { DEPLOY_ROWS } from '../../src/sim/board';
import { standable, tileAt } from '../../src/sim/board';
import { ARMIES } from '../../src/sim/armies';
import { armyRun, startStage } from '../../src/sim/run';
import { HEROES } from '../../src/sim/units';
void startBattle;
for (const army of ARMIES) {
  const row: string[] = [];
  for (const stage of [1, 5, army.waves.length]) {
    let wonNo = 0, wonYes = 0, standing = 0;
    const N = 20;
    for (let s = 1; s <= N; s++) {
      for (const wish of ['never', 'always'] as const) {
        const run = armyRun(s * 31, army.id);
        run.stage = stage;
        const b = startStage(run, wish);
        const spots: [number, number][] = [];
        for (let v = b.board.d - DEPLOY_ROWS; v < b.board.d; v++) for (let u = 0; u < b.board.w; u++) if (standable(tileAt(b.board, u, v))) spots.push([u, v]);
        HEROES.forEach((id, i) => place(b, id, ...spots[(i * 3) % spots.length]));
        fight(b);
        playOut(b);
        if (b.phase === 'won') wish === 'never' ? wonNo++ : wonYes++;
        if (wish === 'always' && b.units.find((u) => u.def === 'duchess')?.alive) standing++;
      }
    }
    row.push(`w${stage}: ${wonNo}/${N} -> ${wonYes}/${N} (she stands ${standing})`);
  }
  console.log(army.id.padEnd(12), row.join('  '));
}
