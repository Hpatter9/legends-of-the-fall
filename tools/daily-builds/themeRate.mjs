// Bundles tools/daily-builds/themeRate.ts with esbuild and prints how often a greedy player clears the daily.
//
//   node tools/daily-builds/themeRate.mjs [--runs 12]
//   node tools/daily-builds/themeRate.mjs [--runs 12]
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/themeRate';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/daily-builds/themeRate.ts'],
  outfile: `${outdir}/themeRate.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/themeRate.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
