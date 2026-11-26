// Bundles tools/trialRate.ts with esbuild and prints how often a greedy player clears each week of the Weekly Trial.
//
//   npm run trial-rate                  8 cycles of the twelve weeks
//   npm run trial-rate -- --cycles 20
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/trialRate';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/trialRate.ts'],
  outfile: `${outdir}/trialRate.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/trialRate.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
