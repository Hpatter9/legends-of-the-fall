// Bundles one of this folder's TypeScript tools with esbuild (as test.mjs does for the tests) and runs it.
//
//   node tools/boss-big/run.mjs measure [args]   the boss waves before and after (see measure.ts)
import * as esbuild from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const [name, ...args] = process.argv.slice(2);
const outdir = `out/boss-big-${process.pid}`;
rmSync(outdir, { recursive: true, force: true });
await esbuild.build({
  entryPoints: [`tools/boss-big/${name}.ts`],
  outfile: `${outdir}/${name}.cjs`,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2023',
  logLevel: 'warning',
  loader: { '.png': 'empty', '.webp': 'empty' },
});
const run = spawnSync(process.execPath, [`${outdir}/${name}.cjs`, ...args], { stdio: 'inherit' });
rmSync(outdir, { recursive: true, force: true });
process.exit(run.status ?? 1);
