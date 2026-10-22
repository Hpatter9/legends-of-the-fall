// Bundles tools/finalboss.ts with esbuild and prints the final bosses table (see that file for the flags).
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const outdir = 'out/finalboss';
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: ['tools/finalboss.ts'],
  outfile: `${outdir}/finalboss.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/finalboss.cjs`, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(run.status ?? 1);
