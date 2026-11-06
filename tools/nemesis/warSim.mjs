// Bundles tools/nemesis/warSim.ts with esbuild (as tools/balance.mjs does) and runs the war simulator (docs/notes/nemesis-2.md).
//
//   npm run war-sim                 120 days, 3 army runs a day
//   npm run war-sim -- --days 60    fewer days
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// (one folder a run, so several reports can be played side by side)
const outdir = `out/warsim-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/nemesis/warSim.ts'],
  outfile: `${outdir}/warSim.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/warSim.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
