// Bundles tools/stand-balance.ts with esbuild (as test.mjs does for the tests) and prints the headless balance report.
//
//   npm run stand-balance -- --levels 1,10 --attempts 5   the Last Stand alone (`tools/stand-balance.ts`)

import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// (one folder a run, so several reports can be played side by side)
const outdir = `out/stand-balance-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/stand-balance.ts'],
  outfile: `${outdir}/stand-balance.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/stand-balance.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
