// Bundles tools/rank4/step.ts with esbuild (as tools/balance.mjs does) and prints each hero's tier 4 step.
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// (one folder a run, so several reports can be played side by side)
const outdir = `out/rank4-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/rank4/step.ts'],
  outfile: `${outdir}/step.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/step.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
