// Bundles tools/tactics/measure.ts with esbuild (as balance.mjs does) and prints the tactics measurement.
//
//   node tools/tactics/run.mjs --openers [--games 400]   the openers instead (tools/tactics/openers.ts)
//   node tools/tactics/run.mjs [--games 600] [--level 10 --stage 27] [--placed sensible|random] [--hold|--pace]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// (one folder a run, so several reports can be played side by side)
const outdir = `out/tactics-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: [process.argv.includes('--openers') ? 'tools/tactics/openers.ts' : 'tools/tactics/measure.ts'],
  outfile: `${outdir}/measure.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/measure.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
