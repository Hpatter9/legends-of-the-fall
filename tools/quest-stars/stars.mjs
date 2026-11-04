// Bundles tools/quest-stars/stars.ts with esbuild and prints the quests' stars (npm run quest-stars [table]).
//
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = `out/questStars-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/quest-stars/stars.ts'],
  outfile: `${outdir}/questStars.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/questStars.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
