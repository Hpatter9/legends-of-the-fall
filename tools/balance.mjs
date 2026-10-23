// Bundles tools/balance.ts with esbuild (as test.mjs does for the tests) and prints the headless balance report.
//
//   npm run balance                  the default number of fights
//   npm run balance -- --games 800   fewer fights, quicker and noisier
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// (one folder a run, so several reports can be played side by side)
const outdir = `out/balance-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/balance.ts'],
  outfile: `${outdir}/balance.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/balance.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
